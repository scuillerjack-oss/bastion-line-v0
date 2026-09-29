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
      // Zone de départ exclue = exactement le PREMIER segment du chemin
      // (jamais un nombre choisi au hasard) : sur les niveaux à voie unique,
      // ce premier segment fait déjà partie du tracé réel (l'exclure ne
      // retire donc presque rien à la couverture du test) ; sur le niveau 5
      // (cahier V5, limite documentée), c'est PRÉCISÉMENT le segment
      // synthétique qui relie l'entrée décalée à la route réelle -- il ne
      // PEUT pas être proche de l'axe mesuré par construction, sans que
      // cela révèle un défaut de trajectoire.
      const skipStartDistance = pathData.segLengths[0] ?? 0;
      let maxDeviation = 0;
      let worstAt = null;
      for (let d = skipStartDistance; d <= pathData.totalLength; d += stepMs) {
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
