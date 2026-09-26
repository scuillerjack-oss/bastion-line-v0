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

// Largeur du tracé du chemin (rendu ET validation d'emprise doivent
// partager CETTE seule source -- avant V2, ce nombre n'existait qu'en
// dur dans render.js, dupliqué nulle part mais sans aucun lien formel
// avec la logique de placement des emplacements : c'est la racine
// structurelle du bug "construction posée sur la route" -- rien ne
// vérifiait jamais la distance réelle entre un emplacement et le chemin).
export const PATH_WIDTH = 34;

// Rayon d'emprise visuelle maximal d'UNE tour, tous paliers et familles
// confondus (cahier V2, section 1 : "anticiper des sprites/assets
// graphiques plus volumineux"). Couvre déjà, à V2 : les anneaux de palier
// des tours Canvas (jusqu'à -36px au palier max) ET le sprite Leonardo de
// la tour rapide, délibérément mis à l'échelle pour rester dans cette même
// enveloppe (voir src/ui/render.js, LEONARDO_RENDER_*). Toute famille ou
// palier futur doit rester sous ce rayon, ou celui-ci doit être augmenté
// ET les emplacements existants revalidés (voir validateFootprintClearances).
export const TOWER_FOOTPRINT_RADIUS = 38;

// Marge de sécurité supplémentaire, au-delà de la somme géométrique stricte
// (rayon d'emprise + demi-largeur du chemin), pour absorber l'anticrénelage
// et l'imprécision visuelle réelle sur un écran de téléphone.
export const FOOTPRINT_SAFETY_MARGIN = 3;

// Vies de base par défaut (overridable par niveau) -- condition de défaite :
// baseHp <= 0.
export const DEFAULT_BASE_HP = 20;

export const MAX_SUBSTEPS_PER_TICK = 8;
