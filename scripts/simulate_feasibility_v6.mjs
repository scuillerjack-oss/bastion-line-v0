// Batterie de faisabilité V6 (cahier V6, section 7) : "Le but n'est pas que
// 100% des simulations gagnent. Le but est que 100% des niveaux aient au
// moins une stratégie réaliste permettant de gagner avec les ressources et
// règles disponibles." -- rejoue chaque niveau réel avec PLUSIEURS profils
// de construction/amélioration distincts (jamais un seul "joueur parfait"
// qui masquerait un niveau réellement injouable avec une autre approche
// raisonnable, ni un profil trop optimal qui masquerait un niveau
// réellement impossible pour un joueur humain).
import { LEVELS } from "../src/engine/levels.js";
import { createLevelState } from "../src/engine/state.js";
import { tick, buildTower, upgradeTower } from "../src/engine/simulation.js";
import { TOWER_FAMILIES } from "../src/engine/towers.js";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DT = 1000 / 60;
const MAX_TICKS = 60 * 600; // 10 minutes -- garde-fou anti-blocage, jamais une durée de jeu réaliste

// Rythme de décision "humain réaliste" (cf. scripts/balance_simulation.mjs) :
// une décision de construction/amélioration au mieux toutes les 2,5s --
// jamais une dépense instantanée à chaque tick, qui ne représente aucun
// joueur réel et masquerait un niveau réellement trop exigeant.
const DECISION_EVERY_N_TICKS = 150;

function pickAffordable(state) {
  return state.unlockedTowers.map((f) => TOWER_FAMILIES[f]).filter((f) => f.buildCost <= state.coins);
}

// Stratégie ÉQUILIBRÉE : construit la famille abordable la MOINS CHÈRE sur
// un emplacement vide (maximise la couverture du plateau) ; sinon améliore
// la tour dont l'amélioration est la moins chère.
function stepBalanced(state) {
  const emptySlots = state.buildSlots.filter((s) => !s.towerId);
  const affordable = pickAffordable(state).sort((a, b) => a.buildCost - b.buildCost);
  if (emptySlots.length > 0 && affordable.length > 0) {
    buildTower(state, emptySlots[0].id, affordable[0].id);
    return;
  }
  const upgradable = state.towers
    .map((t) => ({ t, cost: TOWER_FAMILIES[t.family].tiers[t.tier + 1]?.upgradeCost }))
    .filter((x) => x.cost != null && x.cost <= state.coins)
    .sort((a, b) => a.cost - b.cost);
  if (upgradable.length > 0) upgradeTower(state, upgradable[0].t.id);
}

// Stratégie PRIORITÉ DÉGÂTS : construit en priorité la famille au dégât de
// base (palier 0) le plus élevé parmi celles abordables/débloquées (canon,
// puis longue portée une fois débloquée) ; améliore en priorité la tour dont
// la famille a le dégât de base le plus élevé.
function stepDamage(state) {
  const emptySlots = state.buildSlots.filter((s) => !s.towerId);
  const affordable = pickAffordable(state).sort((a, b) => b.tiers[0].damage - a.tiers[0].damage);
  if (emptySlots.length > 0 && affordable.length > 0) {
    buildTower(state, emptySlots[0].id, affordable[0].id);
    return;
  }
  const upgradable = state.towers
    .map((t) => ({ t, cost: TOWER_FAMILIES[t.family].tiers[t.tier + 1]?.upgradeCost, dmg: TOWER_FAMILIES[t.family].tiers[0].damage }))
    .filter((x) => x.cost != null && x.cost <= state.coins)
    .sort((a, b) => b.dmg - a.dmg || a.cost - b.cost);
  if (upgradable.length > 0) upgradeTower(state, upgradable[0].t.id);
}

// Stratégie PRIORITÉ CADENCE/PORTÉE : construit en priorité rapide (cadence
// la plus élevée) puis longue portée (portée la plus élevée) avant canon ;
// améliore en priorité ces mêmes familles.
const SPEED_RANGE_ORDER = ["rapide", "longue_portee", "canon"];
function stepSpeedRange(state) {
  const emptySlots = state.buildSlots.filter((s) => !s.towerId);
  const affordable = pickAffordable(state).sort((a, b) => SPEED_RANGE_ORDER.indexOf(a.id) - SPEED_RANGE_ORDER.indexOf(b.id));
  if (emptySlots.length > 0 && affordable.length > 0) {
    buildTower(state, emptySlots[0].id, affordable[0].id);
    return;
  }
  const upgradable = state.towers
    .map((t) => ({ t, cost: TOWER_FAMILIES[t.family].tiers[t.tier + 1]?.upgradeCost, rank: SPEED_RANGE_ORDER.indexOf(t.family) }))
    .filter((x) => x.cost != null && x.cost <= state.coins)
    .sort((a, b) => a.rank - b.rank || a.cost - b.cost);
  if (upgradable.length > 0) upgradeTower(state, upgradable[0].t.id);
}

export const STRATEGIES = [
  { name: "équilibrée", step: stepBalanced },
  { name: "priorité dégâts", step: stepDamage },
  { name: "priorité cadence/portée", step: stepSpeedRange },
];

export function simulate(level, playerStep) {
  const state = createLevelState(level);
  let minHpRatio = 1;
  let ticks = 0;
  while (state.status !== "won" && state.status !== "lost" && ticks < MAX_TICKS) {
    if (ticks % DECISION_EVERY_N_TICKS === 0) playerStep(state);
    tick(state, DT);
    ticks++;
    minHpRatio = Math.min(minHpRatio, Math.max(0, state.baseHp) / state.baseMaxHp);
  }
  return {
    status: state.status,
    finalHpRatio: Math.max(0, state.baseHp) / state.baseMaxHp,
    minHpRatio,
    coinsLeft: state.coins,
    ticks,
    hitCap: ticks >= MAX_TICKS,
  };
}

// Garde d'exécution (module ESM "principal") : ce script peut aussi être
// IMPORTÉ (voir tests/feasibility.test.js, qui réutilise exactement les
// mêmes stratégies/simulation -- jamais une copie qui pourrait diverger)
// sans déclencher l'affichage/l'écriture de fichier ci-dessous.
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) runReport();

function runReport() {
  const results = {};
  console.log("=== Batterie de faisabilité V6 (cahier V6, section 7) ===\n");
  for (const level of LEVELS) {
    results[level.id] = { name: level.name, strategies: {} };
    let anyWin = false;
    console.log(`Niveau ${level.id} ("${level.name}")`);
    for (const { name, step } of STRATEGIES) {
      const r = simulate(level, step);
      results[level.id].strategies[name] = r;
      if (r.status === "won") anyWin = true;
      const flag = r.status === "won" ? "GAGNÉ" : r.status === "lost" ? "perdu" : "BLOQUÉ";
      console.log(
        `  - ${name.padEnd(24)} ${flag.padEnd(6)} PV finaux=${(r.finalHpRatio * 100).toFixed(0)}%  PV min=${(r.minHpRatio * 100).toFixed(0)}%  pièces restantes=${r.coinsLeft}${r.hitCap ? "  [PLAFOND]" : ""}`
      );
    }
    results[level.id].feasible = anyWin;
    console.log(`  => ${anyWin ? "FAISABLE (au moins une stratégie gagnante)" : "*** AUCUNE STRATÉGIE GAGNANTE -- NIVEAU POTENTIELLEMENT IMPOSSIBLE ***"}\n`);
  }

  const allFeasible = Object.values(results).every((r) => r.feasible);
  console.log(allFeasible ? "Résultat global : tous les niveaux ont au moins une stratégie gagnante." : "Résultat global : AU MOINS UN NIVEAU N'A AUCUNE STRATÉGIE GAGNANTE.");

  writeFileSync(join(__dirname, "..", "docs", "v6-feasibility-results.json"), JSON.stringify(results, null, 2));
  console.log("\nRésultats écrits dans docs/v6-feasibility-results.json");

  if (!allFeasible) process.exit(1);
}
