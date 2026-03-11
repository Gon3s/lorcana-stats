/**
 * advanced/heatmap.js — Heatmap heure × jour (SRP)
 * Calcul de la grille et rendu HTML pur (pas de Chart.js).
 */

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const HOUR_SLOTS = ['0-3h', '4-7h', '8-11h', '12-15h', '16-19h', '20-23h'];

function hourToSlot(h) { return Math.floor(h / 4); }

/** Calcule la couleur HSL d'une cellule selon son winrate (0-100). */
function cellStyle(rate) {
  const hue = rate >= 50 ? 130 + (rate - 50) * 0.4 : rate * 0.3;
  const sat  = 60 + rate * 0.2;
  return {
    bg:     `hsla(${hue.toFixed(0)}, ${sat.toFixed(0)}%, 35%, 0.75)`,
    border: `hsla(${hue.toFixed(0)}, ${sat.toFixed(0)}%, 50%, 0.5)`,
  };
}

/** Construit la matrice 7 jours × 6 créneaux horaires. */
function buildMatrix(games) {
  const matrix = Array.from({ length: 7 }, () =>
    Array.from({ length: 6 }, () => ({ wins: 0, total: 0 })));

  for (const g of games) {
    if (g.dayOfWeek === null || g.hour === null) continue;
    const slot = hourToSlot(g.hour);
    matrix[g.dayOfWeek][slot].total++;
    if (g.result === 'Win') matrix[g.dayOfWeek][slot].wins++;
  }
  return matrix;
}

function renderHeaderRow() {
  return `<div class="hm-corner"></div>` +
    HOUR_SLOTS.map(h => `<div class="hm-header">${h}</div>`).join('');
}

function renderCell(cell, day, slotLabel) {
  if (cell.total === 0) return `<div class="hm-cell hm-empty" title="Aucune partie">—</div>`;

  const rate         = cell.wins / cell.total * 100;
  const { bg, border } = cellStyle(rate);
  const label        = `${day} ${slotLabel} · ${cell.total} parties · ${rate.toFixed(0)}% WR`;

  return `<div class="hm-cell" style="background:${bg};border-color:${border}" title="${label}">
    <span class="hm-pct">${rate.toFixed(0)}%</span>
    <span class="hm-games">${cell.total}</span>
  </div>`;
}

export function renderHeatmap(games) {
  const matrix = buildMatrix(games);

  const dataRows = DAY_LABELS.map((day, d) =>
    `<div class="hm-day">${day}</div>` +
    HOUR_SLOTS.map((slot, s) => renderCell(matrix[d][s], day, slot)).join('')
  ).join('');

  document.getElementById('heatmapGrid').innerHTML = renderHeaderRow() + dataRows;
}
