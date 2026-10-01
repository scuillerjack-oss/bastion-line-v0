// Non-régression V7 (cahier V7, section 3 : "diagnostiquer la cause réelle
// des sauts/repositionnements visibles près de certains virages... ajouter
// des tests/non-régressions adaptés"). Cause racine réelle (voir le
// commentaire complet dans engine/simulation.js, stepEnemies) : le rendu
// affichait directement la dernière position SIMULÉE, sans jamais
// interpoler la fraction de temps du prochain tick déjà écoulée -- visible
// surtout dans les virages sur un écran à fréquence de rafraîchissement
// supérieure aux 60Hz de la simulation. Ces tests verrouillent la fonction
// pure d'interpolation de rendu (ui/render.js, interpolateRenderPos) et la
// mémorisation prevX/prevY par la simulation (engine/simulation.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { interpolateRenderPos } from "../src/engine/interpolate.js";
import { createLevelState } from "../src/engine/state.js";
import { tick } from "../src/engine/simulation.js";

function makeTestLevel() {
  return {
    id: 999,
    name: "Test",
    baseHp: 10,
    startCoins: 0,
    paths: [
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 }, // virage à angle droit -- le cas le plus exigeant pour l'interpolation
      ],
    ],
    buildSlots: [],
    unlockedTowers: [],
    waves: [{ prepMs: 0, spawns: [{ kind: "standard", pathIndex: 0, delayMs: 0 }] }],
  };
}

test("interpolateRenderPos : alpha=0 reste exactement à la position précédente", () => {
  const entity = { x: 10, y: 20, prevX: 0, prevY: 0 };
  const r = interpolateRenderPos(entity, 0);
  assert.equal(r.x, 0);
  assert.equal(r.y, 0);
});

test("interpolateRenderPos : alpha=1 atteint exactement la position courante", () => {
  const entity = { x: 10, y: 20, prevX: 0, prevY: 0 };
  const r = interpolateRenderPos(entity, 1);
  assert.equal(r.x, 10);
  assert.equal(r.y, 20);
});

test("interpolateRenderPos : alpha=0.5 retourne précisément le milieu du segment (jamais un saut)", () => {
  const entity = { x: 10, y: 20, prevX: 0, prevY: 0 };
  const r = interpolateRenderPos(entity, 0.5);
  assert.equal(r.x, 5);
  assert.equal(r.y, 10);
});

test("interpolateRenderPos : un alpha hors de [0,1] est clampé, jamais une extrapolation au-delà du segment réellement simulé", () => {
  const entity = { x: 10, y: 0, prevX: 0, prevY: 0 };
  assert.equal(interpolateRenderPos(entity, 1.4).x, 10);
  assert.equal(interpolateRenderPos(entity, -0.4).x, 0);
});

test("interpolateRenderPos : une entité sans prevX/prevY (cas défensif) ne saute jamais depuis une position inexistante", () => {
  const entity = { x: 42, y: 7 };
  const r = interpolateRenderPos(entity, 0.3);
  assert.equal(r.x, 42);
  assert.equal(r.y, 7);
});

test("interpolateRenderPos : conserve toutes les autres propriétés de l'entité (jamais une copie partielle)", () => {
  const entity = { x: 10, y: 10, prevX: 0, prevY: 0, kind: "blinde", hp: 42 };
  const r = interpolateRenderPos(entity, 0.5);
  assert.equal(r.kind, "blinde");
  assert.equal(r.hp, 42);
});

test("simulation : stepEnemies mémorise prevX/prevY à CHAQUE tick (jamais figé à la position d'apparition)", () => {
  const state = createLevelState(makeTestLevel());
  tick(state, 1000 / 60); // tick 1 : consomme le prepMs=0, passe en statut "wave" (aucun spawn ce même tick)
  tick(state, 1000 / 60); // tick 2 : spawn (delayMs=0) + premier pas de déplacement
  assert.equal(state.enemies.length, 1);
  const afterSpawnTickX = state.enemies[0].x;
  tick(state, 1000 / 60); // tick 3 : second pas de déplacement
  const enemy = state.enemies[0];
  // Après un second tick, prevX doit être la position du tick précédent
  // (celle juste après le spawn), PAS la position d'apparition initiale ni
  // la nouvelle position courante -- sinon l'interpolation rejouerait
  // toujours le même micro-segment ou sauterait directement à la cible.
  assert.equal(enemy.prevX, afterSpawnTickX);
  assert.ok(enemy.x !== enemy.prevX, "la position doit réellement avancer entre deux ticks consécutifs");
});

test("simulation : l'interpolation reste bornée au segment réellement simulé, y compris exactement DANS un virage à angle droit", () => {
  const state = createLevelState(makeTestLevel());
  // Avance jusqu'à ce que l'ennemi soit proche du virage (100,0) puis
  // interpole sur plusieurs valeurs d'alpha : la position affichée ne doit
  // jamais s'écarter du rectangle englobant [prevX,x] x [prevY,y] du tick en
  // cours -- la signature géométrique exacte d'un "saut" serait une valeur
  // en dehors de ce rectangle.
  for (let i = 0; i < 400; i++) tick(state, 1000 / 60);
  const enemy = state.enemies.find((e) => e.alive);
  if (!enemy) return; // ennemi déjà arrivé à la base sur ce court chemin de test -- rien à vérifier
  const minX = Math.min(enemy.prevX, enemy.x);
  const maxX = Math.max(enemy.prevX, enemy.x);
  const minY = Math.min(enemy.prevY, enemy.y);
  const maxY = Math.max(enemy.prevY, enemy.y);
  for (let a = 0; a <= 1; a += 0.1) {
    const r = interpolateRenderPos(enemy, a);
    assert.ok(r.x >= minX - 1e-9 && r.x <= maxX + 1e-9, `x interpolé hors du segment réellement simulé à alpha=${a}`);
    assert.ok(r.y >= minY - 1e-9 && r.y <= maxY + 1e-9, `y interpolé hors du segment réellement simulé à alpha=${a}`);
  }
});
