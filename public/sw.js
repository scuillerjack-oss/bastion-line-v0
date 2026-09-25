// Stratégie de cache reprise telle quelle du socle validé sur les projets
// précédents (BREAKPOINT V2/V3) : réseau-d'abord pour tout sauf les fichiers
// hachés par le contenu (immuables par construction), pour ne JAMAIS servir
// silencieusement une version périmée d'une PWA en display:standalone.
const CACHE_NAME = "bastion-line-cache-v1";
const MAX_HASHED_CACHE_ENTRIES = 30;

async function trimHashedAssetCache() {
  const cache = await caches.open(CACHE_NAME);
  const keys = await cache.keys();
  const hashedKeys = keys.filter((req) => isImmutableHashedAsset(new URL(req.url)));
  const excess = hashedKeys.length - MAX_HASHED_CACHE_ENTRIES;
  if (excess > 0) {
    await Promise.all(hashedKeys.slice(0, excess).map((req) => cache.delete(req)));
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function isImmutableHashedAsset(url) {
  return url.pathname.includes("/assets/");
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);

  if (isImmutableHashedAsset(url)) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone).then(trimHashedAssetCache));
            }
            return response;
          })
      )
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
