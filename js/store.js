/**
 * store.js — Gestion d'état centralisée (SRP)
 * Unique source de vérité pour allGames et tous les filtres actifs.
 * Aucune logique métier ici, seulement l'état.
 */

export const store = {
  _allGames:          [],
  _activeDeck:        'all',
  _activeQueue:       'all',
  _activeVersionKeys: null,   // Set<string> de startedAt, ou null = toutes les versions
  _dateStart:         null,   // chaîne "YYYY-MM-DD" ou null
  _dateEnd:           null,   // chaîne "YYYY-MM-DD" ou null

  get allGames()   { return this._allGames; },
  get activeDeck() { return this._activeDeck; },

  setGames(games) {
    this._allGames          = games;
    this._activeDeck        = 'all';
    this._activeQueue       = 'all';
    this._activeVersionKeys = null;
    this._dateStart         = null;
    this._dateEnd           = null;
  },

  setActiveDeck(deck) {
    this._activeDeck        = deck;
    this._activeVersionKeys = null;  // réinitialiser la version au changement de deck
  },
  setActiveQueue(queue)      { this._activeQueue       = queue; },
  setActiveVersionKeys(keys) { this._activeVersionKeys = keys || null; },
  setDateRange(start, end) {
    this._dateStart = start || null;
    this._dateEnd   = end   || null;
  },

  getFiltered() {
    return this._allGames
      .filter(g => this._activeDeck         === 'all' || g.myColors === this._activeDeck)
      .filter(g => !this._activeVersionKeys || this._activeVersionKeys.has(g.startedAt))
      .filter(g => this._activeQueue        === 'all' || g.queue    === this._activeQueue)
      .filter(g => !this._dateStart || g.date >= this._dateStart)
      .filter(g => !this._dateEnd   || g.date <= this._dateEnd);
  },
};
