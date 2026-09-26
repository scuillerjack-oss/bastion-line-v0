// Non-régression V2 (cahier des charges V2, priorité 3 et section 5) :
// "Vérifier le chargement de l'asset Leonardo et son fallback éventuel."
// node:test n'a pas de DOM -- on simule le strict minimum de l'API Image
// (comme les tests audio/save simulent déjà localStorage/AudioContext).
import { test } from "node:test";
import assert from "node:assert/strict";

function installFakeImage(behavior) {
  class FakeImage {
    set src(_v) {
      // Le vrai <img> déclenche onload/onerror de façon asynchrone (réseau) --
      // on respecte ça avec un microtask pour tester un état "loading" réel
      // entre la création et la résolution, pas seulement l'état final.
      queueMicrotask(() => {
        if (behavior === "success") this.onload?.();
        else this.onerror?.();
      });
    }
  }
  globalThis.Image = FakeImage;
}

test("un asset qui charge avec succès passe par 'loading' puis 'loaded' avec l'image exposée", async () => {
  installFakeImage("success");
  const { loadSprite } = await import("../src/ui/sprites.js?t=1");
  const sprite = loadSprite("./fake.png");
  assert.equal(sprite.status, "loading");
  await new Promise((r) => queueMicrotask(r));
  assert.equal(sprite.status, "loaded");
  assert.ok(sprite.image);
});

test("un asset qui échoue à charger passe en 'error', jamais en 'loaded' -- le fallback doit rester activable", async () => {
  installFakeImage("error");
  const { loadSprite } = await import("../src/ui/sprites.js?t=2");
  const sprite = loadSprite("./fake.png");
  assert.equal(sprite.status, "loading");
  await new Promise((r) => queueMicrotask(r));
  assert.equal(sprite.status, "error");
  assert.equal(sprite.image, null);
});
