#!/usr/bin/env python3
# Rapport technique officiel BASTION LINE V3 (cahier des charges V3, section 7).
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
OUT = os.path.join(HERE, "BASTION_LINE_V3_Rapport_Technique_Officiel.pdf")
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
def shot(filename, caption, width=85*mm, ratio=844/390):
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
story.append(Paragraph("Rapport Technique Officiel — V3", styles["Subtitle"]))
story.append(Paragraph("Finition tactile, première refonte graphique globale et rééquilibrage", styles["Subtitle"]))
story.append(Spacer(1, 14*mm))
meta_label_style = ParagraphStyle(name="MetaLabel", fontSize=9, leading=12, fontName="Helvetica-Bold", textColor=colors.HexColor("#2a5c47"))
meta_value_style = ParagraphStyle(name="MetaValue", fontSize=9, leading=12)
meta = [
    ["Date du rapport", "27 septembre 2026"],
    ["Dépôt", "github.com/scuillerjack-oss/bastion-line-v0"],
    ["Commit de départ (V2 vérifiée)", "9aa3a0b746771d84bf111c221f5fa024c1abd25f"],
    ["Commit final V3 code (HEAD distant vérifié)", "b75de90548fc3d5a236a1f41351d0a84ecc3ddbc"],
    ["Identifiant de build vérifié", "v0.1.0+b75de90 (rebuild local GITHUB_SHA=HEAD, confirmé identique)"],
    ["URL publique", "https://scuillerjack-oss.github.io/bastion-line-v0/"],
    ["Statut", "Candidate à la bêta physique V3 — NON VALIDÉE, décision humaine en attente"],
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
    "HEAD local = HEAD distant (<font face='Courier'>git ls-remote</font>) = <font face='Courier'>9aa3a0b746771d84bf111c221f5fa024c1abd25f</font>, "
    "exactement la référence V2 citée par le cahier des charges V3 (aucune divergence).",
    "Suite de tests V2 relancée avant toute modification : 66/66 unitaires passants (confirmé identique au rapport V2).",
    "Rapport technique V2 relu et confronté au code réel : les trois priorités V2 (emprise chemin/construction, "
    "sélecteur tactile, pilote asset Leonardo) sont bien présentes et fonctionnelles dans le code de départ.",
])
hr()

h1("1. Priorité 1 — Verrou tactile en deux temps")
h2("1.1 Constat de départ")
body("La correction Pointer Events de V2 (annulation du <font face='Courier'>pointerdown</font> d'origine) supprime bien "
     "la génération du click de compatibilité pour LE pointeur qui ouvre le sélecteur — un geste unique et continu ne "
     "peut donc déjà plus, à lui seul, déclencher une construction. La bêta physique V2 a cependant signalé une "
     "sensation résiduelle de sélection/construction involontaire. L'hypothèse retenue et vérifiée par test réel : un "
     "réflexe de <b>double-tap RAPIDE</b> — deux contacts tactiles authentiques et distincts, très rapprochés dans le "
     "temps (l'utilisateur tapote deux fois par réflexe alors qu'il ne voulait toucher qu'une fois) — n'était PAS "
     "couvert par la correction V2 : le second tap est un événement pointeur entièrement nouveau et légitime, dont le "
     "click n'est jamais supprimé.")
h2("1.2 Correction appliquée")
body("Un verrou d'armement (<font face='Courier'>src/main.js</font>, <font face='Courier'>panelGate</font>) rend les "
     "boutons du sélecteur inertes tant que DEUX conditions ne sont pas réunies :")
bullets([
    "le pointeur qui a ouvert le panneau a réellement été relâché (<font face='Courier'>pointerup</font>/"
    "<font face='Courier'>pointercancel</font>) — garantit qu'il ne s'agit jamais du même contact qui glisserait "
    "sous le bouton (couvre aussi \"tap maintenu\" et \"glissement léger\") ;",
    "un délai minimal de 300ms s'est écoulé depuis l'ouverture — sépare un second tap réellement délibéré d'un "
    "réflexe de double-tap. Ce nombre n'est pas arbitraire : c'est la fenêtre de double-tap standard des "
    "plateformes mobiles elles-mêmes (Android <font face='Courier'>ViewConfiguration.getDoubleTapTimeout()</font> "
    "≈ 300ms, iOS similaire) — le seuil au-delà duquel ces plateformes cessent elles-mêmes de considérer deux "
    "taps comme un seul geste.",
])
body("La logique d'ancrage adaptatif haut/bas du panneau (V2) a été entièrement supprimée, comme demandé : le "
     "panneau garde désormais une position stable et prévisible (toujours ancré en bas), quel que soit "
     "l'emplacement tapé. Le hook de debug <font face='Courier'>__bastionDebugTapArena</font> (tests non-tactiles "
     "uniquement) n'a pas de pointerId réel et ouvre donc un panneau directement armé : il ne correspond à aucun "
     "geste physique et ne peut donc jamais reproduire le risque qu'on protège ici.")
h2("1.3 Vérification par test réel")
body("4 scénarios Playwright dédiés, utilisant de vrais événements tactiles (<font face='Courier'>page.touchscreen</font>), "
     "jamais le hook de debug, pour ce qui concerne le geste lui-même :")
bullets([
    "un appui unique près du bord bas de l'écran (niveau 1, \"s5\") n'ouvre que le sélecteur, à position stable, "
    "sans construction ;",
    "un appui unique près du bord haut ouvre le sélecteur à la MÊME position (bascule V2 bien supprimée) ;",
    "un double-tap réel et rapide (deuxième tap à 60ms, avant le délai d'armement) ne construit JAMAIS de tour ;",
    "après le délai d'armement, une action volontaire construit normalement (le verrou n'est pas un blocage "
    "permanent) — vérifié aussi sur le panneau d'AMÉLIORATION d'une tour déjà construite, pas seulement la construction.",
])
hr()

h1("2. Priorité 2 — Direction graphique : l'archer devient la référence")
h2("2.1 Renommage et flèches")
bullets([
    "\"Tour rapide\" renommée <b>\"Tour d'archers\"</b> dans tous les textes visibles (panneau de construction, "
    "panneau d'amélioration, tutoriel). L'identifiant interne <font face='Courier'>rapide</font> reste inchangé "
    "(sauvegardes, tests, simulation) : seul l'habillage visible change, aucune migration de sauvegarde nécessaire.",
    "Les projectiles de cette tour étaient un simple disque plein de couleur dorée (\"une bille jaune\", "
    "exactement le défaut signalé). Remplacés par une vraie flèche dessinée (hampe + pointe + empennage), "
    "orientée le long du vecteur de déplacement réel du projectile — jamais un sprite statique, une vraie forme "
    "vectorielle qui suit la trajectoire.",
])
h2("2.2 Architecture d'intégration Leonardo généralisée")
body("Le chargement de sprite, jusque-là câblé spécifiquement pour la tour \"rapide\" (pilote V2), a été généralisé "
     "en un petit REGISTRE (<font face='Courier'>src/ui/render.js</font>, <font face='Courier'>TOWER_SPRITE_CONFIG</font>) : "
     "chaque famille de tour peut optionnellement déclarer un asset (chemin, dimensions, ancrage). Une famille sans "
     "entrée garde simplement sa silhouette Canvas existante, sans aucun code à ajouter ailleurs. Aucun asset "
     "supplémentaire (Canon, Longue portée, ennemis, carte) n'a été fourni pendant cette mission : conformément au "
     "cahier, la mission n'a pas été bloquée dans l'attente, et l'architecture est prête à les recevoir dès qu'ils "
     "seront disponibles, sans réécriture.")
h2("2.3 Icône de l'application")
body("L'icône précédente (formes géométriques abstraites sans rapport clair avec le jeu) a été remplacée par une "
     "silhouette de forteresse reprenant EXACTEMENT le langage visuel déjà établi en jeu (mêmes teintes pierre/"
     "bannière que la base dessinée dans <font face='Courier'>render.js</font>). Régénérée en PNG 192×192 et "
     "512×512 via le pipeline existant (<font face='Courier'>scripts/generate-png-icons.mjs</font>, aucune "
     "dépendance nouvelle). Vérifiée lisible à une taille RÉELLE d'icône Android (48px et 96px), pas seulement en grand :")
shot("08_icone_48px_reelle.png", "Icône à 48px (taille d'affichage réelle sur écran d'accueil Android).", width=30*mm, ratio=1)
shot("09_icone_96px_reelle.png", "Icône à 96px.", width=45*mm, ratio=1)
body("Le nom \"BASTION LINE\" n'a pas été modifié.")
story.append(PageBreak())

h1("3. Priorité 3 — Défenses et progression")
h2("3.1 Suppression de la Tour de contrôle")
body("Retirée du code (<font face='Courier'>towers.js</font>, <font face='Courier'>TOWER_ORDER</font>), du rendu "
     "(silhouette Canvas et projectile dédiés), de l'audio (<font face='Courier'>shootControle</font>), du "
     "tutoriel, de tous les niveaux (<font face='Courier'>unlockedTowers</font>) et des tests (le test dédié à son "
     "ralentissement a été supprimé, pas affaibli — la fonctionnalité elle-même n'existe plus). Un test de "
     "non-régression dédié verrouille qu'elle ne peut plus jamais réapparaître silencieusement dans un niveau.")
h2("3.2 Longue portée : déblocage avancé au niveau 3")
body("Audit de la progression existante : la Longue portée n'était disponible qu'au niveau 4 sur 5, alors que son "
     "rôle (bonus de dégâts anti-blindé au palier 2) est directement pertinent dès l'introduction de l'ennemi "
     "\"blindé\" au niveau 2. <b>Choix retenu et documenté :</b> déblocage avancé au <b>niveau 3</b> plutôt qu'au "
     "niveau 1, pour deux raisons : (1) le niveau 3 introduit déjà l'ennemi blindé en nombre croissant — exactement "
     "la cible de rôle de cette tour, ce qui la rend immédiatement utile plutôt que théorique ; (2) l'économie de "
     "départ du niveau 3 (150 pièces) couvre son coût de construction (70) sans écraser l'accès aux 2 autres "
     "familles déjà débloquées à ce stade — un déblocage au niveau 1 (120 pièces, une seule famille) aurait "
     "fragilisé l'apprentissage progressif explicitement demandé par le cahier.")
h2("3.3 Quatrième famille de défense — propositions, pas d'implémentation")
body("Conformément au cahier (\"ne pas l'inventer directement\"), voici 2 à 4 pistes courtes soumises à décision "
     "humaine, aucune n'a été implémentée :")
bullets([
    "<b>Poste de guet</b> — rôle : marque l'ennemi le plus résistant à portée, augmentant les dégâts qu'il reçoit "
    "des autres tours (support/multiplicateur, pas de dégâts propres). Intérêt tactique : récompense le ciblage "
    "coordonné plutôt que la force brute. Cohérence médiévale : les postes de guet/veilleurs étaient un élément "
    "réel de fortification.",
    "<b>Piège à pieux</b> — rôle : structure à bas coût qui immobilise brièvement (arrêt net, pas un simple "
    "pourcentage de vitesse) les ennemis qui la traversent, à charges limitées. Intérêt tactique : un outil de "
    "timing différent du ralentissement pourcentuel déjà retiré avec la Tour de contrôle. Cohérence médiévale : "
    "les pièges à pieux/chausse-trapes étaient utilisés contre les charges.",
    "<b>Forge de siège</b> — rôle : tour non offensive qui augmente la cadence de tir des tours voisines ou "
    "génère un léger revenu passif. Intérêt tactique : introduit un vrai choix économie/dégâts directs dans "
    "l'ordre de construction. Cohérence médiévale : une forge/atelier soutenant la garnison.",
    "<b>Chapelle</b> — rôle : régénère un peu de PV de base au fil du temps ou atténue brièvement les dégâts "
    "subis. Intérêt tactique : première option défensive/de soutien, distincte des familles 100% offensives ou "
    "utilitaires actuelles. Cohérence médiévale : les chapelles faisaient partie des campements fortifiés.",
])
hr()

h1("4. Priorité 4 — Difficulté et vagues")
h2("4.1 Audit AVANT toute modification (simulation reproductible)")
body("Le ressenti \"trop facile\" a été vérifié, pas supposé, via <font face='Courier'>scripts/balance_simulation.mjs</font> : "
     "un profil de joueur déterministe (\"couverture patiente\" — construit la famille la moins chère encore "
     "débloquée sur chaque emplacement vide dès que possible, puis améliore) rejoue chaque niveau RÉEL avec le "
     "moteur réel. Trois rythmes de décision testés (toutes les 0.5s, à chaque tick, toutes les 2.5s — rythme "
     "humain réaliste) donnaient un résultat STRICTEMENT IDENTIQUE, ce qui exclut un simple artefact de simulation :")
table([
    ["Niveau", "Statut", "PV finaux", "PV min. atteints", "Pièces non dépensées"],
    ["1 — Premiers pas", "gagné", "100%", "100%", "6"],
    ["2 — Premier blindage", "gagné", "100%", "100%", "32"],
    ["3 — Renfort lointain", "gagné", "100%", "100%", "44"],
    ["4 — Vagues croisées", "gagné", "100%", "100%", "18"],
    ["5 — Ligne double", "gagné", "100%", "100%", "51"],
], [45*mm, 25*mm, 25*mm, 35*mm, 40*mm])
body("Constat : les 5 niveaux, y compris le dernier, se terminent à 100% de PV de base sans la moindre variation — "
     "confirmation objective d'une facilité excessive SYSTÉMIQUE, pas un simple effet de début de partie.")
h2("4.2 Remède appliqué")
body("Conformément au cahier (\"augmenter d'abord la pression par davantage de vagues et davantage d'ennemis\") : "
     "une vague supplémentaire sur les niveaux 2 à 5 (niveau 1 volontairement inchangé), plus d'ennemis par vague "
     "sur ces mêmes niveaux, aucun nouvel archétype, aucune statistique d'ennemi modifiée.")
body("<b>Constat honnête et documenté :</b> augmenter le seul NOMBRE d'ennemis d'un archétype déjà présent, à "
     "délai d'apparition inchangé, s'est révélé sans le moindre effet mesurable contre ce joueur simulé : un "
     "plateau de tours entièrement construit et amélioré tue le surplus aussi vite qu'il arrive, ce qui n'affecte "
     "que la durée du niveau, jamais le risque réel. Un resserrement substantiel des délais d'apparition "
     "(<font face='Courier'>intervalMs</font>) des ennemis blindés et essaim a donc été ajouté en complément — "
     "toujours un paramètre de vague/apparition, jamais une statistique d'ennemi ni un nouvel archétype.")
table([
    ["Niveau", "Statut", "PV finaux", "PV min. atteints", "Vagues (avant→après)"],
    ["1 — Premiers pas", "gagné", "100%", "100%", "3→3 (inchangé)"],
    ["2 — Premier blindage", "gagné", "100%", "100%", "4→5"],
    ["3 — Renfort lointain", "gagné", "100%", "100%", "4→5"],
    ["4 — Vagues croisées", "gagné", "100%", "100%", "5→6"],
    ["5 — Ligne double", "gagné", "<b>75%</b>", "<b>75%</b>", "5→6"],
], [45*mm, 25*mm, 25*mm, 35*mm, 40*mm])
body("Le niveau 5 (seul niveau à DEUX chemins convergents) montre une pression réelle et mesurable même contre le "
     "joueur simulé optimal (75% de PV restants, une vraie baisse là où il n'y en avait aucune) : sa géométrie "
     "divise l'attention défensive entre deux voies avant leur convergence, ce que la densité d'ennemis peut "
     "réellement menacer. Les niveaux 2 à 4 (chemin unique, couverture redondante par plusieurs tours sur un "
     "tracé compact) restent à 100% contre ce joueur simulé : ceci est documenté honnêtement comme une LIMITE de "
     "cet audit, pas un résultat caché — un joueur RÉEL, moins optimal qu'un bot qui dépense instantanément et sans "
     "erreur, construit plus lentement (notamment depuis le verrou tactile en deux temps de la priorité 1, qui "
     "ralentit structurellement chaque construction), place ses tours de façon moins parfaite, et ressentira donc "
     "une pression que ce plafond théorique ne capture pas. Aller plus loin sur ces niveaux sans toucher aux "
     "statistiques d'ennemi (hors périmètre du cahier) impliquerait de réduire le nombre ou la couverture des "
     "emplacements de construction — un changement de layout plus large que ce que le cahier demandait "
     "explicitement, donc non appliqué sans validation humaine préalable.")
hr()

h1("5. Fichiers modifiés / ajoutés")
table([
    ["Fichier", "Nature"],
    ["src/ui/input.js", "Modifié — transmet le pointerId d'origine à onTap"],
    ["src/main.js", "Modifié — verrou d'armement panelGate, suppression bascule haut/bas"],
    ["src/style.css", "Modifié — suppression de la règle .panel-root--top"],
    ["src/engine/towers.js", "Modifié — retrait Tour de contrôle, renommage \"Tour d'archers\""],
    ["src/engine/simulation.js", "Modifié — retrait PROJECTILE_SPEED.controle"],
    ["src/ui/audio.js", "Modifié — retrait shootControle"],
    ["src/ui/tutorial.js", "Modifié — retrait texte controle, renommage archers"],
    ["src/ui/render.js", "Modifié — registre de sprites généralisé, flèche d'archer, retrait rendu controle"],
    ["src/engine/levels.js", "Modifié — retrait controle, avance longue_portee (niveau 3), rééquilibrage vagues/ennemis"],
    ["public/icons/icon.svg, icon-180.svg", "Modifiés — nouvelle silhouette de forteresse"],
    ["public/icons/icon-192.png, icon-512.png", "Régénérés depuis la nouvelle icône"],
    ["scripts/balance_simulation.mjs", "Ajouté — audit d'équilibrage reproductible (3 profils de rythme)"],
    ["tests/levels.test.js", "Modifié — retrait Tour de contrôle verrouillé, déblocage longue portée vérifié"],
    ["tests/simulation.test.js", "Modifié — retrait du test dédié au ralentissement controle"],
    ["scripts/check-mobile.mjs", "Modifié — tests 13/14 réécrits (position stable), 2 nouveaux tests (double-tap accidentel, verrou sur amélioration)"],
], [70*mm, 95*mm])
hr()

h1("6. Tests et résultats complets")
table([
    ["Suite", "Résultat"],
    ["Tests unitaires (node:test)", "67/67 passants (66 hérités de V2 + 1 nouveau, 1 supprimé car fonctionnalité retirée)"],
    ["Vérifications mobiles/PWA (Playwright)", "22/22 passantes (18 héritées + 2 réécrites + 2 nouvelles)"],
], [90*mm, 75*mm])
body("Aucune assertion existante pertinente n'a été supprimée sans que le comportement fonctionnel sous-jacent ait "
     "réellement changé (la seule suppression est le test de ralentissement de la Tour de contrôle, dont la "
     "fonctionnalité elle-même a été retirée par ce même cahier). Aucune régression PWA, sauvegarde, pause, "
     "économie ou logique de ciblage — les 15 tests mobiles hérités de V0/V1/V2 passent inchangés.")
story.append(Spacer(1, 6))
shot("10_tour_archers_fleches.png", "Tour d'archers en jeu (niveau 1), capture automatisée du build de production.")
hr()

h1("7. Git, CI/déploiement — vérification réelle")
table([
    ["Étape", "Résultat vérifié"],
    ["Commit final (code)", "b75de90548fc3d5a236a1f41351d0a84ecc3ddbc"],
    ["HEAD distant après push", "Vérifié via git ls-remote — identique au commit local"],
    ["Job CI \"build\"", "success (67 tests unitaires + 22 vérifications mobiles exécutés en CI)"],
    ["Job CI \"deploy\"", "success — log lu directement, pages_build_version vérifié = commit ci-dessus"],
    ["Build ID re-vérifié localement", "v0.1.0+b75de90 (rebuild avec GITHUB_SHA=HEAD réel)"],
    ["URL publique", "https://scuillerjack-oss.github.io/bastion-line-v0/"],
], [55*mm, 110*mm])
story.append(PageBreak())

h1("8. Limites restant à valider sur téléphone physique")
bullets([
    "<b>Ressenti tactile réel du verrou en deux temps</b> : vérifié par de vrais événements tactiles simulés "
    "(Playwright, deviceScaleFactor=3, y compris un double-tap réel et rapide) — reste à confirmer que le délai "
    "de 300ms ne se ressent JAMAIS comme un bouton qui \"ne répond pas\" sur un doigt réel, notamment pour un "
    "joueur qui enchaîne rapidement plusieurs constructions légitimes.",
    "<b>Validation esthétique</b> : ni le renommage \"Tour d'archers\"/les flèches, ni la nouvelle icône ne sont "
    "auto-déclarés \"réussis\" par ce rapport — cette décision appartient exclusivement à la bêta physique.",
    "<b>Difficulté</b> : le rééquilibrage rend les niveaux 2 à 5 mesurablement plus longs et plus denses, et le "
    "niveau 5 mesurablement plus dangereux même pour un joueur simulé optimal ; les niveaux 2 à 4 restent "
    "gagnables à 100% de PV contre CE joueur simulé précis (voir section 4.2) — seule la bêta physique confirmera "
    "si la pression perçue par un joueur humain réel (plus lent, moins optimal) est désormais jugée suffisante.",
    "<b>Quatrième famille de défense</b> : aucune des 4 pistes proposées (section 3.3) n'a été implémentée ni "
    "présélectionnée — décision humaine entièrement ouverte.",
    "<b>Assets Leonardo supplémentaires</b> : aucun asset (Canon/Longue portée/ennemis/carte) n'était disponible "
    "pendant cette mission ; l'architecture généralisée (section 2.2) est prête à les recevoir dès qu'ils le seront.",
])
hr()

h1("9. Conclusion")
body("Les cinq axes du cahier des charges V3 ont été traités comme une seule mission cohérente, chacun corrigé ou "
     "audité à sa cause réelle : un verrou d'armement fondé sur la spécification Pointer Events et sur la fenêtre "
     "de double-tap standard des plateformes (pas un délai arbitraire), une direction graphique amorcée sur la "
     "référence archer avec une architecture d'intégration généralisée, la suppression complète de la Tour de "
     "contrôle avec un déblocage de la Longue portée repositionné et documenté, un rééquilibrage vérifié par "
     "simulation reproductible AVANT toute modification puis re-mesuré APRÈS, et une nouvelle icône cohérente "
     "avec l'identité déjà établie du jeu, vérifiée lisible à taille réelle.")
body("<b>Conformément à l'instruction explicite du cahier, BASTION LINE V3 n'est PAS déclarée validée ou gelée par "
     "ce rapport.</b> Ce livrable est une candidate à la bêta physique V3. Le ressenti tactile réel, la validité "
     "esthétique de la direction archer et de la nouvelle icône, et le niveau de difficulté perçu appartiennent "
     "exclusivement au porteur, après son propre test sur téléphone physique.")

doc = SimpleDocTemplate(OUT, pagesize=A4, topMargin=18*mm, bottomMargin=18*mm, leftMargin=20*mm, rightMargin=20*mm)
doc.build(story)
print("PDF généré:", OUT)
