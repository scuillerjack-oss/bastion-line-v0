// Espace logique de la carte, indépendant des pixels réels de l'écran (voir
// src/ui/render.js pour la mise à l'échelle "contain" responsive) --
// dimensions portrait, cahier des charges V0 section 3 : la carte entière
// doit tenir à l'écran, jamais de déplacement de caméra.
export const ARENA_W = 400;
export const ARENA_H = 700;

// Rayon de "snap" tactile : un tap est considéré comme ayant touché un
// emplacement de construction ou une tour existante s'il tombe dans ce
// rayon logique de son centre -- généreux exprès (doigt réel, pas un
// curseur de souris précis).
export const TAP_HIT_RADIUS = 26;

export const BASE_R = 22;
export const ENEMY_R = 10;
export const TOWER_R = 16;

// Vies de base par défaut (overridable par niveau) -- condition de défaite :
// baseHp <= 0.
export const DEFAULT_BASE_HP = 20;

export const MAX_SUBSTEPS_PER_TICK = 8;
