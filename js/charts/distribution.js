/**
 * distribution.js — Graphiques de distribution (SRP)
 * Win/Loss donut, parties par jour, barres winrate deck.
 */

import { destroyChart, registerChart, groupBy, winStats, avg, GRID } from './registry.js';
import { inkBadge } from '../utils/ink.js';
import { esc }      from '../utils/html.js';

// ── Win/Loss Donut ─────────────────────────────────────────────────────────

export function renderWinLossDonut(games) {
  destroyChart('wl');

  const wins    = games.filter(g => g.result === 'Win');
  const total   = games.length;
  const wr      = (wins.length / total * 100).toFixed(1);
  const avgDur  = avg(games.map(g => g.duration)).toFixed(1);
  const peakMMR = Math.max(...games.map(g => g.mmrAfter));

  registerChart('wl', new Chart(document.getElementById('winLossChart'), {
    type: 'doughnut',
    data: {
      labels:   ['Victoires', 'Défaites'],
      datasets: [{
        data:            [wins.length, total - wins.length],
        backgroundColor: ['rgba(78,204,163,.85)', 'rgba(232,93,122,.85)'],
        borderColor:     ['rgba(78,204,163,.3)',  'rgba(232,93,122,.3)'],
        borderWidth:     2,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: true, cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: {
          label: ctx => ` ${ctx.label}: ${ctx.parsed} (${(ctx.parsed / total * 100).toFixed(1)}%)`,
        }},
      },
    },
  }));

  document.getElementById('wlLegend').innerHTML = `
    <div class="legend-item">
      <div class="legend-dot" style="background:var(--win)"></div>
      <span class="legend-label">Victoires</span>
      <span class="legend-value">${wins.length}<span class="legend-pct">${wr}%</span></span>
    </div>
    <div class="legend-item">
      <div class="legend-dot" style="background:var(--loss)"></div>
      <span class="legend-label">Défaites</span>
      <span class="legend-value">${total - wins.length}<span class="legend-pct">${(100 - parseFloat(wr)).toFixed(1)}%</span></span>
    </div>
    <div class="legend-sep"></div>
    <div class="legend-item">
      <span class="legend-label" style="color:var(--muted)">Peak MMR</span>
      <span class="legend-value" style="color:var(--gold-light)">${peakMMR}</span>
    </div>
    <div class="legend-item">
      <span class="legend-label" style="color:var(--muted)">Durée moy.</span>
      <span class="legend-value">${avgDur}<span class="legend-pct">min</span></span>
    </div>`;
}

// ── Parties par jour (stacked bar) ─────────────────────────────────────────

export function renderDailyChart(games) {
  destroyChart('daily');

  const byDate = groupBy(games, 'date');
  const dates  = Object.keys(byDate).sort();

  registerChart('daily', new Chart(document.getElementById('dailyChart'), {
    type: 'bar',
    data: {
      labels: dates.map(d => d.slice(5)),
      datasets: [
        {
          label: 'Victoires ●',
          data:  dates.map(d => byDate[d].filter(g => g.result === 'Win').length),
          backgroundColor: 'rgba(78,204,163,.75)',
          // U2 : bordure pleine pour distinguer sans la couleur
          borderColor: 'rgba(78,204,163,1)', borderWidth: 1,
          borderRadius: 4, stack: 's',
        },
        {
          label: 'Défaites ▲',
          data:  dates.map(d => byDate[d].filter(g => g.result === 'Loss').length),
          backgroundColor: 'rgba(232,93,122,.75)',
          // U2 : bordure en tirets pour distinguer sans la couleur
          borderColor: 'rgba(232,93,122,1)', borderWidth: 2,
          borderDash: [4, 2],
          borderRadius: 4, stack: 's',
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 14 } } },
      scales: {
        x: { grid: { display: false }, stacked: true },
        y: { grid: GRID, stacked: true },
      },
    },
  }));
}

// ── Barres winrate par deck (HTML) ─────────────────────────────────────────

export function renderDeckBars(games, colorKey, containerId, minGames = 1) {
  const stats = Object.entries(groupBy(games, colorKey))
    .map(([k, gs]) => ({ deck: k, ...winStats(gs) }))
    .filter(s => s.total >= minGames)
    .sort((a, b) => b.total - a.total);

  document.getElementById(containerId).innerHTML = stats.map(s => {
    const color = s.rate >= 50 ? '#4ecca3' : '#e85d7a';
    return `
      <div class="bar-row">
        <div class="bar-label" title="${esc(s.deck)}">${inkBadge(s.deck, 18)}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${s.rate.toFixed(1)}%;background:${color}"></div>
        </div>
        <div class="bar-stat">
          ${s.rate.toFixed(0)}%<span class="bar-count">(${s.total})</span>
        </div>
      </div>`;
  }).join('');
}
