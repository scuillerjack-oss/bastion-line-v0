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

export function markLevelUnlocked(save, levelIndex) {
  if (levelIndex > save.unlockedLevelIndex) {
    save.unlockedLevelIndex = levelIndex;
    writeSave(save);
  }
}

export function markTutorialSeen(save, key) {
  if (!save.tutorialsSeen[key]) {
    save.tutorialsSeen[key] = true;
    writeSave(save);
  }
}
