// Captures ponctuelles pour le rapport technique V8 (pas une suite de
// tests) -- mêmes hooks de debug que capture-screenshots.mjs, réservé aux
// deux nouveautés UI les plus visibles de cette mission : le sélecteur de
// construction montrant les tours encore verrouillées, et l'aperçu de la
// composition de la prochaine vague.
import { chromium } from "playwright";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "docs", "screenshots");
const PORT = 4175;
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
  const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { cwd: ROOT, stdio: "ignore" });
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

    // 1. Niveau 1 : sélecteur de construction, Canon/Catapulte verrouillés.
    await page.evaluate(() => window.__bastionDebugStartLevel(0));
    await page.waitForTimeout(300);
    const slot = await page.evaluate(() => window.__bastionDebugState().buildSlots[0]);
    await page.evaluate(([x, y]) => window.__bastionDebugTapArena(x, y), [slot.x, slot.y]);
    await page.waitForTimeout(250);
    await page.screenshot({ path: join(OUT, "v8_tours_verrouillees.png") });

    // 2. Niveau 3 (longue portée débloquée) : aperçu de la composition de
    // la prochaine vague dans la barre de préparation.
    await page.evaluate(() => window.__bastionDebugStartLevel(2));
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT, "v8_apercu_vague.png") });

    console.log("Captures V8 écrites dans", OUT);
    await browser.close();
  } finally {
    server.kill();
  }
}

main();
