import { test } from "node:test";
import assert from "node:assert/strict";
import { createLevelState } from "../src/engine/state.js";
import { tick, buildTower, upgradeTower, requestEarlyWave, sellTower, PROJECTILE_SPEED } from "../src/engine/simulation.js";
import { TOWER_FAMILIES, getTowerInvestedValue, getTowerSellRefund } from "../src/engine/towers.js";
import { TOWER_SELL_REFUND_RATE, TOWER_AIM_TURN_RATE } from "../src/engine/constants.js";
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
    unlockedTowers: ["rapide", "canon", "longue_portee"],
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

// --- Renommage Catapulte (cahier V7, section 5) ----------------------------

test("la défense longue portée s'affiche désormais sous le nom \"Catapulte\" (jamais \"Baliste\" ni l'ancien \"Longue portée\")", () => {
  assert.equal(TOWER_FAMILIES.longue_portee.name, "Catapulte");
  assert.ok(!/baliste/i.test(TOWER_FAMILIES.longue_portee.name));
  assert.ok(!/longue portée/i.test(TOWER_FAMILIES.longue_portee.name));
});

test("le renommage Catapulte ne change ni la mécanique ni l'identifiant interne (continuité des sauvegardes/tests)", () => {
  // L'identifiant interne reste "longue_portee" -- seul le nom AFFICHÉ change
  // (cahier V7, section 5 : "ne pas modifier la mécanique longue portée
  // existante uniquement à cause de ce changement de nom").
  assert.equal(TOWER_FAMILIES.longue_portee.id, "longue_portee");
  assert.equal(TOWER_FAMILIES.longue_portee.buildCost, 70);
  assert.equal(TOWER_FAMILIES.longue_portee.tiers[0].range, 180);
  assert.equal(TOWER_FAMILIES.longue_portee.tiers[1].bonusVsArmored, 1.6);
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
  // Tour et cible placées à la même position par construction du niveau de
  // test (traveled=100 -> (100,350), identique au slot "a") : la distance à
  // parcourir est quasi nulle, donc même la vitesse de projectile volontairement
  // ralentie de la catapulte en V8 (voir PROJECTILE_SPEED) n'empêche pas
  // l'impact de survenir largement avant le 30e tick.
  tickN(state, 30);
  const tierStats = TOWER_FAMILIES.longue_portee.tiers[tower.tier];
  const expectedDamage = tierStats.damage * tierStats.bonusVsArmored;
  assert.ok(hpBefore - armored.hp >= expectedDamage - 0.01, "le dégât réellement infligé doit inclure le bonus anti-blindé");
});

// --- Identité des 3 tours (cahier V8, section 3) ---------------------------
//
// L'audit de reprise V8 a trouvé la Catapulte avec AUCUNE zone d'effet, la
// cadence la PLUS rapide des 3 et le projectile le PLUS rapide -- l'exact
// inverse de l'identité "artillerie lourde : zone, lente, projectile lent"
// voulue par le cahier. Ces tests verrouillent le correctif pour qu'une
// régression future (rééquilibrage mal fait) soit détectée immédiatement.

test("la Catapulte a la cadence de tir la PLUS LENTE des 3 familles, à chaque palier équivalent", () => {
  for (let tier = 0; tier < 3; tier++) {
    const rapide = TOWER_FAMILIES.rapide.tiers[tier].fireIntervalMs;
    const canon = TOWER_FAMILIES.canon.tiers[tier].fireIntervalMs;
    const catapulte = TOWER_FAMILIES.longue_portee.tiers[tier].fireIntervalMs;
    assert.ok(catapulte > canon, `palier ${tier} : catapulte (${catapulte}ms) doit être plus lente que le canon (${canon}ms)`);
    assert.ok(canon > rapide, `palier ${tier} : canon (${canon}ms) doit être plus lent que l'archer (${rapide}ms)`);
  }
});

test("la Catapulte a le projectile le PLUS LENT des 3 familles (artillerie lourde, mauvaise réponse aux cibles rapides)", () => {
  assert.ok(PROJECTILE_SPEED.longue_portee < PROJECTILE_SPEED.canon, "la catapulte doit être plus lente que le canon");
  assert.ok(PROJECTILE_SPEED.canon < PROJECTILE_SPEED.rapide, "le canon doit être plus lent que l'archer");
});

test("la Catapulte inflige désormais une vraie zone d'effet (tous les paliers), plus large que celle du canon", () => {
  for (let tier = 0; tier < 3; tier++) {
    assert.ok(TOWER_FAMILIES.longue_portee.tiers[tier].aoeRadius > TOWER_FAMILIES.canon.tiers[tier].aoeRadius,
      `palier ${tier} : la zone d'effet de la catapulte doit être plus large que celle du canon`);
  }
});

test("la Catapulte inflige des dégâts à TOUS les ennemis dans sa zone d'effet, pas seulement la cible", () => {
  const state = createLevelState(makeTestLevel());
  buildTower(state, "a", "longue_portee"); // portée 180, zone d'effet 58 au palier 1
  enterWave(state);
  const target = pushEnemy(state, "essaim", 250); // le plus avancé à portée -> cible réelle
  const bystander = pushEnemy(state, "essaim", 210); // à 40 du point d'impact, dans la zone (58)
  const outOfRadius = pushEnemy(state, "essaim", 150); // à 100 du point d'impact, hors zone (58)
  // Fenêtre large car le projectile est volontairement TRÈS lent (identité
  // V8) : assez de ticks pour que le premier tir atteigne son impact
  // (distance 150, vitesse 130 -> ~1.15s), mais bien avant la fin du
  // cooldown (1900ms) qui permettrait un second tir.
  tickN(state, 90);
  assert.equal(target.alive, false, "la cible directe doit mourir");
  assert.equal(bystander.alive, false, "un ennemi proche du point d'impact doit aussi être touché (zone d'effet)");
  assert.equal(outOfRadius.alive, true, "un ennemi hors de la zone d'effet ne doit jamais être touché par CE tir");
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

// --- Revente d'une tour (cahier V4, section 3) ------------------------------

test("revendre une tour BRUTE rembourse exactement 60% de son coût de construction", () => {
  const state = createLevelState(makeTestLevel());
  buildTower(state, "a", "rapide");
  const tower = state.towers[0];
  const before = state.coins;
  const expectedRefund = Math.round(TOWER_FAMILIES.rapide.buildCost * TOWER_SELL_REFUND_RATE);
  const ok = sellTower(state, tower.id);
  assert.equal(ok, true);
  assert.equal(state.coins, before + expectedRefund);
});

test("revendre une tour AMÉLIORÉE rapporte plus qu'une tour brute, sans jamais rembourser 100% de l'investissement", () => {
  const stateBrute = createLevelState(makeTestLevel());
  buildTower(stateBrute, "a", "rapide");
  const refundBrute = getTowerSellRefund(stateBrute.towers[0]);

  const stateAmelioree = createLevelState(makeTestLevel());
  buildTower(stateAmelioree, "a", "rapide");
  const towerAmelioree = stateAmelioree.towers[0];
  upgradeTower(stateAmelioree, towerAmelioree.id); // palier 1
  const investedAmelioree = getTowerInvestedValue(towerAmelioree);
  const refundAmelioree = getTowerSellRefund(towerAmelioree);

  assert.ok(refundAmelioree > refundBrute, "une tour améliorée doit se revendre plus cher qu'une tour brute");
  assert.ok(refundAmelioree < investedAmelioree, "le remboursement ne doit jamais couvrir 100% de l'investissement total");
});

test("chaque palier d'amélioration réellement acheté augmente la valeur investie ET le remboursement de revente", () => {
  const state = createLevelState(makeTestLevel());
  buildTower(state, "a", "canon");
  const tower = state.towers[0];
  const maxTier = TOWER_FAMILIES.canon.tiers.length - 1;
  let previousRefund = getTowerSellRefund(tower);
  for (let i = 0; i < maxTier; i++) {
    upgradeTower(state, tower.id);
    const refund = getTowerSellRefund(tower);
    assert.ok(refund > previousRefund, `le remboursement doit augmenter après le palier ${tower.tier}`);
    previousRefund = refund;
  }
});

test("le montant réellement crédité après la vente est EXACTEMENT le montant annoncé par getTowerSellRefund (même source de vérité)", () => {
  const state = createLevelState(makeTestLevel());
  buildTower(state, "a", "longue_portee");
  const tower = state.towers[0];
  upgradeTower(state, tower.id);
  const announcedRefund = getTowerSellRefund(tower);
  const before = state.coins;
  sellTower(state, tower.id);
  assert.equal(state.coins, before + announcedRefund);
});

test("après la vente, l'emplacement est réellement libéré et peut accueillir une nouvelle tour", () => {
  const state = createLevelState(makeTestLevel());
  buildTower(state, "a", "rapide");
  const tower = state.towers[0];
  sellTower(state, tower.id);
  const slot = state.buildSlots.find((s) => s.id === "a");
  assert.equal(slot.towerId, null, "l'emplacement doit être libre après la vente");
  const ok = buildTower(state, "a", "canon");
  assert.equal(ok, true, "une nouvelle tour doit pouvoir être construite sur l'emplacement libéré");
});

test("la tour vendue disparaît réellement de la liste des tours (jamais un fantôme qui continue de tirer)", () => {
  const state = createLevelState(makeTestLevel());
  buildTower(state, "a", "rapide");
  const tower = state.towers[0];
  sellTower(state, tower.id);
  assert.equal(state.towers.length, 0);
});

test("impossible de vendre une tour qui n'existe pas (identifiant invalide, jamais un crash ni un crédit fantôme)", () => {
  const state = createLevelState(makeTestLevel());
  const before = state.coins;
  const ok = sellTower(state, "id-inexistant");
  assert.equal(ok, false);
  assert.equal(state.coins, before);
});

test("impossible de vendre une tour après la fin de la partie (victoire ou défaite)", () => {
  const state = createLevelState(makeTestLevel({ waves: [{ prepMs: 0, spawns: [] }] }));
  buildTower(state, "a", "rapide");
  const tower = state.towers[0];
  tick(state, DT); // démarre puis vide immédiatement l'unique vague sans spawn -> "won"
  tick(state, DT);
  assert.equal(state.status, "won");
  const ok = sellTower(state, tower.id);
  assert.equal(ok, false, "une vente ne doit plus être possible une fois la partie terminée");
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

// Non-régression bêta physique V0 (#2) : la seule "conséquence" d'un coup à
// la base était un nombre de HUD discret + un son -- aucun indice visuel sur
// la carte elle-même. Le correctif ajoute un flash sur la base, qui a besoin
// des coordonnées d'impact dans l'événement -- ce test verrouille ce
// contrat de données pour que le rendu ne puisse plus silencieusement les
// perdre à nouveau.
test("l'événement base_hit transporte les coordonnées d'impact (nécessaires au flash visuel)", () => {
  const state = createLevelState(makeTestLevel({ baseHp: 10 }));
  enterWave(state);
  const pathLen = state.paths[0].totalLength;
  const basePoint = state.paths[0].points[state.paths[0].points.length - 1];
  pushEnemy(state, "standard", pathLen - 1, 0, ENEMY_KINDS.standard.speed);
  // state.events est réinitialisé à CHAQUE tick (voir tick() : "state.events
  // = []") -- il faut donc capturer l'événement au tick précis où il est
  // émis, jamais après une série de ticks à l'aveugle (l'ennemi peut déjà
  // avoir disparu plusieurs ticks avant la fin d'une boucle plus longue).
  let hitEvent = null;
  for (let i = 0; i < 10 && !hitEvent; i++) {
    tick(state, DT);
    hitEvent = state.events.find((e) => e.type === "base_hit");
  }
  assert.ok(hitEvent, "aucun événement base_hit émis");
  assert.equal(typeof hitEvent.x, "number");
  assert.equal(typeof hitEvent.y, "number");
  assert.ok(Math.hypot(hitEvent.x - basePoint.x, hitEvent.y - basePoint.y) < 5, "coordonnées éloignées de la base");
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

// --- Orientation des défenses (cahier V7-polish, section 4) ---------------
// Non-régression purement structurelle : la rotation VISUELLE (tower.
// aimAngle) ne doit jamais être instantanée (cahier : "aucune rotation
// brutale/aberrante lors d'un changement de cible"), et ne doit JAMAIS
// influencer la trajectoire RÉELLE d'un projectile, qui reste calculée
// depuis la position exacte de la cible (voir engine/simulation.js,
// fireProjectile). Le rendu lui-même (symétrie des sprites, inclinaison
// plafonnée des silhouettes de repli) n'est pas testable ici -- Canvas --
// et a été vérifié visuellement dans un vrai navigateur (rapport V7-polish).

test("tower.aimAngle n'atteint jamais sa cible instantanément : le premier pas reste borné par TOWER_AIM_TURN_RATE", () => {
  const state = createLevelState(makeTestLevel());
  enterWave(state);
  buildTower(state, "a", "rapide"); // slot "a" = (100, 350)
  // Cible loin sur la droite du chemin de test (0,350)->(400,350) : angle
  // réel vers la cible = 0 (vers la droite), très loin du neutre -π/2 (vers
  // le haut) qu'une tour fraîchement construite adopte par défaut.
  pushEnemy(state, "standard", 170, 0, 0); // traveled=170 -> x proche de 170, à droite du slot "a" (x=100), dans la portée (95) de la tour "rapide"
  tick(state, DT);
  const tower = state.towers[0];
  assert.ok(tower, "la tour doit exister après construction");
  const maxStep = TOWER_AIM_TURN_RATE * (DT / 1000) + 1e-9;
  // Angle de départ (neutre) = -π/2 ; même si la cible réelle est à l'angle
  // 0, un seul pas de simulation ne peut rapprocher aimAngle que d'au plus
  // maxStep -- jamais un alignement direct sur la cible.
  const traveledFromNeutral = Math.abs(tower.aimAngle - -Math.PI / 2);
  assert.ok(traveledFromNeutral <= maxStep, `aimAngle a avancé de ${traveledFromNeutral.toFixed(4)} rad en un seul pas (max autorisé ${maxStep.toFixed(4)})`);
  assert.ok(traveledFromNeutral > 0, "aimAngle doit tout de même commencer à se rapprocher de la cible dès ce pas");
});

test("tower.aimAngle converge vers l'angle réel de la cible après plusieurs pas, sans jamais dépasser le pas maximal autorisé à un seul tick", () => {
  const state = createLevelState(makeTestLevel());
  enterWave(state);
  buildTower(state, "a", "rapide");
  pushEnemy(state, "standard", 170, 0, 0);
  const maxStep = TOWER_AIM_TURN_RATE * (DT / 1000) + 1e-6;
  let prevAngle = state.towers[0].aimAngle ?? -Math.PI / 2;
  for (let i = 0; i < 60; i++) {
    tick(state, DT);
    const tower = state.towers[0];
    const delta = Math.abs(tower.aimAngle - prevAngle);
    // Le pas réel peut être mesuré sur un cercle (±π) : on prend le plus court.
    const wrapped = Math.min(delta, Math.PI * 2 - delta);
    assert.ok(wrapped <= maxStep, `pas d'angle ${wrapped.toFixed(4)} au tick ${i} dépasse le maximum autorisé ${maxStep.toFixed(4)}`);
    prevAngle = tower.aimAngle;
  }
  // La cible est quasiment plein est (angle réel ~0) : après 60 ticks (1s,
  // largement plus que le temps nécessaire pour parcourir moins d'un
  // demi-tour à TOWER_AIM_TURN_RATE), l'angle doit avoir convergé.
  assert.ok(Math.abs(state.towers[0].aimAngle) < 0.1, `aimAngle final ${state.towers[0].aimAngle.toFixed(3)} n'a pas convergé vers 0`);
});

test("la rotation visuelle d'une tour n'influence jamais la direction réelle de ses projectiles", () => {
  const state = createLevelState(makeTestLevel());
  enterWave(state);
  buildTower(state, "a", "rapide");
  pushEnemy(state, "standard", 170, 0, 0);
  // Tire dès que possible : capture le tout premier projectile, au moment
  // précis où tower.aimAngle est encore très loin (quasi au neutre -π/2)
  // de l'angle réel vers la cible -- le cas le plus exigeant pour prouver
  // la décorrélation entre le cosmétique (aimAngle) et le réel (vx,vy).
  let proj = null;
  let tower = null;
  for (let i = 0; i < 300 && !proj; i++) {
    tick(state, DT);
    tower = state.towers[0];
    proj = state.projectiles[0];
  }
  assert.ok(proj, "un projectile doit avoir été tiré");
  const enemy = state.enemies[0];
  const expectedAngle = Math.atan2(enemy.y - tower.y, enemy.x - tower.x);
  const actualAngle = Math.atan2(proj.vy, proj.vx);
  const diff = Math.min(Math.abs(expectedAngle - actualAngle), Math.PI * 2 - Math.abs(expectedAngle - actualAngle));
  assert.ok(diff < 1e-6, `direction réelle du projectile (${actualAngle.toFixed(4)}) diverge de la direction exacte vers la cible (${expectedAngle.toFixed(4)})`);
});
