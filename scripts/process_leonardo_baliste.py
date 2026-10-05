#!/usr/bin/env python3
# Traitement de la planche Leonardo baliste (cahier "Prochaine version
# candidate bêta", section 5 et annexe A) -- script self-contenu et
# idempotent, lit uniquement depuis l'image source, jamais depuis sa propre
# sortie precedente (meme discipline que process_leonardo_map.py/
# process_leonardo_canon.py).
#
# La planche source est un .jpg : le damier "transparent" visible est en
# realite du PIXEL OPAQUE BAKED dans l'image (deux gris quasi neutres tres
# proches, ~232 et ~246) -- jamais un vrai canal alpha. Il est retire par
# flood-fill depuis les BORDS de l'image entiere (une zone "couleur damier"
# connectee au bord = fond, jamais le mecanisme lui-meme) plutot qu'un
# simple seuil de couleur global, pour ne jamais ronger un reflet clair A
# L'INTERIEUR du mecanisme qui tomberait par coincidence dans la meme plage
# de gris.
#
# Grille 3x3, centre vide = 8 orientations reelles. La position dans la
# grille encode directement la direction visuelle de la pointe du carreau
# (verifie visuellement cellule par cellule) :
#   TL=SE  TC=S   TR=SW
#   ML=W          MR=E
#   BL=NE  BC=N   BR=NW
#
# Pivot (point de montage) de chaque sprite : le centre du plateau
# circulaire, repere VISUELLEMENT par cellule (une tentative de detection
# automatique par couleur/plus-grande-composante-connexe s'est averee peu
# fiable -- les bras/la pointe partagent des tons trop proches du plateau
# dans plusieurs orientations). Verifie a postériori par une composition de
# test : les 8 sprites, dessines chacun a son propre pivot sur un meme
# point d'ancrage, alignent leurs 8 plateaux en un seul anneau coherent
# (voir docs/screenshots si regenere).
import json
import os

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, "assets", "leonardo", "baliste_original.jpg")
OUT_DIR = os.path.join(ROOT, "public", "assets", "towers", "baliste")
os.makedirs(OUT_DIR, exist_ok=True)

CELLS = {
    "TL": (0, 0), "TC": (1, 0), "TR": (2, 0),
    "ML": (0, 1), "MR": (2, 1),
    "BL": (0, 2), "BC": (1, 2), "BR": (2, 2),
}
DIRECTION_OF_CELL = {
    "TL": "SE", "TC": "S", "TR": "SW",
    "ML": "W", "MR": "E",
    "BL": "NE", "BC": "N", "BR": "NW",
}
# Pivots estimes visuellement (repere de la cellule 341x341 d'origine,
# avant recadrage individuel) -- voir docs/screenshots/baliste_pivot_overlay.png
# pour la verification visuelle de l'alignement resultant.
PIVOTS_IN_CELL = {
    "TL": (175, 258), "TC": (170, 215), "TR": (155, 258),
    "ML": (160, 170), "MR": (177, 170),
    "BL": (170, 160), "BC": (168, 165), "BR": (175, 160),
}
PAD = 4  # marge conservee autour du contenu recadre (anti-aliasing des bords)
# Redimensionnement (poids PWA, cahier section 8 "performance") : les
# cellules recadrees (~250-300px) sont bien plus grandes que la taille
# affichee en jeu (~40-50px) -- une resolution source ~2.5x la taille
# affichee suffit a rester nette jusqu'a devicePixelRatio=2 (meme logique
# que process_leonardo_asset.py pour la tour), inutile de livrer la pleine
# resolution de la planche. MAX_DIM applique la MEME echelle a l'image ET
# a son pivot (jamais l'un sans l'autre, sous peine de desynchroniser le
# point de montage).
MAX_DIM = 140


def remove_baked_checker_background(img_rgb):
    arr = np.array(img_rgb).astype(np.int16)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    maxc = np.maximum(np.maximum(r, g), b)
    minc = np.minimum(np.minimum(r, g), b)
    bg_candidate = ((maxc - minc) <= 10) & (minc >= 200)
    labeled, _ = ndimage.label(bg_candidate, structure=np.ones((3, 3)))
    border_labels = set(labeled[0, :]) | set(labeled[-1, :]) | set(labeled[:, 0]) | set(labeled[:, -1])
    border_labels.discard(0)
    bg_mask = np.isin(labeled, list(border_labels))
    alpha = np.where(bg_mask, 0, 255).astype(np.uint8)
    return Image.fromarray(np.dstack([arr.astype(np.uint8), alpha]), mode="RGBA")


def main():
    sheet = Image.open(SRC).convert("RGB")
    sheet_rgba = remove_baked_checker_background(sheet)
    w, h = sheet_rgba.size
    cw, ch = w // 3, h // 3

    manifest = {}
    for name, (cx, cy) in CELLS.items():
        cell = sheet_rgba.crop((cx * cw, cy * ch, (cx + 1) * cw, (cy + 1) * ch))
        bbox = cell.getbbox()
        if bbox is None:
            raise RuntimeError(f"cellule {name} entierement vide apres retrait du fond")
        l, t, r, b = bbox
        l, t = max(0, l - PAD), max(0, t - PAD)
        r, b = min(cw, r + PAD), min(ch, b + PAD)
        trimmed = cell.crop((l, t, r, b))
        px, py = PIVOTS_IN_CELL[name]
        px, py = px - l, py - t

        scale = min(1.0, MAX_DIM / max(trimmed.width, trimmed.height))
        if scale < 1.0:
            new_size = (round(trimmed.width * scale), round(trimmed.height * scale))
            trimmed = trimmed.resize(new_size, Image.LANCZOS)
            px, py = px * scale, py * scale

        direction = DIRECTION_OF_CELL[name]
        file_name = f"baliste_{direction}.png"
        trimmed.save(os.path.join(OUT_DIR, file_name), optimize=True)

        manifest[direction] = {
            "file": file_name,
            "w": trimmed.width,
            "h": trimmed.height,
            "pivotX": round(px),
            "pivotY": round(py),
        }

    with open(os.path.join(OUT_DIR, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)
    print("8 sprites directionnels ecrits dans", OUT_DIR)
    for direction, info in manifest.items():
        print(f"  {direction}: {info['w']}x{info['h']}, pivot=({info['pivotX']},{info['pivotY']})")


if __name__ == "__main__":
    main()
