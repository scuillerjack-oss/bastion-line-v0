import { test } from "node:test";
import assert from "node:assert/strict";
import { LEVELS, validateAllLevels, getWaveComposition, getFirstUnlockLevelNumber } from "../src/engine/levels.js";
import { createLevelState } from "../src/engine/state.js";
import { tick, buildTower, upgradeTower, requestEarlyWave } from "../src/engine/simulation.js";
import { TOWER_ORDER } from "../src/engine/towers.js";

const DT = 1000 / 60;

// Cahier V7, section 7 : "passage de 5 à 50 niveaux réellement jouables".
test("50 niveaux réellement présents (cahier V7, section 7)", () => {
  assert.equal(LEVELS.length, 50);
  assert.deepEqual(LEVELS.map((l) => l.id), Array.from({ length: 50 }, (_, i) => i + 1));
});

test("aucun niveau ne déclenche d'alerte de validation structurelle", () => {
  const report = validateAllLevels();
  assert.deepEqual(report, {}, `niveaux problématiques: ${JSON.stringify(report, null, 2)}`);
});

// --- Aperçu de la composition de vague (cahier V8, section 8) -------------

test("getWaveComposition compte correctement chaque archétype d'une vague, dans l'ordre de première apparition", () => {
  const level = {
    waves: [
      {
        spawns: [
          { kind: "standard", pathIndex: 0, delayMs: 0 },
          { kind: "rapide", pathIndex: 0, delayMs: 500 },
          { kind: "standard", pathIndex: 0, delayMs: 1000 },
          { kind: "standard", pathIndex: 0, delayMs: 1500 },
        ],
      },
    ],
  };
  assert.deepEqual(getWaveComposition(level, 0), [
    { kind: "standard", count: 3 },
    { kind: "rapide", count: 1 },
  ]);
});

test("getWaveComposition renvoie un tableau vide pour un index de vague inexistant", () => {
  const level = { waves: [{ spawns: [{ kind: "standard", pathIndex: 0, delayMs: 0 }] }] };
  assert.deepEqual(getWaveComposition(level, 5), []);
});

test("chaque vague de chaque niveau réel a une composition non vide (l'aperçu n'est jamais affiché vide)", () => {
  for (const level of LEVELS) {
    for (let w = 0; w < level.waves.length; w++) {
      const composition = getWaveComposition(level, w);
      assert.ok(composition.length > 0, `niveau ${level.id}, vague ${w + 1} : composition vide`);
      const totalFromComposition = composition.reduce((sum, c) => sum + c.count, 0);
      assert.equal(totalFromComposition, level.waves[w].spawns.length, `niveau ${level.id}, vague ${w + 1} : effectif total incohérent`);
    }
  }
});

// --- Variété tactique des chemins (cahier V8, section 9) -------------------

test("sur un niveau généré à double chemin, le second chemin n'est jamais un simple miroir du premier", () => {
  // Audit V8 : avant correctif, les deux chemins recevaient exactement la
  // même formule de composition/densité -- un niveau "double chemin" était
  // donc en réalité une seule vague dessinée deux fois. Vérifie que le
  // second chemin a une composition RÉELLEMENT différente (plus légère,
  // plus orientée vitesse) sur chaque vague d'au moins un niveau généré à
  // double chemin.
  const dualPathLevels = LEVELS.filter((l) => l.paths.length > 1 && l.id > 5);
  assert.ok(dualPathLevels.length > 0, "aucun niveau généré à double chemin trouvé");
  for (const level of dualPathLevels) {
    for (let w = 0; w < level.waves.length; w++) {
      const compA = getWaveComposition({ waves: [{ spawns: level.waves[w].spawns.filter((s) => s.pathIndex === 0) }] }, 0);
      const compB = getWaveComposition({ waves: [{ spawns: level.waves[w].spawns.filter((s) => s.pathIndex === 1) }] }, 0);
      const totalA = compA.reduce((sum, c) => sum + c.count, 0);
      const totalB = compB.reduce((sum, c) => sum + c.count, 0);
      assert.ok(totalB < totalA, `niveau ${level.id}, vague ${w + 1} : le second chemin (${totalB}) devrait être plus léger que le premier (${totalA})`);
    }
  }
});

// --- Clarté de progression (cahier V8, section 9) --------------------------

test("getFirstUnlockLevelNumber retrouve le niveau réel de déblocage de chaque famille de tour", () => {
  for (const familyId of TOWER_ORDER) {
    const unlockLevel = getFirstUnlockLevelNumber(familyId);
    assert.ok(Number.isInteger(unlockLevel), `aucun niveau ne débloque ${familyId}`);
    const level = LEVELS.find((l) => l.id === unlockLevel);
    assert.ok(level.unlockedTowers.includes(familyId), `le niveau ${unlockLevel} rapporté ne débloque pas réellement ${familyId}`);
    const earlierLevel = LEVELS.find((l) => l.id === unlockLevel - 1);
    if (earlierLevel) {
      assert.ok(!earlierLevel.unlockedTowers.includes(familyId), `${familyId} était déjà débloqué avant le niveau ${unlockLevel} rapporté`);
    }
  }
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

test("toutes les familles de tours (TOWER_ORDER) sont représentées au total sur l'ensemble des niveaux", () => {
  const allUnlocked = new Set(LEVELS.flatMap((l) => l.unlockedTowers));
  for (const family of TOWER_ORDER) assert.ok(allUnlocked.has(family), `famille jamais débloquée: ${family}`);
});

// Non-régression V3 (cahier, section 3) : "Supprimer la Tour de contrôle du
// jeu et de tous les menus, descriptions, coûts, règles de déblocage et
// tests associés" -- verrouille qu'elle ne peut plus jamais réapparaître
// silencieusement dans un niveau.
test("la Tour de contrôle a bien été retirée : aucun niveau ne la débloque, TOWER_ORDER ne la contient plus", () => {
  assert.ok(!TOWER_ORDER.includes("controle"), "TOWER_ORDER contient encore 'controle'");
  for (const level of LEVELS) {
    assert.ok(!level.unlockedTowers.includes("controle"), `niveau ${level.id} débloque encore 'controle'`);
  }
});

// Non-régression V3 (cahier, section 3) : la Longue portée doit apparaître
// nettement avant le dernier niveau (choix documenté : niveau 3, voir
// levels.js et le rapport technique V3), jamais réservée au niveau final.
test("la Longue portée (Catapulte) est débloquée sensiblement plus tôt que le dernier niveau (V3)", () => {
  const firstLevelWithLonguePortee = LEVELS.find((l) => l.unlockedTowers.includes("longue_portee"));
  assert.ok(firstLevelWithLonguePortee, "aucun niveau ne débloque la longue portée");
  assert.ok(
    firstLevelWithLonguePortee.id <= 5,
    `longue portée débloquée trop tard (niveau ${firstLevelWithLonguePortee.id})`
  );
});

// Mis à jour V7 (cahier V7, section 7 : "privilégier... la variété") :
// les niveaux 1-4 (hand-conçus) restent à chemin unique ; le niveau 5
// (hand-conçu) ET certains niveaux générés (6-50, variété occasionnelle,
// voir engine/levels.js, generateLevel) peuvent avoir deux chemins
// convergents -- jamais systématique, jamais la majorité des niveaux.
test("les 4 premiers niveaux hand-conçus restent à chemin unique ; la double voie reste une variante minoritaire sur l'ensemble de la campagne", () => {
  for (const level of LEVELS.slice(0, 4)) {
    assert.equal(level.paths.length, 1, `niveau ${level.id} a plus d'un chemin`);
  }
  const dualPathCount = LEVELS.filter((l) => l.paths.length > 1).length;
  assert.ok(dualPathCount >= 1, "aucun niveau à double voie -- le mécanisme ne serait plus jamais exercé");
  assert.ok(dualPathCount < LEVELS.length / 2, "la double voie est devenue majoritaire, ce n'est plus une variante occasionnelle");
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
