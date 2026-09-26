// Non-régression V2 (cahier des charges V2, priorité 1 et section 5) :
// verrouille la cause réelle du bug bêta V1 ("un canon semble posé sur la
// route") -- deux emplacements de niveaux réels étaient placés EXACTEMENT
// sur la ligne centrale du chemin, sans qu'aucune vérification ne l'ait
// jamais détecté. Ces tests couvrent la fonction de validation elle-même
// ET les niveaux réels du jeu (pas seulement un niveau synthétique).
import { test } from "node:test";
import assert from "node:assert/strict";
import { distancePointToSegment, minDistanceToAnyPath, requiredClearance, findFootprintViolations } from "../src/engine/footprint.js";
import { LEVELS, validateAllLevels } from "../src/engine/levels.js";

test("distance point-segment : cas de base (perpendiculaire, sur la ligne, aux extrémités)", () => {
  assert.equal(distancePointToSegment(0, 10, 0, 0, 0, 20), 0); // sur le segment
  assert.equal(distancePointToSegment(10, 10, 0, 0, 0, 20), 10); // perpendiculaire
  assert.equal(distancePointToSegment(0, 30, 0, 0, 0, 20), 10); // au-delà de l'extrémité
});

test("minDistanceToAnyPath : prend le minimum sur tous les segments de tous les chemins", () => {
  const paths = [
    [{ x: 0, y: 0 }, { x: 100, y: 0 }],
    [{ x: 0, y: 50 }, { x: 100, y: 50 }],
  ];
  assert.equal(minDistanceToAnyPath(50, 45, paths), 5); // le plus proche des deux chemins
});

test("un emplacement placé sur le chemin est détecté comme violation", () => {
  const level = {
    paths: [[{ x: 0, y: 0 }, { x: 200, y: 0 }]],
    buildSlots: [{ id: "onPath", x: 100, y: 0 }],
  };
  const violations = findFootprintViolations(level);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].slotId, "onPath");
  assert.equal(violations[0].distance, 0);
});

test("un emplacement suffisamment éloigné du chemin n'est jamais signalé", () => {
  const level = {
    paths: [[{ x: 0, y: 0 }, { x: 200, y: 0 }]],
    buildSlots: [{ id: "far", x: 100, y: requiredClearance() + 5 }],
  };
  assert.deepEqual(findFootprintViolations(level), []);
});

test("un emplacement juste sous le seuil requis est signalé, juste au-dessus ne l'est pas", () => {
  const level = {
    paths: [[{ x: 0, y: 0 }, { x: 200, y: 0 }]],
    buildSlots: [
      { id: "tooClose", x: 100, y: requiredClearance() - 1 },
      { id: "okay", x: 100, y: requiredClearance() + 1 },
    ],
  };
  const violations = findFootprintViolations(level);
  assert.deepEqual(violations.map((v) => v.slotId), ["tooClose"]);
});

// --- Non-régression sur les VRAIS niveaux du jeu (pas un niveau
// synthétique) : c'est ce test qui aurait immédiatement révélé le bug
// bêta V1 s'il avait existé avant. Il doit rester vert en permanence.
test("aucun niveau réel ne contient d'emplacement en violation d'emprise chemin/construction", () => {
  const report = validateAllLevels();
  assert.deepEqual(report, {}, `niveaux en violation d'emprise: ${JSON.stringify(report, null, 2)}`);
});

for (const level of LEVELS) {
  test(`niveau ${level.id} ("${level.name}") : tous les emplacements respectent la marge de sécurité chemin/construction`, () => {
    const violations = findFootprintViolations(level);
    assert.deepEqual(violations, [], `emplacements en violation: ${JSON.stringify(violations)}`);
  });
}
