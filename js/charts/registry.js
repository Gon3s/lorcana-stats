/**
 * registry.js — Registre Chart.js + helpers statistiques partagés (SRP)
 * - Registre centralisé des instances Chart pour éviter les fuites mémoire
 * - Helpers purs (groupBy, winRate, avg) réutilisables partout (DIP)
 */

import { CHART_GRID } from '../constants.js';

// ── Defaults Chart.js ──────────────────────────────────────────────────────

Chart.defaults.color       = '#7a7fa0';
Chart.defaults.font.family = "'Crimson Pro', Georgia, serif";
Chart.defaults.font.size   = 13;

// ── Registre d'instances ───────────────────────────────────────────────────

const _charts = {};

export function destroyChart(key) {
  if (_charts[key]) { _charts[key].destroy(); delete _charts[key]; }
}

export function registerChart(key, instance) {
  _charts[key] = instance;
  return instance;
}

export const GRID = CHART_GRID;

// ── Helpers statistiques purs ──────────────────────────────────────────────

/** Groupe un tableau par la valeur d'une propriété */
export const groupBy = (arr, key) =>
  arr.reduce((acc, item) => {
    (acc[item[key]] = acc[item[key]] || []).push(item);
    return acc;
  }, {});

/** Statistiques victoires/défaites */
export const winStats = gs => {
  const w = gs.filter(g => g.result === 'Win').length;
  const l = gs.filter(g => g.result === 'Loss').length;
  return { wins: w, losses: l, total: gs.length, rate: gs.length ? w / gs.length * 100 : 0 };
};

/** Moyenne d'un tableau de nombres */
export const avg = arr =>
  arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

/**
 * Répartit les jeux dans des tranches (bins).
 * @param {Game[]} games
 * @param {string} valueKey  - propriété à tester
 * @param {{ label: string, test: function }[]} bins
 */
export function buildBins(games, valueKey, bins) {
  const counts = Object.fromEntries(bins.map(b => [b.label, 0]));
  for (const game of games) {
    for (const bin of bins) {
      if (bin.test(game[valueKey])) { counts[bin.label]++; break; }
    }
  }
  return counts;
}
