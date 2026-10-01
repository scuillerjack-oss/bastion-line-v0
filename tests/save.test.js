// Vérifie la persistance des tutoriels vus (cahier des charges V0, section
// 9 : "l'état des tutoriels vus doit pouvoir être sauvegardé") et de la
// progression de niveaux terminés. node:test n'a pas de localStorage : on
// simule le strict minimum utilisé par save.js.
//
// Modèle V7 (cahier V7, section 8 : "définir une source de vérité unique et
// robuste pour la progression") : la SEULE donnée persistée est
// `completedLevels`, l'ensemble des index de niveaux réellement terminés.
// "Niveau débloqué" (getUnlockedUpToIndex) et "niveau terminé"
// (isLevelCompleted) sont toujours DÉRIVÉS de ce même ensemble, jamais
// stockés séparément -- voir save.js pour le raisonnement complet.
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
  const { loadSave, getUnlockedUpToIndex } = await import("../src/engine/save.js?t=1");
  const save = loadSave();
  assert.deepEqual(save.completedLevels, []);
  assert.equal(getUnlockedUpToIndex(save), 0);
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

test("terminer un niveau débloque exactement le suivant, jamais plus, jamais moins", async () => {
  installFakeLocalStorage();
  const { loadSave, markLevelCompleted, getUnlockedUpToIndex, isLevelCompleted } = await import("../src/engine/save.js?t=6");
  const save = loadSave();
  markLevelCompleted(save, 0);
  markLevelCompleted(save, 1);
  markLevelCompleted(save, 2);
  assert.equal(getUnlockedUpToIndex(save), 3);
  assert.ok(isLevelCompleted(save, 0) && isLevelCompleted(save, 1) && isLevelCompleted(save, 2));
  assert.ok(!isLevelCompleted(save, 3));
});

test("rejouer un niveau déjà terminé ne fait jamais régresser la progression maximale (cahier V7, section 8)", async () => {
  installFakeLocalStorage();
  const { loadSave, markLevelCompleted, getUnlockedUpToIndex } = await import("../src/engine/save.js?t=7");
  const save = loadSave();
  markLevelCompleted(save, 0);
  markLevelCompleted(save, 1);
  markLevelCompleted(save, 2);
  assert.equal(getUnlockedUpToIndex(save), 3);
  // Rejoue et regagne un ANCIEN niveau déjà terminé.
  markLevelCompleted(save, 1);
  assert.equal(getUnlockedUpToIndex(save), 3, "rejouer un ancien niveau terminé a fait régresser la progression maximale");
});

// Reproduction du bug de reprise signalé en bêta (cahier V4, section 5 ;
// cahier V7, section 8) : "après relance d'une partie, le jeu a ramené le
// joueur vers d'anciens niveaux." Signature d'une CONCURRENCE entre deux
// instances de l'app possédant chacune leur PROPRE copie en mémoire de
// `save`. Le modèle V7 (union d'ensembles, jamais un max() sur un nombre
// unique) reste sûr même si l'instance la plus ANCIENNE écrit APRÈS
// l'instance la plus RÉCENTE.
test("bug de reprise : deux instances indépendantes ne doivent jamais faire régresser la progression persistée", async () => {
  installFakeLocalStorage();
  const { loadSave, markLevelCompleted } = await import("../src/engine/save.js?t=8");
  // Instance A : chargée en premier, reste "en retard" dans sa propre mémoire.
  const saveA = loadSave();
  // Instance B : une relance plus récente qui progresse plus loin et persiste.
  const saveB = loadSave();
  markLevelCompleted(saveB, 0);
  markLevelCompleted(saveB, 1);
  markLevelCompleted(saveB, 2); // B gagne jusqu'au niveau 3 -> persiste completedLevels=[0,1,2]
  // L'instance A (toujours avec sa copie mémoire périmée, un seul niveau
  // terminé) écrit ENSUITE -- un index déjà dépassé par ce qui est persisté.
  markLevelCompleted(saveA, 0);
  const { loadSave: reload, getUnlockedUpToIndex } = await import("../src/engine/save.js?t=9");
  const finalState = reload();
  assert.equal(getUnlockedUpToIndex(finalState), 3, "la progression persistée a régressé à cause d'une écriture concurrente périmée");
  assert.deepEqual(finalState.completedLevels, [0, 1, 2]);
});

// Cahier V4, section 5 ; cahier V7, section 8 : "tester plusieurs cycles
// consécutifs de progression -> sauvegarde -> fermeture/rechargement ->
// reprise." Chaque "rechargement" est simulé ici par un nouvel import du
// module (voir le paramètre ?t=N, qui contourne le cache des modules ES --
// exactement le même principe qu'un vrai rechargement de page qui
// réexécute main.js et rappelle loadSave() depuis zéro).
test("cycles consécutifs progression -> sauvegarde -> rechargement -> reprise : le joueur retrouve systématiquement le bon niveau", async () => {
  installFakeLocalStorage();
  let mod = await import("../src/engine/save.js?t=10");
  for (let levelWon = 0; levelWon < 5; levelWon++) {
    // "Reprise" : simule un rechargement complet avant de rejouer ce cycle.
    mod = await import(`../src/engine/save.js?t=${11 + levelWon}`);
    const save = mod.loadSave();
    assert.equal(mod.getUnlockedUpToIndex(save), levelWon, `cycle ${levelWon} : mauvais niveau repris après rechargement`);
    // Progression : le joueur gagne ce niveau, débloquant le suivant.
    mod.markLevelCompleted(save, levelWon);
  }
  // "Fermeture/rechargement" final : une toute nouvelle instance doit voir la progression complète.
  const finalMod = await import("../src/engine/save.js?t=16");
  assert.equal(finalMod.getUnlockedUpToIndex(finalMod.loadSave()), 5);
});

test("une sauvegarde corrompue (JSON invalide) retombe proprement sur les valeurs par défaut", async () => {
  const store = installFakeLocalStorage();
  store.set("bastion-line-v0-save", "{ ceci n'est pas du JSON");
  const { loadSave, getUnlockedUpToIndex } = await import("../src/engine/save.js?t=17");
  const save = loadSave();
  assert.equal(getUnlockedUpToIndex(save), 0);
});

// Migration V1->V2 (cahier V7, section 8 : "ne jamais perdre une
// progression déjà validée" lors d'une évolution du schéma).
test("une ancienne sauvegarde V0-V6 (unlockedLevelIndex seul) est migrée sans perte vers le nouveau modèle", async () => {
  const store = installFakeLocalStorage();
  store.set("bastion-line-v0-save", JSON.stringify({ version: 1, unlockedLevelIndex: 4, tutorialsSeen: { first_wave: true }, settings: { music: false, sfx: true } }));
  const { loadSave, getUnlockedUpToIndex, isLevelCompleted } = await import("../src/engine/save.js?t=18");
  const save = loadSave();
  assert.equal(getUnlockedUpToIndex(save), 4, "la progression de l'ancienne sauvegarde doit être intégralement préservée");
  assert.deepEqual(save.completedLevels, [0, 1, 2, 3]);
  assert.ok(isLevelCompleted(save, 0) && isLevelCompleted(save, 3));
  assert.ok(!isLevelCompleted(save, 4));
  assert.equal(save.tutorialsSeen.first_wave, true);
  assert.equal(save.settings.music, false);
});

test("une ancienne sauvegarde migrée puis une nouvelle progression ne perdent jamais rien l'une par rapport à l'autre", async () => {
  const store = installFakeLocalStorage();
  store.set("bastion-line-v0-save", JSON.stringify({ version: 1, unlockedLevelIndex: 2 }));
  const { loadSave, markLevelCompleted, getUnlockedUpToIndex } = await import("../src/engine/save.js?t=19");
  const save = loadSave();
  assert.equal(getUnlockedUpToIndex(save), 2);
  markLevelCompleted(save, 2); // termine le niveau juste débloqué
  assert.equal(getUnlockedUpToIndex(save), 3);
  const { loadSave: reload, getUnlockedUpToIndex: fresh } = await import("../src/engine/save.js?t=20");
  assert.equal(fresh(reload()), 3);
});
