/**
 * app.js — Orchestrateur principal (SRP + DIP)
 * Assemble les modules via injection de dépendances.
 * Ne contient aucune logique métier : seulement le câblage.
 */

import { store }            from './store.js';
import { parseCSV }         from './parser.js';

// UI
import { showDashboard, showUploadScreen }                           from './ui/screens.js';
import { initUploadScreen, checkSavedData, showUploadError }         from './ui/upload.js';
import { buildDeckSelect, buildQueueFilter,
         buildDateFilter,
         buildSectionQueueFilter,
         buildTurnOrderFilter }                                      from './ui/filter.js';
import { updateHeader, updateMMRBadge,
         renderTable, renderStreak,
         initTablePagination }                                       from './ui/dashboard.js';

// Graphiques de base
import { renderMMRChart }                                            from './charts/mmr.js';
import { renderWinLossDonut, renderDailyChart }                      from './charts/distribution.js';
import { renderTurnOrder, renderDurationChart }                      from './charts/gameplay.js';

// Analyses avancées
import { renderMomentum }                                            from './advanced/momentum.js';
import { renderMatchupPredictor }                                    from './advanced/predictor.js';
import { renderWeekComparison }                                      from './advanced/weekly.js';
import { renderMatchupMatrix }                                       from './advanced/inkstats.js';

// Partage
import { downloadShareImage }                                         from './utils/share-image.js';

// ── État local des filtres par section ──────────────────────────────────────
// Ces sections sont indépendantes du filtre queue global.

let _mmrQueue      = 'all';
let _momentumQueue = 'all';

// ── Section MMR (indépendante du filtre queue global) ────────────────────────

function renderMMRSection() {
  const base  = store.getFilteredExceptQueue();
  if (!base.length) return;
  const games = _mmrQueue === 'all' ? base : base.filter(g => g.queue === _mmrQueue);
  if (!games.length) return;
  renderMMRChart(games);
  updateMMRBadge(games);
}

// ── Section Momentum (indépendante du filtre queue global) ───────────────────

function renderMomentumSection() {
  const base  = store.getFilteredExceptQueue();
  if (!base.length) return;
  const games = _momentumQueue === 'all' ? base : base.filter(g => g.queue === _momentumQueue);
  renderMomentum(games);
}

// ── Rendu filtré (déclenché à chaque changement de filtre et au chargement) ──

function renderFiltered(games) {
  if (!games.length) return;

  // En-tête & KPIs
  updateHeader(games);

  // Graphiques principaux
  renderWinLossDonut(games);
  renderDailyChart(games);
  renderTurnOrder(games);
  renderDurationChart(games);

  // Récence
  renderStreak(games);
  renderTable(games);

  // Analyses dépendantes du filtre
  renderMatchupPredictor(games, store.activeDeck);

  // Sections globales : répondent au filtre pour rester cohérentes
  renderMatchupMatrix(games, 'matchupMatrix');
  renderWeekComparison(games);
}

// ── Callback de re-rendu (déclenché par tout changement de filtre) ──────────

function onRerender() {
  const games = store.getFiltered();
  renderFiltered(games);
  // MMR et Momentum s'actualisent sur leur propre base (sans queue globale)
  renderMMRSection();
  renderMomentumSection();
}

// ── Rapport de parsing (lignes ignorées + avertissements) ──────────────────

function showParseReport(ignored, warnings) {
  const el = document.getElementById('parseReport');
  if (!el) return;

  const total = ignored.invalidResult + ignored.missingColors + ignored.duplicates;

  if (!total && !warnings.length) {
    el.style.display = 'none';
    return;
  }

  const parts = [];
  if (ignored.invalidResult > 0)
    parts.push(`${ignored.invalidResult} résultat${ignored.invalidResult > 1 ? 's' : ''} invalide${ignored.invalidResult > 1 ? 's' : ''}`);
  if (ignored.missingColors > 0)
    parts.push(`${ignored.missingColors} couleur${ignored.missingColors > 1 ? 's' : ''} manquante${ignored.missingColors > 1 ? 's' : ''}`);
  if (ignored.duplicates > 0)
    parts.push(`${ignored.duplicates} doublon${ignored.duplicates > 1 ? 's' : ''}`);

  const segments = [];
  if (total > 0)
    segments.push(`${total} ligne${total > 1 ? 's' : ''} ignorée${total > 1 ? 's' : ''} à l'import (${parts.join(', ')})`);
  if (warnings.length)
    segments.push(...warnings);

  document.getElementById('parseReportText').textContent = segments.join(' · ');
  el.style.display = 'flex';

  document.getElementById('parseReportClose').onclick = () => { el.style.display = 'none'; };
}

// ── Callbacks ──────────────────────────────────────────────────────────────

function onCSV(csvText) {
  try {
    // B4 : parseCSV retourne { games, warnings, ignored }
    const { games, warnings, ignored } = parseCSV(csvText);
    store.setGames(games);
    showDashboard();

    const allGames = store.allGames;
    buildDeckSelect(allGames, store.setActiveDeck.bind(store), store.setActiveVersionKeys.bind(store), onRerender);
    buildQueueFilter(allGames, store.setActiveQueue.bind(store), onRerender);
    buildTurnOrderFilter(store.setActiveTurnOrder.bind(store), onRerender);
    buildDateFilter(store.setDateRange.bind(store), onRerender);

    // Filtres queue locaux aux sections MMR et Momentum
    const queues = [...new Set(allGames.map(g => g.queue).filter(Boolean))].sort();

    // Premier filtre sélectionné par défaut (pas de "Toutes")
    _mmrQueue = queues.length > 1 ? queues[0] : 'all';
    buildSectionQueueFilter('mmrQueuePills', 'mmrQueueSection', queues, q => {
      _mmrQueue = q;
      renderMMRSection();
    });

    _momentumQueue = queues.length > 1 ? queues[0] : 'all';
    buildSectionQueueFilter('momentumQueuePills', 'momentumQueueSection', queues, q => {
      _momentumQueue = q;
      renderMomentumSection();
    });

    const filtered = store.getFiltered();
    renderFiltered(filtered);   // rendu initial : toutes les sections
    renderMMRSection();         // rendu initial MMR
    renderMomentumSection();    // rendu initial Momentum

    // Rapport de parsing : lignes ignorées + avertissements (dans le dashboard)
    showParseReport(ignored, warnings);
  } catch (err) {
    showUploadScreen();
    showUploadError(err.message);
  }
}

function goToUpload() {
  document.getElementById('fileInput').value = '';
  showUploadScreen();
  checkSavedData();
}

// ── Initialisation ─────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initUploadScreen(onCSV, goToUpload);
  initTablePagination();
  checkSavedData();

  document.getElementById('shareBtn').addEventListener('click', () => {
    downloadShareImage(store.getFiltered(), store.activeDeck);
  });
});
