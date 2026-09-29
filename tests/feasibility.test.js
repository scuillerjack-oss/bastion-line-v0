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
import { STRATEGIES, simulate } from "../scripts/simulate_feasibility_v6.mjs";

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
