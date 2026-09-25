// Quatre familles de tours (cahier des charges V0, section 6) -- chaque
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
//  - controle : le ralentissement touche aussi les ennemis proches de la
//    cible (petite zone), renforçant sa synergie avec les tours de dégâts
export const TOWER_FAMILIES = {
  rapide: {
    id: "rapide",
    name: "Tour rapide",
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
    name: "Longue portée",
    shortDesc: "Très grande portée, dégâts ciblés élevés. Utile contre les ennemis résistants.",
    color: "#264653",
    buildCost: 70,
    // bonusVsArmored : multiplicateur de dégâts appliqué UNIQUEMENT contre
    // l'archétype "blinde" -- introduit au palier 2 (voir tiers), jamais au
    // palier 1, pour que l'amélioration soit ce qui débloque réellement le
    // rôle "anti-blindé" plutôt qu'un simple bonus de dégâts plat.
    tiers: [
      { range: 180, damage: 22, fireIntervalMs: 900, aoeRadius: 0, slowFactor: 0, slowDurationMs: 0, bonusVsArmored: 1, upgradeCost: 0 },
      { range: 190, damage: 26, fireIntervalMs: 850, aoeRadius: 0, slowFactor: 0, slowDurationMs: 0, bonusVsArmored: 1.6, upgradeCost: 75 },
      { range: 200, damage: 32, fireIntervalMs: 780, aoeRadius: 0, slowFactor: 0, slowDurationMs: 0, bonusVsArmored: 2.1, upgradeCost: 110 },
    ],
  },
  controle: {
    id: "controle",
    name: "Tour de contrôle",
    shortDesc: "Dégâts modestes, ralentit les ennemis. Crée des synergies avec les autres tours.",
    color: "#2a9d8f",
    buildCost: 50,
    // slowAoeRadius : à 0 au palier 1 (ne ralentit que la cible directe), >0
    // à partir du palier 2 (ralentit aussi les ennemis proches de la cible)
    // -- c'est CE changement, pas un bonus de dégâts, qui fait l'identité de
    // l'amélioration ici.
    tiers: [
      { range: 100, damage: 2, fireIntervalMs: 700, aoeRadius: 0, slowFactor: 0.55, slowDurationMs: 1400, slowAoeRadius: 0, upgradeCost: 0 },
      { range: 105, damage: 2, fireIntervalMs: 650, aoeRadius: 0, slowFactor: 0.45, slowDurationMs: 1600, slowAoeRadius: 50, upgradeCost: 55 },
      { range: 110, damage: 3, fireIntervalMs: 600, aoeRadius: 0, slowFactor: 0.35, slowDurationMs: 1800, slowAoeRadius: 65, upgradeCost: 85 },
    ],
  },
};

export const TOWER_ORDER = ["rapide", "canon", "longue_portee", "controle"];

export function getTowerTierStats(familyId, tierIndex) {
  return TOWER_FAMILIES[familyId].tiers[tierIndex];
}

export function getMaxTier(familyId) {
  return TOWER_FAMILIES[familyId].tiers.length - 1;
}
