# 🎴 Inkwell Stats — Lorcana Dashboard

A personal stats dashboard for Disney Lorcana — reads your game history CSV exported from [duels.ink](https://duels.ink) and displays comprehensive analytics.

## 🚀 GitHub Pages Setup (via GitHub Actions)

1. **Fork / clone** this repository
2. Go to your repo **Settings → Pages**
3. Set source to **GitHub Actions**
4. Push to `main` — the Action deploys automatically
5. Your dashboard will be live at `https://<username>.github.io/<repo-name>/`

> You can also trigger a deployment manually: **Actions → Deploy to GitHub Pages → Run workflow**

## 📥 How to export your CSV from duels.ink

1. Go to [duels.ink](https://duels.ink) and log in
2. Navigate to your **Game History**
3. Click **Export CSV**
4. Upload the file directly on the dashboard (drag & drop or browse)

> Your data is read **locally in your browser** — nothing is sent to any server.

## 📊 Features

### Core stats
- **KPIs** — games played, wins, losses, win rate, current MMR, avg duration
- **MMR evolution** — line chart with every game colored by result
- **Win/Loss donut** — ratio with key figures
- **Daily volume** — stacked bar by day

### Deck analysis
- **Winrate by your deck** — all color combinations you played
- **Winrate vs opponent colors** — how you fare against each archetype
- **Avg lore on wins** — per deck
- **Avg MMR delta by deck** — which deck gains you the most rating

### Game stats
- **Turn order (OTP/OTD)** — winrate going first vs second
- **Duration distribution** — how long your games last
- **Turns distribution** — short vs long games
- **Lore scatter plot** — your score vs opponent, colored by result

### Advanced analytics
- **Card key winrate** — parses the Decklist column, shows top 20 cards by games played with winrate
- **Heatmap hour/day** — when during the week you perform best (UTC)
- **Momentum chart** — rolling 5-game winrate with streak highlights
- **Matchup predictor** — historical winrate against every opponent color combo
- **Week comparison** — this week vs last week (games, winrate, MMR delta, duration)
- **Best/worst deck — last 20 games** — recent performance ranking
- **MMR Goals** — set a target MMR, track progress and estimated games needed

### UX
- **Upload screen** — drag & drop or browse, with validation
- **localStorage persistence** — data saved between visits, resume on next visit
- **Deck filter** — all charts update live when filtering by deck

## 📂 Project Structure

```
inkwell-stats/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── parser.js      ← CSV + Decklist parsing
│   ├── ui.js          ← Upload screen, filter, navigation, table
│   ├── charts.js      ← Base charts (MMR, donut, bars, scatter…)
│   ├── advanced.js    ← Advanced analytics (heatmap, momentum, predictor…)
│   └── app.js         ← Main orchestrator
├── data/
│   └── game-history.csv  ← Optional: pre-loaded CSV (not required)
├── .github/
│   └── workflows/
│       └── deploy.yml ← GitHub Actions deployment
└── README.md
```

## 🛠 Local development

```bash
# Any static HTTP server works:
npx serve .
# or
python -m http.server 8000
```

> ⚠️ `fetch()` won't work when opening `index.html` directly — you need an HTTP server.
> Uploading a CSV file via the UI works without a server.

## 🎨 Stack

- Vanilla HTML/CSS/JS — zero build tools
- [Chart.js 4](https://chartjs.org)
- [PapaParse](https://papaparse.com)
- [Google Fonts](https://fonts.google.com) — Cinzel + Crimson Pro
