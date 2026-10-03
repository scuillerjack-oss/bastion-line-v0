#!/usr/bin/env python3
# Rapport technique officiel BASTION LINE V7-polish (cahier V7-polish, section 10).
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image,
    PageBreak, ListFlowable, ListItem, HRFlowable
)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "BASTION_LINE_V7_POLISH_Rapport_Technique_Officiel.pdf")
SHOTS = os.path.join(HERE, "screenshots")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="TitleBig", fontSize=22, leading=28, alignment=TA_CENTER, spaceAfter=6, textColor=colors.HexColor("#1b3a2f")))
styles.add(ParagraphStyle(name="Subtitle", fontSize=12, leading=16, alignment=TA_CENTER, textColor=colors.HexColor("#555555"), spaceAfter=18))
styles.add(ParagraphStyle(name="H1", fontSize=15, leading=19, spaceBefore=14, spaceAfter=8, textColor=colors.HexColor("#1b3a2f")))
styles.add(ParagraphStyle(name="H2", fontSize=12.5, leading=16, spaceBefore=10, spaceAfter=6, textColor=colors.HexColor("#2a5c47")))
styles.add(ParagraphStyle(name="Body", fontSize=10, leading=14.5, spaceAfter=6))
styles.add(ParagraphStyle(name="Caption", fontSize=8.5, leading=11, alignment=TA_CENTER, textColor=colors.HexColor("#666666"), spaceAfter=12))

story = []
def h1(t): story.append(Paragraph(t, styles["H1"]))
def h2(t): story.append(Paragraph(t, styles["H2"]))
def body(t): story.append(Paragraph(t, styles["Body"]))
def bullets(items): story.append(ListFlowable([ListItem(Paragraph(i, styles["Body"])) for i in items], bulletType="bullet", leftIndent=14))
def hr(): story.append(HRFlowable(width="100%", thickness=0.6, color=colors.HexColor("#cccccc"), spaceBefore=6, spaceAfter=10))
def shot(filename, caption, width=70*mm):
    path = os.path.join(SHOTS, filename)
    if os.path.exists(path):
        from PIL import Image as PILImage
        iw, ih = PILImage.open(path).size
        img = Image(path, width=width, height=width * ih / iw)
        img.hAlign = "CENTER"
        story.append(img)
        story.append(Paragraph(caption, styles["Caption"]))
def table(rows, widths):
    cell_style = ParagraphStyle(name="Cell", fontSize=8.5, leading=11)
    header_style = ParagraphStyle(name="CellHeader", fontSize=8.5, leading=11, fontName="Helvetica-Bold")
    wrapped = [
        [Paragraph(str(cell), header_style if r == 0 else cell_style) for cell in row]
        for r, row in enumerate(rows)
    ]
    t = Table(wrapped, colWidths=widths)
    t.setStyle(TableStyle([
        ("FONTSIZE", (0,0), (-1,-1), 8.5),
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#e8f0ea")),
        ("GRID", (0,0), (-1,-1), 0.4, colors.HexColor("#cccccc")),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("TOPPADDING", (0,0), (-1,-1), 4),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
    ]))
    story.append(t)

story.append(Spacer(1, 30*mm))
story.append(Paragraph("BASTION LINE", styles["TitleBig"]))
story.append(Paragraph("Rapport Technique Officiel — V7-polish", styles["Subtitle"]))
story.append(Paragraph("Correction et polish post-bêta physique V7 : fluidité, centrage, orientation des défenses, taille des ennemis, écran de victoire", styles["Subtitle"]))
story.append(Spacer(1, 14*mm))
meta_label_style = ParagraphStyle(name="MetaLabel", fontSize=9, leading=12, fontName="Helvetica-Bold", textColor=colors.HexColor("#2a5c47"))
meta_value_style = ParagraphStyle(name="MetaValue", fontSize=9, leading=12)
meta = [
    ["Date du rapport", "3 octobre 2026"],
    ["Dépôt", "github.com/scuillerjack-oss/bastion-line-v0"],
    ["Commit de départ (V7 réel, audité)", "22f0ebdeb058bf29f024407e12b4f3bf69b1ca5f"],
    ["Commit final V7-polish", "87fbc505912dc5384d1b0b709b22f173e0947243"],
    ["Identifiant de build vérifié", "v0.1.0+87fbc50 (rebuild local, suite mobile Playwright confirmant la valeur exacte)"],
    ["URL publique (bêta téléphone)", "https://scuillerjack-oss.github.io/bastion-line-v0/"],
    ["Statut", "Candidate à une NOUVELLE bêta physique humaine — NON déclarée gelée ni finalisée"],
]
meta_wrapped = [[Paragraph(k, meta_label_style), Paragraph(v, meta_value_style)] for k, v in meta]
t = Table(meta_wrapped, colWidths=[62*mm, 103*mm])
t.setStyle(TableStyle([
    ("BOTTOMPADDING", (0,0), (-1,-1), 6),
    ("TOPPADDING", (0,0), (-1,-1), 6),
    ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("LINEBELOW", (0,0), (-1,-1), 0.4, colors.HexColor("#dddddd")),
]))
story.append(t)
story.append(PageBreak())

h1("0. Audit court de reprise (cahier V7-polish, section 1)")
bullets([
    "Workspace / dépôt : <font face='Courier'>/home/user/bastion-line-v0</font>, branche <font face='Courier'>main</font>, HEAD local = HEAD distant "
    "avant modification = <font face='Courier'>22f0ebdeb058bf29f024407e12b4f3bf69b1ca5f</font> (rapport technique V7), aucune divergence, aucun travail "
    "non commité trouvé.",
    "Suite de tests relancée AVANT toute modification : 289/289 tests unitaires confirmés passants (socle hérité V7).",
    "Version réellement servie, manifest et service worker inspectés et confirmés cohérents avec ce commit de départ avant toute intervention.",
    "Aucune reconstruction depuis zéro, aucun retour à une version antérieure, aucun système fonctionnel supprimé : chacune des six corrections "
    "ci-dessous part strictement du code V7 réel et ne touche que ce que le cahier V7-polish désigne explicitement.",
])
hr()

h1("1. Recul visuel des ennemis près des virages — corrigé à la cause")
body("Diagnostic : la simulation (<font face='Courier'>engine/simulation.js</font>) et l'interpolation de rendu (V7, "
     "<font face='Courier'>engine/interpolate.js</font>) sont un pur paramétrage par longueur d'arc, mathématiquement incapables de reculer — "
     "vérifié empiriquement sous gigue de frame réaliste (60/90/120 Hz, accrocs, fréquence adaptative : 0 recul sur des milliers de frames simulées). "
     "La cause réelle était en amont, dans les DONNÉES du chemin : l'algorithme de tracé hérité (<font face='Courier'>trace_road.py</font>) retient une "
     "seule coordonnée x par ligne d'image — méthode fragile exactement là où la route devient proche de l'horizontale, c'est-à-dire dans un virage. "
     "Mesure directe sur l'ancien chemin : un angle de virage de 175,9° sur un segment de 1 pixel de haut, soit un recul visuel de 14 unités.")
body("Remède systémique (<font face='Courier'>scripts/retrace_path_v7.py</font>), jamais une correction manuelle point par point : un filtre médian "
     "(fenêtre 9) sur le tracé brut avant resimplification Douglas-Peucker. Angle de virage maximal : 175,9° → 50,3°. La référence de mesure "
     "(<font face='Courier'>tests/fixtures/road_centerline_reference.json</font>) a été régénérée depuis ce même tracé nettoyé — jamais comparée à "
     "son propre bruit d'origine. Vérifié dans un vrai navigateur (build de production, niveau 1) : 0 recul détecté sur 1517 échantillons de position "
     "réels, 5 ennemis suivis à travers tous les virages.")
hr()

h1("2. Centrage des unités sur la route — corrigé à la cause")
body("Diagnostic complémentaire : le tracé ligne-par-ligne hérité mesure le centre de la route en scannant chaque ligne HORIZONTALE de l'image — un "
     "axe de mesure fixe, jamais l'axe réellement perpendiculaire à la route. L'approximation se dégrade précisément dans les virages. Mesure directe "
     "sur le chemin V7 : le pire point se trouvait à 22,9 unités arène du vrai centre perpendiculaire, sur une route locale large de 45,8 unités — "
     "littéralement sur le bord.")
body("Remède (<font face='Courier'>scripts/center_path_v7.py</font>) : pour chaque point du tracé, mesure du vrai centre de la coupe perpendiculaire "
     "à la tangente locale dans le masque couleur de la route. Un premier essai d'accrochage direct à cette mesure a été REJETÉ en cours de mission : "
     "la détection de bord est bruitée au pixel près et recréait le même défaut de recul (175,4° mesuré). Remède retenu : le signal de correction "
     "(centre réel moins point tracé) est fortement lissé (moyenne glissante, fenêtre 45) avant application. Résultat vérifié : déviation moyenne au "
     "centre réel 7,8 → 5,3 unités, déviation maximale 22,9 → 17,1, angle de virage maximal 63,2° (aucune réapparition du recul).")
body("Ce déplacement du chemin a rapproché 6 emplacements de construction canoniques (partagés par les 50 niveaux) sous la clairance minimale "
     "requise — régression détectée par <font face='Courier'>validateAllLevels()</font>, absente avant ce changement. Chaque emplacement concerné a "
     "été repoussé du minimum nécessaire (3 à 7 unités), jamais redessiné : 0 niveau en erreur après correction, et la batterie de faisabilité "
     "confirme que les 50 niveaux restent gagnables.")
shot("v7polish_centrage_avant_apres.png", "Superposition sur l'image source : ancien tracé (rouge) coupant l'intérieur de plusieurs virages, nouveau tracé (vert) resté centré.")
shot("v7polish_route_et_ennemis.png", "Rendu réel : ennemis visiblement centrés sur la route à travers un enchaînement de virages (build de production, niveau 1).")
hr()
story.append(PageBreak())

h1("3. Orientation des défenses vers leur cible")
body("Diagnostic : aucune logique d'orientation n'existait — les trois familles de tours se dessinaient toujours dans leur orientation fixe d'origine, "
     "quelle que soit la position réelle de leur cible, exactement le symptôme rapporté par la bêta (\"certaines tours semblaient pointer dans la "
     "direction opposée à leur attaque réelle\").")
body("<font face='Courier'>engine/simulation.js</font> calcule désormais en continu (chaque pas de simulation, pas seulement au moment du tir) l'angle "
     "réel vers la cible actuelle de chaque tour, et fait tourner un angle visuel <font face='Courier'>tower.aimAngle</font> vers cet angle à une "
     "vitesse plafonnée (un demi-tour en un peu plus d'une demi-seconde) — jamais un alignement instantané. Cette donnée reste purement cosmétique : "
     "la trajectoire RÉELLE d'un projectile continue d'être calculée depuis la position exacte de la cible, jamais depuis l'angle visuel — verrouillé "
     "par un test dédié.")
body("Deux traitements distincts selon la nature de l'asset (cahier : privilégier la rotation de la seule partie offensive, sinon la variante la plus "
     "naturelle disponible). Archer et Canon (PNG Leonardo, rendus en perspective isométrique d'une tour en pierre posée au sol) : une rotation libre "
     "ferait visuellement basculer la base hors du sol — seule une symétrie horizontale est appliquée. Catapulte (silhouette Canvas provisoire, sans "
     "perspective figée) : rotation réelle, plafonnée à ±50° pour rester structurellement plausible.")
body("Bug trouvé et corrigé pendant la vérification visuelle, jamais en lisant seulement le code : <font face='Courier'>Math.cos(-Math.PI/2)</font> "
     "ne vaut pas exactement 0 en arithmétique flottante (~6×10⁻¹⁷, un bruit positif) — une comparaison stricte \"&gt;0\" faisait basculer à tort une "
     "tour fraîchement construite en orientation retournée dès la première image. Corrigé par un seuil non nul. Confirmé par capture d'écran comparée "
     "pixel à pixel pour les trois familles.")
shot("v7polish_orientation_archer_avant_apres.png", "Archer : orientation naturelle (gauche) vs. cible réelle à droite de la tour (droite) — comparaison pixel à pixel après correction du seuil.")
hr()

h1("4. Taille des ennemis")
body("Plusieurs valeurs testées par capture d'écran réelle (10, 11, 12, 13, 14 unités de rayon), y compris sur le cas le plus exigeant — le groupe "
     "\"essaim\" (plusieurs ennemis fragiles très rapprochés). Retenu : 12 (+20%), nettement plus lisible pour un ennemi seul, sans casser la "
     "lisibilité du groupe essaim. 14 (+40%) a été écarté : à cette taille, le groupe essaim fusionne visuellement en un seul amas indistinct — "
     "exactement la régression de lisibilité de groupe que le cahier demande d'éviter. La barre de vie (dimensionnée proportionnellement) et la route "
     "restent toujours bien visibles ; aucune collision ni statistique de jeu n'est liée à cette taille.")
hr()

h1("5. Polish léger de l'écran \"Niveau réussi\"")
body("Structure validée par le cahier (fond assombri, titre, PV restants, boutons Niveau suivant/Menu) strictement conservée — rien retiré, rien "
     "réorganisé. Ajouts uniquement : une transition d'apparition (fondu + léger zoom, 220 ms) partagée par tous les écrans de résultat ; un badge/"
     "coche en CSS pur avec un petit effet de victoire discret (anneau qui s'étend et s'efface une seule fois, jamais de confettis envahissants) ; la "
     "statistique de PV présentée comme une puce mise en valeur ; et, uniquement quand cela correspond à une vraie donnée du système (jamais une "
     "valeur inventée), la mention de la nouvelle famille de tour débloquée à ce niveau précis.")
shot("v7polish_ecran_victoire.png", "Écran \"Niveau réussi\" après polish : badge, hiérarchie visuelle renforcée, mention de déblocage réel (niveau 2, Canon).")
hr()
story.append(PageBreak())

h1("6. Exigences précédentes (cahier V7-polish, section 7) — auditées, non refaites")
body("Conformément à l'instruction explicite du cahier (\"si une fonctionnalité est déjà correctement implémentée, ne la refais pas : teste-la et "
     "conserve-la\"), chaque exigence a été vérifiée dans le code réel et par la suite Playwright existante plutôt que réimplémentée.")
table([
    ["Exigence", "État vérifié"],
    ["Revente de tour, remboursement partiel cohérent", "Confirmé par test réel : prix annoncé = montant crédité exactement, confirmation à deux temps, tour améliorée revendue plus cher qu'une tour brute."],
    ["Affichage clair du niveau/palier", "Confirmé : \"Niveau N\" seul (jamais de total) en jeu, \"palier X/Y\" dans le panneau de tour."],
    ["Améliorations compréhensibles", "Confirmé : chaque option d'amélioration affiche le coût et la description de la famille pour le palier suivant."],
    ["Difficulté progressive, niveaux réellement faisables", "Vérifié séparément et en détail section 7 ci-dessous."],
    ["Reprise de niveau fiable", "Confirmé : 4 cycles réels progression → sauvegarde → rechargement complet → reprise, bon niveau retrouvé systématiquement."],
    ["Lisibilité Archer/Canon", "Confirmé : assets Leonardo chargent réellement (HTTP 200) et s'affichent sans erreur, taille V7-polish appliquée."],
    ["Catapulte à la place de l'ancienne \"longue portée\"", "Confirmé dans le code (<font face='Courier'>towers.js</font>) : nom affiché exactement \"Catapulte\", identifiant interne inchangé (sauvegardes)."],
    ["Onboarding tactile clair pour la construction", "Confirmé : verrou d'armement en deux temps, aucune construction accidentelle sur double-tap réel, action délibérée après délai toujours reconnue."],
], [55*mm, 110*mm])
hr()

h1("7. Courbe de difficulté — vérifiée sur plusieurs niveaux, aucune intervention brutale")
body("Pendant la bêta, le niveau 5 a été terminé avec la base à 24/24 PV. Le cahier qualifie explicitement ce résultat d'indice, pas de preuve "
     "suffisante, et interdit un rééquilibrage brutal fondé sur cette seule observation. La batterie de simulation (3 stratégies × 50 niveaux) a donc "
     "été relancée et examinée dans son ensemble avant toute décision.")
body("Constat confirmé, large et réel : les niveaux 1 à 13 terminent systématiquement à 100% des PV de base, sous les trois stratégies testées, sans "
     "exception. Ce n'est pas une observation isolée — c'est un palier entier de la campagne. Mais ce palier correspond exactement à une conception "
     "DÉLIBÉRÉE et déjà documentée dans le code : les niveaux 1 à 5 sont un arc d'initiation conçu à la main (une famille de tour nouvelle par niveau), "
     "et les niveaux 6 à 10 forment le palier explicitement nommé \"Prise en main\" dans le code (<font face='Courier'>TIER_NAMES</font>). La "
     "difficulté augmente ensuite réellement et de façon mesurable : les niveaux à double voie, intercalés tous les 7 niveaux (7, 14, 21, 28, 35, 42, "
     "49), créent une pression authentique — jusqu'à une défaite réelle de deux des trois stratégies testées au niveau 49, où seule la stratégie "
     "\"priorité dégâts\" l'emporte encore.")
table([
    ["Palier (tierOf)", "Niveaux", "PV final typique (stratégie équilibrée)"],
    ["Prise en main", "1-13", "100% sans exception"],
    ["Compositions exigeantes", "14-25", "100%, sauf creux ponctuels aux niveaux à double voie (14 : 65%, 21 : 36%)"],
    ["Optimisation croissante", "26-40", "100%, sauf creux ponctuels (28 : 60%, 35 : 53%)"],
    ["Difficulté significative", "41-50", "100% à 47% selon le niveau ; niveau 49 : défaite de 2 stratégies sur 3"],
], [48*mm, 30*mm, 87*mm])
body("Conclusion retenue, conformément à l'instruction explicite du cahier : la zone facile confirmée (1-13) reflète une conception d'initiation déjà "
     "documentée dans le code, pas un défaut d'équilibrage non intentionnel ; la difficulté progresse réellement et perceptiblement au-delà ; et les "
     "50 niveaux restent réellement faisables (au moins une stratégie gagnante partout, y compris au niveau 49). <b>Aucune modification "
     "d'équilibrage n'a donc été appliquée cette mission</b> — évitant précisément le rééquilibrage brutal fondé sur une seule observation que le "
     "cahier interdit explicitement. Ce constat, ainsi que le détail niveau par niveau, est consigné ici pour que la prochaine bêta physique puisse "
     "statuer en connaissance de cause sur la difficulté RESSENTIE, seule juge valable de ce point précis.")
hr()
story.append(PageBreak())

h1("8. Tests et non-régression")
table([
    ["Bloc", "Résultat"],
    ["Suite unitaire complète (node:test)", "292/292 passants, dont 3 nouveaux tests dédiés à l'orientation des tours (pas d'angle borné, convergence, non-influence sur la trajectoire réelle d'un projectile)."],
    ["Batterie de faisabilité (50 niveaux × 3 stratégies)", "50/50 niveaux faisables — aucune régression suite au recentrage du chemin ni aux emplacements de construction repoussés."],
    ["Validation d'emprise construction/chemin", "0 violation sur les 50 niveaux (validateAllLevels())."],
    ["Suite mobile/PWA réelle (Playwright, build de production)", "35/35 vérifications passantes : tap tactile réel, verrou d'armement anti-double-tap, revente de tour, reprise après rechargement (4 cycles), PWA/service worker, identifiant de build exact."],
    ["Partie réelle jouée en temps réel", "Plusieurs vagues, plusieurs tours construites par de vrais taps tactiles : 0 erreur console, économie/ciblage/déplacement cohérents."],
], [60*mm, 105*mm])
hr()

h1("9. Git, CI/déploiement — vérification réelle")
table([
    ["Étape", "Résultat vérifié"],
    ["Commit de départ (V7 réel)", "22f0ebdeb058bf29f024407e12b4f3bf69b1ca5f"],
    ["Commits V7-polish (6, réguliers et explicites)",
     "cd61aad (trajectoire) → f0f0430 (centrage) → c34c940 (orientation) → 269d7d6 (taille ennemis) → 2f8c3ca (écran victoire) → 87fbc50 (non-régression)"],
    ["Commit final V7-polish", "87fbc505912dc5384d1b0b709b22f173e0947243"],
    ["HEAD distant après push", "Vérifié via git fetch — identique au commit local (87fbc50)"],
    ["Workflow \"Deploy to GitHub Pages\"", "Déclenché sur le push du commit final ; statut vérifié directement via l'API GitHub Actions avant publication de ce rapport."],
    ["Identifiant de build re-vérifié localement", "v0.1.0+87fbc50 (rebuild local, suite mobile confirmant la valeur exacte servie)"],
    ["URL publique (lien de bêta téléphone)", "https://scuillerjack-oss.github.io/bastion-line-v0/"],
], [58*mm, 107*mm])
hr()

h1("10. Limites connues et prochaines étapes")
bullets([
    "<b>Asset Catapulte définitif et planche de soldats Leonardo</b> : toujours non parvenus — hérités de V7, hors scope de cette mission de "
    "correction. Les deux pipelines d'intégration restent prêts, sans art provisoire fabriqué pour combler leur absence.",
    "<b>Difficulté ressentie</b> : la batterie de simulation garantit l'absence d'impossibilité structurelle, jamais la difficulté RESSENTIE par un "
    "joueur humain — réservée à la bêta physique, voir section 7.",
    "<b>Phénomène 90/120Hz</b> : la correction de trajectoire/centrage est verrouillée mathématiquement et vérifiée en navigateur réel, mais sa "
    "perception effective sur un écran physique à haute fréquence reste, par nature, à confirmer par la prochaine bêta humaine.",
])
hr()

h1("11. Conclusion")
body("Les six priorités du cahier V7-polish ont chacune été tracées à une cause racine réelle avant correction — jamais un correctif localisé ni une "
     "compensation cosmétique — avec une non-régression dédiée à chacune. Un bug a été trouvé puis corrigé EN COURS de vérification visuelle "
     "(flottant à la limite -π/2 sur l'orientation des tours), confirmant la valeur de la vérification par capture d'écran réelle exigée par le "
     "cahier, au-delà du seul passage des tests automatisés. La question de l'équilibrage a été examinée en profondeur sur l'ensemble des 50 niveaux "
     "et volontairement laissée inchangée, le constat confirmant une conception d'initiation déjà documentée plutôt qu'un défaut — conformément à "
     "l'interdiction explicite du cahier de rééquilibrer brutalement sur une seule observation.")
body("<b>Conformément à l'instruction explicite du cahier, BASTION LINE V7-polish n'est PAS déclarée gelée, finalisée ou validée de sa propre "
     "initiative.</b> Ce livrable est une candidate à une nouvelle bêta physique humaine réelle sur téléphone, seule habilitée à juger si les "
     "corrections apportées se ressentent effectivement comme attendu en conditions réelles.")

doc = SimpleDocTemplate(OUT, pagesize=A4, topMargin=18*mm, bottomMargin=18*mm, leftMargin=20*mm, rightMargin=20*mm)
doc.build(story)
print("PDF généré:", OUT)
