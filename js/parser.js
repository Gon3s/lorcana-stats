/**
 * parser.js — Parsing CSV & Decklist (SRP)
 * Responsabilité unique : transformer du texte brut en objets Game.
 * Aucune dépendance vers l'UI ou les graphiques.
 */

function parseDuration(str) {
  if (!str) return 0;
  const m = str.match(/(\d+)m/);
  return m ? parseInt(m[1]) : 0;
}

/**
 * Parse une Decklist : "4x Basil - Detective; 3x Cheshire Cat;…"
 * @returns {{ count: number, name: string }[]}
 */
function parseDecklist(str) {
  if (!str) return [];
  return str.split(';')
    .map(s => s.trim())
    .filter(Boolean)
    .map(entry => {
      const m = entry.match(/^(\d+)x\s+(.+)$/);
      return m ? { count: parseInt(m[1]), name: m[2].trim() } : null;
    })
    .filter(Boolean);
}

/**
 * Parse le CSV brut en tableau de Game objects.
 * @param {string} csvText
 * @returns {Game[]}
 * @throws {Error} si le format est invalide
 */
export function parseCSV(csvText) {
  const parsed = Papa.parse(csvText.trim(), {
    header:          true,
    skipEmptyLines:  true,
    transformHeader: h => h.trim(),
  });

  if (!parsed.data.length) throw new Error('Fichier vide ou format non reconnu.');

  const cols     = Object.keys(parsed.data[0]);
  const required = ['Result', 'My Colors', 'Opponent Colors'];
  const missing  = required.filter(c => !cols.includes(c));
  if (missing.length) throw new Error(`Colonnes manquantes : ${missing.join(', ')}. Export duels.ink attendu.`);

  const games = parsed.data.map(row => {
    const startedAt = (row['Started At'] || '').trim();
    const dt        = startedAt ? new Date(startedAt) : null;

    return {
      date:      (row['Date']           || '').trim(),
      startedAt,
      dt,
      dayOfWeek: dt ? ((dt.getUTCDay() + 6) % 7) : null, // 0=Lun … 6=Dim
      hour:      dt ? dt.getUTCHours()              : null,
      result:    (row['Result']         || '').trim(),
      opponent:  (row['Opponent']       || '').trim(),
      myLore:    parseInt(row['My Lore'])       || 0,
      oppLore:   parseInt(row['Opponent Lore']) || 0,
      turns:     parseInt(row['Turns'])         || 0,
      duration:  parseDuration(row['Duration']  || ''),
      turnOrder: (row['Turn Order']     || '').trim(),
      myColors:  (row['My Colors']      || '').trim(),
      oppColors: (row['Opponent Colors']|| '').trim(),
      mmrBefore: parseInt(row['MMR Before'])    || 0,
      mmrAfter:  parseInt(row['MMR After'])     || 0,
      decklist:  parseDecklist(row['Decklist']  || ''),
    };
  }).filter(g => g.result && g.myColors);

  games.sort((a, b) => (a.dt && b.dt ? a.dt - b.dt : 0));

  if (!games.length) throw new Error('Aucune partie valide trouvée dans le fichier.');
  return games;
}
