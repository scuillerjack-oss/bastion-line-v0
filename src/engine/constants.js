// Espace logique de la carte, indépendant des pixels réels de l'écran (voir
// src/ui/render.js pour la mise à l'échelle "contain" responsive) --
// dimensions portrait, cahier des charges V0 section 3 : la carte entière
// doit tenir à l'écran, jamais de déplacement de caméra.
export const ARENA_W = 400;
export const ARENA_H = 700;

// Rayon de "snap" tactile : un tap est considéré comme ayant touché un
// emplacement de construction ou une tour existante s'il tombe dans ce
// rayon logique de son centre -- généreux exprès (doigt réel, pas un
// curseur de souris précis). Augmenté en V6 (26 -> 30, cahier V6, section
// 4 : "adapter séparément la hitbox tactile si nécessaire : taille
// visuelle et zone de clic ne doivent pas être confondues") pour rester
// cohérent avec les tours agrandies -- reste très inférieur à l'écart
// minimal réel entre deux emplacements (>90 sur tous les niveaux actuels),
// donc aucun risque de chevauchement ambigu entre cibles voisines.
export const TAP_HIT_RADIUS = 30;

export const BASE_R = 22;
// Taille V7-polish (cahier V7-polish, section 5 : "les ennemis restent
// légèrement trop petits sur téléphone"). Choisie empiriquement par capture
// d'écran réelle (plusieurs valeurs testées : 10, 11, 12, 13, 14) : 10 -> 12
// (+20%), nettement plus lisible pour un seul ennemi (silhouette/barre de
// vie proportionnelle, route toujours bien visible) ; 14 (+40%) a été
// écarté car le groupe "essaim" (plusieurs ennemis rapprochés, cahier V1
// tableau 4.1) commence à fusionner en un seul amas indistinct à cette
// taille -- exactement la régression de lisibilité de groupe que le cahier
// demande d'éviter. ENEMY_R reste la SEULE source (silhouette Canvas, barre
// de vie = ENEMY_R*2.2) : aucune collision/statistique de jeu n'y est liée
// (HIT_RADIUS, engine/simulation.js, reste indépendant et inchangé).
export const ENEMY_R = 12;
export const TOWER_R = 16;

// Largeur du tracé du chemin (rendu ET validation d'emprise doivent
// partager CETTE seule source -- avant V2, ce nombre n'existait qu'en
// dur dans render.js, dupliqué nulle part mais sans aucun lien formel
// avec la logique de placement des emplacements : c'est la racine
// structurelle du bug "construction posée sur la route" -- rien ne
// vérifiait jamais la distance réelle entre un emplacement et le chemin).
export const PATH_WIDTH = 34;

// Rayon d'emprise visuelle maximal d'UNE tour, tous paliers et familles
// confondus (cahier V2, section 1 : "anticiper des sprites/assets
// graphiques plus volumineux"). Sert à garantir qu'aucune tour ne recouvre
// la route (voir engine/footprint.js, requiredClearance()).
//
// Décision V6 documentée (cahier V6, section 4 : "vérifier qu'une tour
// agrandie ne recouvre pas excessivement la route") : les sprites/silhouettes
// ont été agrandis d'environ 25-29% pour rester lisibles sur téléphone (voir
// src/ui/render.js, TOWER_SPRITE_CONFIG et FALLBACK_SCALE), mais CE rayon
// n'a délibérément PAS été augmenté d'autant. Le recalculer en toute rigueur
// géométrique (coin le plus éloigné de la boîte englobante du sprite) aurait
// exigé ~50, ce qui aurait invalidé la quasi-totalité des emplacements du
// niveau design V6 (route en S très resserrée, peu de marge disponible) --
// alors que ce coin théorique correspond à une zone TRANSPARENTE du PNG
// (jamais la silhouette réellement peinte, qui a une marge généreuse, voir
// le traitement de canon.png). Vérifié empiriquement par capture d'écran
// réelle à l'emplacement le plus proche de la route (rapport technique V6) :
// aucun chevauchement visuel constaté. Si un futur asset a une silhouette
// qui remplit davantage sa boîte englobante, ce rayon DOIT être réévalué et
// les emplacements existants revalidés (voir validateFootprintClearances).
export const TOWER_FOOTPRINT_RADIUS = 38;

// Marge de sécurité supplémentaire, au-delà de la somme géométrique stricte
// (rayon d'emprise + demi-largeur du chemin), pour absorber l'anticrénelage
// et l'imprécision visuelle réelle sur un écran de téléphone.
export const FOOTPRINT_SAFETY_MARGIN = 3;

// Vies de base par défaut (overridable par niveau) -- condition de défaite :
// baseHp <= 0.
export const DEFAULT_BASE_HP = 20;

export const MAX_SUBSTEPS_PER_TICK = 8;

// Revente de tour (cahier V4, section 3) : "Référence V4 proposée :
// remboursement de 60% de la valeur totale investie. Centraliser ce taux
// dans une constante/configuration facilement ajustable." Valeur investie =
// coût de construction + coût de CHAQUE palier d'amélioration réellement
// acheté (voir engine/towers.js, getTowerInvestedValue) -- jamais le seul
// coût de base, pour qu'une tour améliorée se revende toujours plus cher
// qu'une tour brute, sans jamais rembourser 100% de l'investissement.
export const TOWER_SELL_REFUND_RATE = 0.6;

// Orientation des défenses (cahier V7-polish, section 4 : "certaines tours
// semblaient pointer dans la direction opposée à leur attaque réelle
// pendant la bêta"). Vitesse de rotation VISUELLE maximale d'une tour vers
// sa cible actuelle -- jamais un alignement instantané (cahier : "aucune
// rotation brutale/aberrante lors d'un changement de cible"). Un demi-tour
// complet (π radians) prend ici un peu plus d'un demi-seconde : assez
// réactif pour suivre une cible qui se déplace normalement le long de la
// route, assez lent pour qu'un changement de cible se voie comme un
// pivotement fluide, jamais un saut. N'affecte JAMAIS la trajectoire réelle
// d'un projectile (engine/simulation.js, fireProjectile calcule toujours sa
// direction depuis la position RÉELLE de la cible) : c'est une donnée
// purement cosmétique, lue uniquement par le rendu (engine/interpolate.js
// n'interpole pas cet angle -- le pas de simulation fixe, 60 Hz, suffit
// déjà à produire un mouvement visuellement continu).
export const TOWER_AIM_TURN_RATE = Math.PI * 1.8; // radians / seconde
