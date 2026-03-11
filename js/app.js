/**
 * app.js — Orchestrateur principal (SRP + DIP)
 * Assemble les modules via injection de dépendances.
 * Ne contient aucune logique métier : seulement le câblage.
 */

import { store }            from './store.js';
import { parseCSV }         from './parser.js';

// UI
import { showDashboard, showUploadScreen }                     from './ui/screens.js';
import { initUploadScreen, checkSavedData, showUploadError }   from './ui/upload.js';
import { buildFilterBar }                                       from './ui/filter.js';
import { updateHeader, renderTable, renderStreak }             from './ui/dashboard.js';

// Graphiques de base
import { renderMMRChart }                                       from './charts/mmr.js';
import { renderWinLossDonut, renderDailyChart, renderDeckBars } from './charts/distribution.js';
import { renderTurnOrder, renderDurationChart }                 from './charts/gameplay.js';

// Analyses avancées
import { renderMomentum }                                       from './advanced/momentum.js';
import { renderMatchupPredictor }                               from './advanced/predictor.js';
import { renderWeekComparison, renderBestWorstDeck }            from './advanced/weekly.js';
import { renderInkWinrates, renderMatchupMatrix }               from './advanced/inkstats.js';

// ── Rendu complet du dashboard ─────────────────────────────────────────────

function renderAll(games) {
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

  // Analyses avancées (données filtrées)
  renderMomentum(games);
  renderMatchupPredictor(games, store.activeDeck);

  // Stats encres — toujours sur toutes les données
  renderInkWinrates(store.allGames, 'inkWinrates');
  renderMatchupMatrix(store.allGames, 'matchupMatrix');

  // Toujours sur l'ensemble des données (indépendant du filtre deck)
  renderWeekComparison(store.allGames);
  renderBestWorstDeck(store.allGames);
}

// ── Callbacks ──────────────────────────────────────────────────────────────

function onCSV(csvText) {
  try {
    const games = parseCSV(csvText);
    store.setGames(games);
    showDashboard();
    buildFilterBar(store.allGames, (filtered, deck) => {
      store.setActiveDeck(deck);
      renderAll(filtered);
    });
    renderAll(store.allGames);
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
