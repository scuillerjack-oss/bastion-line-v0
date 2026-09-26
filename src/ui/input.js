import { computeViewport, screenToArena } from "./viewport.js";
import { TAP_HIT_RADIUS } from "../engine/constants.js";

// Interaction tactile directe avec les emplacements de construction et les
// tours (cahier des charges V0, section 10) : un tap est traduit en
// coordonnées de l'arène logique, puis testé contre les tours existantes
// D'ABORD (rayon de détection généreux, doigt réel) puis les emplacements
// vides -- jamais une zone de tap plus petite qu'un doigt.
// Le viewport utilisé pour traduire un tap DOIT être calculé à partir des
// dimensions CSS du canvas (getBoundingClientRect), jamais de canvas.width/
// height : ces derniers sont la résolution du BUFFER de dessin, mise à
// l'échelle par le devicePixelRatio (voir main.js resizeCanvas), alors que
// clientX/clientY d'un événement pointeur sont TOUJOURS en pixels CSS. Sur
// un poste de test avec devicePixelRatio=1 (Playwright par défaut), les deux
// espaces coïncident et le bug est invisible -- sur un vrai téléphone
// (devicePixelRatio 2-3), mélanger les deux espaces divise chaque position
// tapée par un facteur ~2-3x trop grand et fait rater presque tous les
// emplacements de construction. Découvert lors de la bêta physique V0.
export function createTapController(canvas, onTap) {
  function computeCssViewport() {
    const rect = canvas.getBoundingClientRect();
    return computeViewport(rect.width, rect.height);
  }

  let viewport = computeCssViewport();

  function updateViewport() {
    viewport = computeCssViewport();
  }

  // Cause réelle du bug bêta V1 ("le premier appui sur un '+' proche du bas
  // de l'écran construit immédiatement une tour") : hitTestEmptySlot()
  // ouvre le panneau de construction de façon SYNCHRONE, à l'intérieur même
  // de ce gestionnaire de pointerdown -- avant que le pointeur qui vient de
  // tapoter ne se soit relâché. Le panneau (feuille ancrée en bas de
  // l'écran, voir style.css .panel-root) insère alors un vrai <button> de
  // choix de tour exactement sous le doigt encore posé. Au relâchement, le
  // navigateur résout le "click" de compatibilité en fonction de l'élément
  // RÉELLEMENT présent à cet endroit AU MOMENT du relâchement -- ce nouveau
  // bouton, pas le canvas -- et déclenche donc une construction alors que
  // le joueur n'a fait qu'UN seul appui. C'est un comportement standard et
  // documenté (spécification Pointer Events) : annuler l'événement
  // "pointerdown" d'origine supprime la génération de CE click de
  // compatibilité pour la suite de ce même pointeur, quel que soit
  // l'élément qui se retrouve sous le doigt ensuite. C'est la correction de
  // la cause elle-même (propagation pointer -> click), jamais un délai
  // arbitraire masquant le symptôme.
  function handlePointerDown(ev) {
    ev.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const arenaPos = screenToArena(ev.clientX, ev.clientY, rect, viewport);
    onTap(arenaPos);
  }

  canvas.addEventListener("pointerdown", handlePointerDown);

  return {
    updateViewport,
    getViewport: () => viewport,
    destroy: () => canvas.removeEventListener("pointerdown", handlePointerDown),
  };
}

export function hitTestTower(state, arenaPos) {
  let best = null;
  let bestDist = Infinity;
  for (const tower of state.towers) {
    const d = Math.hypot(tower.x - arenaPos.x, tower.y - arenaPos.y);
    if (d <= TAP_HIT_RADIUS && d < bestDist) {
      best = tower;
      bestDist = d;
    }
  }
  return best;
}

export function hitTestEmptySlot(state, arenaPos) {
  let best = null;
  let bestDist = Infinity;
  for (const slot of state.buildSlots) {
    if (slot.towerId) continue;
    const d = Math.hypot(slot.x - arenaPos.x, slot.y - arenaPos.y);
    if (d <= TAP_HIT_RADIUS && d < bestDist) {
      best = slot;
      bestDist = d;
    }
  }
  return best;
}
