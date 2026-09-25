import { computeViewport } from "./viewport.js";
import { ARENA_W, ARENA_H, BASE_R, ENEMY_R, TOWER_R } from "../engine/constants.js";
import { TOWER_FAMILIES } from "../engine/towers.js";
import { ENEMY_KINDS } from "../engine/enemies.js";

// Identité visuelle V1 (cahier des charges V1, section 4) -- passer de
// primitives géométriques abstraites (ronds/triangles/lettres) à un petit
// Tower Defense immédiatement lisible, SANS pipeline d'assets ni animation
// image-par-image : tout est dessiné en Canvas avec des formes fixes
// composées, précalculées une seule fois sur un canvas hors-écran quand
// c'est coûteux (terrain, chemin), puis simplement blitées chaque frame.

const PATH_BORDER_COLOR = "#2a2420";
const PATH_FILL_COLOR = "#8a6d4f";
const PATH_WIDTH = 34;
const BG_COLOR = "#3a5a30";
const SLOT_STONE_COLOR = "#6b6459";
const SLOT_STONE_EDGE = "#4a4438";
const SLOT_GLOW_COLOR = "rgba(233, 196, 106, 0.55)";

// --- PRNG déterministe minimal (mulberry32) -- décor statique stable d'un
// rendu à l'autre pendant une session, jamais de Math.random() qui ferait
// scintiller le décor à chaque frame si jamais il était mal mis en cache.
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Terrain : calculé UNE SEULE FOIS (arène de taille fixe) -----------
let terrainCanvas = null;
function getTerrainCanvas() {
  if (terrainCanvas) return terrainCanvas;
  const c = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(ARENA_W, ARENA_H) : document.createElement("canvas");
  if (!(typeof OffscreenCanvas !== "undefined")) {
    c.width = ARENA_W;
    c.height = ARENA_H;
  }
  const tctx = c.getContext("2d");
  tctx.fillStyle = BG_COLOR;
  tctx.fillRect(0, 0, ARENA_W, ARENA_H);

  const rnd = mulberry32(20260925);
  // Brins d'herbe discrets : petits traits, jamais de bruit dense qui
  // gênerait la lecture (cahier : "sans gêner la lecture").
  for (let i = 0; i < 260; i++) {
    const x = rnd() * ARENA_W;
    const y = rnd() * ARENA_H;
    const shade = rnd() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.08)";
    tctx.strokeStyle = shade;
    tctx.lineWidth = 1.5;
    tctx.beginPath();
    tctx.moveTo(x, y);
    tctx.lineTo(x + (rnd() - 0.5) * 4, y - 5 - rnd() * 4);
    tctx.stroke();
  }
  // Quelques pierres et buissons décoratifs épars.
  for (let i = 0; i < 14; i++) {
    const x = rnd() * ARENA_W;
    const y = rnd() * ARENA_H;
    if (rnd() > 0.5) {
      tctx.fillStyle = "rgba(120,110,95,0.35)";
      tctx.beginPath();
      tctx.ellipse(x, y, 7 + rnd() * 4, 5 + rnd() * 3, 0, 0, Math.PI * 2);
      tctx.fill();
    } else {
      tctx.fillStyle = "rgba(45,75,40,0.5)";
      tctx.beginPath();
      tctx.arc(x, y, 6 + rnd() * 4, 0, Math.PI * 2);
      tctx.fill();
    }
  }
  terrainCanvas = c;
  return c;
}

// --- Chemin décoré : précalculé PAR NIVEAU (les points changent), mis en
// cache par référence du tableau de points -- jamais recalculé à chaque
// frame (coût réel seulement au changement de niveau).
const pathDecorCache = new WeakMap();
function getPathDecor(pathPoints) {
  if (pathDecorCache.has(pathPoints)) return pathDecorCache.get(pathPoints);
  const c = typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(ARENA_W, ARENA_H) : document.createElement("canvas");
  if (!(typeof OffscreenCanvas !== "undefined")) {
    c.width = ARENA_W;
    c.height = ARENA_H;
  }
  const pctx = c.getContext("2d");

  // Bordure sombre (contour propre), puis remplissage terre/pierre plus
  // clair légèrement plus étroit -- lecture immédiate de la trajectoire.
  pctx.lineJoin = "round";
  pctx.lineCap = "round";
  pctx.strokeStyle = PATH_BORDER_COLOR;
  pctx.lineWidth = PATH_WIDTH;
  pctx.beginPath();
  pathPoints.forEach((p, i) => (i === 0 ? pctx.moveTo(p.x, p.y) : pctx.lineTo(p.x, p.y)));
  pctx.stroke();

  pctx.strokeStyle = PATH_FILL_COLOR;
  pctx.lineWidth = PATH_WIDTH - 8;
  pctx.beginPath();
  pathPoints.forEach((p, i) => (i === 0 ? pctx.moveTo(p.x, p.y) : pctx.lineTo(p.x, p.y)));
  pctx.stroke();

  // Quelques galets statiques le long du chemin pour casser l'aplat.
  const rnd = mulberry32(7);
  for (let i = 1; i < pathPoints.length; i++) {
    const a = pathPoints[i - 1];
    const b = pathPoints[i];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    const count = Math.floor(segLen / 40);
    for (let k = 0; k < count; k++) {
      const t = (k + 0.5) / count;
      const px = a.x + (b.x - a.x) * t + (rnd() - 0.5) * (PATH_WIDTH - 14);
      const py = a.y + (b.y - a.y) * t + (rnd() - 0.5) * (PATH_WIDTH - 14);
      pctx.fillStyle = "rgba(60,48,36,0.4)";
      pctx.beginPath();
      pctx.ellipse(px, py, 3 + rnd() * 2, 2 + rnd(), rnd() * Math.PI, 0, Math.PI * 2);
      pctx.fill();
    }
  }
  pathDecorCache.set(pathPoints, c);
  return c;
}

// --- Base : petite forteresse reconnaissable (au lieu d'un cercle "B") --
function drawBase(ctx, point, hpRatio) {
  const { x, y } = point;
  const w = BASE_R * 2.1;
  const h = BASE_R * 1.7;
  // Corps de pierre.
  ctx.fillStyle = "#7a7264";
  ctx.strokeStyle = "#3a352c";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x - w / 2, y + h / 2);
  ctx.lineTo(x - w / 2, y - h / 4);
  ctx.lineTo(x - w / 2 + 4, y - h / 2);
  ctx.lineTo(x + w / 2 - 4, y - h / 2);
  ctx.lineTo(x + w / 2, y - h / 4);
  ctx.lineTo(x + w / 2, y + h / 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Créneaux.
  const merlonCount = 4;
  const merlonW = w / (merlonCount * 2);
  ctx.fillStyle = "#7a7264";
  for (let i = 0; i < merlonCount; i++) {
    const mx = x - w / 2 + merlonW * (2 * i + 0.5);
    ctx.fillRect(mx, y - h / 2 - 6, merlonW, 7);
    ctx.strokeRect(mx, y - h / 2 - 6, merlonW, 7);
  }
  // Porte voûtée.
  ctx.fillStyle = "#241f19";
  ctx.beginPath();
  ctx.moveTo(x - 6, y + h / 2);
  ctx.lineTo(x - 6, y + 2);
  ctx.quadraticCurveTo(x, y - 5, x + 6, y + 2);
  ctx.lineTo(x + 6, y + h / 2);
  ctx.closePath();
  ctx.fill();
  // Bannière (identité chaleureuse, cahier 4.1).
  ctx.strokeStyle = "#5c5346";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y - h / 2 - 6);
  ctx.lineTo(x, y - h / 2 - 20);
  ctx.stroke();
  ctx.fillStyle = "#e76f51";
  ctx.beginPath();
  ctx.moveTo(x, y - h / 2 - 20);
  ctx.lineTo(x + 10, y - h / 2 - 16);
  ctx.lineTo(x, y - h / 2 - 12);
  ctx.closePath();
  ctx.fill();
  // Barre de PV compacte sous la forteresse -- "impact visuel" lisible
  // sans devoir regarder le HUD (cahier 4.1 : "points de vie lisibles").
  const barW = w;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(x - barW / 2, y + h / 2 + 6, barW, 5);
  ctx.fillStyle = hpRatio > 0.4 ? "#7fb069" : "#e63946";
  ctx.fillRect(x - barW / 2, y + h / 2 + 6, barW * Math.max(0, hpRatio), 5);
}

// --- Emplacement vide : socle de pierre intégré au décor (au lieu d'un
// cercle pointillé + croix) -- reste clairement interactif via une lueur.
function drawEmptySlot(ctx, slot) {
  const { x, y } = slot;
  ctx.fillStyle = SLOT_STONE_COLOR;
  ctx.strokeStyle = SLOT_STONE_EDGE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(x, y + 3, TOWER_R * 0.95, TOWER_R * 0.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Lueur douce pulsée statique (pas d'animation par frame requise ici :
  // un simple halo semi-transparent suffit à signaler "constructible").
  ctx.strokeStyle = SLOT_GLOW_COLOR;
  ctx.lineWidth = 2;
  ctx.setLineDash([3, 5]);
  ctx.beginPath();
  ctx.arc(x, y, TOWER_R * 0.7, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(244, 241, 222, 0.7)";
  ctx.beginPath();
  ctx.moveTo(x - 5, y);
  ctx.lineTo(x + 5, y);
  ctx.moveTo(x, y - 5);
  ctx.lineTo(x, y + 5);
  ctx.strokeStyle = "rgba(244, 241, 222, 0.7)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

// Chaque famille a une SILHOUETTE distincte et reconnaissable au premier
// regard (cahier V1, section 4 : "au premier regard, un bêta-testeur doit
// comprendre qu'il voit une base, des tours et des ennemis").
function drawTowerShape(ctx, tower, familyDef) {
  const { x, y } = tower;
  const c = familyDef.color;
  ctx.fillStyle = c;
  ctx.strokeStyle = "#241f19";
  ctx.lineWidth = 2;
  switch (tower.family) {
    case "rapide": {
      // Arbalète montée sur poste : bras anguleux flairés vers l'arrière
      // (silhouette "arme légère"), jamais une simple barre horizontale --
      // trouvé par QA visuelle : un arc fin fondu au poste se lisait comme
      // la lettre "T", pas comme une arbalète.
      ctx.fillRect(x - 3.5, y - 2, 7, 16);
      ctx.strokeRect(x - 3.5, y - 2, 7, 16);
      ctx.strokeStyle = "#3a352c";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x - 14, y - 8);
      ctx.lineTo(x - 3, y - 2);
      ctx.lineTo(x + 3, y - 2);
      ctx.lineTo(x + 14, y - 8);
      ctx.stroke();
      ctx.lineCap = "butt";
      // Encoche/carreau au centre : accent qui vend "tire vite, petits traits".
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(x, y - 10);
      ctx.lineTo(x + 2.5, y - 3);
      ctx.lineTo(x - 2.5, y - 3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#241f19";
      ctx.lineWidth = 1;
      ctx.stroke();
      break;
    }
    case "canon": {
      // Tourelle lourde ronde + canon massif.
      ctx.beginPath();
      ctx.arc(x, y + 4, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#3a352c";
      ctx.fillRect(x - 6, y - 15, 12, 16);
      ctx.strokeRect(x - 6, y - 15, 12, 16);
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x, y - 15, 6, Math.PI, 0);
      ctx.fill();
      break;
    }
    case "longue_portee": {
      // Tour haute effilée en forme de balise/baliste -- silhouette la
      // plus HAUTE des quatre, renforce le rôle "longue portée".
      ctx.beginPath();
      ctx.moveTo(x, y - 24);
      ctx.lineTo(x + 7, y + 10);
      ctx.lineTo(x - 7, y + 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = "#3a352c";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x - 12, y - 8);
      ctx.lineTo(x + 12, y - 8);
      ctx.stroke();
      break;
    }
    case "controle":
    default: {
      // Tour de contrôle : corps CYLINDRIQUE à parois droites (jamais un
      // trapèze "torse") + orbe encastré au sommet -- trouvé par QA
      // visuelle : un trapèze surmonté d'un rond lisait comme une
      // silhouette HUMANOÏDE (torse+tête), risquant une confusion directe
      // avec l'ennemi "standard". Le corps architectural (parois
      // verticales + bandeaux de pierre) évite ce risque.
      ctx.beginPath();
      ctx.moveTo(x - 8, y + 12);
      ctx.lineTo(x - 8, y - 8);
      ctx.lineTo(x - 5, y - 13);
      ctx.lineTo(x + 5, y - 13);
      ctx.lineTo(x + 8, y - 8);
      ctx.lineTo(x + 8, y + 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Bandeaux de pierre (accent architectural, casse la lecture "corps").
      ctx.strokeStyle = "rgba(36,31,25,0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x - 8, y + 3);
      ctx.lineTo(x + 8, y + 3);
      ctx.stroke();
      const grad = ctx.createRadialGradient(x, y - 15, 1, x, y - 15, 7);
      grad.addColorStop(0, "#eafff9");
      grad.addColorStop(1, c);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y - 15, 6, 0, Math.PI * 2);
      ctx.fill();
      // Petits rayons d'énergie autour de l'orbe -- vend "magie" sans
      // ressembler à des yeux/un visage.
      ctx.strokeStyle = c;
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        const ang = (Math.PI / 2) * i + Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(ang) * 8, y - 15 + Math.sin(ang) * 8);
        ctx.lineTo(x + Math.cos(ang) * 11, y - 15 + Math.sin(ang) * 11);
        ctx.stroke();
      }
      ctx.strokeStyle = "#241f19";
      ctx.lineWidth = 1.5;
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
    ctx.arc(x, y - 30 - i * 6, 3, 0, Math.PI * 2);
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

// 4 silhouettes d'ennemis reconnaissables (cahier V1, tableau 4.1) --
// jamais de simple rond de couleur : standard = "grognard" à 2 cercles,
// rapide = flèche effilée, blindé = bloc anguleux riveté, essaim = grappe
// de petits corps.
function drawEnemy(ctx, enemy, elapsedMs) {
  const kindDef = ENEMY_KINDS[enemy.kind];
  const slowed = enemy.slowUntilMs > elapsedMs;
  const color = slowed ? "#8ecae6" : kindDef.color;
  const { x, y } = enemy;
  ctx.fillStyle = color;
  ctx.strokeStyle = "#241f19";
  ctx.lineWidth = 1.5;

  switch (enemy.kind) {
    case "rapide": {
      ctx.beginPath();
      ctx.moveTo(x, y - ENEMY_R * 1.3);
      ctx.lineTo(x + ENEMY_R * 0.8, y + ENEMY_R * 0.6);
      ctx.lineTo(x, y + ENEMY_R * 0.1);
      ctx.lineTo(x - ENEMY_R * 0.8, y + ENEMY_R * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case "blinde": {
      ctx.beginPath();
      ctx.moveTo(x - ENEMY_R, y - ENEMY_R * 0.6);
      ctx.lineTo(x - ENEMY_R * 0.6, y - ENEMY_R);
      ctx.lineTo(x + ENEMY_R * 0.6, y - ENEMY_R);
      ctx.lineTo(x + ENEMY_R, y - ENEMY_R * 0.6);
      ctx.lineTo(x + ENEMY_R, y + ENEMY_R * 0.6);
      ctx.lineTo(x + ENEMY_R * 0.6, y + ENEMY_R);
      ctx.lineTo(x - ENEMY_R * 0.6, y + ENEMY_R);
      ctx.lineTo(x - ENEMY_R, y + ENEMY_R * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // Rivets.
      ctx.fillStyle = "#f4f1de";
      [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].forEach(([dx, dy]) => {
        ctx.beginPath();
        ctx.arc(x + dx * ENEMY_R, y + dy * ENEMY_R, 1.3, 0, Math.PI * 2);
        ctx.fill();
      });
      break;
    }
    case "essaim": {
      const offsets = [
        [0, -ENEMY_R * 0.5],
        [-ENEMY_R * 0.55, ENEMY_R * 0.4],
        [ENEMY_R * 0.55, ENEMY_R * 0.4],
      ];
      for (const [dx, dy] of offsets) {
        ctx.beginPath();
        ctx.arc(x + dx, y + dy, ENEMY_R * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      break;
    }
    case "standard":
    default: {
      // "Grognard" : corps + tête, silhouette simple à 2 cercles.
      ctx.beginPath();
      ctx.arc(x, y + ENEMY_R * 0.35, ENEMY_R * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y - ENEMY_R * 0.55, ENEMY_R * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
  }

  // Barre de vie compacte (inchangée -- déjà lisible et testée).
  const w = ENEMY_R * 2.2;
  const ratio = Math.max(0, enemy.hp / enemy.maxHp);
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(x - w / 2, y - ENEMY_R - 8, w, 4);
  ctx.fillStyle = ratio > 0.4 ? "#7fb069" : "#e63946";
  ctx.fillRect(x - w / 2, y - ENEMY_R - 8, w * ratio, 4);
}

// Projectiles distincts par famille -- forme, pas seulement couleur.
function drawProjectile(ctx, proj) {
  const familyDef = TOWER_FAMILIES[proj.family];
  ctx.fillStyle = familyDef.color;
  if (proj.family === "longue_portee") {
    ctx.strokeStyle = familyDef.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(proj.x - proj.vx * 0.025, proj.y - proj.vy * 0.025);
    ctx.lineTo(proj.x, proj.y);
    ctx.stroke();
  } else if (proj.family === "controle") {
    // Petit anneau "magique" plutôt qu'un disque plein.
    ctx.strokeStyle = familyDef.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, 4.5, 0, Math.PI * 2);
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
    // Flash rouge plein, distinct des anneaux dorés d'impact de tour --
    // conséquence d'un coup porté à LA BASE, doit être impossible à manquer
    // à l'écran même sans le son (retour bêta physique V0 : le seul HUD
    // discret + un son optionnel n'étaient pas une "conséquence visible").
    if (fx.kind === "base_hit") {
      ctx.fillStyle = `rgba(231, 111, 81, ${alpha * 0.75})`;
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, (fx.radius || 14) * (1 + t * 0.9), 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
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

  ctx.drawImage(getTerrainCanvas(), 0, 0);
  for (const pathData of state.paths) ctx.drawImage(getPathDecor(pathData.points), 0, 0);

  const baseHpRatio = Math.max(0, state.baseHp) / state.baseMaxHp;
  for (const pathData of state.paths) {
    const last = pathData.points[pathData.points.length - 1];
    drawBase(ctx, last, baseHpRatio);
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
