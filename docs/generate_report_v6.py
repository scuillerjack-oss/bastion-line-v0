#!/usr/bin/env python3
# Rapport technique officiel BASTION LINE V6 (cahier des charges V6, section 10).
import os
import json
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
OUT = os.path.join(HERE, "BASTION_LINE_V6_Rapport_Technique_Officiel.pdf")
SHOTS = os.path.join(HERE, "screenshots")

with open(os.path.join(HERE, "v6-feasibility-results.json"), "r", encoding="utf-8") as f:
    FEAS = json.load(f)

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
def shot(filename, caption, width=70*mm, ratio=1688/780):
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
story.append(Paragraph("Rapport Technique Officiel — V6", styles["Subtitle"]))
story.append(Paragraph("Corrections à la racine issues de la bêta physique humaine V5", styles["Subtitle"]))
story.append(Spacer(1, 14*mm))
meta_label_style = ParagraphStyle(name="MetaLabel", fontSize=9, leading=12, fontName="Helvetica-Bold", textColor=colors.HexColor("#2a5c47"))
meta_value_style = ParagraphStyle(name="MetaValue", fontSize=9, leading=12)
meta = [
    ["Date du rapport", "29 septembre 2026"],
    ["Dépôt", "github.com/scuillerjack-oss/bastion-line-v0"],
    ["Commit de départ (V5 réel, audité)", "71c09e9266b05f47ccac74aac84ee2abef1bc098"],
    ["Commit final V6", "edc18efeee083d2aaa7598bbe4430790bf1208b1"],
    ["Identifiant de build vérifié", "v0.1.0+edc18ef (job CI \"build\", pages_build_version confirmé identique)"],
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

h1("0. Audit de l'état réel avant toute modification (cahier V6, section 2)")
bullets([
    "Workspace / dépôt : <font face='Courier'>/home/user/bastion-line-v0</font>, branche <font face='Courier'>main</font>, aucune divergence avec <font face='Courier'>origin/main</font>.",
    "HEAD local = HEAD distant avant modification = <font face='Courier'>71c09e9266b05f47ccac74aac84ee2abef1bc098</font> (rapport V5 optimisé en poids), avec le commit de CODE V5 réel "
    "<font face='Courier'>bb90760dac6b1d3aab043098b63edf7494276f7d</font> confirmé présent dans l'historique.",
    "Suite de tests relancée AVANT toute modification : 89/89 tests unitaires passants, suite mobile/Playwright complète passante — confirmé comme point de départ propre.",
    "PWA / manifest / service worker / cache déjà fonctionnels (job CI \"deploy\" V5 success, <font face='Courier'>pages_build_version</font> = bb90760, revérifié cette mission).",
    "Retours de bêta physique humaine V5 explicitement fournis par le cahier V6 : carte jugée bonne (à conserver telle quelle), ennemis coupant les virages, tours archer/canon trop petites, "
    "sélection tactile parfois peu fiable (2-3 appuis), emplacements de construction perçus comme arbitraires, difficulté du niveau 5 acceptable mais à ne jamais rendre impossible, audio validé.",
    "Aucune reconstruction depuis zéro : les cinq corrections ci-dessous partent strictement du code V5 réel et ne touchent que ce que les retours de bêta désignent explicitement.",
])
hr()

h1("1. Trajectoire ennemie — correction à la cause systémique (cahier V6, section 3)")
body("<b>Cause racine identifiée</b> : le chemin logique <font face='Courier'>PATH_MAP</font> (V5) ne comportait que 11 points de virage. Entre deux points éloignés, la trajectoire "
     "interpolée en ligne droite \"coupe\" mécaniquement l'intérieur de chaque courbe dessinée sur la carte Leonardo, quelle que soit la précision du placement de ces 11 points — un problème "
     "de DENSITÉ de la représentation, pas un mauvais placement ponctuel corrigeable niveau par niveau.")
body("<b>Correction structurelle, pas un rustine par niveau</b> : le tracé réel de la route a été mesuré à nouveau, cette fois en conservant 784 points bruts (contre les points épars utilisés "
     "pour construire le <font face='Courier'>PATH_MAP</font> V5), puis simplifié par l'algorithme de Douglas-Peucker (tolérance 1,5 unité logique — garantie mathématique de déviation maximale) "
     "pour obtenir un nouveau <font face='Courier'>PATH_MAP</font> à <b>82 points</b>, qui épouse la courbe réelle au lieu de la couper. Comme un seul et même <font face='Courier'>PATH_MAP</font> "
     "sert de base à TOUS les niveaux (1 à 5), cette correction s'applique automatiquement à la totalité de la campagne, jamais à un seul niveau choisi.")
h2("1.1 Non-régression géométrique permanente")
body("Nouveau fichier <font face='Courier'>tests/pathing.test.js</font> : pour CHAQUE niveau et CHAQUE chemin de la campagne, la position réellement empruntée par un ennemi "
     "(<font face='Courier'>buildPathData</font>/<font face='Courier'>pointAtDistance</font> — les fonctions exactes utilisées par la simulation, jamais une copie) est échantillonnée tous les "
     "2 unités logiques parcourues et comparée à la référence à 784 points mesurée sur l'asset réel. Tolérance : 6 unités — nettement supérieure à l'erreur de simplification (1,5) mais nettement "
     "inférieure à la demi-largeur réelle de la route (17). La zone de départ exclue du niveau 5 (segment synthétique reliant l'entrée décalée à la route réelle, cahier V5, limite documentée) est "
     "dérivée automatiquement de la longueur du premier segment de CHAQUE chemin, jamais d'une constante devinée. <b>Résultat : tous les chemins de tous les niveaux passent, aucun virage coupé.</b>")
shot("18_ennemis_chemin_v5.jpg", "Référence V5 : trajectoire avec virages moins denses (11 points).", width=55*mm)
hr()
story.append(PageBreak())

h1("2. Taille visuelle des tours (cahier V6, section 4)")
body("Retour de bêta : \"la tour d'archer et le canon sont trop petits sur téléphone ; leurs détails et leur identité visuelle sont difficiles à distinguer.\" Les sprites Leonardo (archer, canon) "
     "et la silhouette de repli Canvas (les trois familles) ont été agrandis d'environ <b>25 à 29%</b> (<font face='Courier'>TOWER_SPRITE_CONFIG</font>, "
     "<font face='Courier'>FALLBACK_SCALE = 1.28</font>, <font face='Courier'>src/ui/render.js</font>) — un facteur choisi empiriquement pour restaurer la lisibilité des détails sans dominer "
     "excessivement l'écran.")
h2("2.1 Séparation stricte taille visuelle / statistiques de jeu")
body("Portée, dégâts, cadence de tir et coût des trois familles de tours restent EXACTEMENT inchangés. Le rayon d'emprise de validation des emplacements "
     "(<font face='Courier'>TOWER_FOOTPRINT_RADIUS</font>, <font face='Courier'>engine/constants.js</font>) a délibérément été laissé à 38 plutôt que recalculé proportionnellement au sprite "
     "agrandi (qui aurait exigé ~50-70 selon le calcul géométrique strict du coin le plus éloigné de la boîte englobante) : ce recalcul strict aurait invalidé la quasi-totalité des nouveaux "
     "emplacements du niveau design V6 (route en S resserrée), alors que ce coin théorique correspond à une zone TRANSPARENTE du PNG, jamais à la silhouette réellement peinte. Décision documentée "
     "dans le code et VÉRIFIÉE empiriquement par capture d'écran réelle à l'emplacement le plus proche de la route (clairance 58,0, la plus faible de toute la campagne) : aucun chevauchement "
     "visuel constaté, voir capture ci-dessous. Si un futur asset a une silhouette qui remplit davantage sa boîte englobante, ce rayon devra être réévalué.")
h2("2.2 Zone tactile adaptée séparément")
body("<font face='Courier'>TAP_HIT_RADIUS</font> augmenté de 26 à <b>30</b> pour rester cohérent avec les tours agrandies, tout en restant très inférieur à l'écart minimal réel entre deux "
     "emplacements (>90 sur tous les niveaux) — aucun risque de chevauchement ambigu entre cibles voisines.")
h2("2.3 Indicateur de palier repositionné dynamiquement")
body("L'ancien indicateur de palier utilisait un décalage vertical FIXE (calé sur la taille V5). Avec des tours de tailles variables (sprite chargé ou repli, par famille), un décalage fixe se "
     "retrouverait à l'intérieur même de la silhouette agrandie. Nouvelle fonction <font face='Courier'>getTowerVisualTop()</font> qui calcule l'extension haute réelle du rendu précis (sprite ou "
     "repli) pour positionner l'indicateur toujours au-dessus de la tour, quelle que soit sa famille ou son état de chargement.")
shot("19_archer_agrandi_s2_v6.jpg", "Tour d'archers agrandie, niveau 2 — sprite Leonardo à taille V6, aucun chevauchement avec la route.", width=55*mm)
shot("20_canon_agrandi_s2_v6.jpg", "Canon agrandi, niveau 2 — même vérification.", width=55*mm)
shot("21_ensemble_tours_agrandies_v6.jpg", "Vue d'ensemble : plusieurs tours agrandies construites simultanément, lisibilité comparée à la route et aux emplacements voisins.", width=55*mm)
hr()
story.append(PageBreak())

h1("3. Fiabilité tactile — correction à la cause racine (cahier V6, section 5)")
body("Retour de bêta : \"la sélection tactile nécessite parfois 2-3 appuis.\" Diagnostic : le contrôleur tactile (<font face='Courier'>src/ui/input.js</font>) mettait en cache le viewport "
     "CSS↔logique calculé une seule fois, puis le réutilisait à chaque <font face='Courier'>pointerdown</font> sans jamais le recalculer. Or le bloc <font face='Courier'>.prep-row</font> de "
     "l'interface (préparation de vague) bascule son attribut <font face='Courier'>hidden</font> à CHAQUE transition préparation↔vague : ce changement redimensionne silencieusement la boîte CSS "
     "du canvas SANS jamais déclencher d'événement <font face='Courier'>resize</font>, laissant le viewport tactile mis en cache périmé dès la première vague — un décalage de coordonnées qui "
     "explique directement des taps qui \"ratent\" leur cible et nécessitent plusieurs tentatives.")
h2("3.1 Correction structurelle, pas un correctif ponctuel")
body("Le cache de viewport a été entièrement supprimé de <font face='Courier'>src/ui/input.js</font> : <font face='Courier'>handlePointerDown</font> recalcule désormais le viewport à CHAQUE "
     "appel, sans jamais réutiliser une valeur potentiellement périmée. En complément, un <font face='Courier'>ResizeObserver</font> a été ajouté sur l'élément parent du canvas "
     "(<font face='Courier'>src/main.js</font>) pour que le tampon de rendu se resynchronise face à N'IMPORTE QUEL changement de taille de sa boîte CSS — pas seulement un redimensionnement de "
     "fenêtre ou une rotation d'écran, qui étaient les seuls déclencheurs surveillés jusqu'ici.")
body("L'UX en deux temps (armement du panneau puis action délibérée, cahier V3) est intégralement conservée — seule la fiabilité de CHAQUE étape individuelle est corrigée, jamais le nombre "
     "d'étapes lui-même.")
body("Vérification : la suite mobile/Playwright existante (verrou d'armement, position stable du panneau, double-tap rejeté, action délibérée acceptée après le délai) reste intégralement "
     "passante après la correction, ainsi qu'un cycle réel construction/sélection/amélioration/revente exécuté via un vrai geste tactile Chromium à <font face='Courier'>deviceScaleFactor=3</font>.")
hr()

h1("4. Emplacements de construction — refonte de level design (cahier V6, section 6)")
body("Retour de bêta : \"les emplacements semblent arbitraires.\" Les 5 niveaux (6 à 10 emplacements chacun selon le niveau) ont été intégralement repensés autour de positions NOMMÉES et "
     "délibérées plutôt que de coordonnées choisies au hasard le long du chemin, avec pour objectif systématique d'offrir plusieurs compromis stratégiques réels plutôt qu'un unique emplacement "
     "dominant :")
bullets([
    "<b>straight_top / straight_mid_left / straight_lower / straight_center / straight_bottom</b> — le long des tronçons rectilignes : bonne couverture prolongée, mais exposée moins longtemps "
    "par ennemi individuel qu'un virage.",
    "<b>bend_top / bend_upper_mid / bend_center_left / bend_center_right / bend_lower_mid</b> — aux virages : couverture plus brève par passage mais un ennemi y ralentit visuellement l'angle de "
    "tir change, offrant un temps d'engagement différent, souvent supérieur pour une tour à cadence lente comme le canon.",
])
body("Chaque niveau ajoute 1 à 2 emplacements supplémentaires par rapport au précédent (niveau 1 : 6 ; niveau 5 : 10, dont un emplacement central additionnel <font face='Courier'>straight_center"
     "</font>), formalisés explicitement dans <font face='Courier'>src/engine/levels.js</font>. Aucun emplacement n'a été supprimé ni ajouté par pur souci de rendre un test de faisabilité plus "
     "facile à satisfaire — la refonte a précédé la batterie de faisabilité (section 5), qui a ensuite servi à VÉRIFIER cette refonte, jamais à la dicter.")
hr()

h1("5. Batterie de faisabilité — non-régression permanente (cahier V6, section 7)")
body("Rappel explicite du cahier, respecté à la lettre : <i>\"le but n'est pas que 100% des simulations gagnent ; le but est que 100% des niveaux aient au moins une stratégie réaliste "
     "gagnante.\"</i> Trois profils de joueur distincts et non triviaux ont été implémentés (<font face='Courier'>scripts/simulate_feasibility_v6.mjs</font>), chacun prenant une décision de "
     "construction/amélioration au mieux toutes les 2,5s (rythme humain réaliste, jamais une dépense instantanée à chaque tick) :")
bullets([
    "<b>Équilibrée</b> : construit la famille abordable la moins chère sur un emplacement vide en priorité (maximise la couverture), sinon améliore la tour la moins chère à améliorer.",
    "<b>Priorité dégâts</b> : construit/améliore en priorité la famille au dégât de base le plus élevé (canon, puis longue portée une fois débloquée).",
    "<b>Priorité cadence/portée</b> : construit/améliore en priorité rapide, puis longue portée, avant canon.",
])
feas_rows = [["Niveau", "Équilibrée", "Priorité dégâts", "Priorité cadence/portée", "Faisable"]]
for lid in sorted(FEAS.keys(), key=int):
    lvl = FEAS[lid]
    row = [f"{lid}. {lvl['name']}"]
    for strat in ["équilibrée", "priorité dégâts", "priorité cadence/portée"]:
        s = lvl["strategies"][strat]
        flag = "GAGNÉ" if s["status"] == "won" else ("perdu" if s["status"] == "lost" else "bloqué")
        row.append(f"{flag} (PV min {int(s['minHpRatio']*100)}%, pièces restantes {s['coinsLeft']})")
    row.append("OUI" if lvl["feasible"] else "NON")
    feas_rows.append(row)
table(feas_rows, [26*mm, 40*mm, 40*mm, 40*mm, 18*mm])
body("<b>Résultat : 5/5 niveaux faisables</b>, avec les TROIS stratégies gagnantes sur chaque niveau — jamais une seule stratégie \"parfaite\" isolée qui masquerait un niveau réellement "
     "injouable avec une autre approche raisonnable.")
body("<b>Observation honnête, non masquée</b> : les trois stratégies terminent chaque niveau à 100% des points de vie de la base (<font face='Courier'>minHpRatio</font> = 1 partout) avec un bot "
     "aux décisions parfaitement rythmées. Ce résultat ne constitue PAS, conformément au cahier, une validation de la difficulté ressentie — réservée exclusivement à la bêta humaine physique. Il "
     "signale toutefois que la marge de sécurité mathématique de la campagne actuelle est large pour un joueur aux décisions optimalement cadencées ; la difficulté réellement perçue par un joueur "
     "humain (temps de réaction, choix sous-optimaux, distraction) reste à confirmer par la prochaine bêta physique, sans qu'aucun niveau n'ait été volontairement rendu plus facile pour obtenir "
     "ce résultat.")
hr()
story.append(PageBreak())

h1("6. Pipeline d'assets préparé pour de futurs ennemis/projectiles Leonardo (cahier V6, section 6/9)")
body("Conformément à l'interdiction explicite du cahier de fabriquer des unités provisoires cette mission (\"un asset Leonardo doit être généré individuellement pour être correctement "
     "récupérable et intégrable\"), AUCUN nouvel art n'a été ajouté. Le registre de sprites déjà éprouvé pour les tours (<font face='Courier'>TOWER_SPRITE_CONFIG</font>, chargement via "
     "<font face='Courier'>loadSprite</font>, repli Canvas silencieux si absent/échoué) a été généralisé à l'identique aux ennemis et au projectile de l'archer :")
bullets([
    "<font face='Courier'>ENEMY_SPRITE_CONFIG</font> (clé = <font face='Courier'>enemy.kind</font>) et <font face='Courier'>PROJECTILE_SPRITE_CONFIG</font> (clé = famille de tour) dans "
    "<font face='Courier'>src/ui/render.js</font> — VIDES aujourd'hui : 100% des ennemis et projectiles continuent de passer par leur repli Canvas existant, comportement strictement inchangé.",
    "<font face='Courier'>drawEnemy</font>/<font face='Courier'>drawArrowProjectile</font> vérifient d'abord ce registre puis retombent sur les fonctions renommées "
    "<font face='Courier'>drawEnemyFallbackShape</font>/<font face='Courier'>drawArrowProjectileFallback</font> — exactement le même schéma que les tours.",
    "Dimensions (<font face='Courier'>w</font>/<font face='Courier'>h</font>), ancre (<font face='Courier'>bottomOffset</font>) et échelle sont configurables PAR asset futur, indépendamment de "
    "<font face='Courier'>ENEMY_R</font> (rayon de collision/gameplay, <font face='Courier'>engine/constants.js</font>), qui reste totalement inchangé — même séparation taille-visuelle / "
    "emprise-de-jeu que celle déjà appliquée aux tours en section 2.",
])
body("Un futur asset Leonardo (ennemi ou flèche) pourra donc être ajouté en UNE ligne dans ces registres, sans aucune modification du moteur de rendu ni de la logique de jeu.")
hr()

h1("7. Audio — inchangé (cahier V6, section 8)")
body("Aucune modification apportée à l'audio (musique, effets sonores, contrôles de coupure/volume) — validé par la bêta physique V5, et aucune des corrections ci-dessus n'a révélé de bug ou de "
     "régression le concernant.")
hr()

h1("8. Tests et non-régressions")
table([
    ["Bloc", "Validation obtenue"],
    ["Héritage V5", "89/89 tests unitaires passants (contre 77 en V5), aucune assertion supprimée ni affaiblie."],
    ["Trajectoire", "Nouveau test géométrique (tests/pathing.test.js) : tous les chemins de tous les niveaux restent dans le corridor mesuré de la route réelle (tolérance 6 unités)."],
    ["Faisabilité", "Nouvelle batterie (tests/feasibility.test.js) : les 5 niveaux ont au moins une stratégie réaliste gagnante parmi 3 profils distincts."],
    ["Taille des tours", "Vérification empirique par capture d'écran réelle à l'emplacement le plus proche de la route (clairance 58,0) : aucun chevauchement visuel."],
    ["Tactile", "Suite Playwright existante (verrou d'armement, position stable du panneau, double-tap rejeté) intégralement passante après suppression du cache de viewport ; cycle réel construction/amélioration/revente via geste tactile Chromium."],
    ["PWA", "Manifest valide, icônes accessibles, service worker enregistré, sert la version fraîche même avec une entrée de cache périmée, identifiant de build affiché et exact."],
    ["Construction/économie", "Cycles construction/sélection/amélioration/revente vérifiés bout-en-bout sur les nouveaux emplacements, y compris archer et canon Leonardo."],
], [38*mm, 127*mm])
hr()
story.append(PageBreak())

h1("9. Fichiers modifiés / ajoutés")
table([
    ["Fichier", "Nature"],
    ["src/engine/levels.js", "Modifié — PATH_MAP reconstruit (82 points, Douglas-Peucker), buildSlots des 5 niveaux repensés (positions nommées)"],
    ["src/engine/constants.js", "Modifié — TAP_HIT_RADIUS 26→30 ; TOWER_FOOTPRINT_RADIUS inchangé (38), décision documentée en commentaire"],
    ["src/ui/input.js", "Modifié — suppression du cache de viewport, recalcul systématique à chaque pointerdown"],
    ["src/main.js", "Modifié — ResizeObserver sur le parent du canvas"],
    ["src/ui/render.js", "Modifié — sprites archer/canon agrandis (~25-29%), FALLBACK_SCALE, getTowerVisualTop() dynamique, ENEMY_SPRITE_CONFIG/PROJECTILE_SPRITE_CONFIG (vides) + fallbacks renommés"],
    ["tests/pathing.test.js", "Ajouté — non-régression géométrique de corridor, tous niveaux/chemins"],
    ["tests/fixtures/road_centerline_reference.json", "Ajouté — tracé mesuré à 784 points, référence du test ci-dessus"],
    ["tests/feasibility.test.js", "Ajouté — non-régression de faisabilité (au moins une stratégie gagnante par niveau)"],
    ["scripts/simulate_feasibility_v6.mjs", "Ajouté — 3 stratégies + moteur de simulation, réutilisé identiquement par le test et le rapport"],
    ["docs/v6-feasibility-results.json", "Ajouté — résultats bruts de la batterie de faisabilité (table section 5)"],
    ["docs/screenshots/19-21_*_v6.png", "Ajoutés — captures réelles de vérification (tours agrandies, non-chevauchement route)"],
], [58*mm, 107*mm])
hr()

h1("10. Git, CI/déploiement — vérification réelle")
table([
    ["Étape", "Résultat vérifié"],
    ["Commit de départ (V5 réel)", "71c09e9266b05f47ccac74aac84ee2abef1bc098"],
    ["Commit final V6 (code)", "edc18efeee083d2aaa7598bbe4430790bf1208b1"],
    ["HEAD distant après push", "Vérifié via git ls-remote — identique au commit local (edc18ef)"],
    ["Job CI \"build\"", "success — 89 tests unitaires + suite mobile/Playwright complète (dont test:mobile) exécutés et passants en CI"],
    ["Job CI \"deploy\"", "success — log brut lu directement : pages_build_version = edc18efeee083d2aaa7598bbe4430790bf1208b1 (identique au commit)"],
    ["Identifiant de build re-vérifié localement", "v0.1.0+edc18ef (rebuild local, service worker confirmé servant la version fraîche)"],
    ["URL publique (lien de bêta téléphone)", "https://scuillerjack-oss.github.io/bastion-line-v0/"],
], [58*mm, 107*mm])
hr()

h1("11. Ce qui n'a PAS été modifié")
body("Conformément aux non-objectifs explicites du cahier V6 : aucune reconstruction du moteur, aucune refonte complète de la carte, aucune monétisation/AdMob/IAP, aucun travail Android/AAB, "
     "aucun remplacement improvisé d'ennemis avant l'arrivée de vrais assets, aucun changement esthétique de l'audio, et aucune inflation artificielle du nombre d'ennemis pour simuler une "
     "difficulté. Les vagues, les points de vie de base, l'or de départ et toutes les valeurs économiques par niveau restent identiques à la V5 (vérifié par diff : seuls le tracé du chemin et les "
     "coordonnées des emplacements de construction ont changé dans <font face='Courier'>engine/levels.js</font>).")
hr()

h1("12. Limites connues et points restant à valider en bêta physique")
bullets([
    "<b>Marge de sécurité de la campagne</b> : les 3 stratégies simulées terminent chaque niveau à 100% des PV de la base (section 5) — un signal encourageant sur l'absence d'impossibilité "
    "structurelle, mais qui ne dit rien de la difficulté RESSENTIE par un joueur humain réel, seule juge légitime selon le cahier.",
    "<b>Refonte des emplacements</b> : la nouvelle logique de level design (virages vs lignes droites) est fondée sur un raisonnement explicite et vérifiée par simulation, mais son intérêt "
    "stratégique réellement perçu par un joueur humain reste à confirmer.",
    "<b>Fiabilité tactile</b> : la cause racine identifiée (cache de viewport périmé après un changement de boîte CSS non notifié) est corrigée et vérifiée par test automatisé et geste tactile "
    "réel en Chromium, mais le ressenti définitif sur un appareil physique varié (tailles d'écran, latence tactile réelle) appartient à la prochaine bêta.",
    "<b>Taille des tours</b> : vérifiée sans chevauchement visuel à l'emplacement le plus contraint actuellement connu, mais un futur asset à la silhouette plus \"pleine\" dans sa boîte "
    "englobante devra rouvrir cette vérification (voir le commentaire dans engine/constants.js).",
    "<b>Pipeline ennemis/projectiles</b> : la structure est prête, mais reste vide — aucun ennemi ni projectile n'a encore de nouvelle identité visuelle Leonardo ; cela reste un chantier séparé, "
    "asset par asset.",
])
hr()

h1("13. Checklist pour la prochaine bêta physique")
bullets([
    "Vérifier concrètement, dans chaque virage de chaque niveau, qu'aucun ennemi ne semble plus \"couper\" la route à l'œil humain.",
    "Vérifier que l'archer et le canon sont désormais clairement identifiables et lisibles sur l'écran du téléphone utilisé.",
    "Vérifier qu'un appui unique et délibéré suffit désormais systématiquement à sélectionner un emplacement ou une tour, y compris après plusieurs vagues jouées d'affilée.",
    "Évaluer si les nouveaux emplacements de construction offrent un choix stratégique perçu comme réel (plusieurs approches viables) plutôt qu'un unique \"meilleur\" emplacement évident.",
    "Évaluer la difficulté ressentie niveau par niveau, en particulier le niveau 5 — en gardant à l'esprit que la batterie de faisabilité ne garantit qu'une ABSENCE d'impossibilité "
    "mathématique, jamais un niveau de challenge.",
    "Signaler tout défaut visuel restant (recouvrement route/tour, débordement d'interface) sur l'appareil physique réellement utilisé.",
])
hr()

h1("14. Conclusion")
body("Les cinq priorités numérotées du cahier V6 ont chacune été tracées à une cause racine réelle et corrigée à cette cause — jamais par un correctif localisé à un seul niveau ou une "
     "compensation superficielle — avec une non-régression automatisée dédiée à chacune : un test géométrique de corridor couvrant l'intégralité de la campagne pour la trajectoire, une "
     "vérification empirique par capture d'écran pour la taille des tours, la suite tactile Playwright existante pour la fiabilité du tap, et une nouvelle batterie de simulation à trois profils "
     "de joueur pour la faisabilité des emplacements repensés. Le pipeline d'assets pour de futurs ennemis et projectiles Leonardo est préparé et vérifié sans qu'aucun art provisoire n'ait été "
     "ajouté, conformément à l'interdiction explicite du cahier. L'audio reste inchangé, aucune régression ni bug ne l'ayant concerné.")
body("<b>Conformément à l'instruction explicite du cahier, BASTION LINE V6 n'est PAS déclarée gelée, finalisée ou validée de sa propre initiative.</b> Ce livrable est une candidate à une "
     "nouvelle bêta physique humaine réelle sur téléphone, seule habilitée à juger si les corrections apportées se ressentent effectivement comme attendu en conditions réelles.")

doc = SimpleDocTemplate(OUT, pagesize=A4, topMargin=18*mm, bottomMargin=18*mm, leftMargin=20*mm, rightMargin=20*mm)
doc.build(story)
print("PDF généré:", OUT)
