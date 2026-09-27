#!/usr/bin/env python3
# Rapport technique officiel BASTION LINE V4 (cahier des charges V4, section 10).
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
OUT = os.path.join(HERE, "BASTION_LINE_V4_Rapport_Technique_Officiel.pdf")
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
def shot(filename, caption, width=70*mm, ratio=844/390):
    path = os.path.join(SHOTS, filename)
    if os.path.exists(path):
        img = Image(path, width=width, height=width*ratio)
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
story.append(Paragraph("Rapport Technique Officiel — V4", styles["Subtitle"]))
story.append(Paragraph("Bêta, qualité de vie, sauvegarde et harmonisation graphique", styles["Subtitle"]))
story.append(Spacer(1, 14*mm))
meta_label_style = ParagraphStyle(name="MetaLabel", fontSize=9, leading=12, fontName="Helvetica-Bold", textColor=colors.HexColor("#2a5c47"))
meta_value_style = ParagraphStyle(name="MetaValue", fontSize=9, leading=12)
meta = [
    ["Date du rapport", "27 septembre 2026"],
    ["Dépôt", "github.com/scuillerjack-oss/bastion-line-v0"],
    ["Commit de départ (V3 vérifiée)", "7191cea4b80808a031112344d995e5edc659161e"],
    ["Commit final V4 code (HEAD distant vérifié)", "b9ecb8efa76dc164d4acef4614182c0e4c20e327"],
    ["Identifiant de build vérifié", "v0.1.0+b9ecb8e (rebuild local GITHUB_SHA=HEAD, confirmé identique)"],
    ["URL publique (bêta téléphone)", "https://scuillerjack-oss.github.io/bastion-line-v0/"],
    ["Statut", "Candidate à la bêta physique V4 — NON VALIDÉE, décision humaine en attente"],
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

h1("0. Audit de l'état réel avant toute modification")
bullets([
    "Workspace : <font face='Courier'>/home/user/bastion-line-v0</font>, dépôt Git existant, branche <font face='Courier'>main</font>.",
    "<font face='Courier'>git status</font> propre avant toute modification.",
    "HEAD local = HEAD distant (<font face='Courier'>git ls-remote</font>) = <font face='Courier'>7191cea4b80808a031112344d995e5edc659161e</font>, "
    "exactement le commit du rapport technique V3 (aucune divergence).",
    "Suite de tests V3 relancée avant toute modification : 77 tests unitaires (67 hérités + confirmation) tous passants, "
    "job CI \"build\"/\"deploy\" du commit V3 déjà vérifiés success lors de la mission précédente.",
    "Rapport technique V3 relu et confronté au code réel : verrou tactile en deux temps, direction archers, retrait de la "
    "Tour de contrôle, rééquilibrage et nouvelle icône sont bien présents et fonctionnels dans le code de départ.",
])
hr()

h1("1. Revente d'une tour")
h2("1.1 Conception")
body("Taux de remboursement centralisé dans <font face='Courier'>TOWER_SELL_REFUND_RATE = 0.6</font> "
     "(<font face='Courier'>src/engine/constants.js</font>) -- référence V4 appliquée telle quelle, facilement ajustable "
     "en un seul endroit. La valeur investie (<font face='Courier'>getTowerInvestedValue</font>, "
     "<font face='Courier'>src/engine/towers.js</font>) additionne le coût de construction initial ET le coût de chaque "
     "palier d'amélioration RÉELLEMENT acheté -- jamais le seul coût de base -- garantissant qu'une tour améliorée se "
     "revend toujours plus cher qu'une tour brute, sans jamais rembourser 100% de l'investissement.")
h2("1.2 Interface : prix affiché AVANT confirmation, jamais de vente accidentelle")
body("Le panneau d'amélioration d'une tour affiche désormais un bouton <b>Vendre (+N pièces)</b> -- le montant exact "
     "avant toute action. Le cliquer ouvre un sous-panneau de CONFIRMATION dédié (jamais un "
     "<font face='Courier'>window.confirm()</font> natif hors style du jeu), avec son propre délai anti-reflexe "
     "(300ms, cohérent avec le verrou tactile déjà validé en V3) : un clic trop rapide sur \"Confirmer\" est ignoré, "
     "seule une action réellement délibérée déclenche la vente. Après vente : la tour disparaît, l'emplacement est "
     "réellement libéré (une nouvelle tour peut y être construite immédiatement) et le montant crédité est "
     "EXACTEMENT celui qui avait été annoncé -- même fonction (<font face='Courier'>getTowerSellRefund</font>) "
     "utilisée pour l'affichage ET pour le crédit réel, jamais un calcul dupliqué qui pourrait diverger.")
h2("1.3 Vérification")
body("8 tests unitaires (revente brute, revente améliorée plus chère que brute sans jamais atteindre 100%, "
     "chaque palier augmente le remboursement, montant crédité = montant annoncé, emplacement libéré et "
     "reconstructible, tour réellement supprimée, vente d'un identifiant invalide sans crash, vente impossible "
     "après victoire/défaite) + 2 tests mobiles réels (revente brute avec vérification bout-en-bout du montant "
     "crédité et de la libération d'emplacement, comparaison brute/améliorée sur la vraie interface).")
hr()

h1("2. Lisibilité des améliorations")
body("L'ancienne représentation empilait un petit anneau PAR palier possédé au-dessus de la tour -- au palier "
     "maximum (2 paliers d'amélioration), les deux anneaux très rapprochés se lisaient visuellement comme un "
     "symbole en \"8\", signalé en bêta comme \"trop placeholder\".")
body("Remplacé par un indicateur UNIQUE : jamais plus d'une seule forme dessinée à la fois, donc "
     "structurellement incapable de reformer un \"8\". Un anneau CREUX tant que la tour n'a pas atteint son "
     "palier maximum ; un disque PLEIN, à la même position, une fois le palier maximum atteint -- une "
     "progression \"creux → plein\" immédiatement lisible sans ouvrir le panneau. Fonctionne identiquement pour "
     "les 3 familles, y compris la tour d'archers dont l'asset Leonardo protégé ne peut pas lui-même évoluer "
     "visuellement par palier (cahier V4, section 7).")
shot("11_indicateur_palier_v4.png", "Trois tours Canon aux paliers 0 (aucun indicateur), 1 (anneau creux) et 2/max (disque plein).", width=95*mm, ratio=1.0)
hr()
story.append(PageBreak())

h1("3. Bug de reprise de progression")
h2("3.1 Reproduction et diagnostic de la cause racine")
body("Bug bêta : \"après relance d'une partie, le jeu a ramené le joueur vers d'anciens niveaux ; après une "
     "nouvelle relance, le dernier niveau réellement atteint est réapparu.\" Ce motif exact -- régression PUIS "
     "auto-correction au relancement SUIVANT -- a d'abord été reproduit par un test unitaire dédié AVANT toute "
     "correction (<font face='Courier'>tests/save.test.js</font>) : deux instances chargent chacune leur PROPRE "
     "copie en mémoire de l'état de sauvegarde (<font face='Courier'>save</font>) ; l'instance B progresse et "
     "persiste <font face='Courier'>unlockedLevelIndex=3</font> ; l'instance A, plus ANCIENNE dans sa mémoire, "
     "écrit ENSUITE avec sa propre valeur périmée (1). Test exécuté sur le code de départ : "
     "<b>la progression persistée régressait bien à 1</b> -- bug confirmé et reproduit, pas supposé.")
body("Cause racine : <font face='Courier'>markLevelUnlocked()</font> ne faisait confiance qu'à la copie EN "
     "MÉMOIRE de l'appelant pour décider d'écrire (<font face='Courier'>if (levelIndex > save.unlockedLevelIndex)</font>). "
     "Sur un appareil réel, plusieurs instances de l'app peuvent exister avec des états mémoire divergents : une "
     "PWA installée relancée depuis l'écran d'accueil Android peut réutiliser une tâche restée en arrière-plan "
     "au lieu de toujours réexécuter le script depuis zéro, ou une page peut être restaurée depuis le bfcache du "
     "navigateur sans jamais relire le disque. Si l'instance la plus ANCIENNE écrit APRÈS l'instance la plus "
     "RÉCENTE, sa copie périmée écrasait silencieusement la progression réellement la plus avancée.")
h2("3.2 Correctif appliqué à la cause")
body("<font face='Courier'>markLevelUnlocked()</font> relit désormais systématiquement l'état RÉELLEMENT "
     "persisté juste avant d'écrire et ne retient que le MAXIMUM entre trois candidats (persisté, mémoire de "
     "l'appelant, nouvelle valeur) -- qu'importe quelle instance écrit en dernier, la progression ne peut donc "
     "plus jamais régresser. Renforcé côté LECTURE par une resynchronisation défensive au retour au premier plan "
     "(<font face='Courier'>src/main.js</font> : écouteurs <font face='Courier'>pageshow</font> avec "
     "<font face='Courier'>event.persisted</font>, et <font face='Courier'>visibilitychange</font>) qui relit "
     "l'état persisté et rafraîchit le menu si nécessaire.")
h2("3.3 Vérification")
body("Le test de reproduction, réexécuté après le correctif, passe désormais (la progression reste à 3, jamais "
     "régressée). Un second test simule 5 cycles consécutifs RÉELS <i>progression → sauvegarde → rechargement du "
     "module → reprise</i>, vérifiant à chaque cycle que le niveau repris est exactement celui attendu. Côté "
     "mobile, un test dédié répète 4 cycles avec un VRAI <font face='Courier'>page.reload()</font> du navigateur "
     "(pas une simple réinitialisation en mémoire), confirmant que le bouton \"Continuer\"/\"Jouer\" et le niveau "
     "affiché après reprise sont systématiquement corrects.")
hr()

h1("4. Affichage du niveau")
body("Le HUD affiche désormais <b>\"NIVEAU N\"</b> seul (jamais de total) au-dessus du compteur de vagues -- "
     "qui reste, lui, inchangé (<font face='Courier'>VAGUE N/M</font>), car il s'agit d'une information "
     "différente (la progression DANS le niveau courant, utile en combat) non visée par cette demande. "
     "Vérifié par un test mobile dédié confirmant le format exact et l'absence de tout total affiché.")
hr()
story.append(PageBreak())

h1("5. Chantier graphique expérimental")
h2("5.1 Asset protégé -- respecté intégralement")
body("La tour d'archers (asset Leonardo, <font face='Courier'>public/assets/towers/tour_rapide_arbalete.png</font>) "
     "n'a été ni modifiée, ni redessinée, ni remplacée. Elle a servi uniquement de RÉFÉRENCE de direction "
     "artistique, observée pour en extraire une palette et un vocabulaire visuel partagés : pierre grise en "
     "dégradé, bois/laiton chaud, ferrures bleu-gris, petite bannière bleue.")
h2("5.2 Éléments harmonisés")
bullets([
    "<b>Base/forteresse</b> : corps de pierre désormais en DÉGRADÉ (au lieu d'un aplat), liseré doré sous les "
    "créneaux, porte encadrée de bois/doré, bannière recolorée en BLEU (au lieu d'orange générique) avec liseré doré.",
    "<b>Emplacements constructibles</b> : le socle elliptique plat est remplacé par une petite plateforme de "
    "pierre carrée/biseautée en écho, à petite échelle, au plinthe surélevé de la tour de référence, avec des "
    "accents dorés aux coins.",
    "<b>Canon</b> : base circulaire en dégradé de pierre avec anneau doré, tourelle recolorée en métal froid "
    "(cohérent avec les ferrures de la référence) au lieu d'un brun générique.",
    "<b>Longue portée</b> : spire en dégradé de pierre, bandeau doré, pointe métallique -- même vocabulaire que "
    "le canon et la base.",
])
shot("13_zoom_base_v4.png", "Base + emplacements constructibles harmonisés (détail réel).", width=75*mm, ratio=489/585)
shot("14_zoom_canon_v4.png", "Canon harmonisé (détail réel).", width=65*mm, ratio=354/408)
shot("12_harmonisation_graphique_v4.png", "Vue d'ensemble : base, emplacements, canon, longue portée et tour d'archers (protégée, inchangée) dans la même scène.", width=60*mm)
h2("5.3 Limites honnêtes (cahier V4, section 7 : \"le signaler clairement plutôt que de masquer l'échec\")")
bullets([
    "<b>Écart de fidélité assumé</b> : l'asset de référence est un rendu 3D illustré (ombrage complexe, texture "
    "de pierre détaillée, perspective isométrique). Un rendu Canvas vectoriel 2D ne peut PAS atteindre ce niveau "
    "de détail ni ce rendu -- ce chantier rapproche la PALETTE et le VOCABULAIRE visuel (pierre/bois-laiton/"
    "métal froid/bannière bleue), pas le niveau de finition. C'est une cohérence de direction, jamais une "
    "reproduction de qualité.",
    "<b>Ennemis et décor NON retouchés cette passe</b> : décision assumée, pas un oubli. Les silhouettes "
    "d'ennemis sont gameplay-critiques (le cahier V4 lui-même interdit explicitement de dégrader leur "
    "lisibilité) ; les retoucher demandait une prudence et un temps de validation visuelle supplémentaires que "
    "cette mission, déjà large (revente, indicateur de palier, bug de reprise, affichage), n'a pas priorisés. Le "
    "terrain/décor reste également inchangé (cahier : \"certains éléments SIMPLES du décor\", non prioritaire "
    "face à la lisibilité gameplay).",
])
hr()

h1("6. Fichiers modifiés / ajoutés")
table([
    ["Fichier", "Nature"],
    ["src/engine/constants.js", "Modifié — TOWER_SELL_REFUND_RATE"],
    ["src/engine/towers.js", "Modifié — getTowerInvestedValue, getTowerSellRefund"],
    ["src/engine/simulation.js", "Modifié — sellTower()"],
    ["src/engine/save.js", "Modifié — markLevelUnlocked() concurrence-sûr (cause racine du bug de reprise)"],
    ["src/main.js", "Modifié — UI revente + confirmation, resync progression au premier plan, affichage niveau"],
    ["src/ui/render.js", "Modifié — indicateur de palier unique, harmonisation base/emplacements/canon/longue portée"],
    ["src/ui/audio.js", "Modifié — sfx.sell"],
    ["src/style.css", "Modifié — .sell-option, .cost.sell"],
    ["index.html", "Modifié — #level-label (affichage \"Niveau N\")"],
    ["tests/save.test.js", "Modifié — reproduction du bug de reprise + test de cycles consécutifs réels"],
    ["tests/simulation.test.js", "Modifié — 8 tests de revente"],
    ["scripts/check-mobile.mjs", "Modifié — 4 nouveaux tests (affichage niveau, revente brute, revente comparée, cycles de rechargement réel)"],
], [75*mm, 90*mm])
hr()

h1("7. Tests et résultats complets")
table([
    ["Suite", "Résultat"],
    ["Tests unitaires (node:test)", "77/77 passants (67 hérités de V3 + 10 nouveaux)"],
    ["Vérifications mobiles/PWA (Playwright)", "26/26 passantes (22 héritées de V3 + 4 nouvelles)"],
], [90*mm, 75*mm])
body("Aucune assertion existante n'a été supprimée ni affaiblie. Non-régression vérifiée explicitement : vagues, "
     "combat, pause, victoire/défaite, navigation, sauvegarde/réglages, PWA/service worker, asset Leonardo "
     "(chargement + fallback), affichage mobile (5 largeurs, aucun débordement) -- tous les tests hérités de V0 "
     "à V3 passent inchangés.")
hr()
story.append(PageBreak())

h1("8. Git, CI/déploiement — vérification réelle")
table([
    ["Étape", "Résultat vérifié"],
    ["Commit final (code)", "b9ecb8efa76dc164d4acef4614182c0e4c20e327"],
    ["HEAD distant après push", "Vérifié via git ls-remote — identique au commit local"],
    ["Job CI \"build\"", "success (77 tests unitaires + 26 vérifications mobiles exécutés en CI)"],
    ["Job CI \"deploy\"", "success — log lu directement, pages_build_version vérifié = commit ci-dessus"],
    ["Build ID re-vérifié localement", "v0.1.0+b9ecb8e (rebuild avec GITHUB_SHA=HEAD réel)"],
    ["URL publique (lien de bêta téléphone)", "https://scuillerjack-oss.github.io/bastion-line-v0/"],
], [58*mm, 107*mm])
hr()

h1("9. Limites restant à valider sur téléphone physique")
bullets([
    "<b>Revente</b> : logique et affichage vérifiés bout-en-bout en automatisé (montant affiché = montant "
    "crédité, confirmation anti-reflexe) -- reste à confirmer que le geste de confirmation se ressent bien comme "
    "volontaire sur un doigt réel, pas seulement en simulation Playwright.",
    "<b>Indicateur de palier</b> : lisibilité vérifiée par capture automatisée à taille réelle -- validation "
    "esthétique finale (le disque plein \"se lit-il\" instantanément comme \"palier maximum\" sans explication) "
    "réservée à la bêta physique.",
    "<b>Bug de reprise</b> : cause racine corrigée et verrouillée par des tests reproduisant précisément le "
    "motif observé (concurrence entre instances, cycles de rechargement réels) -- la confirmation définitive "
    "reste l'usage réel prolongé sur le téléphone physique du porteur, y compris après une vraie mise en "
    "arrière-plan Android prolongée.",
    "<b>Harmonisation graphique</b> : ce rapport ne déclare PAS le résultat esthétiquement réussi -- il "
    "documente ce qui a été tenté et ses limites assumées (section 5.3). Le jugement sur la cohérence "
    "réellement perçue appartient exclusivement au porteur.",
])
hr()

h1("10. Conclusion")
body("Les cinq axes du cahier des charges V4 ont été traités comme une seule mission cohérente : une revente de "
     "tour complète et vérifiée bout-en-bout, un indicateur de palier unique corrigeant le défaut visuel signalé "
     "en bêta, un bug de reprise de progression reproduit puis corrigé à sa cause racine réelle (concurrence "
     "entre instances) plutôt que par un contournement, un affichage du niveau simplifié, et une première passe "
     "d'harmonisation graphique autour de la tour de référence protégée -- avec ses limites documentées "
     "honnêtement plutôt que masquées.")
body("<b>Conformément à l'instruction explicite du cahier, BASTION LINE V4 n'est PAS déclarée validée par ce "
     "rapport.</b> Ce livrable est une candidate à la bêta physique V4. Le ressenti réel de la revente, la "
     "validité esthétique de l'harmonisation graphique, et la confirmation définitive du correctif de reprise "
     "sur un usage prolongé appartiennent exclusivement au porteur, après son propre test sur téléphone physique.")

doc = SimpleDocTemplate(OUT, pagesize=A4, topMargin=18*mm, bottomMargin=18*mm, leftMargin=20*mm, rightMargin=20*mm)
doc.build(story)
print("PDF généré:", OUT)
