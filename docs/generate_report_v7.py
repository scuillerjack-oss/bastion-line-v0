#!/usr/bin/env python3
# Rapport technique officiel BASTION LINE V7 (cahier des charges V7, section 12).
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
OUT = os.path.join(HERE, "BASTION_LINE_V7_Rapport_Technique_Officiel.pdf")
SHOTS = os.path.join(HERE, "screenshots")

with open(os.path.join(HERE, "v6-feasibility-results.json"), "r", encoding="utf-8") as f:
    FEAS = json.load(f)

def tier_of(n):
    if n <= 5: return "1-5 (hand-conçus, hérités V0-V6)"
    if n <= 10: return "6-10 (prise en main)"
    if n <= 25: return "11-25 (compositions exigeantes)"
    if n <= 40: return "26-40 (optimisation croissante)"
    return "41-50 (difficulté significative)"

TIER_ORDER = ["1-5 (hand-conçus, hérités V0-V6)", "6-10 (prise en main)", "11-25 (compositions exigeantes)",
              "26-40 (optimisation croissante)", "41-50 (difficulté significative)"]

buckets = {t: {"feasible": 0, "total": 0, "min_hp": 100, "losses": 0} for t in TIER_ORDER}
for id_str, lvl in FEAS.items():
    t = tier_of(int(id_str))
    b = buckets[t]
    b["total"] += 1
    if lvl["feasible"]:
        b["feasible"] += 1
    for r in lvl["strategies"].values():
        b["min_hp"] = min(b["min_hp"], round(r["minHpRatio"] * 100))
        if r["status"] == "lost":
            b["losses"] += 1

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
story.append(Paragraph("Rapport Technique Officiel — V7", styles["Subtitle"]))
story.append(Paragraph("Fluidité des ennemis, gabarit des défenses, Catapulte, campagne 50 niveaux, sauvegarde fiable", styles["Subtitle"]))
story.append(Spacer(1, 14*mm))
meta_label_style = ParagraphStyle(name="MetaLabel", fontSize=9, leading=12, fontName="Helvetica-Bold", textColor=colors.HexColor("#2a5c47"))
meta_value_style = ParagraphStyle(name="MetaValue", fontSize=9, leading=12)
meta = [
    ["Date du rapport", "1er octobre 2026"],
    ["Dépôt", "github.com/scuillerjack-oss/bastion-line-v0"],
    ["Commit de départ (V6 réel, audité)", "a439c70b873d64ddc403801574a10f89ca32741a"],
    ["Commit final V7", "c93e9c99b061260c57a1b5ffa636ef0f1c807dd4"],
    ["Identifiant de build vérifié", "v0.1.0+c93e9c9 (pages_build_version confirmé identique dans le log CI)"],
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

h1("0. Audit de reprise V6 (cahier V7, section 2)")
bullets([
    "Workspace / dépôt : <font face='Courier'>/home/user/bastion-line-v0</font>, branche <font face='Courier'>main</font>, aucune divergence avec <font face='Courier'>origin/main</font>.",
    "HEAD local = HEAD distant avant modification = <font face='Courier'>a439c70b873d64ddc403801574a10f89ca32741a</font> (rapport technique V6), avec le commit de CODE V6 réel "
    "<font face='Courier'>edc18efeee083d2aaa7598bbe4430790bf1208b1</font> confirmé présent dans l'historique, job CI \"deploy\" V6 success revérifié.",
    "Suite de tests relancée AVANT toute modification : 89/89 tests unitaires passants, suite mobile/Playwright complète passante.",
    "Inventaire demandé par le cahier : tour d'Archer = sprite Leonardo (<font face='Courier'>tour_rapide_arbalete.png</font>) ; Canon = sprite Leonardo "
    "(<font face='Courier'>canon.png</font>) ; défense très longue portée = placeholder Canvas triangulaire (<font face='Courier'>longue_portee</font>, "
    "aucun sprite) ; ennemis basiques = archétype <font face='Courier'>standard</font>, couleur bleu-gris <font face='Courier'>#94a3b8</font>, silhouette "
    "Canvas \"grognard\" à 2 cercles.",
    "Aucune reconstruction depuis zéro : les six corrections ci-dessous partent strictement du code V6 réel et ne touchent que ce que le cahier V7 désigne explicitement.",
])
hr()

h1("1. Fluidité des déplacements ennemis — correction à la cause (cahier V7, section 3)")
body("Diagnostic : la simulation elle-même était déjà parfaitement continue (tick fixe 60Hz, interpolation linéaire exacte le long de "
     "<font face='Courier'>PATH_MAP</font>, vérifiée par le test de corridor géométrique hérité de V6). Le défaut réel se situait entre la simulation et "
     "l'AFFICHAGE : <font face='Courier'>main.js</font> avance la simulation par pas fixe via un accumulateur piloté par "
     "<font face='Courier'>requestAnimationFrame</font>, mais ne dessinait que la DERNIÈRE position simulée, sans jamais interpoler la fraction de temps "
     "du prochain tick déjà écoulée (<font face='Courier'>state.accMs</font> restant). Sur un écran à fréquence de rafraîchissement supérieure à 60Hz "
     "(90/120Hz, très répandu sur téléphone réel — jamais reproduit à l'identique par la suite Playwright headless), certaines frames n'ont AUCUN tick "
     "puis une frame suivante en effectue plusieurs d'un coup : le delta de position affiché devient irrégulier d'une frame à l'autre. Sur une ligne "
     "droite, cette irrégularité est peu visible (simple variation de vitesse) ; DANS un virage, où la direction change, elle se lit comme un "
     "repositionnement brusque — exactement le symptôme rapporté, et exactement pourquoi il était \"plus visible près de certains virages\" sans jamais "
     "être spécifique à UN virage en particulier (cause systémique, pas un défaut de tracé).")
h2("1.1 Correction structurelle")
body("<font face='Courier'>engine/simulation.js</font> : <font face='Courier'>stepEnemies</font>/<font face='Courier'>stepProjectiles</font> mémorisent "
     "désormais, à CHAQUE tick, la position juste avant de la faire avancer (<font face='Courier'>prevX/prevY</font>) — jamais lu par la simulation "
     "elle-même, qui reste strictement inchangée et déterministe. <font face='Courier'>engine/interpolate.js</font> (nouveau, fonction PURE sans "
     "dépendance DOM, donc directement testable par <font face='Courier'>node:test</font>) : <font face='Courier'>interpolateRenderPos(entity, alpha)</font> "
     "interpole linéairement, bornée au segment <font face='Courier'>[prevX,x]×[prevY,y]</font>, jamais une extrapolation. "
     "<font face='Courier'>main.js</font> calcule <font face='Courier'>alpha = accMs/FIXED_DT</font> restant après la boucle de ticks, transmis à "
     "<font face='Courier'>drawFrame</font>, qui dessine ennemis et projectiles à leur position interpolée plutôt qu'à leur dernière position simulée.")
body("<b>Aucune coordonnée de <font face='Courier'>PATH_MAP</font> n'a été modifiée</b> — conformément à l'exigence explicite du cahier de ne jamais "
     "masquer ce défaut en retouchant le tracé graphique de la carte.")
h2("1.2 Tests")
body("<font face='Courier'>tests/interpolation.test.js</font> (nouveau) : fonction pure (bornes alpha=0/1/0,5, clampage hors [0,1], entité sans "
     "<font face='Courier'>prevX/prevY</font>), suivi <font face='Courier'>prevX/prevY</font> par la simulation (jamais figé à la position d'apparition), "
     "et continuité bornée vérifiée explicitement DANS un virage à angle droit simulé. <font face='Courier'>scripts/check-mobile.mjs</font>, Test 21 "
     "(nouveau) : câblage réel bout-en-bout en navigateur (alpha toujours valide, position toujours bornée, plusieurs ennemis simultanés, virages réels "
     "du niveau 1, aucune erreur console) — verrouille le câblage, pas le phénomène 90/120Hz lui-même, qui reste par nature un phénomène d'écran physique "
     "non reproductible à l'identique en Chromium headless : sa disparition effective reste à confirmer par la prochaine bêta physique.")
hr()
story.append(PageBreak())

h1("2. Gabarit visuel des trois défenses (cahier V7, section 4)")
body("Archer : sprite et repli Canvas agrandis modestement (~8-10%) par rapport à la V6 (44×62→48×68), devenant le nouveau gabarit visuel de référence. "
     "Canon : agrandi davantage (50×58→58×66) pour atteindre une présence visuelle COMPARÉE comparable — sa silhouette (tourelle ronde + base) occupait "
     "visuellement moins sa propre boîte englobante que celle, plus élancée, de l'Archer, à taille de boîte identique (vérifié par capture d'écran côte à "
     "côte à échelle identique). Le repli Canvas des trois familles utilise désormais un facteur D'ÉCHELLE PAR FAMILLE "
     "(<font face='Courier'>FALLBACK_SCALE_BY_FAMILY</font>, remplace l'unique <font face='Courier'>FALLBACK_SCALE</font> partagé de la V6) : la "
     "Catapulte (ex-Longue portée) conserve EXACTEMENT sa taille V6, son asset définitif n'étant pas encore fourni (section 3 ci-dessous).")
body("Aucune statistique de jeu modifiée (portée/dégâts/cadence/<font face='Courier'>TOWER_FOOTPRINT_RADIUS</font>/zones tactiles) — seule la taille "
     "RENDUE change. Vérifié empiriquement par capture d'écran à l'emplacement de clairance la plus faible de toute la campagne (58,26 unités, niveau 4 "
     "s9) : aucun chevauchement visuel avec la route.")
shot("22_archer_canon_v7.jpg", "Archer et Canon agrandis construits côte à côte (niveau 4).", width=55*mm)
shot("24_archer_crop_v7.png", "Archer — crop à échelle identique.", width=40*mm)
shot("25_canon_crop_v7.png", "Canon — même crop, même échelle : présence visuelle comparée.", width=40*mm)
hr()

h1("3. Défense très longue portée renommée Catapulte (cahier V7, section 5)")
body("Le choix graphique « Baliste » envisagé (trop proche visuellement de la tour d'Archer) est abandonné. Seules les chaînes AFFICHÉES changent "
     "(<font face='Courier'>towers.js</font> : <font face='Courier'>name</font> ; <font face='Courier'>tutorial.js</font> : premier texte de découverte) "
     "— l'identifiant interne <font face='Courier'>longue_portee</font> est conservé intégralement (sauvegardes, tests, simulation, "
     "<font face='Courier'>TOWER_SPRITE_CONFIG</font>/<font face='Courier'>PROJECTILE_SPEED</font>/<font face='Courier'>bonusVsArmored</font>) : aucune "
     "reconstruction, aucun risque de régression sur une partie déjà en cours. La mécanique (portée/dégâts/cadence/bonus anti-blindé) n'est pas modifiée "
     "par ce seul changement de nom.")
body("<b>L'asset Catapulte définitif n'a pas été fourni pour cette livraison</b> (conformément au cahier, qui l'annonçait explicitement : livraison "
     "prévue ultérieurement). Le placeholder graphique triangulaire actuel est conservé TEL QUEL — aucun visuel de remplacement inventé ni généré "
     "arbitrairement. Le pipeline d'intégration est déjà prêt sans code supplémentaire : il suffira d'ajouter une entrée "
     "<font face='Courier'>longue_portee</font> dans <font face='Courier'>TOWER_SPRITE_CONFIG</font> (<font face='Courier'>src/ui/render.js</font>, même "
     "registre que l'Archer et le Canon) le jour où l'asset définitif sera transmis, dimensionné selon le gabarit visuel de référence établi en section 2.")
hr()

h1("4. Nouvel asset ennemi : soldats basiques Leonardo (cahier V7, section 6)")
body("<b>La planche d'assets Leonardo représentant les nouveaux soldats basiques n'est pas parvenue durant cette mission</b>, malgré l'annonce du "
     "cahier (\"sera transmise séparément\"). Conformément à l'interdiction explicite — \"ne pas remplacer les unités bleues par un autre personnage, une "
     "forme générique ou un asset inventé\" — AUCUN remplacement provisoire n'a été fabriqué. Les ennemis basiques restent, pour cette livraison, "
     "l'archétype <font face='Courier'>standard</font> existant (silhouette Canvas bleu-gris inchangée).")
body("Le pipeline d'intégration est néanmoins déjà prêt, préparé dès la V6 : <font face='Courier'>ENEMY_SPRITE_CONFIG</font> "
     "(<font face='Courier'>src/ui/render.js</font>) est un registre VIDE mais structurellement identique à celui des tours (sprite chargé via "
     "<font face='Courier'>loadSprite</font> ? dessiné à taille/ancre configurées : repli Canvas existant). Dès réception de la planche, l'intégration "
     "consistera à : découper les poses/directions fournies, ajouter une entrée <font face='Courier'>ENEMY_SPRITE_CONFIG.standard</font>, associer les "
     "frames à la direction réelle de déplacement (retournement/mirroring si pertinent), animer la marche à cadence sobre, et vérifier l'ancrage/la "
     "lisibilité dans les virages — sans toucher à <font face='Courier'>ENEMY_R</font> (rayon de collision/gameplay) ni aux PV/vitesse/dégâts/rôle "
     "existants, et sans modifier à nouveau le moteur de trajectoire (section 1), les deux problèmes restant structurellement distincts.")
hr()
story.append(PageBreak())

h1("5. Campagne étendue de 5 à 50 niveaux (cahier V7, section 7)")
body("Les niveaux 1-5 hand-conçus (chemin, emplacements, vagues) restent INTÉGRALEMENT inchangés. Les niveaux 6-50 sont produits par un générateur "
     "paramétrique (<font face='Courier'>engine/levels.js</font>, <font face='Courier'>generateLevel</font>) : un seul asset de carte existe (une seule "
     "géométrie de route), donc les emplacements constructibles réutilisent exactement les 10 positions déjà validées au niveau 5 (zéro violation "
     "d'emprise) — le vrai espace de variation est la composition des vagues (archétypes, proportions, rythme), paramétrée selon les 4 paliers du cahier. "
     "Un niveau sur 7 (7, 14, …, 49) reprend le mécanisme de double voie du niveau 5 pour la variété, jamais systématiquement. Marge volontairement "
     "conservée (<font face='Courier'>baseHp</font> plafonné à 36, <font face='Courier'>startCoins</font> à 340, densité jamais poussée au maximum "
     "théorique) pour une extension future jusqu'au niveau 100.")
h2("5.1 Vérification par simulation — pas une promesse, un résultat mesuré")
body("Chaque niveau généré est vérifié par la MÊME batterie de faisabilité multi-stratégies qu'en V6 "
     "(<font face='Courier'>scripts/simulate_feasibility_v6.mjs</font>, 3 profils de joueur distincts : équilibrée, priorité dégâts, priorité "
     "cadence/portée). Les paramètres ont été ajustés itérativement et honnêtement documentés : une première passe trop molle (tous niveaux gagnés à "
     "100% de PV par les 3 stratégies, y compris le niveau 50) a été durcie ; une seconde passe trop dure (2 niveaux sans aucune stratégie gagnante, 2 "
     "stratégies sur 3 anéanties dès le niveau 30) a été rééquilibrée. <b>Résultat final : 50/50 niveaux faisables</b>, avec une pression réelle et "
     "honnêtement croissante à partir du palier \"optimisation croissante\" (deux stratégies commencent à subir de vrais dégâts) tandis qu'au moins une "
     "stratégie reste toujours gagnante.")
feas_rows = [["Palier", "Niveaux", "Faisables", "PV minimum observé (toutes stratégies)", "Défaites (stratégie/niveau)"]]
tier_labels = [
    ("1-5 (hand-conçus, hérités V0-V6)", "1-5"),
    ("6-10 (prise en main)", "6-10"),
    ("11-25 (compositions exigeantes)", "11-25"),
    ("26-40 (optimisation croissante)", "26-40"),
    ("41-50 (difficulté significative)", "41-50"),
]
for key, label in tier_labels:
    b = buckets[key]
    feas_rows.append([label, f"{b['total']} niveaux", f"{b['feasible']}/{b['total']}", f"{b['min_hp']}%", str(b["losses"])])
table(feas_rows, [30*mm, 22*mm, 22*mm, 55*mm, 36*mm])
body("Lecture honnête : \"faisable\" signifie qu'au moins une des 3 stratégies gagne — jamais que 100% des simulations gagnent (rappel explicite du "
     "cahier, déjà appliqué en V6). Les 2 défaites enregistrées (palier 41-50, niveau 49) concernent des stratégies qui négligent la Catapulte "
     "(anti-blindé) face à une composition riche en ennemis blindés — un résultat de LEVEL DESIGN réel (la composition importe, pas seulement la "
     "puissance brute), jamais un niveau structurellement impossible : la stratégie \"priorité dégâts\" y gagne avec une marge confortable. Comme pour "
     "la V6, ce résultat ne constitue PAS une validation de la difficulté ressentie, réservée à la bêta humaine physique.")
hr()

h1("6. Correction à la racine du bug de progression/sauvegarde (cahier V7, section 8)")
body("Ancien modèle : un seul NOMBRE persisté, <font face='Courier'>unlockedLevelIndex</font> (\"niveau max débloqué\"), déjà protégé en V4 par un "
     "<font face='Courier'>max()</font> entre copies concurrentes. Nouveau modèle V7 : la SEULE donnée persistée devient "
     "<font face='Courier'>completedLevels</font>, un ENSEMBLE des index de niveaux réellement terminés. \"Niveau débloqué\" et \"niveau terminé\" en "
     "sont désormais entièrement DÉRIVÉS (<font face='Courier'>getUnlockedUpToIndex</font>/<font face='Courier'>isLevelCompleted</font>), jamais "
     "stockés séparément — élimine structurellement toute possibilité de désynchronisation entre deux champs. "
     "<font face='Courier'>markLevelCompleted()</font> fusionne par UNION d'ensembles (jamais par <font face='Courier'>max()</font> sur un nombre) : une "
     "union ne peut que grandir, quel que soit l'ordre d'écriture de deux instances concurrentes.")
body("Lecture, elle aussi corrigée à la racine : <font face='Courier'>showMenu()</font> et le nouvel écran de sélection relisent désormais TOUJOURS la "
     "progression fraîche depuis le stockage — plus de copie en mémoire pouvant devenir périmée. Migration non destructive vérifiée explicitement par "
     "test : une ancienne sauvegarde V0-V6 (<font face='Courier'>unlockedLevelIndex</font> seul) est reconstruite en "
     "<font face='Courier'>completedLevels=[0..N-1]</font> sans aucune perte — la progression V0-V6 ne pouvait être acquise que séquentiellement, donc ce "
     "nombre impliquait déjà la liste complète des niveaux réellement gagnés.")
h2("6.1 Scénarios testés (cahier V7, section 8)")
bullets([
    "Pause/reprise, recommencer, victoire, défaite : aucune écriture de progression hors victoire réelle.",
    "Rejouer un ancien niveau déjà terminé : ne fait JAMAIS régresser la progression maximale (union d'ensembles, vérifié par test dédié).",
    "Concurrence multi-instance (bug de reprise V3/V4) : toujours sûre avec le nouveau modèle.",
    "Cycles sauvegarde → fermeture/rechargement → reprise (5 cycles consécutifs) : le bon niveau est systématiquement retrouvé.",
    "Sauvegarde absente ou corrompue (JSON invalide) : retombe proprement sur les valeurs par défaut, sans écraser une sauvegarde saine existante.",
    "Migration V0-V6 → V7 : progression préservée à l'identique, vérifiée explicitement par test.",
])
hr()
story.append(PageBreak())

h1("7. Écran de sélection des niveaux 1-50 (cahier V7, section 9)")
body("Grille compacte mobile (5 colonnes, défilement vertical), 3 états visuellement non ambigus dérivés de la seule source de vérité "
     "(<font face='Courier'>completedLevels</font>) : terminé (doré/jaune), accessible non terminé (gris distinct), verrouillé (cadenas, réellement "
     "désactivé via l'attribut <font face='Courier'>disabled</font>, pas seulement une classe visuelle). La progression étant strictement séquentielle, "
     "il existe à tout instant EXACTEMENT UN niveau \"accessible non terminé\" — le style \"gris distinct\" suffit donc, à lui seul, à identifier "
     "immédiatement le niveau à poursuivre, sans indicateur redondant à maintenir séparément. Rejouer un niveau déjà terminé démarre ce niveau en un "
     "seul toucher.")
shot("26_ecran_selection_niveaux_v7.png", "Écran de sélection (progression de test : 12 niveaux terminés) — doré/gris/verrouillé.", width=55*mm)
hr()

h1("8. Ce qui n'a PAS été modifié")
body("Conformément aux non-objectifs explicites du cahier V7 : aucune reconstruction du moteur, aucune refonte complète de la carte, aucune "
     "monétisation/AdMob/IAP, aucun travail Android/AAB, aucun remplacement improvisé d'ennemis avant l'arrivée de vrais assets, aucun changement "
     "esthétique de l'audio, aucune inflation artificielle du nombre d'ennemis pour simuler une difficulté. Placement tactile, attaques, projectiles, "
     "améliorations, vente/remboursement, économie, vagues, base, victoire/défaite, pause, audio et contrôles restent les systèmes déjà fonctionnels, "
     "simplement revérifiés.")
hr()

h1("9. Tests et non-régressions")
table([
    ["Bloc", "Validation obtenue"],
    ["Héritage V6", "89/89 tests unitaires de départ confirmés AVANT toute modification."],
    ["Trajectoire", "tests/interpolation.test.js (fonction pure + suivi prevX/prevY + continuité bornée en virage) ; check-mobile Test 21 (câblage réel navigateur)."],
    ["Gabarit Archer/Canon", "Vérification empirique par capture d'écran à la clairance la plus faible de la campagne (58,26) : aucun chevauchement route."],
    ["Renommage Catapulte", "tests/simulation.test.js : nom affiché = exactement \"Catapulte\", mécanique et id interne inchangés."],
    ["Campagne 50 niveaux", "LEVELS.length===50, 0 violation d'emprise structurelle, feasibility.test.js étendu automatiquement aux 50 niveaux."],
    ["Progression/sauvegarde", "tests/save.test.js réécrit : non-régression au rejeu, concurrence multi-instance, cycles, sauvegarde corrompue, migration V0-V6→V7."],
    ["Écran de sélection", "check-mobile Test 22 : 3 états comptés exactement sur 50 niveaux, rejeu réel en un tap, niveau verrouillé réellement inerte."],
    ["Systèmes hérités", "Placement tactile, construction, amélioration, revente, vagues, PWA/manifest/SW/cache, affichage portrait : suite complète toujours passante."],
], [38*mm, 127*mm])
body("Suite complète finale : <b>289/289 tests unitaires</b> (node:test, dont la batterie de faisabilité des 50 niveaux) + "
     "<b>33/33 vérifications mobiles/Playwright</b> (31 héritées + 2 nouvelles cette mission : interpolation de rendu, écran de sélection).")
hr()

h1("10. Git, CI/déploiement — vérification réelle")
table([
    ["Étape", "Résultat vérifié"],
    ["Commit de départ (V6 réel)", "a439c70b873d64ddc403801574a10f89ca32741a"],
    ["Commits V7 (6, réguliers et explicites)",
     "8971e40 (trajectoire) → 2bb60b4 (gabarit) → 83ece6f (Catapulte) → ae11de8 (sauvegarde) → e1eb77e (campagne 50 niveaux) → c93e9c9 (sélection niveaux)"],
    ["Commit final V7", "c93e9c99b061260c57a1b5ffa636ef0f1c807dd4"],
    ["HEAD distant après push", "Vérifié via git ls-remote — identique au commit local (c93e9c9)"],
    ["Job CI \"build\"", "success — 289 tests unitaires + suite mobile/Playwright complète (33 vérifications) exécutés et passants en CI"],
    ["Job CI \"deploy\"", "success — log brut lu directement : pages_build_version = c93e9c99b061260c57a1b5ffa636ef0f1c807dd4 (identique au commit)"],
    ["Identifiant de build re-vérifié localement", "v0.1.0+c93e9c9 (rebuild local, service worker confirmé servant la version fraîche)"],
    ["URL publique (lien de bêta téléphone)", "https://scuillerjack-oss.github.io/bastion-line-v0/"],
], [58*mm, 107*mm])
hr()
story.append(PageBreak())

h1("11. Limites connues et livraisons encore en attente")
bullets([
    "<b>Asset Catapulte définitif</b> : non fourni pour cette livraison, comme annoncé par le cahier lui-même. Le placeholder graphique triangulaire "
    "est conservé à l'identique ; le pipeline d'intégration (<font face='Courier'>TOWER_SPRITE_CONFIG.longue_portee</font>) est prêt à le recevoir sans "
    "modification de code supplémentaire.",
    "<b>Planche d'assets Leonardo des soldats basiques</b> : annoncée par le cahier (\"sera transmise séparément\") mais non parvenue durant cette "
    "mission. Les ennemis basiques restent donc l'archétype <font face='Courier'>standard</font> existant (silhouette bleu-gris). Le registre "
    "<font face='Courier'>ENEMY_SPRITE_CONFIG</font> est prêt (vide, structurellement identique à celui des tours) : l'intégration pourra se faire en "
    "une mission courte dès réception, sans toucher au moteur de trajectoire ni aux statistiques de jeu.",
    "<b>Phénomène 90/120Hz</b> : la correction de trajectoire est verrouillée mathématiquement (tests unitaires) et son câblage réel est vérifié en "
    "navigateur, mais la disparition effective des sauts PERÇUS sur un écran physique à haute fréquence de rafraîchissement reste, par nature, à "
    "confirmer par la prochaine bêta humaine réelle — aucune suite automatisée ne peut reproduire à l'identique le comportement d'un écran physique "
    "90/120Hz.",
    "<b>Difficulté ressentie de la campagne 50 niveaux</b> : la batterie de faisabilité garantit l'ABSENCE d'impossibilité structurelle (au moins une "
    "stratégie gagne partout), jamais une validation de la difficulté RESSENTIE par un joueur humain, réservée exclusivement à la bêta physique.",
    "<b>Noms des niveaux générés</b> (6-50) : générés programmatiquement (\"Niveau N — <palier>\"), jamais affichés au joueur dans l'état actuel de "
    "l'interface (seul \"Niveau N\" apparaît en jeu) — un nommage thématique individuel pourra être envisagé plus tard si souhaité, sans urgence "
    "fonctionnelle.",
])
hr()

h1("12. Checklist pour la prochaine bêta physique")
bullets([
    "Vérifier concrètement, sur l'écran physique réellement utilisé (fréquence de rafraîchissement réelle), que les sauts/repositionnements près des "
    "virages ont réellement disparu, y compris avec plusieurs ennemis simultanés.",
    "Vérifier que l'Archer et le Canon sont désormais perçus comme ayant une présence visuelle comparable.",
    "Confirmer qu'aucune confusion visuelle ne subsiste entre la Catapulte (placeholder) et les deux autres défenses en attendant son asset définitif.",
    "Jouer une plage représentative de la nouvelle campagne (paliers 6-10, 11-25, 26-40, 41-50) et donner un retour sur la difficulté RESSENTIE, non "
    "mesurable par simulation.",
    "Tester explicitement l'écran de sélection des niveaux : rejeu d'un niveau terminé, lisibilité des 3 états sur l'appareil réel.",
    "Soumettre la sauvegarde/progression à un usage réel prolongé (fermetures, réouvertures, changements de niveau) pour confirmer l'absence totale de "
    "retour arbitraire en conditions réelles, au-delà des scénarios déjà testés automatiquement.",
])
hr()

h1("13. Conclusion")
body("Les six priorités numérotées du cahier V7 ont chacune été tracées à une cause racine réelle et corrigée à cette cause — jamais par un correctif "
     "localisé ou une compensation superficielle — avec une non-régression automatisée dédiée à chacune : une fonction d'interpolation pure et "
     "testable pour la trajectoire, une vérification empirique par capture d'écran pour le gabarit des défenses, un modèle de sauvegarde à source de "
     "vérité unique pour la progression, et une batterie de simulation multi-stratégies étendue automatiquement aux 50 niveaux de la nouvelle campagne. "
     "Deux livraisons annoncées par le cahier lui-même (l'asset Catapulte définitif et la planche de soldats Leonardo) ne sont pas parvenues durant "
     "cette mission ; les deux pipelines d'intégration correspondants sont prêts et documentés, sans qu'aucun art provisoire n'ait été fabriqué pour "
     "combler leur absence, conformément à l'interdiction explicite du cahier.")
body("<b>Conformément à l'instruction explicite du cahier, BASTION LINE V7 n'est PAS déclarée gelée, finalisée ou validée de sa propre initiative.</b> "
     "Ce livrable est une candidate à une nouvelle bêta physique humaine réelle sur téléphone, seule habilitée à juger si les corrections apportées se "
     "ressentent effectivement comme attendu en conditions réelles.")

doc = SimpleDocTemplate(OUT, pagesize=A4, topMargin=18*mm, bottomMargin=18*mm, leftMargin=20*mm, rightMargin=20*mm)
doc.build(story)
print("PDF généré:", OUT)
