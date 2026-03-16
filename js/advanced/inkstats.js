/**
 * inkstats.js — Statistiques par encre Lorcana
 * - Winrate par combinaison de couleurs jouée (bicolorité)
 * - Matrice de matchups combinaison vs combinaison adversaire
 */

import { winStats, groupBy }  from '../charts/registry.js';
import { inkBadge }           from '../utils/ink.js';
import { esc }                from '../utils/html.js';
import { MIN_MATCHUP_GAMES }  from '../constants.js';

// ── Section 1 : winrate par combinaison jouée ──────────────────────────────

export function renderInkWinrates(games, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const byCombo = groupBy(games, 'myColors');

  const stats = Object.entries(byCombo)
    .map(([combo, gs]) => ({ combo, ...winStats(gs) }))
    .filter(s => s.total >= MIN_MATCHUP_GAMES)
    .sort((a, b) => b.rate - a.rate);

  container.innerHTML = stats.map(s => {
    const barColor = s.rate >= 50 ? '#4ecca3' : '#e85d7a';
    return `
      <div class="ink-stat-row">
        <div class="ink-stat-icon">${inkBadge(s.combo, 32)}</div>
        <div class="ink-stat-body">
          <div class="ink-stat-header">
            <span class="ink-stat-name">${esc(s.combo)}</span>
            <span class="ink-stat-pct" style="color:${barColor}">${s.rate.toFixed(1)}%</span>
            <span class="ink-stat-games">${s.wins}V / ${s.losses}D (${s.total})</span>
          </div>
          <div class="ink-bar-track">
            <div class="ink-bar-fill" style="width:${s.rate.toFixed(1)}%;background:${barColor}"></div>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ── Section 2 : matrice combinaison vs combinaison (P2 : cache) ────────────

let _matrixGamesRef  = null;
let _matrixDataCache = null;
let _matrixRowsCache = null;
let _matrixColsCache = null;

/**
 * Précalcule les cellules de la matrice myColors × oppColors.
 * @returns {Object} map : "myCombo|oppCombo" → { rate, total }
 */
function buildMatrixData(myRows, oppCols, games) {
  const cache = {};
  for (const myCombo of myRows) {
    for (const oppCombo of oppCols) {
      const gs = games.filter(g => g.myColors === myCombo && g.oppColors === oppCombo);
      if (!gs.length) continue;
      const s = winStats(gs);
      cache[`${myCombo}|${oppCombo}`] = { rate: s.rate, total: gs.length };
    }
  }
  return cache;
}

export function renderMatchupMatrix(games, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // P2 : recalcul uniquement si la référence des données a changé
  if (games !== _matrixGamesRef) {
    _matrixGamesRef  = games;
    // Lignes = combinaisons que j'ai jouées ; colonnes = combinaisons adverses
    _matrixRowsCache = [...new Set(games.map(g => g.myColors))].sort();
    _matrixColsCache = [...new Set(games.map(g => g.oppColors))].sort();
    _matrixDataCache = buildMatrixData(_matrixRowsCache, _matrixColsCache, games);
  }

  const myRows  = _matrixRowsCache;
  const oppCols = _matrixColsCache;

  // En-têtes de colonnes (combos adverses)
  const colHeader = oppCols.map(combo =>
    `<th class="matrix-head" title="${esc(combo)}">
       <div class="matrix-combo-head">${inkBadge(combo, 22)}</div>
     </th>`
  ).join('');

  const rows = myRows.map(myCombo => {
    const cells = oppCols.map(oppCombo => {
      // Diagonale : même combo des deux côtés
      if (myCombo === oppCombo) return `<td class="matrix-cell matrix-mirror">—</td>`;

      const m = _matrixDataCache[`${myCombo}|${oppCombo}`];
      if (!m || m.total < MIN_MATCHUP_GAMES) {
        return `<td class="matrix-cell matrix-na" title="Pas assez de données (min. ${MIN_MATCHUP_GAMES})">?</td>`;
      }

      const rate      = m.rate;
      const intensity = Math.round(Math.abs(rate - 50) / 50 * 100);
      let bg;
      if      (rate >= 60) bg = `rgba(78,204,163,${0.2 + intensity / 250})`;
      else if (rate >= 50) bg = `rgba(78,204,163,${0.1 + intensity / 500})`;
      else if (rate >= 40) bg = `rgba(232,93,122,${0.1 + intensity / 500})`;
      else                 bg = `rgba(232,93,122,${0.2 + intensity / 250})`;

      const textColor = rate >= 50 ? '#4ecca3' : '#e85d7a';
      return `<td class="matrix-cell"
        style="background:${bg};color:${textColor}"
        title="${esc(myCombo)} vs ${esc(oppCombo)} : ${rate.toFixed(1)}% (${m.total} partie${m.total > 1 ? 's' : ''})"
      >${rate.toFixed(0)}%</td>`;
    }).join('');

    return `<tr>
      <th class="matrix-row-head" title="${esc(myCombo)}">
        <div class="matrix-combo-head">${inkBadge(myCombo, 22)}</div>
      </th>
      ${cells}
    </tr>`;
  }).join('');

  container.innerHTML = `
    <div class="matrix-scroll">
      <table class="matchup-table">
        <thead>
          <tr>
            <th class="matrix-corner">
              <span class="matrix-corner-my">Mon deck</span>
              <span class="matrix-corner-opp">Adversaire →</span>
            </th>
            ${colHeader}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <p class="matrix-note">
      Winrate de ma combinaison (ligne) contre la combinaison adverse (colonne).
      Affiché si ≥ ${MIN_MATCHUP_GAMES} parties.
    </p>`;
}
