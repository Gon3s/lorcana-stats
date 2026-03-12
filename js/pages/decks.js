/**
 * pages/decks.js — Page de gestion des decks (SRP)
 * Liste tous les decks joués avec leurs statistiques et leur composition de cartes.
 * Gère la détection de versions distinctes quand la composition change.
 */

import { parseCSV }          from '../parser.js';
import { inkBadge }          from '../utils/ink.js';
import { LS_KEYS }           from '../constants.js';
import { buildDecks }        from '../utils/deck-builder.js';
import { store }             from '../store.js';
import { buildQueueFilter, buildDateFilter, updateFilterCount } from '../ui/filter.js';

// ── Diff entre deux decklists ──────────────────────────────────────────────

/**
 * Compare deux decklists et retourne les cartes ajoutées, retirées et modifiées.
 * @returns {{ added: Card[], removed: Card[], changed: {name, before, after}[] }}
 */
function diffDecklists(before, after) {
  const mapBefore = Object.fromEntries((before || []).map(c => [c.name, c.count]));
  const mapAfter  = Object.fromEntries((after  || []).map(c => [c.name, c.count]));
  const allNames  = new Set([...Object.keys(mapBefore), ...Object.keys(mapAfter)]);

  const added   = [];
  const removed = [];
  const changed = [];

  for (const name of allNames) {
    const b = mapBefore[name] ?? 0;
    const a = mapAfter[name]  ?? 0;
    if (b === 0) added.push({ name, count: a });
    else if (a === 0) removed.push({ name, count: b });
    else if (b !== a) changed.push({ name, before: b, after: a });
  }

  added.sort((a, b) => a.name.localeCompare(b.name));
  removed.sort((a, b) => a.name.localeCompare(b.name));
  changed.sort((a, b) => a.name.localeCompare(b.name));

  return { added, removed, changed };
}

// ── Rendu du diff ──────────────────────────────────────────────────────────

function renderDiff(diff) {
  if (!diff) return '';
  const { added, removed, changed } = diff;
  if (!added.length && !removed.length && !changed.length) return '';

  const parts = [];
  if (added.length)   parts.push(added.map(c =>
    `<span class="deck-diff-added">+${c.count}× ${c.name}</span>`).join(''));
  if (removed.length) parts.push(removed.map(c =>
    `<span class="deck-diff-removed">−${c.count}× ${c.name}</span>`).join(''));
  if (changed.length) parts.push(changed.map(c =>
    `<span class="deck-diff-changed">${c.before}×→${c.after}× ${c.name}</span>`).join(''));

  return `
    <div class="deck-diff">
      <span class="deck-diff-label">Modifications vs v${parts.length > 0 ? '' : '…'}</span>
      <div class="deck-diff-list">${parts.join('')}</div>
    </div>`;
}

// ── Rendu d'une carte de deck ──────────────────────────────────────────────

function renderDeckCard(deck) {
  const wrColor  = deck.rate >= 50 ? 'var(--win)' : 'var(--loss)';
  const mmrColor = deck.avgDelta >= 0 ? 'var(--win)' : 'var(--loss)';
  const mmrSign  = deck.avgDelta >= 0 ? '+' : '';

  const versionBadge = deck.version
    ? `<span class="deck-version-badge">v${deck.version} / ${deck.totalVersions}</span>`
    : '';

  // Diff calculé depuis prevDecklist (extrait par deck-builder)
  const diff = deck.prevDecklist ? diffDecklists(deck.prevDecklist, deck.decklist) : null;

  const cards = [...deck.decklist]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const totalCopies = cards.reduce((s, c) => s + c.count, 0);
  const uniqueCards = cards.length;

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
          <div class="deck-profile-name">
            ${deck.colors}
            ${versionBadge}
          </div>
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
      ${renderDiff(diff)}
      <div class="deck-profile-body">
        <div class="deck-cards-grid">${cardList}</div>
        ${cards.length
          ? `<p class="deck-card-summary">${totalCopies} cartes · ${uniqueCards} uniques</p>`
          : ''}
      </div>
    </div>`;
}

// ── Rendu de la liste ──────────────────────────────────────────────────────

function renderAllDecks() {
  const content = document.getElementById('decksContent');
  const games   = store.getFiltered();
  const decks   = buildDecks(games);

  updateFilterCount(games.length);

  const uniqueColors  = new Set(decks.map(d => d.colors)).size;
  const totalVersions = decks.length;
  document.getElementById('deckCount').textContent =
    uniqueColors === totalVersions
      ? `${uniqueColors} deck${uniqueColors > 1 ? 's' : ''}`
      : `${uniqueColors} deck${uniqueColors > 1 ? 's' : ''} · ${totalVersions} versions`;

  content.innerHTML = decks.length
    ? decks.map(renderDeckCard).join('')
    : '<p class="empty-msg" style="padding:48px 0;font-size:16px">Aucune partie pour cette période.</p>';
}

// ── Utilitaire date ────────────────────────────────────────────────────────

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ── Initialisation ─────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const csv     = localStorage.getItem(LS_KEYS.CSV);
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
    store.setGames(games);

    // Filtre date par défaut : 15 derniers jours
    const dateDefault = daysAgo(15);
    store.setDateRange(dateDefault, null);

    buildQueueFilter(store.allGames, store.setActiveQueue.bind(store), renderAllDecks);
    buildDateFilter(store.setDateRange.bind(store), renderAllDecks, dateDefault);

    renderAllDecks();
  } catch (e) {
    content.innerHTML = `<p class="empty-msg">Erreur de lecture : ${e.message}</p>`;
  }
});
