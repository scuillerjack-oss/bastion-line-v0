import { computeViewport, screenToArena } from "./viewport.js";
import { TAP_HIT_RADIUS } from "../engine/constants.js";

// Interaction tactile directe avec les emplacements de construction et les
// tours (cahier des charges V0, section 10) : un tap est traduit en
// coordonnées de l'arène logique, puis testé contre les tours existantes
// D'ABORD (rayon de détection généreux, doigt réel) puis les emplacements
// vides -- jamais une zone de tap plus petite qu'un doigt.
export function createTapController(canvas, onTap) {
  let viewport = computeViewport(canvas.width, canvas.height);

  function updateViewport() {
    viewport = computeViewport(canvas.width, canvas.height);
  }

  function handlePointerDown(ev) {
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
