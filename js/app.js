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
import { buildFilterBar, buildFormatFilter, buildQueueFilter,
         buildDateFilter, updateFilterCount,
         buildSectionQueueFilter }                                   from './ui/filter.js';
import { updateHeader, updateMMRBadge,
         renderTable, renderStreak }                                 from './ui/dashboard.js';

// Graphiques de base
import { renderMMRChart }                                            from './charts/mmr.js';
import { renderWinLossDonut, renderDailyChart, renderDeckBars }      from './charts/distribution.js';
import { renderTurnOrder, renderDurationChart }                      from './charts/gameplay.js';

// Analyses avancées
import { renderMomentum }                                            from './advanced/momentum.js';
import { renderMatchupPredictor }                                    from './advanced/predictor.js';
import { renderWeekComparison, renderBestWorstDeck }                 from './advanced/weekly.js';
import { renderInkWinrates, renderMatchupMatrix }                    from './advanced/inkstats.js';
import { renderMmrDelta }                                            from './advanced/mmrdelta.js';

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

// ── P1 : rendu global (données indépendantes du filtre) ─────────────────────
// Appelé une seule fois au chargement du CSV.

function renderGlobal(allGames) {
  renderInkWinrates(allGames, 'inkWinrates');
  renderMatchupMatrix(allGames, 'matchupMatrix');
  renderWeekComparison(allGames);
  renderBestWorstDeck(allGames);
  renderMmrDelta(allGames, 'mmrDeltaBars');  // N7
}

// ── P1 : rendu filtré (déclenché à chaque changement de filtre) ─────────────

function renderFiltered(games) {
  if (!games.length) return;

  // En-tête & KPIs
  updateHeader(games);

  // Graphiques principaux
  renderWinLossDonut(games);
  renderDailyChart(games);
  renderDeckBars(games, 'myColors',  'myDeckBars');
  renderDeckBars(games, 'oppColors', 'oppDeckBars', 2);
  renderTurnOrder(games);
  renderDurationChart(games);

  // Récence
  renderStreak(games);
  renderTable(games);

  // Analyses dépendantes du filtre
  renderMatchupPredictor(games, store.activeDeck);
}

// ── Callback de re-rendu (déclenché par tout changement de filtre) ──────────

function onRerender() {
  const games = store.getFiltered();
  updateFilterCount(games.length);
  renderFiltered(games);
  // MMR et Momentum s'actualisent sur leur propre base (sans queue globale)
  renderMMRSection();
  renderMomentumSection();
}

// ── Callbacks ──────────────────────────────────────────────────────────────

function onCSV(csvText) {
  try {
    // B4 : parseCSV retourne { games, warnings }
    const { games, warnings } = parseCSV(csvText);
    store.setGames(games);
    showDashboard();

    const allGames = store.allGames;

    // Filtres globaux
    buildFilterBar(allGames, store.setActiveDeck.bind(store), onRerender);
    buildFormatFilter(allGames, store.setActiveFormat.bind(store), onRerender);
    buildQueueFilter(allGames, store.setActiveQueue.bind(store), onRerender);  // F5
    buildDateFilter(store.setDateRange.bind(store), onRerender);

    // Filtres queue locaux aux sections MMR et Momentum
    const queues = [...new Set(allGames.map(g => g.queue).filter(Boolean))].sort();

    _mmrQueue = 'all';
    buildSectionQueueFilter('mmrQueuePills', 'mmrQueueSection', queues, q => {
      _mmrQueue = q;
      renderMMRSection();
    });

    _momentumQueue = 'all';
    buildSectionQueueFilter('momentumQueuePills', 'momentumQueueSection', queues, q => {
      _momentumQueue = q;
      renderMomentumSection();
    });

    updateFilterCount(allGames.length);
    renderGlobal(allGames);   // P1 : sections indépendantes du filtre
    renderFiltered(allGames); // P1 : sections filtrables
    renderMMRSection();       // rendu initial MMR
    renderMomentumSection();  // rendu initial Momentum

    // B4 : affichage des avertissements de parsing (non bloquants)
    if (warnings.length) showUploadError(warnings.join(' · '));
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
  checkSavedData();
});
