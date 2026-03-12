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
         buildDateFilter, updateFilterCount }                        from './ui/filter.js';
import { updateHeader, renderTable, renderStreak }                   from './ui/dashboard.js';

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
  renderMMRChart(games);
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
  renderMomentum(games);
  renderMatchupPredictor(games, store.activeDeck);
}

// ── Callback de re-rendu (déclenché par tout changement de filtre) ──────────

function onRerender() {
  const games = store.getFiltered();
  updateFilterCount(games.length);
  renderFiltered(games);
}

// ── Callbacks ──────────────────────────────────────────────────────────────

function onCSV(csvText) {
  try {
    // B4 : parseCSV retourne { games, warnings }
    const { games, warnings } = parseCSV(csvText);
    store.setGames(games);
    showDashboard();

    const allGames = store.allGames;
    buildFilterBar(allGames, store.setActiveDeck.bind(store), onRerender);
    buildFormatFilter(allGames, store.setActiveFormat.bind(store), onRerender);
    buildQueueFilter(allGames, store.setActiveQueue.bind(store), onRerender);  // F5
    buildDateFilter(store.setDateRange.bind(store), onRerender);

    updateFilterCount(allGames.length);
    renderGlobal(allGames);   // P1 : sections indépendantes du filtre
    renderFiltered(allGames); // P1 : sections filtrables

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
