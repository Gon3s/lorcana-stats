# 🎴 Lorcana Dashboard

A personal stats dashboard for Disney Lorcana — reads your game history CSV exported from [Dreamborn](https://dreamborn.ink) and displays detailed analytics.

## 🚀 GitHub Pages Setup (via GitHub Actions)

1. **Fork / clone** this repository
2. **Replace** `data/game-history.csv` with your own exported CSV from Dreamborn
3. Go to your repo **Settings → Pages**
4. Set source to **GitHub Actions** (not "Deploy from branch")
5. Push to `main` — the Action deploys automatically
6. Your dashboard will be live at `https://<username>.github.io/<repo-name>/`

> The workflow file is at `.github/workflows/deploy.yml`.
> You can also trigger it manually from the **Actions** tab → **Deploy to GitHub Pages** → **Run workflow**.

## 📂 Project Structure

```
lorcana-dashboard/
├── index.html          # Main page
├── css/
│   └── style.css       # All styles
├── js/
│   └── app.js          # CSV parsing + charts + filtering
├── data/
│   └── game-history.csv  # ← Replace with your CSV export
└── README.md
```

## 📊 Features

- **MMR evolution** over time with win/loss coloring
- **Win rate** by your deck and by opponent colors
- **Turn order** analysis (OTP vs OTD)
- **Game duration** and turn count distributions
- **Lore scatter plot** — your score vs opponent
- **Deck filter** — analyze any specific deck combo
- **Recent games table** with full details
- **Last 20 games streak** visualizer

## 📥 How to export your CSV from Dreamborn

1. Go to [dreamborn.ink](https://dreamborn.ink)
2. Navigate to **My Games → History**
3. Click **Export CSV**
4. Rename the file to `game-history.csv` and drop it in the `data/` folder

## 🎨 Stack

- Vanilla HTML/CSS/JS — zero build tools needed
- [Chart.js](https://chartjs.org) for charts
- [PapaParse](https://papaparse.com) for CSV parsing
- [Google Fonts](https://fonts.google.com) — Cinzel + Crimson Pro
