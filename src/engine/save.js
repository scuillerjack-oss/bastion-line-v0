// Sauvegarde locale : progression (niveau max débloqué), tutoriels déjà vus
// (cahier des charges V0, section 9 : "l'état des tutoriels vus doit
// pouvoir être sauvegardé"), réglages audio. Jamais l'état de partie en
// cours en détail (position des ennemis, etc.) -- seulement ce qui doit
// survivre une fermeture.
const KEY = "bastion-line-v0-save";
const VERSION = 1;

function defaults() {
  return {
    version: VERSION,
    unlockedLevelIndex: 0,
    tutorialsSeen: {},
    settings: { music: true, sfx: true },
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return defaults();
    // Fusionne chaque nouvelle clé avec ses valeurs par défaut : jamais de
    // perte silencieuse de progression existante lors d'une évolution du
    // schéma (même discipline que les projets précédents).
    return {
      ...defaults(),
      ...parsed,
      settings: { ...defaults().settings, ...(parsed.settings || {}) },
      tutorialsSeen: { ...(parsed.tutorialsSeen || {}) },
    };
  } catch {
    return defaults();
  }
}

export function writeSave(save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // Stockage indisponible (mode privé strict, quota) : le jeu doit rester
    // jouable, seulement sans persistance -- jamais une erreur bloquante.
  }
}

// Cause racine du bug de reprise signalé en bêta V3 (cahier V4, section 5) :
// "après relance d'une partie, le jeu a ramené le joueur vers d'anciens
// niveaux ; après une nouvelle relance, le dernier niveau réellement atteint
// est réapparu." Ce motif exact (régression PUIS auto-correction au
// relancement suivant) est la signature d'une CONCURRENCE entre deux
// instances de l'app possédant chacune leur PROPRE copie en mémoire de
// `save` -- notamment plausible sur Android, où relancer une PWA installée
// depuis l'écran d'accueil peut réutiliser une instance restée en
// arrière-plan (ou une page restaurée depuis le bfcache du navigateur) au
// lieu d'toujours réexécuter le script depuis zéro. Si cette instance plus
// ANCIENNE (avec une progression périmée en mémoire) écrit APRÈS une
// instance plus RÉCENTE, sa copie périmée écrasait silencieusement la
// progression réellement la plus avancée -- reproduit et verrouillé par un
// test dédié (tests/save.test.js).
//
// Corrigé à la cause : on ne fait plus jamais confiance à la SEULE copie en
// mémoire de l'appelant pour décider d'écrire. On relit l'état RÉELLEMENT
// persisté juste avant d'écrire et on ne retient que le maximum entre les
// trois candidats (persisté, mémoire de l'appelant, nouvelle valeur) --
// qu'importe quelle instance écrit en dernier, la progression ne peut donc
// plus jamais régresser.
export function markLevelUnlocked(save, levelIndex) {
  const persisted = loadSave();
  const merged = Math.max(persisted.unlockedLevelIndex, save.unlockedLevelIndex, levelIndex);
  save.unlockedLevelIndex = merged;
  if (merged > persisted.unlockedLevelIndex) {
    writeSave(save);
  }
}

export function markTutorialSeen(save, key) {
  if (!save.tutorialsSeen[key]) {
    save.tutorialsSeen[key] = true;
    writeSave(save);
  }
}
