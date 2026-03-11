/**
 * inkstats.js — Statistiques par encre Lorcana
 * - Winrate de chaque encre jouée (mono + bi)
 * - Matrice de matchups encre vs encre adversaire
 */

import { winStats } from '../charts/registry.js';
import { inkBadge, INK_COLOR } from '../utils/ink.js';

const ALL_INKS = ['Amber', 'Amethyst', 'Emerald', 'Ruby', 'Sapphire', 'Steel'];
const MIN_GAMES = 3;

// ── Helpers ────────────────────────────────────────────────────────────────

/** Retourne la liste des encres d'un deck "Amethyst/Sapphire" → ["Amethyst","Sapphire"] */
function splitInks(colorStr) {
  return colorStr ? colorStr.split('/').map(c => c.trim()) : [];
}

/** Identifie les encres présentes dans le dataset */
function detectInks(games) {
  const set = new Set();
  for (const g of games) {
    splitInks(g.myColors).forEach(i => set.add(i));
    splitInks(g.oppColors).forEach(i => set.add(i));
  }
  return ALL_INKS.filter(i => set.has(i));
}

// ── Section 1 : winrate par encre jouée ────────────────────────────────────

export function renderInkWinrates(games, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const inks = detectInks(games);

  const stats = inks.map(ink => {
    const gs = games.filter(g => splitInks(g.myColors).includes(ink));
    return { ink, ...winStats(gs) };
  }).filter(s => s.total >= MIN_GAMES).sort((a, b) => b.rate - a.rate);

  container.innerHTML = stats.map(s => {
    const color = INK_COLOR[s.ink.toLowerCase()] || '#888';
    const barColor = s.rate >= 50 ? '#4ecca3' : '#e85d7a';
    return `
      <div class="ink-stat-row">
        <div class="ink-stat-icon">${inkBadge(s.ink, 36)}</div>
        <div class="ink-stat-body">
          <div class="ink-stat-header">
            <span class="ink-stat-name" style="color:${color}">${s.ink}</span>
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

// ── Section 2 : matrice de matchups ────────────────────────────────────────

export function renderMatchupMatrix(games, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const inks = detectInks(games);

  // Calcule winrate de myInk vs oppInk
  function matchup(myInk, oppInk) {
    const gs = games.filter(g =>
      splitInks(g.myColors).includes(myInk) &&
      splitInks(g.oppColors).includes(oppInk)
    );
    if (!gs.length) return null;
    const s = winStats(gs);
    return { rate: s.rate, total: gs.total || gs.length };
  }

  const colHeader = inks.map(ink =>
    `<th class="matrix-head" title="${ink}">${inkBadge(ink, 28)}</th>`
  ).join('');

  const rows = inks.map(myInk => {
    const cells = inks.map(oppInk => {
      if (myInk === oppInk) return `<td class="matrix-cell matrix-mirror">—</td>`;
      const m = matchup(myInk, oppInk);
      if (!m || m.total < MIN_GAMES) return `<td class="matrix-cell matrix-na" title="Pas assez de données">?</td>`;
      const rate = m.rate;
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
    <p class="matrix-note">Winrate de ton encre (ligne) contre l'encre adversaire (colonne). Affiché si ≥ ${MIN_GAMES} parties.</p>`;
}
