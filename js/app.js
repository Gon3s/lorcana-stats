/* ═══════════════════════════════════════
   app.js — Orchestrateur principal
   ═══════════════════════════════════════ */

let allGames   = [];
let activeDeck = 'all';

document.addEventListener('DOMContentLoaded', () => {
  initUploadScreen(onCSV);
  checkSavedData();
});

function onCSV(csvText) {
  try {
    allGames   = parseCSV(csvText);
    activeDeck = 'all';
    showDashboard();
    buildFilterBar(allGames, onFilter);
    renderAll(allGames);
  } catch (err) {
    showUploadScreen();
    showUploadError(err.message);
  }
}

function onFilter(filtered, deckValue) {
  activeDeck = deckValue;
  renderAll(filtered);
}

function renderAll(games) {
  if (!games.length) return;

  updateHeader(games);

  // Base charts
  renderMMRChart(games);
  renderWinLossDonut(games);
  renderDailyChart(games);
  renderDeckBars(games, 'myColors',  'myDeckBars');
  renderDeckBars(games, 'oppColors', 'oppDeckBars', 2);
  renderTurnOrder(games);
  renderDurationChart(games);
  renderLoreChart(games);
  renderScatter(games);
  renderTurnsChart(games);
  renderMMRByDeck(games);

  // Récence
  renderStreak(games);
  renderTable(games);

  // Advanced
  renderCardAnalysis(games);
  renderHeatmap(games);
  renderMomentum(games);
  renderMatchupPredictor(games, activeDeck);
  renderMMRGoals(games);

  // Always use allGames (not filtered by deck)
  renderWeekComparison(allGames);
  renderBestWorstDeck(allGames);
}
