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

// --- Calage V6 sur la nouvelle carte Leonardo (cahier V6, section 3) -----
// Le chemin ci-dessous n'est PAS un tracé arbitraire : ses points ont été
// obtenus en suivant programmatiquement (recherche du centre de la bande de
// couleur "route" ligne par ligne, cf. assets/leonardo/trace_road.py) le
// chemin RÉELLEMENT dessiné sur assets/leonardo/carte_terrain_original.jpg,
// puis convertis dans l'espace logique ARENA_W x ARENA_H via la même fenêtre
// de recadrage que public/assets/map/carte_terrain.jpg (voir
// scripts/process_leonardo_map.py). Un seul asset de carte a été fourni : ce
// même tracé sert donc de fond visuel à TOUS les niveaux (1 à 4) -- seules
// les vagues/difficultés changent d'un niveau à l'autre, jamais la
// géométrie du chemin, puisqu'il n'existe qu'une seule route dessinée.
//
// Correction V6 à LA CAUSE (cahier V6, section 3 : "les ennemis coupent les
// courbes, ce qui donne un rendu brouillon") : la version V5 de ce tracé ne
// comptait que 11 points -- largement assez pour la validation d'emprise,
// mais bien trop clairsemé pour qu'un mouvement en LIGNE DROITE entre deux
// points consécutifs épouse un virage réel de la route peinte : sur un
// virage serré, le segment droit coupait visiblement l'intérieur de la
// courbe (diagonale traversant l'herbe). Le système d'interpolation lui-
// même (engine/path.js, pointAtDistance -- marche linéaire entre points)
// n'a PAS été réécrit : c'est le nombre et la densité des points qui
// étaient insuffisants, pas l'algorithme. Remède structurel : le même
// tracé RÉEL (assets/leonardo/trace_road.py, échantillonné au pixel près
// verticalement) est repris, puis simplifié par Douglas-Peucker (tolérance
// 1,5 unité logique -- très inférieure à la demi-largeur de route, 17) pour
// ne garder que les points nécessaires à rester à moins de 1,5 unité du
// tracé réel en tout point. Résultat : 82 points au lieu de 11, un mouvement
// qui épouse visuellement chaque virage, sans jamais dépendre d'un point
// spécial ajouté à la main pour UN niveau -- puisque tous les niveaux à
// chemin unique partagent ce même PATH_MAP, la correction s'applique
// automatiquement partout. Voir tests/levels.test.js pour la vérification
// géométrique permanente (aucun point du chemin ne s'éloigne du tracé réel
// au-delà de cette même tolérance).
const PATH_MAP = [
  { x: 185, y: 60 }, { x: 178, y: 66 }, { x: 178, y: 68 }, { x: 179, y: 89 },
  { x: 184, y: 93 }, { x: 222, y: 100 }, { x: 238, y: 108 }, { x: 262, y: 131 },
  { x: 265, y: 131 }, { x: 251, y: 132 }, { x: 322, y: 136 }, { x: 344, y: 145 },
  { x: 355, y: 155 }, { x: 354, y: 159 }, { x: 358, y: 165 }, { x: 359, y: 174 },
  { x: 357, y: 176 }, { x: 360, y: 181 }, { x: 358, y: 186 }, { x: 359, y: 187 },
  { x: 351, y: 202 }, { x: 331, y: 210 }, { x: 272, y: 217 }, { x: 236, y: 235 },
  { x: 200, y: 248 }, { x: 168, y: 251 }, { x: 167, y: 253 }, { x: 176, y: 255 },
  { x: 75, y: 258 }, { x: 64, y: 260 }, { x: 56, y: 269 }, { x: 59, y: 276 },
  { x: 56, y: 280 }, { x: 57, y: 302 }, { x: 63, y: 308 }, { x: 63, y: 314 },
  { x: 73, y: 319 }, { x: 124, y: 323 }, { x: 143, y: 327 }, { x: 158, y: 337 },
  { x: 164, y: 343 }, { x: 189, y: 356 }, { x: 214, y: 359 }, { x: 255, y: 360 },
  { x: 247, y: 361 }, { x: 252, y: 363 }, { x: 237, y: 364 }, { x: 263, y: 366 },
  { x: 245, y: 368 }, { x: 331, y: 370 }, { x: 322, y: 371 }, { x: 347, y: 373 },
  { x: 355, y: 381 }, { x: 359, y: 394 }, { x: 356, y: 400 }, { x: 359, y: 404 },
  { x: 355, y: 417 }, { x: 350, y: 424 }, { x: 335, y: 431 }, { x: 272, y: 438 },
  { x: 242, y: 458 }, { x: 226, y: 465 }, { x: 187, y: 469 }, { x: 210, y: 473 },
  { x: 86, y: 476 }, { x: 70, y: 481 }, { x: 63, y: 487 }, { x: 57, y: 498 },
  { x: 58, y: 508 }, { x: 55, y: 512 }, { x: 63, y: 532 }, { x: 68, y: 537 },
  { x: 80, y: 541 }, { x: 128, y: 546 }, { x: 138, y: 550 }, { x: 141, y: 558 },
  { x: 163, y: 574 }, { x: 186, y: 575 }, { x: 207, y: 580 }, { x: 214, y: 588 },
  { x: 214, y: 593 }, { x: 200, y: 615 }, // porte de la forteresse dessinée sur la carte
];

// --- Niveau 1 : chemin calé sur la carte Leonardo -------------------------
const PATH_1 = PATH_MAP;

const LEVEL_1 = {
  id: 1,
  name: "Premiers pas",
  baseHp: 20,
  startCoins: 120,
  paths: [PATH_1],
  // Emplacements V6 (cahier V6, section 6 -- "une vraie logique de level
  // design", jamais les seules zones vides) : chaque « + » est ancré sur
  // une caractéristique RÉELLE de la route (un virage serré, où une tour à
  // courte portée couvre deux segments qui se rejoignent -- ou une longue
  // ligne droite, où l'exposition prolongée dans une seule direction
  // profite à une tour à grande portée/cadence), jamais un point choisi au
  // hasard dans une zone d'herbe vide. Voir le rapport technique V6 pour la
  // carte annotée et le raisonnement complet par emplacement.
  buildSlots: [
    { id: "s1", x: 296, y: 74 }, // virage haut (couvre l'entrée + le 1er virage droit)
    { id: "s2", x: 201, y: 162 }, // virage serré haut
    { id: "s3", x: 105, y: 196 }, // longue ligne droite haute (gauche)
    { id: "s4", x: 155, y: 408 }, // virage central gauche
    { id: "s5", x: 240, y: 523 }, // virage bas
    { id: "s6", x: 104, y: 603 }, // ligne droite finale, avant la porte
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
    { id: "s1", x: 296, y: 74 },
    { id: "s2", x: 201, y: 162 },
    { id: "s3", x: 105, y: 196 },
    { id: "s4", x: 246, y: 295 }, // virage central haut
    { id: "s5", x: 155, y: 408 },
    { id: "s6", x: 240, y: 523 },
    { id: "s7", x: 104, y: 603 },
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
    { id: "s1", x: 296, y: 74 },
    { id: "s2", x: 201, y: 162 },
    { id: "s3", x: 105, y: 196 },
    { id: "s4", x: 246, y: 295 },
    { id: "s5", x: 57, y: 415 }, // longue ligne droite basse (gauche)
    { id: "s6", x: 155, y: 408 },
    { id: "s7", x: 240, y: 523 },
    { id: "s8", x: 104, y: 603 },
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
    { id: "s1", x: 296, y: 74 },
    { id: "s2", x: 201, y: 162 },
    { id: "s3", x: 105, y: 196 },
    { id: "s4", x: 246, y: 295 },
    { id: "s5", x: 341, y: 310 }, // virage central droit
    { id: "s6", x: 57, y: 415 },
    { id: "s7", x: 155, y: 408 },
    { id: "s8", x: 240, y: 523 },
    { id: "s9", x: 104, y: 603 },
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
    { id: "s1", x: 296, y: 74 },
    { id: "s2", x: 201, y: 162 },
    { id: "s3", x: 105, y: 196 },
    { id: "s4", x: 246, y: 295 },
    { id: "s5", x: 341, y: 310 },
    { id: "s6", x: 57, y: 415 },
    { id: "s7", x: 155, y: 408 },
    { id: "s8", x: 347, y: 489 }, // longue ligne droite basse (droite)
    { id: "s9", x: 240, y: 523 },
    { id: "s10", x: 104, y: 603 },
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
