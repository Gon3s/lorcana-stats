/**
 * inkstats.js — Statistiques par encre Lorcana
 * - Winrate de chaque encre jouée (mono + bi)
 * - Matrice de matchups encre vs encre adversaire
 */

import { winStats, groupBy }       from '../charts/registry.js';
import { inkBadge }                from '../utils/ink.js';
import { MIN_MATCHUP_GAMES }       from '../constants.js';

const ALL_INKS = ['Amber', 'Amethyst', 'Emerald', 'Ruby', 'Sapphire', 'Steel'];

// ── Helpers ────────────────────────────────────────────────────────────────

/** Retourne la liste des encres d'un deck "Amethyst/Sapphire" → ["Amethyst","Sapphire"] */
function splitInks(colorStr) {
  return colorStr ? colorStr.split('/').map(c => c.trim()) : [];
}

/** Identifie les encres individuelles présentes dans le dataset (pour la matrice) */
function detectInks(games) {
  const set = new Set();
  for (const g of games) {
    splitInks(g.myColors).forEach(i => set.add(i));
    splitInks(g.oppColors).forEach(i => set.add(i));
  }
  return ALL_INKS.filter(i => set.has(i));
}

// ── Section 1 : winrate par combinaison de couleurs jouée ──────────────────

export function renderInkWinrates(games, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Grouper par bicolorité (ex : "Amethyst/Sapphire") au lieu de l'encre seule
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
            <span class="ink-stat-name">${s.combo}</span>
            <span class="ink-stat-pct" style="color:${barColor}">${s.rate.toFixed(1)}%</span>
            <span class="ink-stat-games">${s.wins}V / ${s.total - s.wins}D (${s.total})</span>
          </div>
          <div class="ink-bar-track">
            <div class="ink-bar-fill" style="width:${s.rate.toFixed(1)}%;background:${barColor}"></div>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ── Section 2 : matrice de matchups (P2 : précalcul avec cache) ────────────

/** Cache pour éviter de recalculer la matrice si les données n'ont pas changé */
let _matrixGamesRef  = null;
let _matrixDataCache = null;

/**
 * Précalcule toutes les cellules de la matrice ink vs ink.
 * @returns {Object} map : "myInk|oppInk" → { rate, total }
 */
function buildMatrixData(inks, games) {
  const cache = {};
  for (const myInk of inks) {
    for (const oppInk of inks) {
      if (myInk === oppInk) continue;
      const gs = games.filter(g =>
        splitInks(g.myColors).includes(myInk) &&
        splitInks(g.oppColors).includes(oppInk)
      );
      if (!gs.length) continue;
      const s = winStats(gs);
      cache[`${myInk}|${oppInk}`] = { rate: s.rate, total: gs.length };
    }
  }
  return cache;
}

export function renderMatchupMatrix(games, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const inks = detectInks(games);

  // P2 : recalcul uniquement si la référence des données a changé
  if (games !== _matrixGamesRef) {
    _matrixGamesRef  = games;
    _matrixDataCache = buildMatrixData(inks, games);
  }

  const colHeader = inks.map(ink =>
    `<th class="matrix-head" title="${ink}">${inkBadge(ink, 28)}</th>`
  ).join('');

  const rows = inks.map(myInk => {
    const cells = inks.map(oppInk => {
      if (myInk === oppInk) return `<td class="matrix-cell matrix-mirror">—</td>`;
      const m = _matrixDataCache[`${myInk}|${oppInk}`];
      if (!m || m.total < MIN_MATCHUP_GAMES) return `<td class="matrix-cell matrix-na" title="Pas assez de données">?</td>`;
      const rate      = m.rate;
      const intensity = Math.round(Math.abs(rate - 50) / 50 * 100);
      let bg;
      if (rate >= 60) bg = `rgba(78,204,163,${0.2 + intensity / 250})`;
      else if (rate >= 50) bg = `rgba(78,204,163,${0.1 + intensity / 500})`;
      else if (rate >= 40) bg = `rgba(232,93,122,${0.1 + intensity / 500})`;
      else bg = `rgba(232,93,122,${0.2 + intensity / 250})`;
      const textColor = rate >= 50 ? '#4ecca3' : '#e85d7a';
      return `<td class="matrix-cell" style="background:${bg};color:${textColor}" title="${myInk} vs ${oppInk}: ${rate.toFixed(1)}% (${m.total} parties)">${rate.toFixed(0)}%</td>`;
    }).join('');
    return `<tr>
      <th class="matrix-row-head" title="${myInk}">${inkBadge(myInk, 28)}</th>
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
    <p class="matrix-note">Winrate de ton encre (ligne) contre l'encre adversaire (colonne). Affiché si ≥ ${MIN_MATCHUP_GAMES} parties.</p>`;
}
