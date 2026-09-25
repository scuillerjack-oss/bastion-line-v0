// Modèle économique BASTION LINE V0 (cahier des charges, section 7).
//
// AUCUNE monétisation n'est implémentée dans le code du prototype -- ce
// script est un outil de PLANIFICATION prospective uniquement, à valider par
// le porteur du projet avant toute décision, jamais exécuté en jeu.
//
// Chaque paramètre est étiqueté SOURCED (fait daté, voir ETUDE_ECONOMIQUE.md
// pour la source exacte), HYPOTHESIS (supposition non vérifiée, choisie par
// prudence) ou DESIGN (choix structurel du porteur, pas une donnée externe).
// Les résultats calculés (revenus, seuils, sensibilité) sont des ESTIMATES.

// --- SOURCED (2025-2026, voir ETUDE_ECONOMIQUE.md pour sources/dates) ---
const ECPM_REWARDED_TIER1_USD = 27.5; // milieu de fourchette 15-40$ (US/UK/JP)
const ECPM_REWARDED_TIER23_USD = 6.5; // milieu de fourchette 3-10$
const CPI_STRATEGY_ANDROID_USD = 4.0;
const CPI_STRATEGY_IOS_USD = 5.5;

// --- HYPOTHESIS (non sourcées spécifiquement pour le Tower Defense mobile ;
// choisies par prudence, jamais présentées comme des faits) ---
const TIER1_AUDIENCE_SHARE = 0.25; // hypothèse : 25% de l'audience en marché tier-1
const REWARDED_ECPM_BLENDED_USD =
  TIER1_AUDIENCE_SHARE * ECPM_REWARDED_TIER1_USD + (1 - TIER1_AUDIENCE_SHARE) * ECPM_REWARDED_TIER23_USD;
const INTERSTITIAL_ECPM_USD = REWARDED_ECPM_BLENDED_USD / 2.5; // ratio sourcé (rewarded = 2-3x interstitiel)
const ANDROID_SHARE = 0.7; // hypothèse : mix Android/iOS courant pour un jeu casual F2P
const CPI_BLENDED_USD = ANDROID_SHARE * CPI_STRATEGY_ANDROID_USD + (1 - ANDROID_SHARE) * CPI_STRATEGY_IOS_USD;
const SESSIONS_PER_MAU_PER_MONTH = 12; // hypothèse : ~3 sessions/semaine, jeu court non quotidien
const ACQUIRED_USER_ACTIVE_MONTHS = 3; // hypothèse prudente : fenêtre d'activité moyenne avant churn

// --- DESIGN : 3 scénarios de monétisation prospective (jamais implémentés en
// V0), respectant "aucune dépense variable non plafonnée" -- ces taux sont
// des CHOIX de conception plafonnés, pas des mesures ---
const SCENARIOS = {
  leger: {
    label: "Léger",
    rewardedTakeRatePerSession: 0.15,
    interstitialTakeRatePerSession: 0,
  },
  equilibre: {
    label: "Équilibré",
    rewardedTakeRatePerSession: 0.35,
    interstitialTakeRatePerSession: 0.2,
  },
  plusMonetise: {
    label: "Plus monétisé",
    rewardedTakeRatePerSession: 0.5,
    interstitialTakeRatePerSession: 0.5,
  },
};

const MAU_TIERS = [500, 5000, 50000]; // bêta privée / lancement organique modeste / succès organique
const UA_MONTHLY_BUDGET_CAPS_USD = [0, 100, 500]; // plafonds hypothétiques, à valider par le porteur

function revenuePerMauPerMonth(scenario, rewardedEcpm = REWARDED_ECPM_BLENDED_USD, interstitialEcpm = INTERSTITIAL_ECPM_USD, sessionsPerMonth = SESSIONS_PER_MAU_PER_MONTH) {
  const rewardedRevenue = sessionsPerMonth * scenario.rewardedTakeRatePerSession * (rewardedEcpm / 1000);
  const interstitialRevenue = sessionsPerMonth * scenario.interstitialTakeRatePerSession * (interstitialEcpm / 1000);
  return rewardedRevenue + interstitialRevenue;
}

function monthlyNetRevenue(scenario, mau) {
  const perMau = revenuePerMauPerMonth(scenario);
  const gross = perMau * mau;
  const fixedCosts = 0; // GitHub Pages (gratuit) + PWA, aucun serveur -- voir limite documentée
  return { perMau, gross, fixedCosts, net: gross - fixedCosts };
}

function uaPayback(scenario, monthlyBudgetUsd) {
  if (monthlyBudgetUsd === 0) return { installsBought: 0, months: null, note: "aucune dépense UA" };
  const installsBought = monthlyBudgetUsd / CPI_BLENDED_USD;
  const perMauMonthly = revenuePerMauPerMonth(scenario);
  const totalRevenueOverActiveWindow = installsBought * perMauMonthly * ACQUIRED_USER_ACTIVE_MONTHS;
  const months = totalRevenueOverActiveWindow > 0 ? monthlyBudgetUsd / (totalRevenueOverActiveWindow / ACQUIRED_USER_ACTIVE_MONTHS) : null;
  return { installsBought, totalRevenueOverActiveWindow, months };
}

function printTable() {
  console.log("=== Paramètres dérivés (ESTIMATES à partir de faits SOURCED) ===");
  console.log(`eCPM récompensée mixte: $${REWARDED_ECPM_BLENDED_USD.toFixed(2)} / eCPM interstitiel: $${INTERSTITIAL_ECPM_USD.toFixed(2)}`);
  console.log(`CPI stratégie mixte (70% Android/30% iOS): $${CPI_BLENDED_USD.toFixed(2)}`);
  console.log("");

  for (const [key, scenario] of Object.entries(SCENARIOS)) {
    console.log(`--- Scénario: ${scenario.label} ---`);
    const perMau = revenuePerMauPerMonth(scenario);
    console.log(`  Revenu/MAU/mois: $${perMau.toFixed(4)}`);
    for (const mau of MAU_TIERS) {
      const { gross, net } = monthlyNetRevenue(scenario, mau);
      console.log(`  MAU=${mau.toString().padStart(6)} -> revenu brut/mois: $${gross.toFixed(2)}  (net, coûts fixes=$0: $${net.toFixed(2)})`);
    }
    for (const budget of UA_MONTHLY_BUDGET_CAPS_USD) {
      const { installsBought, months } = uaPayback(scenario, budget);
      if (budget === 0) continue;
      console.log(
        `  UA plafonnée $${budget}/mois -> ${installsBought.toFixed(0)} installs, ` +
        `retour sur investissement estimé: ${months ? months.toFixed(1) + " mois" : "jamais (revenu insuffisant)"}`
      );
    }
    console.log("");
  }

  console.log("=== Analyse de sensibilité (scénario Équilibré, MAU=5000) ===");
  const base = SCENARIOS.equilibre;
  for (const factor of [0.5, 1, 1.5]) {
    const revenue = revenuePerMauPerMonth(base, REWARDED_ECPM_BLENDED_USD * factor, INTERSTITIAL_ECPM_USD * factor) * 5000;
    console.log(`  eCPM x${factor} -> revenu brut/mois: $${revenue.toFixed(2)}`);
  }
  for (const factor of [0.5, 1, 1.5]) {
    const revenue = revenuePerMauPerMonth(base, REWARDED_ECPM_BLENDED_USD, INTERSTITIAL_ECPM_USD, SESSIONS_PER_MAU_PER_MONTH * factor) * 5000;
    console.log(`  sessions/mois x${factor} -> revenu brut/mois: $${revenue.toFixed(2)}`);
  }
}

printTable();

export { SCENARIOS, MAU_TIERS, revenuePerMauPerMonth, monthlyNetRevenue, uaPayback, REWARDED_ECPM_BLENDED_USD, INTERSTITIAL_ECPM_USD, CPI_BLENDED_USD };
