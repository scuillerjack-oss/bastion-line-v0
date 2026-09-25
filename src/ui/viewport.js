import { ARENA_W, ARENA_H } from "../engine/constants.js";

// Mise à l'échelle "contain" : la carte logique (400x700) est toujours
// affichée EN ENTIER (cahier des charges V0, section 3 : "aucun déplacement
// de caméra nécessaire"), centrée dans le canvas réel, quel que soit le
// ratio d'écran. Le HUD (topbar) et le panneau de construction (bottombar)
// sont des éléments DOM séparés, hors du canvas -- le canvas n'a donc pas
// besoin de réserve de sécurité supplémentaire comme sur un projet où
// l'action se joue jusqu'au bord bas de l'écran.
export function computeViewport(canvasW, canvasH) {
  const scale = Math.min(canvasW / ARENA_W, canvasH / ARENA_H);
  const w = ARENA_W * scale;
  const h = ARENA_H * scale;
  const offsetX = (canvasW - w) / 2;
  const offsetY = (canvasH - h) / 2;
  return { scale, offsetX, offsetY, w, h };
}

export function screenToArena(clientX, clientY, canvasRect, viewport) {
  const localX = clientX - canvasRect.left - viewport.offsetX;
  const localY = clientY - canvasRect.top - viewport.offsetY;
  return { x: localX / viewport.scale, y: localY / viewport.scale };
}
