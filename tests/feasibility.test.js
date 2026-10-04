// Non-régression V6 (cahier V6, section 7 : "Créer une batterie de tests/
// simulations de faisabilité pour l'ensemble de la campagne actuellement
// présente" + "chaque niveau actuel dispose d'au moins une stratégie
// gagnante démontrée par test/simulation", cahier V6 section 10). Réutilise
// EXACTEMENT les mêmes stratégies et la même fonction de simulation que
// scripts/simulate_feasibility_v6.mjs (jamais une copie qui pourrait
// diverger silencieusement) -- ce test échoue si un futur changement de
// niveau design, de vagues ou d'équilibrage rend un niveau structurellement
// impossible avec TOUTES les stratégies testées.
//
// Rappel du cahier, explicite : "100% des niveaux faisables" ne signifie
// PAS "100% des simulations gagnent" -- une seule stratégie gagnante par
// niveau suffit à le déclarer faisable. Ce test ne valide donc jamais la
// difficulté ressentie (réservée à la bêta humaine), seulement l'ABSENCE
// d'impossibilité structurelle (manque d'or, dégâts insuffisants, etc.).
import { test } from "node:test";
import assert from "node:assert/strict";
import { LEVELS } from "../src/engine/levels.js";
import { createLevelState } from "../src/engine/state.js";
import { STRATEGIES, simulate } from "../scripts/simulate_feasibility_v6.mjs";

// --- Les 3 stratégies doivent être RÉELLEMENT distinctes (cahier V8,
// section 11) ---------------------------------------------------------------
//
// Audit V8 : "équilibrée" (anciennement "la famille la moins chère") et
// "priorité cadence/portée" construisaient TOUJOURS l'archer en premier
// (le moins cher ET le premier de l'ordre cadence/portée) -- sur un plateau
// de 10 emplacements, les deux finissaient donc par construire EXACTEMENT
// la même composition (que des archers), produisant des résultats
// identiques sur les 50 niveaux. Corrigé : "équilibrée" diversifie
// désormais réellement (famille la moins représentée en premier). Ce test
// verrouille le correctif pour qu'un futur changement de coût ne fasse pas
// silencieusement régresser les deux stratégies vers un seul profil.
test("la stratégie ÉQUILIBRÉE construit une composition réellement mixte, pas seulement des archers", () => {
  const level = LEVELS.find((l) => l.unlockedTowers.includes("longue_portee") && l.buildSlots.length >= 6);
  const state = createLevelState(level);
  const stepBalanced = STRATEGIES.find((s) => s.name === "équilibrée").step;
  for (let i = 0; i < level.buildSlots.length; i++) stepBalanced(state);
  const families = new Set(state.towers.map((t) => t.family));
  assert.ok(families.size > 1, `la stratégie équilibrée a construit une composition à une seule famille : ${[...families]}`);
});

test("ÉQUILIBRÉE et PRIORITÉ CADENCE/PORTÉE ne sont plus accidentellement identiques sur l'ensemble de la campagne", () => {
  const outcomes = LEVELS.map((level) => ({
    balanced: simulate(level, STRATEGIES.find((s) => s.name === "équilibrée").step),
    speedRange: simulate(level, STRATEGIES.find((s) => s.name === "priorité cadence/portée").step),
  }));
  const diverge = outcomes.some((o) => o.balanced.status !== o.speedRange.status || o.balanced.finalHpRatio !== o.speedRange.finalHpRatio);
  assert.ok(diverge, "les deux stratégies produisent un résultat identique sur TOUS les niveaux -- elles ne testent plus deux profils distincts");
});

for (const level of LEVELS) {
  test(`niveau ${level.id} ("${level.name}") : au moins une stratégie réaliste termine le niveau (faisabilité V6)`, () => {
    const outcomes = STRATEGIES.map(({ name, step }) => ({ name, ...simulate(level, step) }));
    const winner = outcomes.find((o) => o.status === "won");
    assert.ok(
      winner,
      `aucune stratégie n'a gagné : ${JSON.stringify(outcomes.map((o) => ({ name: o.name, status: o.status, hitCap: o.hitCap })))}`
    );
  });
}
