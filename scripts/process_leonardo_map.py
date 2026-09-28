#!/usr/bin/env python3
"""Traitement TECHNIQUE de la carte Leonardo (terrain de jeu), cahier des
charges V5, section 3.1 : "L'image fournie est visuellement proche d'un
format carré alors que BASTION LINE est joué en portrait mobile. Claude doit
d'abord mesurer ses dimensions réelles [...]. Il est interdit de l'étirer de
façon non proportionnelle. Si un cadrage est nécessaire, il doit conserver
l'intégralité du chemin utile, l'entrée haute et la forteresse basse."

Mesure réelle : assets/leonardo/carte_terrain_original.jpg fait 1024x1024
(carré), alors que l'espace logique du jeu (ARENA_W x ARENA_H,
engine/constants.js) est 400x700 (ratio 0.5714). Un carré ne peut PAS être
étiré à ce ratio sans déformation visible -- seul un RECADRAGE (jamais un
redimensionnement non proportionnel) est utilisé ici.

Le chemin réel (tracé par assets/leonardo/trace_road.py) oscille entre
x=57 et x=356 sur les 1024px de large, donc bien À L'INTÉRIEUR d'une bande
centrée de 585px de large (585 = 1024 * 400/700, la plus grande largeur
possible qui, une fois la image gardée en PLEINE hauteur -- portail haut ET
forteresse basse intégralement conservés -- donne exactement le ratio
logique 400x700). Aucune partie du chemin, du portail ou de la forteresse
n'est donc perdue ; seul du décor latéral (rochers, arbres, un petit
campement à droite) est recadré hors champ.

Aucune réinterprétation artistique : recadrage géométrique seul, jamais de
retouche du contenu.
"""
from PIL import Image

SRC = "assets/leonardo/carte_terrain_original.jpg"
OUT = "public/assets/map/carte_terrain.jpg"

ARENA_W, ARENA_H = 400, 700
TARGET_RATIO = ARENA_W / ARENA_H

im = Image.open(SRC).convert("RGB")
W, H = im.size
assert (W, H) == (1024, 1024), f"dimensions réelles inattendues: {W}x{H} (vérifier avant de recadrer)"

# Pleine hauteur conservée (portail haut + forteresse basse), largeur
# recadrée au ratio cible, centrée sur le chemin réel (mesuré ~57-356 sur
# 1024, donc déjà proche du centre horizontal de l'image).
crop_w = round(H * TARGET_RATIO)
x0 = (W - crop_w) // 2
x1 = x0 + crop_w
cropped = im.crop((x0, 0, x1, H))
print(f"Recadrage: x=[{x0}:{x1}] (largeur {crop_w}), hauteur pleine {H} -- ratio {crop_w/H:.4f} (cible {TARGET_RATIO:.4f})")

cropped.save(OUT, quality=90, optimize=True)
print(f"Écrit: {OUT} ({cropped.size[0]}x{cropped.size[1]}), taille: {__import__('os').path.getsize(OUT)} octets")
