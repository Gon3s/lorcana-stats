# CLAUDE.md — Lorcana Stats Codebase Guide

This file provides guidance for AI assistants working in this repository.

---

## Project Overview

**lorcana-stats** is a fully client-side analytics dashboard for the Lorcana trading card game. Users export a CSV from [duels.ink](https://duels.ink), upload it, and get interactive charts and statistics. There is no backend, no database, and no build step for JavaScript — only Tailwind CSS needs compiling.

---

## Repository Structure

```
lorcana-stats/
├── index.html                  # Single HTML entry point; all <script type="module"> tags live here
├── package.json                # Dev dependencies (Tailwind CLI only)
├── tailwind.config.js          # Custom color palette and font definitions
├── vercel.json                 # Security headers + SPA catch-all rewrite
├── css/
│   ├── style.css               # Custom CSS: variables, animations, component overrides
│   ├── tailwind.input.css      # Tailwind directives (@tailwind base/components/utilities)
│   └── tailwind.css            # GENERATED — do not edit by hand (output of build:css)
├── js/
│   ├── app.js                  # Main orchestrator: wires all modules together
│   ├── store.js                # Centralized state (allGames array, activeDeck filter)
│   ├── parser.js               # CSV parsing and validation → typed Game objects
│   ├── constants.js            # Shared constants: localStorage keys, Chart.js colors/defaults
│   ├── charts/
│   │   ├── registry.js         # Chart.js instance registry + pure statistical helpers
│   │   ├── mmr.js              # MMR evolution line chart
│   │   ├── distribution.js     # Win/Loss donut, daily bars (renderDeckBars supprimé)
│   │   └── gameplay.js         # Turn order (OTP/OTD) stacked bar, duration histogram
│   ├── advanced/
│   │   ├── momentum.js         # Rolling 5-game winrate + streak detection
│   │   ├── predictor.js        # Matchup winrate by opponent ink + OTP/OTD breakdown
│   │   ├── weekly.js           # Week-over-week comparison
│   │   └── inkstats.js         # Matchup matrix only (ink winrate bars supprimées)
│   ├── ui/
│   │   ├── screens.js          # Screen transitions: upload → loading → dashboard
│   │   ├── upload.js           # Drag-drop file handling + localStorage persistence
│   │   ├── filter.js           # Deck filter pill creation and active-filter logic
│   │   └── dashboard.js        # KPI cards, header metadata, game table (paginée), streak
│   └── utils/
│       ├── ink.js              # Lorcana ink/color name mappings and badge HTML helpers
│       ├── html.js             # Helper esc() — échappe les chaînes pour l'HTML
│       └── deck-builder.js     # Détection des versions de deck à partir des parties
├── assets/
│   └── inks/                   # Icônes PNG officielles Lorcana (amber, amethyst, emerald, ruby, sapphire, steel)
├── data/
│   └── game-history.csv        # Sample CSV for manual testing
└── .github/
    ├── workflows/
    │   ├── ci.yml              # CI: build CSS, lint JS syntax, verify asset references
    │   └── deploy.yml          # CD: deploy to GitHub Pages on push to main
    └── PULL_REQUEST_TEMPLATE.md
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | Vanilla JavaScript (ES Modules, no bundler) |
| Styling | Tailwind CSS v3 + custom CSS variables |
| Charts | Chart.js 4 (vendorisé dans `vendor/`) |
| CSV Parsing | PapaParse 5 (vendorisé dans `vendor/`) |
| Fonts | Google Fonts — Cinzel (display), Crimson Pro (body) |
| Deployment | GitHub Pages (primary), Vercel (optional) |
| CI | GitHub Actions |

**No framework, no bundler, no transpiler for JS.** Modules are loaded directly by the browser.

---

## Development Commands

```bash
# Install dev dependencies (Tailwind CLI)
npm install

# Compile Tailwind CSS once (minified → css/tailwind.css)
npm run build:css

# Watch mode — recompile on every CSS change during development
npm run watch:css
```

> **Important** : toujours lancer `npm run build:css` après avoir modifié `css/style.css` ou `css/tailwind.input.css`. Le CI recompile le CSS — si `tailwind.css` n'est pas à jour, le pipeline échoue.

### Running Locally

A static HTTP server is required (CORS blocks `file://` for ES module imports):

```bash
npx serve .
# or
python -m http.server 8000
```

Then open `http://localhost:8000` and drag-drop `data/game-history.csv` to test.

---

## Data Model

The CSV from duels.ink is parsed into an array of **Game objects**:

```javascript
{
  date: string,          // "YYYY-MM-DD"
  startedAt: string,     // ISO 8601 timestamp
  dt: Date,              // parsed Date object
  dayOfWeek: number,     // 0 = Monday … 6 = Sunday
  hour: number,          // 0–23 (UTC)
  result: 'Win' | 'Loss',
  opponent: string,      // opponent username
  myLore: number,
  oppLore: number,
  turns: number,
  duration: number,      // in minutes
  turnOrder: 'OTP' | 'OTD',
  myColors: string,      // e.g. "Amethyst/Sapphire"
  oppColors: string,
  mmrBefore: number,
  mmrAfter: number,
  queue: string,         // file de jeu (ex. "Compétitif", "Défi")
  decklist: [{ count: number, name: string }],
}
```

`store.js` holds the canonical `allGames` array and `activeDeck` string. All modules read from the store rather than keeping local copies.

---

## Architecture Principles

### 1. Single Responsibility — one module, one job
Each file handles exactly one concern. `parser.js` only parses. `charts/mmr.js` only renders the MMR chart. Never add rendering logic to parsing code or vice versa.

### 2. Dependency Injection over global imports
Dependencies are passed as function parameters:
```javascript
// Bien
buildFilterBar(allGames, onFilter)

// Mal — ne pas lire les globaux
buildFilterBar()  // internally reads window.allGames
```

### 3. Pure helpers in `registry.js`
Statistical utilities (`groupBy`, `winStats`, `avg`, `buildBins`) are pure functions with no side effects. Add new helpers here; keep them pure and well-named.

### 4. Chart lifecycle management
Always destroy before re-creating a chart. Use the registry:
```javascript
import { destroyChart, registerChart } from './registry.js';

destroyChart('myChart');
registerChart('myChart', new Chart(ctx, config));
```
Never create a `new Chart()` without calling `destroyChart` first on the same key.

### 5. Render pipeline in `app.js`

`app.js` distinguishes two render passes:

| Fonction | Déclencheur | Contenu |
|---|---|---|
| `renderGlobal(allGames)` | Une fois au chargement du CSV | Données indépendantes du filtre : matrice de matchups, comparaison hebdomadaire |
| `renderFiltered(games)` | À chaque changement de filtre | Tout ce qui dépend de la sélection active |
| `renderMMRSection()` | Filtre global **ou** filtre queue MMR local | Graphique MMR + badge Pic MMR |
| `renderMomentumSection()` | Filtre global **ou** filtre queue Momentum local | Graphique momentum |

Ne jamais appeler `renderGlobal` depuis `onRerender` — c'est intentionnel.

---

## Dashboard Layout (ordre des sections dans `index.html`)

1. **Progression MMR** — graphique d'évolution + badge Départ / Pic MMR / Actuel
2. **Journal des Parties** — tableau paginé de toutes les parties (20 par page)
3. **Prédiction & Matchups** — prédicteur par deck adverse avec % OTP/OTD
4. **Distribution** — donut V/L + volume journalier
5. **Statistiques de Jeu** — ordre de jeu OTP/OTD + durée
6. **Récence & Performance** — dots des 20 dernières parties
7. **Analyse Temporelle** — momentum (winrate glissant 5 parties)
8. **Matrice de Matchups** — pleine largeur, lignes vides masquées, V/D sous les %
9. **Suivi de Progression** — comparaison semaine en cours vs semaine précédente

---

## Sections supprimées (ne pas ré-ajouter sans discussion)

Ces sections ont été retirées intentionnellement :

| Section supprimée | Raison |
|---|---|
| Winrate — mon deck (barres par combinaison jouée) | Redondant avec la matrice |
| Winrate — deck adverse | Redondant avec le prédicteur |
| Winrate par combinaison jouée (`renderInkWinrates`) | Redondant avec la matrice |
| Meilleur / Pire deck — 20 dernières parties | Peu utile, bruit visuel |

La fonction `renderBestWorstDeck` existe encore dans `weekly.js` mais n'est plus appelée.

---

## Filter Bar

La barre de filtres est composée de **groupes `filter-bar-group`** — chaque groupe est un flex container `nowrap` qui garantit que son label et ses contrôles restent sur la même ligne. La barre elle-même est `flex-wrap` pour passer à la ligne entre groupes si nécessaire.

Groupes actuels : **Deck** · **Version** (conditionnel) · **File** (conditionnel) · **Ordre** · **Période**

Le compteur de parties (`filterCount`) a été supprimé de la barre.

### Filtre queue par section (MMR, Momentum)

`buildSectionQueueFilter` crée des pills indépendantes dans une section. Comportement :
- Si ≤ 1 file : section masquée
- Sinon : **premier filtre sélectionné par défaut** (pas de pill "Toutes")

Dans `app.js`, `_mmrQueue` et `_momentumQueue` sont initialisés à `queues[0]` quand plusieurs files existent.

---

## Game Table Pagination

`dashboard.js` expose :
- `renderTable(games)` — reset page 0, stocke les parties triées, affiche la première page
- `initTablePagination()` — câble les boutons Précédent / Suivant (à appeler **une seule fois** au `DOMContentLoaded`)

Taille de page : `TABLE_MAX_ROWS` (20, défini dans `constants.js`).

---

## Matchup Matrix (`inkstats.js`)

- **Cache** : recalcul uniquement si la référence `games` change (`_matrixGamesRef`)
- **Lignes vides masquées** : une ligne est exclue si toutes ses cellules sont `—` ou `?`
- **Seuil** : cellule affichée si ≥ `MIN_MATCHUP_GAMES` parties (défini dans `constants.js`)
- **V/D** affiché sous chaque pourcentage via `.matrix-vd`
- Occupe la pleine largeur dans sa propre section

---

## Matchup Predictor (`predictor.js`)

Chaque carte affiche :
- Winrate global + verdict (Favorable / Équilibré / Défavorable)
- Bilan V/D/total
- **% OTP** et **% OTD** avec nombre de parties pour chaque ordre de jeu
- 5 derniers résultats

---

## Adding a New Chart or Analysis Module

1. Create `js/charts/myfeature.js` (or `js/advanced/myfeature.js`)
2. Export a single `renderMyFeature(games)` function
3. Import and call it from `app.js` inside `renderGlobal` or `renderFiltered` depending on whether it depends on the active filter
4. Add any required `<canvas>` or container element to `index.html` in the correct section order (see Dashboard Layout above)
5. Use Tailwind utility classes for layout; use `style.css` CSS variables for colors

---

## Code Conventions

- **Language for comments**: French (all existing comments are in French; follow this convention)
- **Naming**: `camelCase` for functions/variables, `UPPER_SNAKE_CASE` for constants
- **No `console.log`** in committed code — CI will fail PRs that introduce debug logs
- **ES module syntax** (`import`/`export`) everywhere — no CommonJS `require()`
- **DOM access**: use `document.getElementById()` and `dataset` attributes; avoid `querySelector` chains
- **No jQuery, no lodash, no utility libraries** — use native JS

---

## Styling Conventions

Edit `css/style.css` for custom component styles. Never edit `css/tailwind.css` directly (it is generated).

### CSS Variables (defined in `style.css`)

| Variable | Usage |
|---|---|
| `--color-ink` | Page background (`#0a0b14`) |
| `--color-surface` | Card/panel background (`#141628`) |
| `--color-raised` | Slightly elevated surfaces |
| `--color-gold` | Primary accent color |
| `--color-amethyst` | Secondary accent color |
| `--color-win` | Win indicator (`#4ecca3`) |
| `--color-loss` | Loss indicator (`#e85d7a`) |
| `--color-text` | Body text (`#d4c9f0`) |
| `--color-muted` | Subdued text (`#7a7fa0`) |

### Tailwind Custom Colors (in `tailwind.config.js`)

`ink`, `surface`, `raised`, `gold`, `amethyst`, `sapphire`, `ruby`, `emerald`, `win`, `loss`

Always prefer these semantic class names over arbitrary hex values in HTML.

### Composants CSS notables (`style.css`)

| Classe | Usage |
|---|---|
| `.filter-bar-group` | Groupe de filtre nowrap (label + contrôles sur une ligne) |
| `.pagination-bar` | Barre de pagination du tableau |
| `.pagination-btn` | Bouton Précédent / Suivant |
| `.pagination-info` | Indicateur "Page X / Y" |
| `.matrix-vd` | V/D sous le % dans les cellules de la matrice |
| `.predictor-order` | Ligne OTP/OTD dans les cartes du prédicteur |

---

## Ink Colors (Lorcana Domain)

The six ink colors are: **Amber**, **Amethyst**, **Emerald**, **Ruby**, **Sapphire**, **Steel**.

Use `js/utils/ink.js` helpers to render ink badges and map color names to hex values. PNG icons live in `assets/inks/<color>.png`.

---

## localStorage Keys

Defined in `constants.js`:

| Key | Content |
|---|---|
| `inkwell_csv` | Raw CSV string from the last upload |
| `inkwell_mmr_goal` | User-defined MMR target (stored but UI not yet implemented) |

---

## CI / CD

### CI (`ci.yml`) — runs on PRs to `develop` and `main`

1. Compiles Tailwind CSS
2. Syntax-checks all JS files with `node --check`
3. Verifies all files referenced in `index.html` actually exist

### CD (`deploy.yml`) — runs on push to `main`

Deploys the full repository as a static site to GitHub Pages.

### Branching Model

| Branch | Purpose |
|---|---|
| `main` | Production — triggers GitHub Pages deploy |
| `develop` | Staging — CI runs, no deploy |
| `claude/*` | AI-assistant feature branches |
| feature branches | Developer feature work |

---

## What to Avoid

- Do not add a bundler (Webpack, Vite, Rollup) — the no-build JS approach is intentional
- Do not add a backend or API — the app is static by design
- Do not introduce external npm runtime dependencies — only `tailwindcss` is a dev dependency
- Do not edit `css/tailwind.css` by hand
- Do not use `console.log` in any committed code
- Do not mix French and English in code comments — use French
- Do not re-add the removed sections (ink winrates, deck bars, best/worst deck) without explicit request
- Do not call `renderGlobal` from `onRerender` — it is intentionally called only once at CSV load
