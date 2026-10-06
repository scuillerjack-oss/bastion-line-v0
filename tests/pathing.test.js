// Non-régression V6 (cahier V6, section 3 : "Ajouter un test ou une
// vérification géométrique permettant de détecter une unité s'éloignant
// excessivement du corridor de route"). Contrairement à une vérification
// purement structurelle (nombre de points, longueur de segment), ce test
// compare le chemin RÉELLEMENT emprunté par un ennemi (via buildPathData/
// pointAtDistance -- exactement les fonctions utilisées par la simulation,
// jamais une copie) à l'axe central RÉELLEMENT mesuré sur l'asset carte
// (tests/fixtures/road_centerline_reference.json, généré une fois par
// assets/leonardo/trace_road.py -- voir engine/levels.js pour la
// simplification Douglas-Peucker qui construit PATH_MAP à partir de cette
// même référence). Si un niveau futur réintroduit un chemin trop
// clairsemé (waypoints à main levée, sans passer par cette référence), ce
// test échoue -- il ne peut pas être satisfait en "resserrant" un seul
// niveau sans réellement suivre la route.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildPathData, pointAtDistance } from "../src/engine/path.js";
import { LEVELS } from "../src/engine/levels.js";
import { PATH_WIDTH } from "../src/engine/constants.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REFERENCE = JSON.parse(readFileSync(join(__dirname, "fixtures", "road_centerline_reference.json"), "utf-8"));

// Tolérance : très supérieure à la tolérance de simplification utilisée à la
// génération de PATH_MAP (1,5 unité), mais très inférieure à la demi-largeur
// réelle de la route (PATH_WIDTH / 2 = 17) -- un dépassement signale un
// vrai décrochage visuel, jamais un artefact d'arrondi.
const MAX_DEVIATION = 6;

function distPointToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function minDistToReference(x, y) {
  let min = Infinity;
  for (let i = 1; i < REFERENCE.length; i++) {
    const [ax, ay] = REFERENCE[i - 1];
    const [bx, by] = REFERENCE[i];
    const d = distPointToSegment(x, y, ax, ay, bx, by);
    if (d < min) min = d;
  }
  return min;
}

for (const level of LEVELS) {
  level.paths.forEach((points, pathIndex) => {
    test(`niveau ${level.id} ("${level.name}"), chemin ${pathIndex} : reste dans le corridor de la route réelle (jamais de virage coupé)`, () => {
      const pathData = buildPathData(points);
      const stepMs = 2; // échantillonnage fin : une position tous les 2 unités logiques parcourues
      // Zones de départ/fin exclues = les ancrages manuels aux deux bouts du
      // chemin (jamais un nombre de segments choisi au hasard) : un waypoint
      // de départ/fin posé à la main (entrée décalée du niveau 5/multiples de
      // 7, portail, porte de la forteresse -- voir engine/levels.js et
      // PATH_5A_FULL/PATH_5B_FULL) est par construction hors du tracé
      // automatique (assets/leonardo/trace_road.py), donc jamais proche de la
      // référence, sans que cela révèle un défaut de trajectoire. On détecte
      // ces ancrages par leur distance réelle à la référence plutôt que de
      // supposer un nombre fixe de segments : certains chemins (niveaux à
      // double voie) empilent DEUX ancrages manuels consécutifs au départ
      // (l'entrée décalée, puis le premier point de PATH_MAP lui-même).
      let startIdx = 0;
      while (startIdx < points.length - 1 && minDistToReference(points[startIdx].x, points[startIdx].y) > MAX_DEVIATION) {
        startIdx++;
      }
      const skipStartDistance = pathData.segLengths.slice(0, startIdx).reduce((a, b) => a + b, 0);
      let endIdx = points.length - 1;
      while (endIdx > 0 && minDistToReference(points[endIdx].x, points[endIdx].y) > MAX_DEVIATION) {
        endIdx--;
      }
      const skipEndDistance = pathData.segLengths.slice(endIdx).reduce((a, b) => a + b, 0);
      let maxDeviation = 0;
      let worstAt = null;
      for (let d = skipStartDistance; d <= pathData.totalLength - skipEndDistance; d += stepMs) {
        const p = pointAtDistance(pathData, d);
        const dev = minDistToReference(p.x, p.y);
        if (dev > maxDeviation) {
          maxDeviation = dev;
          worstAt = p;
        }
      }
      assert.ok(
        maxDeviation <= MAX_DEVIATION,
        `écart maximal au corridor réel = ${maxDeviation.toFixed(2)} (max autorisé ${MAX_DEVIATION}) à ${JSON.stringify(worstAt)}`
      );
    });
  });
}

test("PATH_WIDTH reste cohérent avec la tolérance de corridor utilisée par ces tests (documentation vivante)", () => {
  assert.ok(MAX_DEVIATION < PATH_WIDTH / 2, "la tolérance de test doit rester nettement sous la demi-largeur réelle de la route");
});

// Verrouillage "Prochaine version candidate bêta" (cahier, priorité 1) :
// scripts/smooth_path_turns.py a réduit l'angle de virage instantané maximal
// de PATH_MAP de 67,3° à 19,7° (lissage par coupe de coin ciblée, voir
// engine/levels.js). Ce test ne vérifie jamais un virage précis à la main --
// il verrouille la PROPRIÉTÉ générale (aucun sommet de chemin ne doit
// recréer un pivot quasi instantané) pour toute régression future, quelle
// qu'en soit la cause (édition manuelle d'un niveau, nouvelle génération de
// PATH_MAP...). Seuil choisi nettement au-dessus de la mesure actuelle
// (19,7°) pour ne jamais être fragile à un arrondi, mais très en-deçà de
// l'ancien pire cas (67,3°) pour détecter une vraie régression.
const MAX_TURN_ANGLE_DEG = 30;

function turnAngleDeg(a, b, c) {
  const v1x = b.x - a.x, v1y = b.y - a.y;
  const v2x = c.x - b.x, v2y = c.y - b.y;
  const n1 = Math.hypot(v1x, v1y), n2 = Math.hypot(v2x, v2y);
  if (n1 === 0 || n2 === 0) return 0;
  const dot = Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / (n1 * n2)));
  return (Math.acos(dot) * 180) / Math.PI;
}

for (const level of LEVELS) {
  level.paths.forEach((points, pathIndex) => {
    test(`niveau ${level.id} ("${level.name}"), chemin ${pathIndex} : aucun sommet ne produit un changement de direction instantané excessif`, () => {
      // Les ancrages manuels (entrée décalée, porte de la forteresse --
      // mêmes points que ceux exclus ci-dessus par minDistToReference) ne
      // viennent jamais du tracé automatique/lissé : un angle vif à LEUR
      // jonction est normal et hors du périmètre de ce verrouillage. On
      // n'évalue donc un sommet que si lui-même ET ses deux voisins
      // appartiennent au tracé automatique (à MAX_DEVIATION de la
      // référence dense).
      const onReference = points.map((p) => minDistToReference(p.x, p.y) <= MAX_DEVIATION);
      let worst = 0;
      let worstAt = null;
      for (let i = 1; i < points.length - 1; i++) {
        if (!onReference[i - 1] || !onReference[i] || !onReference[i + 1]) continue;
        const ang = turnAngleDeg(points[i - 1], points[i], points[i + 1]);
        if (ang > worst) {
          worst = ang;
          worstAt = points[i];
        }
      }
      assert.ok(
        worst <= MAX_TURN_ANGLE_DEG,
        `angle de virage ${worst.toFixed(1)}° dépasse le maximum autorisé ${MAX_TURN_ANGLE_DEG}° à ${JSON.stringify(worstAt)}`
      );
    });
  });
}
