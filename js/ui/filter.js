/**
 * filter.js — Barre de filtres (deck, format, période) (SRP)
 * Responsabilité unique : construire les contrôles de filtre et notifier les changements.
 */

import { inkPillContent } from '../utils/ink.js';

// ── Compteur ────────────────────────────────────────────────────────────────

export function updateFilterCount(n) {
  document.getElementById('filterCount').innerHTML =
    `<span>${n}</span> partie${n > 1 ? 's' : ''}`;
}

// ── Pills génériques ─────────────────────────────────────────────────────────

function createPill(html, value, isActive, onPick) {
  const btn = document.createElement('button');
  btn.className     = 'filter-pill' + (isActive ? ' active' : '');
  btn.innerHTML     = html;
  btn.dataset.value = value;
  btn.addEventListener('click', () => onPick(value, btn.closest('.filter-pills')));
  return btn;
}

function activatePill(pillsEl, value) {
  pillsEl.querySelectorAll('.filter-pill')
    .forEach(p => p.classList.toggle('active', p.dataset.value === value));
}

// ── Filtre deck ──────────────────────────────────────────────────────────────

/**
 * @param {Game[]}               allGames
 * @param {function(string)}     setDeck   — store.setActiveDeck
 * @param {function()}           onRerender
 */
export function buildFilterBar(allGames, setDeck, onRerender) {
  const decks   = [...new Set(allGames.map(g => g.myColors))].sort();
  const pillsEl = document.getElementById('filterPills');
  pillsEl.innerHTML = '';

  const onPick = (value, container) => {
    activatePill(container, value);
    setDeck(value);
    onRerender();
  };

  pillsEl.appendChild(createPill('Tous', 'all', true, onPick));
  decks.forEach(d => pillsEl.appendChild(createPill(inkPillContent(d), d, false, onPick)));
}

// ── Filtre format (BO1 / BO3) ────────────────────────────────────────────────

/**
 * @param {Game[]}               allGames
 * @param {function(string)}     setFormat — store.setActiveFormat
 * @param {function()}           onRerender
 */
export function buildFormatFilter(allGames, setFormat, onRerender) {
  const formats = [...new Set(allGames.map(g => g.matchFormat).filter(Boolean))].sort();
  const pillsEl = document.getElementById('filterFormat');
  pillsEl.innerHTML = '';

  // N'afficher le filtre que si plusieurs formats existent
  const section = document.getElementById('filterFormatSection');
  if (formats.length <= 1) {
    if (section) section.hidden = true;
    return;
  }
  if (section) section.hidden = false;

  const onPick = (value, container) => {
    activatePill(container, value);
    setFormat(value);
    onRerender();
  };

  pillsEl.appendChild(createPill('Tous', 'all', true, onPick));
  formats.forEach(f => pillsEl.appendChild(createPill(f, f, false, onPick)));
}

// ── Filtre période ───────────────────────────────────────────────────────────

/**
 * @param {function(string, string)} setDateRange — store.setDateRange
 * @param {function()}               onRerender
 */
export function buildDateFilter(setDateRange, onRerender) {
  const startEl = document.getElementById('dateStart');
  const endEl   = document.getElementById('dateEnd');
  const resetEl = document.getElementById('dateResetBtn');

  const apply = () => {
    const start = startEl.value || null;
    const end   = endEl.value   || null;
    setDateRange(start, end);
    if (resetEl) resetEl.hidden = !start && !end;
    onRerender();
  };

  startEl.addEventListener('change', apply);
  endEl.addEventListener('change', apply);

  if (resetEl) {
    resetEl.addEventListener('click', () => {
      startEl.value = '';
      endEl.value   = '';
      apply();
    });
  }
}
