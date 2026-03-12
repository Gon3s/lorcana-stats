/**
 * store.js — Gestion d'état centralisée (SRP)
 * Unique source de vérité pour allGames et tous les filtres actifs.
 * Aucune logique métier ici, seulement l'état.
 */

export const store = {
  _allGames:     [],
  _activeDeck:   'all',
  _activeFormat: 'all',
  _activeQueue:  'all',  // F5 : filtre par file de jeu
  _dateStart:    null,   // chaîne "YYYY-MM-DD" ou null
  _dateEnd:      null,   // chaîne "YYYY-MM-DD" ou null

  get allGames()   { return this._allGames; },
  get activeDeck() { return this._activeDeck; },

  setGames(games) {
    this._allGames     = games;
    this._activeDeck   = 'all';
    this._activeFormat = 'all';
    this._activeQueue  = 'all';
    this._dateStart    = null;
    this._dateEnd      = null;
  },

  setActiveDeck(deck)      { this._activeDeck   = deck; },
  setActiveFormat(format)  { this._activeFormat = format; },
  setActiveQueue(queue)    { this._activeQueue  = queue; },  // F5
  setDateRange(start, end) {
    this._dateStart = start || null;
    this._dateEnd   = end   || null;
  },

  getFiltered() {
    return this._allGames
      .filter(g => this._activeDeck   === 'all' || g.myColors    === this._activeDeck)
      .filter(g => this._activeFormat === 'all' || g.matchFormat === this._activeFormat)
      .filter(g => this._activeQueue  === 'all' || g.queue       === this._activeQueue)  // F5
      .filter(g => !this._dateStart || g.date >= this._dateStart)
      .filter(g => !this._dateEnd   || g.date <= this._dateEnd);
  },
};
