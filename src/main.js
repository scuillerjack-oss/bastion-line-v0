import { createLevelState } from "./engine/state.js";
import { BASE_R } from "./engine/constants.js";
import { tick, buildTower, upgradeTower, requestEarlyWave } from "./engine/simulation.js";
import { LEVELS } from "./engine/levels.js";
import { TOWER_FAMILIES, getMaxTier } from "./engine/towers.js";
import { loadSave, writeSave, markLevelUnlocked } from "./engine/save.js";
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
const pauseBtn = document.getElementById("pause-btn");
const prepRow = document.getElementById("prep-row");
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

function renderOverlay(html) {
  overlayRoot.innerHTML = html;
}
function clearOverlay() {
  overlayRoot.innerHTML = "";
}
function renderPanel(html, anchorTop = false) {
  panelRoot.classList.toggle("panel-root--top", anchorTop);
  panelRoot.innerHTML = html;
}

// Positionnement adaptatif du sélecteur (cahier V2, priorité 2) : une
// feuille ancrée en bas qui s'ouvre sur un emplacement déjà proche du bas
// de l'écran finit par se superposer au point que le joueur vient de
// tapoter. On calcule la position ÉCRAN réelle (pas seulement l'arène) du
// point tapé via le même viewport que la couche tactile, et on ouvre le
// sélecteur ancré en haut dès qu'il tomberait dans la zone basse que la
// feuille occuperait de toute façon.
function shouldAnchorPanelTop(arenaY) {
  const viewport = tap.getViewport();
  const rect = canvas.getBoundingClientRect();
  const screenY = rect.top + viewport.offsetY + arenaY * viewport.scale;
  return screenY > window.innerHeight * 0.6;
}
function closePanel() {
  panelRoot.innerHTML = "";
  if (state) state.selectedTowerId = null;
}

function updateHud() {
  if (!state) return;
  baseHpEl.textContent = String(Math.max(0, state.baseHp));
  coinsEl.textContent = String(state.coins);
  waveEl.textContent = `${Math.max(1, state.waveIndex + 1)}/${state.totalWaves}`;
  const inPrep = state.status === "prep";
  prepRow.hidden = !inPrep || appPhase !== "playing";
  if (inPrep) {
    prepTimerEl.textContent = `${Math.max(0, Math.ceil(state.prepRemainingMs / 1000))}s`;
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
  const unlocked = save.unlockedLevelIndex;
  renderOverlay(`
    <div class="overlay">
      <h1>BASTION LINE</h1>
      <p>Construis, défends, prépare la vague suivante.</p>
      <button class="overlay-btn" id="btn-play">${unlocked > 0 ? "Continuer" : "Jouer"}</button>
      <button class="overlay-btn secondary" id="btn-settings">Réglages</button>
      ${renderInstallBanner()}
    </div>
  `);
  document.getElementById("btn-play").addEventListener("click", () => {
    startMusic();
    startLevel(unlocked);
  });
  document.getElementById("btn-settings").addEventListener("click", showSettings);
  wireInstallBanner();
}

function showSettings() {
  clearOverlay();
  renderOverlay(`
    <div class="overlay">
      <h1>Réglages</h1>
      <div class="settings-row"><span>Musique</span><input type="checkbox" id="opt-music" ${save.settings.music ? "checked" : ""}/></div>
      <div class="settings-row"><span>Effets sonores</span><input type="checkbox" id="opt-sfx" ${save.settings.sfx ? "checked" : ""}/></div>
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
  document.getElementById("btn-back").addEventListener("click", showMenu);
}

function startLevel(index) {
  levelIndex = Math.max(0, Math.min(LEVELS.length - 1, index));
  const level = LEVELS[levelIndex];
  state = createLevelState(level);
  state.selectedTowerId = null;
  effects = [];
  seenEnemyKindsThisLevel.clear();
  clearOverlay();
  closePanel();
  appPhase = "playing";
  updateHud();
  if (level.paths.length > 1) tutorial.show("first_multi_path");
}

function showLevelResult(won) {
  appPhase = "paused"; // fige le tap/HUD pendant l'écran de résultat, sans arrêter le rendu
  closePanel();
  if (won) {
    sfx.win();
    const isLast = levelIndex >= LEVELS.length - 1;
    markLevelUnlocked(save, Math.min(LEVELS.length - 1, levelIndex + 1));
    renderOverlay(`
      <div class="overlay">
        <h1>Niveau réussi !</h1>
        <p>Base à ${Math.max(0, state.baseHp)}/${state.baseMaxHp} points de vie.</p>
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

function openBuildPanel(slot) {
  if (!state || appPhase !== "playing") return;
  tutorial.show("first_build_slot");
  const rows = state.unlockedTowers
    .map((familyId) => familyDescRow(familyId, TOWER_FAMILIES[familyId].buildCost, state.coins < TOWER_FAMILIES[familyId].buildCost, null))
    .join("");
  renderPanel(
    `
    <div class="build-panel">
      <h2>Construire</h2>
      ${rows}
      <button class="panel-close" id="panel-close">Fermer</button>
    </div>
  `,
    shouldAnchorPanelTop(slot.y)
  );
  panelRoot.querySelectorAll(".tower-option").forEach((btn) => {
    btn.addEventListener("click", () => {
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

function openUpgradePanel(tower) {
  if (!state || appPhase !== "playing") return;
  tutorial.show("first_upgrade");
  state.selectedTowerId = tower.id;
  const family = TOWER_FAMILIES[tower.family];
  const maxTier = getMaxTier(tower.family);
  const isMax = tower.tier >= maxTier;
  const nextStats = isMax ? null : family.tiers[tower.tier + 1];
  renderPanel(
    `
    <div class="build-panel">
      <h2>${family.name} -- palier ${tower.tier + 1}/${maxTier + 1}</h2>
      ${
        isMax
          ? `<p style="color:var(--text-dim);font-size:0.85rem;margin:0;">Palier maximum atteint.</p>`
          : familyDescRow(tower.family, nextStats.upgradeCost, state.coins < nextStats.upgradeCost, null)
      }
      <button class="panel-close" id="panel-close">Fermer</button>
    </div>
  `,
    shouldAnchorPanelTop(tower.y)
  );
  const upgradeBtn = panelRoot.querySelector(".tower-option");
  if (upgradeBtn) {
    upgradeBtn.addEventListener("click", () => {
      if (upgradeTower(state, tower.id)) {
        sfx.upgrade();
        closePanel();
      }
    });
  }
  document.getElementById("panel-close").addEventListener("click", closePanel);
}

function onTap(arenaPos) {
  if (!state || appPhase !== "playing") return;
  const tower = hitTestTower(state, arenaPos);
  if (tower) {
    openUpgradePanel(tower);
    return;
  }
  const slot = hitTestEmptySlot(state, arenaPos);
  if (slot) {
    openBuildPanel(slot);
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
      else if (ev.family === "controle") sfx.shootControle();
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
      effects.push({ x: ev.x, y: ev.y, radius: ev.radius, createdAt: nowMs, durationMs: 260 });
    } else if (ev.type === "impact_single") {
      effects.push({ x: ev.x, y: ev.y, radius: 10, createdAt: nowMs, durationMs: 160 });
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
    drawFrame(ctx, canvas.width, canvas.height, state, effects, nowMs);
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
