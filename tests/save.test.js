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

// Reproduction du bug de reprise signalé en bêta V3 (cahier V4, section 5) :
// "après relance d'une partie, le jeu a ramené le joueur vers d'anciens
// niveaux ; après une nouvelle relance, le dernier niveau réellement atteint
// est réapparu." Ce motif (régression PUIS auto-correction au relancement
// suivant) est la signature d'une CONCURRENCE entre deux instances de l'app
// possédant chacune leur PROPRE copie en mémoire de `save` (ex. un onglet/
// une PWA restée ouverte en arrière-plan côté Android + une relance plus
// récente) : si l'instance la plus ANCIENNE écrit APRÈS l'instance la plus
// RÉCENTE, sa copie périmée écrase la progression réellement la plus avancée.
test("bug de reprise (V4) : deux instances indépendantes ne doivent jamais faire régresser la progression persistée", async () => {
  installFakeLocalStorage();
  const { loadSave, markLevelUnlocked } = await import("../src/engine/save.js?t=8");
  // Instance A : chargée en premier, reste "en retard" dans sa propre mémoire.
  const saveA = loadSave();
  // Instance B : une relance plus récente qui progresse plus loin et persiste.
  const saveB = loadSave();
  markLevelUnlocked(saveB, 3); // B gagne jusqu'au niveau 4 -> persiste unlockedLevelIndex=3
  // L'instance A (toujours avec sa copie mémoire périmée) écrit ENSUITE,
  // avec un index plus FAIBLE que ce qui est déjà réellement persisté.
  markLevelUnlocked(saveA, 1);
  const { loadSave: reload } = await import("../src/engine/save.js?t=9");
  const finalState = reload();
  assert.equal(finalState.unlockedLevelIndex, 3, "la progression persistée a régressé à cause d'une écriture concurrente périmée");
});

// Cahier V4, section 5 : "Tester plusieurs cycles consécutifs de
// progression -> sauvegarde -> fermeture/rechargement -> reprise, y compris
// après passage d'un niveau." Chaque "rechargement" est simulé ici par un
// nouvel import du module (voir le paramètre ?t=N, qui contourne le cache
// des modules ES -- exactement le même principe qu'un vrai rechargement de
// page qui réexécute main.js et rappelle loadSave() depuis zéro).
test("cycles consécutifs progression -> sauvegarde -> rechargement -> reprise : le joueur retrouve systématiquement le bon niveau", async () => {
  installFakeLocalStorage();
  let mod = await import("../src/engine/save.js?t=10");
  for (let levelWon = 0; levelWon < 5; levelWon++) {
    // "Reprise" : simule un rechargement complet avant de rejouer ce cycle.
    mod = await import(`../src/engine/save.js?t=${11 + levelWon}`);
    const save = mod.loadSave();
    assert.equal(save.unlockedLevelIndex, levelWon, `cycle ${levelWon} : mauvais niveau repris après rechargement`);
    // Progression : le joueur gagne ce niveau, débloquant le suivant.
    mod.markLevelUnlocked(save, levelWon + 1);
  }
  // "Fermeture/rechargement" final : une toute nouvelle instance doit voir la progression complète.
  const finalMod = await import("../src/engine/save.js?t=16");
  assert.equal(finalMod.loadSave().unlockedLevelIndex, 5);
});

test("une sauvegarde corrompue (JSON invalide) retombe proprement sur les valeurs par défaut", async () => {
  const store = installFakeLocalStorage();
  store.set("bastion-line-v0-save", "{ ceci n'est pas du JSON");
  const { loadSave } = await import("../src/engine/save.js?t=7");
  const save = loadSave();
  assert.equal(save.unlockedLevelIndex, 0);
});
