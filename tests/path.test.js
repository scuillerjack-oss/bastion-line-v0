import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPathData, pointAtDistance } from "../src/engine/path.js";

test("buildPathData calcule la longueur totale correctement (segments orthogonaux)", () => {
  const data = buildPathData([
    { x: 0, y: 0 },
    { x: 0, y: 100 },
    { x: 50, y: 100 },
  ]);
  assert.equal(data.totalLength, 150);
});

test("pointAtDistance retourne le point de départ à distance 0", () => {
  const data = buildPathData([
    { x: 10, y: 10 },
    { x: 10, y: 60 },
  ]);
  const p = pointAtDistance(data, 0);
  assert.equal(p.x, 10);
  assert.equal(p.y, 10);
});

test("pointAtDistance interpole correctement au milieu d'un segment", () => {
  const data = buildPathData([
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ]);
  const p = pointAtDistance(data, 50);
  assert.equal(p.x, 50);
  assert.equal(p.y, 0);
});

test("pointAtDistance ne dépasse jamais le dernier point (clamp)", () => {
  const data = buildPathData([
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ]);
  const p = pointAtDistance(data, 99999);
  assert.equal(p.x, 100);
  assert.equal(p.y, 0);
});

test("pointAtDistance traverse correctement plusieurs segments", () => {
  const data = buildPathData([
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
  ]);
  const p = pointAtDistance(data, 150); // 100 sur le premier segment + 50 sur le second
  assert.equal(p.x, 100);
  assert.equal(p.y, 50);
});
