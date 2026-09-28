#!/usr/bin/env python3
# Rapport économique officiel BASTION LINE (mission d'étude dédiée, en parallèle du cahier V5).
# Étude uniquement -- aucune monétisation n'est intégrée au jeu par ce document ni par cette mission.
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, ListFlowable, ListItem, HRFlowable
)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "BASTION_LINE_Rapport_Economique_Officiel.pdf")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="TitleBig", fontSize=21, leading=27, alignment=TA_CENTER, spaceAfter=6, textColor=colors.HexColor("#1b3a2f")))
styles.add(ParagraphStyle(name="Subtitle", fontSize=11.5, leading=15, alignment=TA_CENTER, textColor=colors.HexColor("#555555"), spaceAfter=16))
styles.add(ParagraphStyle(name="H1", fontSize=14.5, leading=18, spaceBefore=13, spaceAfter=7, textColor=colors.HexColor("#1b3a2f")))
styles.add(ParagraphStyle(name="H2", fontSize=11.5, leading=15, spaceBefore=9, spaceAfter=5, textColor=colors.HexColor("#2a5c47")))
styles.add(ParagraphStyle(name="Body", fontSize=9.5, leading=13.5, spaceAfter=5))
styles.add(ParagraphStyle(name="Small", fontSize=8, leading=10.5, textColor=colors.HexColor("#777777"), spaceAfter=4))

story = []
def h1(t): story.append(Paragraph(t, styles["H1"]))
def h2(t): story.append(Paragraph(t, styles["H2"]))
def body(t): story.append(Paragraph(t, styles["Body"]))
def small(t): story.append(Paragraph(t, styles["Small"]))
def bullets(items): story.append(ListFlowable([ListItem(Paragraph(i, styles["Body"])) for i in items], bulletType="bullet", leftIndent=14))
def hr(): story.append(HRFlowable(width="100%", thickness=0.6, color=colors.HexColor("#cccccc"), spaceBefore=5, spaceAfter=9))
def table(rows, widths, font_size=8):
    cell_style = ParagraphStyle(name="Cell", fontSize=font_size, leading=font_size + 2.5)
    header_style = ParagraphStyle(name="CellHeader", fontSize=font_size, leading=font_size + 2.5, fontName="Helvetica-Bold", textColor=colors.white)
    wrapped = [
        [Paragraph(str(cell), header_style if r == 0 else cell_style) for cell in row]
        for r, row in enumerate(rows)
    ]
    t = Table(wrapped, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#1b3a2f")),
        ("GRID", (0,0), (-1,-1), 0.4, colors.HexColor("#cccccc")),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("TOPPADDING", (0,0), (-1,-1), 3.5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 3.5),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#f4f7f5")]),
    ]))
    story.append(t)
    story.append(Spacer(1, 6))

# ---------------------------------------------------------------------------
story.append(Spacer(1, 26*mm))
story.append(Paragraph("BASTION LINE", styles["TitleBig"]))
story.append(Paragraph("Rapport Économique Officiel", styles["Subtitle"]))
story.append(Paragraph("Marché, modèle de monétisation et viabilité — étude, aucune intégration", styles["Subtitle"]))
story.append(Spacer(1, 12*mm))
meta_label = ParagraphStyle(name="ML", fontSize=9, leading=12, fontName="Helvetica-Bold", textColor=colors.HexColor("#2a5c47"))
meta_val = ParagraphStyle(name="MV", fontSize=9, leading=12)
meta = [
    ["Date de la recherche et du rapport", "28 septembre 2026"],
    ["Mission", "Étude économique dédiée, menée en parallèle de BASTION LINE V5"],
    ["Portée", "Étude uniquement — aucune publicité, SDK, IAP ou paiement intégré au jeu"],
    ["Règle absolue du propriétaire", "Le modèle ne doit jamais pouvoir devenir structurellement déficitaire à mesure que le nombre de joueurs augmente"],
    ["Statut", "Recommandations à réauditer avec des données réelles avant toute transformation Android/AAB"],
]
mt = Table([[Paragraph(k, meta_label), Paragraph(v, meta_val)] for k, v in meta], colWidths=[58*mm, 107*mm])
mt.setStyle(TableStyle([("BOTTOMPADDING",(0,0),(-1,-1),6),("TOPPADDING",(0,0),(-1,-1),6),("VALIGN",(0,0),(-1,-1),"TOP"),("LINEBELOW",(0,0),(-1,-1),0.4,colors.HexColor("#dddddd"))]))
story.append(mt)
story.append(PageBreak())

h1("1. Méthodologie")
bullets([
    "Recherche web réalisée le 28 septembre 2026 (requêtes multiples, sources ci-dessous), centrée sur des données "
    "2025-2026 explicitement datées lorsque la source le permettait.",
    "Distinction stricte entre <b>faits observés</b> (sourcés, cités), <b>hypothèses</b> (posées explicitement, "
    "modifiables, jamais présentées comme certaines) et <b>recommandations</b> (choix proposés pour BASTION LINE, "
    "pas une décision imposée).",
    "Aucun taux de conversion, eCPM, ARPDAU ou rétention n'a été inventé : toute valeur utilisée dans le modèle "
    "chiffré est soit directement sourcée, soit dérivée par une fourchette prudente/centrale/haute autour d'une "
    "source, avec la source citée dans chaque cas.",
    "BASTION LINE V4 n'a, à ce jour, AUCUNE monétisation intégrée (pas de publicité, pas d'IAP, pas de compte "
    "utilisateur, pas de backend serveur) : le jeu tourne entièrement côté client (PWA statique, sauvegarde "
    "locale). Ce rapport évalue des options FUTURES, non implémentées par cette mission.",
])
hr()

h1("2. Comparables de marché (tower defense mobile)")
body("Recherche non limitée aux titres les plus connus ; les exemples ci-dessous couvrent premium, free-to-play "
     "hybride et jeu gratuit sans publicité.")
table([
    ["Jeu", "Modèle observé", "Détail vérifiable"],
    ["Bloons TD 6", "Premium (paiement unique)",
     "0,99 $ sur mobile (peut varier selon promotions/plateformes) ; contenu important pour ce prix ; "
     "monétisation additionnelle minimale rapportée."],
    ["Kingdom Rush (opus historiques)", "Free-to-play sans publicité forcée",
     "Gratuit sur mobile, sans publicités interruptives ni progression bloquée par paiement, selon les sources consultées."],
    ["Kingdom Rush 6: Genesis TD", "Premium (nouveau, 2026)",
     "Annoncé en paiement unique plutôt qu'en F2P ; pas de publicités forcées pendant la campagne, "
     "progression non structurée autour du paiement."],
    ["Empire Warriors: Tower Defense", "Free-to-play hybride (pub + IAP)",
     "Récompenses de démarrage en monnaies virtuelles ; emplacements publicitaires récompensés multiples ; "
     "bundles quotidiens/hebdomadaires ; des retours joueurs signalent une progression ressentie comme freinée "
     "sans visionnage de publicités récompensées (risque de design à éviter, voir section 4)."],
    ["Rush Royale, Plants vs. Zombies 2, Tower Defense Simulator", "Hybride avec systèmes additionnels",
     "Combinent la boucle tower defense avec collection, PvP/coopératif, événements ou progression long terme -- "
     "moins directement comparables à la boucle mono-joueur actuelle de BASTION LINE, cités pour situer l'étendue du marché."],
], [48*mm, 45*mm, 82*mm])
small("Sources : Android Authority (\"15 best Android tower defense games\") ; playnforge.com (\"Best Tower Defense Games in 2025\") ; "
      "2upskill.com (\"Kingdom Rush 6 iOS Free: Release Date, Pricing\") ; Google Play (fiche Empire Warriors: Tower Defense) ; "
      "switchbladegaming.com (\"15 Tower Defense Games Worth Playing in 2026\"). Recherche du 28 septembre 2026.")
h2("Conclusion de l'audit de marché")
body("Le marché du tower defense mobile n'impose PAS un modèle publicitaire agressif : les titres les plus "
     "respectés du genre (Bloons TD 6, Kingdom Rush) réussissent avec un modèle premium ou gratuit sans "
     "publicité forcée. À l'inverse, les titres fortement hybrides (Empire Warriors) montrent le risque concret "
     "d'un design perçu comme punitif lorsque la progression dépend trop des publicités récompensées. "
     "<b>Recommandation :</b> BASTION LINE devrait privilégier un modèle où la publicité reste strictement "
     "optionnelle et bénéfique (jamais une contrainte de progression), cohérent avec l'identité \"jeu complet, "
     "respectueux du joueur\" déjà établie dans les cahiers V0-V4.")
hr()
story.append(PageBreak())

h1("3. Options de monétisation étudiées")
table([
    ["Piste", "Analyse", "Recommandation V5"],
    ["Interstitiels", "Efficaces en revenu (eCPM le plus élevé après rewarded) mais risque de frustration réel si mal cadencés.",
     "Autorisés UNIQUEMENT entre une fin de niveau et le menu (jamais pendant une vague), avec garde-fou de fréquence (section 7)."],
    ["Rewarded opt-in", "Format le mieux accueilli du marché ; toujours déclenché par le joueur ; le plus rentable par impression.",
     "Pilier principal du modèle : bonus de pièces après un niveau, jamais un mécanisme obligatoire pour progresser."],
    ["Premium / suppression de pubs", "Un achat unique simple, sans dépendance à un flux publicitaire incertain ; cohérent avec Bloons TD 6.",
     "Option recommandée en complément, jamais un modèle exclusif : un joueur doit pouvoir tout terminer sans jamais payer."],
    ["Micro-IAP", "Aucune vraie valeur identifiée pour BASTION LINE (pas de monnaie premium, pas de contenu cosmétique existant) ; "
     "risque réel de pay-to-win si mal conçu contre l'équilibrage déjà validé (V0-V4).",
     "NON retenu dans cette mission. Ne pas ajouter de micro-IAP juste pour multiplier les points de vente."],
    ["Cosmétiques", "Potentiel réel à terme (skins de tours, thèmes visuels) une fois la direction graphique V4/V5 stabilisée -- "
     "aucune dépendance gameplay.",
     "Piste future à réévaluer après V5/V6, pas dans le périmètre chiffré de cette étude."],
    ["Jeu premium (achat initial)", "Alternative simple et saine, sans aucune publicité ; revenu par utilisateur plus élevé mais "
     "volume d'acquisition probablement plus faible (barrière à l'entrée).",
     "Comparé chiffré ci-dessous (section 5.3) comme option \"remove-ads\" plutôt que barrière au tout premier lancement."],
    ["Hybride", "Combine rewarded (pilier) + interstitiel cadré + option premium/remove-ads.",
     "MODÈLE RETENU pour cette étude (section 5)."],
], [32*mm, 78*mm, 65*mm])
hr()

h1("4. Expérience joueur et conformité")
bullets([
    "Aucun interstitiel pendant une vague ou une action active de jeu -- seulement aux transitions naturelles "
    "(retour au menu après une victoire ou une défaite de niveau).",
    "Garde-fou de fréquence : un interstitiel au maximum une transition sur trois éligibles, et jamais plus de "
    "3 par jour et par joueur, avec un délai minimal entre deux affichages -- empêche l'enchaînement d'annonces "
    "indépendamment du nombre de clics du joueur.",
    "Les rewarded restent strictement déclenchées par un choix explicite du joueur (jamais automatiques), pour "
    "une récompense clairement annoncée AVANT le visionnage -- jamais un mécanisme rendant la progression "
    "artificiellement plus lente sans elles (constat direct du risque observé chez Empire Warriors, section 2).",
    "Fill rate de référence pour le format rewarded : au-dessus de 90% sur les marchés \"tier-1\" selon les "
    "sources retenues -- une disponibilité publicitaire insuffisante ne doit donc jamais être supposée comme "
    "un risque structurel, mais une marge de sécurité est tout de même intégrée au scénario prudent (fill 85%).",
])
small("Sources : MAF (\"Rewarded Ads Unpacked... 2026\") ; Playio Blog (\"Rewarded Ad Benchmarks for 2026\") ; "
      "Business of Apps / Mistplay (\"Mobile ads eCPM: Basics and latest data\"). Recherche du 28 septembre 2026.")
hr()
story.append(PageBreak())

h1("5. Modèle chiffré")
h2("5.1 Hypothèses (toutes modifiables, unité précisée)")
table([
    ["Variable", "Prudent", "Central", "Haut", "Source / statut"],
    ["Ratio DAU/MAU", "15%", "20%", "25%", "Hypothèse produit (non sourcée par un benchmark spécifique BASTION LINE) -- plage usuelle jeux casual/mid-core."],
    ["Occasions rewarded proposées / DAU / jour", "1,2", "1,5", "1,8", "Hypothèse (un affichage type après chaque fin de niveau, borné)."],
    ["Taux d'acceptation rewarded (opt-in)", "20%", "35%", "50%", "Repère marché \"cible 40-70%\" (MAF/Playio) -- prudent/central posés SOUS ce repère par prudence pour un titre indépendant."],
    ["Fill rate rewarded", "85%", "92%", "96%", "Repère marché : fill &gt;90-95% en tier-1 (MAF, Playio)."],
    ["eCPM rewarded (mix géographique réaliste, $/1000 vues)", "8", "15", "25", "Repère marché 15-40$ en tier-1, 2-10$ en tier-2/3 ; mix retenu pour un titre indépendant sans concentration tier-1 pure (Business of Apps/AppLovin via Mistplay/MAF)."],
    ["Transitions éligibles interstitiel / DAU / jour", "1,2", "1,5", "1,8", "= occasions rewarded (mêmes transitions de fin de niveau)."],
    ["Taux d'affichage interstitiel (garde-fou)", "33%", "33%", "33%", "Garde-fou fixé par design : 1 transition sur 3 au maximum (section 4), constant entre scénarios."],
    ["Fill rate interstitiel", "80%", "88%", "93%", "Estimation prudente sous le repère rewarded (aucune source dédiée trouvée au format interstitiel spécifiquement)."],
    ["eCPM interstitiel ($/1000 vues)", "2", "4", "7", "Repère marché : ~4,80$ global 2024, ~9-12$ US, ~6-11$ tier-1 (Business of Apps, Mistplay, Udonis)."],
    ["Part de nouveaux utilisateurs / MAU / mois", "25%", "30%", "35%", "Hypothèse produit (rotation d'audience) -- à remplacer par des données réelles post-lancement."],
    ["Taux de conversion IAP remove-ads (sur nouveaux utilisateurs)", "0,5%", "1,5%", "3%", "Repère marché global IAP 1,5-3,5% (MAF/AppsFlyer) ; remove-ads typiquement en bas de fourchette (achat d'utilité, pas de pouvoir)."],
    ["Prix remove-ads", "2,99 $ (constant)", "", "", "Choix produit, alignable sur Bloons TD 6 (0,99$) à un niveau plus \"suppression pub + soutien\", modifiable."],
    ["Commission store nette", "15% (constant)", "", "", "Apple Small Business Program et Google Play Reduced Service Fee, sous 1M$/an de revenus -- sourcés (section methodology)."],
    ["Coût fixe mensuel", "9,50 $ (constant)", "", "", "Apple Developer Program 99$/an + Google Play Console 25$ une fois, amortis -- sourcés."],
    ["Coût variable d'hébergement / MAU / mois", "0 $ jusqu'à 100k MAU, puis ~0,004 $ estimé", "", "", "GitHub Pages/CDN statique gratuit à ce volume ; au-delà, ESTIMATION non sourcée par un devis (à revalider, voir section 8)."],
], [42*mm, 20*mm, 20*mm, 20*mm, 73*mm], font_size=7.3)

h2("5.2 Formules (transparentes, jamais cachées derrière un total)")
bullets([
    "<font face='Courier'>DAU = MAU × ratio_DAU_MAU</font>",
    "<font face='Courier'>Impressions rewarded/mois = DAU × occasions/jour × taux_acceptation × fill_rate × 30</font>",
    "<font face='Courier'>Revenu rewarded/mois = Impressions × eCPM_rewarded / 1000</font>",
    "<font face='Courier'>Impressions interstitiel/mois = DAU × transitions/jour × taux_affichage × fill_rate × 30</font>",
    "<font face='Courier'>Revenu interstitiel/mois = Impressions × eCPM_interstitiel / 1000</font>",
    "<font face='Courier'>Acheteurs remove-ads/mois = MAU × part_nouveaux_utilisateurs × taux_conversion</font>",
    "<font face='Courier'>Revenu IAP net/mois = Acheteurs × prix × (1 − commission_store)</font>",
    "<font face='Courier'>Revenu net total/mois = Revenu rewarded + Revenu interstitiel + Revenu IAP net</font>",
    "<font face='Courier'>Coût total/mois = Coût fixe + (MAU × coût_variable_par_MAU)</font>",
    "<font face='Courier'>Marge/mois = Revenu net total − Coût total</font>",
])
body("Hypothèse explicite sur les eCPM : les valeurs publiées par les sources (AdMob/mediation) sont déjà "
     "NETTES de la part prélevée par le réseau publicitaire lui-même -- aucune commission supplémentaire n'est "
     "donc déduite du revenu publicitaire brut dans ce modèle.")
hr()
story.append(PageBreak())

h1("5.3 Résultats chiffrés par échelle de MAU")
h2("Scénario PRUDENT")
table([
    ["MAU", "DAU", "Revenu net/mois", "Coût total/mois", "Marge/mois", "Revenu net/MAU"],
    ["1 000", "150", "13,37 $", "9,50 $", "3,87 $", "0,0134 $"],
    ["10 000", "1 500", "133,72 $", "9,50 $", "124,22 $", "0,0134 $"],
    ["100 000", "15 000", "1 337,21 $", "9,50 $", "1 327,71 $", "0,0134 $"],
    ["1 000 000", "150 000", "13 372,08 $", "4 009,50 $", "9 362,58 $", "0,0134 $"],
], [26*mm, 22*mm, 30*mm, 30*mm, 28*mm, 26*mm], font_size=8)
h2("Scénario CENTRAL")
table([
    ["MAU", "DAU", "Revenu net/mois", "Coût total/mois", "Marge/mois", "Revenu net/MAU"],
    ["1 000", "200", "65,36 $", "9,50 $", "55,86 $", "0,0654 $"],
    ["10 000", "2 000", "653,61 $", "9,50 $", "644,11 $", "0,0654 $"],
    ["100 000", "20 000", "6 536,12 $", "9,50 $", "6 526,62 $", "0,0654 $"],
    ["1 000 000", "200 000", "65 361,15 $", "4 009,50 $", "61 351,65 $", "0,0654 $"],
], [26*mm, 22*mm, 30*mm, 30*mm, 28*mm, 26*mm], font_size=8)
h2("Scénario HAUT")
table([
    ["MAU", "DAU", "Revenu net/mois", "Coût total/mois", "Marge/mois", "Revenu net/MAU"],
    ["1 000", "250", "217,69 $", "9,50 $", "208,19 $", "0,2177 $"],
    ["10 000", "2 500", "2 176,88 $", "9,50 $", "2 167,38 $", "0,2177 $"],
    ["100 000", "25 000", "21 768,78 $", "9,50 $", "21 759,28 $", "0,2177 $"],
    ["1 000 000", "250 000", "217 687,80 $", "4 009,50 $", "213 678,30 $", "0,2177 $"],
], [26*mm, 22*mm, 30*mm, 30*mm, 28*mm, 26*mm], font_size=8)
body("Le coût variable d'hébergement (~0,004 $/MAU/mois au-delà de 100 000 MAU, soit ~4 000 $/mois à 1 million "
     "de MAU dans ces tableaux) reste, dans les trois scénarios, très inférieur au revenu net/MAU -- la marge "
     "unitaire ne s'inverse jamais dans la plage testée.")
hr()

h1("6. Seuil de rentabilité")
table([
    ["Scénario", "MAU nécessaire pour marge mensuelle ≥ 0"],
    ["Prudent", "≈ 710 MAU"],
    ["Central", "≈ 145 MAU"],
    ["Haut", "≈ 44 MAU"],
], [60*mm, 95*mm])
body("Le seuil de rentabilité est très bas dans les trois scénarios car les coûts fixes retenus (9,50 $/mois) "
     "sont volontairement réalistes pour l'échelle ACTUELLE du projet (un jeu indépendant sans salarié, "
     "hébergé gratuitement en PWA statique) : le jeu génère une marge positive dès quelques centaines "
     "d'utilisateurs actifs mensuels, même dans le scénario le plus prudent.")
hr()
story.append(PageBreak())

h1("7. Test de viabilité à l'échelle et analyse de sensibilité")
h2("7.1 Revenu net/MAU et coût variable/MAU (les deux chiffres demandés par le cahier)")
body("Revenu net/MAU reste CONSTANT par construction du modèle (proportionnel au MAU) à chaque échelle : "
     "0,0134 $ (prudent), 0,0654 $ (central), 0,2177 $ (haut). Coût variable/MAU reste à 0 $ jusqu'à 100 000 MAU "
     "puis se stabilise à environ 0,004 $/MAU au-delà -- très inférieur au revenu net/MAU dans les trois "
     "scénarios, y compris le plus prudent. <b>La marge unitaire ne devient jamais dangereuse dans la plage "
     "testée (1 000 à 1 000 000 MAU).</b>")
h2("7.2 Choc combiné (scénario central, 1 000 000 MAU) -- pour vérifier la robustesse, pas seulement le cas favorable")
table([
    ["Situation", "Revenu net/mois", "Marge/mois"],
    ["Base centrale", "65 361,15 $", "61 351,65 $"],
    ["eCPM -50% + fill -40% + conversion IAP -50% (choc combiné réaliste)", "21 895,69 $", "17 886,19 $"],
    ["Coût CDN 10× plus élevé que l'estimation prudente", "65 361,15 $", "25 351,65 $"],
    ["Engagement (DAU/MAU) divisé par deux", "38 398,95 $", "34 389,45 $"],
], [88*mm, 35*mm, 32*mm], font_size=8)
body("Même sous un choc combiné sévère et cumulatif (baisse simultanée de l'eCPM, du fill rate ET de la "
     "conversion IAP), la marge mensuelle reste largement positive à 1 million de MAU dans ce modèle. Le poste "
     "de coût le plus sensible identifié est l'hébergement/CDN au-delà de 100 000 MAU : c'est le SEUL poste "
     "qui croît avec le volume plutôt que de rester fixe, et c'est donc le seul point de vigilance réel "
     "identifié pour la \"croissance ne doit jamais transformer une activité viable en perte\".")
h2("7.3 Point de vigilance identifié et garde-fou proposé")
body("Le risque structurel réel n'est pas dans le modèle publicitaire actuel (revenu positif dès la première "
     "impression, aucun mécanisme à marge négative) mais dans un AJOUT FUTUR non budgété : un service serveur "
     "payant à l'usage (sauvegarde cloud, classement en ligne, multijoueur) dont le coût par utilisateur "
     "croîtrait plus vite que le revenu publicitaire par utilisateur. <b>Garde-fou proposé :</b> tout nouveau "
     "service facturé à l'usage doit être budgété AVANT son intégration avec un plafond mesurable (quota, "
     "cache, dégradation automatique), et déclenche une alerte si son coût/MAU dépasse 30% du revenu net/MAU "
     "du scénario prudent (soit environ 0,004 $/MAU/mois) -- un seuil délibérément strict, très en dessous du "
     "point où la marge deviendrait réellement négative.")
hr()
story.append(PageBreak())

h1("8. Garde-fous obligatoires avant toute publication")
table([
    ["Risque", "Garde-fou retenu"],
    ["Publicité insuffisante", "Le jeu reste 100% jouable et terminable sans jamais regarder une publicité -- le fonctionnement "
     "essentiel ne dépend d'aucun revenu publicitaire minimum garanti."],
    ["Coût variable qui s'emballe", "Voir section 7.3 : plafond/quota explicite et alerte à 30% du revenu net/MAU prudent pour tout "
     "service facturé à l'usage, avant son intégration."],
    ["Publicités intrusives", "Frequency cap strict (max 1 interstitiel / 3 transitions éligibles, max 3/jour/joueur), jamais "
     "pendant une vague ou un combat actif (section 4)."],
    ["Rewarded mal conçues", "Récompense plafonnée et clairement annoncée avant visionnage ; aucun besoin artificiel créé dans "
     "l'équilibrage pour pousser au visionnage (constat du risque chez Empire Warriors, section 2)."],
    ["IAP/Premium peu convertis", "Le modèle reste positif même au taux de conversion le plus bas testé (0,5%, scénario prudent) -- "
     "aucune dépendance du revenu de base à l'achat."],
    ["Croissance mal maîtrisée", "Recalcul du modèle (ce même script reproductible) avant tout changement d'échelle significatif "
     "(ex. passage au-delà de 100 000 MAU, ajout d'un nouveau service serveur)."],
    ["Hypothèses non confirmées", "Toutes les hypothèses de ce rapport doivent être remplacées progressivement par des métriques "
     "réelles après lancement, avant toute augmentation de dépense fixe ou variable (section 9)."],
], [40*mm, 115*mm])
hr()

h1("9. Limites et points restant à valider avec des données réelles")
bullets([
    "Aucune donnée de trafic, rétention ou conversion réelle n'existe encore pour BASTION LINE -- toutes les "
    "hypothèses ci-dessus sont des points de départ raisonnables et sourcés par des repères de marché "
    "généraux, PAS des mesures propres au jeu.",
    "Le coût d'hébergement au-delà de 100 000 MAU (~0,004 $/MAU/mois) est une ESTIMATION, pas un devis fourni "
    "par un prestataire CDN précis -- à revalider avec des chiffres réels de bande passante avant d'atteindre "
    "cette échelle.",
    "Le fill rate interstitiel n'a pas de source dédiée trouvée (contrairement au rewarded, bien documenté) -- "
    "posé par estimation prudente sous le repère rewarded, à corriger dès que des données réelles existeront.",
    "Cette étude ne vaut PAS autorisation d'intégrer une quelconque monétisation : aucune publicité, SDK ou "
    "achat n'a été ajouté au jeu par cette mission. Le modèle devra être réaudité avec les coûts, politiques "
    "de plateforme, prix et données alors réellement disponibles avant toute transformation Android/AAB ou "
    "publication.",
])
hr()

h1("10. Conclusion")
body("Sur la base des données de marché sourcées (section 2 et 4) et du modèle chiffré reproductible "
     "(sections 5 à 7), un modèle hybride centré sur des publicités récompensées volontaires, un interstitiel "
     "strictement cadencé aux seules transitions de fin de niveau, et une option premium de suppression des "
     "publicités, démontre une marge nette POSITIVE dans les trois scénarios (prudent, central, haut) et à "
     "chaque échelle testée (1 000 à 1 000 000 MAU) -- y compris sous un choc combiné sévère sur les principales "
     "hypothèses. Le seuil de rentabilité se situe entre 44 et 710 utilisateurs actifs mensuels selon le "
     "scénario, ce qui est cohérent avec des coûts fixes réalistes pour l'échelle actuelle du projet.")
body("<b>Aucun scénario testé n'a été masqué ou présenté faussement positif : le choc combiné (section 7.2) a "
     "été construit spécifiquement pour chercher un cas défavorable, et la marge reste positive.</b> Le seul "
     "point de vigilance structurel identifié (coût serveur futur non plafonné) fait l'objet d'un garde-fou "
     "explicite et mesurable (section 7.3 et 8).")
body("<b>Cette étude ne constitue ni une autorisation d'intégrer une monétisation, ni une validation finale du "
     "modèle.</b> Conformément à la mission, aucune publicité, aucun SDK, aucun achat intégré et aucun paiement "
     "n'ont été ajoutés à BASTION LINE. Le modèle proposé devra être réaudité avec des données réelles et les "
     "conditions de plateforme alors en vigueur avant toute transformation Android/AAB ou publication.")

doc = SimpleDocTemplate(OUT, pagesize=A4, topMargin=16*mm, bottomMargin=16*mm, leftMargin=18*mm, rightMargin=18*mm)
doc.build(story)
print("PDF généré:", OUT)
