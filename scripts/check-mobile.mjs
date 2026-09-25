// Vérifications mobiles réelles (Playwright + build de production) : pas de
// débordement horizontal, cycle tactile construire/améliorer sans erreur
// console, pause automatique sur perte de focus, redimensionnement/rotation,
// sauvegarde persistée après rechargement, PWA (manifest/icônes/SW), le SW
// ne sert jamais une version périmée, cycle de vie de la musique, identifiant
// de build exact -- même socle que les projets précédents, adapté à BASTION
// LINE (cahier des charges V0, section 17).
import { chromium } from "playwright";
import { spawn, spawnSync, execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PORT = 4173;
const BASE_URL = `http://localhost:${PORT}`;

function log(...args) {
  console.log("[check-mobile]", ...args);
}

async function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      /* pas encore prêt */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

async function main() {
  if (!existsSync(join(ROOT, "dist", "index.html"))) {
    log("dist/ absent, build...");
    const build = spawnSync("npm", ["run", "build"], { cwd: ROOT, stdio: "inherit" });
    if (build.status !== 0) throw new Error("build a échoué");
  }

  const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], {
    cwd: ROOT,
    stdio: "ignore",
  });

  let failures = 0;
  try {
    const ready = await waitForServer(BASE_URL, 20_000);
    if (!ready) throw new Error("le serveur de preview n'a jamais répondu");

    const knownChromiumPath = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
    const browser = await chromium.launch({
      executablePath: existsSync(knownChromiumPath) ? knownChromiumPath : undefined,
      args: ["--no-sandbox"],
    });

    // --- Test 1 : pas de débordement horizontal à plusieurs largeurs ---
    for (const width of [320, 360, 390, 414, 480]) {
      const page = await (await browser.newContext({ viewport: { width, height: 800 }, hasTouch: true })).newPage();
      await page.goto(BASE_URL, { waitUntil: "networkidle" });
      const info = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      const overflow = info.scrollWidth > info.clientWidth;
      if (overflow) {
        failures += 1;
        log(`ÉCHEC largeur ${width}px : débordement horizontal`, info);
      } else {
        log(`OK largeur ${width}px : aucun débordement`);
      }
      await page.close();
    }

    // --- Test 2 : cycle tactile réel construire + améliorer, sans erreur console ---
    {
      const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(`console: ${m.text()}`);
      });

      await page.goto(BASE_URL, { waitUntil: "networkidle" });
      await page.click("#btn-play");
      await page.waitForTimeout(200);

      const stateBefore = await page.evaluate(() => window.__bastionDebugState());
      const slot = stateBefore.buildSlots[0];
      await page.evaluate(([x, y]) => window.__bastionDebugTapArena(x, y), [slot.x, slot.y]);
      await page.waitForTimeout(150);
      const buildOptionVisible = (await page.locator(".tower-option").count()) > 0;
      await page.locator(".tower-option").first().click();
      await page.waitForTimeout(150);
      const stateAfterBuild = await page.evaluate(() => window.__bastionDebugState());
      const towerBuilt = stateAfterBuild.towers.length === 1;

      // Améliorer la tour qu'on vient de construire.
      const tower = stateAfterBuild.towers[0];
      await page.evaluate(([x, y]) => window.__bastionDebugTapArena(x, y), [tower.x, tower.y]);
      await page.waitForTimeout(150);
      const upgradeOptionVisible = (await page.locator(".tower-option").count()) > 0;
      await page.locator(".tower-option").first().click();
      await page.waitForTimeout(150);
      const stateAfterUpgrade = await page.evaluate(() => window.__bastionDebugState());
      const towerUpgraded = stateAfterUpgrade.towers[0].tier === 1;

      if (errors.length > 0 || !buildOptionVisible || !towerBuilt || !upgradeOptionVisible || !towerUpgraded) {
        failures += 1;
        log("ÉCHEC cycle tactile construire/améliorer", { buildOptionVisible, towerBuilt, upgradeOptionVisible, towerUpgraded, errors });
      } else {
        log("OK : cycle tactile construire + améliorer sans erreur console");
      }
      await page.close();
    }

    // --- Test 2b : construction via un VRAI tap tactile, à un ratio de
    // pixels par point (deviceScaleFactor) réaliste pour un téléphone Android
    // (ex. 3) -- non-régression de la bêta physique V0 : le test 2
    // ci-dessus utilise le hook de debug __bastionDebugTapArena, qui
    // court-circuite entièrement le mapping écran->arène et ne peut donc
    // JAMAIS révéler un bug de coordonnées. Playwright par défaut utilise un
    // deviceScaleFactor de 1 (canvas.width == largeur CSS), ce qui masquait
    // silencieusement le bug réel : sur un vrai téléphone, canvas.width est
    // mis à l'échelle par le devicePixelRatio (voir main.js resizeCanvas)
    // alors que les événements pointeur réels restent en pixels CSS. Ce test
    // dispatch un VRAI événement tactile (page.touchscreen.tap) à la
    // position ÉCRAN calculée à partir du rendu réel, exactement comme un
    // doigt sur un écran haute densité.
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 3 });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
      await page.goto(BASE_URL, { waitUntil: "networkidle" });
      await page.click("#btn-play");
      await page.waitForTimeout(200);

      const stateBefore = await page.evaluate(() => window.__bastionDebugState());
      const slot = stateBefore.buildSlots[0];

      // Reproduit exactement computeViewport() (src/ui/viewport.js) pour
      // convertir la position arène du slot en position ÉCRAN réelle, à
      // partir des dimensions CSS réelles du canvas -- jamais de son buffer.
      const screenPos = await page.evaluate(([sx, sy]) => {
        const canvas = document.getElementById("game-canvas");
        const rect = canvas.getBoundingClientRect();
        const ARENA_W = 400, ARENA_H = 700;
        const scale = Math.min(rect.width / ARENA_W, rect.height / ARENA_H);
        const offsetX = (rect.width - ARENA_W * scale) / 2;
        const offsetY = (rect.height - ARENA_H * scale) / 2;
        return { x: rect.left + offsetX + sx * scale, y: rect.top + offsetY + sy * scale };
      }, [slot.x, slot.y]);

      await page.touchscreen.tap(screenPos.x, screenPos.y);
      await page.waitForTimeout(200);
      const buildOptionVisible = (await page.locator(".tower-option").count()) > 0;
      if (buildOptionVisible) {
        await page.locator(".tower-option").first().click();
        await page.waitForTimeout(150);
      }
      const stateAfter = await page.evaluate(() => window.__bastionDebugState());
      const towerBuilt = stateAfter.towers.length === 1;

      if (errors.length > 0 || !buildOptionVisible || !towerBuilt) {
        failures += 1;
        log("ÉCHEC construction via vrai tap tactile (deviceScaleFactor=3)", { screenPos, buildOptionVisible, towerBuilt, errors });
      } else {
        log("OK : construction fonctionne via un vrai tap tactile à deviceScaleFactor=3 (non-régression bêta physique)");
      }
      await page.close();
    }

    // --- Test 3 : perte de focus -> pause automatique ---
    {
      const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
      await page.goto(BASE_URL, { waitUntil: "networkidle" });
      await page.click("#btn-play");
      await page.waitForTimeout(150);
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", { value: true, configurable: true });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await page.waitForTimeout(200);
      const pausedOverlay = await page.evaluate(() => document.querySelector("#overlay-root .overlay") !== null);
      if (!pausedOverlay) {
        failures += 1;
        log("ÉCHEC : la perte de focus ne déclenche pas la pause");
      } else {
        log("OK : perte de focus -> pause automatique");
      }
      await page.close();
    }

    // --- Test 4 : redimensionnement/rotation ne casse pas le rendu ---
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.goto(BASE_URL, { waitUntil: "networkidle" });
      await page.click("#btn-play");
      await page.setViewportSize({ width: 844, height: 390 });
      await page.waitForTimeout(300);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(300);
      const canvasSize = await page.evaluate(() => {
        const c = document.getElementById("game-canvas");
        return { w: c.width, h: c.height };
      });
      if (errors.length > 0 || canvasSize.w === 0 || canvasSize.h === 0) {
        failures += 1;
        log("ÉCHEC redimensionnement/rotation", { errors, canvasSize });
      } else {
        log("OK : redimensionnement/rotation sans erreur, canvas redimensionné", canvasSize);
      }
      await page.close();
    }

    // --- Test 5 : sauvegarde (niveau débloqué + réglages) persistée après rechargement ---
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
      const page = await context.newPage();
      await page.goto(BASE_URL, { waitUntil: "networkidle" });
      await page.evaluate(() => {
        localStorage.setItem(
          "bastion-line-v0-save",
          JSON.stringify({ version: 1, unlockedLevelIndex: 2, tutorialsSeen: { first_build_slot: true }, settings: { music: true, sfx: false } })
        );
      });
      await page.reload({ waitUntil: "networkidle" });
      const btnText = await page.textContent("#btn-play").catch(() => "");
      const sfxOffPersisted = await page.evaluate(() => JSON.parse(localStorage.getItem("bastion-line-v0-save")).settings.sfx === false);
      if (btnText !== "Continuer" || !sfxOffPersisted) {
        failures += 1;
        log("ÉCHEC reprise après rechargement", { btnText, sfxOffPersisted });
      } else {
        log("OK : progression + réglages persistés après rechargement complet");
      }
      await page.close();
    }

    // --- Test 6 : PWA -- manifest valide, icônes accessibles, SW enregistré ---
    {
      const page = await browser.newPage();
      await page.goto(BASE_URL, { waitUntil: "networkidle" });
      const manifestHref = await page.evaluate(() => document.querySelector('link[rel="manifest"]')?.href);
      let manifestOk = false;
      let iconsOk = false;
      // Non-régression bêta physique V0 (#3) : ce test vérifiait seulement
      // que le manifest est un JSON valide et que ses icônes répondent en
      // 200 -- il ne vérifiait JAMAIS les critères réels d'installabilité
      // Chrome/Android (au moins une icône RASTER -- PNG/WebP, jamais SVG
      // seul -- déclarant une taille standard 192x192 ou 512x512). C'est
      // exactement pourquoi ce test était vert alors que l'invite
      // d'installation n'apparaissait jamais sur téléphone réel.
      let installableIconOk = false;
      if (manifestHref) {
        const res = await page.evaluate(async (href) => {
          const r = await fetch(href);
          if (!r.ok) return null;
          return r.json();
        }, manifestHref);
        manifestOk = !!(res && res.icons && res.icons.length > 0 && res.name);
        if (res && res.icons) {
          const iconChecks = await page.evaluate(async (icons) => {
            const results = [];
            for (const icon of icons) {
              try {
                const r = await fetch(icon.src);
                results.push(r.ok);
              } catch {
                results.push(false);
              }
            }
            return results;
          }, res.icons);
          iconsOk = iconChecks.length > 0 && iconChecks.every(Boolean);
          installableIconOk = res.icons.some((icon) => {
            const isRaster = icon.type === "image/png" || icon.type === "image/webp";
            const sizeOk = (icon.sizes || "").split(" ").some((s) => {
              const [w, h] = s.split("x").map(Number);
              return w >= 192 && h >= 192;
            });
            return isRaster && sizeOk;
          });
        }
      }
      await page.waitForTimeout(300);
      const swRegistered = await page.evaluate(async () => {
        if (!("serviceWorker" in navigator)) return false;
        const regs = await navigator.serviceWorker.getRegistrations();
        return regs.length > 0;
      });
      if (!manifestOk || !iconsOk || !swRegistered || !installableIconOk) {
        failures += 1;
        log("ÉCHEC PWA", { manifestHref, manifestOk, iconsOk, swRegistered, installableIconOk });
      } else {
        log("OK : PWA (manifest valide, icônes accessibles dont une raster >=192x192, service worker enregistré)");
      }
      await page.close();
    }

    // --- Test 7 : le service worker ne sert jamais une version périmée ---
    {
      const page = await browser.newPage();
      await page.goto(BASE_URL, { waitUntil: "networkidle" });
      await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
      });
      await page.reload({ waitUntil: "networkidle" });
      await page.evaluate(async (docUrl) => {
        const keys = await caches.keys();
        const cacheName = keys[0];
        if (!cacheName) throw new Error("aucun cache trouvé -- le SW n'a pas encore écrit");
        const cache = await caches.open(cacheName);
        await cache.put(
          docUrl,
          new Response("<html><body>VERSION-PERIMEE-V0-TEST</body></html>", { status: 200, headers: { "Content-Type": "text/html" } })
        );
      }, BASE_URL + "/");
      await page.reload({ waitUntil: "networkidle" });
      const html = await page.content();
      const staleServed = html.includes("VERSION-PERIMEE-V0-TEST");
      const gameLoaded = await page.locator("#btn-play").count();
      if (staleServed || gameLoaded === 0) {
        failures += 1;
        log("ÉCHEC anti-péremption du service worker", { staleServed, gameLoaded });
      } else {
        log("OK : le service worker sert la version fraîche même avec une entrée de cache périmée empoisonnée délibérément");
      }
      await page.close();
    }

    // --- Test 8 : cycle de vie de la musique -- démarre sur geste réel,
    // s'arrête en arrière-plan, reprend proprement, un seul AudioContext ---
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.goto(BASE_URL, { waitUntil: "networkidle" });

      const beforePlay = await page.evaluate(() => window.__bastionDebugAudioState?.() ?? null);
      await page.click("#btn-play");
      await page.waitForTimeout(200);
      const afterPlay = await page.evaluate(() => window.__bastionDebugAudioState?.() ?? null);

      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", { value: true, configurable: true });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      await page.waitForTimeout(150);
      const afterHidden = await page.evaluate(() => window.__bastionDebugAudioState?.() ?? null);

      await page.click("#btn-resume");
      await page.waitForTimeout(200);
      const afterResume = await page.evaluate(() => window.__bastionDebugAudioState?.() ?? null);

      const startedOnGesture = beforePlay && !beforePlay.musicRunning && afterPlay.musicRunning;
      const stoppedOnBackground = afterHidden && !afterHidden.musicRunning;
      const resumedCleanly = afterResume && afterResume.musicRunning;
      const singleAudioContext =
        afterPlay && afterHidden && afterResume && afterPlay.audioContextCreations === 1 && afterHidden.audioContextCreations === 1 && afterResume.audioContextCreations === 1;

      if (errors.length > 0 || !startedOnGesture || !stoppedOnBackground || !resumedCleanly || !singleAudioContext) {
        failures += 1;
        log("ÉCHEC cycle de vie musique", { beforePlay, afterPlay, afterHidden, afterResume, errors });
      } else {
        log("OK : musique démarrée sur geste réel, arrêtée en arrière-plan, reprise proprement, un seul AudioContext");
      }
      await page.close();
    }

    // --- Test 9 : identifiant de build affiché, exact, correspond au commit réel ---
    {
      const page = await browser.newPage();
      await page.goto(BASE_URL, { waitUntil: "networkidle" });
      await page.click("#btn-settings");
      const buildId = await page.textContent("#build-id").catch(() => "");
      const pkgVersion = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).version;
      let expectedHash;
      try {
        expectedHash = execSync("git rev-parse --short HEAD", { cwd: ROOT }).toString().trim();
      } catch {
        expectedHash = null;
      }
      const format = /^v\d+\.\d+\.\d+\+[0-9a-f]{7}$/;
      const matchesFormat = format.test(buildId);
      const matchesVersion = buildId.includes(`v${pkgVersion}+`);
      const matchesCommit = !expectedHash || buildId.endsWith(`+${expectedHash}`);
      if (!matchesFormat || !matchesVersion || !matchesCommit) {
        failures += 1;
        log("ÉCHEC identifiant de build", { buildId, pkgVersion, expectedHash, matchesFormat, matchesVersion, matchesCommit });
      } else {
        log(`OK : identifiant de build affiché et exact (${buildId})`);
      }
      await page.close();
    }

    // --- Test 10 : durcissement du cycle de vie du service worker -- un
    // onglet ouvert détecte une mise à jour réelle et se recharge une fois ---
    {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.goto(BASE_URL, { waitUntil: "networkidle" });
      await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
      });
      await page.reload({ waitUntil: "networkidle" });
      await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
      });
      await page.evaluate(() => {
        window.__preUpdateMarker = "present-before-reload";
      });

      const swPath = join(ROOT, "dist", "sw.js");
      const originalSw = readFileSync(swPath, "utf8");
      const updatedSw = originalSw.replace('const CACHE_NAME = "bastion-line-cache-v1";', 'const CACHE_NAME = "bastion-line-cache-v1-test-update";');
      if (updatedSw === originalSw) throw new Error("le remplacement du CACHE_NAME dans sw.js n'a rien changé -- test invalide");
      writeFileSync(swPath, updatedSw);

      try {
        await page.evaluate(() => {
          Object.defineProperty(document, "hidden", { value: true, configurable: true });
          document.dispatchEvent(new Event("visibilitychange"));
        });
        await page.evaluate(() => {
          Object.defineProperty(document, "hidden", { value: false, configurable: true });
          document.dispatchEvent(new Event("visibilitychange"));
        });
        await page.waitForFunction(() => window.__preUpdateMarker === undefined, { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(300);

        const markerGoneAfterReload = await page.evaluate(() => window.__preUpdateMarker === undefined);
        const stillPlayable = (await page.locator("#btn-play").count()) > 0;

        if (errors.length > 0 || !markerGoneAfterReload || !stillPlayable) {
          failures += 1;
          log("ÉCHEC rechargement automatique après mise à jour du service worker", { markerGoneAfterReload, stillPlayable, errors });
        } else {
          log("OK : un onglet ouvert se recharge automatiquement dès qu'une nouvelle version du service worker prend le contrôle");
        }
      } finally {
        writeFileSync(swPath, originalSw);
      }
      await page.close();
    }

    await browser.close();
  } finally {
    server.kill();
  }

  if (failures > 0) {
    log(`${failures} échec(s).`);
    process.exit(1);
  }
  log("Tous les tests mobiles sont passés.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
