// 3 à 5 niveaux tests (cahier des charges V0, section 16) -- un noyau
// jouable propre, jamais une campagne. Les niveaux 1-10 possibles pour une
// future V1 ne sont PAS anticipés ici : seulement ce qui est nécessaire pour
// valider la boucle centrale.
//
// Introduction progressive des 4 familles de tours et des 4 archétypes
// d'ennemis à travers les niveaux (jamais tout d'un coup) :
//  - Niveau 1 : rapide seul, ennemis standard uniquement (démonstration).
//  - Niveau 2 : + canon, + ennemi blindé.
//  - Niveau 3 : + contrôle, + ennemi essaim.
//  - Niveau 4 : + longue portée (les 4 familles réunies), mélange complet.
//  - Niveau 5 : les 4 familles, DEUX chemins convergents (cahier, section 3 :
//    "possibilité de tester deux chemins dans le dernier prototype si le
//    moteur est stable").

import { findFootprintViolations } from "./footprint.js";

function spawnBurst(kind, count, pathIndex, startDelayMs, intervalMs) {
  const spawns = [];
  for (let i = 0; i < count; i++) {
    spawns.push({ kind, pathIndex, delayMs: startDelayMs + i * intervalMs });
  }
  return spawns;
}

// --- Niveau 1 : chemin unique en S, simple et lisible --------------------
const PATH_1 = [
  { x: 200, y: 30 },
  { x: 200, y: 190 },
  { x: 90, y: 190 },
  { x: 90, y: 400 },
  { x: 260, y: 400 },
  { x: 260, y: 560 },
  { x: 200, y: 620 },
];

const LEVEL_1 = {
  id: 1,
  name: "Premiers pas",
  baseHp: 20,
  startCoins: 120,
  paths: [PATH_1],
  buildSlots: [
    { id: "s1", x: 130, y: 120 },
    { id: "s2", x: 270, y: 120 },
    { id: "s3", x: 26, y: 300 }, // décalé de x=40 (cahier V2 §1 : trop proche du chemin vertical x=90)
    { id: "s4", x: 160, y: 300 },
    { id: "s5", x: 330, y: 480 },
    { id: "s6", x: 190, y: 500 },
  ],
  unlockedTowers: ["rapide"],
  waves: [
    { prepMs: 12000, spawns: spawnBurst("standard", 5, 0, 0, 900) },
    { prepMs: 14000, spawns: spawnBurst("standard", 7, 0, 0, 800) },
    { prepMs: 14000, spawns: spawnBurst("standard", 9, 0, 0, 700) },
  ],
};

// --- Niveau 2 : + canon, + blindé -----------------------------------------
const PATH_2 = [
  { x: 40, y: 30 },
  { x: 40, y: 250 },
  { x: 220, y: 250 },
  { x: 220, y: 120 },
  { x: 360, y: 120 },
  { x: 360, y: 450 },
  { x: 150, y: 450 },
  { x: 150, y: 620 },
];

const LEVEL_2 = {
  id: 2,
  name: "Premier blindage",
  baseHp: 20,
  startCoins: 140,
  paths: [PATH_2],
  buildSlots: [
    { id: "s1", x: 130, y: 60 },
    { id: "s2", x: 130, y: 320 }, // décalé de y=250 (cahier V2 §1 : emplacement placé EXACTEMENT sur le chemin -- cause du "canon posé sur la route" observé en bêta V1)
    { id: "s3", x: 290, y: 190 },
    { id: "s4", x: 290, y: 330 },
    { id: "s5", x: 40, y: 450 },
    { id: "s6", x: 250, y: 530 },
    { id: "s7", x: 60, y: 560 },
  ],
  unlockedTowers: ["rapide", "canon"],
  waves: [
    { prepMs: 12000, spawns: spawnBurst("standard", 6, 0, 0, 850) },
    { prepMs: 14000, spawns: [...spawnBurst("standard", 5, 0, 0, 800), ...spawnBurst("blinde", 2, 0, 5200, 1800)] },
    { prepMs: 14000, spawns: [...spawnBurst("standard", 6, 0, 0, 700), ...spawnBurst("blinde", 3, 0, 4600, 1600)] },
    { prepMs: 14000, spawns: [...spawnBurst("standard", 8, 0, 0, 650), ...spawnBurst("blinde", 3, 0, 5600, 1500)] },
  ],
};

// --- Niveau 3 : + contrôle, + essaim ---------------------------------------
const PATH_3 = [
  { x: 200, y: 30 },
  { x: 200, y: 150 },
  { x: 340, y: 150 },
  { x: 340, y: 330 },
  { x: 60, y: 330 },
  { x: 60, y: 500 },
  { x: 200, y: 500 },
  { x: 200, y: 620 },
];

const LEVEL_3 = {
  id: 3,
  name: "Contrôle de la vitesse",
  baseHp: 22,
  startCoins: 150,
  paths: [PATH_3],
  buildSlots: [
    { id: "s1", x: 270, y: 90 },
    { id: "s2", x: 270, y: 240 },
    { id: "s3", x: 130, y: 240 },
    { id: "s4", x: 140, y: 415 },
    { id: "s5", x: 300, y: 415 },
    { id: "s6", x: 130, y: 560 },
    { id: "s7", x: 270, y: 560 },
  ],
  unlockedTowers: ["rapide", "canon", "controle"],
  waves: [
    { prepMs: 12000, spawns: [...spawnBurst("standard", 5, 0, 0, 800), ...spawnBurst("essaim", 6, 0, 4600, 220)] },
    { prepMs: 14000, spawns: [...spawnBurst("standard", 4, 0, 0, 750), ...spawnBurst("blinde", 2, 0, 3200, 1700), ...spawnBurst("essaim", 8, 0, 6800, 200)] },
    { prepMs: 14000, spawns: [...spawnBurst("essaim", 10, 0, 0, 220), ...spawnBurst("standard", 6, 0, 2600, 700)] },
    { prepMs: 14000, spawns: [...spawnBurst("standard", 6, 0, 0, 650), ...spawnBurst("blinde", 3, 0, 4200, 1500), ...spawnBurst("essaim", 10, 0, 8800, 200)] },
  ],
};

// --- Niveau 4 : + longue portée, les 4 familles réunies --------------------
const PATH_4 = [
  { x: 360, y: 30 },
  { x: 360, y: 180 },
  { x: 60, y: 180 },
  { x: 60, y: 340 },
  { x: 340, y: 340 },
  { x: 340, y: 480 },
  { x: 120, y: 480 },
  { x: 120, y: 600 },
  { x: 200, y: 630 },
];

const LEVEL_4 = {
  id: 4,
  name: "Portée et précision",
  baseHp: 22,
  startCoins: 160,
  paths: [PATH_4],
  buildSlots: [
    { id: "s1", x: 230, y: 100 },
    { id: "s2", x: 150, y: 240 },
    { id: "s3", x: 300, y: 240 },
    { id: "s4", x: 200, y: 400 },
    { id: "s5", x: 60, y: 410 },
    { id: "s6", x: 260, y: 540 },
    { id: "s7", x: 40, y: 540 },
    { id: "s8", x: 200, y: 560 },
  ],
  unlockedTowers: ["rapide", "canon", "controle", "longue_portee"],
  waves: [
    { prepMs: 13000, spawns: [...spawnBurst("standard", 6, 0, 0, 750), ...spawnBurst("blinde", 2, 0, 4000, 1700)] },
    { prepMs: 14000, spawns: [...spawnBurst("rapide", 6, 0, 0, 500), ...spawnBurst("standard", 4, 0, 2800, 750)] },
    { prepMs: 14000, spawns: [...spawnBurst("essaim", 10, 0, 0, 200), ...spawnBurst("blinde", 3, 0, 5200, 1500)] },
    { prepMs: 15000, spawns: [...spawnBurst("standard", 6, 0, 0, 700), ...spawnBurst("rapide", 5, 0, 3800, 480), ...spawnBurst("blinde", 3, 0, 6800, 1400)] },
    { prepMs: 15000, spawns: [...spawnBurst("blinde", 5, 0, 0, 1600), ...spawnBurst("essaim", 10, 0, 3000, 200), ...spawnBurst("rapide", 6, 0, 8000, 450)] },
  ],
};

// --- Niveau 5 : deux chemins convergents, les 4 familles, mélange complet --
const PATH_5A = [
  { x: 80, y: 30 },
  { x: 80, y: 260 },
  { x: 200, y: 340 },
];
const PATH_5B = [
  { x: 320, y: 30 },
  { x: 320, y: 260 },
  { x: 200, y: 340 },
];
const PATH_5_COMMON_TAIL = [
  { x: 200, y: 340 },
  { x: 200, y: 480 },
  { x: 100, y: 480 },
  { x: 100, y: 600 },
  { x: 200, y: 630 },
];
const PATH_5A_FULL = [...PATH_5A, ...PATH_5_COMMON_TAIL.slice(1)];
const PATH_5B_FULL = [...PATH_5B, ...PATH_5_COMMON_TAIL.slice(1)];

const LEVEL_5 = {
  id: 5,
  name: "Ligne double",
  baseHp: 24,
  startCoins: 180,
  paths: [PATH_5A_FULL, PATH_5B_FULL],
  buildSlots: [
    { id: "s1", x: 160, y: 130 },
    { id: "s2", x: 240, y: 130 },
    { id: "s3", x: 30, y: 300 },
    { id: "s4", x: 370, y: 300 },
    { id: "s5", x: 130, y: 420 }, // décalé de x=200 (cahier V2 §1 : emplacement placé EXACTEMENT sur le chemin commun après convergence des deux voies)
    { id: "s6", x: 300, y: 480 },
    { id: "s7", x: 40, y: 560 },
    { id: "s8", x: 200, y: 560 },
  ],
  unlockedTowers: ["rapide", "canon", "controle", "longue_portee"],
  waves: [
    {
      prepMs: 14000,
      spawns: [...spawnBurst("standard", 5, 0, 0, 800), ...spawnBurst("standard", 5, 1, 400, 800)],
    },
    {
      prepMs: 15000,
      spawns: [
        ...spawnBurst("rapide", 5, 0, 0, 500),
        ...spawnBurst("blinde", 2, 1, 1000, 1700),
        ...spawnBurst("standard", 4, 1, 5200, 750),
      ],
    },
    {
      prepMs: 15000,
      spawns: [...spawnBurst("essaim", 8, 0, 0, 220), ...spawnBurst("essaim", 8, 1, 300, 220)],
    },
    {
      prepMs: 16000,
      spawns: [
        ...spawnBurst("blinde", 3, 0, 0, 1600),
        ...spawnBurst("blinde", 3, 1, 800, 1600),
        ...spawnBurst("rapide", 6, 0, 6000, 450),
        ...spawnBurst("rapide", 6, 1, 6400, 450),
      ],
    },
    {
      prepMs: 16000,
      spawns: [
        ...spawnBurst("standard", 6, 0, 0, 650),
        ...spawnBurst("standard", 6, 1, 300, 650),
        ...spawnBurst("essaim", 10, 0, 5000, 200),
        ...spawnBurst("blinde", 4, 1, 5000, 1400),
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
