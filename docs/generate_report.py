#!/usr/bin/env python3
# Génère le rapport technique officiel BASTION LINE V0 (PDF), à partir des
# résultats réels de cette session (tests, CI, études). Usage ponctuel, pas
# un script de production.
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
OUT = os.path.join(HERE, "BASTION_LINE_V0_Rapport_Technique_Officiel.pdf")
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
def small(text): story.append(Paragraph(text, styles["Small"]))
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

# --- Page de titre ---
story.append(Spacer(1, 40*mm))
story.append(Paragraph("BASTION LINE", styles["TitleBig"]))
story.append(Paragraph("Rapport Technique Officiel — Prototype V0", styles["Subtitle"]))
story.append(Paragraph("Tower Defense mobile compact (Projet 6)", styles["Subtitle"]))
story.append(Spacer(1, 20*mm))
meta = [
    ["Date du rapport", "25 septembre 2026"],
    ["Dépôt", "github.com/scuillerjack-oss/bastion-line-v0"],
    ["Commit vérifié (HEAD réel distant)", "46f41f1fd9dc97be447524b2f099d79a519c4b5a"],
    ["Identifiant de build vérifié", "v0.1.0+46f41f1 (rebuild local avec GITHUB_SHA=HEAD, confirmé identique)"],
    ["Statut", "V0 complète — décision V1 en attente de la bêta physique du porteur"],
]
t = Table(meta, colWidths=[65*mm, 100*mm])
t.setStyle(TableStyle([
    ("FONTSIZE", (0,0), (-1,-1), 9.5),
    ("TEXTCOLOR", (0,0), (0,-1), colors.HexColor("#2a5c47")),
    ("FONTNAME", (0,0), (0,-1), "Helvetica-Bold"),
    ("BOTTOMPADDING", (0,0), (-1,-1), 6),
    ("TOPPADDING", (0,0), (-1,-1), 6),
    ("LINEBELOW", (0,0), (-1,-1), 0.4, colors.HexColor("#dddddd")),
]))
story.append(t)
story.append(PageBreak())

# --- 1. Résumé exécutif ---
h1("1. Résumé exécutif")
body("BASTION LINE V0 est un prototype mobile de Tower Defense en portrait, strictement borné à 5 niveaux, "
     "conçu pour valider une seule question : est-ce que construire/améliorer des tours et observer la défense "
     "fonctionner est suffisamment satisfaisant pour donner envie d'un niveau suivant ? Aucune fonctionnalité "
     "hors de ce périmètre (méta-progression, boutique, cartes roguelite, campagne longue) n'a été ajoutée, "
     "conformément au cahier des charges.")
body("Le moteur de jeu, l'interface tactile, l'audio procédural, les 5 niveaux, la suite de tests automatisés "
     "(47 tests unitaires + 15 vérifications mobiles/PWA) et le pipeline CI/CD sont fonctionnels et vérifiés. "
     "Le dépôt Git est distinct de tous les autres projets du porteur, comme explicitement exigé.")
body("<b>Point d'honnêteté à ne pas dissimuler :</b> le déploiement GitHub Pages n'est pas encore actif "
     "(GitHub Pages doit être activé manuellement par le porteur, une action hors de portée de l'intégration "
     "GitHub utilisée par cet agent) — voir section 6. L'étude économique (section 8) conclut par ailleurs "
     "qu'aucun scénario de monétisation ne serait rentable à l'échelle actuelle d'un prototype non testé : "
     "ce n'est pas présenté comme un succès commercial, seulement comme une validation de jouabilité.")
hr()

# --- 2. Périmètre respecté ---
h1("2. Respect du périmètre V0")
bullets([
    "5 niveaux seulement (pas 100), progression perceptible des 4 familles de tours introduites une par une.",
    "Aucune méta-progression, boutique, carte roguelite ou arbre technologique implémentés en V0.",
    "Aucune intégration publicitaire, SDK ou paiement réel — aucune monétisation n'est câblée dans le code.",
    "Architecture propre (moteur pur séparé de l'UI) pensée pour une extension V1 sans réécriture.",
    "Dépôt Git entièrement séparé des autres projets du porteur (breakpoint-v0, etc.) — aucun autre jeu n'a été touché.",
])
hr()

# --- 3. Architecture technique ---
h1("3. Architecture technique")
h2("3.1 Moteur de simulation")
body("Boucle à pas fixe (<font face='Courier'>tick(state, dtMs)</font>) pilotée par un accumulateur "
     "requestAnimationFrame, plafonné pour absorber les sauts de frame. Les actions ponctuelles du joueur "
     "(construire, améliorer, lancer la vague en avance) sont appliquées immédiatement en dehors du tick, "
     "jamais mises en file d'attente.")
h2("3.2 Quatre familles de tours à identité perceptible")
tow = [
    ["Famille", "Rôle", "Coût", "Ce qui change à l'amélioration"],
    ["Rapide", "Cadence très élevée, dégâts faibles", "40", "Cadence encore plus dense (mitraillage)"],
    ["Canon", "Zone d'effet, cadence lente", "65", "Rayon de zone augmenté"],
    ["Longue portée", "Très grande portée, dégâts ciblés élevés", "70", "Bonus dégâts anti-blindé débloqué au palier 2"],
    ["Contrôle", "Ralentit, synergie avec les autres tours", "50", "Ralentissement en zone débloqué au palier 2"],
]
tt = Table(tow, colWidths=[28*mm, 55*mm, 16*mm, 66*mm])
tt.setStyle(TableStyle([
    ("FONTSIZE", (0,0), (-1,-1), 8.5),
    ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#e8f0ea")),
    ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
    ("GRID", (0,0), (-1,-1), 0.4, colors.HexColor("#cccccc")),
    ("VALIGN", (0,0), (-1,-1), "TOP"),
    ("TOPPADDING", (0,0), (-1,-1), 4),
    ("BOTTOMPADDING", (0,0), (-1,-1), 4),
]))
story.append(tt)
story.append(Spacer(1, 8))
h2("3.3 Quatre archétypes d'ennemis")
body("Standard, rapide, blindé (résiste mieux, cible naturelle des tours longue portée), essaim "
     "(nombreux et faibles). Le ciblage des tours suit la priorité \"ennemi le plus avancé dans sa "
     "propre trajectoire\" — déterministe et testable.")
h2("3.4 PWA et audio")
body("Manifest + service worker \"network-first sauf assets versionnés par hash\" pour garantir qu'un "
     "onglet ouvert ne sert jamais une version périmée. Audio 100% procédural (Web Audio, zéro asset "
     "externe — aucune question de droits), avec contrôles de coupure séparés musique/effets, et un hook "
     "de debug garantissant qu'un seul AudioContext n'est jamais créé qu'une fois.")
story.append(PageBreak())

# --- 4. Niveaux ---
h1("4. Les 5 niveaux du prototype")
lv = [
    ["Niveau", "Nom", "Tours débloquées", "Nouveauté"],
    ["1", "Premiers pas", "Rapide", "Démonstration, chemin unique en S"],
    ["2", "—", "+ Canon", "+ ennemi blindé"],
    ["3", "—", "+ Contrôle", "+ ennemi essaim"],
    ["4", "—", "+ Longue portée (4 familles réunies)", "Mélange complet d'ennemis"],
    ["5", "—", "4 familles", "Deux chemins convergents vers la base"],
]
lt = Table(lv, colWidths=[16*mm, 30*mm, 62*mm, 57*mm])
lt.setStyle(TableStyle([
    ("FONTSIZE", (0,0), (-1,-1), 8.5),
    ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#e8f0ea")),
    ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
    ("GRID", (0,0), (-1,-1), 0.4, colors.HexColor("#cccccc")),
    ("TOPPADDING", (0,0), (-1,-1), 4),
    ("BOTTOMPADDING", (0,0), (-1,-1), 4),
]))
story.append(lt)
body("Chaque niveau a été vérifié algorithmiquement comme terminable sans blocage permanent, y compris "
     "sous une stratégie de jeu patiente (construction/amélioration progressives, jamais un rush qui "
     "priverait le joueur du temps de préparation prévu).")
hr()

# --- 5. Captures d'écran ---
h1("5. Aperçu visuel du prototype")
shot("02_niveau1_prep.png", "Niveau 1 — phase de préparation : carte entièrement visible, base et emplacements de construction lisibles, minuterie de préparation avec lancement anticipé.")
story.append(Spacer(1, 6))
shot("03_panneau_construction.png", "Panneau de construction (feuille du bas) — coût et description affichés avant de choisir une famille de tour.")
story.append(PageBreak())
shot("05_vague_en_cours.png", "Vague en cours : ennemis progressant automatiquement le long du chemin, tours déjà construites visibles.")
story.append(Spacer(1, 6))
shot("06_panneau_amelioration.png", "Panneau d'amélioration avec anneau de portée affiché sur la carte — l'arbitrage construire/améliorer est visible directement en jeu.")
story.append(PageBreak())

# --- 6. Tests et CI/CD ---
h1("6. Tests, intégration continue et déploiement")
h2("6.1 Tests automatisés")
bullets([
    "47/47 tests unitaires (node:test) : chemin/multi-entrées, ciblage/portée/cadence/zone/ralentissement, "
    "coûts/gains/améliorations, minuterie de vague + lancement anticipé, victoire/défaite/redémarrage, "
    "persistance des tutoriels vus, terminabilité des 5 niveaux sans blocage.",
    "15 vérifications mobiles/PWA (Playwright) : absence de débordement sur 5 largeurs (320-480px), cycle "
    "tactile construire+améliorer sans erreur console, pause automatique sur perte de focus, redimensionnement/"
    "rotation, persistance après rechargement complet, manifest/icônes/service worker valides, le service "
    "worker ne sert jamais une version périmée (testé en empoisonnant délibérément une entrée de cache), "
    "cycle de vie audio à un seul AudioContext, identifiant de build exact, rechargement automatique sur "
    "prise de contrôle d'un nouveau service worker.",
])
h2("6.2 Vérification CI au niveau JOB (pas seulement le statut du workflow)")
body("Run le plus récent (commit 46f41f1, poussé lors de cette session) :")
ci = [
    ["Job", "Conclusion", "Détail"],
    ["build", "success", "npm ci, npm test (47/47), npm run build, installation Chromium, npm run test:mobile (15/15)"],
    ["deploy", "failure", "404 Not Found — GitHub Pages n'est pas encore activé pour ce dépôt (voir 6.3)"],
]
ct = Table(ci, colWidths=[22*mm, 22*mm, 121*mm])
ct.setStyle(TableStyle([
    ("FONTSIZE", (0,0), (-1,-1), 8.5),
    ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#e8f0ea")),
    ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
    ("GRID", (0,0), (-1,-1), 0.4, colors.HexColor("#cccccc")),
    ("TOPPADDING", (0,0), (-1,-1), 4),
    ("BOTTOMPADDING", (0,0), (-1,-1), 4),
]))
story.append(ct)
h2("6.3 Limite honnête : déploiement public non encore actif")
body("Le job <font face='Courier'>build</font> passe intégralement à chaque commit (tests + build + tests "
     "mobiles), confirmant que le code est sain. Le job <font face='Courier'>deploy</font> échoue avec une "
     "erreur 404 explicite : <i>\"Ensure GitHub Pages has been enabled\"</i>. L'intégration GitHub utilisée "
     "par cet agent n'a pas les droits d'administration nécessaires pour activer Pages via l'API (seule la "
     "création/modification de contenu est autorisée). <b>Action requise du porteur, une seule fois :</b> "
     "<font face='Courier'>Settings → Pages → Source: GitHub Actions</font> sur la page des paramètres du "
     "dépôt. Une fois activé, le déploiement se fera automatiquement au prochain commit ou en relançant le "
     "workflow, sans autre intervention.")
h2("6.4 Vérification de l'état distant réel (jamais supposée)")
body("Conformément à l'exigence du cahier (\"ne jamais considérer une sauvegarde distante comme réussie "
     "simplement parce qu'une commande de push a été lancée\"), chaque push de cette session a été suivi "
     "d'une vérification indépendante via <font face='Courier'>git ls-remote</font>, confirmant que le HEAD "
     "distant réel correspondait bien au commit local attendu — y compris après un avertissement de "
     "négociation de push qui aurait pu, sans cette vérification, masquer un échec silencieux.")
story.append(PageBreak())

# --- 7. Étude de marché ---
h1("7. Étude de marché (résumé)")
body("Étude complète : <font face='Courier'>docs/ETUDE_MARCHE.md</font>. Trois jeux comparables ont été "
     "analysés à partir de sources publiques datées (Kingdom Rush, Bloons TD 6, Realm Defense: Hero Legends "
     "TD), à des fins d'inspiration structurelle uniquement — aucun contenu n'a été copié.")
bullets([
    "Structure en niveaux discrets + vagues prédéfinies (Kingdom Rush) : confirme le choix déjà fait pour BASTION LINE.",
    "Peu de familles de tours à identité reconnaissable plutôt qu'un grand nombre de variantes similaires (Bloons TD 6).",
    "Continuation optionnelle par vidéo récompensée : mécanique courante en F2P TD (Realm Defense), cohérente avec "
    "une future monétisation légère et plafonnée, mais non implémentée en V0.",
    "Aucune donnée de rétention ou de session sourcée spécifiquement pour le genre Tower Defense mobile n'a été "
    "trouvée : les extrapolations utilisées dans l'étude économique (section 8) sont explicitement des hypothèses, "
    "pas des faits.",
])
hr()

# --- 8. Étude économique ---
h1("8. Étude économique chiffrée (résumé)")
body("Étude complète et modèle reproductible : <font face='Courier'>docs/ETUDE_ECONOMIQUE.md</font> et "
     "<font face='Courier'>docs/economics/bastion_v0_model.mjs</font>. Trois scénarios prospectifs (léger, "
     "équilibré, plus monétisé) ont été comparés sur trois volumes d'audience (500 / 5 000 / 50 000 MAU), "
     "avec des paramètres sourcés (eCPM publicitaire, CPI) clairement séparés des hypothèses non vérifiées "
     "(fréquence de session, fenêtre d'activité).")
eco = [
    ["Scénario", "Revenu/MAU/mois (est.)", "Retour sur investissement d'une UA plafonnée (est.)"],
    ["Léger", "0,021 $", "~210 mois"],
    ["Équilibré", "0,061 $", "~73 mois"],
    ["Plus monétisé", "0,099 $", "~45 mois"],
]
et = Table(eco, colWidths=[35*mm, 50*mm, 80*mm])
et.setStyle(TableStyle([
    ("FONTSIZE", (0,0), (-1,-1), 8.5),
    ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#e8f0ea")),
    ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
    ("GRID", (0,0), (-1,-1), 0.4, colors.HexColor("#cccccc")),
    ("TOPPADDING", (0,0), (-1,-1), 4),
    ("BOTTOMPADDING", (0,0), (-1,-1), 4),
]))
story.append(et)
story.append(Spacer(1, 8))
body("<b>Constat honnête, non édulcoré :</b> aucun des trois scénarios ne rendrait une dépense d'acquisition "
     "payante plafonnée rentable dans un délai raisonnable à l'échelle actuelle du prototype — le retour sur "
     "investissement dépasse largement la fenêtre d'activité utilisateur supposée (3 mois) dans les trois cas. "
     "Ce n'est pas un défaut d'implémentation : cela signifie que la monétisation payante n'a de sens qu'après "
     "une croissance organique significative, jamais comme moteur de croissance initial pour ce prototype. "
     "Les coûts fixes actuels sont nuls (architecture 100% statique, hébergement gratuit), ce qui rend le calcul "
     "de seuil de rentabilité classique non informatif — la vraie question économique est traitée à la place "
     "(rentabilité d'une dépense d'acquisition plafonnée).")
story.append(PageBreak())

# --- 9. Limites connues et décisions en attente ---
h1("9. Limites connues et décisions en attente")
bullets([
    "Déploiement GitHub Pages non encore actif — action manuelle requise du porteur (section 6.3), le code lui-même est vérifié sain.",
    "Aucune monétisation implémentée (volontaire) — les scénarios de la section 8 sont prospectifs, non validés, non à activer automatiquement.",
    "Hypothèses de fréquence de session et de rétention non sourcées spécifiquement pour le Tower Defense mobile — à recalibrer avec de vraies données dès que la bêta produira des chiffres réels.",
    "Aucun développement V1 n'a été entamé au-delà des livrables V0 explicitement demandés — la décision de poursuivre appartient au porteur, après sa propre bêta sur téléphone physique.",
])
hr()

# --- 10. Conclusion ---
h1("10. Conclusion")
body("BASTION LINE V0 remplit son objectif déclaré : un prototype compact, propre, testé et documenté, "
     "permettant de juger si la boucle centrale (construire, améliorer, observer la défense) est "
     "suffisamment satisfaisante pour justifier une V1. Le code, les tests et les études sont livrés tels "
     "quels, avec leurs limites explicitement documentées plutôt que dissimulées. <b>La décision de geler "
     "cette V0 et de lancer une V1 appartient exclusivement au porteur du projet, après sa propre bêta sur "
     "téléphone physique.</b>")

doc = SimpleDocTemplate(OUT, pagesize=A4, topMargin=18*mm, bottomMargin=18*mm, leftMargin=20*mm, rightMargin=20*mm)
doc.build(story)
print("PDF généré:", OUT)
