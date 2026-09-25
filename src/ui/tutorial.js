import { markTutorialSeen } from "../engine/save.js";

// Tutoriel contextuel à déclenchement unique (cahier des charges V0,
// section 9) : jamais un manuel complet au lancement, une phrase courte au
// moment précis où la mécanique devient pertinente -- puis mémorisé pour ne
// jamais réapparaître.
export const TUTORIAL_TEXTS = {
  first_build_slot: "Touche un emplacement vide pour construire une tour.",
  first_tower_rapide: "Tour rapide : cadence élevée, efficace contre les ennemis fragiles ou rapides.",
  first_tower_canon: "Canon : explosion de zone, idéal contre les groupes d'ennemis.",
  first_tower_controle: "Tour de contrôle : ralentit les ennemis, renforce tes autres tours.",
  first_tower_longue_portee: "Longue portée : dégâts ciblés élevés, utile contre les ennemis résistants.",
  first_upgrade: "Touche une tour existante pour l'améliorer : plus puissante, coûte des pièces.",
  first_wave: "La vague avance automatiquement. Prépare tes défenses avant qu'elle n'arrive.",
  first_early_launch: "Tu peux lancer la vague suivante immédiatement sans attendre le minuteur.",
  first_enemy_blinde: "Ennemi blindé : lent mais très résistant.",
  first_enemy_essaim: "Essaim : de nombreux ennemis fragiles rapprochés.",
  first_enemy_rapide: "Ennemi rapide : peu résistant mais avance vite.",
  first_multi_path: "Ce niveau a deux chemins : répartis tes défenses sur les deux.",
};

export function createTutorialController(save, toastEl) {
  let hideTimer = null;

  function show(key) {
    if (save.tutorialsSeen[key]) return false;
    const text = TUTORIAL_TEXTS[key];
    if (!text) return false;
    toastEl.textContent = text;
    toastEl.hidden = false;
    toastEl.style.opacity = "1";
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      toastEl.style.opacity = "0";
      setTimeout(() => {
        toastEl.hidden = true;
      }, 300);
    }, 3600);
    markTutorialSeen(save, key);
    return true;
  }

  return { show };
}
