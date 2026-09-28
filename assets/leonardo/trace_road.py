#!/usr/bin/env python3
"""Script d'AUDIT (jamais exécuté en production) utilisé pour mesurer, sans
aucune réinterprétation artistique, la position réelle de la route dessinée
sur carte_terrain_original.jpg -- cahier V5, section 3.2 : "Le chemin
logique suivi par les ennemis doit correspondre visuellement au chemin
dessiné sur l'asset."

Méthode : suivi du centre de la bande de couleur "route" (teinte sable,
mesurée ~RVB(185,150,95), nettement distincte de l'herbe ~RVB(105,120,40))
ligne par ligne, en partant du point connu sous le portail haut et en
restreignant la recherche à une fenêtre proche de la position de la ligne
précédente (évite de sauter sur un autre élément sablé du décor, comme le
campement à droite de l'image). Les points de virage (extrema locaux en x)
obtenus sont ensuite recopiés à la main, convertis dans l'espace logique du
jeu par process_leonardo_map.py, dans engine/levels.js (PATH_MAP) -- voir le
rapport technique V5 pour la vérification visuelle finale (superposition du
tracé sur l'image source).
"""
import numpy as np
from PIL import Image

SRC = "assets/leonardo/carte_terrain_original.jpg"

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


if __name__ == "__main__":
    x = 500.0
    trace = []
    for y in range(92, 875, 1):
        cx = centerline_at_row(y, x)
        if cx is not None:
            x = 0.5 * x + 0.5 * cx
        trace.append((y, x))
    for y, xx in trace:
        if y % 30 < 1:
            print(y, round(xx))
