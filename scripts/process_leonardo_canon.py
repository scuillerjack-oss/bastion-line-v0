#!/usr/bin/env python3
"""Traitement TECHNIQUE de l'asset Leonardo (canon), cahier des charges V5,
section 4 : "Adapter uniquement ce qui est nécessaire à l'affichage dans le
jeu... Vérifier d'abord sa transparence réelle; si un damier ou un fond est
effectivement intégré aux pixels, le signaler avant toute intégration
destructive."

Constat mesuré (voir rapport V5) : le fichier fourni
(assets/leonardo/canon_original.jpg) est un JPEG RGB sans canal alpha
possible, et ses pixels de fond forment un DAMIER gris clair réellement
intégré (alternance mesurée ~237/254 par blocs d'environ 16px) -- l'artefact
classique d'un export à transparence "aplatie" par l'outil source, jamais une
vraie transparence. Aucune transparence réelle n'existait donc avant ce
script.

Aucune réinterprétation artistique : uniquement détection du damier,
recadrage sur la silhouette réelle, transparence, redimensionnement. Le
fichier ORIGINAL reste intact -- ce script le LIT sans jamais l'écrire.

Méthode (différente de process_leonardo_asset.py car le fond n'est pas une
couleur plate unique, mais un damier bicolore achromatique dont l'une des
deux teintes, ~237, s'est révélée trop proche de certains reflets clairs
RÉELS du canon (métal poli) pour qu'un simple seuil luminosité+saturation
sépare les deux sans ronger ces reflets -- damier résiduel constaté à la
première tentative, voir le rapport technique V5) :
1. Masque de fond "confiant" : pixel clair (luminosité >= 230, proche des
   deux teintes mesurées du damier ~237/254) ET quasi gris pur (saturation
   <= 8) -- volontairement STRICT pour ne jamais y inclure un reflet réel.
2. Propagation en 4-connexité (scipy.ndimage.label) depuis les bords de
   l'image UNIQUEMENT : seul le damier est topologiquement connecté aux
   bords à travers ce masque strict ; un reflet clair pris au milieu du
   canon, même s'il matche localement le seuil, n'est jamais connecté aux
   bords à travers la silhouette opaque qui l'entoure, donc jamais effacé.
3. Alpha = 0 pile sur ce fond connecté aux bords, 255 ailleurs, avec un flou
   gaussien léger de la seule bordure (jamais du damier lui-même) pour une
   transition douce anti-crénelage.
4. Recadrage sur la boîte englobante réelle de l'objet, marge de 4%.
5. Redimensionnement à une résolution source unique, plus grande que la
   taille d'affichage réelle en jeu pour rester net (devicePixelRatio<=2).
6. Compression PNG (optimize=True).
"""
import numpy as np
from scipy import ndimage
from PIL import Image, ImageFilter

SRC = "assets/leonardo/canon_original.jpg"
OUT = "public/assets/towers/canon.png"

BG_BRIGHT_MIN = 230   # sous les deux teintes mesurées du damier (~237/254)
BG_SAT_MAX = 8         # damier = gris quasi pur ; un reflet réel a toujours un soupçon de teinte
PAD_FRACTION = 0.04
TARGET_W, TARGET_H = 372, 428

im = Image.open(SRC).convert("RGB")
arr = np.array(im).astype(float)

mx = arr.max(axis=2)
mn = arr.min(axis=2)
sat = mx - mn
bright = arr.mean(axis=2)

confident_bg = (bright >= BG_BRIGHT_MIN) & (sat <= BG_SAT_MAX)
labeled, _ = ndimage.label(confident_bg)
border_labels = set(labeled[0, :]) | set(labeled[-1, :]) | set(labeled[:, 0]) | set(labeled[:, -1])
border_labels.discard(0)
bg_connected = np.isin(labeled, list(border_labels))

alpha_mask = np.where(bg_connected, 0, 255).astype(np.uint8)
# Flou léger de la seule bordure alpha (jamais du contenu RVB) pour éviter un
# contour en dents de scie une fois réduit à la taille d'affichage réelle.
alpha_img = Image.fromarray(alpha_mask, mode="L").filter(ImageFilter.GaussianBlur(1.2))
alpha = np.array(alpha_img)

obj_rows = np.where(~bg_connected.all(axis=1) if False else (~bg_connected).any(axis=1))[0]
obj_cols = np.where((~bg_connected).any(axis=0))[0]
pad_y = int((obj_rows.max() - obj_rows.min()) * PAD_FRACTION)
pad_x = int((obj_cols.max() - obj_cols.min()) * PAD_FRACTION)
y0 = max(0, obj_rows.min() - pad_y)
y1 = min(arr.shape[0], obj_rows.max() + pad_y)
x0 = max(0, obj_cols.min() - pad_x)
x1 = min(arr.shape[1], obj_cols.max() + pad_x)

cropped_rgb = np.array(im)[y0:y1, x0:x1]
cropped_alpha = alpha[y0:y1, x0:x1]
rgba = np.dstack([cropped_rgb, cropped_alpha])

result = Image.fromarray(rgba, mode="RGBA")
result = result.resize((TARGET_W, TARGET_H), Image.LANCZOS)
result.save(OUT, optimize=True)
print(f"Écrit: {OUT} ({TARGET_W}x{TARGET_H}), boîte source [{x0}:{x1}, {y0}:{y1}], taille: {__import__('os').path.getsize(OUT)} octets")
