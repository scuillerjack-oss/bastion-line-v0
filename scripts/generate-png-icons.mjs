// Génère des icônes PNG 192x192 et 512x512 à partir de icon.svg existant
// (même identité visuelle, aucun redesign). Nécessaire car les critères
// d'installabilité PWA de Chrome/Android exigent au moins une icône
// raster (PNG/WebP) déclarant une taille standard (192x192 ou 512x512) --
// des icônes SVG seules ne sont pas fiables pour déclencher l'invite
// d'installation. Usage ponctuel, pas un script de build.
import { chromium } from "playwright";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const svgContent = readFileSync(join(ROOT, "public", "icons", "icon.svg"), "utf8");

async function renderPng(size, outPath) {
  const knownChromiumPath = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
  const browser = await chromium.launch({
    executablePath: existsSync(knownChromiumPath) ? knownChromiumPath : undefined,
    args: ["--no-sandbox"],
  });
  const page = await (await browser.newContext({ viewport: { width: size, height: size } })).newPage();
  await page.setContent(`<!doctype html><html><body style="margin:0">${svgContent}</body></html>`);
  await page.evaluate(() => {
    const svg = document.querySelector("svg");
    svg.style.width = "100vw";
    svg.style.height = "100vh";
    svg.style.display = "block";
  });
  await page.screenshot({ path: outPath, omitBackground: false });
  await browser.close();
}

await renderPng(192, join(ROOT, "public", "icons", "icon-192.png"));
await renderPng(512, join(ROOT, "public", "icons", "icon-512.png"));
console.log("Icônes PNG générées: icon-192.png, icon-512.png");
