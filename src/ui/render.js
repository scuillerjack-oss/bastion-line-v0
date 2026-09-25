import { computeViewport } from "./viewport.js";
import { ARENA_W, ARENA_H, BASE_R, ENEMY_R, TOWER_R } from "../engine/constants.js";
import { TOWER_FAMILIES } from "../engine/towers.js";
import { ENEMY_KINDS } from "../engine/enemies.js";

const PATH_COLOR = "#3a3430";
const PATH_WIDTH = 34;
const BG_COLOR = "#1b2e20";
const SLOT_EMPTY_COLOR = "rgba(233, 196, 106, 0.35)";

function drawPath(ctx, pathPoints) {
  ctx.strokeStyle = PATH_COLOR;
  ctx.lineWidth = PATH_WIDTH;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  pathPoints.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.stroke();
}

function drawBase(ctx, point) {
  ctx.fillStyle = "#588157";
  ctx.beginPath();
  ctx.arc(point.x, point.y, BASE_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#e9c46a";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = "#0d1a12";
  ctx.font = "bold 16px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("B", point.x, point.y + 1);
}

function drawEmptySlot(ctx, slot) {
  ctx.strokeStyle = SLOT_EMPTY_COLOR;
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(slot.x, slot.y, TOWER_R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = SLOT_EMPTY_COLOR;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(slot.x - 6, slot.y);
  ctx.lineTo(slot.x + 6, slot.y);
  ctx.moveTo(slot.x, slot.y - 6);
  ctx.lineTo(slot.x, slot.y + 6);
  ctx.stroke();
}

// Chaque famille a une SILHOUETTE distincte (pas seulement une couleur) --
// cahier des charges V0 : "les différences doivent être ressenties en jeu,
// pas seulement exister sous forme de statistiques invisibles".
function drawTowerShape(ctx, tower, familyDef) {
  const { x, y } = tower;
  ctx.fillStyle = familyDef.color;
  ctx.strokeStyle = "#0d1a12";
  ctx.lineWidth = 2;
  switch (tower.family) {
    case "rapide": {
      // Petit triangle agile
      ctx.beginPath();
      ctx.moveTo(x, y - 13);
      ctx.lineTo(x + 11, y + 9);
      ctx.lineTo(x - 11, y + 9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "canon": {
      // Carré massif
      ctx.fillRect(x - 12, y - 12, 24, 24);
      ctx.strokeRect(x - 12, y - 12, 24, 24);
      break;
    }
    case "longue_portee": {
      // Losange fin et haut
      ctx.beginPath();
      ctx.moveTo(x, y - 15);
      ctx.lineTo(x + 8, y);
      ctx.lineTo(x, y + 15);
      ctx.lineTo(x - 8, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "controle":
    default: {
      // Hexagone
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const px = x + Math.cos(angle) * 13;
        const py = y + Math.sin(angle) * 13;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
  }
  // Anneaux de palier : un petit anneau par palier possédé au-dessus de la
  // tour -- lisible d'un coup d'oeil sans devoir ouvrir le panneau.
  for (let i = 0; i < tower.tier; i++) {
    ctx.strokeStyle = "#f4f1de";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y - 20 - i * 6, 3, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawRange(ctx, tower, tierStats) {
  ctx.strokeStyle = "rgba(244, 241, 222, 0.5)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(tower.x, tower.y, tierStats.range, 0, Math.PI * 2);
  ctx.stroke();
}

function drawEnemy(ctx, enemy, elapsedMs) {
  const kindDef = ENEMY_KINDS[enemy.kind];
  const slowed = enemy.slowUntilMs > elapsedMs;
  ctx.fillStyle = slowed ? "#8ecae6" : kindDef.color;
  ctx.beginPath();
  ctx.arc(enemy.x, enemy.y, ENEMY_R, 0, Math.PI * 2);
  ctx.fill();
  if (kindDef.armored) {
    ctx.strokeStyle = "#f4f1de";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // Barre de vie compacte
  const w = ENEMY_R * 2.2;
  const ratio = Math.max(0, enemy.hp / enemy.maxHp);
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(enemy.x - w / 2, enemy.y - ENEMY_R - 8, w, 4);
  ctx.fillStyle = ratio > 0.4 ? "#7fb069" : "#e63946";
  ctx.fillRect(enemy.x - w / 2, enemy.y - ENEMY_R - 8, w * ratio, 4);
}

function drawProjectile(ctx, proj) {
  const familyDef = TOWER_FAMILIES[proj.family];
  ctx.fillStyle = familyDef.color;
  if (proj.family === "longue_portee") {
    ctx.strokeStyle = familyDef.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(proj.x - proj.vx * 0.02, proj.y - proj.vy * 0.02);
    ctx.lineTo(proj.x, proj.y);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, proj.family === "canon" ? 6 : 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEffects(ctx, effects, nowMs) {
  for (const fx of effects) {
    const t = (nowMs - fx.createdAt) / fx.durationMs;
    if (t >= 1) continue;
    const alpha = 1 - t;
    ctx.strokeStyle = `rgba(233, 196, 106, ${alpha})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, (fx.radius || 14) * (0.5 + t * 0.6), 0, Math.PI * 2);
    ctx.stroke();
  }
}

export function drawFrame(ctx, canvasW, canvasH, state, effects, nowMs) {
  const viewport = computeViewport(canvasW, canvasH);
  ctx.save();
  ctx.clearRect(0, 0, canvasW, canvasH);
  ctx.fillStyle = "#0b140d";
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.translate(viewport.offsetX, viewport.offsetY);
  ctx.scale(viewport.scale, viewport.scale);

  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);

  for (const pathData of state.paths) drawPath(ctx, pathData.points);
  for (const pathData of state.paths) {
    const last = pathData.points[pathData.points.length - 1];
    drawBase(ctx, last);
  }

  for (const slot of state.buildSlots) {
    if (!slot.towerId) drawEmptySlot(ctx, slot);
  }
  for (const tower of state.towers) {
    const familyDef = TOWER_FAMILIES[tower.family];
    drawTowerShape(ctx, tower, familyDef);
  }
  if (state.selectedTowerId) {
    const tower = state.towers.find((t) => t.id === state.selectedTowerId);
    if (tower) drawRange(ctx, tower, TOWER_FAMILIES[tower.family].tiers[tower.tier]);
  }

  for (const enemy of state.enemies) drawEnemy(ctx, enemy, state.elapsedMs);
  for (const proj of state.projectiles) drawProjectile(ctx, proj);
  drawEffects(ctx, effects, nowMs);

  ctx.restore();
  return viewport;
}
