#!/usr/bin/env python3
# Rapport technique officiel BASTION LINE V8 (cahier V8, section 14).
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
OUT = os.path.join(HERE, "BASTION_LINE_V8_Rapport_Technique_Officiel.pdf")
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

story.append(Spacer(1, 26*mm))
story.append(Paragraph("BASTION LINE", styles["TitleBig"]))
story.append(Paragraph("Rapport Technique Officiel — V8", styles["Subtitle"]))
story.append(Paragraph("Évolution contrôlée vers un tower defense plus profond : identité des tours, familles d'ennemis, feedback, variété des chemins, courbe de difficulté", styles["Subtitle"]))
story.append(Spacer(1, 10*mm))
meta_label_style = ParagraphStyle(name="MetaLabel", fontSize=9, leading=12, fontName="Helvetica-Bold", textColor=colors.HexColor("#2a5c47"))
meta_value_style = ParagraphStyle(name="MetaValue", fontSize=9, leading=12)
meta = [
    ["Date du rapport", "4 octobre 2026"],
    ["Dépôt", "github.com/scuillerjack-oss/bastion-line-v0"],
    ["Repère du cahier V8 (vérifié, non pris comme hypothèse)", "87fbc505912dc5384d1b0b709b22f173e0947243"],
    ["État réel de reprise (plus récent que le repère, conservé — jamais de retour arrière)", "2d2d6ff23aa6589a1f5668c9570037b4321a4320 (V7-polish)"],
    ["Commit final V8", "e734fef698e63f7a91dc98c313f29b6679f04ea6"],
    ["Identifiant de build vérifié", "v0.1.0+e734fef"],
    ["HEAD local = HEAD distant", "Vérifié (git fetch, 0 commit d'écart dans les deux sens)"],
    ["Statut du déploiement", "Workflow \"Deploy to GitHub Pages\" #37 : succès (build+tests+mobile, puis deploy). pages_build_version confirmé = e734fef6…"],
    ["URL publique (bêta téléphone)", "https://scuillerjack-oss.github.io/bastion-line-v0/"],
    ["Statut de la mission", "Candidate à une NOUVELLE bêta physique humaine — NON déclarée gelée ni finalisée"],
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

h1("0. Audit court de reprise (cahier V8, section 1)")
body("Le cahier V8 fournit un repère (<font face='Courier'>87fbc50</font>, build v0.1.0+87fbc50, 292/292 tests, 50/50 niveaux faisables) en précisant "
     "explicitement qu'il ne remplace jamais l'audit réel du dépôt. L'audit a trouvé l'état réel UN COMMIT PLUS RÉCENT que ce repère : "
     "<font face='Courier'>2d2d6ff</font> (\"V7-polish : ajoute le rapport technique officiel PDF\"), déjà poussé, HEAD local = HEAD distant, arbre de "
     "travail propre. Conformément à l'instruction explicite du cahier (\"si l'état réel est plus récent que le repère, ne reviens pas en arrière\"), "
     "la mission V8 est partie de cet état réel, jamais du repère du cahier.")
bullets([
    "Suite de tests relancée AVANT toute modification : 292/292 passants (confirmé identique au repère).",
    "Batterie de faisabilité (50 niveaux × 3 stratégies) relancée : 50/50 niveaux faisables.",
    "Suite mobile/PWA (Playwright, build de production) relancée : 35/35 vérifications passantes.",
    "Inventaire des systèmes fonctionnels réalisé avant toute modification : tours (3 familles, statistiques lues directement dans "
    "<font face='Courier'>towers.js</font>), ennemis (4 archétypes), 50 niveaux, sauvegarde/reprise, PWA/service worker, rendu (tours/ennemis/projectiles), "
    "audio (sfx + musique procédurale), économie (construction/amélioration/revente).",
    "<b>Constat d'audit central, à l'origine de la priorité majeure du cahier (section 3)</b> : la Catapulte (<font face='Courier'>longue_portee</font>) "
    "avait AUCUNE zone d'effet (<font face='Courier'>aoeRadius: 0</font> à tous les paliers), la cadence de tir la PLUS RAPIDE des 3 tours "
    "(900→780ms, plus rapide que le canon) et le projectile le PLUS RAPIDE (900, contre 520 pour l'archer et 260 pour le canon) — l'exact inverse de "
    "l'identité \"artillerie lourde : très longue portée, gros impact de zone, projectile lent, mauvaise réponse aux cibles rapides\" voulue par le "
    "cahier. Ce constat, vérifié dans le code réel plutôt que supposé, a structuré l'ensemble de la priorité P1.",
])
hr()

h1("1. Identité des 3 tours (cahier V8, section 3 — priorité majeure)")
h2("1.1 Catapulte : reconstruite sur son identité réelle")
body("Corrigé directement sur l'audit ci-dessus (<font face='Courier'>towers.js</font>, <font face='Courier'>simulation.js</font>) : zone d'effet "
     "ajoutée à tous les paliers (58 / 72 / 88, plus large que le canon), cadence de tir rendue la PLUS LENTE des 3 (1900 / 1700 / 1500ms, toujours "
     "strictement au-dessus du canon à palier équivalent), vitesse de projectile ramenée à la PLUS FAIBLE des 3 (900 → 130). Portée et bonus anti-"
     "\"Lourd\" (bonusVsArmored) inchangés. Dégâts par coup augmentés pour compenser partiellement la cadence divisée par ~2.")
body("Conséquence mécanique directe et volontaire : combinée à la poursuite (homing) déjà existante du moteur, un projectile plus lent que la vitesse "
     "d'un ennemi rapide/éclaireur ne le rattrape jamais tant qu'il s'éloigne — la \"mauvaise réponse aux cibles rapides\" voulue par le cahier "
     "apparaît ainsi comme une conséquence naturelle du moteur, jamais une règle de ciblage spéciale ajoutée à part.")
body("Rendu : le projectile catapulte (trait proportionnel à la vitesse brute, devenu quasi invisible une fois la vitesse ralentie) a été remplacé "
     "par un boulet lourd et lisible avec une traînée de longueur FIXE — sinon le ralentissement du projectile aurait rendu le tir à peine visible, "
     "contredisant directement l'identité visuelle voulue.")
h2("1.2 Archer et Canon : audités, confirmés déjà conformes")
body("Conformément à l'instruction explicite du cahier (\"audite d'abord les statistiques réellement présentes avant tout équilibrage\"), l'Archer "
     "(40 pièces, cadence 260→110ms, dégâts 4→6, aucune zone d'effet) et le Canon (65 pièces, cadence 1400→1200ms, dégâts 16→26, zone d'effet "
     "46→76) ont été comparés à l'identité voulue (précision/cadence contre cibles fragiles/rapides vs puissance intermédiaire/zone contre les "
     "groupes) via leurs DPS réels, pas seulement la lecture des libellés. Conclusion : déjà conformes. Aucune statistique modifiée — le cahier "
     "interdit explicitement de transformer les tours en simples variantes de dégâts sans justification réelle.")
h2("1.3 Économie des tours")
body("Palier affiché explicitement (\"palier X/Y\") dans le panneau d'amélioration — déjà conforme. Revente à remboursement partiel déjà conforme "
     "(testée). Un test dédié verrouille désormais l'absence de duplication de monnaie sur une boucle répétée construire → améliorer → vendre.")
hr()
story.append(PageBreak())

h1("2. Ciblage et orientation (cahier V8, section 4)")
body("Règle de ciblage documentée dans le code (<font face='Courier'>findTarget</font>, <font face='Courier'>simulation.js</font>) : parmi les "
     "ennemis vivants à portée, la tour vise celui ayant parcouru le plus de distance sur son chemin (le plus proche de la base) — stratégie "
     "déterministe, donc testable. Vérifiée sans aucune mention contradictoire côté interface (recherche dans <font face='Courier'>main.js</font>).")
body("L'orientation visuelle continue des tours vers leur cible réelle (<font face='Courier'>tower.aimAngle</font>, mise à jour à CHAQUE pas de "
     "simulation, jamais seulement au tir) avait déjà été construite et verrouillée par test lors de la mission V7-polish précédente — confirmée "
     "intacte par l'audit de reprise, non retouchée cette mission : le point d'origine visuel des projectiles reste cohérent avec l'arme affichée "
     "pour les 3 familles.")
hr()

h1("3. Projectiles, impacts et feedback (cahier V8, section 5)")
body("Avant cette mission, <font face='Courier'>impact_aoe</font>/<font face='Courier'>impact_single</font> ne portaient aucune information sur la "
     "famille de la tour à l'origine du tir, et produisaient tous le même anneau doré générique, sans aucun son d'impact dédié (seul le tir avait un "
     "son distinct par famille).")
table([
    ["Famille", "Son d'impact", "Visuel d'impact"],
    ["Archer", "Léger et net (triangle, glissade montante) — pas d'explosion.", "Anneau fin, léger, qui se dissipe vite."],
    ["Canon", "Courte explosion franche (bruit filtré, passe-haut bas).", "Disque qui se dissipe + anneau — sensation d'explosion courte."],
    ["Catapulte", "Souffle grave et long + choc sourd descendant (deux couches sonores).", "Anneau de poussière large et lent + anneau de choc intérieur (coupé en mode \"effets réduits\")."],
], [28*mm, 65*mm, 72*mm])
body("Micro-secousse bornée (140ms, décroissance déterministe, jamais de screen-shake permanent) ajoutée sur les seuls impacts de zone de la "
     "catapulte — \"sentiment de masse\" sans fatiguer l'œil. Réglage \"Effets réduits\" ajouté (persisté en sauvegarde, défaut désactivé) qui retire "
     "les couches secondaires (anneau intérieur, disque d'explosion, micro-secousse) sans jamais couper le son ni la lisibilité de base, pour ne "
     "jamais faire chuter les performances avec de nombreuses unités à l'écran.")
body("Polish audio complémentaire (section 5/P3) : légère variation de hauteur (±4%, cosmétique uniquement, jamais dans la simulation déterministe) "
     "sur les sons les plus répétés pour éviter l'effet \"bip mécanique\", et limite anti-cacophonie (un même effet redéclenché avant son délai "
     "minimal est ignoré, jamais mis en file) sur le tir/impact archer et les ennemis tués — les tirs canon/catapulte n'en ont pas besoin, leur "
     "cadence (≥1200ms) excluant déjà toute superposition réelle.")
hr()

h1("4. Familles d'ennemis (cahier V8, section 6)")
body("Renommage d'affichage vers Fantassin / Cavalier / Lourd / Éclaireur — identifiants internes INCHANGÉS (sauvegardes, tests, simulation, flag "
     "<font face='Courier'>armored</font> exploité par le bonus anti-\"Lourd\" de la Catapulte), même discipline que le renommage Catapulte en V7.")
table([
    ["Ancien nom", "Nouveau nom", "Constat / correctif"],
    ["Standard", "Fantassin", "Déjà l'archétype équilibré de référence — renommage d'affichage seul."],
    ["Rapide", "Cavalier", "Déjà rapide/moins résistant que le Fantassin — renommage d'affichage seul."],
    ["Blindé", "Lourd", "Le cahier est explicite : jamais un tank/véhicule. La silhouette de repli existante (bloc anguleux riveté, sans roue ni tourelle) était déjà conforme — seul le nom affiché change."],
    ["Essaim", "Éclaireur", "Défaut trouvé : vitesse (60) à peine supérieure au Fantassin (55), ne se lisait pas comme \"très rapide\". Corrigée à 125 — nettement devant le Cavalier (95), désormais réellement le plus rapide des 4, tout en restant le plus fragile (10 PV, le plus bas des 4)."],
], [25*mm, 25*mm, 115*mm])
hr()
story.append(PageBreak())

h1("5. Vagues et difficulté (cahier V8, section 8)")
body("Audit contre les tranches voulues par le cahier (découverte sans sanction, premières décisions, premières erreurs punies, milieu de jeu "
     "multi-stratégies, fin de jeu exigeante sans PV absurdes). Constat : la difficulté est déjà pilotée par la COMPOSITION (répartition des 4 "
     "archétypes par palier), la DENSITÉ et le TIMING des vagues, et le NOMBRE de vagues — jamais par une inflation des PV/vitesse des ennemis "
     "(fixes quel que soit le niveau). Conforme à l'exigence explicite du cahier.")
body("Défaut trouvé dans l'OUTIL d'audit lui-même, pas dans le jeu : la batterie de faisabilité (<font face='Courier'>scripts/"
     "simulate_feasibility_v6.mjs</font>) définissait sa stratégie \"équilibrée\" comme \"la famille la moins chère\" — qui est TOUJOURS l'archer, "
     "exactement le premier choix de la stratégie \"priorité cadence/portée\". Sur les 50 niveaux, les deux stratégies construisaient donc "
     "rigoureusement la même composition (que des archers), produisant des résultats identiques partout : la batterie ne testait en réalité que 2 "
     "profils, jamais une vraie composition mixte, contrairement à ce que son propre en-tête revendiquait.")
body("Corrigé : \"équilibrée\" construit désormais la famille la moins REPRÉSENTÉE parmi les tours déjà posées (diversité réelle). Résultat, "
     "bien plus informatif : \"équilibrée\" et \"priorité dégâts\" gagnent à 100% des PV sur les 50 niveaux ; \"priorité cadence/portée\" (qui "
     "retarde volontairement le canon, seule tour avec une vraie synergie de zone au palier 1) ne faiblit QUE sur les niveaux à double chemin — "
     "signal de design SAIN : la variété de chemin stresse réellement une stratégie étroite, tandis que toute stratégie diversifiée ou axée dégâts "
     "reste robuste sur toute la campagne. Aucune donnée de niveau modifiée : seul l'outil de mesure était en cause.")
h2("Aperçu de la composition de la prochaine vague")
body("Ajouté dans la barre de préparation (cahier, section 8 : \"afficher clairement la composition de la prochaine vague\") — une puce compacte par "
     "archétype présent (pastille couleur + effectif), reconstruite uniquement quand la vague à venir change (jamais à chaque frame).")
shot("v8_apercu_vague.png", "Barre de préparation, niveau 3 : aperçu de la composition de la vague à venir (2 archétypes, effectifs affichés).")
hr()

h1("6. Chemins et cartes (cahier V8, section 9)")
body("Audit : sur les niveaux générés à double chemin (tous les 7 niveaux), les deux chemins recevaient EXACTEMENT la même formule de composition/"
     "densité/timing — seul un bruit aléatoire mineur différait. Un niveau \"double chemin\" était donc en réalité une seule vague dessinée deux "
     "fois, jamais un vrai second front créant un choix tactique. Corrigé : le second chemin devient un front secondaire réellement distinct — "
     "composition décalée vers les unités rapides (Cavalier/Éclaireur), effectif réduit à 60% (un front plus léger, jamais nul), ouverture décalée "
     "de 1800ms après le front principal. Jamais appliqué aux niveaux 1-5 hand-conçus (dont le niveau 5 à double chemin garde sa propre conception).")
body("<b>Limite d'assets identifiée</b> (cahier, sections 9 et 10) : \"jusqu'à 3 chemins\" n'est pas réalisable sans un second asset de carte — un "
     "seul tracé de route existe aujourd'hui, donc toute géométrie de chemin supplémentaire ne correspondrait à aucune route réellement dessinée à "
     "l'écran, ce qui contredirait directement le correctif de centrage V7-polish (\"les ennemis doivent rester visuellement centrés sur la "
     "route\"). Non bloquant pour le reste du V8 — détaillé section 9 ci-dessous.")
hr()

h1("7. Interface mobile et progression (cahier V8, section 9)")
body("Audit du sélecteur de construction : une famille de tour non encore débloquée n'apparaissait PAS DU TOUT — le joueur n'avait aucune "
     "visibilité sur l'existence du Canon/de la Catapulte avant leur apparition soudaine à un niveau donné. Corrigé : le sélecteur affiche "
     "désormais TOUJOURS les 3 familles ; les non débloquées apparaissent verrouillées (cadenas + \"Niveau N\" au lieu d'un coût), visuellement "
     "distinctes d'une tour simplement trop chère, pour ne jamais laisser croire au joueur qu'il lui manque seulement de l'argent.")
shot("v8_tours_verrouillees.png", "Sélecteur de construction, niveau 1 : Archer disponible, Canon et Catapulte affichés verrouillés avec leur niveau réel de déblocage.")
body("Audit plus large de la hiérarchie visuelle mobile (HUD groupé, zones de sécurité <font face='Courier'>env()</font>, séparation claire "
     "préparation/action, 3 états de l'écran de sélection des niveaux) : déjà conforme depuis les travaux V3/V6 précédents, aucun autre changement "
     "jugé justifié par l'audit.")
hr()
story.append(PageBreak())

h1("8. Assets (cahier V8, sections 10 et 14)")
h2("8.1 Directement amélioré par code/Canvas cette mission")
bullets([
    "Projectile catapulte : nouveau rendu Canvas (boulet + traînée fixe), remplace un trait fin devenu quasi invisible.",
    "Feedback d'impact : 3 signatures visuelles + 3 signatures sonores distinctes par famille, entièrement procédurales (Canvas/WebAudio).",
    "Panneau de construction : mise en page des lignes verrouillées (cadenas + niveau de déblocage).",
])
h2("8.2 Assets existants réutilisés tels quels")
bullets([
    "Carte Leonardo (<font face='Courier'>assets/map/carte_terrain.jpg</font>) et sprite Canon (<font face='Courier'>canon.png</font>) : inchangés, toujours fonctionnels.",
    "Sprite Archer (<font face='Courier'>tour_rapide_arbalete.png</font>) : inchangé.",
    "Silhouettes Canvas des 4 ennemis (déjà distinctes, déjà non-véhicule pour \"Lourd\") : conservées telles quelles, seul le nom affiché change.",
])
h2("8.3 Ce qui reste limité")
bullets([
    "Catapulte : toujours sans sprite Leonardo propre, rendue en silhouette Canvas (fallback déjà géré par le registre "
    "<font face='Courier'>TOWER_SPRITE_CONFIG</font>, prêt à recevoir un asset sans changement de code).",
    "Les 4 archétypes d'ennemis : tous en silhouette Canvas, aucun sprite Leonardo (registre <font face='Courier'>ENEMY_SPRITE_CONFIG</font> prêt, vide).",
    "Un seul tracé de route existe : toute variété de chemin au-delà de 2 (actuel) nécessite un second asset de carte — voir section 6.",
])
h2("8.4 Liste priorisée des besoins Leonardo pour la suite")
table([
    ["Priorité", "Asset", "Justification"],
    ["Indispensable", "Sprite Catapulte (bras de levier/contrepoids en bois)", "Seule des 3 tours encore sans art dédié ; son identité mécanique vient d'être clarifiée cette mission (artillerie lourde), ce qui permet désormais un brief précis."],
    ["Amélioration", "Sprites des 4 archétypes d'ennemis (Fantassin/Cavalier/Lourd/Éclaireur)", "Les replis Canvas sont déjà fonctionnels et conformes (dont \"Lourd\", explicitement non-véhicule) — un vrai gain visuel, jamais un blocage. Brief \"Lourd\" à rédiger avec la même précision que le cahier (soldat/garde en armure lourde, jamais un tank)."],
    ["Amélioration", "Second asset de carte (chemins multiples/convergents)", "Débloquerait une vraie variété de chemins au-delà de 2 (voir section 6) — non indispensable, le système à 1-2 chemins fonctionne et est testé."],
    ["Inutile pour l'instant", "Sprites de projectiles (flèche/boulet de canon/boulet de catapulte)", "Les replis Canvas sont déjà distincts et lisibles par famille (section 3) ; aucun besoin identifié."],
    ["Inutile pour l'instant", "Sprites/particules d'impact (explosion, poussière)", "Le feedback Canvas différencié par famille (section 5) satisfait déjà les exigences du cahier sans risque de surcharge mobile."],
], [28*mm, 55*mm, 102*mm])
hr()

h1("9. Tests et non-régression")
table([
    ["Bloc", "Résultat"],
    ["Suite unitaire complète (node:test)", "311/311 passants (292 au départ + 19 nouveaux cette mission : identité Catapulte, audit Archer/Canon, non-duplication de monnaie, feedback d'impact par famille, identité des 4 ennemis, aperçu de vague, tours verrouillées, variété des 2 chemins, divergence des stratégies de faisabilité, migration reducedEffects, performance)."],
    ["Batterie de faisabilité (50 niveaux × 3 stratégies, outil corrigé)", "50/50 niveaux faisables — et désormais réellement informative (3 profils distincts, plus 2 accidentellement identiques)."],
    ["Nouveau test de performance (seuil documenté)", "Boucle de simulation pure sous charge réaliste (plateau complet, mélange des 3 familles, vague dense) : largement sous le seuil de 2ms/tick, lui-même largement sous le budget d'une frame 60Hz (16,6ms)."],
    ["Suite mobile/PWA réelle (Playwright, build de production)", "35/35 vérifications passantes : tap tactile réel, verrou d'armement, revente, reprise après rechargement (4 cycles), PWA/service worker (y compris non-péremption du cache), identifiant de build exact, aucun débordement 320-480px."],
    ["Validation d'emprise construction/chemin", "0 violation sur les 50 niveaux (validateAllLevels())."],
], [55*mm, 110*mm])
hr()
story.append(PageBreak())

h1("10. Git, build et déploiement — vérification réelle")
table([
    ["Étape", "Résultat vérifié"],
    ["État de reprise réel (plus récent que le repère du cahier)", "2d2d6ff23aa6589a1f5668c9570037b4321a4320"],
    ["Commits V8 (13, réguliers et explicites)",
     "930ccc3 (identité Catapulte) → 0f1ef1b (tests Catapulte) → 9bccdde (audit Archer/Canon) → a791bad (feedback d'impact) → 26b24eb (tests impact) "
     "→ 636363d (renommage ennemis) → b60c425 (tests ennemis) → e84f1e8 (aperçu de vague) → d5be251 (audit difficulté) → ea0ed89 (tours verrouillées) "
     "→ a0c871f (variété des chemins) → ea64e19 (polish audio) → e734fef (perf + migration)"],
    ["Commit final V8", "e734fef698e63f7a91dc98c313f29b6679f04ea6"],
    ["HEAD local = HEAD distant", "Vérifié par <font face='Courier'>git fetch</font> juste avant ce rapport — 0 commit d'écart dans les deux sens."],
    ["Statut git", "Arbre de travail propre (aucun fichier non commité)."],
    ["Workflow \"Deploy to GitHub Pages\" (run #37)", "Job build (tests + build + suite mobile Playwright) : succès. Job deploy "
     "(<font face='Courier'>actions/deploy-pages@v4</font>) : succès."],
    ["pages_build_version (log brut du job deploy)", "e734fef698e63f7a91dc98c313f29b6679f04ea6 — identique au commit final, vérifié directement dans le "
     "log de la plateforme, jamais supposé."],
    ["Identifiant de build re-vérifié localement", "v0.1.0+e734fef (rebuild local)"],
    ["URL publique (lien de bêta téléphone)", "https://scuillerjack-oss.github.io/bastion-line-v0/"],
], [60*mm, 105*mm])
hr()

h1("11. Limites connues et prochaines étapes")
bullets([
    "<b>Assets Leonardo manquants</b> (Catapulte, 4 archétypes d'ennemis, second tracé de carte) : voir la liste priorisée section 8.4. Les replis "
    "Canvas actuels sont fonctionnels et testés — aucun n'est bloquant pour cette livraison.",
    "<b>Difficulté ressentie</b> : la batterie de faisabilité corrigée garantit l'absence d'impossibilité structurelle et donne un signal de design "
    "cohérent (section 5), jamais la difficulté RESSENTIE par un joueur humain — réservée à la bêta physique.",
    "<b>Nouveau feedback d'impact/micro-secousse/aperçu de vague</b> : vérifiés par capture d'écran réelle et par la suite mobile automatisée "
    "(absence d'erreur console, absence de débordement), mais leur ressenti tactile/sonore réel sur téléphone physique reste, par nature, à "
    "confirmer par la prochaine bêta humaine.",
])
hr()

h1("12. Conclusion")
body("La priorité majeure du cahier V8 (identité des 3 tours) a été traitée en partant d'un audit réel des statistiques en jeu, pas d'une supposition "
     "— révélant que la Catapulte avait l'identité exactement inverse de celle voulue, et corrigeant la cause plutôt qu'un symptôme cosmétique. "
     "Chaque priorité suivante (feedback d'impact, familles d'ennemis, courbe de difficulté, variété des chemins, progression, polish audio) a été "
     "abordée dans le même ordre : auditer le code réel avant toute modification, ne changer que ce que l'audit justifie réellement, et verrouiller "
     "chaque correctif par un test dédié. Un défaut a même été trouvé et corrigé dans l'OUTIL d'audit lui-même (la batterie de faisabilité testait "
     "accidentellement deux fois la même stratégie), conformément à l'exigence explicite du cahier de ne jamais confondre \"faisable pour une "
     "stratégie automatisée\" et \"cohérent pour un joueur humain\".")
body("<b>Conformément à l'instruction explicite du cahier, BASTION LINE V8 n'est PAS déclarée gelée, finalisée ou validée de sa propre initiative.</b> "
     "Ce livrable est une candidate à une nouvelle bêta physique humaine réelle sur téléphone, seule habilitée à juger si les corrections apportées "
     "se ressentent effectivement comme attendu en conditions réelles.")

doc = SimpleDocTemplate(OUT, pagesize=A4, topMargin=18*mm, bottomMargin=18*mm, leftMargin=20*mm, rightMargin=20*mm)
doc.build(story)
print("PDF généré:", OUT)
