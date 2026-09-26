// Validation systémique de l'emprise visuelle construction/chemin (cahier
// des charges V2, priorité 1). Diagnostic de la cause réelle du bug bêta
// V1 ("un canon semble posé sur la route") : AUCUNE vérification n'existait
// jamais entre la position d'un emplacement de construction et la
// géométrie réelle du chemin -- deux emplacements se trouvaient placés
// EXACTEMENT sur la ligne centrale du chemin (distance nulle), ce qui, une
// fois combiné à l'ordre de rendu (les ennemis sont dessinés APRÈS les
// tours, un choix volontaire pour leur lisibilité, jamais la cause du
// bug), donnait l'impression qu'un ennemi traversait la construction.
//
// La correction n'est pas un simple déplacement ponctuel : c'est cette
// fonction, appelée à la fois par validateLevel() (garde-fou permanent,
// cahier des charges) et par un test unitaire dédié, qui empêche
// définitivement la régression sur TOUS les emplacements, TOUTES les
// familles de tours confondues -- y compris un futur sprite plus volumineux
// que les formes Canvas actuelles (voir TOWER_FOOTPRINT_RADIUS).
import { PATH_WIDTH, TOWER_FOOTPRINT_RADIUS, FOOTPRINT_SAFETY_MARGIN } from "./constants.js";

export function distancePointToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

export function minDistanceToAnyPath(x, y, paths) {
  let min = Infinity;
  for (const path of paths) {
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1];
      const b = path[i];
      const d = distancePointToSegment(x, y, a.x, a.y, b.x, b.y);
      if (d < min) min = d;
    }
  }
  return min;
}

export function requiredClearance() {
  return PATH_WIDTH / 2 + TOWER_FOOTPRINT_RADIUS + FOOTPRINT_SAFETY_MARGIN;
}

// Retourne la liste des emplacements dont l'emprise visuelle empièterait
// sur le chemin -- vide si le niveau est sain. Utilisé aussi bien pour un
// garde-fou de validation (validateLevel) que pour un test unitaire
// verrouillant TOUS les niveaux réels du jeu, pas un niveau synthétique.
export function findFootprintViolations(level) {
  const required = requiredClearance();
  const violations = [];
  for (const slot of level.buildSlots || []) {
    const dist = minDistanceToAnyPath(slot.x, slot.y, level.paths || []);
    if (dist < required) {
      violations.push({ slotId: slot.id, x: slot.x, y: slot.y, distance: dist, required });
    }
  }
  return violations;
}
