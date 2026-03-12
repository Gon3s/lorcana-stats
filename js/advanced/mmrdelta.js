/**
 * advanced/mmrdelta.js — Delta MMR moyen par deck (SRP)
 * N7 : gain/perte MMR moyen par partie jouée, groupé par deck.
 */

import { groupBy }         from '../charts/registry.js';
import { inkBadge }        from '../utils/ink.js';
import { MIN_MATCHUP_GAMES } from '../constants.js';

/** Valeur absolue maximale utilisée pour normaliser les barres (en pts MMR) */
const MAX_DELTA_DISPLAY = 30;

export function renderMmrDelta(games, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const byDeck = groupBy(games, 'myColors');

  const stats = Object.entries(byDeck)
    .map(([deck, gs]) => {
      const avgDelta = gs.reduce((s, g) => s + (g.mmrAfter - g.mmrBefore), 0) / gs.length;
      return { deck, total: gs.length, avgDelta };
    })
    .filter(s => s.total >= MIN_MATCHUP_GAMES)
    .sort((a, b) => b.avgDelta - a.avgDelta);

  if (!stats.length) {
    container.innerHTML = '<p class="empty-msg">Pas assez de données.</p>';
    return;
  }

  container.innerHTML = stats.map(s => {
    const positive  = s.avgDelta >= 0;
    const color     = positive ? 'var(--win)' : 'var(--loss)';
    const sign      = positive ? '+' : '';
    const barWidth  = Math.min(Math.abs(s.avgDelta) / MAX_DELTA_DISPLAY * 100, 100).toFixed(1);
    return `
      <div class="bar-row">
        <div class="bar-label" title="${s.deck}">${inkBadge(s.deck, 18)}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${barWidth}%;background:${color}"></div>
        </div>
        <div class="bar-stat" style="color:${color}">
          ${sign}${s.avgDelta.toFixed(1)}<span class="bar-count">(${s.total})</span>
        </div>
      </div>`;
  }).join('');
}
