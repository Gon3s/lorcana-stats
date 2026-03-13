/**
 * filter.js — Barre de filtres (deck, format, queue, période) (SRP)
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
  // U1 : attributs ARIA pour le pattern tablist/tab
  btn.setAttribute('role', 'tab');
  btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  btn.setAttribute('tabindex', isActive ? '0' : '-1');
  btn.addEventListener('click', () => onPick(value, btn.closest('.filter-pills')));
  return btn;
}

function activatePill(pillsEl, value) {
  pillsEl.querySelectorAll('.filter-pill').forEach(p => {
    const active = p.dataset.value === value;
    p.classList.toggle('active', active);
    // U1 : synchronisation des attributs ARIA
    p.setAttribute('aria-selected', active ? 'true' : 'false');
    p.setAttribute('tabindex', active ? '0' : '-1');
  });
}

/** U1 : navigation clavier dans un groupe de pills (flèches gauche/droite) */
function addKeyboardNav(pillsEl) {
  pillsEl.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const pills = [...pillsEl.querySelectorAll('.filter-pill')];
    const idx   = pills.indexOf(document.activeElement);
    if (idx === -1) return;
    e.preventDefault();
    let next;
    if      (e.key === 'ArrowRight') next = (idx + 1) % pills.length;
    else if (e.key === 'ArrowLeft')  next = (idx - 1 + pills.length) % pills.length;
    else if (e.key === 'Home')       next = 0;
    else                             next = pills.length - 1;
    pills[next].focus();
    pills[next].click();
  });
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
  // U1 : rôle tablist sur le conteneur
  pillsEl.setAttribute('role', 'tablist');
  pillsEl.setAttribute('aria-label', 'Filtre par deck');

  const onPick = (value, container) => {
    activatePill(container, value);
    setDeck(value);
    onRerender();
  };

  pillsEl.appendChild(createPill('Tous', 'all', true, onPick));
  decks.forEach(d => pillsEl.appendChild(createPill(inkPillContent(d), d, false, onPick)));
  addKeyboardNav(pillsEl);
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

  const section = document.getElementById('filterFormatSection');
  if (formats.length <= 1) {
    if (section) section.hidden = true;
    return;
  }
  if (section) section.hidden = false;

  pillsEl.setAttribute('role', 'tablist');
  pillsEl.setAttribute('aria-label', 'Filtre par format');

  const onPick = (value, container) => {
    activatePill(container, value);
    setFormat(value);
    onRerender();
  };

  pillsEl.appendChild(createPill('Tous', 'all', true, onPick));
  formats.forEach(f => pillsEl.appendChild(createPill(f, f, false, onPick)));
  addKeyboardNav(pillsEl);
}

// ── Filtre queue / file de jeu (F5) ──────────────────────────────────────────

/**
 * @param {Game[]}               allGames
 * @param {function(string)}     setQueue  — store.setActiveQueue
 * @param {function()}           onRerender
 */
export function buildQueueFilter(allGames, setQueue, onRerender) {
  const queues  = [...new Set(allGames.map(g => g.queue).filter(Boolean))].sort();
  const pillsEl = document.getElementById('filterQueue');
  if (!pillsEl) return;
  pillsEl.innerHTML = '';

  const section = document.getElementById('filterQueueSection');
  if (queues.length <= 1) {
    if (section) section.hidden = true;
    return;
  }
  if (section) section.hidden = false;

  pillsEl.setAttribute('role', 'tablist');
  pillsEl.setAttribute('aria-label', 'Filtre par file de jeu');

  const onPick = (value, container) => {
    activatePill(container, value);
    setQueue(value);
    onRerender();
  };

  pillsEl.appendChild(createPill('Toutes', 'all', true, onPick));
  queues.forEach(q => pillsEl.appendChild(createPill(q, q, false, onPick)));
  addKeyboardNav(pillsEl);
}

// ── Filtre queue local à une section (MMR, Momentum) ─────────────────────────

/**
 * Construit des pills de filtre par file directement dans une section.
 * Indépendant du filtre queue global.
 * @param {string}           pillsId   — id du conteneur <div class="filter-pills">
 * @param {string}           sectionId — id du wrapper à afficher/masquer
 * @param {string[]}         queues    — liste des valeurs de queue disponibles
 * @param {function(string)} onPick    — callback(queueValue)
 */
export function buildSectionQueueFilter(pillsId, sectionId, queues, onPick) {
  const section = document.getElementById(sectionId);
  const pillsEl = document.getElementById(pillsId);
  if (!pillsEl) return;

  if (queues.length <= 1) {
    if (section) section.hidden = true;
    return;
  }
  if (section) section.hidden = false;

  pillsEl.innerHTML = '';
  pillsEl.setAttribute('role', 'tablist');
  pillsEl.setAttribute('aria-label', 'Filtre par file');

  const pick = (value, container) => {
    activatePill(container, value);
    onPick(value);
  };

  pillsEl.appendChild(createPill('Toutes', 'all', true, pick));
  queues.forEach(q => pillsEl.appendChild(createPill(q, q, false, pick)));
  addKeyboardNav(pillsEl);
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
