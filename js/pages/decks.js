/**
 * pages/decks.js — Page de gestion des decks (SRP)
 * Liste tous les decks joués avec leurs statistiques et leur composition de cartes.
 * Gère la détection de versions distinctes quand la composition change.
 */

import { parseCSV }    from '../parser.js';
import { inkBadge }    from '../utils/ink.js';
import { esc }         from '../utils/html.js';
import { LS_KEYS }     from '../constants.js';

// ── Empreinte de decklist ──────────────────────────────────────────────────

/**
 * Produit une chaîne canonique représentant une decklist.
 * Deux decklists identiques produisent la même empreinte.
 * @returns {string|null} null si la decklist est vide
 */
function fingerprint(decklist) {
  if (!decklist || !decklist.length) return null;
  return [...decklist]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(c => `${c.count}x${c.name}`)
    .join('|');
}

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

  // Tri alphabétique
  added.sort((a, b) => a.name.localeCompare(b.name));
  removed.sort((a, b) => a.name.localeCompare(b.name));
  changed.sort((a, b) => a.name.localeCompare(b.name));

  return { added, removed, changed };
}

// ── Agrégation des decks avec détection de versions ───────────────────────

function buildDecks(games) {
  // Regrouper par couleur (les games sont déjà triés chronologiquement)
  const byColor = {};
  for (const g of games) {
    (byColor[g.myColors] = byColor[g.myColors] || []).push(g);
  }

  const allDecks = [];

  for (const [colors, colorGames] of Object.entries(byColor)) {
    // Détecter les versions en parcourant chronologiquement
    const versions = [];
    let current    = null;

    for (const g of colorGames) {
      const fp = fingerprint(g.decklist);

      if (!current) {
        // Premier jeu de cette couleur
        current = { fp, decklist: g.decklist || [], games: [g] };
      } else if (fp && fp !== current.fp) {
        // La decklist a changé → nouvelle version
        versions.push(current);
        current = { fp, decklist: g.decklist, games: [g] };
      } else {
        // Même version (ou partie sans decklist → hérite de la version courante)
        if (fp) current.decklist = g.decklist; // maintenir la liste à jour
        current.games.push(g);
      }
    }
    if (current) versions.push(current);

    const multiVersion = versions.length > 1;

    versions.forEach((v, idx) => {
      const wins     = v.games.filter(g => g.result === 'Win').length;
      const total    = v.games.length;
      const avgDelta = v.games.reduce((s, g) => s + (g.mmrAfter - g.mmrBefore), 0) / total;
      const dates    = v.games.map(g => g.date).sort();

      allDecks.push({
        colors,
        version:       multiVersion ? idx + 1 : null,
        totalVersions: multiVersion ? versions.length : 1,
        // Diff avec la version précédente (null pour la v1)
        diff: idx > 0 ? diffDecklists(versions[idx - 1].decklist, v.decklist) : null,
        total, wins,
        losses:        total - wins,
        rate:          wins / total * 100,
        avgDelta,
        firstPlayed:   dates[0],
        lastPlayed:    dates[dates.length - 1],
        decklist:      v.decklist,
      });
    });
  }

  return allDecks.sort((a, b) => b.total - a.total);
}

// ── Rendu du diff ──────────────────────────────────────────────────────────

function renderDiff(diff) {
  if (!diff) return '';
  const { added, removed, changed } = diff;
  if (!added.length && !removed.length && !changed.length) return '';

  const parts = [];

  if (added.length)   parts.push(added.map(c =>
    `<span class="deck-diff-added">+${c.count}× ${esc(c.name)}</span>`).join(''));
  if (removed.length) parts.push(removed.map(c =>
    `<span class="deck-diff-removed">−${c.count}× ${esc(c.name)}</span>`).join(''));
  if (changed.length) parts.push(changed.map(c =>
    `<span class="deck-diff-changed">${c.before}×→${c.after}× ${esc(c.name)}</span>`).join(''));

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

  // Badge de version (affiché uniquement si plusieurs versions)
  const versionBadge = deck.version
    ? `<span class="deck-version-badge">v${deck.version} / ${deck.totalVersions}</span>`
    : '';

  // Cartes triées : count décroissant, puis nom alphabétique
  const cards = [...deck.decklist]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  const totalCopies = cards.reduce((s, c) => s + c.count, 0);
  const uniqueCards = cards.length;

  const cardList = cards.length
    ? cards.map(c => `
        <div class="deck-card-row">
          <span class="deck-card-count">${c.count}×</span>
          <span class="deck-card-name">${esc(c.name)}</span>
        </div>`).join('')
    : '<p class="empty-msg" style="padding:6px 0;font-size:13px">Decklist non disponible dans le CSV</p>';

  return `
    <div class="deck-profile-card">
      <div class="deck-profile-header">
        <div class="deck-profile-icons">${inkBadge(deck.colors, 52)}</div>
        <div class="deck-profile-meta">
          <div class="deck-profile-name">
            ${esc(deck.colors)}
            ${versionBadge}
          </div>
          <div class="deck-profile-stats">
            <span style="color:${wrColor};font-family:'Cinzel',serif;font-size:20px;font-weight:600">${deck.rate.toFixed(1)}%</span>
            <span class="deck-stat-pill">${deck.wins}V / ${deck.losses}D</span>
            <span class="deck-stat-pill">${deck.total} partie${deck.total > 1 ? 's' : ''}</span>
            <span class="deck-stat-pill" style="color:${mmrColor}">${mmrSign}${deck.avgDelta.toFixed(1)} MMR/partie</span>
          </div>
          <div class="deck-profile-dates">
            ${esc(deck.firstPlayed)} → ${esc(deck.lastPlayed)}
          </div>
        </div>
      </div>
      ${renderDiff(deck.diff)}
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
    const decks     = buildDecks(games);

    // Compter les couleurs uniques pour le résumé
    const uniqueColors = new Set(decks.map(d => d.colors)).size;
    const totalVersions = decks.length;
    document.getElementById('deckCount').textContent =
      uniqueColors === totalVersions
        ? `${uniqueColors} deck${uniqueColors > 1 ? 's' : ''}`
        : `${uniqueColors} deck${uniqueColors > 1 ? 's' : ''} · ${totalVersions} versions`;

    content.innerHTML = decks.map(renderDeckCard).join('');
  } catch (e) {
    const p = document.createElement('p');
    p.className   = 'empty-msg';
    p.textContent = `Erreur de lecture : ${e.message}`;
    content.replaceChildren(p);
  }
});
