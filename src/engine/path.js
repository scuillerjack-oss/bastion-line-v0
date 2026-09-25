// Prétraitement d'un chemin (liste de points) en une structure permettant de
// placer un ennemi à une distance parcourue donnée en O(segments) --
// jamais recalculé à chaque pas de simulation, une seule fois à la création
// du niveau (voir state.js).
export function buildPathData(points) {
  const segLengths = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const len = Math.hypot(dx, dy);
    segLengths.push(len);
    total += len;
  }
  return { points, segLengths, totalLength: total };
}

export function pointAtDistance(pathData, distance) {
  const { points, segLengths, totalLength } = pathData;
  if (distance <= 0) return { x: points[0].x, y: points[0].y };
  if (distance >= totalLength) return { x: points[points.length - 1].x, y: points[points.length - 1].y };
  let remaining = distance;
  for (let i = 0; i < segLengths.length; i++) {
    if (remaining <= segLengths[i]) {
      const t = segLengths[i] === 0 ? 0 : remaining / segLengths[i];
      const a = points[i];
      const b = points[i + 1];
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    remaining -= segLengths[i];
  }
  const last = points[points.length - 1];
  return { x: last.x, y: last.y };
}
