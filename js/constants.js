/**
 * constants.js — Valeurs partagées immuables
 * Centralise les clés localStorage, les couleurs de graphiques
 * et les paramètres Chart.js par défaut.
 */

export const LS_KEYS = {
  CSV:      'inkwell_csv',
  MMR_GOAL: 'inkwell_mmr_goal',
};

/** Couleurs RGBA partielles (sans l'opacité finale) */
export const C = {
  win:      'rgba(78,204,163,',
  loss:     'rgba(232,93,122,',
  gold:     'rgba(201,168,76,',
  amethyst: 'rgba(155,89,182,',
  sapphire: 'rgba(52,152,219,',
  emerald:  'rgba(46,204,113,',
  palette:  [
    'rgba(201,168,76,',
    'rgba(52,152,219,',
    'rgba(155,89,182,',
    'rgba(46,204,113,',
    'rgba(232,93,122,',
  ],
};

export const CHART_GRID = { color: 'rgba(42,47,85,.7)', lineWidth: 1 };

export const CHART_TOOLTIP = {
  backgroundColor: 'rgba(20,22,40,.95)',
  borderColor:     'rgba(201,168,76,.4)',
  borderWidth:     1,
};

// ── Paramètres métier (Q1 : magic numbers centralisés) ────────────────────

/** Fenêtre glissante pour le winrate rolling (momentum) */
export const MOMENTUM_WINDOW = 5;

/** Longueur minimale d'une série pour être affichée */
export const MIN_STREAK = 3;

/** Nombre minimum de parties pour afficher un matchup dans la matrice */
export const MIN_MATCHUP_GAMES = 3;

/** Nombre maximum de lignes affichées dans le tableau des parties */
export const TABLE_MAX_ROWS = 20;
