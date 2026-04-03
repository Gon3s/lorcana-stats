/**
 * dashboard.js — Widgets du tableau de bord (SRP)
 * KPIs, header meta, tableau des parties, série récente.
 * Ne contient aucune logique graphique (Chart.js).
 */

import { inkBadge }      from '../utils/ink.js';
import { esc }           from '../utils/html.js';
import { TABLE_MAX_ROWS } from '../constants.js';

// ── Header & KPIs ─────────────────────────────────────────────────────────

export function updateHeader(games) {
  const wins     = games.filter(g => g.result === 'Win');
  const losses   = games.filter(g => g.result === 'Loss');
  const total    = games.length;
  const mmrGames = games.filter(g => g.mmrAfter !== null);
  const endMMR   = mmrGames.length ? mmrGames[mmrGames.length - 1].mmrAfter : null;
  const avgDur   = (games.reduce((s, g) => s + g.duration, 0) / total).toFixed(1);
  const dates    = games.map(g => g.date).sort();

  document.getElementById('kpiTotal')  .textContent = total;
  document.getElementById('kpiWins')   .textContent = wins.length;
  document.getElementById('kpiLosses') .textContent = losses.length;
  document.getElementById('kpiWinRate').textContent = (wins.length / total * 100).toFixed(1) + '%';
  document.getElementById('kpiMMR')    .textContent = endMMR !== null ? endMMR : '—';
  document.getElementById('kpiDur')    .textContent = avgDur + 'm';

  document.getElementById('headerMeta').textContent =
    `${dates[0]} → ${dates[dates.length - 1]}  ·  ${total} parties`;
}

/** Met à jour le badge MMR (Départ → Pic MMR → Actuel) selon les parties passées */
export function updateMMRBadge(games) {
  if (!games.length) return;
  const mmrGames = games.filter(g => g.mmrBefore !== null && g.mmrAfter !== null);
  if (!mmrGames.length) return;
  const startMMR = mmrGames[0].mmrBefore;
  const endMMR   = mmrGames[mmrGames.length - 1].mmrAfter;
  const peakMMR  = Math.max(...mmrGames.map(g => g.mmrAfter));
  const mmrGain  = endMMR - startMMR;
  document.getElementById('mmrBadge').innerHTML =
    `✦ Départ: ${startMMR} &nbsp;→&nbsp; Pic MMR: ${peakMMR} &nbsp;→&nbsp; Actuel: ${endMMR}` +
    ` &nbsp;(${mmrGain >= 0 ? '+' : ''}${mmrGain} pts)`;
}

// ── Tableau des parties (toutes, paginées) ────────────────────────────────

let _tablePage  = 0;
let _tableGames = [];

function mmrDeltaClass(delta) {
  return delta >= 0 ? 'text-win' : 'text-loss';
}

function _renderTablePage() {
  const total      = _tableGames.length;
  const pageSize   = TABLE_MAX_ROWS;
  const totalPages = Math.ceil(total / pageSize);
  const start      = _tablePage * pageSize;
  const slice      = _tableGames.slice(start, start + pageSize);

  document.getElementById('tableBody').innerHTML = slice.map(g => {
    const delta  = (g.mmrAfter !== null && g.mmrBefore !== null) ? g.mmrAfter - g.mmrBefore : null;
    const isWin  = g.result === 'Win';

    return `<tr>
      <td>${esc(g.date.slice(5))}</td>
      <td><span class="win-badge ${isWin ? 'win' : 'loss'}">${isWin ? '✓ Victoire' : '✗ Défaite'}</span></td>
      <td>${esc(g.opponent)}</td>
      <td class="td-small">${inkBadge(g.myColors)}</td>
      <td class="td-small">${inkBadge(g.oppColors)}</td>
      <td class="td-center td-win">${g.myLore}</td>
      <td class="td-center">${g.oppLore}</td>
      <td class="td-center">${g.turns}</td>
      <td class="td-center">${g.duration}m</td>
      <td class="td-right ${delta !== null ? mmrDeltaClass(delta) : ''} td-cinzel">${delta !== null ? `${delta >= 0 ? '+' : ''}${delta}` : '—'}</td>
    </tr>`;
  }).join('');

  // Pagination controls
  const paginationEl = document.getElementById('tablePagination');
  if (!paginationEl) return;
  if (totalPages <= 1) {
    paginationEl.hidden = true;
    return;
  }
  paginationEl.hidden = false;
  document.getElementById('tablePageInfo').textContent = `Page ${_tablePage + 1} / ${totalPages}`;
  const prevBtn = document.getElementById('tablePrevBtn');
  const nextBtn = document.getElementById('tableNextBtn');
  if (prevBtn) prevBtn.disabled = _tablePage === 0;
  if (nextBtn) nextBtn.disabled = _tablePage >= totalPages - 1;
}

export function renderTable(games) {
  _tablePage  = 0;
  _tableGames = [...games].reverse();
  _renderTablePage();
}

/** Initialise les boutons de pagination — à appeler une seule fois au démarrage */
export function initTablePagination() {
  const prevBtn = document.getElementById('tablePrevBtn');
  const nextBtn = document.getElementById('tableNextBtn');
  if (prevBtn) prevBtn.addEventListener('click', () => {
    if (_tablePage > 0) { _tablePage--; _renderTablePage(); }
  });
  if (nextBtn) nextBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(_tableGames.length / TABLE_MAX_ROWS);
    if (_tablePage < totalPages - 1) { _tablePage++; _renderTablePage(); }
  });
}

// ── Série des dernières parties ───────────────────────────────────────────

export function renderStreak(games) {
  document.getElementById('streakRow').innerHTML =
    games.slice(-TABLE_MAX_ROWS).map(g => {
      const w = g.result === 'Win';
      return `<div class="streak-dot ${w ? 'w' : 'l'}" title="${esc(g.date)} vs ${esc(g.opponent)}">${w ? 'V' : 'D'}</div>`;
    }).join('');
}
