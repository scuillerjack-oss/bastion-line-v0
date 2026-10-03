#!/usr/bin/env python3
"""Correction V7-polish du centrage des ennemis sur la route (cahier V7-polish,
section 3 : "les ennemis semblent encore marcher sur le bord de la route").

Diagnostic (mesuré dans ce script, voir la fonction perpendicular_center) :
assets/leonardo/trace_road.py (et donc scripts/retrace_path_v7.py qui en
reprend le même algorithme pour ne corriger QUE le bruit ponctuel) calcule le
centre de la route en scannant chaque LIGNE HORIZONTALE de l'image et en
prenant le x moyen des pixels route de cette ligne. Cette méthode mesure un
axe x-horizontal FIXE, jamais l'axe réellement perpendiculaire à la route à
cet endroit. Tant que la route est localement proche de la verticale, scanner
horizontalement EST approximativement perpendiculaire -- l'erreur est faible.
Mais dès que la route devient plus horizontale (exactement les zones de
virage et les portions qui serpentent presque à plat), le scan horizontal
devient presque PARALLÈLE à la route : le x moyen capte alors une coupe très
oblique, pas une coupe transversale, et le point obtenu dérive vers un bord.
Mesure empirique sur le PATH_MAP V7 (voir scripts/retrace_path_v7.py) : le
point le plus mauvais se trouvait à 22.9 unités arène de l'axe perpendiculaire
réel, sur une route locale large de seulement 45.8 unités -- c'est-à-dire
littéralement sur le bord, exactement le symptôme rapporté par la bêta.

Remède systémique (jamais une correction manuelle par virage, cahier V7-
polish section 3) : pour chaque point du tracé déjà nettoyé (filtre médian,
retrace_path_v7.py), on recalcule sa tangente locale à partir de voisins
suffisamment écartés (±5 échantillons, pour une direction stable), puis on
mesure le vrai centre de la coupe PERPENDICULAIRE à cette tangente dans le
masque route -- en marchant des deux côtés jusqu'au premier vrai bord
(plusieurs pixels hors-route consécutifs, pour ne jamais sauter sur une bande
de route voisine quand la route serpente près d'elle-même).

Première tentative rejetée : accrocher (snap) directement chaque point à cette
mesure individuelle réintroduit EXACTEMENT le défaut corrigé à la cause dans
la tâche précédente -- la détection de bord sur une texture de route peinte
est bruitée au pixel près, et ce bruit, une fois 783 mesures indépendantes
enchaînées, recrée des angles de virage proches de 180° (mesuré : 175.4°).
Remède retenu : on calcule le vecteur de correction (centre réel mesuré moins
point tracé) en CHAQUE point, mais on LISSE fortement ce signal de correction
(moyenne glissante, fenêtre large) avant de l'appliquer -- jamais le point
corrigé brut. Le biais systémique qu'on veut corriger varie lentement (il
reflète l'orientation locale de la route, qui évolue sur des dizaines
d'échantillons), alors que le bruit de détection de bord est, par nature,
un artefact pixel à pixel : un lissage large préserve le premier et élimine
le second, exactement le même principe que le filtre médian de l'étape
précédente, appliqué cette fois au signal de correction plutôt qu'au tracé
lui-même. Cette même méthode s'applique à la totalité du tracé, donc à tous
les niveaux qui partagent PATH_MAP -- aucune exception par virage.
"""
import json
import numpy as np
from PIL import Image

SRC = "assets/leonardo/carte_terrain_original.jpg"
ARENA_W, ARENA_H = 400, 700
CROP_W = round(1024 * ARENA_W / ARENA_H)  # 585
X0 = (1024 - CROP_W) // 2  # 219

im = Image.open(SRC).convert("RGB")
arr = np.array(im).astype(int)
H, W, _ = arr.shape
R, G, B = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
road_mask = (R > 140) & ((R - G) > 18) & ((R - B) > 45)


def to_image(ax, ay):
    return ax * (CROP_W / ARENA_W) + X0, ay * (1024 / ARENA_H)


def to_arena(px, py):
    return (px - X0) * (ARENA_W / CROP_W), py * (ARENA_H / 1024)


def sample_mask(px, py):
    ix, iy = int(round(px)), int(round(py))
    if 0 <= iy < H and 0 <= ix < W:
        return bool(road_mask[iy, ix])
    return False


def perpendicular_center(px, py, tangent, max_r=80):
    tx, ty = tangent
    norm = (tx * tx + ty * ty) ** 0.5
    if norm == 0:
        return None
    tx, ty = tx / norm, ty / norm
    nx, ny = -ty, tx  # perpendiculaire à la tangente locale

    def walk(sign):
        d = 0
        last_on = 0
        off_run = 0
        while d < max_r:
            x = px + sign * nx * d
            y = py + sign * ny * d
            if sample_mask(x, y):
                last_on = d
                off_run = 0
            else:
                off_run += 1
                if off_run >= 4:
                    break
            d += 1
        return last_on

    pos_edge = walk(1)
    neg_edge = walk(-1)
    if pos_edge == 0 and neg_edge == 0:
        return None
    mid = (pos_edge - neg_edge) / 2.0
    return px + nx * mid, py + ny * mid


# Régénère le tracé brut nettoyé (ligne par ligne + filtre médian 9 lignes,
# scripts/retrace_path_v7.py) directement depuis l'image source, PLUTÔT que
# de le relire depuis tests/fixtures/road_centerline_reference.json : ce
# script écrit sa sortie dans ce même fichier, donc le relire comme entrée le
# rendrait non réentrant (une deuxième exécution appliquerait la correction
# sur un tracé déjà corrigé). Toujours repartir de l'image, jamais de la
# sortie d'une exécution précédente.
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


x = 500.0
raw_rows = []
for y in range(92, 875, 1):
    cx = centerline_at_row(y, x)
    if cx is not None:
        x = 0.5 * x + 0.5 * cx
    raw_rows.append((y, x))

raw_ys = np.array([p[0] for p in raw_rows], dtype=float)
raw_xs = np.array([p[1] for p in raw_rows], dtype=float)
from scipy.signal import medfilt
smooth_xs = medfilt(raw_xs, kernel_size=9)
raw_trace = [list(to_arena(smooth_xs[i], raw_ys[i])) for i in range(len(raw_ys))]

TANGENT_OFFSET = 5  # voisins écartés pour une tangente stable, peu sensible au bruit local
correction_dx = np.zeros(len(raw_trace))
correction_dy = np.zeros(len(raw_trace))
for i in range(len(raw_trace)):
    lo = max(0, i - TANGENT_OFFSET)
    hi = min(len(raw_trace) - 1, i + TANGENT_OFFSET)
    ax0, ay0 = raw_trace[lo]
    ax1, ay1 = raw_trace[hi]
    px0, py0 = to_image(ax0, ay0)
    px1, py1 = to_image(ax1, ay1)
    tangent = (px1 - px0, py1 - py0)

    ax, ay = raw_trace[i]
    px, py = to_image(ax, ay)
    r = perpendicular_center(px, py, tangent)
    if r is None:
        continue  # pas de mesure ici : correction laissée à 0 pour ce point
    cx, cy = r
    true_ax, true_ay = to_arena(cx, cy)
    correction_dx[i] = true_ax - ax
    correction_dy[i] = true_ay - ay

# Lissage FORT (moyenne glissante, fenêtre 45 ~ 45 unités d'image, très
# supérieure à la fenêtre 9 utilisée pour le bruit ponctuel) du signal de
# correction lui-même -- voir le docstring du module : le biais qu'on corrige
# varie lentement avec l'orientation locale de la route, le bruit de bord de
# masque est pixel à pixel. On n'applique donc jamais la mesure individuelle
# brute, seulement sa tendance lissée.
SMOOTH_WINDOW = 45
kernel = np.ones(SMOOTH_WINDOW) / SMOOTH_WINDOW
pad = SMOOTH_WINDOW // 2
dx_padded = np.pad(correction_dx, pad, mode="edge")
dy_padded = np.pad(correction_dy, pad, mode="edge")
dx_smooth = np.convolve(dx_padded, kernel, mode="valid")
dy_smooth = np.convolve(dy_padded, kernel, mode="valid")

xs = np.array([p[0] for p in raw_trace]) + dx_smooth
ys_arena = np.array([p[1] for p in raw_trace]) + dy_smooth
centered_smooth = list(zip(xs.tolist(), ys_arena.tolist()))

print(f"correction moyenne appliquée (norme) : {np.mean(np.hypot(dx_smooth, dy_smooth)):.2f} unités arène")
print(f"correction maximale appliquée (norme) : {np.max(np.hypot(dx_smooth, dy_smooth)):.2f} unités arène")

with open("tests/fixtures/road_centerline_reference.json", "w") as f:
    json.dump([[round(x, 3), round(y, 3)] for x, y in centered_smooth], f)
print(f"Référence recentrée (axe perpendiculaire réel) écrite : tests/fixtures/road_centerline_reference.json ({len(centered_smooth)} points)")


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


simplified = rdp(centered_smooth, 1.5)
print(f"PATH_MAP recentré : {len(simplified)} points")
print(json.dumps([[round(x, 1), round(y, 1)] for x, y in simplified]))
