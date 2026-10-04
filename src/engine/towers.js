import { TOWER_SELL_REFUND_RATE } from "./constants.js";

// Familles de tours (cahier des charges V0, section 6 ; la Tour de contrôle
// initialement présente a été retirée en V3, cahier section 3) -- chaque
// famille doit avoir une identité RESSENTIE en jeu, pas seulement des
// statistiques différentes en coulisses. Toutes les valeurs sont ici,
// centralisées et configurables (cahier, section 5 : "coûts, récompenses et
// statistiques devront être configurables pour faciliter l'équilibrage") --
// aucune valeur magique éparpillée dans simulation.js.
//
// Chaque famille a 2 paliers d'amélioration (cahier, section 6.5 : "la V0
// peut réduire le nombre de paliers si nécessaire pour valider rapidement
// le système" -- 2 paliers suffisent à valider l'arbitrage construire/
// améliorer sans complexité excessive). Une amélioration change l'IDENTITÉ
// de la tour (jamais un simple +10% générique) :
//  - rapide : la cadence augmente encore ("mitraillage" de plus en plus dense)
//  - canon : le rayon de zone augmente (touche plus d'ennemis à la fois)
//  - longue_portee : gagne un bonus de dégâts spécifique contre les ennemis
//    "blindés" (renforce son rôle "utile contre les unités résistantes")
export const TOWER_FAMILIES = {
  rapide: {
    id: "rapide",
    // Renommage V3 (cahier, section 2) : l'asset Leonardo pilote de V2
    // devient la référence qualitative -- "Tour rapide" devient "Tour
    // d'archers" à l'écran et dans les textes. L'identifiant interne
    // "rapide" reste inchangé (sauvegardes, tests, simulation) : seul
    // l'habillage visible change.
    name: "Tour d'archers",
    shortDesc: "Cadence très élevée, dégâts faibles. Idéale contre les ennemis fragiles ou rapides.",
    color: "#e9c46a",
    buildCost: 40,
    tiers: [
      { range: 95, damage: 4, fireIntervalMs: 260, aoeRadius: 0, slowFactor: 0, slowDurationMs: 0, upgradeCost: 0 },
      { range: 100, damage: 5, fireIntervalMs: 170, aoeRadius: 0, slowFactor: 0, slowDurationMs: 0, upgradeCost: 45 },
      { range: 105, damage: 6, fireIntervalMs: 110, aoeRadius: 0, slowFactor: 0, slowDurationMs: 0, upgradeCost: 70 },
    ],
  },
  canon: {
    id: "canon",
    name: "Canon",
    shortDesc: "Cadence lente, explosion de zone. Particulièrement efficace contre les groupes.",
    color: "#e76f51",
    buildCost: 65,
    tiers: [
      { range: 105, damage: 16, fireIntervalMs: 1400, aoeRadius: 46, slowFactor: 0, slowDurationMs: 0, upgradeCost: 0 },
      { range: 110, damage: 20, fireIntervalMs: 1300, aoeRadius: 60, slowFactor: 0, slowDurationMs: 0, upgradeCost: 60 },
      { range: 115, damage: 26, fireIntervalMs: 1200, aoeRadius: 76, slowFactor: 0, slowDurationMs: 0, upgradeCost: 95 },
    ],
  },
  longue_portee: {
    id: "longue_portee",
    // Renommage V7 (cahier V7, section 5) : le choix graphique "Baliste"
    // envisagé était trop proche visuellement de la tour d'Archer -- cette
    // défense très longue portée est désormais officiellement nommée
    // "Catapulte". Seul ce nom AFFICHÉ a changé en V7 ; l'identifiant interne
    // "longue_portee" reste inchangé (sauvegardes, tests, simulation,
    // TOWER_SPRITE_CONFIG/PROJECTILE_SPEED/bonusVsArmored -- aucune
    // référence par nom ailleurs dans le code) pour ne rien reconstruire.
    //
    // Correction V8 (cahier V8, section 3 -- "audite d'abord les statistiques
    // réellement présentes avant tout équilibrage") : l'audit de reprise a
    // trouvé cette tour avec AUCUNE zone d'effet (aoeRadius: 0 à tous les
    // paliers), la cadence la PLUS RAPIDE des 3 familles (900->780ms, plus
    // rapide que le canon) et le projectile le PLUS RAPIDE
    // (PROJECTILE_SPEED.longue_portee=900, voir simulation.js) -- l'exact
    // inverse de l'identité "artillerie lourde : très longue portée, gros
    // impact de zone, projectile lent, mauvaise réponse aux cibles rapides"
    // voulue. Correctif : ajout d'une vraie zone d'effet (plus large que
    // celle du canon, cohérent avec "gros impact"), cadence désormais la PLUS
    // LENTE des 3 (toujours strictement au-dessus de celle du canon à palier
    // équivalent) et projectile ralenti à la vitesse la plus faible des 3
    // (voir PROJECTILE_SPEED dans simulation.js) -- combiné à la poursuite
    // (homing) déjà existante, un projectile plus lent que les ennemis
    // rapides/éclaireurs ne les rattrape jamais avant qu'ils sortent de
    // portée, ce qui matérialise naturellement la "mauvaise réponse aux
    // cibles rapides" sans règle spéciale. Portée et bonus anti-"blindé"
    // (renommage d'affichage prévu en Lourd, voir enemies.js) inchangés.
    name: "Catapulte",
    shortDesc: "Portée extrême, impact de zone lourd. Très lente à recharger et à tirer -- redoutable contre les groupes et les cibles résistantes, inefficace contre les cibles rapides.",
    color: "#264653",
    buildCost: 70,
    // bonusVsArmored : multiplicateur de dégâts appliqué UNIQUEMENT contre
    // l'archétype "blinde" -- introduit au palier 2 (voir tiers), jamais au
    // palier 1, pour que l'amélioration soit ce qui débloque réellement le
    // rôle "anti-blindé" plutôt qu'un simple bonus de dégâts plat.
    tiers: [
      { range: 180, damage: 34, fireIntervalMs: 1900, aoeRadius: 58, slowFactor: 0, slowDurationMs: 0, bonusVsArmored: 1, upgradeCost: 0 },
      { range: 190, damage: 42, fireIntervalMs: 1700, aoeRadius: 72, slowFactor: 0, slowDurationMs: 0, bonusVsArmored: 1.6, upgradeCost: 75 },
      { range: 200, damage: 52, fireIntervalMs: 1500, aoeRadius: 88, slowFactor: 0, slowDurationMs: 0, bonusVsArmored: 2.1, upgradeCost: 110 },
    ],
  },
};

// Tour de contrôle : retirée en V3 (cahier, section 3). Rôle "synergie/
// ralentissement" jugé à réévaluer plus tard, pas remplacé arbitrairement --
// voir le rapport technique V3 pour des pistes de 4e famille proposées à
// décision humaine (jamais implémentées ici sans validation).
export const TOWER_ORDER = ["rapide", "canon", "longue_portee"];

export function getTowerTierStats(familyId, tierIndex) {
  return TOWER_FAMILIES[familyId].tiers[tierIndex];
}

export function getMaxTier(familyId) {
  return TOWER_FAMILIES[familyId].tiers.length - 1;
}

// Revente de tour (cahier V4, section 3) -- valeur totale RÉELLEMENT
// investie dans une tour posée : son coût de construction initial, PLUS le
// coût de chaque palier d'amélioration effectivement acheté jusqu'à son
// palier actuel (tiers[1..tower.tier], jamais tiers[0] qui est le palier de
// base sans coût d'amélioration). C'est cette somme, jamais le seul coût de
// construction, qui doit servir de référence au remboursement -- sans quoi
// une tour très améliorée se revendrait au même prix qu'une tour brute.
export function getTowerInvestedValue(tower) {
  const family = TOWER_FAMILIES[tower.family];
  let total = family.buildCost;
  for (let i = 1; i <= tower.tier; i++) total += family.tiers[i].upgradeCost;
  return total;
}

// Arrondi à l'entier le plus proche : les coûts/récompenses du jeu sont
// toujours des entiers de pièces, jamais de fraction affichée au joueur.
export function getTowerSellRefund(tower) {
  return Math.round(getTowerInvestedValue(tower) * TOWER_SELL_REFUND_RATE);
}
