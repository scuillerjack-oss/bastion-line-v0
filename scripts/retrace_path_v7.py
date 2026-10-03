#!/usr/bin/env python3
"""Correction V7 à la cause du défaut "l'ennemi avance puis recule légèrement,
surtout dans les virages" (cahier V7, section 2).

Diagnostic (voir le rapport technique V7) : la trajectoire simulée elle-même
est un pur paramétrage par longueur d'arc (engine/path.js, traveled toujours
strictement croissant) -- mathématiquement incapable de reculer, vérifié
empiriquement par simulation sous gigue de frame réaliste (0 événement de recul
sur des milliers de frames testées, 60/90/120Hz, accrocs, fréquence adaptative).
La cause réelle est en amont, dans les DONNÉES : l'algorithme de tracé
(assets/leonardo/trace_road.py) suit le centre de la route LIGNE PAR LIGNE
(une seule coordonnée x retenue par ligne y) -- une méthode structurellement
fragile exactement là où la route devient proche de l'horizontale (un virage),
puisqu'une ligne horizontale de l'image traverse alors la route sur une large
plage de x sans direction verticale dominante pour la désambiguïser. Résultat
mesuré : plusieurs points du PATH_MAP existant forment un AUTO-CROISEMENT --
un angle de virage proche de 180° sur un segment très court (ex. point 8-9 de
l'ancien PATH_MAP : 265→251, soit 14 unités vers l'ARRIÈRE sur une portée de
y de seulement 1 pixel) -- un ennemi qui traverse ce point avance bien selon
sa distance parcourue, mais sa position (x,y) RECULE visuellement avant de
repartir, exactement le symptôme rapporté, concentré aux virages car c'est
précisément là que le tracé ligne-par-ligne échoue.

Remède : un filtre médian glissant (fenêtre impaire courte) sur la séquence
x(y) AVANT simplification Douglas-Peucker -- un filtre médian élimine par
construction un échantillon isolé aberrant (1-2 lignes) sans déformer une
courbe réelle qui évolue sur des dizaines de lignes, exactement le profil du
bruit mesuré ici. Jamais une correction manuelle point par point : la même
méthode s'applique à la totalité du tracé, donc à tous les niveaux qui
partagent PATH_MAP.
"""
import json
import numpy as np
from PIL import Image

SRC = "assets/leonardo/carte_terrain_original.jpg"
ARENA_W, ARENA_H = 400, 700
CROP_W = round(1024 * ARENA_W / ARENA_H)  # 585, voir process_leonardo_map.py
X0 = (1024 - CROP_W) // 2  # 219

im = Image.open(SRC).convert("RGB")
arr = np.array(im).astype(int)
H, W, _ = arr.shape
R, G, B = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
road_mask = (R > 140) & ((R - G) > 18) & ((R - B) > 45)


def centerline_at_row(y, x_guess, window=160):
    x_guess = int(round(x_guess))
    x0 = max(0, x_guess - window)
    x1 = min(W, x_guess + window)
    xs = np.where(road_mask[y, x0:x1])[0]
    if len(xs) == 0:
        return None
    xs = xs + x0
    xs.sort()
    gaps = np.where(np.diff(xs) > 8)[0]
    segs = np.split(xs, gaps + 1)
    best = min(segs, key=lambda s: abs(s.mean() - x_guess))
    return float(best.mean())


# --- Étape 1 : tracé brut, identique à trace_road.py (même algorithme, pour
# ne RIEN changer d'autre que ce qui est explicitement corrigé ici). ---
x = 500.0
raw = []
for y in range(92, 875, 1):
    cx = centerline_at_row(y, x)
    if cx is not None:
        x = 0.5 * x + 0.5 * cx
    raw.append((y, x))

raw_ys = np.array([p[0] for p in raw], dtype=float)
raw_xs = np.array([p[1] for p in raw], dtype=float)

# --- Étape 2 : filtre médian glissant sur x(y) -- élimine les échantillons
# isolés aberrants (signature mesurée : 1-2 lignes) sans affecter une courbe
# réelle qui évolue sur des dizaines de lignes. Fenêtre choisie IMPAIRE et
# COURTE (9 lignes ~ 9 unités d'image) : assez large pour absorber un pic
# isolé, assez étroite pour ne pas aplatir un vrai virage serré du dessin
# (les virages réels de cette carte s'étendent sur des dizaines de lignes,
# voir la mesure des longueurs de segment de l'ancien PATH_MAP).
from scipy.signal import medfilt
WINDOW = 9
smooth_xs = medfilt(raw_xs, kernel_size=WINDOW)

# --- Étape 3 : conversion en espace logique ARENA (même transform que
# process_leonardo_map.py : recadrage x=[219:804], pleine hauteur, puis mise
# à l'échelle 585x1024 -> 400x700). ---
def to_arena(px, py):
    ax = (px - X0) * (ARENA_W / CROP_W)
    ay = py * (ARENA_H / 1024)
    return ax, ay

cleaned_trace = [to_arena(smooth_xs[i], raw_ys[i]) for i in range(len(raw_ys))]

with open("tests/fixtures/road_centerline_reference.json", "w") as f:
    json.dump([[round(x, 3), round(y, 3)] for x, y in cleaned_trace], f)
print(f"Référence nettoyée écrite : tests/fixtures/road_centerline_reference.json ({len(cleaned_trace)} points)")


# --- Étape 4 : simplification Douglas-Peucker (même tolérance 1,5 unité
# logique que V6) sur le tracé NETTOYÉ, pour obtenir le nouveau PATH_MAP. ---
def rdp(points, epsilon):
    if len(points) < 3:
        return points
    (x1, y1), (x2, y2) = points[0], points[-1]
    dx, dy = x2 - x1, y2 - y1
    norm = (dx * dx + dy * dy) ** 0.5
    max_dist, idx = -1, -1
    for i in range(1, len(points) - 1):
        px, py = points[i]
        if norm == 0:
            d = ((px - x1) ** 2 + (py - y1) ** 2) ** 0.5
        else:
            d = abs(dy * px - dx * py + x2 * y1 - y2 * x1) / norm
        if d > max_dist:
            max_dist, idx = d, i
    if max_dist > epsilon:
        left = rdp(points[: idx + 1], epsilon)
        right = rdp(points[idx:], epsilon)
        return left[:-1] + right
    return [points[0], points[-1]]

simplified = rdp(cleaned_trace, 1.5)
print(f"PATH_MAP simplifié : {len(simplified)} points (ancien : 82)")

# --- Étape 5 : vérification -- aucun angle de virage proche de 180° (ancien
# défaut) ne doit subsister. ---
def angle_at(p0, p1, p2):
    v1 = (p1[0] - p0[0], p1[1] - p0[1])
    v2 = (p2[0] - p1[0], p2[1] - p1[1])
    len1 = (v1[0] ** 2 + v1[1] ** 2) ** 0.5
    len2 = (v2[0] ** 2 + v2[1] ** 2) ** 0.5
    if len1 == 0 or len2 == 0:
        return 0.0
    dot = (v1[0] * v2[0] + v1[1] * v2[1]) / (len1 * len2)
    dot = max(-1.0, min(1.0, dot))
    return np.degrees(np.arccos(dot))

max_angle = 0.0
for i in range(1, len(simplified) - 1):
    a = angle_at(simplified[i - 1], simplified[i], simplified[i + 1])
    max_angle = max(max_angle, a)
print(f"Angle de virage maximal dans le nouveau PATH_MAP : {max_angle:.1f} degrés (ancien pire cas : 175.9)")
