// Sauvegarde locale : progression (niveaux terminés), tutoriels déjà vus
// (cahier des charges V0, section 9 : "l'état des tutoriels vus doit
// pouvoir être sauvegardé"), réglages audio. Jamais l'état de partie en
// cours en détail (position des ennemis, etc.) -- seulement ce qui doit
// survivre une fermeture.
const KEY = "bastion-line-v0-save";
const VERSION = 2;

function defaults() {
  return {
    version: VERSION,
    // Source de vérité UNIQUE de la progression (cahier V7, section 8 :
    // "définir une source de vérité unique et robuste pour la
    // progression"). Un simple tableau des INDEX de niveaux réellement
    // terminés (victoire obtenue au moins une fois) -- jamais un compteur
    // séparé "niveau débloqué" qui pourrait diverger de ce qui a
    // réellement été accompli. Toute autre notion de progression (niveau
    // accessible, niveau à poursuivre) se DÉRIVE de ce seul tableau, voir
    // getUnlockedUpToIndex()/isLevelCompleted() ci-dessous -- jamais
    // stockée séparément, pour qu'aucune incohérence entre deux champs ne
    // puisse jamais se produire.
    completedLevels: [],
    tutorialsSeen: {},
    settings: { music: true, sfx: true },
  };
}

// Migration V1->V2 (cahier V7, section 8 : "ne jamais perdre une
// progression déjà validée" lors d'une évolution du schéma). Les
// sauvegardes V0-V6 stockaient seulement `unlockedLevelIndex` (le niveau
// MAX débloqué -- jamais le détail des niveaux réellement gagnés). Comme
// la campagne V0-V6 ne pouvait être progressée que séquentiellement
// (terminer le niveau N débloque N+1, aucun moyen de rejouer/sauter), ce
// nombre implique nécessairement que TOUS les niveaux 0..unlockedLevelIndex-1
// ont déjà été réellement terminés -- la reconstruction ci-dessous est donc
// sans perte, jamais une approximation.
function migrateLegacySave(parsed) {
  if (Array.isArray(parsed.completedLevels)) return parsed.completedLevels;
  const legacyUnlocked = Number.isInteger(parsed.unlockedLevelIndex) ? parsed.unlockedLevelIndex : 0;
  const rebuilt = [];
  for (let i = 0; i < legacyUnlocked; i++) rebuilt.push(i);
  return rebuilt;
}

function normalize(parsed) {
  const completedLevels = migrateLegacySave(parsed).filter((i) => Number.isInteger(i) && i >= 0);
  // Reconstruction EXPLICITE (jamais un simple spread de `parsed`) : un
  // champ inconnu ou périmé d'un ancien schéma (ex. l'ancien
  // `unlockedLevelIndex`) ne doit jamais se retrouver traîné dans l'objet
  // normalisé -- une seule forme de sauvegarde possible, jamais deux champs
  // concurrents pouvant diverger.
  return {
    version: VERSION,
    completedLevels: [...new Set(completedLevels)].sort((a, b) => a - b),
    settings: { ...defaults().settings, ...(parsed.settings || {}) },
    tutorialsSeen: { ...(parsed.tutorialsSeen || {}) },
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return defaults();
    return normalize(parsed);
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

// Dérive l'index du niveau le plus avancé ACCESSIBLE (0-based) à partir de
// la SEULE source de vérité (completedLevels) : le niveau juste après le
// dernier terminé, jamais un champ séparé qui pourrait désynchroniser. Si
// aucun niveau n'est terminé, seul le niveau 0 est accessible.
export function getUnlockedUpToIndex(save) {
  if (!save.completedLevels || save.completedLevels.length === 0) return 0;
  return Math.max(...save.completedLevels) + 1;
}

export function isLevelCompleted(save, levelIndex) {
  return save.completedLevels.includes(levelIndex);
}

export function isLevelAccessible(save, levelIndex) {
  return levelIndex <= getUnlockedUpToIndex(save);
}

// Cause racine du bug de reprise signalé en bêta V3/V7 (cahier V4, section
// 5 ; cahier V7, section 8 : "objectif impératif : le retour arbitraire au
// niveau 1 doit avoir une fréquence de 0%") : plusieurs instances de l'app
// (onglet resté en arrière-plan, PWA relancée sur une tâche Android déjà
// existante, page restaurée depuis le bfcache) peuvent chacune posséder leur
// PROPRE copie en mémoire de `save`. Avec un simple NOMBRE ("niveau
// débloqué"), une instance plus ancienne qui écrit après une instance plus
// récente pouvait faire RÉGRESSER la valeur persistée (déjà corrigé en V4
// par un max() -- voir l'historique Git). Le modèle V7 va plus loin :
// `completedLevels` est un ENSEMBLE, jamais un simple nombre -- la fusion
// de deux ensembles (UNION) ne peut par construction QUE grandir ou rester
// identique, jamais rétrécir, quel que soit l'ordre d'écriture des
// instances concurrentes, et reste valide même si une future version
// autorise un jour de terminer les niveaux dans un ordre non strictement
// séquentiel (rejeu, niveaux optionnels, etc.) -- un simple max() sur un
// nombre ne le permettrait pas.
export function markLevelCompleted(save, levelIndex) {
  const persisted = loadSave();
  const merged = [...new Set([...persisted.completedLevels, ...save.completedLevels, levelIndex])].sort((a, b) => a - b);
  const persistedChanged = merged.length !== persisted.completedLevels.length || merged.some((v, i) => v !== persisted.completedLevels[i]);
  save.completedLevels = merged;
  if (persistedChanged) writeSave(save);
}

export function markTutorialSeen(save, key) {
  if (!save.tutorialsSeen[key]) {
    save.tutorialsSeen[key] = true;
    writeSave(save);
  }
}
