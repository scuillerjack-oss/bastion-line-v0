// Interpolation de RENDU entre le tick précédent et le tick courant d'une
// entité mobile (ennemi ou projectile) -- correction V7 à la cause (cahier
// V7, section 3, voir le commentaire détaillé dans simulation.js,
// stepEnemies). Fonction PURE, sans dépendance DOM/canvas (placée dans
// engine/ plutôt que ui/ pour rester testable directement par node:test,
// comme path.js -- la même séparation déjà établie dans ce projet entre
// logique testable et rendu).
//
// `alpha` est la fraction [0,1] du prochain pas de simulation déjà écoulée
// au moment du rendu (state.accMs / FIXED_DT, voir main.js) : 0 = encore
// exactement à la position du dernier tick, 1 = sur le point d'atteindre le
// tick suivant. Clampé défensivement -- un dépassement marginal ne doit
// jamais extrapoler au-delà du segment réellement simulé. Ne modifie JAMAIS
// l'entité d'état elle-même : retourne une copie légère utilisée
// UNIQUEMENT pour le dessin, jamais relue par la simulation.
export function interpolateRenderPos(entity, alpha) {
  const a = Math.max(0, Math.min(1, alpha));
  const px = entity.prevX ?? entity.x;
  const py = entity.prevY ?? entity.y;
  return { ...entity, x: px + (entity.x - px) * a, y: py + (entity.y - py) * a };
}
