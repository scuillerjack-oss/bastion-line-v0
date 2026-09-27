// Audit d'équilibrage reproductible (cahier des charges V3, section 4) :
// "Effectuer des simulations/tests reproductibles lorsque possible et
// distinguer difficulté réelle et simple impression de début de partie."
// Ce script rejoue chaque niveau réel du moteur (jamais un modèle
// approximatif à côté) avec deux profils de joueur déterministes -- il ne
// modifie AUCUN paramètre de jeu, il ne fait que MESURER l'état actuel
// avant toute décision d'augmenter la pression (vagues/ennemis).
import { LEVELS } from "../src/engine/levels.js";
import { createLevelState } from "../src/engine/state.js";
import { tick, buildTower, upgradeTower } from "../src/engine/simulation.js";
import { TOWER_FAMILIES } from "../src/engine/towers.js";

const DT = 1000 / 60;
const MAX_TICKS = 60 * 600; // 10 minutes -- largement suffisant, sert de garde-fou anti-blocage

// Profil "couverture patiente" : construit sur CHAQUE emplacement vide dès
// que la famille la MOINS CHÈRE encore débloquée est abordable (maximise la
// couverture du plateau avant d'améliorer), puis dépense le surplus en
// améliorations (moins chère d'abord). Reflète un joueur raisonnable qui
// suit le rythme du jeu sans jamais "rusher" une vague avant d'avoir dépensé
// ce qu'il peut.
function stepCoveragePlayer(state) {
  const emptySlots = state.buildSlots.filter((s) => !s.towerId);
  const affordableFamilies = state.unlockedTowers
    .map((f) => TOWER_FAMILIES[f])
    .filter((f) => f.buildCost <= state.coins)
    .sort((a, b) => a.buildCost - b.buildCost);
  if (emptySlots.length > 0 && affordableFamilies.length > 0) {
    buildTower(state, emptySlots[0].id, affordableFamilies[0].id);
    return;
  }
  const upgradable = state.towers
    .map((t) => ({ t, cost: TOWER_FAMILIES[t.family].tiers[t.tier + 1]?.upgradeCost }))
    .filter((x) => x.cost != null && x.cost <= state.coins)
    .sort((a, b) => a.cost - b.cost);
  if (upgradable.length > 0) upgradeTower(state, upgradable[0].t.id);
}

// Profil "dépense immédiate" (glouton) : identique mais réévalué à CHAQUE
// tick au lieu d'une fois toutes les quelques vagues -- sert à vérifier que
// le résultat n'est pas sensible au rythme de décision (distingue une
// difficulté réelle d'un simple artefact de simulation).
function simulate(level, playerStep, decisionEveryNTicks = 30) {
  const state = createLevelState(level);
  let minHpRatio = 1;
  let ticks = 0;
  while (state.status !== "won" && state.status !== "lost" && ticks < MAX_TICKS) {
    if (ticks % decisionEveryNTicks === 0) playerStep(state);
    tick(state, DT);
    ticks++;
    minHpRatio = Math.min(minHpRatio, Math.max(0, state.baseHp) / state.baseMaxHp);
  }
  const finalHpRatio = Math.max(0, state.baseHp) / state.baseMaxHp;
  return {
    levelId: level.id,
    levelName: level.name,
    status: state.status,
    finalHpRatio,
    minHpRatio,
    coinsLeft: state.coins,
    ticks,
    hitCap: ticks >= MAX_TICKS,
  };
}

function fmt(r) {
  return `niveau ${r.levelId} ("${r.levelName}") -- statut=${r.status} | PV finaux=${(r.finalHpRatio * 100).toFixed(0)}% | PV min. atteints=${(r.minHpRatio * 100).toFixed(0)}% | pièces non dépensées=${r.coinsLeft} | ticks=${r.ticks}${r.hitCap ? " [PLAFOND ATTEINT]" : ""}`;
}

console.log("=== Audit d'équilibrage BASTION LINE -- profil 'couverture patiente' (décision toutes les 30 ticks / 0.5s) ===");
for (const level of LEVELS) console.log(fmt(simulate(level, stepCoveragePlayer, 30)));

console.log("\n=== Même profil, décision à CHAQUE tick (vérifie la sensibilité au rythme de décision) ===");
for (const level of LEVELS) console.log(fmt(simulate(level, stepCoveragePlayer, 1)));

// Profil "rythme humain réaliste" : une décision (construire/améliorer) au
// mieux toutes les 2.5s -- cohérent avec le rythme RÉEL d'un joueur qui doit
// regarder l'écran, choisir un emplacement, puis effectuer la construction
// (et, depuis le verrou tactile en deux temps de la priorité 1, un second
// tap délibéré après un délai minimal). Un bot qui dépense INSTANTANÉMENT
// dès que possible ne représente aucun joueur réel -- ce profil sert
// précisément à distinguer une difficulté réelle d'un artefact de
// simulation trop optimal.
console.log("\n=== Profil 'rythme humain réaliste' (décision au mieux toutes les 2.5s / 150 ticks) ===");
for (const level of LEVELS) console.log(fmt(simulate(level, stepCoveragePlayer, 150)));
