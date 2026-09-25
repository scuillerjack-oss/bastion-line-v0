# BASTION LINE V0 — Étude de marché (Tower Defense mobile)

**Date de rédaction :** 25 septembre 2026
**Objet :** analyse structurelle de jeux Tower Defense mobiles comparables, à des fins
d'inspiration structurelle uniquement (durée de niveau, nombre de tours, vagues,
courbe de difficulté, onboarding, progression, rétention, monétisation).
**Aucun contenu (assets, textes, personnages, niveaux, marques) n'est copié** : seules
des mécaniques et structures générales, publiquement documentées, sont observées.

Chaque donnée ci-dessous est étiquetée :
- **[FAIT SOURCÉ]** — vérifiable, avec source et date de consultation
- **[HYPOTHÈSE]** — supposition raisonnable non vérifiée
- **[ESTIMATION]** — dérivée par calcul à partir de faits sourcés

---

## 1. Jeux comparables observés

### Kingdom Rush (série, Ironhide Game Studio)
- **[FAIT SOURCÉ]** Kingdom Rush 5: Alliance est sorti le 25 juillet 2024 ; la série reste
  activement maintenue en 2025 (mise à jour 6.4.10 le 25 septembre 2025).
  Source : Wikipédia / App Store, consulté le 25/09/2026.
- **[FAIT SOURCÉ]** Structure en niveaux discrets avec vagues d'ennemis prédéfinies ;
  objectif = repousser toutes les vagues avant qu'elles n'atteignent la fin du chemin.
  Après une victoire 3 étoiles en campagne, deux modes de rejouabilité (Heroic/Iron
  Challenge) réutilisent les mêmes niveaux avec vagues/tours modifiées.
  Source : Ironhide Games Q&A, consulté le 25/09/2026.
- **[FAIT SOURCÉ]** Monétisation premium : jeu payant (~1,99-4,99 $ selon l'opus) avec
  achats optionnels de héros/gemmes ; des gemmes gratuites sont accordées en fin de
  niveau ; les héros gratuits suffisent à terminer le jeu sans achat.
  Source : App Store listing, consulté le 25/09/2026.

### Bloons TD 6 (Ninja Kiwi)
- **[FAIT SOURCÉ]** 25 tours ("Monkey Towers"), chacune avec 3 voies d'amélioration et
  une capacité activable unique ; 70-80+ cartes selon la version.
  Source : Bloons Wiki / App Store, consulté le 25/09/2026.
- **[FAIT SOURCÉ]** Modèle premium (~4,99 $) + achats in-app, plutôt qu'un modèle
  gratuit financé par la publicité.
  Source : App Store listing, consulté le 25/09/2026.

### Realm Defense: Hero Legends TD (Babeltime)
- **[FAIT SOURCÉ]** Modèle free-to-play avec plus de 300 niveaux répartis en plusieurs
  modes/royaumes, 4 tours par royaume thématique, publicités intégrées (non
  bloquantes pour terminer le jeu, mais présentes en continuation/bonus) et
  contenus premium (gemmes payantes) pour les modes à rejouabilité (Arcade,
  Realm Siege) et défis chronométrés/quotidiens.
  Source : Google Play / App Store listing, MiniReview, consulté le 25/09/2026.

---

## 2. Benchmarks génériques mobile (au-delà du seul genre TD)

- **[FAIT SOURCÉ]** Rétention D1 moyenne (top 25 % des jeux, fin 2024) : 26,5-27,7 % ;
  D7 médiane tous jeux confondus : 3,4-3,9 % (top 25 % : 7-8 %).
  Source : GameAnalytics, 2025 Mobile Gaming Benchmarks, consulté le 25/09/2026.
- **[FAIT SOURCÉ]** eCPM vidéo récompensée (marchés tier-1 : US/UK/Japon) : 15-40 $ ;
  US spécifiquement ~16,49 $ (Android) / ~19,63 $ (iOS). Marchés tier-2/3 : 3-10 $.
  Une vidéo récompensée génère 2-3x l'eCPM d'un interstitiel, jusqu'à 10x une bannière.
  Source : AppLovin publisher benchmarks 2025, cité par Gamigion/Tenjin,
  consulté le 25/09/2026.
- **[FAIT SOURCÉ]** Durée de session moyenne mobile tous genres (2024) : 30,75 min ;
  genre puzzle : 24,48 min ; match-3 : 28,97 min ; hyper-casual : 3,1-3,5 min médiane.
  Source : rapports Adjust/AppMagic 2025, consulté le 25/09/2026.
- **[HYPOTHÈSE]** Aucune donnée sourcée spécifique au genre Tower Defense n'a été
  trouvée pour la rétention D1/D7 ou la durée de session : le TD n'est pas isolé comme
  catégorie distincte dans les rapports consultés. Par prudence, BASTION LINE retient
  les benchmarks du genre stratégie/puzzle comme ordre de grandeur (session courte,
  10-20 minutes plutôt que 30+), sans prétendre à une donnée TD dédiée.

---

## 3. Enseignements structurels retenus pour BASTION LINE V0

| Constat marché | Application V0 (structurelle, jamais copiée) |
|---|---|
| Niveaux discrets + vagues prédéfinies (Kingdom Rush) | Confirme le choix déjà fait : 5 niveaux, vagues multiples par niveau, victoire = toutes vagues repoussées |
| Tours à identité de jeu distincte, peu nombreuses mais lisibles (Bloons : 25 tours mais 4-5 "familles" reconnaissables) | Confirme le choix de 4 familles à identité perceptible plutôt qu'un grand nombre de tours similaires |
| Continuation par vidéo récompensée courante en F2P TD (Realm Defense) | Cohérent avec la contrainte du cahier : continuation optionnelle plafonnée, jamais de pub factice en V0 |
| Session courte plausible pour un format mobile "TD compact" | Conforte le choix V0 : prototype 3-5 niveaux jouables en quelques minutes chacun, pas une campagne longue |
| Rétention D1/D7 génériques faibles hors top 25 % | Signal de prudence pour l'étude économique : ne pas supposer une base d'utilisateurs acquise, traiter les hypothèses de MAU comme des scénarios, pas des certitudes |

---

## 4. Limites de cette étude

- Échantillon volontairement restreint (3 jeux + rapports d'industrie génériques) :
  suffisant pour orienter des choix structurels de V0, insuffisant pour une étude de
  marché exhaustive du genre.
- Aucune donnée de rétention ou de session strictement spécifique au Tower Defense
  mobile n'a été localisée avec une source datée fiable ; les extrapolations depuis les
  genres stratégie/puzzle sont explicitement signalées comme des hypothèses, pas des
  faits.
- Les chiffres de monétisation par eCPM datent de rapports 2025 et peuvent évoluer ;
  ils servent de borne d'ordre de grandeur pour l'étude économique (section 5 du
  rapport technique), pas de garantie contractuelle de revenu.
