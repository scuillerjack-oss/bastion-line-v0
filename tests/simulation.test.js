import { test } from "node:test";
import assert from "node:assert/strict";
import { createLevelState } from "../src/engine/state.js";
import { tick, buildTower, upgradeTower, requestEarlyWave } from "../src/engine/simulation.js";
import { TOWER_FAMILIES } from "../src/engine/towers.js";
import { ENEMY_KINDS } from "../src/engine/enemies.js";

const DT = 1000 / 60;

// Niveau synthétique minimal, pensé pour des tests PRÉCIS et isolés (pas les
// vrais niveaux du jeu, testés séparément en intégration -- voir
// levels.test.js). Pièces généreuses par défaut pour ne jamais faire
// échouer un test sur un manque de pièces non pertinent au test lui-même.
function makeTestLevel(overrides = {}) {
  return {
    id: 999,
    name: "Test",
    baseHp: 10,
    startCoins: 1000,
    paths: [
      [
        { x: 0, y: 350 },
        { x: 400, y: 350 },
      ],
    ],
    buildSlots: [
      { id: "a", x: 100, y: 350 },
      { id: "b", x: 300, y: 350 },
    ],
    unlockedTowers: ["rapide", "canon", "longue_portee", "controle"],
    waves: [{ prepMs: 0, spawns: [] }],
    ...overrides,
  };
}

// speed=0 par défaut : la plupart des tests ci-dessous vérifient un
// comportement (ciblage/portée/dégâts) indépendant du déplacement, sur un
// chemin de test RECTILIGNE dont stepEnemies recalcule x/y à CHAQUE tick à
// partir de la distance parcourue (jamais des x/y fournis ici, qui ne
// servent qu'à positionner l'ennemi à la création) -- un ennemi mobile
// dériverait hors de portée en cours de test. Le test dédié au
// ralentissement (plus bas) passe explicitement une vraie vitesse.
function pushEnemy(state, kind, traveled, pathIndex = 0, speed = 0) {
  const kindDef = ENEMY_KINDS[kind];
  const pos = state.paths[pathIndex].points[0];
  state.enemies.push({
    id: `test-${state.enemies.length}`,
    kind,
    pathIndex,
    traveled,
    hp: kindDef.hp,
    maxHp: kindDef.hp,
    speed,
    x: pos.x,
    y: pos.y,
    slowFactor: 1,
    slowUntilMs: 0,
    alive: true,
  });
  return state.enemies[state.enemies.length - 1];
}

function tickN(state, n) {
  for (let i = 0; i < n; i++) tick(state, DT);
}

// Un niveau de test a par défaut waves:[{prepMs:0,...}] : le tout premier
// tick() ne fait QUE transiter "prep" -> "wave" (voir simulation.js, la
// branche "prep" retourne avant tout traitement d'ennemis/tours dès qu'elle
// démarre la vague) -- jamais de mouvement, ciblage ou tir sur ce tick
// précis. Les tests qui vérifient un comportement EN vague doivent donc
// franchir cette transition avant de placer leurs ennemis de test.
function enterWave(state) {
  tick(state, DT);
}

// --- Construction / coûts / gains ----------------------------------------

test("construire une tour consomme exactement son coût en pièces", () => {
  const state = createLevelState(makeTestLevel());
  const before = state.coins;
  const ok = buildTower(state, "a", "rapide");
  assert.equal(ok, true);
  assert.equal(state.coins, before - TOWER_FAMILIES.rapide.buildCost);
});

test("impossible de construire sans assez de pièces", () => {
  const state = createLevelState(makeTestLevel({ startCoins: 5 }));
  const ok = buildTower(state, "a", "rapide");
  assert.equal(ok, false);
  assert.equal(state.towers.length, 0);
});

test("impossible de construire sur un emplacement déjà occupé", () => {
  const state = createLevelState(makeTestLevel());
  buildTower(state, "a", "rapide");
  const ok = buildTower(state, "a", "canon");
  assert.equal(ok, false);
  assert.equal(state.towers.length, 1);
});

test("impossible de construire une famille non débloquée sur ce niveau", () => {
  const state = createLevelState(makeTestLevel({ unlockedTowers: ["rapide"] }));
  const ok = buildTower(state, "a", "canon");
  assert.equal(ok, false);
});

test("éliminer un ennemi rapporte exactement sa récompense en pièces", () => {
  const state = createLevelState(makeTestLevel());
  buildTower(state, "a", "rapide"); // portée 95, à x=100
  enterWave(state);
  const before = state.coins;
  const enemy = pushEnemy(state, "standard", 100); // juste sous la tour, à portée immédiate, immobile
  tickN(state, 60 * 3); // 3s : largement assez pour l'abattre (dégâts 4/260ms vs hp 30)
  assert.equal(enemy.alive, false);
  assert.equal(state.coins, before + ENEMY_KINDS.standard.coinReward);
});

// --- Ciblage / portée / cadence -------------------------------------------

test("une tour ne tire jamais sur un ennemi hors de sa portée", () => {
  const state = createLevelState(makeTestLevel());
  buildTower(state, "a", "rapide"); // portée 95
  enterWave(state);
  pushEnemy(state, "standard", 100 + 200); // à 200 de distance, hors portée, immobile
  tickN(state, 60 * 2);
  assert.equal(state.projectiles.length + (state.events || []).filter((e) => e.type === "tower_fired").length, 0);
});

test("une tour cible l'ennemi le plus avancé sur son chemin, parmi ceux à portée", () => {
  const state = createLevelState(makeTestLevel());
  buildTower(state, "a", "rapide");
  enterWave(state);
  const far = pushEnemy(state, "standard", 130); // plus avancé
  const near = pushEnemy(state, "standard", 90); // moins avancé, mais aussi à portée
  tick(state, DT);
  const fired = state.events.find((e) => e.type === "tower_fired");
  assert.ok(fired, "la tour doit avoir tiré dès ce tick (aucun délai initial une fois en vague)");
  const proj = state.projectiles[0];
  assert.equal(proj.targetId, far.id, "doit viser l'ennemi le plus proche de la base, pas le plus proche de la tour");
  void near;
});

test("la cadence de tir respecte fireIntervalMs (jamais deux tirs avant la fin du cooldown)", () => {
  const state = createLevelState(makeTestLevel());
  buildTower(state, "a", "rapide");
  enterWave(state);
  pushEnemy(state, "standard", 100);
  const tierStats = TOWER_FAMILIES.rapide.tiers[0];
  let shots = 0;
  const totalMs = tierStats.fireIntervalMs * 2.5;
  for (let t = 0; t < totalMs; t += DT) {
    tick(state, DT);
    shots += state.events.filter((e) => e.type === "tower_fired").length;
  }
  // Sur 2.5 intervalles, on attend exactement 2 ou 3 tirs selon l'alignement
  // du pas de temps -- jamais plus (ce qui trahirait un cooldown non respecté).
  assert.ok(shots === 2 || shots === 3, `attendu 2 ou 3 tirs, obtenu ${shots}`);
});

// --- Dégâts de zone (canon) ------------------------------------------------

test("le canon inflige des dégâts à TOUS les ennemis dans son rayon d'effet, pas seulement la cible", () => {
  const state = createLevelState(makeTestLevel());
  buildTower(state, "a", "canon"); // rayon 46 au palier 1
  enterWave(state);
  // Chemin de test rectiligne à y constant : seul l'écart de distance
  // parcourue (traveled) détermine la distance réelle entre ennemis ici.
  // Le ciblage vise l'ennemi le PLUS AVANCÉ à portée (voir findTarget) :
  // c'est donc lui la cible réelle du canon, pas nécessairement celui
  // déclaré "target" par position dans le tableau -- traveled le plus
  // élevé ici pour que ce soit sans ambiguïté.
  const target = pushEnemy(state, "essaim", 160); // le plus avancé -> cible réelle du canon
  const bystander = pushEnemy(state, "essaim", 145); // à 15 du point d'impact, dans le rayon (46)
  const outOfRadius = pushEnemy(state, "essaim", 95); // à 65 du point d'impact, hors rayon (46)
  // Fenêtre courte et précise : juste assez pour que LE PREMIER tir parte et
  // touche son impact (portée courte, projectile lent), mais bien avant la
  // fin du cooldown (1400ms) qui permettrait un second tir -- sans quoi le
  // canon finirait de toute façon par abattre le troisième ennemi par un tir
  // direct SÉPARÉ une fois les deux autres morts, ce qui ne testerait plus
  // du tout la zone d'effet elle-même (vérifié en debug : c'est exactement
  // ce qui se produisait avant ce correctif).
  tickN(state, 20);
  assert.equal(target.alive, false, "la cible directe doit mourir");
  assert.equal(bystander.alive, false, "un ennemi proche du point d'impact doit aussi être touché (zone d'effet)");
  assert.equal(outOfRadius.alive, true, "un ennemi hors du rayon d'effet ne doit jamais être touché par CE tir");
});

// --- Ralentissement (contrôle) ---------------------------------------------

test("la tour de contrôle ralentit sa cible : la vitesse effective diminue pendant slowDurationMs", () => {
  const state = createLevelState(makeTestLevel());
  buildTower(state, "a", "controle");
  enterWave(state);
  const enemy = pushEnemy(state, "standard", 100, 0, ENEMY_KINDS.standard.speed); // vraie vitesse : le déplacement est le sujet de ce test
  const traveledBefore = enemy.traveled;
  // Laisse le temps au projectile (portée/vitesse courtes) d'atteindre la
  // cible et d'appliquer le ralentissement.
  tickN(state, 30);
  assert.ok(enemy.slowUntilMs > state.elapsedMs, "l'ennemi doit être sous effet de ralentissement actif");
  const traveledWithSlow = enemy.traveled - traveledBefore;
  // Compare sur une fenêtre identique sans ralentissement (ennemi neuf, même position de départ, aucune tour à portée).
  const state2 = createLevelState(makeTestLevel());
  enterWave(state2);
  // 250 (pas 500) : doit rester loin de la portée de toute tour tout en
  // laissant assez de chemin devant lui pour se déplacer librement sur
  // toute la fenêtre de test, sans jamais atteindre la fin du chemin
  // (400) -- un ennemi qui atteint la base est retiré de state.enemies
  // (voir stepEnemies), ce qui figerait par erreur cette référence.
  const enemy2 = pushEnemy(state2, "standard", 250, 0, ENEMY_KINDS.standard.speed); // hors de portée de toute tour : jamais ralenti
  tickN(state2, 30);
  const traveledWithoutSlow = enemy2.traveled - 250;
  assert.ok(traveledWithSlow < traveledWithoutSlow, "un ennemi ralenti doit parcourir moins de distance qu'un ennemi non ralenti sur la même durée");
});

// --- Bonus longue portée vs blindé -----------------------------------------

test("la tour longue portée au palier 2+ inflige un bonus de dégâts aux ennemis blindés", () => {
  const state = createLevelState(makeTestLevel());
  buildTower(state, "a", "longue_portee");
  const tower = state.towers[0];
  upgradeTower(state, tower.id); // palier 2 : bonusVsArmored actif
  enterWave(state);
  const armored = pushEnemy(state, "blinde", 100);
  const hpBefore = armored.hp;
  tickN(state, 30); // laisse le projectile (très rapide) arriver
  const tierStats = TOWER_FAMILIES.longue_portee.tiers[tower.tier];
  const expectedDamage = tierStats.damage * tierStats.bonusVsArmored;
  assert.ok(hpBefore - armored.hp >= expectedDamage - 0.01, "le dégât réellement infligé doit inclure le bonus anti-blindé");
});

// --- Améliorations ----------------------------------------------------------

test("améliorer une tour consomme le coût du palier suivant et change réellement ses statistiques", () => {
  const state = createLevelState(makeTestLevel());
  buildTower(state, "a", "rapide");
  const tower = state.towers[0];
  const before = state.coins;
  const nextCost = TOWER_FAMILIES.rapide.tiers[1].upgradeCost;
  const ok = upgradeTower(state, tower.id);
  assert.equal(ok, true);
  assert.equal(state.coins, before - nextCost);
  assert.equal(tower.tier, 1);
});

test("impossible d'améliorer au-delà du palier maximum", () => {
  const state = createLevelState(makeTestLevel());
  buildTower(state, "a", "rapide");
  const tower = state.towers[0];
  const maxTier = TOWER_FAMILIES.rapide.tiers.length - 1;
  for (let i = tower.tier; i < maxTier; i++) upgradeTower(state, tower.id);
  assert.equal(tower.tier, maxTier);
  const ok = upgradeTower(state, tower.id);
  assert.equal(ok, false);
  assert.equal(tower.tier, maxTier);
});

// --- Vagues, timer, lancement anticipé --------------------------------------

test("le statut reste 'prep' tant que le minuteur n'est pas écoulé", () => {
  const state = createLevelState(makeTestLevel({ waves: [{ prepMs: 5000, spawns: [] }] }));
  tickN(state, 60 * 2); // 2s < 5s
  assert.equal(state.status, "prep");
});

test("la vague démarre automatiquement quand le minuteur atteint zéro", () => {
  const state = createLevelState(makeTestLevel({ waves: [{ prepMs: 500, spawns: [] }] }));
  // S'arrête PRÉCISÉMENT au tick de la transition : un niveau de test sans
  // aucun spawn passerait sinon directement à "won" dès le tick suivant
  // (vague vide, aucun ennemi jamais en jeu) -- ce test vérifie uniquement
  // le déclenchement de la transition prep -> wave, pas la suite.
  let ticks = 0;
  while (state.status === "prep" && ticks < 120) {
    tick(state, DT);
    ticks++;
  }
  assert.equal(state.status, "wave");
  assert.ok(ticks > 1, "le minuteur doit avoir réellement retardé la transition (pas un déclenchement immédiat)");
});

test("le lancement anticipé déclenche la vague immédiatement, sans attendre le minuteur", () => {
  const state = createLevelState(makeTestLevel({ waves: [{ prepMs: 60000, spawns: [] }] }));
  assert.equal(state.status, "prep");
  const ok = requestEarlyWave(state);
  assert.equal(ok, true);
  tick(state, DT);
  assert.equal(state.status, "wave");
});

test("le lancement anticipé est sans effet hors de la phase de préparation", () => {
  const state = createLevelState(makeTestLevel({ waves: [{ prepMs: 0, spawns: [] }] }));
  tick(state, DT); // passe en 'wave'
  assert.equal(state.status, "wave");
  const ok = requestEarlyWave(state);
  assert.equal(ok, false);
});

test("les ennemis d'une vague apparaissent selon leur delayMs, jamais tous en même temps", () => {
  const state = createLevelState(
    makeTestLevel({
      waves: [
        {
          prepMs: 0,
          spawns: [
            { kind: "standard", pathIndex: 0, delayMs: 0 },
            { kind: "standard", pathIndex: 0, delayMs: 1000 },
          ],
        },
      ],
    })
  );
  tick(state, DT); // ce tick démarre la vague (transition prep -> wave)
  tick(state, DT); // ce tick traite la vague : spawn immédiat du premier ennemi (delayMs 0)
  assert.equal(state.enemies.length, 1);
  tickN(state, 60); // +1s : le second ennemi (delayMs 1000) doit être apparu
  assert.equal(state.enemies.length, 2);
});

// --- Victoire / défaite / redémarrage --------------------------------------

test("un ennemi qui atteint la base réduit baseHp et disparaît", () => {
  const state = createLevelState(makeTestLevel({ baseHp: 10 }));
  enterWave(state);
  const pathLen = state.paths[0].totalLength;
  pushEnemy(state, "standard", pathLen - 1, 0, ENEMY_KINDS.standard.speed); // à 1 unité de la base, en mouvement réel
  tickN(state, 10);
  assert.equal(state.baseHp, 10 - ENEMY_KINDS.standard.baseDamage);
  assert.equal(state.enemies.length, 0);
});

test("baseHp <= 0 déclenche le statut 'lost'", () => {
  const state = createLevelState(makeTestLevel({ baseHp: 1 }));
  enterWave(state);
  const pathLen = state.paths[0].totalLength;
  pushEnemy(state, "standard", pathLen - 1, 0, ENEMY_KINDS.standard.speed);
  tickN(state, 10);
  assert.equal(state.status, "lost");
});

test("toutes les vagues repoussées sans ennemi restant déclenche le statut 'won'", () => {
  const state = createLevelState(makeTestLevel({ waves: [{ prepMs: 0, spawns: [] }] }));
  tick(state, DT); // ce tick démarre la vague (transition prep -> wave)
  tick(state, DT); // ce tick traite la vague : sans spawn ni ennemi, elle se vide immédiatement
  assert.equal(state.status, "won");
});

test("redémarrer un niveau (nouvel état) repart avec les pièces/vies de départ, jamais un résidu de la tentative précédente", () => {
  const level = makeTestLevel({ baseHp: 10, startCoins: 200 });
  const state1 = createLevelState(level);
  buildTower(state1, "a", "rapide");
  state1.baseHp = 3;
  const state2 = createLevelState(level); // "recommencer" = un nouvel état, jamais une mutation de l'ancien
  assert.equal(state2.baseHp, 10);
  assert.equal(state2.coins, 200);
  assert.equal(state2.towers.length, 0);
});

// --- Non-régression : jamais de blocage permanent --------------------------

test("une simulation sans aucune tour ne bloque jamais : le niveau finit par se perdre (jamais un statut figé)", () => {
  const state = createLevelState(
    makeTestLevel({ baseHp: 3, waves: [{ prepMs: 0, spawns: [{ kind: "standard", pathIndex: 0, delayMs: 0 }] }] })
  );
  let ticks = 0;
  const maxTicks = 60 * 60; // 60s, largement suffisant pour qu'un seul ennemi traverse une arène de 400 de large
  while (state.status !== "won" && state.status !== "lost" && ticks < maxTicks) {
    tick(state, DT);
    ticks++;
  }
  assert.ok(state.status === "won" || state.status === "lost", "le niveau doit toujours atteindre un statut terminal");
  assert.ok(ticks < maxTicks, "jamais de blocage permanent");
});
