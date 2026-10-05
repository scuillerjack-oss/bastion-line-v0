#!/usr/bin/env python3
# Separe le socle (fixe) de l'ancien sprite combine tour+arbalete (cahier
# "Prochaine version candidate beta", section 4 : "le corps/socle de la
# tour doit rester parfaitement fixe"). Lit le sprite DEJA TRAITE
# (public/assets/towers/tour_rapide_arbalete.png, produit par
# process_leonardo_asset.py depuis le vrai original) plutot que de
# reprendre le traitement depuis zero -- garantit un recadrage/alpha
# identiques au reste du pipeline, jamais une variante divergente. Ce
# script-ci n'est pas sa propre source : process_leonardo_asset.py reste
# l'unique point d'entree pour le fichier _original.
#
# Ligne de decoupe (y=195 en coordonnees natives 360x504) determinee par
# inspection visuelle a la grille : au-dessus, le mecanisme d'arbalete
# (bras + hampe) ; a y=195 et en-dessous, uniquement la plateforme en
# pierre du toit de la tour et le corps du batiment -- aucun reste
# d'arbalete (verifie sur plusieurs lignes de coupe candidates, 195 est la
# plus haute qui soit deja totalement propre).
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, "public", "assets", "towers", "tour_rapide_arbalete.png")
OUT = os.path.join(ROOT, "public", "assets", "towers", "archer_socle.png")

CUT_Y = 195
# Point de montage (ou le centre du plateau rotatif de la baliste doit
# s'ancrer) repere visuellement dans l'image recadree : centre horizontal
# de la plateforme en pierre, juste sous son bord superieur.
MOUNT_X_IN_CROP = 180
MOUNT_Y_IN_CROP = 10


def main():
    full = Image.open(SRC).convert("RGBA")
    w, h = full.size
    socle = full.crop((0, CUT_Y, w, h))
    socle.save(OUT, optimize=True)
    print(f"Socle ecrit : {OUT} ({socle.width}x{socle.height})")
    print(f"Point de montage dans le recadre : ({MOUNT_X_IN_CROP},{MOUNT_Y_IN_CROP})")


if __name__ == "__main__":
    main()
