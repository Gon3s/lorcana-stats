/**
 * filter.js — Barre de filtres (deck, version, queue, période) (SRP)
 * Responsabilité unique : construire les contrôles de filtre et notifier les changements.
 */

import { inkBadge }    from '../utils/ink.js';
import { buildDecks }  from '../utils/deck-builder.js';

// ── Compteur ────────────────────────────────────────────────────────────────

export function updateFilterCount(n) {
  document.getElementById('filterCount').innerHTML =
    `<span>${n}</span> partie${n > 1 ? 's' : ''}`;
}

// ── Pills génériques (utilisées par le filtre queue) ─────────────────────────

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

// ── Filtre deck (select + sous-filtre version) ────────────────────────────────

/**
 * @param {Game[]}               allGames
 * @param {function(string)}     setDeck        — store.setActiveDeck
 * @param {function(Set|null)}   setVersionKeys — store.setActiveVersionKeys
 * @param {function()}           onRerender
 */
export function buildDeckSelect(allGames, setDeck, setVersionKeys, onRerender) {
  const selectEl = document.getElementById('deckSelect');
  if (!selectEl) return;

  // Peupler le select principal
  selectEl.innerHTML = '';
  const allOpt = document.createElement('option');
  allOpt.value       = 'all';
  allOpt.textContent = 'Tous les decks';
  selectEl.appendChild(allOpt);

  const decks = [...new Set(allGames.map(g => g.myColors))].sort();
  decks.forEach(d => {
    const opt = document.createElement('option');
    opt.value       = d;
    opt.textContent = d;
    selectEl.appendChild(opt);
  });

  // Données de versions pour le sous-filtre
  const deckVersions   = buildDecks(allGames);
  const versionsByColor = {};
  for (const dv of deckVersions) {
    (versionsByColor[dv.colors] = versionsByColor[dv.colors] || []).push(dv);
  }

  const versionSection = document.getElementById('versionSelectSection');
  const versionSelectEl = document.getElementById('versionSelect');
  const iconsEl         = document.getElementById('deckSelectIcons');

  /** Met à jour l'icône du deck sélectionné */
  const updateIcons = deck => {
    if (iconsEl) iconsEl.innerHTML = deck !== 'all' ? inkBadge(deck, 18) : '';
  };

  /** Met à jour le select de version selon le deck choisi */
  const updateVersionSelect = deck => {
    if (!versionSection || !versionSelectEl) return;
    const versions = deck !== 'all' ? (versionsByColor[deck] || []) : [];

    if (versions.length > 1) {
      versionSelectEl.innerHTML = '';
      const allVersionOpt = document.createElement('option');
      allVersionOpt.value       = 'all';
      allVersionOpt.textContent = 'Toutes les versions';
      versionSelectEl.appendChild(allVersionOpt);

      versions.forEach(v => {
        const opt = document.createElement('option');
        opt.value       = String(v.version - 1);  // index 0-based
        opt.textContent = `v${v.version} — ${v.total} partie${v.total > 1 ? 's' : ''} (${v.firstPlayed} → ${v.lastPlayed})`;
        versionSelectEl.appendChild(opt);
      });

      versionSection.hidden = false;
    } else {
      versionSection.hidden = true;
      setVersionKeys(null);
    }
  };

  // Événement : changement de deck
  selectEl.addEventListener('change', () => {
    const deck = selectEl.value;
    setDeck(deck);
    setVersionKeys(null);
    updateIcons(deck);
    updateVersionSelect(deck);
    onRerender();
  });

  // Événement : changement de version
  if (versionSelectEl) {
    versionSelectEl.addEventListener('change', () => {
      const deck       = selectEl.value;
      const versionIdx = versionSelectEl.value;
      if (versionIdx === 'all') {
        setVersionKeys(null);
      } else {
        const versions = versionsByColor[deck] || [];
        const v        = versions[parseInt(versionIdx)];
        setVersionKeys(v ? v.gameKeys : null);
      }
      onRerender();
    });
  }

  // Initialisation : masquer le select de version
  if (versionSection) versionSection.hidden = true;
}

// ── Filtre queue / file de jeu ────────────────────────────────────────────────

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

// ── Filtre période ────────────────────────────────────────────────────────────

/**
 * @param {function(string, string)} setDateRange  — store.setDateRange
 * @param {function()}               onRerender
 * @param {string|null}              initialStart  — "YYYY-MM-DD" pré-sélectionné
 */
export function buildDateFilter(setDateRange, onRerender, initialStart = null) {
  const startEl = document.getElementById('dateStart');
  const endEl   = document.getElementById('dateEnd');
  const resetEl = document.getElementById('dateResetBtn');

  // Pré-remplir la date de début par défaut
  if (initialStart) {
    startEl.value = initialStart;
    if (resetEl) resetEl.hidden = false;
  }

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
