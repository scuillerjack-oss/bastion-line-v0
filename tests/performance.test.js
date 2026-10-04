// Test de performance de la simulation sous charge réaliste (cahier V8,
// section 11 : "tests de performance" ; section 5 : "les effets ne doivent
// jamais faire chuter les performances avec de nombreuses unités"). Audit de
// reprise V8 : aucun seuil de performance documenté n'existait avant ce
// fichier -- la boucle de simulation (ciblage par tour, zone d'effet,
// poursuite des projectiles) itère potentiellement sur l'ensemble des
// ennemis à chaque tick pour chaque tour/projectile, un risque réel de
// dégradation si le nombre d'ennemis/tours/projectiles simultanés grandit
// sans qu'aucun test ne le mesure jamais.
//
// Mesure UNIQUEMENT la boucle de simulation pure (tick()), jamais le rendu
// Canvas/DOM (couvert séparément par scripts/check-mobile.mjs en navigateur
// réel) -- un budget de simulation généreux laisse une marge large pour le
// rendu dans le budget total d'une frame 60Hz (16,6ms).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createLevelState } from "../src/engine/state.js";
import { tick, buildTower } from "../src/engine/simulation.js";
import { LEVELS } from "../src/engine/levels.js";

const DT = 1000 / 60;

// Seuil documenté : largement sous le budget d'une frame (16,6ms), pour
// qu'un tick de simulation ne puisse jamais, à lui seul, expliquer une frame
// manquée même sur un appareil mobile d'entrée de gamme bien plus lent que
// cette machine de test.
const MAX_MS_PER_TICK_AVG = 2;
const STRESS_TICK_COUNT = 600; // 10s de jeu simulées, en régime de charge établi

test("la simulation reste rapide sous charge réaliste (plateau complet, mélange des 3 familles, vague dense) -- pas de dégradation non maîtrisée", () => {
  const level = LEVELS[LEVELS.length - 1]; // niveau le plus chargé de la campagne (dernier palier)
  const state = createLevelState(level);

  // Pièces forcées UNIQUEMENT pour garantir un plateau complet dans ce test
  // de performance isolé -- jamais une validation d'équilibrage économique
  // (réservée à feasibility.test.js/scripts/simulate_feasibility_v6.mjs).
  state.coins = 100000;
  const families = state.unlockedTowers;
  state.buildSlots.forEach((slot, i) => buildTower(state, slot.id, families[i % families.length]));
  assert.equal(state.towers.length, state.buildSlots.length, "le plateau doit être entièrement construit pour ce test de charge");

  // Démarre la vague immédiatement (jamais d'attente de minuteur de
  // préparation dans un test de performance pur) puis avance jusqu'en
  // régime de charge établi (ennemis multiples, projectiles en vol,
  // impacts de zone en cours).
  state.prepRemainingMs = 0;
  for (let i = 0; i < 300; i++) tick(state, DT);
  assert.ok(state.enemies.length > 0, "le régime de charge établi doit comporter des ennemis vivants simultanés");

  const start = performance.now();
  for (let i = 0; i < STRESS_TICK_COUNT; i++) tick(state, DT);
  const elapsedMs = performance.now() - start;
  const msPerTick = elapsedMs / STRESS_TICK_COUNT;

  assert.ok(
    msPerTick < MAX_MS_PER_TICK_AVG,
    `simulation trop lente sous charge : ${msPerTick.toFixed(3)}ms/tick (seuil ${MAX_MS_PER_TICK_AVG}ms) -- ${state.towers.length} tours, enemies pic non mesuré ici, cf. assertion suivante`
  );
});
