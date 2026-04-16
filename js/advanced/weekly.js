/**
 * advanced/weekly.js — Comparaison hebdomadaire (SRP)
 * getISOWeek et weekStats sont des fonctions pures.
 */

// ── Helpers ────────────────────────────────────────────────────────────────

function getISOWeek(dateStr) {
  const d   = new Date(dateStr);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return `${d.getUTCFullYear()}-W${String(
    Math.ceil(((d - yearStart) / 86_400_000 + 1) / 7)
  ).padStart(2, '0')}`;
}

function weekStats(games) {
  if (!games.length) return null;
  const wins   = games.filter(g => g.result === 'Win').length;
  const losses = games.filter(g => g.result === 'Loss').length;
  const total  = games.length;
  return {
    total, wins, losses,
    rate:     wins / total * 100,
    mmrDelta: (games[total - 1].mmrAfter ?? 0) - (games[0].mmrBefore ?? 0),
    avgDur:   games.reduce((s, g) => s + g.duration, 0) / total,
  };
}

/** Génère un span coloré montrant le delta entre deux valeurs. */
function deltaSpan(curr, prev, fmt = v => (v >= 0 ? '+' : '') + v.toFixed(1)) {
  const d = curr - prev;
  return `<span class="delta ${d >= 0 ? 'positive' : 'negative'}">${fmt(d)}</span>`;
}

// ── Comparaison hebdomadaire ───────────────────────────────────────────────

export function renderWeekComparison(allGames) {
  const byWeek = {};
  for (const g of allGames) {
    const wk = getISOWeek(g.date);
    (byWeek[wk] = byWeek[wk] || []).push(g);
  }

  const weeks   = Object.keys(byWeek).sort();
  const lastTwo = weeks.slice(-2);
  const el      = document.getElementById('weekCompContent');

  if (lastTwo.length < 2) {
    el.innerHTML = '<p class="empty-msg">Pas assez de données (au moins 2 semaines).</p>';
    return;
  }

  const [prevWk, currWk] = lastTwo;
  const prev = weekStats(byWeek[prevWk]);
  const curr = weekStats(byWeek[currWk]);
  const fmtInt = v => (v >= 0 ? '+' : '') + Math.round(v);

  el.innerHTML = `
    <div class="week-comp-grid">
      <div class="week-col">
        <div class="week-label">Semaine précédente<br><span>${prevWk}</span></div>
        <div class="week-stat"><span>${prev.total}</span> parties</div>
        <div class="week-stat"><span class="text-win">${prev.wins}</span> victoires</div>
        <div class="week-stat"><span class="text-loss">${prev.losses}</span> défaites</div>
        <div class="week-stat"><span>${prev.rate.toFixed(1)}%</span> winrate</div>
        <div class="week-stat"><span class="${prev.mmrDelta >= 0 ? 'text-win' : 'text-loss'}">${prev.mmrDelta >= 0 ? '+' : ''}${prev.mmrDelta}</span> MMR</div>
        <div class="week-stat"><span>${prev.avgDur.toFixed(1)}m</span> durée moy.</div>
      </div>
      <div class="week-divider">⟷</div>
      <div class="week-col week-col-current">
        <div class="week-label">Cette semaine<br><span>${currWk}</span></div>
        <div class="week-stat"><span>${curr.total}</span> parties ${deltaSpan(curr.total, prev.total, fmtInt)}</div>
        <div class="week-stat"><span class="text-win">${curr.wins}</span> victoires</div>
        <div class="week-stat"><span class="text-loss">${curr.losses}</span> défaites</div>
        <div class="week-stat"><span>${curr.rate.toFixed(1)}%</span> winrate ${deltaSpan(curr.rate, prev.rate)}</div>
        <div class="week-stat"><span class="${curr.mmrDelta >= 0 ? 'text-win' : 'text-loss'}">${curr.mmrDelta >= 0 ? '+' : ''}${curr.mmrDelta}</span> MMR ${deltaSpan(curr.mmrDelta, prev.mmrDelta, fmtInt)}</div>
        <div class="week-stat"><span>${curr.avgDur.toFixed(1)}m</span> durée moy. ${deltaSpan(curr.avgDur, prev.avgDur)}</div>
      </div>
    </div>`;
}

