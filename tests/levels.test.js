import { test } from "node:test";
import assert from "node:assert/strict";
import { LEVELS, validateAllLevels } from "../src/engine/levels.js";
import { createLevelState } from "../src/engine/state.js";
import { tick, buildTower, upgradeTower, requestEarlyWave } from "../src/engine/simulation.js";
import { TOWER_ORDER } from "../src/engine/towers.js";

const DT = 1000 / 60;

test("3 à 5 niveaux réellement présents (cahier des charges V0)", () => {
  assert.ok(LEVELS.length >= 3 && LEVELS.length <= 5, `${LEVELS.length} niveaux (attendu 3 à 5)`);
});

test("aucun niveau ne déclenche d'alerte de validation structurelle", () => {
  const report = validateAllLevels();
  assert.deepEqual(report, {}, `niveaux problématiques: ${JSON.stringify(report, null, 2)}`);
});

test("le niveau 1 est une démonstration simple : une seule famille de tour débloquée", () => {
  assert.equal(LEVELS[0].unlockedTowers.length, 1);
});

test("progression perceptible : chaque niveau débloque au moins autant de familles de tours que le précédent", () => {
  for (let i = 1; i < LEVELS.length; i++) {
    assert.ok(
      LEVELS[i].unlockedTowers.length >= LEVELS[i - 1].unlockedTowers.length,
      `niveau ${LEVELS[i].id} débloque moins de familles que le niveau ${LEVELS[i - 1].id}`
    );
  }
});

test("les 4 familles de tours sont représentées au total sur l'ensemble des niveaux", () => {
  const allUnlocked = new Set(LEVELS.flatMap((l) => l.unlockedTowers));
  for (const family of TOWER_ORDER) assert.ok(allUnlocked.has(family), `famille jamais débloquée: ${family}`);
});

test("seul le dernier niveau peut avoir plusieurs chemins (les autres : un chemin unique au départ)", () => {
  for (const level of LEVELS.slice(0, -1)) {
    assert.equal(level.paths.length, 1, `niveau ${level.id} a plus d'un chemin`);
  }
});

test("chaque niveau a plusieurs vagues", () => {
  for (const level of LEVELS) assert.ok(level.waves.length >= 2, `niveau ${level.id} a moins de 2 vagues`);
});

// --- Non-régression : chaque niveau est réellement terminable, jamais un
// blocage permanent (cahier des charges V0, section 17) -- rejoué avec une
// stratégie de construction/amélioration patiente et raisonnable (jamais un
// rush systématique de chaque vague, qui priverait le joueur du temps de
// préparation prévu par le cahier).
function simulatePatientPlaythrough(level, maxTicks = 60 * 900) {
  const state = createLevelState(level);
  let ticks = 0;
  while (state.status !== "won" && state.status !== "lost" && ticks < maxTicks) {
    for (const slot of state.buildSlots) {
      if (slot.towerId) continue;
      for (const fam of state.unlockedTowers) {
        if (buildTower(state, slot.id, fam)) break;
      }
    }
    for (const t of state.towers) upgradeTower(state, t.id);
    tick(state, DT);
    ticks++;
  }
  return { state, ticks, hitCap: ticks >= maxTicks };
}

for (const level of LEVELS) {
  test(`niveau ${level.id} ("${level.name}") est réellement terminable sans blocage permanent`, () => {
    const { state, hitCap } = simulatePatientPlaythrough(level);
    assert.ok(!hitCap, `niveau ${level.id} : aucun statut terminal atteint dans la borne de temps (blocage suspecté)`);
    assert.ok(state.status === "won" || state.status === "lost", `niveau ${level.id} : statut final inattendu (${state.status})`);
  });
}

test("le niveau 1 est gagnable par un joueur raisonnable (construction+amélioration patientes)", () => {
  const { state } = simulatePatientPlaythrough(LEVELS[0]);
  assert.equal(state.status, "won");
});

test("le lancement anticipé fonctionne sur un vrai niveau (jamais réservé aux tests synthétiques)", () => {
  const state = createLevelState(LEVELS[0]);
  assert.equal(state.status, "prep");
  const before = state.prepRemainingMs;
  requestEarlyWave(state);
  tick(state, DT);
  assert.equal(state.status, "wave");
  assert.ok(before > 0, "le niveau doit avoir un vrai temps de préparation à raccourcir");
});
