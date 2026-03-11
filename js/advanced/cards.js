/**
 * advanced/cards.js — Analyse du winrate par carte (SRP)
 * Construit les stats par carte à partir des decklists,
 * puis affiche un graphique horizontal barres colorées.
 */

import { destroyChart, registerChart, GRID } from '../charts/registry.js';

const MIN_GAMES  = 3;
const TOP_N      = 20;
const EMPTY_HTML = msg => `<p class="empty-msg">${msg}</p>`;

function cardColor(rate) {
  if (rate >= 60) return 'rgba(78,204,163,.8)';
  if (rate >= 45) return 'rgba(201,168,76,.8)';
  return 'rgba(232,93,122,.8)';
}

/** Agrège les parties par carte (une seule occurrence par partie). */
function buildCardStats(games) {
  const cardMap = {};

  for (const game of games) {
    const seen = new Set();
    for (const { name } of game.decklist) {
      if (seen.has(name)) continue;
      seen.add(name);
      (cardMap[name] = cardMap[name] || []).push(game);
    }
  }

  return Object.entries(cardMap)
    .map(([name, gs]) => {
      const wins = gs.filter(g => g.result === 'Win').length;
      return { name, total: gs.length, wins, rate: wins / gs.length * 100 };
    })
    .filter(c => c.total >= MIN_GAMES)
    .sort((a, b) => b.total - a.total)
    .slice(0, TOP_N);
}

/** Restitue le canvas si le conteneur a été remplacé par un message vide. */
function ensureCanvas(containerId) {
  const container = document.getElementById(containerId);
  if (!document.getElementById('cardChart')) {
    container.innerHTML = '<div class="chart-wrap" style="height:460px"><canvas id="cardChart"></canvas></div>';
  }
}

export function renderCardAnalysis(games) {
  const withDecklist = games.filter(g => g.decklist?.length > 0);
  const el = document.getElementById('cardAnalysisContent');

  if (!withDecklist.length) {
    el.innerHTML = EMPTY_HTML('Aucune Decklist trouvée dans ce CSV.');
    return;
  }

  const sorted = buildCardStats(withDecklist);
  if (!sorted.length) {
    el.innerHTML = EMPTY_HTML('Pas assez de données (≥ 3 parties par carte).');
    return;
  }

  ensureCanvas('cardAnalysisContent');
  destroyChart('cards');

  registerChart('cards', new Chart(document.getElementById('cardChart'), {
    type: 'bar',
    indexAxis: 'y',
    data: {
      labels:   sorted.map(c => c.name.length > 30 ? c.name.slice(0, 28) + '…' : c.name),
      datasets: [{
        data:            sorted.map(c => c.rate.toFixed(1)),
        backgroundColor: sorted.map(c => cardColor(c.rate)),
        borderRadius:    4,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: {
          label: ctx => {
            const c = sorted[ctx.dataIndex];
            return ` ${c.rate.toFixed(1)}% winrate · ${c.wins}V / ${c.total - c.wins}D · ${c.total} parties`;
          },
        }},
      },
      scales: {
        x: { grid: GRID, min: 0, max: 100, ticks: { callback: v => v + '%' } },
        y: { grid: { display: false }, ticks: { font: { size: 11 } } },
      },
    },
  }));
}
