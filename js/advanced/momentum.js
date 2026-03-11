/**
 * advanced/momentum.js — Winrate glissant & détection de séries (SRP)
 * Calculs séparés du rendu (OCP : on peut changer le rendu sans toucher au calcul).
 */

import { destroyChart, registerChart, GRID } from '../charts/registry.js';

const WINDOW_SIZE = 5;
const MIN_STREAK  = 3;

// ── Calculs purs ───────────────────────────────────────────────────────────

function computeRolling(games) {
  return games
    .map((_, i) => {
      if (i < WINDOW_SIZE - 1) return null;
      const slice = games.slice(i - WINDOW_SIZE + 1, i + 1);
      return slice.filter(g => g.result === 'Win').length / WINDOW_SIZE * 100;
    })
    .filter(v => v !== null);
}

function detectStreaks(games) {
  const streaks = [];
  let cur = { type: games[0].result, start: 0, len: 1 };

  for (let i = 1; i < games.length; i++) {
    if (games[i].result === cur.type) {
      cur.len++;
    } else {
      if (cur.len >= MIN_STREAK) streaks.push({ ...cur, end: i - 1 });
      cur = { type: games[i].result, start: i, len: 1 };
    }
  }
  if (cur.len >= MIN_STREAK) streaks.push({ ...cur, end: games.length - 1 });
  return streaks;
}

function pointColor(v) {
  if (v >= 60) return 'rgba(78,204,163,.9)';
  if (v >= 40) return 'rgba(201,168,76,.9)';
  return 'rgba(232,93,122,.9)';
}

// ── Rendu ──────────────────────────────────────────────────────────────────

function renderStreakBadges(streaks) {
  const bestWin  = streaks.filter(s => s.type === 'Win') .sort((a, b) => b.len - a.len)[0];
  const bestLoss = streaks.filter(s => s.type === 'Loss').sort((a, b) => b.len - a.len)[0];

  const parts = [
    bestWin  ? `<span class="streak-badge win">🔥 Meilleure série: ${bestWin.len} victoires consécutives</span>`  : '',
    bestLoss ? `<span class="streak-badge loss">💀 Pire série: ${bestLoss.len} défaites consécutives</span>` : '',
  ].filter(Boolean);

  document.getElementById('momentumStreaks').innerHTML = parts.join('');
}

export function renderMomentum(games) {
  destroyChart('momentum');

  const chartEl = document.getElementById('momentumChart');
  if (games.length < WINDOW_SIZE) {
    chartEl.parentElement.innerHTML = '<p class="empty-msg">Pas assez de parties (min. 5).</p>';
    return;
  }

  const rolling = computeRolling(games);
  const labels  = games.slice(WINDOW_SIZE - 1).map((g, i) => `#${i + WINDOW_SIZE} · ${g.date.slice(5)}`);

  registerChart('momentum', new Chart(chartEl, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: `Winrate glissant (${WINDOW_SIZE} parties)`,
          data:  rolling,
          borderColor: ctx => {
            const g = ctx.chart.ctx.createLinearGradient(0, 0, ctx.chart.width, 0);
            g.addColorStop(0, 'rgba(155,89,182,.9)');
            g.addColorStop(1, 'rgba(52,152,219,.9)');
            return g;
          },
          borderWidth: 2.5,
          backgroundColor: ctx => {
            const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 200);
            g.addColorStop(0, 'rgba(155,89,182,.15)');
            g.addColorStop(1, 'rgba(155,89,182,0)');
            return g;
          },
          fill: true,
          pointRadius: 3, pointHoverRadius: 6, tension: .4,
          pointBackgroundColor: rolling.map(pointColor),
        },
        {
          label:       '50%',
          data:        Array(rolling.length).fill(50),
          borderColor: 'rgba(201,168,76,.25)',
          borderWidth: 1,
          borderDash:  [6, 4],
          pointRadius: 0,
          fill:        false,
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(20,22,40,.95)',
          borderColor: 'rgba(155,89,182,.4)', borderWidth: 1,
          callbacks: {
            label: ctx => ctx.datasetIndex === 0
              ? ` Winrate glissant: ${ctx.parsed.y.toFixed(1)}%`
              : null,
          },
        },
      },
      scales: {
        x: { grid: GRID, ticks: { maxTicksLimit: 12, maxRotation: 45 } },
        y: { grid: GRID, min: 0, max: 100, ticks: { callback: v => v + '%' } },
      },
    },
  }));

  renderStreakBadges(detectStreaks(games));
}
