/**
 * filter.js — Barre de filtres par deck (SRP)
 * Responsabilité unique : construire les pills et notifier les changements.
 */

function updateFilterCount(n) {
  document.getElementById('filterCount').innerHTML =
    `<span>${n}</span> partie${n > 1 ? 's' : ''}`;
}

function createPill(label, value, isActive, allGames, onFilter) {
  const btn = document.createElement('button');
  btn.className    = 'filter-pill' + (isActive ? ' active' : '');
  btn.textContent  = label;
  btn.dataset.value = value;

  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-pill')
      .forEach(p => p.classList.toggle('active', p.dataset.value === value));

    const filtered = value === 'all'
      ? allGames
      : allGames.filter(g => g.myColors === value);

    updateFilterCount(filtered.length);
    onFilter(filtered, value);
  });

  return btn;
}

/**
 * @param {Game[]}                           allGames
 * @param {function(Game[], string): void}   onFilter
 */
export function buildFilterBar(allGames, onFilter) {
  const decks   = [...new Set(allGames.map(g => g.myColors))].sort();
  const pillsEl = document.getElementById('filterPills');
  pillsEl.innerHTML = '';

  pillsEl.appendChild(createPill('Tous', 'all', true, allGames, onFilter));
  decks.forEach(d => pillsEl.appendChild(createPill(d, d, false, allGames, onFilter)));

  updateFilterCount(allGames.length);
}
