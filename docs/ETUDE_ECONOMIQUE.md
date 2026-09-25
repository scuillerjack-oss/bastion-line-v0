# BASTION LINE V0 — Étude économique chiffrée (prospective, non implémentée)

**Date de rédaction :** 25 septembre 2026
**Statut :** aucune monétisation n'est implémentée dans le code du prototype V0 (le
cahier des charges l'interdit explicitement avant validation du porteur). Ce document
est un exercice de planification prospective, reproductible via
`docs/economics/bastion_v0_model.mjs` (`node docs/economics/bastion_v0_model.mjs`),
destiné à informer une décision future, jamais à la précéder.

Chaque donnée est étiquetée **[SOURCED]** (fait vérifiable daté), **[HYPOTHESIS]**
(supposition non vérifiée, choisie par prudence), **[DESIGN]** (choix structurel du
porteur, pas une mesure) ou **[ESTIMATE]** (résultat calculé à partir des précédents).

---

## 1. Paramètres sourcés (voir ETUDE_MARCHE.md pour détail complet)

- **[SOURCED]** eCPM vidéo récompensée : 15-40 $ en marchés tier-1 (US/UK/JP),
  3-10 $ en tier-2/3. Source : AppLovin publisher benchmarks 2025, consulté 25/09/2026.
- **[SOURCED]** Une vidéo récompensée génère 2-3x l'eCPM d'un interstitiel.
  Même source.
- **[SOURCED]** CPI (coût par installation) genre stratégie : ~4 $ Android,
  ~5,5 $ iOS (2025). Source : Business of Apps / Mapendo CPI Report 2025,
  consulté 25/09/2026.

## 2. Hypothèses assumées (non sourcées spécifiquement pour un TD mobile)

- **[HYPOTHESIS]** Répartition d'audience 25 % marché tier-1 / 75 % tier-2-3
  → eCPM récompensée mixte estimé : **11,75 $** ; eCPM interstitiel mixte :
  **4,70 $** (ratio sourcé /2,5).
- **[HYPOTHESIS]** Mix plateforme 70 % Android / 30 % iOS (répartition mondiale
  courante pour un jeu casual F2P, non vérifiée pour ce projet précis)
  → CPI mixte estimé : **4,45 $**.
- **[HYPOTHESIS]** 12 sessions par MAU et par mois (~3/semaine) : aucune donnée
  sourcée de fréquence de session n'a été trouvée spécifiquement pour le Tower
  Defense mobile (voir ETUDE_MARCHE.md, section 2) ; choisi par analogie prudente
  avec un jeu de stratégie/puzzle à session courte, non quotidien.
- **[HYPOTHESIS]** Fenêtre d'activité moyenne d'un utilisateur acquis avant
  désengagement : 3 mois — hypothèse volontairement conservatrice en l'absence
  de courbe de rétention long terme mesurée.

## 3. Trois scénarios de monétisation prospective **[DESIGN]**

Aucun de ces scénarios n'est implémenté. Chacun respecte la contrainte du cahier
« aucune dépense variable non plafonnée » : les taux ci-dessous sont des plafonds
de conception, pas des mesures.

| Scénario | Vidéo récompensée (opt-in) | Interstitiel | Revenu estimé / MAU / mois |
|---|---|---|---|
| Léger | 15 % des sessions | aucun | **[ESTIMATE]** 0,0211 $ |
| Équilibré | 35 % des sessions | 20 % des sessions | **[ESTIMATE]** 0,0606 $ |
| Plus monétisé | 50 % des sessions | 50 % des sessions | **[ESTIMATE]** 0,0987 $ |

## 4. Revenu brut par volume d'audience **[ESTIMATE]**

| MAU | Léger | Équilibré | Plus monétisé |
|---|---|---|---|
| 500 (bêta privée réaliste) | 10,57 $/mois | 30,31 $/mois | 49,35 $/mois |
| 5 000 (lancement organique modeste) | 105,75 $/mois | 303,15 $/mois | 493,50 $/mois |
| 50 000 (succès organique) | 1 057,50 $/mois | 3 031,50 $/mois | 4 935,00 $/mois |

## 5. Coûts fixes et variables

- **[SOURCED/DESIGN]** Coûts fixes actuels : **0 $** — architecture 100 % statique
  (PWA servie par GitHub Pages, aucun serveur, aucune base de données). Seul coût
  ponctuel futur identifié : frais unique d'inscription développeur Google Play
  (25 $, une fois, si publication Android envisagée — non requis pour V0).
- **[DESIGN]** Aucune dépense variable (acquisition utilisateurs) n'est engagée en
  V0. Pour l'exercice prospectif, deux plafonds hypothétiques d'acquisition payante
  sont testés : 100 $/mois et 500 $/mois — jamais engagés sans validation du porteur.

## 6. Seuil de rentabilité et retour sur investissement **[ESTIMATE]**

**Limite honnête à souligner en premier :** les coûts fixes étant nuls, un « seuil
de rentabilité » classique (récupérer des coûts fixes) est trivial et non
informatif ici — toute audience génère un revenu net positif dès le premier
utilisateur. La question économique réellement utile n'est donc pas « le
prototype est-il rentable ? » mais « une dépense d'acquisition payante
plafonnée serait-elle remboursée dans un délai raisonnable ? ».

Résultat du modèle (`bastion_v0_model.mjs`), indépendant du montant du budget
(le nombre d'installations achetées et le revenu croissent proportionnellement) :

| Scénario | Retour sur investissement estimé d'une dépense UA plafonnée |
|---|---|
| Léger | **210 mois** (~17,5 ans) |
| Équilibré | **73 mois** (~6 ans) |
| Plus monétisé | **45 mois** (~3,75 ans) |

**Constat honnête, non édulcoré :** à ce stade (prototype 5 niveaux, aucune
audience acquise, hypothèses volontairement prudentes), **aucun scénario ne
rendrait une dépense d'acquisition payante rentable dans un délai raisonnable**.
Le calcul suppose une fenêtre d'activité de seulement 3 mois par utilisateur
acquis, alors que le retour dépasse cette fenêtre dans les trois scénarios — ce
qui signifie que, dans ce modèle, le coût d'acquisition ne serait jamais
totalement récupéré avant que l'utilisateur ne parte. Ce n'est pas un problème
d'implémentation : c'est un signal que la monétisation payante n'a de sens
qu'après une croissance organique significative (bouche-à-oreille, viralité) et
non comme moteur de croissance initial pour ce prototype.

## 7. Analyse de sensibilité **[ESTIMATE]**

Scénario Équilibré, MAU = 5 000 :

| Paramètre | ×0,5 | ×1 (base) | ×1,5 |
|---|---|---|---|
| eCPM (récompensée + interstitiel) | 151,57 $/mois | 303,15 $/mois | 454,72 $/mois |
| Sessions/MAU/mois | 151,57 $/mois | 303,15 $/mois | 454,72 $/mois |

Le revenu est linéairement sensible aux deux paramètres les moins certains
(eCPM réel obtenu et fréquence de session réelle) — une variation de ±50 % sur
l'un ou l'autre fait varier le revenu proportionnellement. Cela confirme que
ces deux hypothèses, non sourcées spécifiquement pour ce projet, sont les
leviers d'incertitude dominants du modèle.

## 8. Conclusion et limites

- **Le prototype V0, à son échelle actuelle (bêta privée), ne génère et ne
  génèrera aucun revenu significatif** : ce n'est ni un échec ni une surprise —
  la validation du plaisir de jeu (l'objectif réel de V0) est indépendante de
  la monétisation.
- **La monétisation légère est la seule cohérente avec les volumes réalistes
  d'un prototype non marketé** : à MAU=500, même le scénario le plus monétisé
  ne produit que ~49 $/mois, une somme qui ne couvre aucune dépense de
  croissance payante.
- **Aucun scénario ne justifie une dépense d'acquisition payante avant une
  validation organique de la rétention réelle** (données que ce prototype ne
  peut produire sans une bêta humaine — exactement le rôle que le porteur du
  projet a réservé à sa propre bêta physique).
- **Limite principale du modèle** : les hypothèses de sessions/mois et de
  fenêtre d'activité ne sont pas sourcées spécifiquement pour le Tower Defense
  mobile (aucune donnée publique isolée trouvée pour ce genre précis — voir
  ETUDE_MARCHE.md section 2.4) ; elles sont documentées comme hypothèses
  prudentes, pas comme des faits, et devront être recalibrées avec de vraies
  données de rétention dès que la bêta du porteur produira des chiffres réels.
- **Recommandation :** ne rien implémenter avant la bêta du porteur ; si une
  V1 est décidée, mesurer d'abord la rétention réelle (D1/D7) et la fréquence
  de session réelle avant de choisir entre les trois scénarios ci-dessus.
