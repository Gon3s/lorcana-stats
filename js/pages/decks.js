/**
 * pages/decks.js — Page de gestion des decks (SRP)
 * Liste tous les decks joués avec leurs statistiques et leur composition de cartes.
 * Lit les données depuis localStorage (CSV brut → parseCSV).
 */

import { parseCSV }    from '../parser.js';
import { inkBadge }    from '../utils/ink.js';
import { LS_KEYS }     from '../constants.js';

// ── Agrégation des decks ───────────────────────────────────────────────────

function buildDecks(games) {
  const deckMap = {};

  for (const g of games) {
    if (!deckMap[g.myColors]) {
      deckMap[g.myColors] = { games: [], latestDecklist: [] };
    }
    deckMap[g.myColors].games.push(g);
    // Conserver la decklist la plus récente non vide
    if (g.decklist && g.decklist.length) {
      deckMap[g.myColors].latestDecklist = g.decklist;
    }
  }

  return Object.entries(deckMap)
    .map(([colors, { games, latestDecklist }]) => {
      const wins     = games.filter(g => g.result === 'Win').length;
      const total    = games.length;
      const avgDelta = games.reduce((s, g) => s + (g.mmrAfter - g.mmrBefore), 0) / total;
      const dates    = games.map(g => g.date).sort();
      return {
        colors, total, wins,
        losses:          total - wins,
        rate:            wins / total * 100,
        avgDelta,
        firstPlayed:     dates[0],
        lastPlayed:      dates[dates.length - 1],
        latestDecklist,
      };
    })
    .sort((a, b) => b.total - a.total);
}

// ── Rendu d'une carte de deck ──────────────────────────────────────────────

function renderDeckCard(deck) {
  const wrColor   = deck.rate >= 50 ? 'var(--win)' : 'var(--loss)';
  const mmrColor  = deck.avgDelta >= 0 ? 'var(--win)' : 'var(--loss)';
  const mmrSign   = deck.avgDelta >= 0 ? '+' : '';

  // Tri : count décroissant, puis nom alphabétique
  const cards = [...deck.latestDecklist]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const totalCopies  = cards.reduce((s, c) => s + c.count, 0);
  const uniqueCards  = cards.length;

  const cardList = cards.length
    ? cards.map(c => `
        <div class="deck-card-row">
          <span class="deck-card-count">${c.count}×</span>
          <span class="deck-card-name">${c.name}</span>
        </div>`).join('')
    : '<p class="empty-msg" style="padding:6px 0;font-size:13px">Decklist non disponible dans le CSV</p>';

  return `
    <div class="deck-profile-card">
      <div class="deck-profile-header">
        <div class="deck-profile-icons">${inkBadge(deck.colors, 52)}</div>
        <div class="deck-profile-meta">
          <div class="deck-profile-name">${deck.colors}</div>
          <div class="deck-profile-stats">
            <span style="color:${wrColor};font-family:'Cinzel',serif;font-size:20px;font-weight:600">${deck.rate.toFixed(1)}%</span>
            <span class="deck-stat-pill">${deck.wins}V / ${deck.losses}D</span>
            <span class="deck-stat-pill">${deck.total} partie${deck.total > 1 ? 's' : ''}</span>
            <span class="deck-stat-pill" style="color:${mmrColor}">${mmrSign}${deck.avgDelta.toFixed(1)} MMR/partie</span>
          </div>
          <div class="deck-profile-dates">
            ${deck.firstPlayed} → ${deck.lastPlayed}
          </div>
        </div>
      </div>
      <div class="deck-profile-body">
        <div class="deck-cards-grid">${cardList}</div>
        ${cards.length
          ? `<p class="deck-card-summary">${totalCopies} cartes · ${uniqueCards} uniques</p>`
          : ''}
      </div>
    </div>`;
}

// ── Initialisation ─────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const csv = localStorage.getItem(LS_KEYS.CSV);
  const content = document.getElementById('decksContent');

  if (!csv) {
    content.innerHTML = `
      <div class="text-center" style="padding:64px 0">
        <p class="empty-msg" style="font-size:16px;margin-bottom:20px">
          Aucune donnée chargée.
        </p>
        <a href="index.html" class="drop-btn" style="text-decoration:none">
          Charger un CSV
        </a>
      </div>`;
    return;
  }

  try {
    const { games } = parseCSV(csv);
    const decks     = buildDecks(games);
    document.getElementById('deckCount').textContent =
      `${decks.length} deck${decks.length > 1 ? 's' : ''}`;
    content.innerHTML = decks.map(renderDeckCard).join('');
  } catch (e) {
    content.innerHTML = `<p class="empty-msg">Erreur de lecture : ${e.message}</p>`;
  }
});
