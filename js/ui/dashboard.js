/**
 * dashboard.js — Widgets du tableau de bord (SRP)
 * KPIs, header meta, tableau des parties, série récente.
 * Ne contient aucune logique graphique (Chart.js).
 */

import { inkBadge } from '../utils/ink.js';

// ── Header & KPIs ─────────────────────────────────────────────────────────

export function updateHeader(games) {
  const wins     = games.filter(g => g.result === 'Win');
  const total    = games.length;
  const endMMR   = games[total - 1].mmrAfter;
  const startMMR = games[0].mmrBefore;
  const peakMMR  = Math.max(...games.map(g => g.mmrAfter));
  const mmrGain  = endMMR - startMMR;
  const avgDur   = (games.reduce((s, g) => s + g.duration, 0) / total).toFixed(1);
  const dates    = games.map(g => g.date).sort();

  document.getElementById('kpiTotal')  .textContent = total;
  document.getElementById('kpiWins')   .textContent = wins.length;
  document.getElementById('kpiLosses') .textContent = total - wins.length;
  document.getElementById('kpiWinRate').textContent = (wins.length / total * 100).toFixed(1) + '%';
  document.getElementById('kpiMMR')    .textContent = endMMR;
  document.getElementById('kpiDur')    .textContent = avgDur + 'm';

  document.getElementById('headerMeta').textContent =
    `${dates[0]} → ${dates[dates.length - 1]}  ·  ${total} parties`;

  document.getElementById('mmrBadge').innerHTML =
    `✦ Départ: ${startMMR} &nbsp;→&nbsp; Peak: ${peakMMR} &nbsp;→&nbsp; Actuel: ${endMMR}` +
    ` &nbsp;(${mmrGain >= 0 ? '+' : ''}${mmrGain} pts)`;
}

// ── Tableau des 20 dernières parties ──────────────────────────────────────

function mmrDeltaClass(delta) {
  return delta >= 0 ? 'text-win' : 'text-loss';
}

export function renderTable(games) {
  document.getElementById('tableBody').innerHTML =
    [...games].reverse().slice(0, 20).map(g => {
      const delta  = g.mmrAfter - g.mmrBefore;
      const isWin  = g.result === 'Win';

      return `<tr>
        <td>${g.date.slice(5)}</td>
        <td><span class="win-badge ${isWin ? 'win' : 'loss'}">${isWin ? '✓ Victoire' : '✗ Défaite'}</span></td>
        <td>${g.opponent}</td>
        <td class="td-small">${inkBadge(g.myColors)}</td>
        <td class="td-small">${inkBadge(g.oppColors)}</td>
        <td class="td-center td-win">${g.myLore}</td>
        <td class="td-center td-loss">${g.oppLore}</td>
        <td class="td-center">${g.turns}</td>
        <td class="td-center">${g.duration}m</td>
        <td class="td-right ${mmrDeltaClass(delta)} td-cinzel">${delta >= 0 ? '+' : ''}${delta}</td>
      </tr>`;
    }).join('');
}

// ── Série des 20 dernières parties ────────────────────────────────────────

export function renderStreak(games) {
  document.getElementById('streakRow').innerHTML =
    games.slice(-20).map(g => {
      const w = g.result === 'Win';
      return `<div class="streak-dot ${w ? 'w' : 'l'}" title="${g.date} vs ${g.opponent}">${w ? 'V' : 'D'}</div>`;
    }).join('');
}
