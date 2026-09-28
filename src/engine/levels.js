// 3 à 5 niveaux tests (cahier des charges V0, section 16) -- un noyau
// jouable propre, jamais une campagne. Les niveaux 1-10 possibles pour une
// future V1 ne sont PAS anticipés ici : seulement ce qui est nécessaire pour
// valider la boucle centrale.
//
// Introduction progressive des familles de tours et des archétypes
// d'ennemis à travers les niveaux (jamais tout d'un coup) :
//  - Niveau 1 : rapide (archers) seul, ennemis standard uniquement.
//  - Niveau 2 : + canon, + ennemi blindé.
//  - Niveau 3 : + longue portée (avancée depuis le niveau 4 -- cahier V3,
//    section 3), + ennemi essaim.
//  - Niveau 4 : les 3 familles réunies, mélange complet.
//  - Niveau 5 : les 3 familles, DEUX chemins convergents (cahier, section 3 :
//    "possibilité de tester deux chemins dans le dernier prototype si le
//    moteur est stable").
//
// La Tour de contrôle (4e famille V0-V2) a été retirée en V3 (cahier,
// section 3) -- voir towers.js.

import { findFootprintViolations } from "./footprint.js";

function spawnBurst(kind, count, pathIndex, startDelayMs, intervalMs) {
  const spawns = [];
  for (let i = 0; i < count; i++) {
    spawns.push({ kind, pathIndex, delayMs: startDelayMs + i * intervalMs });
  }
  return spawns;
}

// --- Calage V5 sur la nouvelle carte Leonardo (cahier V5, section 3) -----
// Le chemin ci-dessous n'est PAS un tracé arbitraire : ses points ont été
// obtenus en suivant programmatiquement (recherche du centre de la bande de
// couleur "route" ligne par ligne, cf. assets/leonardo/trace_road.py) le
// chemin RÉELLEMENT dessiné sur assets/leonardo/carte_terrain_original.jpg,
// puis convertis dans l'espace logique ARENA_W x ARENA_H via la même fenêtre
// de recadrage que public/assets/map/carte_terrain.jpg (voir
// scripts/process_leonardo_map.py pour le recadrage et la conversion
// pixels -> coordonnées logiques). Un seul asset de carte a été fourni : ce
// même tracé sert donc de fond visuel à TOUS les niveaux (1 à 4) -- seules
// les vagues/difficultés changent d'un niveau à l'autre, jamais la
// géométrie du chemin, puisqu'il n'existe qu'une seule route dessinée.
const PATH_MAP = [
  { x: 185, y: 60 },
  { x: 260, y: 125 },
  { x: 356, y: 173 }, // virage 1 (droite)
  { x: 170, y: 250 },
  { x: 60, y: 295 }, // virage 2 (gauche)
  { x: 255, y: 360 },
  { x: 356, y: 405 }, // virage 3 (droite)
  { x: 187, y: 469 },
  { x: 57, y: 500 }, // virage 4 (gauche)
  { x: 214, y: 590 },
  { x: 200, y: 615 }, // porte de la forteresse dessinée sur la carte
];

// --- Niveau 1 : chemin calé sur la carte Leonardo -------------------------
const PATH_1 = PATH_MAP;

const LEVEL_1 = {
  id: 1,
  name: "Premiers pas",
  baseHp: 20,
  startCoins: 120,
  paths: [PATH_1],
  buildSlots: [
    { id: "s1", x: 300, y: 70 },
    { id: "s2", x: 75, y: 150 },
    { id: "s3", x: 340, y: 300 },
    { id: "s4", x: 100, y: 400 },
    { id: "s5", x: 320, y: 500 },
    { id: "s6", x: 100, y: 610 },
  ],
  unlockedTowers: ["rapide"],
  waves: [
    { prepMs: 12000, spawns: spawnBurst("standard", 5, 0, 0, 900) },
    { prepMs: 14000, spawns: spawnBurst("standard", 7, 0, 0, 800) },
    { prepMs: 14000, spawns: spawnBurst("standard", 9, 0, 0, 700) },
  ],
};

// --- Niveau 2 : + canon, + blindé -----------------------------------------
// Chemin calé sur la carte Leonardo (voir PATH_MAP) : un seul asset de
// carte fourni = une seule géométrie de route pour tous les niveaux à
// chemin unique (cahier V5, section 3.2).
const PATH_2 = PATH_MAP;

const LEVEL_2 = {
  id: 2,
  name: "Premier blindage",
  baseHp: 20,
  startCoins: 140,
  paths: [PATH_2],
  buildSlots: [
    { id: "s1", x: 300, y: 70 },
    { id: "s2", x: 75, y: 150 },
    { id: "s3", x: 340, y: 300 },
    { id: "s4", x: 100, y: 400 },
    { id: "s5", x: 320, y: 500 },
    { id: "s6", x: 100, y: 610 },
    { id: "s7", x: 375, y: 610 },
  ],
  unlockedTowers: ["rapide", "canon"],
  // Rééquilibrage V3 (cahier, section 4) : l'audit par simulation
  // reproductible (scripts/balance_simulation.mjs) montrait 100% de PV de
  // base restants sur CE niveau avec un joueur "raisonnable" -- confirmation
  // d'une facilité excessive, pas un simple effet de début de partie (voir
  // le même constat jusqu'au niveau 5). Remède appliqué, dans cet ordre :
  // plus d'ennemis par vague, une vague supplémentaire, ET un resserrement
  // du délai d'apparition (intervalMs) des ennemis blindés -- l'audit a
  // montré qu'AUGMENTER LE SEUL NOMBRE d'ennemis de même archétype ne change
  // rien contre un plateau de tours déjà construit/amélioré (le surplus
  // meurt simplement aussi vite qu'il arrive) : seule une arrivée plus
  // dense crée une pression réelle et mesurable, sans toucher aux
  // statistiques d'ennemi ni introduire de nouvel archétype.
  waves: [
    { prepMs: 12000, spawns: spawnBurst("standard", 8, 0, 0, 750) },
    { prepMs: 14000, spawns: [...spawnBurst("standard", 7, 0, 0, 750), ...spawnBurst("blinde", 3, 0, 5200, 550)] },
    { prepMs: 14000, spawns: [...spawnBurst("standard", 8, 0, 0, 650), ...spawnBurst("blinde", 4, 0, 4600, 500)] },
    { prepMs: 14000, spawns: [...spawnBurst("standard", 10, 0, 0, 600), ...spawnBurst("blinde", 5, 0, 5600, 480)] },
    { prepMs: 15000, spawns: [...spawnBurst("standard", 8, 0, 0, 550), ...spawnBurst("blinde", 4, 0, 4800, 460)] },
  ],
};

// --- Niveau 3 : + contrôle, + essaim ---------------------------------------
const PATH_3 = PATH_MAP;

const LEVEL_3 = {
  id: 3,
  // Renommé en V3 (cahier, section 3) : ce niveau introduisait la Tour de
  // contrôle (retirée) ; il introduit désormais la Longue portée à la
  // place -- voir le rapport technique V3 pour la justification de cet
  // emplacement de déblocage.
  name: "Renfort lointain",
  baseHp: 22,
  startCoins: 150,
  paths: [PATH_3],
  buildSlots: [
    { id: "s1", x: 300, y: 70 },
    { id: "s2", x: 75, y: 150 },
    { id: "s3", x: 100, y: 400 },
    { id: "s4", x: 320, y: 500 },
    { id: "s5", x: 100, y: 610 },
    { id: "s6", x: 375, y: 610 },
    { id: "s7", x: 20, y: 350 },
  ],
  // Longue portée avancée du niveau 4 au niveau 3 (cahier V3, section 3 :
  // "la faire apparaître/débloquer sensiblement plus tôt... pas
  // obligatoirement niveau 1"). Choix documenté dans le rapport technique
  // V3 : ce niveau introduit déjà l'ennemi "blindé" en nombre croissant,
  // exactement la cible de rôle de la longue portée (bonus anti-blindé) ;
  // l'économie de départ (150) couvre son coût de construction (70) sans
  // écraser l'accès aux 2 autres familles déjà débloquées.
  unlockedTowers: ["rapide", "canon", "longue_portee"],
  // Rééquilibrage V3 (cahier, section 4) -- même constat et même remède que
  // le niveau 2 (voir commentaire là-bas) : plus d'ennemis, une vague de
  // plus, aucune stat d'ennemi ni nouvel archétype.
  waves: [
    { prepMs: 12000, spawns: [...spawnBurst("standard", 7, 0, 0, 700), ...spawnBurst("essaim", 8, 0, 4600, 70)] },
    { prepMs: 14000, spawns: [...spawnBurst("standard", 6, 0, 0, 700), ...spawnBurst("blinde", 3, 0, 3200, 520), ...spawnBurst("essaim", 10, 0, 6800, 65)] },
    { prepMs: 14000, spawns: [...spawnBurst("essaim", 13, 0, 0, 70), ...spawnBurst("standard", 8, 0, 2600, 650)] },
    { prepMs: 14000, spawns: [...spawnBurst("standard", 8, 0, 0, 600), ...spawnBurst("blinde", 4, 0, 4200, 480), ...spawnBurst("essaim", 12, 0, 8800, 65)] },
    { prepMs: 15000, spawns: [...spawnBurst("standard", 8, 0, 0, 550), ...spawnBurst("blinde", 5, 0, 4000, 450), ...spawnBurst("essaim", 12, 0, 7500, 62)] },
  ],
};

// --- Niveau 4 : les 3 familles réunies, mélange complet --------------------
const PATH_4 = PATH_MAP;

const LEVEL_4 = {
  id: 4,
  // Renommé en V3 : "Portée et précision" décrivait l'introduction de la
  // longue portée à CE niveau -- désormais avancée au niveau 3 (cahier V3,
  // section 3), ce niveau devient un mélange de vagues plus dense avec les
  // 3 familles déjà toutes disponibles.
  name: "Vagues croisées",
  baseHp: 22,
  startCoins: 160,
  paths: [PATH_4],
  buildSlots: [
    { id: "s1", x: 300, y: 70 },
    { id: "s2", x: 75, y: 150 },
    { id: "s3", x: 340, y: 300 },
    { id: "s4", x: 100, y: 400 },
    { id: "s5", x: 320, y: 500 },
    { id: "s6", x: 100, y: 610 },
    { id: "s7", x: 375, y: 610 },
    { id: "s8", x: 20, y: 350 },
  ],
  unlockedTowers: ["rapide", "canon", "longue_portee"],
  // Rééquilibrage V3 (cahier, section 4) -- même constat et même remède
  // (voir niveau 2) : plus d'ennemis par vague + une vague supplémentaire.
  waves: [
    { prepMs: 13000, spawns: [...spawnBurst("standard", 9, 0, 0, 650), ...spawnBurst("blinde", 3, 0, 4000, 520)] },
    { prepMs: 14000, spawns: [...spawnBurst("rapide", 9, 0, 0, 450), ...spawnBurst("standard", 6, 0, 2800, 650)] },
    { prepMs: 14000, spawns: [...spawnBurst("essaim", 14, 0, 0, 62), ...spawnBurst("blinde", 4, 0, 5200, 480)] },
    { prepMs: 15000, spawns: [...spawnBurst("standard", 9, 0, 0, 600), ...spawnBurst("rapide", 7, 0, 3800, 420), ...spawnBurst("blinde", 5, 0, 6800, 450)] },
    { prepMs: 15000, spawns: [...spawnBurst("blinde", 7, 0, 0, 450), ...spawnBurst("essaim", 14, 0, 3000, 62), ...spawnBurst("rapide", 9, 0, 8000, 400)] },
    {
      prepMs: 16000,
      spawns: [
        ...spawnBurst("standard", 8, 0, 0, 550),
        ...spawnBurst("blinde", 5, 0, 3600, 450),
        ...spawnBurst("essaim", 12, 0, 6200, 62),
        ...spawnBurst("rapide", 6, 0, 8600, 420),
      ],
    },
  ],
};

// --- Niveau 5 : deux chemins convergents, les 4 familles, mélange complet --
// Limite documentée (cahier V5, section 3.1/9 -- "si cela est impossible
// sans dégrader le gameplay, le signaler clairement") : la carte Leonardo
// fournie ne dessine qu'UNE SEULE route, avec une unique porte d'entrée
// haute encadrée de deux tourelles décoratives -- jamais deux routes
// séparées. Le mécanisme V4 "deux chemins convergents" (deux voies de
// spawn distinctes, cahier V0 section 3) ne peut donc pas être recalé sur
// deux routes visuellement différentes sans soit fabriquer une route
// absente de l'asset protégé (interdit), soit supprimer le mécanisme
// (régression interdite). Solution retenue : les deux voies logiques
// démarrent à quelques pixels d'écart, DANS la largeur de la porte unique
// dessinée, puis rejoignent immédiatement le même tracé PATH_MAP -- le
// mécanisme (deux files de spawn, temporisations indépendantes) reste
// intact, mais les deux flux restent visuellement confondus sur l'unique
// route dessinée au lieu de sembler sortir de l'herbe. Cette limite doit
// être rappelée telle quelle dans le rapport officiel V5, jamais masquée.
const PATH_5A_FULL = [{ x: 172, y: 45 }, ...PATH_MAP];
const PATH_5B_FULL = [{ x: 218, y: 45 }, ...PATH_MAP];

const LEVEL_5 = {
  id: 5,
  name: "Ligne double",
  baseHp: 24,
  startCoins: 180,
  paths: [PATH_5A_FULL, PATH_5B_FULL],
  buildSlots: [
    { id: "s1", x: 300, y: 70 },
    { id: "s2", x: 75, y: 150 },
    { id: "s3", x: 340, y: 300 },
    { id: "s4", x: 100, y: 400 },
    { id: "s5", x: 320, y: 500 },
    { id: "s6", x: 100, y: 610 },
    { id: "s7", x: 375, y: 610 },
    { id: "s8", x: 20, y: 350 },
  ],
  unlockedTowers: ["rapide", "canon", "longue_portee"],
  // Rééquilibrage V3 (cahier, section 4) -- même constat et même remède
  // (voir niveau 2) : plus d'ennemis par vague + une vague supplémentaire.
  // Niveau final : la vague 6 mêle les deux chemins et les 3 archétypes
  // renforcés (standard/blindé/essaim), jamais un nouvel archétype.
  waves: [
    {
      prepMs: 14000,
      spawns: [...spawnBurst("standard", 7, 0, 0, 700), ...spawnBurst("standard", 7, 1, 350, 700)],
    },
    {
      prepMs: 15000,
      spawns: [
        ...spawnBurst("rapide", 7, 0, 0, 450),
        ...spawnBurst("blinde", 3, 1, 1000, 850),
        ...spawnBurst("standard", 6, 1, 5200, 650),
      ],
    },
    {
      prepMs: 15000,
      spawns: [...spawnBurst("essaim", 11, 0, 0, 105), ...spawnBurst("essaim", 11, 1, 280, 105)],
    },
    {
      prepMs: 16000,
      spawns: [
        ...spawnBurst("blinde", 4, 0, 0, 800),
        ...spawnBurst("blinde", 4, 1, 800, 800),
        ...spawnBurst("rapide", 8, 0, 6000, 420),
        ...spawnBurst("rapide", 8, 1, 6400, 420),
      ],
    },
    {
      prepMs: 16000,
      spawns: [
        ...spawnBurst("standard", 8, 0, 0, 600),
        ...spawnBurst("standard", 8, 1, 300, 600),
        ...spawnBurst("essaim", 13, 0, 5000, 105),
        ...spawnBurst("blinde", 5, 1, 5000, 700),
      ],
    },
    {
      prepMs: 17000,
      spawns: [
        ...spawnBurst("standard", 6, 0, 0, 550),
        ...spawnBurst("standard", 6, 1, 300, 550),
        ...spawnBurst("blinde", 4, 0, 4000, 700),
        ...spawnBurst("blinde", 4, 1, 4400, 700),
        ...spawnBurst("essaim", 10, 0, 8000, 100),
        ...spawnBurst("essaim", 10, 1, 8300, 100),
      ],
    },
  ],
};

export const LEVELS = [LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4, LEVEL_5];

export function validateLevel(level) {
  const errors = [];
  if (!level.paths || level.paths.length === 0) errors.push("aucun chemin défini");
  for (const path of level.paths || []) {
    if (path.length < 2) errors.push("chemin trop court (moins de 2 points)");
  }
  const slotIds = new Set();
  for (const slot of level.buildSlots || []) {
    if (slotIds.has(slot.id)) errors.push(`emplacement dupliqué: ${slot.id}`);
    slotIds.add(slot.id);
  }
  if (!level.waves || level.waves.length === 0) errors.push("aucune vague définie");
  for (const wave of level.waves || []) {
    for (const spawn of wave.spawns) {
      if (spawn.pathIndex >= level.paths.length) errors.push(`spawn référence un chemin inexistant (${spawn.pathIndex})`);
    }
  }
  // Garde-fou permanent (cahier V2, priorité 1) : un emplacement dont
  // l'emprise visuelle empièterait sur le chemin est une erreur de
  // validation structurelle, au même titre qu'un chemin trop court --
  // jamais un simple avertissement optionnel.
  for (const violation of findFootprintViolations(level)) {
    errors.push(
      `emplacement ${violation.slotId} trop proche du chemin (distance ${violation.distance.toFixed(1)} < ${violation.required.toFixed(1)} requis)`
    );
  }
  return errors;
}

export function validateAllLevels(levels = LEVELS) {
  const report = {};
  for (const level of levels) {
    const errors = validateLevel(level);
    if (errors.length > 0) report[level.id] = errors;
  }
  return report;
}
