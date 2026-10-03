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
// tracé réel en tout point.
//
// Correction V7 à LA CAUSE (cahier V7, section 2 : "les ennemis avancent,
// puis peuvent effectuer un petit retour arrière avant de repartir, surtout
// dans les virages"). Diagnostic établi par simulation ET par mesure
// géométrique (voir le rapport technique V7) : le moteur de déplacement
// lui-même (traveled, strictement croissant, engine/simulation.js) et
// l'interpolation de rendu (V7 précédente, engine/interpolate.js) sont
// mathématiquement incapables de reculer -- vérifié par simulation sous
// gigue de frame réaliste (60/90/120Hz, accrocs, fréquence adaptative,
// 0 recul observé sur des milliers de frames). La cause réelle était en
// amont, dans les DONNÉES du PATH_MAP V6 lui-même : l'algorithme de tracé
// (assets/leonardo/trace_road.py) retient UNE SEULE coordonnée x par ligne
// d'image -- une méthode structurellement fragile là où la route devient
// proche de l'horizontale, c'est-à-dire précisément DANS un virage. Mesure
// directe sur l'ancien PATH_MAP : plusieurs points formaient un angle de
// virage proche de 180° sur un segment très court (pire cas mesuré :
// 175,9°, deux points consécutifs à seulement 1 pixel d'écart en y mais 14
// unités en arrière en x) -- Douglas-Peucker, qui préserve par construction
// tout point qui s'écarte de la ligne simplifiée, conservait fidèlement ces
// pics de bruit comme des points de virage réels. Un ennemi traversant un
// tel point avance bien selon sa distance parcourue, mais sa position
// (x,y) RECULE visuellement avant de repartir -- exactement le symptôme
// rapporté, confirmé visuellement par superposition de l'ancien tracé sur
// l'image source (un véritable "V" pointant vers l'arrière).
//
// Remède, jamais une correction manuelle point par point : un filtre
// médian glissant (fenêtre 9 lignes) appliqué à la séquence x(y) du tracé
// AVANT la simplification Douglas-Peucker (voir scripts/retrace_path_v7.py)
// -- élimine par construction un échantillon isolé aberrant (1-2 lignes,
// signature mesurée du bruit) sans déformer un virage réel, qui évolue sur
// des dizaines de lignes. Résultat vérifié : angle de virage maximal
// 50,3° (contre 175,9° avant), 0 point à angle proche de 180°, superposition
// visuelle propre sur l'intégralité de la route (voir le rapport
// technique V7). La RÉFÉRENCE de mesure elle-même (tests/fixtures/
// road_centerline_reference.json, utilisée par tests/pathing.test.js) est
// régénérée depuis ce même tracé nettoyé -- jamais comparée à son propre
// bruit. Comme tous les niveaux à chemin unique (1-4 et 6-50 générés)
// partagent ce même PATH_MAP, la correction s'applique automatiquement à
// toute la campagne, jamais à un seul niveau.
//
// Correction V7-polish (cahier V7-polish, section 3 : "les ennemis ne sont
// toujours pas bien centrés sur la route, ils semblent parfois marcher sur
// le bord"). Diagnostic établi par mesure géométrique directe sur l'image
// source : le tracé V7 ci-dessus (comme assets/leonardo/trace_road.py dont
// il hérite l'algorithme) mesure le centre de la route en scannant chaque
// ligne HORIZONTALE de l'image -- un axe de mesure FIXE, jamais l'axe
// réellement perpendiculaire à la route à cet endroit. Cette approximation
// est correcte tant que la route est localement proche de la verticale,
// mais se dégrade précisément là où elle devient plus horizontale (les
// virages et portions qui serpentent à plat) : la coupe mesurée devient
// oblique au lieu de transversale, et le point tracé dérive vers un bord.
// Mesure directe sur le PATH_MAP V7 : le pire point se trouvait à 22,9
// unités arène du vrai centre perpendiculaire, sur une route locale large de
// seulement 45,8 unités -- littéralement sur le bord.
//
// Remède, jamais une correction manuelle par virage (scripts/center_path_v7.
// py) : pour chaque point du tracé
// déjà nettoyé, on mesure le vrai centre de la coupe PERPENDICULAIRE à la
// tangente locale (voisins écartés de ±5 échantillons) dans le masque
// couleur de la route. Accrocher directement chaque point à cette mesure a
// été essayé et REJETÉ : la détection de bord sur une texture peinte est
// bruitée au pixel près, et appliquée brute à 783 mesures indépendantes,
// elle recréait le même défaut d'angles proches de 180° corrigé par la
// tâche précédente (mesuré : 175,4°). Le signal de correction (centre réel
// moins point tracé) est donc fortement lissé (moyenne glissante, fenêtre
// 45 échantillons) avant d'être appliqué : le biais qu'on corrige varie
// lentement avec l'orientation locale de la route, le bruit de détection de
// bord est un artefact pixel à pixel -- un lissage large préserve le
// premier et élimine le second. Résultat vérifié : déviation moyenne au
// centre réel 7,8 -> 5,3 unités arène, déviation maximale 22,9 -> 17,1
// (sur une route large de 45-50 unités, donc nettement à l'intérieur du
// corridor, jamais plus sur le bord), angle de virage maximal 63,2° (aucune
// réapparition du défaut de recul), confirmé visuellement par superposition
// sur l'image source : l'ancien tracé coupe nettement l'intérieur de
// plusieurs virages, le nouveau reste centré sur toute la route.
const PATH_MAP = [
  { x: 185, y: 60 }, { x: 178, y: 63 }, { x: 178, y: 93 }, { x: 182, y: 98 },
  { x: 207, y: 102 }, { x: 239, y: 113 }, { x: 255, y: 115 }, { x: 269, y: 125 },
  { x: 320, y: 129 }, { x: 336, y: 134 }, { x: 348, y: 144 }, { x: 355, y: 154 },
  { x: 359, y: 180 }, { x: 350, y: 204 }, { x: 332, y: 214 }, { x: 276, y: 222 },
  { x: 254, y: 231 }, { x: 222, y: 233 }, { x: 199, y: 241 }, { x: 169, y: 244 },
  { x: 166, y: 249 }, { x: 75, y: 253 }, { x: 65, y: 256 }, { x: 60, y: 261 },
  { x: 57, y: 269 }, { x: 57, y: 301 }, { x: 62, y: 309 }, { x: 62, y: 318 },
  { x: 71, y: 323 }, { x: 131, y: 330 }, { x: 145, y: 334 }, { x: 155, y: 340 },
  { x: 176, y: 340 }, { x: 210, y: 348 }, { x: 250, y: 351 }, { x: 252, y: 357 },
  { x: 264, y: 361 }, { x: 314, y: 363 }, { x: 343, y: 368 }, { x: 350, y: 371 },
  { x: 354, y: 380 }, { x: 358, y: 391 }, { x: 358, y: 408 }, { x: 351, y: 426 },
  { x: 337, y: 436 }, { x: 276, y: 442 }, { x: 258, y: 451 }, { x: 232, y: 453 },
  { x: 222, y: 458 }, { x: 195, y: 461 }, { x: 192, y: 465 }, { x: 77, y: 471 },
  { x: 64, y: 480 }, { x: 60, y: 493 }, { x: 56, y: 498 }, { x: 56, y: 512 },
  { x: 58, y: 525 }, { x: 61, y: 526 }, { x: 66, y: 541 }, { x: 78, y: 546 },
  { x: 125, y: 550 }, { x: 137, y: 555 }, { x: 139, y: 559 }, { x: 148, y: 560 },
  { x: 166, y: 568 }, { x: 189, y: 569 }, { x: 209, y: 575 }, { x: 211, y: 578 },
  { x: 209, y: 585 }, { x: 202, y: 592 }, { x: 200, y: 615 }, // porte de la forteresse dessinée sur la carte
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
    { id: "s1", x: 297, y: 67 }, // virage haut (couvre l'entrée + le 1er virage droit) -- repoussé de 7u (V7-polish : recentrage du chemin, voir PATH_MAP)
    { id: "s2", x: 201, y: 162 }, // virage serré haut
    { id: "s3", x: 105, y: 191 }, // longue ligne droite haute (gauche) -- repoussé de 4u (V7-polish)
    { id: "s4", x: 155, y: 408 }, // virage central gauche
    { id: "s5", x: 240, y: 523 }, // virage bas
    { id: "s6", x: 104, y: 608 }, // ligne droite finale, avant la porte -- repoussé de 5u (V7-polish)
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
    { id: "s1", x: 297, y: 67 },
    { id: "s2", x: 201, y: 162 },
    { id: "s3", x: 105, y: 191 },
    { id: "s4", x: 246, y: 291 }, // virage central haut -- repoussé de 5u (V7-polish)
    { id: "s5", x: 155, y: 408 },
    { id: "s6", x: 240, y: 523 },
    { id: "s7", x: 104, y: 608 },
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
    { id: "s1", x: 297, y: 67 },
    { id: "s2", x: 201, y: 162 },
    { id: "s3", x: 105, y: 191 },
    { id: "s4", x: 246, y: 291 },
    { id: "s5", x: 57, y: 415 }, // longue ligne droite basse (gauche)
    { id: "s6", x: 155, y: 408 },
    { id: "s7", x: 240, y: 523 },
    { id: "s8", x: 104, y: 608 },
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
    { id: "s1", x: 297, y: 67 },
    { id: "s2", x: 201, y: 162 },
    { id: "s3", x: 105, y: 191 },
    { id: "s4", x: 246, y: 291 },
    { id: "s5", x: 342, y: 307 }, // virage central droit -- repoussé de 3u (V7-polish)
    { id: "s6", x: 57, y: 415 },
    { id: "s7", x: 155, y: 408 },
    { id: "s8", x: 240, y: 523 },
    { id: "s9", x: 104, y: 608 },
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
    { id: "s1", x: 297, y: 67 },
    { id: "s2", x: 201, y: 162 },
    { id: "s3", x: 105, y: 191 },
    { id: "s4", x: 246, y: 291 },
    { id: "s5", x: 342, y: 307 },
    { id: "s6", x: 57, y: 415 },
    { id: "s7", x: 155, y: 408 },
    { id: "s8", x: 348, y: 495 }, // longue ligne droite basse (droite) -- repoussé de 6u (V7-polish)
    { id: "s9", x: 240, y: 523 },
    { id: "s10", x: 104, y: 608 },
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

// --- Niveaux 6 à 50 : campagne étendue (cahier V7, section 7) -------------
// Les niveaux 1-5 restent les niveaux originaux, intégralement
// hand-conçus (chemin + emplacements + vagues), inchangés par cette
// extension. Concevoir à la main 45 niveaux supplémentaires avec le même
// niveau de détail aurait démultiplié le risque d'erreur humaine sans
// réel bénéfice : un seul asset de carte existe (une seule géométrie de
// route), donc les emplacements constructibles ne peuvent de toute façon
// pas varier davantage que les 10 positions déjà validées (zéro violation
// d'emprise) au niveau 5 -- les réutiliser pour tous les niveaux generés
// est la solution honnête, pas un raccourci. Le VRAI espace de variation
// disponible est donc la composition des vagues (quels archétypes, en
// quelle proportion, à quel rythme) : un générateur PARAMÉTRIQUE construit
// cette composition selon les 4 paliers du cahier, puis CHAQUE niveau
// généré est vérifié par la même batterie de faisabilité multi-stratégies
// que les niveaux 1-5 (scripts/simulate_feasibility_v6.mjs, tests/
// feasibility.test.js) -- jamais livré sans cette vérification réelle.
//
// Palier (cahier V7, section 7) :
//  - 6-10   : prise en main, montée progressive (prolonge 1-5)
//  - 11-25  : compositions plus exigeantes (mélanges simultanés plus tôt)
//  - 26-40  : optimisation croissante (plus de vagues, rythme plus dense)
//  - 41-50  : difficulté significative mais humainement réalisable
// Marge délibérément conservée (baseHp/startCoins plafonnés, densité
// jamais poussée au maximum théorique) pour une extension future jusqu'au
// niveau 100 (cahier V7, section 7).
function tierOf(n) {
  if (n <= 10) return 0;
  if (n <= 25) return 1;
  if (n <= 40) return 2;
  return 3;
}

const TIER_NAMES = ["Prise en main", "Compositions exigeantes", "Optimisation croissante", "Difficulté significative"];

// Proportions d'archétypes par palier (standard/rapide/blinde/essaim),
// jamais 100% d'un seul archétype passé le palier 0 -- "privilégier la
// composition... plutôt qu'une inflation brutale des PV" (cahier V7,
// section 7) : la variété elle-même EST le levier de difficulté.
const TIER_MIX = [
  { standard: 0.55, rapide: 0.15, blinde: 0.18, essaim: 0.12 },
  { standard: 0.4, rapide: 0.22, blinde: 0.19, essaim: 0.19 },
  { standard: 0.34, rapide: 0.24, blinde: 0.2, essaim: 0.22 },
  { standard: 0.3, rapide: 0.24, blinde: 0.21, essaim: 0.25 },
];

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

// Mulberry32 déterministe (même choix que ui/render.js pour le décor) :
// une composition de vagues stable d'une exécution à l'autre, jamais
// aléatoire à chaque chargement -- indispensable pour que la batterie de
// faisabilité reste reproductible.
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateWave(n, waveIndex, waveCount, pathIndex, rnd) {
  const tier = tierOf(n);
  const mix = TIER_MIX[tier];
  // Progression DANS le niveau (vague 1 plus légère que la dernière),
  // superposée à la progression ENTRE niveaux -- jamais une seule vague
  // plate répétée telle quelle. Échelle calée sur la densité RÉELLE déjà
  // observée dans les niveaux 1-5 hand-conçus (ex. niveau 4, dernière
  // vague : ~31 ennemis cumulés sur un seul chemin) -- jamais une densité
  // arbitraire plus faible qui rendrait la "suite" de la campagne plus
  // facile que son propre point de départ.
  const waveProgress = waveIndex / Math.max(1, waveCount - 1);
  const levelProgress = clamp((n - 6) / 44, 0, 1);
  const countBase = 24 + Math.round(levelProgress * 52) + Math.round(waveProgress * 10);
  const intervalBase = clamp(560 - levelProgress * 270 - waveProgress * 70, 220, 560);
  const spawns = [];
  let cursor = 0;
  for (const [kind, ratio] of Object.entries(mix)) {
    const count = Math.max(0, Math.round(countBase * ratio));
    if (count === 0) continue;
    const jitter = 1 + (rnd() - 0.5) * 0.15;
    const startDelay = cursor;
    for (let i = 0; i < count; i++) {
      spawns.push({ kind, pathIndex, delayMs: Math.round(startDelay + i * intervalBase * jitter) });
    }
    cursor += count * intervalBase * jitter * 0.45; // vagues d'archétypes qui se chevauchent partiellement, jamais strictement séquentielles
  }
  return spawns.sort((a, b) => a.delayMs - b.delayMs);
}

function generateLevel(n) {
  const tier = tierOf(n);
  const rnd = mulberry32(1000 + n); // seed stable par niveau -- reproductible, jamais Math.random()
  const waveCount = [5, 6, 7, 8][tier];
  const dualPath = n % 7 === 0; // variété occasionnelle (cahier V7, section 7), jamais systématique
  const levelProgress = clamp((n - 6) / 44, 0, 1);
  const baseHp = Math.round(clamp(24 + levelProgress * 12, 24, 36));
  const startCoins = Math.round(clamp(180 + levelProgress * 160, 180, 340));
  const waves = [];
  for (let w = 0; w < waveCount; w++) {
    const prepMs = 14000 + tier * 1000;
    const spawnsA = generateWave(n, w, waveCount, 0, rnd);
    const spawns = dualPath ? [...spawnsA, ...generateWave(n, w, waveCount, 1, rnd)] : spawnsA;
    waves.push({ prepMs, spawns });
  }
  return {
    id: n,
    name: `Niveau ${n} — ${TIER_NAMES[tier]}`,
    baseHp,
    startCoins,
    paths: dualPath ? [PATH_5A_FULL, PATH_5B_FULL] : [PATH_MAP],
    // Les 10 emplacements du niveau 5 restent l'unique disposition
    // disponible (un seul asset de carte, voir commentaire plus haut) --
    // réutilisés tels quels, jamais réinventés par niveau.
    buildSlots: LEVEL_5.buildSlots.map((s) => ({ ...s })),
    unlockedTowers: ["rapide", "canon", "longue_portee"],
    waves,
  };
}

const GENERATED_LEVELS = [];
for (let n = 6; n <= 50; n++) GENERATED_LEVELS.push(generateLevel(n));

export const LEVELS = [LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4, LEVEL_5, ...GENERATED_LEVELS];

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
