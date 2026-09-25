// Capture des captures d'écran pour le rapport technique officiel (usage
// ponctuel, pas une suite de tests). Sert le build de production et pilote
// le jeu via les hooks de debug (__bastionDebugStartLevel, __bastionDebugTapArena)
// exposés uniquement pour les tests/QA, jamais utilisés par un vrai joueur.
import { chromium } from "playwright";
import { spawn, spawnSync, execSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "docs", "screenshots");
const PORT = 4174;
const BASE_URL = `http://localhost:${PORT}`;

async function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  if (!existsSync(join(ROOT, "dist", "index.html"))) {
    spawnSync("npm", ["run", "build"], { cwd: ROOT, stdio: "inherit" });
  }
  const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], {
    cwd: ROOT,
    stdio: "ignore",
  });
  try {
    if (!(await waitForServer(BASE_URL, 20_000))) throw new Error("serveur non prêt");
    const knownChromiumPath = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
    const browser = await chromium.launch({
      executablePath: existsSync(knownChromiumPath) ? knownChromiumPath : undefined,
      args: ["--no-sandbox"],
    });
    const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);

    // 1. Menu d'accueil
    await page.screenshot({ path: join(OUT, "01_accueil.png") });

    // 2. Niveau 1 en préparation (avant construction)
    await page.evaluate(() => window.__bastionDebugStartLevel(0));
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT, "02_niveau1_prep.png") });

    // 3. Construction d'une tour (panneau ouvert)
    await page.evaluate(() => window.__bastionDebugTapArena(160, 300));
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(OUT, "03_panneau_construction.png") });
    await page.click(".tower-option[data-family='rapide']");
    await page.waitForTimeout(200);

    // 4. Deuxième tour construite, panneau fermé
    await page.evaluate(() => window.__bastionDebugTapArena(330, 480));
    await page.waitForTimeout(150);
    const secondOption = await page.$(".tower-option[data-family='rapide']");
    if (secondOption) await secondOption.click();
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(OUT, "04_deux_tours_construites.png") });

    // 5. Vague en cours (lancement anticipé)
    await page.click("#btn-launch-wave");
    await page.waitForTimeout(3500);
    await page.screenshot({ path: join(OUT, "05_vague_en_cours.png") });

    // 6. Panneau d'amélioration (tap sur une tour posée)
    await page.evaluate(() => window.__bastionDebugTapArena(160, 300));
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(OUT, "06_panneau_amelioration.png") });

    await browser.close();
    console.log("Captures enregistrées dans", OUT);
  } finally {
    server.kill();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
