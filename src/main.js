import { createLevelState } from "./engine/state.js";
import { BASE_R } from "./engine/constants.js";
import { tick, buildTower, upgradeTower, sellTower, requestEarlyWave } from "./engine/simulation.js";
import { LEVELS, getWaveComposition } from "./engine/levels.js";
import { TOWER_FAMILIES, getMaxTier, getTowerSellRefund } from "./engine/towers.js";
import { ENEMY_KINDS } from "./engine/enemies.js";
import { loadSave, writeSave, markLevelCompleted, getUnlockedUpToIndex, isLevelCompleted } from "./engine/save.js";
import { createTapController, hitTestTower, hitTestEmptySlot } from "./ui/input.js";
import { drawFrame } from "./ui/render.js";
import { createTutorialController } from "./ui/tutorial.js";
import { sfx, setAudioEnabled, setMusicEnabled, startMusic, stopMusic, resumeMusic, getAudioDebugState } from "./ui/audio.js";
import { createInstallController } from "./ui/pwaInstall.js";

const FIXED_DT = 1000 / 60;
const MAX_FRAME_MS = 250; // clamp après un long gel (onglet en arrière-plan) : jamais rattraper des secondes d'un coup

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");
const overlayRoot = document.getElementById("overlay-root");
const panelRoot = document.getElementById("panel-root");
const tutorialToast = document.getElementById("tutorial-toast");
const baseHpEl = document.getElementById("base-hp-value");
const coinsEl = document.getElementById("coins-value");
const waveEl = document.getElementById("wave-value");
const levelLabelEl = document.getElementById("level-label");
const pauseBtn = document.getElementById("pause-btn");
const prepRow = document.getElementById("prep-row");
const wavePreviewEl = document.getElementById("wave-preview");
const prepTimerEl = document.getElementById("prep-timer");
const launchWaveBtn = document.getElementById("btn-launch-wave");

const save = loadSave();
setAudioEnabled(save.settings.sfx);
setMusicEnabled(save.settings.music);

const seenEnemyKindsThisLevel = new Set();

let state = null;
let levelIndex = 0;
let appPhase = "menu"; // menu | playing | paused
let effects = [];
let nowMs = 0;
// Micro-secousse bornée (cahier V8, section 5 : "autoriser une légère
// vibration/micro-recul sur les impacts lourds, jamais un screen-shake
// permanent") -- réservée au seul impact de zone de la catapulte, durée
// fixe très courte (140ms), jamais ré-armée en continu par des tirs
// rapprochés (un seul créneau actif à la fois, le plus récent écrase
// simplement le précédent).
let shakeUntilMs = 0;

const tutorial = createTutorialController(save, tutorialToast);
const tap = createTapController(canvas, onTap);
const installCtl = createInstallController(window);
window.addEventListener("beforeinstallprompt", () => {
  // Le natif Chrome ne signale sa disponibilité qu'APRÈS coup -- si le menu
  // est déjà affiché, on le redessine pour que le bouton "Installer"
  // apparaisse sans que le joueur ait à rouvrir l'écran.
  if (appPhase === "menu") showMenu();
});

function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  tap.updateViewport();
}
window.addEventListener("resize", resizeCanvas);
window.addEventListener("orientationchange", () => setTimeout(resizeCanvas, 50));
// Cause racine V6 (cahier V6, section 5 -- audit tactile) : la boîte CSS du
// canvas ne change pas seulement sur un vrai resize de fenêtre. .prep-row
// apparaît/disparaît à chaque transition préparation/vague (updateHud
// ci-dessous), ce qui redimensionne .bottombar puis .stage-wrap (flex:1)
// SANS jamais déclencher "resize" -- le buffer de dessin (canvas.width/
// height, mis à l'échelle par devicePixelRatio) restait alors périmé d'une
// frame à l'autre après une telle transition, jusqu'au prochain vrai
// resize. ResizeObserver observe la boîte réelle du conteneur et
// recalcule le buffer sur TOUT changement de taille, quelle qu'en soit la
// cause -- la correction structurelle, pas un cas particulier ajouté pour
// .prep-row seul. (Les taps eux-mêmes sont protégés indépendamment : voir
// ui/input.js, qui ne met plus rien en cache et recalcule sa propre
// géométrie à chaque appui.)
if (typeof ResizeObserver !== "undefined") {
  new ResizeObserver(() => resizeCanvas()).observe(canvas.parentElement);
}

function renderOverlay(html) {
  overlayRoot.innerHTML = html;
}
function clearOverlay() {
  overlayRoot.innerHTML = "";
}
function renderPanel(html) {
  panelRoot.innerHTML = html;
}

function closePanel() {
  panelRoot.innerHTML = "";
  if (state) state.selectedTowerId = null;
  panelGate = null;
}

// --- Verrou tactile en deux temps (cahier V3, section 1) -------------------
// Retour bêta V2 : malgré la correction Pointer Events (qui supprime déjà le
// click de compatibilité pour LE pointeur qui vient d'ouvrir le sélecteur),
// un vrai réflexe de double-tap RAPIDE -- deux contacts tactiles distincts et
// authentiques, très rapprochés dans le temps -- pouvait encore faire
// atterrir un second tap involontaire pile sur l'option qui vient d'
// apparaître. La règle V3 est stricte : un même GESTE (au sens large, y
// compris un double-tap réflexe) ne doit jamais à la fois sélectionner un
// emplacement et construire/choisir une défense. Deux conditions, cumulées,
// doivent être vraies avant qu'un bouton du sélecteur ne devienne actif :
//  1. le pointeur qui a ouvert le panneau a réellement été relâché
//     (pointerup/pointercancel) -- garantit qu'il ne s'agit jamais du MÊME
//     contact tactile qui glisserait sous le bouton ;
//  2. un délai minimal s'est écoulé depuis l'ouverture -- sépare un second
//     tap réellement délibéré d'un réflexe de double-tap. 300ms n'est pas
//     un nombre arbitraire masquant un bug : c'est la fenêtre de double-tap
//     standard des plateformes mobiles elles-mêmes (Android
//     ViewConfiguration.getDoubleTapTimeout() ≈ 300ms, iOS similaire) --
//     donc précisément le seuil au-delà duquel ces plateformes elles-mêmes
//     cessent de considérer deux taps comme UN SEUL geste.
// Le hook de debug __bastionDebugTapArena (tests non-tactiles uniquement,
// jamais exposé au joueur) n'a pas de pointerId réel : il ouvre un panneau
// directement "armé", puisqu'il ne correspond à aucun geste physique et ne
// peut donc jamais reproduire le risque de double-tap qu'on protège ici.
const PANEL_ARM_DELAY_MS = 300;
let panelGate = null;

function armPanelGate(pointerId) {
  panelGate = pointerId == null ? null : { pointerId, openedAt: performance.now(), released: false };
}
function isPanelArmed() {
  if (!panelGate) return true;
  return panelGate.released && performance.now() - panelGate.openedAt >= PANEL_ARM_DELAY_MS;
}
function releasePanelGate(ev) {
  if (panelGate && ev.pointerId === panelGate.pointerId) panelGate.released = true;
}
window.addEventListener("pointerup", releasePanelGate);
window.addEventListener("pointercancel", releasePanelGate);

// Aperçu de la prochaine vague (cahier V8, section 8) : reconstruit
// seulement quand la vague à venir change, jamais à chaque frame (updateHud
// est appelée à chaque tick pendant toute la préparation) -- un contenu
// statique ne justifie pas de réécrire le DOM 60 fois par seconde.
let lastPreviewWaveIndex = -2;

function updateHud() {
  if (!state) return;
  baseHpEl.textContent = String(Math.max(0, state.baseHp));
  coinsEl.textContent = String(state.coins);
  waveEl.textContent = `${Math.max(1, state.waveIndex + 1)}/${state.totalWaves}`;
  const inPrep = state.status === "prep";
  prepRow.hidden = !inPrep || appPhase !== "playing";
  if (inPrep) {
    prepTimerEl.textContent = `${Math.max(0, Math.ceil(state.prepRemainingMs / 1000))}s`;
    const nextWaveIndex = state.waveIndex + 1;
    if (nextWaveIndex !== lastPreviewWaveIndex) {
      lastPreviewWaveIndex = nextWaveIndex;
      const composition = getWaveComposition(state.level, nextWaveIndex);
      wavePreviewEl.innerHTML = composition
        .map(({ kind, count }) => {
          const kindDef = ENEMY_KINDS[kind];
          return `<span class="wave-chip" aria-label="${count} ${kindDef.name}"><span class="wave-chip-dot" style="background:${kindDef.color}"></span>${count}</span>`;
        })
        .join("");
    }
  }
}

// Priorité absolue V1 (cahier, section 3) : un chemin ÉVIDENT (pas caché
// dans les réglages) pour sortir d'un navigateur intégré incapable
// d'installer, ou pour déclencher l'invite native quand elle est vraiment
// disponible -- jamais une simple supposition que l'un ou l'autre marche.
function renderInstallBanner() {
  const s = installCtl.getState();
  if (s.standalone) return ""; // déjà installée : ne rien afficher
  if (s.embeddedWebView) {
    return `
      <div class="install-banner install-banner-warn">
        <p><strong>Navigateur intégré détecté.</strong> L'installation n'est pas possible depuis cette fenêtre.</p>
        <button class="overlay-btn small" id="btn-open-chrome">Ouvrir dans Chrome</button>
      </div>`;
  }
  if (s.promptAvailable) {
    return `
      <div class="install-banner">
        <button class="overlay-btn" id="btn-install-app">📲 Installer l'application</button>
      </div>`;
  }
  if (s.isIOS) {
    return `
      <div class="install-banner">
        <p>Pour installer : appuie sur <strong>Partager</strong> puis <strong>Sur l'écran d'accueil</strong>.</p>
      </div>`;
  }
  return `
    <div class="install-banner">
      <p>Pas d'invite d'installation ? Menu du navigateur (⋮) → <strong>Installer l'application</strong> / <strong>Ajouter à l'écran d'accueil</strong>.</p>
    </div>`;
}

function wireInstallBanner() {
  document.getElementById("btn-open-chrome")?.addEventListener("click", () => installCtl.openInChrome());
  document.getElementById("btn-install-app")?.addEventListener("click", async () => {
    await installCtl.promptInstall();
    showMenu();
  });
}

function showMenu() {
  appPhase = "menu";
  clearOverlay();
  closePanel();
  // Lecture TOUJOURS fraîche de la progression (cahier V7, section 8 :
  // "définir une source de vérité unique et robuste") -- jamais une copie
  // en mémoire potentiellement périmée (voir resyncProgressionFromStorage
  // plus bas, simplifié par ce même principe : plus rien à resynchroniser
  // manuellement puisque rien n'est jamais mis en cache ici).
  const unlocked = getUnlockedUpToIndex(loadSave());
  renderOverlay(`
    <div class="overlay">
      <h1>BASTION LINE</h1>
      <p>Construis, défends, prépare la vague suivante.</p>
      <button class="overlay-btn" id="btn-play">${unlocked > 0 ? "Continuer" : "Jouer"}</button>
      <button class="overlay-btn secondary" id="btn-levels">Niveaux</button>
      <button class="overlay-btn secondary" id="btn-settings">Réglages</button>
      ${renderInstallBanner()}
    </div>
  `);
  document.getElementById("btn-play").addEventListener("click", () => {
    startMusic();
    startLevel(unlocked);
  });
  document.getElementById("btn-levels").addEventListener("click", showLevelSelect);
  document.getElementById("btn-settings").addEventListener("click", showSettings);
  wireInstallBanner();
}

// Écran de sélection des niveaux (cahier V7, section 9) : grille compacte
// 1-50, 3 états visuellement non ambigus. Lecture TOUJOURS fraîche depuis
// le stockage (même principe que showMenu -- jamais une copie en mémoire,
// cahier V7, section 8). La progression étant strictement séquentielle
// (terminer N débloque N+1, aucun saut possible), il existe À TOUT INSTANT
// EXACTEMENT UN SEUL niveau "accessible mais non terminé" : le style "gris
// distinct" suffit donc, à lui seul, à identifier immédiatement le niveau
// à poursuivre (cahier V7 : "niveau à poursuivre immédiatement
// identifiable") -- aucun indicateur redondant à maintenir séparément.
function showLevelSelect() {
  appPhase = "menu";
  clearOverlay();
  closePanel();
  const freshSave = loadSave();
  const unlockedUpTo = getUnlockedUpToIndex(freshSave);
  const cells = LEVELS.map((level, i) => {
    const completed = isLevelCompleted(freshSave, i);
    const accessible = i <= unlockedUpTo;
    const state = completed ? "completed" : accessible ? "accessible" : "locked";
    const label = state === "locked" ? "&#128274;" : String(level.id);
    return `<button type="button" class="level-cell ${state}" data-index="${i}" ${accessible ? "" : "disabled"} aria-label="Niveau ${level.id}${completed ? ", terminé" : accessible ? ", à poursuivre" : ", verrouillé"}">${label}</button>`;
  }).join("");
  renderOverlay(`
    <div class="overlay level-select-overlay">
      <h1>Niveaux</h1>
      <div class="level-grid-scroll"><div class="level-grid">${cells}</div></div>
      <button class="overlay-btn secondary" id="btn-back-levels">Retour</button>
    </div>
  `);
  document.querySelectorAll(".level-cell.completed, .level-cell.accessible").forEach((btn) => {
    btn.addEventListener("click", () => {
      startMusic();
      startLevel(Number(btn.getAttribute("data-index")));
    });
  });
  document.getElementById("btn-back-levels").addEventListener("click", showMenu);
}

function showSettings() {
  clearOverlay();
  renderOverlay(`
    <div class="overlay">
      <h1>Réglages</h1>
      <div class="settings-row"><span>Musique</span><input type="checkbox" id="opt-music" ${save.settings.music ? "checked" : ""}/></div>
      <div class="settings-row"><span>Effets sonores</span><input type="checkbox" id="opt-sfx" ${save.settings.sfx ? "checked" : ""}/></div>
      <div class="settings-row"><span>Effets réduits</span><input type="checkbox" id="opt-reduced-fx" ${save.settings.reducedEffects ? "checked" : ""}/></div>
      <button class="overlay-btn" id="btn-back">Retour</button>
      <p class="build-id" id="build-id">${__BUILD_ID__}</p>
    </div>
  `);
  document.getElementById("opt-music").addEventListener("change", (e) => {
    save.settings.music = e.target.checked;
    setMusicEnabled(save.settings.music);
    if (save.settings.music) startMusic();
    writeSave(save);
  });
  document.getElementById("opt-sfx").addEventListener("change", (e) => {
    save.settings.sfx = e.target.checked;
    setAudioEnabled(save.settings.sfx);
    writeSave(save);
  });
  document.getElementById("opt-reduced-fx").addEventListener("change", (e) => {
    save.settings.reducedEffects = e.target.checked;
    writeSave(save);
  });
  document.getElementById("btn-back").addEventListener("click", showMenu);
}

function startLevel(index) {
  levelIndex = Math.max(0, Math.min(LEVELS.length - 1, index));
  const level = LEVELS[levelIndex];
  state = createLevelState(level);
  state.selectedTowerId = null;
  effects = [];
  seenEnemyKindsThisLevel.clear();
  lastPreviewWaveIndex = -2; // force la reconstruction de l'aperçu de vague pour ce nouveau niveau
  clearOverlay();
  closePanel();
  appPhase = "playing";
  // Affichage du niveau courant SEUL (cahier V4, section 6) : jamais de
  // forme "X/Y" pour le niveau -- le compteur de vagues (VAGUE X/Y,
  // ci-dessous dans updateHud) reste inchangé, c'est une information
  // différente (progression DANS ce niveau) non visée par cette demande.
  levelLabelEl.textContent = `Niveau ${levelIndex + 1}`;
  updateHud();
  if (level.paths.length > 1) tutorial.show("first_multi_path");
}

function showLevelResult(won) {
  appPhase = "paused"; // fige le tap/HUD pendant l'écran de résultat, sans arrêter le rendu
  closePanel();
  if (won) {
    sfx.win();
    const isLast = levelIndex >= LEVELS.length - 1;
    // Marque CE niveau comme réellement terminé (source de vérité unique,
    // cahier V7, section 8) -- jamais un index "débloqué" séparé. Rejouer un
    // niveau déjà terminé et le regagner est un no-op sûr par construction
    // (union d'ensemble, voir markLevelCompleted) : la progression maximale
    // ne peut jamais régresser.
    markLevelCompleted(save, levelIndex);
    // Polish léger V7-polish (cahier, section 6) : structure VALIDÉE
    // inchangée (fond assombri, titre, PV restants, boutons Niveau suivant/
    // Menu) -- aucun de ces éléments n'est retiré ni réorganisé. Seuls
    // ajouts : un badge de victoire (cercle + coche, pur CSS, voir
    // style.css .victory-badge) pour renforcer la hiérarchie visuelle avant
    // même de lire le titre, la statistique PV présentée comme une "puce"
    // plutôt qu'une phrase brute, et -- UNIQUEMENT si cela correspond à une
    // vraie progression du système (unlockedTowers par niveau, pas une
    // valeur inventée) -- la mention de la famille de tour nouvellement
    // débloquée à CE niveau. L'effet d'apparition (fondu + léger zoom,
    // .overlay) est partagé par tous les écrans de résultat, pas un
    // traitement spécial réservé à la victoire.
    const prevLevel = levelIndex > 0 ? LEVELS[levelIndex - 1] : null;
    const newlyUnlocked = (LEVELS[levelIndex].unlockedTowers || []).filter((f) => !prevLevel || !prevLevel.unlockedTowers.includes(f));
    const unlockLine = newlyUnlocked.length
      ? `<p class="overlay-unlock">Nouvelle défense débloquée : ${newlyUnlocked.map((f) => TOWER_FAMILIES[f].name).join(", ")}</p>`
      : "";
    renderOverlay(`
      <div class="overlay overlay-victory">
        <div class="victory-badge" aria-hidden="true"></div>
        <h1>Niveau réussi !</h1>
        <p class="overlay-stat">Base à <strong>${Math.max(0, state.baseHp)}/${state.baseMaxHp}</strong> points de vie</p>
        ${unlockLine}
        <button class="overlay-btn" id="btn-next">${isLast ? "Rejouer depuis le début" : "Niveau suivant"}</button>
        <button class="overlay-btn secondary" id="btn-menu2">Menu</button>
      </div>
    `);
    document.getElementById("btn-next").addEventListener("click", () => startLevel(isLast ? 0 : levelIndex + 1));
  } else {
    sfx.lose();
    renderOverlay(`
      <div class="overlay">
        <h1>Base détruite</h1>
        <p>Vague ${state.waveIndex + 1}/${state.totalWaves} atteinte.</p>
        <button class="overlay-btn" id="btn-retry">Recommencer</button>
        <button class="overlay-btn secondary" id="btn-menu2">Menu</button>
      </div>
    `);
    document.getElementById("btn-retry").addEventListener("click", () => startLevel(levelIndex));
  }
  document.getElementById("btn-menu2").addEventListener("click", showMenu);
}

function showPauseMenu() {
  if (appPhase !== "playing") return;
  appPhase = "paused";
  stopMusic();
  closePanel();
  renderOverlay(`
    <div class="overlay">
      <h1>Pause</h1>
      <button class="overlay-btn" id="btn-resume">Reprendre</button>
      <button class="overlay-btn secondary" id="btn-restart">Recommencer</button>
      <button class="overlay-btn secondary" id="btn-menu">Retour au menu</button>
    </div>
  `);
  document.getElementById("btn-resume").addEventListener("click", () => {
    resumeMusic();
    clearOverlay();
    appPhase = "playing";
  });
  document.getElementById("btn-restart").addEventListener("click", () => startLevel(levelIndex));
  document.getElementById("btn-menu").addEventListener("click", showMenu);
}

pauseBtn.addEventListener("click", showPauseMenu);
document.addEventListener("visibilitychange", () => {
  if (document.hidden && appPhase === "playing") showPauseMenu();
});

launchWaveBtn.addEventListener("click", () => {
  if (!state) return;
  requestEarlyWave(state);
  tutorial.show("first_early_launch");
});

// --- Panneaux de construction / amélioration ------------------------------

function familyDescRow(familyId, cost, disabled, onClick) {
  const f = TOWER_FAMILIES[familyId];
  return `<button class="tower-option" data-family="${familyId}" ${disabled ? "disabled" : ""}>
    <span><span class="name">${f.name}</span><br/><span class="desc">${f.shortDesc}</span></span>
    <span class="cost">${cost}&#9679;</span>
  </button>`;
}

function openBuildPanel(slot, pointerId) {
  if (!state || appPhase !== "playing") return;
  tutorial.show("first_build_slot");
  armPanelGate(pointerId);
  const rows = state.unlockedTowers
    .map((familyId) => familyDescRow(familyId, TOWER_FAMILIES[familyId].buildCost, state.coins < TOWER_FAMILIES[familyId].buildCost, null))
    .join("");
  renderPanel(`
    <div class="build-panel">
      <h2>Construire</h2>
      ${rows}
      <button class="panel-close" id="panel-close">Fermer</button>
    </div>
  `);
  panelRoot.querySelectorAll(".tower-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!isPanelArmed()) return; // deuxième action pas encore reconnue comme distincte/volontaire (cahier V3 §1)
      const familyId = btn.getAttribute("data-family");
      if (buildTower(state, slot.id, familyId)) {
        sfx.build();
        tutorial.show(`first_tower_${familyId}`);
        closePanel();
      }
    });
  });
  document.getElementById("panel-close").addEventListener("click", closePanel);
}

function openUpgradePanel(tower, pointerId) {
  if (!state || appPhase !== "playing") return;
  tutorial.show("first_upgrade");
  state.selectedTowerId = tower.id;
  armPanelGate(pointerId);
  const family = TOWER_FAMILIES[tower.family];
  const maxTier = getMaxTier(tower.family);
  const isMax = tower.tier >= maxTier;
  const nextStats = isMax ? null : family.tiers[tower.tier + 1];
  const sellRefund = getTowerSellRefund(tower);
  renderPanel(`
    <div class="build-panel">
      <h2>${family.name} -- palier ${tower.tier + 1}/${maxTier + 1}</h2>
      ${
        isMax
          ? `<p style="color:var(--text-dim);font-size:0.85rem;margin:0;">Palier maximum atteint.</p>`
          : familyDescRow(tower.family, nextStats.upgradeCost, state.coins < nextStats.upgradeCost, null)
      }
      <button class="tower-option sell-option" id="btn-sell">
        <span><span class="name">Vendre</span><br/><span class="desc">Récupère une partie de l'investissement</span></span>
        <span class="cost sell">+${sellRefund}&#9679;</span>
      </button>
      <button class="panel-close" id="panel-close">Fermer</button>
    </div>
  `);
  const upgradeBtn = panelRoot.querySelector(".tower-option:not(.sell-option)");
  if (upgradeBtn) {
    upgradeBtn.addEventListener("click", () => {
      if (!isPanelArmed()) return;
      if (upgradeTower(state, tower.id)) {
        sfx.upgrade();
        closePanel();
      }
    });
  }
  document.getElementById("btn-sell").addEventListener("click", () => {
    if (!isPanelArmed()) return;
    openSellConfirm(tower, sellRefund);
  });
  document.getElementById("panel-close").addEventListener("click", closePanel);
}

// Confirmation de vente (cahier V4, section 3 : "Afficher clairement le prix
// de revente AVANT validation de l'action" + "Prévoir une confirmation
// explicite afin d'éviter une vente accidentelle"). Sous-panneau dédié
// (jamais un window.confirm() natif, hors style du jeu) avec son PROPRE
// délai anti-reflexe avant que le bouton de confirmation ne devienne actif
// -- même logique que le verrou tactile de construction/amélioration (V3),
// mais sans dépendre d'un pointerId : le clic qui ouvre ce sous-panneau a
// déjà, par construction, terminé son propre cycle pointerdown/pointerup
// (un clic ne se déclenche qu'APRÈS le relâchement), donc réutiliser
// panelGate/armPanelGate ici bloquerait le bouton en permanence -- un simple
// délai depuis l'ouverture suffit et reste cohérent avec le même seuil
// (PANEL_ARM_DELAY_MS) utilisé partout ailleurs dans l'interface.
function openSellConfirm(tower, refund) {
  const family = TOWER_FAMILIES[tower.family];
  const openedAt = performance.now();
  renderPanel(`
    <div class="build-panel">
      <h2>Vendre ${family.name} ?</h2>
      <p style="color:var(--text-dim);font-size:0.85rem;margin:0 0 4px;">Action définitive. Tu récupères une partie de ton investissement.</p>
      <button class="overlay-btn small" id="btn-sell-confirm">Confirmer (+${refund}&#9679;)</button>
      <button class="panel-close" id="panel-close">Annuler</button>
    </div>
  `);
  document.getElementById("btn-sell-confirm").addEventListener("click", () => {
    if (performance.now() - openedAt < PANEL_ARM_DELAY_MS) return;
    if (sellTower(state, tower.id)) {
      sfx.sell();
      closePanel();
    }
  });
  document.getElementById("panel-close").addEventListener("click", closePanel);
}

function onTap(arenaPos, pointerId) {
  if (!state || appPhase !== "playing") return;
  const tower = hitTestTower(state, arenaPos);
  if (tower) {
    openUpgradePanel(tower, pointerId);
    return;
  }
  const slot = hitTestEmptySlot(state, arenaPos);
  if (slot) {
    openBuildPanel(slot, pointerId);
    return;
  }
  closePanel();
}

// --- Événements moteur -> son / tutoriels / effets visuels ---------------

function handleEvents(events) {
  for (const ev of events) {
    if (ev.type === "tower_fired") {
      if (ev.family === "rapide") sfx.shootRapide();
      else if (ev.family === "canon") sfx.shootCanon();
      else if (ev.family === "longue_portee") sfx.shootLongue();
    } else if (ev.type === "enemy_killed") {
      sfx.enemyKilled();
    } else if (ev.type === "base_hit") {
      sfx.baseHit();
      effects.push({ kind: "base_hit", x: ev.x, y: ev.y, radius: BASE_R + 8, createdAt: nowMs, durationMs: 380 });
    } else if (ev.type === "wave_started") {
      sfx.waveStart();
      tutorial.show("first_wave");
    } else if (ev.type === "wave_cleared") {
      sfx.waveCleared();
    } else if (ev.type === "level_won") {
      showLevelResult(true);
    } else if (ev.type === "level_lost") {
      showLevelResult(false);
    } else if (ev.type === "impact_aoe") {
      // Feedback distinct par famille (cahier V8, section 5) : la catapulte
      // (impact lourd, poussière, micro-secousse) doit se reconnaître sans
      // ambiguïté du canon (explosion courte) au son ET à l'image, jamais
      // un seul anneau générique partagé par les deux comme avant ce
      // correctif.
      if (ev.family === "longue_portee") {
        sfx.impactLongue();
        if (!save.settings.reducedEffects) shakeUntilMs = nowMs + 140;
      } else {
        sfx.impactCanon();
      }
      effects.push({
        kind: "impact",
        family: ev.family,
        x: ev.x,
        y: ev.y,
        radius: ev.radius,
        createdAt: nowMs,
        durationMs: ev.family === "longue_portee" ? 420 : 260,
      });
    } else if (ev.type === "impact_single") {
      sfx.impactRapide();
      effects.push({ kind: "impact", family: ev.family, x: ev.x, y: ev.y, radius: 10, createdAt: nowMs, durationMs: 150 });
    } else if (ev.type === "enemy_spawned") {
      if (!seenEnemyKindsThisLevel.has(ev.kind)) {
        seenEnemyKindsThisLevel.add(ev.kind);
        if (ev.kind === "blinde") tutorial.show("first_enemy_blinde");
        else if (ev.kind === "essaim") tutorial.show("first_enemy_essaim");
        else if (ev.kind === "rapide") tutorial.show("first_enemy_rapide");
      }
    }
  }
}

// Dernier alpha de rendu calculé (voir ci-dessous) -- exposé en lecture
// seule pour le hook de debug __bastionDebugRenderAlpha, utilisé par le test
// mobile dédié à la non-régression de l'interpolation (cahier V7, section
// 10), jamais par l'UI du jeu elle-même.
let lastRenderAlpha = 1;

let lastTime = null;
function frame(now) {
  requestAnimationFrame(frame);
  nowMs = now;
  if (lastTime == null) lastTime = now;
  let delta = now - lastTime;
  lastTime = now;
  if (delta > MAX_FRAME_MS) delta = MAX_FRAME_MS;

  if (appPhase === "playing" && state) {
    state.accMs = (state.accMs || 0) + delta;
    while (state.accMs >= FIXED_DT) {
      tick(state, FIXED_DT);
      handleEvents(state.events);
      state.accMs -= FIXED_DT;
      if (appPhase !== "playing") break; // victoire/défaite déclenchée pendant ce sous-pas
    }
    updateHud();
  }

  effects = effects.filter((fx) => nowMs - fx.createdAt < fx.durationMs);

  if (state) {
    // Correction V7 (cahier V7, section 3 -- voir engine/simulation.js,
    // stepEnemies, pour le diagnostic complet) : state.accMs restant après
    // la boucle de ticks ci-dessus est exactement la fraction de temps du
    // PROCHAIN pas de simulation déjà écoulée mais pas encore simulée --
    // utilisée par drawFrame pour interpoler la position affichée des
    // ennemis/projectiles entre leur dernier et leur prochain tick, plutôt
    // que de figer l'affichage sur la dernière position simulée jusqu'au
    // prochain tick complet (seule source réelle des sauts rapportés en
    // bêta, sur les écrans à fréquence de rafraîchissement > 60Hz).
    const renderAlpha = Math.max(0, Math.min(1, (state.accMs || 0) / FIXED_DT));
    lastRenderAlpha = renderAlpha;
    // Micro-secousse bornée : magnitude décroît linéairement sur les 140ms
    // du créneau, jamais au-delà -- oscillation déterministe (sinus/cosinus
    // sur nowMs), jamais Math.random(), pour un mouvement cohérent d'une
    // frame à l'autre plutôt qu'un tremblement erratique.
    let shake = { x: 0, y: 0 };
    if (nowMs < shakeUntilMs) {
      const remaining = shakeUntilMs - nowMs;
      const magnitude = (remaining / 140) * 3;
      shake = { x: Math.sin(nowMs * 0.09) * magnitude, y: Math.cos(nowMs * 0.12) * magnitude };
    }
    drawFrame(ctx, canvas.width, canvas.height, state, effects, nowMs, renderAlpha, {
      shake,
      reducedEffects: save.settings.reducedEffects,
    });
  }
}

resizeCanvas();
showMenu();
requestAnimationFrame(frame);

// Hook de test UNIQUEMENT (utilisé par scripts/check-mobile.mjs), jamais
// appelé par l'UI du jeu -- lecture seule ou action directement équivalente
// à un vrai tap, jamais un raccourci exposé aux joueurs.
window.__bastionDebugTapArena = (x, y) => onTap({ x, y });
window.__bastionDebugState = () => state;
window.__bastionDebugStartLevel = (index) => startLevel(index);
window.__bastionDebugAudioState = getAudioDebugState;
window.__bastionDebugInstallState = () => installCtl.getState();
window.__bastionDebugRenderAlpha = () => lastRenderAlpha;

// Resynchronisation défensive de l'affichage au retour au premier plan
// (cahier V4, section 5 ; cahier V7, section 8 -- voir engine/save.js pour
// la cause racine complète et le nouveau modèle à source de vérité unique).
// showMenu() relit désormais TOUJOURS la progression fraîche depuis le
// stockage (plus aucune copie mise en cache à désynchroniser) -- il ne
// reste donc plus qu'à redéclencher un RE-RENDU du menu s'il est
// actuellement affiché, pour qu'une progression changée pendant que l'app
// était en arrière-plan (autre onglet, autre instance Android) se reflète
// immédiatement, sans comparaison manuelle de champs qui pourrait elle-même
// être une source d'oubli.
function resyncProgressionFromStorage() {
  if (appPhase === "menu") showMenu();
}
window.addEventListener("pageshow", (ev) => {
  if (ev.persisted) resyncProgressionFromStorage();
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) resyncProgressionFromStorage();
});

// PWA : enregistrement + rafraîchissement du service worker (même socle
// validé sur les projets précédents).
let swRegistration = null;
let swReloadTriggered = false;
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => {
        swRegistration = reg;
      })
      .catch(() => {});
  });
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (swReloadTriggered) return;
    swReloadTriggered = true;
    window.location.reload();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && swRegistration) swRegistration.update().catch(() => {});
  });
}
