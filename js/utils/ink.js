/**
 * ink.js — Utilitaire d'affichage des encres Lorcana
 * Convertit les noms d'encres en icônes SVG.
 */

const INK_IMG = {
  amber:    'assets/inks/amber.svg',
  amethyst: 'assets/inks/amethyst.svg',
  emerald:  'assets/inks/emerald.svg',
  ruby:     'assets/inks/ruby.svg',
  sapphire: 'assets/inks/sapphire.svg',
  steel:    'assets/inks/steel.svg',
};

/**
 * Retourne le HTML d'une ou plusieurs icônes d'encre.
 * @param {string} colorStr  ex: "Amethyst/Sapphire" ou "Ruby"
 * @param {number} [size=20] taille en px
 * @returns {string} HTML
 */
export function inkBadge(colorStr, size = 20) {
  if (!colorStr) return '';
  return colorStr
    .split('/')
    .map(c => {
      const key = c.trim().toLowerCase();
      const src = INK_IMG[key];
      if (!src) return `<span class="ink-unknown">${c.trim()}</span>`;
      return `<img src="${src}" alt="${c.trim()}" title="${c.trim()}" class="ink-icon" width="${size}" height="${size}">`;
    })
    .join('');
}

/**
 * Retourne le HTML d'une pill (filtre) avec icônes + label court.
 * @param {string} colorStr  ex: "Amethyst/Sapphire"
 * @param {number} [size=18]
 * @returns {string} HTML
 */
export function inkPillContent(colorStr, size = 18) {
  if (!colorStr || colorStr === 'all') return 'Tous';
  const icons = inkBadge(colorStr, size);
  const label = colorStr.split('/').map(c => c.trim().slice(0, 3)).join('/');
  return `${icons}<span class="ink-pill-label">${label}</span>`;
}
