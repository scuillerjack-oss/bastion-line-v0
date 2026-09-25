// Vérifie la persistance des tutoriels vus (cahier des charges V0, section
// 9 : "l'état des tutoriels vus doit pouvoir être sauvegardé") et de la
// progression de niveau débloqué. node:test n'a pas de localStorage : on
// simule le strict minimum utilisé par save.js.
import { test } from "node:test";
import assert from "node:assert/strict";

function installFakeLocalStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  return store;
}

test("première visite (aucune sauvegarde) : valeurs par défaut sûres", async () => {
  installFakeLocalStorage();
  const { loadSave } = await import("../src/engine/save.js?t=1");
  const save = loadSave();
  assert.equal(save.unlockedLevelIndex, 0);
  assert.deepEqual(save.tutorialsSeen, {});
  assert.equal(save.settings.music, true);
  assert.equal(save.settings.sfx, true);
});

test("un tutoriel marqué vu est bien persisté et rechargé", async () => {
  installFakeLocalStorage();
  const { loadSave, markTutorialSeen } = await import("../src/engine/save.js?t=2");
  const save = loadSave();
  markTutorialSeen(save, "first_build_slot");
  const { loadSave: loadSave2 } = await import("../src/engine/save.js?t=3");
  const reloaded = loadSave2();
  assert.equal(reloaded.tutorialsSeen.first_build_slot, true);
});

test("un tutoriel déjà vu n'est jamais réécrit ni perdu par un rechargement ultérieur", async () => {
  installFakeLocalStorage();
  const { loadSave, markTutorialSeen } = await import("../src/engine/save.js?t=4");
  const save = loadSave();
  markTutorialSeen(save, "first_wave");
  markTutorialSeen(save, "first_upgrade");
  const { loadSave: loadSave2 } = await import("../src/engine/save.js?t=5");
  const reloaded = loadSave2();
  assert.equal(Object.keys(reloaded.tutorialsSeen).length, 2);
  assert.equal(reloaded.tutorialsSeen.first_wave, true);
  assert.equal(reloaded.tutorialsSeen.first_upgrade, true);
});

test("le niveau débloqué ne redescend jamais (markLevelUnlocked ignore un index inférieur)", async () => {
  installFakeLocalStorage();
  const { loadSave, markLevelUnlocked } = await import("../src/engine/save.js?t=6");
  const save = loadSave();
  markLevelUnlocked(save, 3);
  markLevelUnlocked(save, 1); // ne doit jamais faire régresser la progression
  assert.equal(save.unlockedLevelIndex, 3);
});

test("une sauvegarde corrompue (JSON invalide) retombe proprement sur les valeurs par défaut", async () => {
  const store = installFakeLocalStorage();
  store.set("bastion-line-v0-save", "{ ceci n'est pas du JSON");
  const { loadSave } = await import("../src/engine/save.js?t=7");
  const save = loadSave();
  assert.equal(save.unlockedLevelIndex, 0);
});
