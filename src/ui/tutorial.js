import { markTutorialSeen } from "../engine/save.js";

// Tutoriel contextuel à déclenchement unique (cahier des charges V0,
// section 9) : jamais un manuel complet au lancement, une phrase courte au
// moment précis où la mécanique devient pertinente -- puis mémorisé pour ne
// jamais réapparaître.
export const TUTORIAL_TEXTS = {
  first_build_slot: "Touche un emplacement vide pour construire une tour.",
  first_tower_rapide: "Tour d'archers : cadence élevée, efficace contre les ennemis fragiles ou rapides.",
  first_tower_canon: "Canon : explosion de zone, idéal contre les groupes d'ennemis.",
  // Texte mis à jour V7 (cahier V7, section 5) : renommage affiché
  // "Longue portée" -> "Catapulte" -- la clé interne first_tower_longue_portee
  // reste inchangée (déclenchée par enemy.family === "longue_portee").
  // Contenu mis à jour V8 (cahier V8, section 3) : la Catapulte a désormais
  // une vraie zone d'effet et une cadence volontairement très lente --
  // l'ancien texte ("dégâts ciblés élevés") décrivait l'identité inverse.
  first_tower_longue_portee: "Catapulte : très longue portée, gros impact de zone, mais très lente à recharger.",
  first_upgrade: "Touche une tour existante pour l'améliorer : plus puissante, coûte des pièces.",
  first_wave: "La vague avance automatiquement. Prépare tes défenses avant qu'elle n'arrive.",
  first_early_launch: "Tu peux lancer la vague suivante immédiatement sans attendre le minuteur.",
  // Renommage + correctif d'identité V8 (cahier V8, section 6 -- voir
  // engine/enemies.js pour le détail) : "blindé" -> "Lourd" (jamais un
  // tank/véhicule), "essaim" -> "Éclaireur" (le texte décrivait un groupe
  // de plusieurs ennemis, alors qu'il s'agit toujours d'une seule unité ;
  // corrigé pour décrire sa vraie identité de scout véloce et fragile).
  first_enemy_blinde: "Ennemi Lourd : soldat lourdement protégé, lent mais très résistant.",
  first_enemy_essaim: "Éclaireur : très rapide, mais très fragile.",
  first_enemy_rapide: "Cavalier : rapide mais peu résistant.",
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
