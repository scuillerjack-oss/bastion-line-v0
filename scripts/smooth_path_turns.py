#!/usr/bin/env python3
"""Lissage des changements de direction de PATH_MAP (cahier "Prochaine
version candidate bêta", priorité 1 : "les ennemis suivent mieux les
routes mais ce n'est pas encore assez propre dans les virages -- continue
dans cette direction, ne remplace pas la logique de déplacement").

Diagnostic établi par mesure (pas de supposition) : engine/path.js fait de
l'interpolation linéaire PURE entre waypoints consécutifs (aucun lissage de
virage, par construction -- on ne touche pas à ça, cf. l'instruction du
cahier). Le PATH_MAP actuel (69 sommets, simplification Douglas-Peucker
epsilon=1.5 sur la référence centrée tests/fixtures/road_centerline_
reference.json, voir scripts/center_path_v7.py) contient des changements de
direction INSTANTANÉS jusqu'à 67,3° à certains sommets -- mesuré ici même
avant lissage. Douglas-Peucker ne borne que l'écart perpendiculaire au
segment simplifié (1,5 unité) ; il ne borne PAS l'angle de virage résultant.
Un virage réellement serré de la route (confirmé visuellement : la route
passe d'un tronçon quasi horizontal à un tronçon quasi vertical sur une
très courte portée) produit alors un unique sommet à angle vif -- fidèle à
la route, mais visuellement un "pivot sur place" pour un ennemi qui ne fait
QUE de l'interpolation linéaire.

Remède, jamais une correction manuelle virage par virage, jamais un
changement de scripts/center_path_v7.py (qui reste la seule source de la
référence centrée) : un lissage générique "coupe de coin" (corner cutting,
même principe que Chaikin), appliqué UNIQUEMENT aux sommets dont l'angle de
virage dépasse un seuil (CORNER_THRESHOLD_DEG), en coupant une fraction
fixe (CUT_RATIO) de chacun des deux segments adjacents pour remplacer le
sommet vif par deux sommets plus doux reliés par une corde courte. Répété
par passes jusqu'à stabilisation (un virage très serré peut avoir besoin de
plusieurs passes). Contrairement à une tentative initiale rejetée
(réinsertion de points voisins depuis le tracé dense indexé) : cette
méthode travaille uniquement sur les sommets déjà simplifiés et leurs
fractions de segment, donc ne peut jamais produire de chevauchement
d'indices ni de retour en arrière (contrairement à un ré-ancrage sur le
tracé dense, qui s'est avéré produire des angles de 180° quand deux
sommets vifs du PATH_MAP d'origine étaient très proches l'un de l'autre).

Vérifié après coup (sortie de ce script) contre tests/pathing.test.js --
la nouvelle polyligne reste à 2,91 unités maximum de la référence centrée
dense (tolérance du test : 6 unités, largeur réelle de route : PATH_WIDTH/2
= 17), donc aucun virage n'est coupé hors du corridor réel.
"""
import json
import math

REFERENCE_PATH = "tests/fixtures/road_centerline_reference.json"
RDP_EPSILON = 1.5  # identique à scripts/center_path_v7.py -- jamais retouché ici
CORNER_THRESHOLD_DEG = 12.0
CUT_RATIO = 0.3
MIN_CUTTABLE_SEG = 2.0  # évite de grignoter à l'infini un segment déjà très court
MAX_PASSES = 8


def dist(a, b):
    return math.hypot(b[0] - a[0], b[1] - a[1])


def turn_angle(a, b, c):
    v1 = (b[0] - a[0], b[1] - a[1])
    v2 = (c[0] - b[0], c[1] - b[1])
    n1, n2 = math.hypot(*v1), math.hypot(*v2)
    if n1 == 0 or n2 == 0:
        return 0.0
    dot = max(-1.0, min(1.0, (v1[0] * v2[0] + v1[1] * v2[1]) / (n1 * n2)))
    return math.degrees(math.acos(dot))


def turn_stats(points):
    angles = [turn_angle(points[i - 1], points[i], points[i + 1]) for i in range(1, len(points) - 1)]
    return angles


def rdp_indices(points, lo, hi, epsilon, keep):
    (x1, y1), (x2, y2) = points[lo], points[hi]
    dx, dy = x2 - x1, y2 - y1
    norm = (dx * dx + dy * dy) ** 0.5
    max_dist, idx = -1.0, -1
    for i in range(lo + 1, hi):
        px, py = points[i]
        d = (((px - x1) ** 2 + (py - y1) ** 2) ** 0.5 if norm == 0
             else abs(dy * px - dx * py + x2 * y1 - y2 * x1) / norm)
        if d > max_dist:
            max_dist, idx = d, i
    if max_dist > epsilon:
        rdp_indices(points, lo, idx, epsilon, keep)
        keep.add(idx)
        rdp_indices(points, idx, hi, epsilon, keep)


def simplify(dense, epsilon):
    keep = {0, len(dense) - 1}
    rdp_indices(dense, 0, len(dense) - 1, epsilon, keep)
    return [dense[i] for i in sorted(keep)]


def corner_cut_pass(points, threshold_deg, ratio, min_seg):
    n = len(points)
    if n < 3:
        return points, False
    cut_before = [0.0] * n  # fraction coupée sur le segment (i-1,i), côté i
    cut_after = [0.0] * n   # fraction coupée sur le segment (i,i+1), côté i
    changed = False
    for i in range(1, n - 1):
        a, b, c = points[i - 1], points[i], points[i + 1]
        if turn_angle(a, b, c) > threshold_deg:
            if dist(a, b) > min_seg:
                cut_before[i] = ratio
            if dist(b, c) > min_seg:
                cut_after[i] = ratio
            if cut_before[i] or cut_after[i]:
                changed = True
    if not changed:
        return points, False
    # Un même segment peut être coupé par ses deux extrémités (deux virages
    # vifs rapprochés) : on plafonne la somme pour ne jamais faire se croiser
    # les deux points de coupe.
    for i in range(1, n):
        total = cut_after[i - 1] + cut_before[i]
        if total > 0.9:
            scale = 0.9 / total
            cut_after[i - 1] *= scale
            cut_before[i] *= scale
    result = [points[0]]
    for i in range(1, n - 1):
        a, b, c = points[i - 1], points[i], points[i + 1]
        if cut_before[i] > 0:
            result.append((b[0] + cut_before[i] * (a[0] - b[0]), b[1] + cut_before[i] * (a[1] - b[1])))
        if cut_before[i] == 0 and cut_after[i] == 0:
            result.append(b)
            continue
        if cut_after[i] > 0:
            result.append((b[0] + cut_after[i] * (c[0] - b[0]), b[1] + cut_after[i] * (c[1] - b[1])))
    result.append(points[-1])
    return result, True


def dist_point_to_segment(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    len2 = dx * dx + dy * dy
    t = 0.0 if len2 == 0 else max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / len2))
    cx, cy = ax + t * dx, ay + t * dy
    return math.hypot(px - cx, py - cy)


def min_dist_to_reference(x, y, reference):
    best = float("inf")
    for i in range(1, len(reference)):
        ax, ay = reference[i - 1]
        bx, by = reference[i]
        d = dist_point_to_segment(x, y, ax, ay, bx, by)
        if d < best:
            best = d
    return best


def sample_polyline(points, step=2.0):
    out = []
    for i in range(len(points) - 1):
        a, b = points[i], points[i + 1]
        length = dist(a, b)
        steps = max(1, int(length / step))
        for k in range(steps):
            t = k / steps
            out.append((a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])))
    out.append(points[-1])
    return out


def main():
    with open(REFERENCE_PATH) as f:
        dense = json.load(f)

    dense_angles = turn_stats(dense)
    print(f"tracé dense de référence : {len(dense)} points, angle de virage max {max(dense_angles):.1f}°, moyen {sum(dense_angles) / len(dense_angles):.2f}°")

    simplified = simplify(dense, RDP_EPSILON)
    before_angles = turn_stats(simplified)
    print(f"PATH_MAP actuel (Douglas-Peucker seul) : {len(simplified)} points, angle max {max(before_angles):.1f}°, moyen {sum(before_angles) / len(before_angles):.2f}°, >20° : {sum(1 for a in before_angles if a > 20)}")

    points = simplified
    for _ in range(MAX_PASSES):
        points, changed = corner_cut_pass(points, CORNER_THRESHOLD_DEG, CUT_RATIO, MIN_CUTTABLE_SEG)
        if not changed:
            break

    after_angles = turn_stats(points)
    print(f"PATH_MAP lissé (coupe de coin ciblée) : {len(points)} points, angle max {max(after_angles):.1f}°, moyen {sum(after_angles) / len(after_angles):.2f}°, >20° : {sum(1 for a in after_angles if a > 20)}")

    samples = sample_polyline(points, 2.0)
    deviations = [min_dist_to_reference(x, y, dense) for x, y in samples]
    print(f"écart max au corridor réel (tests/pathing.test.js, tolérance 6) : {max(deviations):.2f}, moyen {sum(deviations) / len(deviations):.3f}")

    print()
    print(f"PATH_MAP ({len(points)} points) :")
    entries = ", ".join(f"{{ x: {round(x, 1)}, y: {round(y, 1)} }}" for x, y in points)
    print(entries)


if __name__ == "__main__":
    main()
