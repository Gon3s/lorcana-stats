/**
 * mmr.js — Graphique d'évolution du MMR (SRP)
 */

import { destroyChart, registerChart, GRID } from './registry.js';

export function renderMMRChart(games) {
  destroyChart('mmr');

  registerChart('mmr', new Chart(document.getElementById('mmrChart'), {
    type: 'line',
    data: {
      labels: games.map((g, i) => `#${i + 1} · ${g.date.slice(5)}`),
      datasets: [{
        data:  games.map(g => g.mmrAfter),
        borderColor: 'rgba(201,168,76,.9)',
        borderWidth: 2,
        backgroundColor: ctx => {
          const grad = ctx.chart.ctx.createLinearGradient(0, 0, 0, 260);
          grad.addColorStop(0, 'rgba(201,168,76,.22)');
          grad.addColorStop(1, 'rgba(201,168,76,0)');
          return grad;
        },
        fill: true,
        pointBackgroundColor: games.map(g => g.result === 'Win' ? 'rgba(78,204,163,.85)' : 'rgba(232,93,122,.85)'),
        pointBorderColor:     games.map(g => g.result === 'Win' ? 'rgba(78,204,163,.85)' : 'rgba(232,93,122,.85)'),
        // U2 : forme différente par résultat (cercle = victoire, triangle = défaite)
        pointStyle:  games.map(g => g.result === 'Win' ? 'circle' : 'triangle'),
        pointRadius: games.map(g => g.result === 'Win' ? 4 : 5),
        pointHoverRadius: 7, tension: .35,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(20,22,40,.95)',
          borderColor: 'rgba(201,168,76,.4)', borderWidth: 1,
          callbacks: {
            title: ctx => games[ctx[0].dataIndex].opponent,
            label: ctx => {
              const g = games[ctx.dataIndex];
              const d = g.mmrAfter - g.mmrBefore;
              return ` MMR: ${ctx.parsed.y}  (${d >= 0 ? '+' : ''}${d})  · ${g.result === 'Win' ? '✓ Victoire' : '✗ Défaite'}`;
            },
          },
        },
      },
      scales: {
        x: { grid: GRID, ticks: { maxTicksLimit: 14, maxRotation: 45 } },
        y: { grid: GRID },
      },
    },
  }));
}
