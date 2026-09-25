// Non-régression V1 (cahier des charges V1, section 3 et 7) : "ajouter des
// contrôles empêchant le retour... d'un faux positif d'installabilité basé
// uniquement sur la validité du manifest". Ces tests verrouillent la
// détection réelle d'un navigateur intégré Android (WebView), qui rend
// l'installation structurellement impossible quel que soit l'état du
// manifest -- jamais vérifiée avant V1.
import { test } from "node:test";
import assert from "node:assert/strict";
import { detectEmbeddedAndroidWebView, isIOS, buildOpenInChromeIntentUrl } from "../src/ui/pwaInstall.js";

const REAL_CHROME_ANDROID =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const EMBEDDED_WEBVIEW_ANDROID =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36";
const SAFARI_IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const DESKTOP_CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

test("Chrome Android réel n'est jamais détecté comme navigateur intégré", () => {
  assert.equal(detectEmbeddedAndroidWebView(REAL_CHROME_ANDROID), false);
});

test("une WebView Android intégrée (jeton ';wv)') est détectée", () => {
  assert.equal(detectEmbeddedAndroidWebView(EMBEDDED_WEBVIEW_ANDROID), true);
});

test("Safari iOS et Chrome desktop ne sont jamais détectés comme WebView Android", () => {
  assert.equal(detectEmbeddedAndroidWebView(SAFARI_IOS), false);
  assert.equal(detectEmbeddedAndroidWebView(DESKTOP_CHROME), false);
});

test("détection iOS", () => {
  assert.equal(isIOS(SAFARI_IOS), true);
  assert.equal(isIOS(REAL_CHROME_ANDROID), false);
  assert.equal(isIOS(DESKTOP_CHROME), false);
});

test("le lien intent:// pour forcer l'ouverture dans Chrome cible bien le paquet Chrome et l'URL réelle", () => {
  const fakeWin = { location: { href: "https://scuillerjack-oss.github.io/bastion-line-v0/index.html" } };
  const url = buildOpenInChromeIntentUrl(fakeWin);
  assert.ok(url.startsWith("intent://scuillerjack-oss.github.io/bastion-line-v0/index.html"));
  assert.ok(url.includes("package=com.android.chrome"));
  assert.ok(url.includes("scheme=https"));
});
