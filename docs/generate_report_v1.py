#!/usr/bin/env python3
# Rapport technique officiel BASTION LINE V1 (cahier des charges V1, section 10).
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
OUT = os.path.join(HERE, "BASTION_LINE_V1_Rapport_Technique_Officiel.pdf")
SHOTS = os.path.join(HERE, "screenshots")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="TitleBig", fontSize=22, leading=28, alignment=TA_CENTER, spaceAfter=6, textColor=colors.HexColor("#1b3a2f")))
styles.add(ParagraphStyle(name="Subtitle", fontSize=12, leading=16, alignment=TA_CENTER, textColor=colors.HexColor("#555555"), spaceAfter=18))
styles.add(ParagraphStyle(name="H1", fontSize=15, leading=19, spaceBefore=14, spaceAfter=8, textColor=colors.HexColor("#1b3a2f")))
styles.add(ParagraphStyle(name="H2", fontSize=12.5, leading=16, spaceBefore=10, spaceAfter=6, textColor=colors.HexColor("#2a5c47")))
styles.add(ParagraphStyle(name="Body", fontSize=10, leading=14.5, spaceAfter=6))
styles.add(ParagraphStyle(name="Small", fontSize=8.5, leading=12, textColor=colors.HexColor("#666666")))
styles.add(ParagraphStyle(name="Caption", fontSize=8.5, leading=11, alignment=TA_CENTER, textColor=colors.HexColor("#666666"), spaceAfter=12))

story = []
def h1(text): story.append(Paragraph(text, styles["H1"]))
def h2(text): story.append(Paragraph(text, styles["H2"]))
def body(text): story.append(Paragraph(text, styles["Body"]))
def bullets(items):
    story.append(ListFlowable([ListItem(Paragraph(i, styles["Body"])) for i in items], bulletType="bullet", leftIndent=14))
def hr(): story.append(HRFlowable(width="100%", thickness=0.6, color=colors.HexColor("#cccccc"), spaceBefore=6, spaceAfter=10))
def shot(filename, caption, width=90*mm):
    path = os.path.join(SHOTS, filename)
    if os.path.exists(path):
        img = Image(path, width=width, height=width*844/390)
        img.hAlign = "CENTER"
        story.append(img)
        story.append(Paragraph(caption, styles["Caption"]))

def table(rows, widths):
    t = Table(rows, colWidths=widths)
    t.setStyle(TableStyle([
        ("FONTSIZE", (0,0), (-1,-1), 8.5),
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#e8f0ea")),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("GRID", (0,0), (-1,-1), 0.4, colors.HexColor("#cccccc")),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("TOPPADDING", (0,0), (-1,-1), 4),
        ("BOTTOMPADDING", (0,0), (-1,-1), 4),
    ]))
    story.append(t)

# --- Page de titre ---
story.append(Spacer(1, 40*mm))
story.append(Paragraph("BASTION LINE", styles["TitleBig"]))
story.append(Paragraph("Rapport Technique Officiel — V1", styles["Subtitle"]))
story.append(Paragraph("PWA réellement installable + refonte graphique", styles["Subtitle"]))
story.append(Spacer(1, 20*mm))
meta = [
    ["Date du rapport", "25 septembre 2026"],
    ["Dépôt", "github.com/scuillerjack-oss/bastion-line-v0"],
    ["Commit de départ (V0 vérifiée)", "f4535cef2507f80065cd560f714f309da5c67e9c"],
    ["Commit final V1 (HEAD distant vérifié)", "8d3b9fbc68f239e540b1f1ab99a68d7c0c41b41f"],
    ["Identifiant de build vérifié", "v0.1.0+8d3b9fb (rebuild local GITHUB_SHA=HEAD, confirmé identique)"],
    ["URL publique", "https://scuillerjack-oss.github.io/bastion-line-v0/"],
    ["Statut", "Candidate à la bêta physique V1 — NON VALIDÉE, décision humaine en attente"],
]
t = Table(meta, colWidths=[62*mm, 103*mm])
t.setStyle(TableStyle([
    ("FONTSIZE", (0,0), (-1,-1), 9),
    ("TEXTCOLOR", (0,0), (0,-1), colors.HexColor("#2a5c47")),
    ("FONTNAME", (0,0), (0,-1), "Helvetica-Bold"),
    ("BOTTOMPADDING", (0,0), (-1,-1), 6),
    ("TOPPADDING", (0,0), (-1,-1), 6),
    ("LINEBELOW", (0,0), (-1,-1), 0.4, colors.HexColor("#dddddd")),
]))
story.append(t)
story.append(PageBreak())

# --- 1. État Git initial ---
h1("1. État Git initial constaté (avant toute modification)")
body("Conformément à l'exigence du cahier (\"vérifier avant toute modification le HEAD local, le HEAD "
     "distant, le commit réellement servi et l'état du workspace\"), l'état suivant a été constaté avant "
     "d'écrire la moindre ligne de code :")
bullets([
    "Workspace : propre, aucune modification non commitée (<font face='Courier'>git status --short</font> vide).",
    "HEAD local = <font face='Courier'>f4535cef2507f80065cd560f714f309da5c67e9c</font>, branche <font face='Courier'>main</font>.",
    "HEAD distant réel (<font face='Courier'>git ls-remote</font>) : identique au HEAD local — aucune divergence.",
    "Ce commit correspondait à la dernière correction post-bêta V0 (construction mobile, retour visuel base, "
    "installabilité PWA), déjà vérifiée déployée avec succès (job <font face='Courier'>deploy</font> vert, "
    "<font face='Courier'>pages_build_version</font> confirmé identique dans le log de déploiement).",
])
body("Aucune reconstruction du projet, aucun changement de moteur, aucun remplacement d'architecture : "
     "le dépôt, sa branche et son historique existants ont été repris tels quels.")
hr()

# --- 2. PWA ---
h1("2. Priorité absolue — Diagnostic final PWA et solution mise en place")
h2("2.1 Diagnostic : pourquoi deux faux positifs précédents")
body("Les cycles précédents avaient corrigé, dans l'ordre : (1) l'absence d'icône raster ≥192×192 requise "
     "par les critères d'installabilité Chrome, puis (2) rien d'autre techniquement — le manifest et le "
     "service worker étaient déjà corrects. Le diagnostic V1 identifie la cause réelle des faux positifs : "
     "<b>un manifest et un service worker techniquement valides ne garantissent rien si la page est ouverte "
     "depuis un navigateur intégré (WebView Android d'une application tierce)</b>, qui ne propose "
     "structurellement aucune option d'installation, quel que soit l'état du code sur cette page.")
h2("2.2 Solution mise en place")
bullets([
    "Détection fiable d'une WebView Android via le jeton <font face='Courier'>\";wv)\"</font> dans le "
    "user-agent — convention documentée volontairement ajoutée par Chromium pour permettre cette détection, "
    "pas une heuristique fragile.",
    "Détection de l'état déjà-installé via <font face='Courier'>display-mode: standalone</font>.",
    "Capture réelle de l'événement natif <font face='Courier'>beforeinstallprompt</font> quand Chrome le "
    "signale disponible — jamais supposé présent.",
    "Bannière visible DÈS LE MENU (jamais cachée dans les réglages, jamais bloquante), adaptée à l'état réel détecté :",
])
table([
    ["État détecté", "Ce qui est proposé"],
    ["WebView Android (navigateur intégré)", "Message explicite + bouton \"Ouvrir dans Chrome\" (lien intent:// standard)"],
    ["Invite native disponible (beforeinstallprompt)", "Bouton \"Installer l'application\" déclenchant le vrai prompt Chrome"],
    ["iOS (Safari ou dérivé)", "Instructions manuelles : Partager → Sur l'écran d'accueil"],
    ["Navigateur normal sans invite native", "Instructions génériques : menu du navigateur -> Installer l'application / Ajouter à l'écran d'accueil"],
    ["Déjà installée (standalone)", "Aucune bannière affichée"],
], [65*mm, 100*mm])
body("Manifest complété : ajout de <font face='Courier'>id</font> (identité d'app stable) et "
     "<font face='Courier'>display_override</font>, deux champs explicitement listés dans la checklist "
     "d'audit du cahier. start_url/scope (déjà relatifs, donc robustes au sous-chemin "
     "<font face='Courier'>/bastion-line-v0/</font>) revérifiés par résolution d'URL réelle en test.")
h2("2.3 Limite honnête")
body("<b>Cette section ne peut pas être déclarée validée par ce rapport.</b> Conformément au cahier, "
     "\"la seule validation finale acceptable est une installation réelle et un lancement autonome sur le "
     "téléphone physique du porteur\". Tout ce qui précède est vérifié par du code et des tests automatisés "
     "réels (voir section 4) — pas par une installation physique, qui reste à faire.")
story.append(PageBreak())

# --- 3. Refonte graphique ---
h1("3. Priorité 2 — Changements graphiques et techniques")
h2("3.1 Principe")
body("Tout est dessiné en Canvas 2D, avec des formes fixes composées (aucune image, aucun sprite, aucune "
     "animation image-par-image). Le terrain et le tracé du chemin sont précalculés une seule fois sur un "
     "canvas hors-écran puis simplement \"blités\" chaque frame — coût de rendu inchangé par rapport à la V0.")
h2("3.2 Table des changements")
table([
    ["Élément", "V0", "V1"],
    ["Terrain", "Aplat vert uni", "Herbe texturée + pierres/buissons décoratifs statiques"],
    ["Chemin", "Trait brun uni", "Chemin de terre bordé, avec galets, courbes propres"],
    ["Base", "Cercle marqué \"B\"", "Petite forteresse (créneaux, porte, bannière) + barre de PV visible sur la carte"],
    ["Emplacement vide", "Cercle pointillé + croix", "Socle de pierre avec lueur d'invite discrète"],
    ["Tour rapide", "Triangle", "Arbalète sur poste (bras anguleux + carreau)"],
    ["Tour canon", "Carré", "Tourelle ronde + canon massif"],
    ["Tour longue portée", "Losange", "Tour haute effilée (silhouette la plus haute des 4)"],
    ["Tour contrôle", "Hexagone", "Tour cylindrique à orbe magique encastré"],
    ["Ennemis", "Ronds de couleur", "4 silhouettes : grognard 2-cercles, flèche, bloc riveté, grappe de 3 corps"],
    ["Projectiles", "Formes minimalistes identiques", "Différenciés par forme (bille, trait, anneau)"],
], [30*mm, 62*mm, 73*mm])
h2("3.3 Auto-critique en cours de production (avant tout commit)")
body("Une capture d'écran + zoom de chaque tour a été prise avant validation. Deux problèmes réels ont été "
     "trouvés et corrigés à ce stade, jamais livrés tels quels :")
bullets([
    "La première version de la tour \"rapide\" (arc fin + dôme sombre) se lisait, une fois réduite à "
    "l'échelle de jeu, comme la lettre \"T\" plutôt que comme une arbalète — corrigée avec des bras "
    "anguleux flairés et un carreau central.",
    "La première version de la tour \"contrôle\" (trapèze + orbe) se lisait comme une silhouette "
    "HUMANOÏDE, risquant une confusion directe avec l'ennemi \"standard\" (lui-même à 2 cercles) — "
    "corrigée avec un corps cylindrique à parois droites et des rayons d'énergie autour de l'orbe.",
])
story.append(Spacer(1, 6))
shot("06_panneau_amelioration.png", "Rendu V1 en jeu : chemin bordé, forteresse, tour \"rapide\" (arbalète) sélectionnée avec son rayon, ennemis \"grognard\" sur le chemin.")
story.append(PageBreak())

# --- 4. Tests ---
h1("4. Tests ajoutés/modifiés et résultats complets")
h2("4.1 Nouveaux tests")
bullets([
    "5 tests unitaires (<font face='Courier'>tests/pwaInstall.test.js</font>) : détection WebView Android "
    "réelle vs Chrome Android réel vs Safari iOS vs Chrome desktop ; construction du lien "
    "<font face='Courier'>intent://</font>.",
    "2 tests Playwright (<font face='Courier'>scripts/check-mobile.mjs</font>, tests 11 et 12) : bannière "
    "\"navigateur intégré\" affichée avec un vrai user-agent WebView Android simulé au niveau du contexte "
    "navigateur ; bouton d'installation natif affiché et déclenchant réellement <font face='Courier'>"
    "prompt()</font> quand un événement <font face='Courier'>beforeinstallprompt</font> est simulé.",
    "Extension du test PWA existant (Test 6) : présence du champ <font face='Courier'>id</font>, cohérence "
    "réelle de <font face='Courier'>start_url</font>/<font face='Courier'>scope</font> résolue comme le "
    "ferait un navigateur (pas seulement leur présence dans le JSON).",
])
h2("4.2 Résultats complets")
table([
    ["Suite", "Résultat"],
    ["Tests unitaires (node:test)", "53/53 passants"],
    ["Vérifications mobiles/PWA (Playwright)", "18/18 passantes"],
], [90*mm, 75*mm])
body("L'intégralité des tests V0 existants a été conservée et passe sans modification de leur logique "
     "(seuls les tests PWA/mobile ont été étendus, jamais affaiblis).")
hr()

# --- 5. Git/CI/déploiement ---
h1("5. Git, CI/déploiement — vérification réelle, pas supposée")
table([
    ["Étape", "Résultat vérifié"],
    ["Commit final", "8d3b9fbc68f239e540b1f1ab99a68d7c0c41b41f"],
    ["HEAD distant après push", "Vérifié via git ls-remote — identique au commit local"],
    ["Job CI \"build\"", "success (53 tests + 18 vérifications mobiles exécutés en CI)"],
    ["Job CI \"deploy\"", "success — log lu directement, pages_build_version = 8d3b9fbc68f239e540b1f1ab99a68d7c0c41b41f"],
    ["Build ID re-vérifié localement", "v0.1.0+8d3b9fb (rebuild avec GITHUB_SHA=HEAD réel)"],
    ["URL publique", "https://scuillerjack-oss.github.io/bastion-line-v0/"],
], [55*mm, 110*mm])
body("Conformément à l'exigence explicite du cahier (\"ne jamais déclarer le déploiement réussi sur la "
     "seule base d'une commande lancée ou d'un log partiel\"), chaque étape ci-dessus a été vérifiée par "
     "une source indépendante (API GitHub pour le HEAD distant et les jobs, log complet du job de "
     "déploiement pour le commit réellement servi, rebuild local pour le build ID).")
story.append(PageBreak())

# --- 6. Limites ---
h1("6. Limites restant à valider sur téléphone physique")
bullets([
    "<b>Installation PWA réelle</b> : la détection WebView/l'invite native/le lien intent:// sont vérifiés "
    "par tests automatisés (user-agent et événements simulés), jamais par une installation physique. Le "
    "cahier est explicite : ce n'est PAS suffisant pour déclarer cette exigence validée.",
    "<b>Lisibilité graphique en conditions réelles</b> : les captures d'écran et zooms ont été pris en "
    "navigateur headless desktop-simulé-mobile ; la lisibilité finale (contraste, taille perçue, luminosité "
    "d'un écran de téléphone en extérieur) reste à confirmer en main.",
    "<b>Performance réelle sur le téléphone du porteur</b> : le rendu a été conçu pour ne pas ajouter de "
    "coût par frame (précalcul terrain/chemin), mais aucune mesure de framerate sur l'appareil physique "
    "n'a été effectuée dans cette session.",
    "<b>Chemin \"Ouvrir dans Chrome\"</b> : le lien intent:// est un mécanisme standard Android, mais son "
    "comportement exact dépend du navigateur intégré précis utilisé par l'app hôte — à confirmer par le "
    "porteur dans son contexte réel.",
])
hr()

# --- 7. Conclusion ---
h1("7. Conclusion")
body("BASTION LINE V1 reprend strictement le moteur et la boucle de jeu V0 validés par la bêta physique "
     "précédente, sans extension de contenu ni rééquilibrage arbitraire. Les deux priorités du cahier ont "
     "été traitées : un diagnostic réel (pas une supposition) et une solution technique complète pour "
     "l'installabilité PWA, et une refonte graphique pragmatique entièrement en Canvas, elle-même "
     "auto-corrigée deux fois après capture d'écran avant tout commit.")
body("<b>Conformément à l'instruction explicite du cahier, BASTION LINE V1 n'est PAS déclarée validée par "
     "ce rapport.</b> Ce livrable est une candidate à la bêta physique V1. Seule une installation réelle "
     "et un lancement autonome confirmés par le porteur sur son téléphone physique permettront de "
     "considérer la priorité absolue comme atteinte ; seule sa propre lecture de l'écran de jeu permettra "
     "de juger si la refonte graphique répond réellement au besoin exprimé.")

doc = SimpleDocTemplate(OUT, pagesize=A4, topMargin=18*mm, bottomMargin=18*mm, leftMargin=20*mm, rightMargin=20*mm)
doc.build(story)
print("PDF généré:", OUT)
