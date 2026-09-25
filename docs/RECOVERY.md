# BASTION LINE V0 — Documentation de reprise (dépendances, build, récupération)

**Date de rédaction :** 25 septembre 2026
Ce document permet à quiconque (y compris une future instance de cet agent, sans
mémoire de cette session) de reprendre le projet de façon autonome, conformément à
l'exigence du cahier des charges V0 ("un tiers, ou toi-même plus tard sans mémoire de
cette conversation, doit pouvoir reprendre le projet").

## 1. Dépôt distant

- **Dépôt :** `https://github.com/scuillerjack-oss/bastion-line-v0`
- **Branche principale :** `main`
- **HEAD au moment de ce rapport :** `316d5bb49cc0c0b916cd47f16b72e38af923de99`
  (vérifié en interrogeant réellement l'état distant via `git ls-remote`, jamais
  supposé à partir d'une simple sortie de commande `git push`).
- **Aucun autre projet du porteur n'est touché** : ce dépôt est entièrement séparé
  de `breakpoint-v0` et de tout autre jeu existant, conformément à la contrainte
  explicite du cahier ("BASTION LINE est un nouveau projet").

## 2. Prérequis techniques

- Node.js ≥ 18 (utilisé en CI : image `ubuntu-latest`, `actions/setup-node@v4`).
- npm (fourni avec Node).
- Aucune base de données, aucun serveur backend : le jeu est un site statique
  (Vite + PWA), toute la persistance est en `localStorage` côté client.

## 3. Installation et récupération locale

```bash
git clone https://github.com/scuillerjack-oss/bastion-line-v0.git
cd bastion-line-v0
npm install
```

## 4. Commandes disponibles (`package.json`)

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement Vite (local) |
| `npm run dev:lan` | Idem, accessible sur le réseau local (test mobile réel) |
| `npm run build` | Build de production dans `dist/` (identifiant de build automatique) |
| `npm run preview` | Sert le build de production localement |
| `npm test` | Suite de tests unitaires (`node --test`, 47 tests) |
| `npm run test:mobile` | Suite Playwright (responsive, tactile, PWA, audio, build ID, service worker) — nécessite `npx playwright install --with-deps chromium` une fois |

## 5. Identifiant de build (vérification de déploiement)

`vite.config.js` génère automatiquement un identifiant `v<version>+<commit>` :
priorité à `GITHUB_SHA` (fourni par CI), sinon `git rev-parse --short HEAD` en
local, sinon `"local"` si hors contexte git. Cet identifiant est affiché dans le
jeu et vérifié par `scripts/check-mobile.mjs` — il permet de confirmer que la
version réellement servie (GitHub Pages) correspond bien au commit attendu,
sans jamais se fier au seul statut "success" d'un workflow.

Pour vérifier manuellement après un déploiement :
```bash
GITHUB_SHA=$(git rev-parse HEAD) npm run build
grep -o 'v[0-9.]*+[a-f0-9]\{7\}' dist/assets/index-*.js
```

## 6. CI/CD (`.github/workflows/deploy.yml`)

Deux jobs, vérifiés **au niveau job**, jamais seulement au niveau workflow :
1. **`build`** : `npm ci` → `npm test` → `npm run build` → installation Chromium
   Playwright → `npm run test:mobile` → upload de l'artefact Pages.
2. **`deploy`** : déploie l'artefact sur GitHub Pages (`actions/deploy-pages@v4`).

**État connu au 25/09/2026 :** le job `build` passe intégralement (tests, build,
tests mobiles tous verts). Le job `deploy` échoue avec `404 Not Found` car
**GitHub Pages n'est pas encore activé** pour ce dépôt (l'App GitHub utilisée par
cet agent n'a pas les droits d'administration nécessaires pour l'activer via
API). Action requise, à faire une seule fois par le porteur du projet :
`Settings → Pages → Source: GitHub Actions` sur
`https://github.com/scuillerjack-oss/bastion-line-v0/settings/pages`. Une fois
activé, relancer le workflow (ou pousser un commit) suffit à obtenir un
déploiement réel.

## 7. Structure du projet

```
src/engine/     — logique pure (towers, enemies, path, levels, state, simulation, save)
src/ui/         — rendu canvas, entrée tactile, audio, tutoriel, viewport
src/main.js     — orchestration, hooks de debug (window.__bastionDebug*)
tests/          — 47 tests unitaires (node:test)
scripts/        — check-mobile.mjs (suite Playwright mobile/PWA)
docs/           — cette documentation + étude de marché + étude économique + rapport officiel
public/         — manifest PWA, service worker, icônes
```

## 8. Limites connues et décisions en attente

- **Déploiement GitHub Pages non encore activé** (voir section 6) — bloquant
  uniquement pour l'URL publique, pas pour le code ni les tests.
- **Aucune monétisation implémentée** (volontaire, conforme au cahier) — voir
  `docs/ETUDE_ECONOMIQUE.md` pour les scénarios prospectifs, non validés.
- **Décision V1 en attente de la bêta physique du porteur du projet** —
  cet agent ne doit pas, et n'a pas, entamé de développement V1 au-delà des
  livrables V0 explicitement demandés.
