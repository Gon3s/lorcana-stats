/**
 * utils/deck-builder.js — Agrégation des decks par version (SRP)
 * Partagé entre le dashboard (filtre deck) et la page Mes Decks.
 * Aucune dépendance vers l'UI.
 */

/**
 * Produit une chaîne canonique représentant une decklist.
 * Deux decklists identiques produisent la même empreinte.
 * @param {Array} decklist
 * @returns {string|null} null si la decklist est vide
 */
export function fingerprint(decklist) {
  if (!decklist || !decklist.length) return null;
  return [...decklist]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(c => `${c.count}x${c.name}`)
    .join('|');
}

/**
 * Agrège les parties par deck et détecte les versions successives.
 * Les parties doivent être triées chronologiquement.
 * @param {Game[]} games
 * @returns {DeckVersion[]}
 */
export function buildDecks(games) {
  // Regrouper par couleur
  const byColor = {};
  for (const g of games) {
    (byColor[g.myColors] = byColor[g.myColors] || []).push(g);
  }

  const allDecks = [];

  for (const [colors, colorGames] of Object.entries(byColor)) {
    const versions = [];
    let current    = null;

    for (const g of colorGames) {
      const fp = fingerprint(g.decklist);

      if (!current) {
        current = { fp, decklist: g.decklist || [], games: [g] };
      } else if (fp && fp !== current.fp) {
        versions.push(current);
        current = { fp, decklist: g.decklist, games: [g] };
      } else {
        if (fp) current.decklist = g.decklist;
        current.games.push(g);
      }
    }
    if (current) versions.push(current);

    const multiVersion = versions.length > 1;

    versions.forEach((v, idx) => {
      const wins     = v.games.filter(g => g.result === 'Win').length;
      const losses   = v.games.filter(g => g.result === 'Loss').length;
      const total    = v.games.length;
      const mmrGames = v.games.filter(g => g.mmrAfter !== null && g.mmrBefore !== null);
      const avgDelta = mmrGames.length
        ? mmrGames.reduce((s, g) => s + (g.mmrAfter - g.mmrBefore), 0) / mmrGames.length
        : 0;
      const dates    = v.games.map(g => g.date).sort();

      allDecks.push({
        colors,
        version:       multiVersion ? idx + 1 : null,
        totalVersions: multiVersion ? versions.length : 1,
        // Decklist de la version précédente — pour le diff dans la page Mes Decks
        prevDecklist:  idx > 0 ? versions[idx - 1].decklist : null,
        total, wins,
        losses,
        rate:          wins / total * 100,
        avgDelta,
        firstPlayed:   dates[0],
        lastPlayed:    dates[dates.length - 1],
        decklist:      v.decklist,
        // Ensemble des clés startedAt — pour le filtre par version dans le dashboard
        gameKeys:      new Set(v.games.map(g => g.startedAt)),
      });
    });
  }

  return allDecks.sort((a, b) => b.total - a.total);
}
