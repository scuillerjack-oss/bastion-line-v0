// Boucle de simulation à pas de temps fixe (voir src/main.js pour
// l'accumulateur qui appelle tick() avec un dtMs constant) -- jamais un dt
// variable dépendant du framerate réel, pour que la logique reste
// déterministe et testable indépendamment du rendu (même discipline que les
// projets précédents).
import { ENEMY_KINDS } from "./enemies.js";
import { TOWER_FAMILIES, getMaxTier, getTowerSellRefund } from "./towers.js";
import { entryPointFor, positionAtProgress, freshId } from "./state.js";
import { TOWER_AIM_TURN_RATE } from "./constants.js";

// Correction V8 (cahier V8, section 3) : la catapulte ("longue_portee") doit
// être la plus LENTE des 3 projectiles -- avant ce correctif elle avait
// paradoxalement la vitesse la plus élevée (900). Combiné à la poursuite
// (homing, voir stepProjectiles) qui réoriente en continu vers la position
// courante de la cible, un projectile plus lent que la vitesse des ennemis
// rapides/éclaireurs ne les rattrape jamais tant qu'ils s'éloignent -- c'est
// ce qui matérialise "mauvaise réponse aux cibles rapides" sans règle
// spéciale de ciblage.
export const PROJECTILE_SPEED = { rapide: 520, canon: 260, longue_portee: 130 };
const HIT_RADIUS = 12;

function startWave(state) {
  state.waveIndex += 1;
  const wave = state.level.waves[state.waveIndex];
  state.spawnQueueRemaining = wave.spawns.map((s) => ({ ...s })).sort((a, b) => a.delayMs - b.delayMs);
  state.waveElapsedMs = 0;
  state.status = "wave";
  state.events.push({ type: "wave_started", waveNumber: state.waveIndex + 1, totalWaves: state.totalWaves });
}

function spawnEnemy(state, spawn) {
  const kind = ENEMY_KINDS[spawn.kind];
  const entry = entryPointFor(state, spawn.pathIndex);
  state.enemies.push({
    id: freshId("e"),
    kind: kind.id,
    pathIndex: spawn.pathIndex,
    traveled: 0,
    hp: kind.hp,
    maxHp: kind.hp,
    speed: kind.speed,
    x: entry.x,
    y: entry.y,
    // prevX/prevY : position au tick PRÉCÉDENT, utilisée uniquement par le
    // rendu pour interpoler entre deux ticks (voir ui/render.js et le
    // commentaire détaillé dans stepEnemies ci-dessous) -- jamais lue par la
    // simulation/collision elle-même. Initialisées au point d'entrée pour
    // qu'un ennemi tout juste apparu ne semble jamais "glisser" depuis une
    // position antérieure inexistante.
    prevX: entry.x,
    prevY: entry.y,
    slowFactor: 1,
    slowUntilMs: 0,
    alive: true,
  });
  state.events.push({ type: "enemy_spawned", kind: kind.id });
}

// Correction V7 à la cause (cahier V7, section 3) : la bêta réelle montrait
// des "sauts" visibles près de certains virages. Cause réelle identifiée :
// AUCUN bug de trajectoire -- stepEnemies() avançait déjà `traveled` de façon
// strictement continue (voir engine/path.js, pointAtDistance), et le test
// géométrique de corridor (tests/pathing.test.js, V6) le confirme toujours.
// Le vrai défaut est entre la simulation et l'AFFICHAGE : main.js fait
// avancer la simulation par pas FIXE (FIXED_DT = 1000/60) via un
// accumulateur piloté par requestAnimationFrame, mais ne dessinait QUE la
// dernière position simulée, sans jamais interpoler la fraction de temps
// encore non simulée (state.accMs restant). Sur un écran à fréquence de
// rafraîchissement supérieure à 60Hz (90/120Hz, très répandu sur téléphone
// réel -- jamais reproduit par la suite Playwright, qui tourne à un rythme
// de rendu différent), certaines frames tombent SANS tick du tout puis une
// frame suivante en effectue un ou plusieurs d'un coup : le delta de
// position affiché d'une frame à l'autre devient irrégulier. Sur une ligne
// droite cette irrégularité est peu visible (juste une vitesse qui semble
// légèrement saccadée) ; DANS un virage, où la direction du déplacement
// change, cette même irrégularité se lit comme un repositionnement brusque
// -- exactement le symptôme rapporté, et exactement pourquoi il est "plus
// visible près de certains virages" sans jamais être spécifique à UN virage
// en particulier (cause systémique, pas un défaut de tracé -- aucune
// coordonnée de PATH_MAP n'a été modifiée pour ce correctif).
//
// Remède structurel : stepEnemies() mémorise désormais, à CHAQUE tick, la
// position juste avant de la faire avancer (prevX/prevY). ui/render.js
// recevra un facteur alpha = fraction du prochain tick déjà écoulée
// (state.accMs / FIXED_DT, voir main.js) et dessinera l'ennemi à la position
// interpolée entre prevX/prevY et x/y -- jamais la simulation elle-même, qui
// reste strictement inchangée (déterministe, testée par tick fixe).
function stepEnemies(state, dtMs) {
  const dt = dtMs / 1000;
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    enemy.prevX = enemy.x;
    enemy.prevY = enemy.y;
    const slowActive = enemy.slowUntilMs > state.elapsedMs;
    const speedFactor = slowActive ? enemy.slowFactor : 1;
    enemy.traveled += enemy.speed * speedFactor * dt;
    const pos = positionAtProgress(state, enemy.pathIndex, enemy.traveled);
    enemy.x = pos.x;
    enemy.y = pos.y;
    const pathData = state.paths[enemy.pathIndex];
    if (enemy.traveled >= pathData.totalLength) {
      enemy.alive = false;
      const kindDef = ENEMY_KINDS[enemy.kind];
      state.baseHp -= kindDef.baseDamage ?? 1;
      state.events.push({ type: "base_hit", kind: enemy.kind, damage: kindDef.baseDamage ?? 1, x: enemy.x, y: enemy.y });
    }
  }
}

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

// Ciblage : parmi les ennemis vivants à portée, vise celui qui a parcouru le
// plus de distance sur SON chemin (le plus proche de la base) -- stratégie
// "premier" classique du genre, déterministe et donc testable.
function findTarget(state, tower, tierStats) {
  let best = null;
  let bestTraveled = -1;
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
    if (distance(tower.x, tower.y, enemy.x, enemy.y) > tierStats.range) continue;
    if (enemy.traveled > bestTraveled) {
      bestTraveled = enemy.traveled;
      best = enemy;
    }
  }
  return best;
}

function fireProjectile(state, tower, tierStats, target) {
  const speed = PROJECTILE_SPEED[tower.family];
  const dx = target.x - tower.x;
  const dy = target.y - tower.y;
  const len = Math.hypot(dx, dy) || 1;
  state.projectiles.push({
    id: freshId("p"),
    family: tower.family,
    x: tower.x,
    y: tower.y,
    // prevX/prevY : même rôle que pour les ennemis (voir stepEnemies) --
    // interpolation de RENDU uniquement, jamais lu par la simulation.
    prevX: tower.x,
    prevY: tower.y,
    vx: (dx / len) * speed,
    vy: (dy / len) * speed,
    speed,
    targetId: target.id,
    damage: tierStats.damage,
    aoeRadius: tierStats.aoeRadius || 0,
    slowFactor: tierStats.slowFactor || 0,
    slowDurationMs: tierStats.slowDurationMs || 0,
    slowAoeRadius: tierStats.slowAoeRadius || 0,
    bonusVsArmored: tierStats.bonusVsArmored || 1,
    alive: true,
  });
  state.events.push({ type: "tower_fired", family: tower.family, towerId: tower.id });
}

// Pas angulaire le plus court de `from` vers `to` (normalisé dans ]-π, π]),
// jamais la différence brute qui pourrait franchir la discontinuité à ±π.
function shortestAngleDelta(from, to) {
  let delta = (to - from) % (Math.PI * 2);
  if (delta > Math.PI) delta -= Math.PI * 2;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

function stepTowerAim(tower, dtMs) {
  if (tower.aimAngle === undefined) tower.aimAngle = -Math.PI / 2; // neutre : vers le haut
  if (tower.aimTargetAngle === undefined) return;
  const delta = shortestAngleDelta(tower.aimAngle, tower.aimTargetAngle);
  const maxStep = TOWER_AIM_TURN_RATE * (dtMs / 1000);
  tower.aimAngle += Math.max(-maxStep, Math.min(maxStep, delta));
}

// 8 directions compas (cahier "Prochaine version candidate bêta", sections
// 4-5) -- correspond exactement aux 8 sprites directionnels découpés de la
// planche Leonardo baliste (voir ui/render.js, BALISTE_SPRITE_CONFIG,
// mêmes noms). Index i -> angle i*45°, E=0° cohérent avec Math.atan2
// (x+ = 0°, y+ = 90° car l'axe y de l'écran pointe vers le bas) -- un seul
// endroit définit la correspondance index/angle, jamais une table dupliquée
// qui pourrait diverger entre simulation et rendu.
export const BALISTE_DIRECTIONS = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"];
function directionAngle(index) {
  const deg = index * 45;
  return ((deg > 180 ? deg - 360 : deg) * Math.PI) / 180;
}
function nearestDirectionIndex(angle) {
  let best = 0;
  let bestDelta = Infinity;
  for (let i = 0; i < BALISTE_DIRECTIONS.length; i++) {
    const delta = Math.abs(shortestAngleDelta(directionAngle(i), angle));
    if (delta < bestDelta) {
      bestDelta = delta;
      best = i;
    }
  }
  return best;
}
// Hystérésis (cahier, section 4 : "éviter les changements d'orientation
// excessivement nerveux si la cible oscille autour d'une limite angulaire
// ... une petite logique de stabilisation/hystérésis peut être utilisée").
// Sans elle, une cible oscillant pile à la frontière entre deux secteurs de
// 45° ferait reclignoter le sprite affiché à chaque tick (le plus proche
// recalculé brut change de camp à chaque micro-mouvement). La direction
// déjà sélectionnée n'est abandonnée que si l'angle lissé s'en est VRAIMENT
// éloigné de plus que la moitié d'un secteur (22.5°) PLUS une marge (6°) --
// un secteur "collant" de 28.5° de rayon, jamais un simple arrondi au plus
// proche recalculé indépendamment à chaque tick.
const BALISTE_SECTOR_HALF_WIDTH = Math.PI / 8; // 22.5°
const BALISTE_HYSTERESIS_MARGIN = (6 * Math.PI) / 180;

function stepTowerSpriteDirection(tower) {
  if (tower.baliste8Dir === undefined) {
    tower.baliste8Dir = nearestDirectionIndex(tower.aimAngle);
    return;
  }
  const deltaFromCurrent = Math.abs(shortestAngleDelta(directionAngle(tower.baliste8Dir), tower.aimAngle));
  if (deltaFromCurrent <= BALISTE_SECTOR_HALF_WIDTH + BALISTE_HYSTERESIS_MARGIN) return; // reste sur la direction actuelle
  tower.baliste8Dir = nearestDirectionIndex(tower.aimAngle);
}

function stepTowers(state, dtMs) {
  for (const tower of state.towers) {
    tower.cooldownRemainingMs = Math.max(0, (tower.cooldownRemainingMs || 0) - dtMs);
    const tierStats = TOWER_FAMILIES[tower.family].tiers[tower.tier];
    // Cible RÉELLEMENT visée pour le rendu (cahier V7-polish, section 4) :
    // recalculée à CHAQUE pas, jamais seulement au moment du tir, pour
    // qu'une tour en rechargement suive déjà visuellement la cible qu'elle
    // tirera au prochain tir, plutôt que de rester figée sur son dernier
    // angle de tir. N'influence JAMAIS la trajectoire réelle d'un
    // projectile (fireProjectile vise toujours la position exacte de la
    // cible choisie au moment du tir) -- purement cosmétique.
    const liveTarget = findTarget(state, tower, tierStats);
    if (liveTarget) {
      tower.aimTargetAngle = Math.atan2(liveTarget.y - tower.y, liveTarget.x - tower.x);
    }
    stepTowerAim(tower, dtMs);
    stepTowerSpriteDirection(tower);
    if (tower.cooldownRemainingMs > 0) continue;
    if (!liveTarget) continue;
    fireProjectile(state, tower, tierStats, liveTarget);
    tower.cooldownRemainingMs = tierStats.fireIntervalMs;
  }
}

function applyDamage(state, enemy, damage, sourceFamily, bonusVsArmored) {
  const kindDef = ENEMY_KINDS[enemy.kind];
  const finalDamage = kindDef.armored && sourceFamily === "longue_portee" ? damage * bonusVsArmored : damage;
  enemy.hp -= finalDamage;
  if (enemy.hp <= 0 && enemy.alive) {
    enemy.alive = false;
    state.coins += kindDef.coinReward;
    state.events.push({ type: "enemy_killed", kind: enemy.kind, coins: kindDef.coinReward });
  }
}

function applySlow(state, enemy, slowFactor, slowDurationMs) {
  if (!slowFactor) return;
  const newUntil = state.elapsedMs + slowDurationMs;
  const currentlyActive = enemy.slowUntilMs > state.elapsedMs;
  // Ne prend jamais le ralentissement le plus FAIBLE si un plus fort est déjà
  // actif (pas d'empilement additif, mais jamais un rafraîchissement qui
  // affaiblirait un effet déjà en cours).
  if (!currentlyActive || slowFactor < enemy.slowFactor) {
    enemy.slowFactor = slowFactor;
  }
  enemy.slowUntilMs = Math.max(enemy.slowUntilMs, newUntil);
}

function resolveProjectileImpact(state, proj, impactX, impactY) {
  if (proj.aoeRadius > 0) {
    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      if (distance(enemy.x, enemy.y, impactX, impactY) <= proj.aoeRadius) {
        applyDamage(state, enemy, proj.damage, proj.family, proj.bonusVsArmored);
        applySlow(state, enemy, proj.slowFactor, proj.slowDurationMs);
      }
    }
    state.events.push({ type: "impact_aoe", x: impactX, y: impactY, radius: proj.aoeRadius, family: proj.family });
    return;
  }
  const target = state.enemies.find((e) => e.id === proj.targetId);
  if (target && target.alive) {
    applyDamage(state, target, proj.damage, proj.family, proj.bonusVsArmored);
    applySlow(state, target, proj.slowFactor, proj.slowDurationMs);
    if (proj.slowAoeRadius > 0) {
      for (const enemy of state.enemies) {
        if (!enemy.alive || enemy.id === target.id) continue;
        if (distance(enemy.x, enemy.y, target.x, target.y) <= proj.slowAoeRadius) {
          applySlow(state, enemy, proj.slowFactor, proj.slowDurationMs);
        }
      }
    }
  }
  state.events.push({ type: "impact_single", x: impactX, y: impactY, family: proj.family });
}

function stepProjectiles(state, dtMs) {
  const dt = dtMs / 1000;
  for (const proj of state.projectiles) {
    if (!proj.alive) continue;
    proj.prevX = proj.x;
    proj.prevY = proj.y;
    const target = state.enemies.find((e) => e.id === proj.targetId);
    if (target && target.alive) {
      // Poursuite (homing) : réoriente vers la position ACTUELLE de la
      // cible -- sans ça, un projectile lent viserait un point déjà
      // quitté par un ennemi rapide, ratant systématiquement (mesuré lors
      // de la conception : indispensable pour "canon" vs "rapide").
      const dx = target.x - proj.x;
      const dy = target.y - proj.y;
      const len = Math.hypot(dx, dy) || 1;
      proj.vx = (dx / len) * proj.speed;
      proj.vy = (dy / len) * proj.speed;
    }
    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;

    const reachedTarget = target && target.alive && distance(proj.x, proj.y, target.x, target.y) <= HIT_RADIUS;
    const outOfBounds = proj.x < -40 || proj.x > state.arena.w + 40 || proj.y < -40 || proj.y > state.arena.h + 40;
    const lostTarget = !target || !target.alive;

    if (reachedTarget) {
      resolveProjectileImpact(state, proj, proj.x, proj.y);
      proj.alive = false;
    } else if (lostTarget || outOfBounds) {
      // Cible déjà éliminée par un autre tir avant l'impact : le projectile
      // se dissipe sans effet (jamais un dégât fantôme sur personne), sauf
      // s'il a une zone d'effet, où il explose quand même à sa dernière
      // position -- cohérent avec un canon qui reste utile contre un
      // groupe même si SA cible précise vient d'être achevée.
      if (proj.aoeRadius > 0 && lostTarget) {
        resolveProjectileImpact(state, proj, proj.x, proj.y);
      }
      proj.alive = false;
    }
  }
  state.projectiles = state.projectiles.filter((p) => p.alive);
}

function checkWaveClear(state) {
  if (state.spawnQueueRemaining.length > 0 || state.enemies.length > 0) return;
  state.events.push({ type: "wave_cleared", waveNumber: state.waveIndex + 1 });
  if (state.waveIndex >= state.totalWaves - 1) {
    state.status = "won";
    state.events.push({ type: "level_won" });
  } else {
    state.status = "prep";
    state.prepRemainingMs = state.level.waves[state.waveIndex + 1].prepMs;
  }
}

/**
 * @param {object} state état muté en place (voir createLevelState)
 * @param {number} dtMs pas de temps FIXE
 */
export function tick(state, dtMs) {
  state.events = [];
  if (state.status === "won" || state.status === "lost") return state;

  if (state.status === "prep") {
    state.prepRemainingMs -= dtMs;
    state.elapsedMs += dtMs;
    if (state.prepRemainingMs <= 0) startWave(state);
    return state;
  }

  // status === "wave"
  state.waveElapsedMs += dtMs;
  while (state.spawnQueueRemaining.length && state.spawnQueueRemaining[0].delayMs <= state.waveElapsedMs) {
    spawnEnemy(state, state.spawnQueueRemaining.shift());
  }

  stepEnemies(state, dtMs);

  if (state.baseHp <= 0) {
    state.status = "lost";
    state.events.push({ type: "level_lost" });
    state.elapsedMs += dtMs;
    return state;
  }

  stepTowers(state, dtMs);
  stepProjectiles(state, dtMs);
  state.enemies = state.enemies.filter((e) => e.alive);

  checkWaveClear(state);
  state.elapsedMs += dtMs;
  return state;
}

// --- Actions discrètes déclenchées par l'interface (jamais dans tick(),
// exactement comme un tap/clic n'a pas de raison d'attendre le prochain
// pas de simulation pour être validé) -----------------------------------

export function buildTower(state, slotId, familyId) {
  if (state.status === "won" || state.status === "lost") return false;
  if (!state.unlockedTowers.includes(familyId)) return false;
  const slot = state.buildSlots.find((s) => s.id === slotId);
  if (!slot || slot.towerId) return false;
  const family = TOWER_FAMILIES[familyId];
  if (state.coins < family.buildCost) return false;
  state.coins -= family.buildCost;
  const tower = {
    id: freshId("t"),
    slotId,
    family: familyId,
    tier: 0,
    x: slot.x,
    y: slot.y,
    cooldownRemainingMs: 0,
  };
  state.towers.push(tower);
  slot.towerId = tower.id;
  state.events.push({ type: "tower_built", family: familyId, towerId: tower.id });
  return true;
}

export function upgradeTower(state, towerId) {
  if (state.status === "won" || state.status === "lost") return false;
  const tower = state.towers.find((t) => t.id === towerId);
  if (!tower) return false;
  const maxTier = getMaxTier(tower.family);
  if (tower.tier >= maxTier) return false;
  const nextTierStats = TOWER_FAMILIES[tower.family].tiers[tower.tier + 1];
  if (state.coins < nextTierStats.upgradeCost) return false;
  state.coins -= nextTierStats.upgradeCost;
  tower.tier += 1;
  state.events.push({ type: "tower_upgraded", family: tower.family, towerId: tower.id, tier: tower.tier });
  return true;
}

// Revente d'une tour (cahier V4, section 3) : "Après vente : supprimer
// proprement la tour, libérer l'emplacement et créditer exactement la
// somme annoncée." Le montant crédité provient de getTowerSellRefund(),
// LA MÊME fonction que celle utilisée pour l'affichage AVANT confirmation
// (src/main.js) -- une seule source de vérité, jamais un calcul dupliqué
// qui pourrait diverger entre "montant affiché" et "montant crédité"
// (cahier, section 9 : "montant affiché = montant réellement crédité").
export function sellTower(state, towerId) {
  if (state.status === "won" || state.status === "lost") return false;
  const index = state.towers.findIndex((t) => t.id === towerId);
  if (index === -1) return false;
  const tower = state.towers[index];
  const refund = getTowerSellRefund(tower);
  state.coins += refund;
  state.towers.splice(index, 1);
  const slot = state.buildSlots.find((s) => s.id === tower.slotId);
  if (slot) slot.towerId = null;
  if (state.selectedTowerId === tower.id) state.selectedTowerId = null;
  state.events.push({ type: "tower_sold", family: tower.family, towerId: tower.id, refund });
  return true;
}

export function requestEarlyWave(state) {
  if (state.status !== "prep") return false;
  state.prepRemainingMs = 0;
  return true;
}
