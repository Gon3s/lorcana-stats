/**
 * gameplay.js — Graphiques de mécanique de jeu (SRP)
 * Ordre de jeu, durée, lore, scatter, tours.
 */

import { destroyChart, registerChart, winStats, avg, buildBins, groupBy, GRID } from './registry.js';

const DURATION_BINS = [
  { label: '1-5m',  test: d => d <= 5  },
  { label: '6-10m', test: d => d <= 10 },
  { label: '11-15m',test: d => d <= 15 },
  { label: '16-20m',test: d => d <= 20 },
  { label: '21m+',  test: () => true   },
];

const TURNS_BINS = [
  { label: '1-5',  test: t => t <= 5  },
  { label: '6-8',  test: t => t <= 8  },
  { label: '9-11', test: t => t <= 11 },
  { label: '12-14',test: t => t <= 14 },
  { label: '15+',  test: () => true   },
];

const BIN_COLORS = [
  'rgba(201,168,76,.9)',
  'rgba(52,152,219,.9)',
  'rgba(155,89,182,.9)',
  'rgba(46,204,113,.9)',
  'rgba(232,93,122,.9)',
];

// ── Ordre de jeu (OTP/OTD) ────────────────────────────────────────────────

export function renderTurnOrder(games) {
  destroyChart('turn');

  const otp = games.filter(g => g.turnOrder === 'OTP');
  const otd = games.filter(g => g.turnOrder === 'OTD');
  const ws  = [winStats(otp), winStats(otd)];

  registerChart('turn', new Chart(document.getElementById('turnChart'), {
    type: 'bar',
    data: {
      labels: ['OTP (1er)', 'OTD (2ème)'],
      datasets: [
        { label: 'Victoires', data: [ws[0].wins, ws[1].wins], backgroundColor: 'rgba(78,204,163,.8)', borderRadius: 6 },
        { label: 'Défaites',  data: [ws[0].total - ws[0].wins, ws[1].total - ws[1].wins], backgroundColor: 'rgba(232,93,122,.8)', borderRadius: 6 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } } },
      scales: { x: { grid: { display: false } }, y: { grid: GRID } },
    },
  }));

  document.getElementById('turnCards').innerHTML = [
    { key: 'otp', label: 'OTP', w: ws[0], color: 'var(--amethyst)' },
    { key: 'otd', label: 'OTD', w: ws[1], color: 'var(--sapphire)' },
  ].map(t => `
    <div class="turn-card">
      <span class="turn-badge ${t.key}">${t.label}</span>
      <div class="turn-value" style="color:${t.color}">${t.w.rate.toFixed(1)}%</div>
      <div class="turn-sub">${t.w.wins}V / ${t.w.total - t.w.wins}D · ${t.w.total} parties</div>
    </div>`).join('');
}

// ── Distribution durée ─────────────────────────────────────────────────────

export function renderDurationChart(games) {
  destroyChart('dur');
  const bins = buildBins(games, 'duration', DURATION_BINS);

  registerChart('dur', new Chart(document.getElementById('durChart'), {
    type: 'bar',
    data: {
      labels:   Object.keys(bins),
      datasets: [{ data: Object.values(bins), backgroundColor: BIN_COLORS, borderRadius: 6 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { grid: { display: false } }, y: { grid: GRID } },
    },
  }));
}

// ── Lore moyen sur victoires ───────────────────────────────────────────────

export function renderLoreChart(games) {
  destroyChart('lore');

  const loreByDeck = {};
  games.filter(g => g.result === 'Win')
    .forEach(g => { (loreByDeck[g.myColors] = loreByDeck[g.myColors] || []).push(g.myLore); });

  const labels = Object.keys(loreByDeck);

  registerChart('lore', new Chart(document.getElementById('loreChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data:            labels.map(k => avg(loreByDeck[k]).toFixed(1)),
        backgroundColor: 'rgba(201,168,76,.75)',
        borderColor:     'rgba(201,168,76,.3)',
        borderWidth: 1, borderRadius: 6,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { grid: { display: false } }, y: { grid: GRID, max: 25 } },
    },
  }));
}

// ── Scatter Lore toi vs adversaire ────────────────────────────────────────

export function renderScatter(games) {
  destroyChart('scatter');

  registerChart('scatter', new Chart(document.getElementById('scatterChart'), {
    type: 'scatter',
    data: {
      datasets: [{
        data:             games.map(g => ({ x: g.myLore, y: g.oppLore })),
        pointBackgroundColor: games.map(g => g.result === 'Win' ? 'rgba(78,204,163,.7)' : 'rgba(232,93,122,.7)'),
        pointBorderColor:     games.map(g => g.result === 'Win' ? 'rgba(78,204,163,1)'  : 'rgba(232,93,122,1)'),
        pointRadius: 5, pointHoverRadius: 8,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: {
          label: ctx => {
            const g = games[ctx.dataIndex];
            return ` Moi: ${g.myLore} | Eux: ${g.oppLore} — ${g.result === 'Win' ? '✓' : '✗'} vs ${g.opponent}`;
          },
        }},
      },
      scales: {
        x: { grid: GRID, title: { display: true, text: 'Mon Lore',    color: '#7a7fa0' } },
        y: { grid: GRID, title: { display: true, text: 'Lore Adverse', color: '#7a7fa0' } },
      },
    },
  }));
}

// ── Distribution tours joués ───────────────────────────────────────────────

export function renderTurnsChart(games) {
  destroyChart('turns');
  const bins = buildBins(games, 'turns', TURNS_BINS);

  registerChart('turns', new Chart(document.getElementById('turnsChart'), {
    type: 'bar',
    data: {
      labels:   Object.keys(bins),
      datasets: [{ data: Object.values(bins), backgroundColor: BIN_COLORS, borderRadius: 6 }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { grid: { display: false } }, y: { grid: GRID } },
    },
  }));
}
