/**
 * store.js — Gestion d'état centralisée (SRP)
 * Unique source de vérité pour allGames et activeDeck.
 * Aucune logique métier ici, seulement l'état.
 */

export const store = {
  _allGames:   [],
  _activeDeck: 'all',

  get allGames()   { return this._allGames; },
  get activeDeck() { return this._activeDeck; },

  setGames(games) {
    this._allGames   = games;
    this._activeDeck = 'all';
  },

  setActiveDeck(deck) {
    this._activeDeck = deck;
  },

  getFiltered() {
    return this._activeDeck === 'all'
      ? this._allGames
      : this._allGames.filter(g => g.myColors === this._activeDeck);
  },
};
