/**
 * advanced/predictor.js — Prédicteur de matchup (SRP)
 * Agrégation des stats par deck adverse et rendu HTML.
 */

import { inkBadge } from '../utils/ink.js';
import { esc }      from '../utils/html.js';

/** @returns {{ label: string, color: string }} */
function verdict(rate) {
  if (rate >= 60) return { label: 'Favorable',   color: 'var(--win)'       };
  if (rate >= 40) return { label: 'Équilibré',    color: 'var(--gold-light)' };
  return                 { label: 'Défavorable',  color: 'var(--loss)'      };
}

function buildMatchups(games) {
  const groups = {};
  for (const g of games) {
    (groups[g.oppColors] = groups[g.oppColors] || []).push(g);
  }

  return Object.entries(groups)
    .map(([opp, gs]) => {
      const wins   = gs.filter(g => g.result === 'Win').length;
      const losses = gs.filter(g => g.result === 'Loss').length;

      // Stats OTP / OTD
      const otpGs    = gs.filter(g => g.turnOrder === 'OTP');
      const otdGs    = gs.filter(g => g.turnOrder === 'OTD');
      const otpRate  = otpGs.length ? otpGs.filter(g => g.result === 'Win').length / otpGs.length * 100 : null;
      const otdRate  = otdGs.length ? otdGs.filter(g => g.result === 'Win').length / otdGs.length * 100 : null;

      return {
        opp,
        total: gs.length,
        wins,
        losses,
        rate:     wins / gs.length * 100,
        last5:    gs.slice(-5).map(g => g.result === 'Win' ? '✓' : '✗'),
        otpRate,  otpTotal: otpGs.length,
        otdRate,  otdTotal: otdGs.length,
      };
    })
    .sort((a, b) => b.total - a.total);
}

function renderMatchupCard(m) {
  const { label, color } = verdict(m.rate);
  const last5 = m.last5
    .map(r => `<span style="color:${r === '✓' ? 'var(--win)' : 'var(--loss)'}">${r}</span>`)
    .join(' ');

  // Ligne OTP / OTD
  const parts = [];
  if (m.otpRate !== null) {
    const c = m.otpRate >= 50 ? 'var(--win)' : 'var(--loss)';
    parts.push(`OTP <span style="color:${c}">${m.otpRate.toFixed(0)}%</span> (${m.otpTotal}p)`);
  }
  if (m.otdRate !== null) {
    const c = m.otdRate >= 50 ? 'var(--win)' : 'var(--loss)';
    parts.push(`OTD <span style="color:${c}">${m.otdRate.toFixed(0)}%</span> (${m.otdTotal}p)`);
  }
  const orderLine = parts.length
    ? `<div class="predictor-order">${parts.join(' · ')}</div>`
    : '';

  return `
    <div class="predictor-card">
      <div class="predictor-opp-icons">${inkBadge(m.opp, 26)}</div>
      <div class="predictor-opp">${esc(m.opp)}</div>
      <div class="predictor-rate"    style="color:${color}">${m.rate.toFixed(0)}%</div>
      <div class="predictor-verdict" style="color:${color}">${label}</div>
      <div class="predictor-record">${m.wins}V · ${m.losses}D · ${m.total} parties</div>
      ${orderLine}
      <div class="predictor-last5">Dernières: ${last5}</div>
    </div>`;
}

export function renderMatchupPredictor(games, activeDeck) {
  const container = document.getElementById('predictorContent');
  const matchups  = buildMatchups(games);

  if (!matchups.length) {
    container.innerHTML = '<p class="empty-msg">Pas de données.</p>';
    return;
  }

  const deckIcons = activeDeck !== 'all' ? inkBadge(activeDeck, 20) + ' ' : '';
  const deckLabel = activeDeck === 'all' ? 'tous decks' : esc(activeDeck);
  container.innerHTML = `
    <div class="predictor-deck-label">
      Deck analysé : <strong>${deckIcons}${deckLabel}</strong>
    </div>
    <div class="predictor-grid">
      ${matchups.map(renderMatchupCard).join('')}
    </div>`;
}
