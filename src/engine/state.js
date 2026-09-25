import { buildPathData, pointAtDistance } from "./path.js";
import { DEFAULT_BASE_HP, ARENA_W, ARENA_H } from "./constants.js";

let nextEntityId = 1;
function freshId(prefix) {
  return `${prefix}${nextEntityId++}`;
}

export function createLevelState(level) {
  const paths = level.paths.map((points) => buildPathData(points));
  const buildSlots = level.buildSlots.map((s) => ({ id: s.id, x: s.x, y: s.y, towerId: null }));

  return {
    level,
    levelId: level.id,
    levelName: level.name,
    arena: { w: ARENA_W, h: ARENA_H },
    paths,
    buildSlots,
    unlockedTowers: level.unlockedTowers,
    baseHp: level.baseHp ?? DEFAULT_BASE_HP,
    baseMaxHp: level.baseHp ?? DEFAULT_BASE_HP,
    coins: level.startCoins,
    towers: [],
    enemies: [],
    projectiles: [],
    waveIndex: -1,
    totalWaves: level.waves.length,
    status: "prep",
    prepRemainingMs: level.waves[0].prepMs,
    spawnQueueRemaining: [],
    waveElapsedMs: 0,
    elapsedMs: 0,
    events: [],
  };
}

export function entryPointFor(state, pathIndex) {
  const p = state.paths[pathIndex].points[0];
  return { x: p.x, y: p.y };
}

export function positionAtProgress(state, pathIndex, distance) {
  return pointAtDistance(state.paths[pathIndex], distance);
}

export { freshId };
