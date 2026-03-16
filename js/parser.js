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

/** Borne une valeur numérique dans un intervalle [min, max] */
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/**
 * Parse une valeur MMR : retourne null si manquante ou invalide,
 * sinon la valeur bornée entre 0 et 9999.
 */
function parseMMR(str) {
  const v = parseInt(str);
  return isNaN(v) ? null : clamp(v, 0, 9999);
}

/**
 * Parse le CSV brut en tableau de Game objects + avertissements.
 * @param {string} csvText
 * @returns {{ games: Game[], warnings: string[] }}
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

  const warnings = [];
  let decklisFailCount = 0;

  // B1 : déduplication — clé composite startedAt + opponent + result
  const seen = new Set();

  const games = parsed.data.map(row => {
    const startedAt = (row['Started At'] || '').trim();
    const dt        = startedAt ? new Date(startedAt) : null;

    // B4 : détection des decklists non parsées
    const rawDecklist = (row['Decklist'] || '').trim();
    const decklist    = parseDecklist(rawDecklist);
    if (rawDecklist && !decklist.length) decklisFailCount++;

    return {
      date:        (row['Date']           || '').trim(),
      startedAt,
      dt,
      // B3 : heure et jour en temps local (plus getUTCHours/getUTCDay)
      dayOfWeek:   dt ? ((dt.getDay() + 6) % 7) : null, // 0=Lun … 6=Dim
      hour:        dt ? dt.getHours()             : null,
      result:      (row['Result']         || '').trim(),
      opponent:    (row['Opponent']       || '').trim(),
      // Q2 : validation des valeurs numériques
      myLore:      clamp(parseInt(row['My Lore'])       || 0, 0, 20),
      oppLore:     clamp(parseInt(row['Opponent Lore']) || 0, 0, 20),
      turns:       Math.max(0, parseInt(row['Turns'])   || 0),
      duration:    Math.max(0, parseDuration(row['Duration'] || '')),
      turnOrder:   (row['Turn Order']     || '').trim(),
      myColors:    (row['My Colors']      || '').trim(),
      oppColors:   (row['Opponent Colors']|| '').trim(),
      mmrBefore:   parseMMR(row['MMR Before']),
      mmrAfter:    parseMMR(row['MMR After']),
      matchFormat: (row['Match Format']   || '').trim(),
      // F5 : extraction de la file de jeu
      queue:       (row['Queue']          || '').trim(),
      decklist,
    };
  }).filter(g => {
    if ((g.result !== 'Win' && g.result !== 'Loss') || !g.myColors) return false;
    // B1 : élimination des doublons
    const key = `${g.startedAt}|${g.opponent}|${g.result}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  games.sort((a, b) => (a.dt && b.dt ? a.dt - b.dt : 0));

  if (!games.length) throw new Error('Aucune partie valide trouvée dans le fichier.');

  // B4 : avertissement decklist
  if (decklisFailCount > 0) {
    warnings.push(
      `${decklisFailCount} decklist(s) n'ont pas pu être parsées (format inattendu).`
    );
  }

  return { games, warnings };
}
