// Quatre archétypes d'ennemis (cahier des charges V0, section 7) -- un
// petit nombre d'archétypes très lisibles, chacun créant une décision
// stratégique reconnaissable (jamais une unité ajoutée "parce que ce serait
// intéressant"). Statistiques centralisées ici, jamais éparpillées.
export const ENEMY_KINDS = {
  standard: {
    id: "standard",
    name: "Standard",
    hp: 30,
    speed: 55, // unités arène / seconde
    coinReward: 6,
    baseDamage: 1,
    color: "#94a3b8",
    armored: false,
  },
  rapide: {
    id: "rapide",
    name: "Rapide",
    hp: 16,
    speed: 95,
    coinReward: 5,
    baseDamage: 1,
    color: "#f2c14e",
    armored: false,
  },
  blinde: {
    id: "blinde",
    name: "Blindé",
    hp: 110,
    speed: 32,
    coinReward: 14,
    baseDamage: 3,
    color: "#5c6b73",
    armored: true, // seule la tour longue portée (palier >=2) exploite ce flag -- voir towers.js bonusVsArmored
  },
  essaim: {
    id: "essaim",
    name: "Essaim",
    hp: 10,
    speed: 60,
    coinReward: 2,
    baseDamage: 1,
    color: "#e07a5f",
    armored: false,
  },
};
