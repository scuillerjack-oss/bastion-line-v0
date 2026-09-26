#!/usr/bin/env python3
"""Traitement TECHNIQUE de l'asset Leonardo (tour rapide / arbalète),
cahier des charges V2, priorité 3.

Aucune réinterprétation artistique : uniquement recadrage, suppression du
fond gris uniforme, transparence, redimensionnement, optimisation. Le
fichier ORIGINAL (assets/leonardo/tour_rapide_arbalete_original.jpg) reste
intact -- ce script le LIT sans jamais l'écrire, et produit un nouveau
fichier séparé dans public/assets/towers/.

Traitements appliqués, dans l'ordre :
1. Retrait du bandeau noir (letterbox) haut/bas de l'export original --
   détecté par luminosité moyenne des lignes, pas une valeur en dur non
   justifiée.
2. Recadrage sur la boîte englobante réelle de la tour (fond gris exclu),
   avec une marge de 4% pour ne pas raboter les bords de la silhouette.
3. Suppression du fond gris uniforme (172,172,172) par une carte alpha à
   transition DOUCE (jamais un seuil binaire, qui produirait un contour en
   dents de scie une fois réduit à la taille d'affichage réelle du jeu).
4. Redimensionnement à une résolution source unique (voir TARGET_W/H) --
   volontairement plus grande que la taille d'affichage réelle en jeu pour
   rester nette sur les densités d'écran ciblées (jusqu'à
   devicePixelRatio=2, voir main.js resizeCanvas), sans variantes de
   résolution supplémentaires : une seule image bien dimensionnée suffit
   ici et reste plus simple à maintenir (cahier V2 : "si nécessaire" --
   ça ne l'est pas à cette échelle).
5. Compression PNG (optimize=True) pour ne pas gonfler inutilement le
   poids de la PWA.
"""
import numpy as np
from PIL import Image

SRC = "assets/leonardo/tour_rapide_arbalete_original.jpg"
OUT = "public/assets/towers/tour_rapide_arbalete.png"

BG = np.array([172, 172, 172])
DIFF_LOW = 14   # en dessous : fond pur, alpha 0
DIFF_HIGH = 40  # au-dessus : objet plein, alpha 255
PAD_FRACTION = 0.04
TARGET_W, TARGET_H = 360, 504  # aspect ratio 0.714, identique à la source

im = Image.open(SRC).convert("RGB")
arr = np.array(im)

# 1. Retirer le bandeau noir (letterbox) : lignes/colonnes dont la
# luminosité moyenne dépasse un seuil de "non-noir".
brightness = arr.mean(axis=2)
row_mean = brightness.mean(axis=1)
col_mean = brightness.mean(axis=0)
rows_nonblack = np.where(row_mean > 15)[0]
cols_nonblack = np.where(col_mean > 15)[0]
gray_card = arr[rows_nonblack.min():rows_nonblack.max() + 1, cols_nonblack.min():cols_nonblack.max() + 1]

# 2. Recadrer sur la boîte englobante réelle de l'objet (fond gris exclu).
diff = np.abs(gray_card.astype(int) - BG).sum(axis=2)
mask = diff > DIFF_LOW
obj_rows = np.where(mask.any(axis=1))[0]
obj_cols = np.where(mask.any(axis=0))[0]
pad_y = int((obj_rows.max() - obj_rows.min()) * PAD_FRACTION)
pad_x = int((obj_cols.max() - obj_cols.min()) * PAD_FRACTION)
y0 = max(0, obj_rows.min() - pad_y)
y1 = min(gray_card.shape[0], obj_rows.max() + pad_y)
x0 = max(0, obj_cols.min() - pad_x)
x1 = min(gray_card.shape[1], obj_cols.max() + pad_x)
cropped = gray_card[y0:y1, x0:x1]

# 3. Alpha à transition douce contre le fond gris uniforme.
diff_cropped = np.abs(cropped.astype(int) - BG).sum(axis=2)
alpha = np.clip((diff_cropped - DIFF_LOW) / (DIFF_HIGH - DIFF_LOW), 0, 1) * 255
rgba = np.dstack([cropped, alpha.astype(np.uint8)])

result = Image.fromarray(rgba, mode="RGBA")

# 4. Redimensionnement à la résolution source cible (rééchantillonnage de
# haute qualité, cohérent avec la marque "haute densité d'écran" visée).
result = result.resize((TARGET_W, TARGET_H), Image.LANCZOS)

# 5. Écriture compressée.
result.save(OUT, optimize=True)
print(f"Écrit: {OUT} ({TARGET_W}x{TARGET_H}), taille: {__import__('os').path.getsize(OUT)} octets")
