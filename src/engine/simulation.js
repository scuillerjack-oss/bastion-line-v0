// Boucle de simulation à pas de temps fixe (voir src/main.js pour
// l'accumulateur qui appelle tick() avec un dtMs constant) -- jamais un dt
// variable dépendant du framerate réel, pour que la logique reste
// déterministe et testable indépendamment du rendu (même discipline que les
// projets précédents).
import { ENEMY_KINDS } from "./enemies.js";
import { TOWER_FAMILIES, getMaxTier } from "./towers.js";
import { entryPointFor, positionAtProgress, freshId } from "./state.js";

const PROJECTILE_SPEED = { rapide: 520, canon: 260, longue_portee: 900, controle: 340 };
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
    slowFactor: 1,
    slowUntilMs: 0,
    alive: true,
  });
  state.events.push({ type: "enemy_spawned", kind: kind.id });
}

function stepEnemies(state, dtMs) {
  const dt = dtMs / 1000;
  for (const enemy of state.enemies) {
    if (!enemy.alive) continue;
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
      state.events.push({ type: "base_hit", kind: enemy.kind, damage: kindDef.baseDamage ?? 1 });
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

function stepTowers(state, dtMs) {
  for (const tower of state.towers) {
    tower.cooldownRemainingMs = Math.max(0, (tower.cooldownRemainingMs || 0) - dtMs);
    const tierStats = TOWER_FAMILIES[tower.family].tiers[tower.tier];
    if (tower.cooldownRemainingMs > 0) continue;
    const target = findTarget(state, tower, tierStats);
    if (!target) continue;
    fireProjectile(state, tower, tierStats, target);
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
    state.events.push({ type: "impact_aoe", x: impactX, y: impactY, radius: proj.aoeRadius });
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
  state.events.push({ type: "impact_single", x: impactX, y: impactY });
}

function stepProjectiles(state, dtMs) {
  const dt = dtMs / 1000;
  for (const proj of state.projectiles) {
    if (!proj.alive) continue;
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

export function requestEarlyWave(state) {
  if (state.status !== "prep") return false;
  state.prepRemainingMs = 0;
  return true;
}
