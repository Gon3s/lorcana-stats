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
│   │   ├── distribution.js     # Win/Loss donut, daily stacked bars, deck winrate bars
│   │   └── gameplay.js         # Turn order (OTP/OTD) stacked bar, duration histogram
│   ├── advanced/
│   │   ├── momentum.js         # Rolling 5-game winrate + streak detection
│   │   ├── predictor.js        # Matchup winrate by opponent ink color combinations
│   │   ├── weekly.js           # Week-over-week comparison and best/worst deck analysis
│   │   └── inkstats.js         # Per-ink winrates and ink-vs-ink matchup matrix
│   ├── ui/
│   │   ├── screens.js          # Screen transitions: upload → loading → dashboard
│   │   ├── upload.js           # Drag-drop file handling + localStorage persistence
│   │   ├── filter.js           # Deck filter pill creation and active-filter logic
│   │   └── dashboard.js        # KPI cards, header metadata, game table, streak display
│   └── utils/
│       └── ink.js              # Lorcana ink/color name mappings and badge HTML helpers
├── assets/
│   └── inks/                   # Icônes PNG officielles Lorcana (amber, amethyst, emerald, ruby, sapphire, steel) + SVG conservés
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
| Charts | Chart.js 4 (loaded via CDN) |
| CSV Parsing | PapaParse 5 (loaded via CDN) |
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
// Good
buildFilterBar(allGames, onFilter)

// Bad — do not reach into globals
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

---

## Adding a New Chart or Analysis Module

1. Create `js/charts/myfeature.js` (or `js/advanced/myfeature.js`)
2. Export a single `renderMyFeature(games)` function
3. Import and call it from `app.js` inside the existing render pipeline
4. Add any required `<canvas>` or container element to `index.html`
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

---

## Ink Colors (Lorcana Domain)

The six ink colors are: **Amber**, **Amethyst**, **Emerald**, **Ruby**, **Sapphire**, **Steel**.

Use `js/utils/ink.js` helpers to render ink badges and map color names to hex values. PNG icons live in `assets/inks/<color>.png` (les fichiers SVG sont conservés mais ne sont plus utilisés).

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
