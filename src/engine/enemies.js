// Quatre archétypes d'ennemis (cahier des charges V0, section 7 ; renommage
// et correctif d'identité V8, section 6) -- un petit nombre d'archétypes
// très lisibles, chacun créant une décision stratégique reconnaissable
// (jamais une unité ajoutée "parce que ce serait intéressant"). Statistiques
// centralisées ici, jamais éparpillées.
//
// Renommage V8 (cahier V8, section 6) : identifiants internes INCHANGÉS
// (sauvegardes, tests, simulation, ENEMY_KINDS[...].armored/bonusVsArmored,
// render.js -- aucune référence par nom ailleurs dans le code), seuls les
// noms AFFICHÉS (`name`) changent, même discipline que le renommage
// Catapulte en V7 :
//  - standard -> "Fantassin" (archétype équilibré de référence, inchangé).
//  - rapide   -> "Cavalier" (rapide, moins résistant -- déjà exact, inchangé).
//  - blinde   -> "Lourd" (le cahier V8 est explicite : "« lourd » signifie
//    soldat lourd / garde / fantassin lourd, JAMAIS un tank ou un véhicule
//    moderne" -- la silhouette de repli Canvas existante, cf. render.js,
//    est déjà un bloc anguleux riveté sans roue ni tourelle, donc déjà
//    conforme ; seul le nom affiché change).
//  - essaim   -> "Éclaireur" (très rapide, fragile). Audit de reprise V8 :
//    sa vitesse (60) n'était en réalité qu'à peine supérieure à celle du
//    Fantassin (55), donc ne se lisait PAS comme "très rapide" -- corrigée
//    ci-dessous à 125 (nettement au-dessus du Cavalier, 95) pour que
//    l'identité "éclaireur" soit réellement ressentie, pas seulement nommée.
//    PV déjà les plus bas des 4 (fragile) : inchangés.
export const ENEMY_KINDS = {
  standard: {
    id: "standard",
    name: "Fantassin",
    hp: 30,
    speed: 55, // unités arène / seconde
    coinReward: 6,
    baseDamage: 1,
    color: "#94a3b8",
    armored: false,
  },
  rapide: {
    id: "rapide",
    name: "Cavalier",
    hp: 16,
    speed: 95,
    coinReward: 5,
    baseDamage: 1,
    color: "#f2c14e",
    armored: false,
  },
  blinde: {
    id: "blinde",
    name: "Lourd",
    hp: 110,
    speed: 32,
    coinReward: 14,
    baseDamage: 3,
    color: "#5c6b73",
    armored: true, // seule la tour longue portée (palier >=2) exploite ce flag -- voir towers.js bonusVsArmored
  },
  essaim: {
    id: "essaim",
    name: "Éclaireur",
    hp: 10,
    speed: 125,
    coinReward: 2,
    baseDamage: 1,
    color: "#e07a5f",
    armored: false,
  },
};
