/* ═══════════════════════════════════════
   advanced.js — Analyses avancées
   ═══════════════════════════════════════ */

// ══════════════════════════════════════════
// A — Taux de victoire par carte clé
// ══════════════════════════════════════════
function renderCardAnalysis(games) {
  // Only games with a decklist
  const withDecklist = games.filter(g => g.decklist && g.decklist.length > 0);
  if (!withDecklist.length) {
    document.getElementById('cardAnalysisContent').innerHTML =
      '<p style="color:var(--muted);font-style:italic;text-align:center;padding:24px 0">Aucune Decklist trouvée dans ce CSV.</p>';
    return;
  }

  // Build card stats: for each card, collect all games where it appeared
  const cardMap = {};
  withDecklist.forEach(g => {
    const seen = new Set();
    g.decklist.forEach(({ name }) => {
      if (seen.has(name)) return;
      seen.add(name);
      if (!cardMap[name]) cardMap[name] = [];
      cardMap[name].push(g);
    });
  });

  // Sort by games played desc, take top 20
  const sorted = Object.entries(cardMap)
    .map(([name, gs]) => {
      const wins = gs.filter(g => g.result === 'Win').length;
      return { name, total: gs.length, wins, rate: gs.length ? wins / gs.length * 100 : 0 };
    })
    .filter(c => c.total >= 3)
    .sort((a, b) => b.total - a.total)
    .slice(0, 20);

  if (!sorted.length) {
    document.getElementById('cardAnalysisContent').innerHTML =
      '<p style="color:var(--muted);font-style:italic;text-align:center;padding:24px 0">Pas assez de données (≥ 3 parties par carte).</p>';
    return;
  }

  destroyChart('cards');
  const colors = sorted.map(c => c.rate >= 60 ? 'rgba(78,204,163,.8)' : c.rate >= 45 ? 'rgba(201,168,76,.8)' : 'rgba(232,93,122,.8)');

  charts.cards = new Chart(document.getElementById('cardChart'), {
    type: 'bar',
    indexAxis: 'y',
    data: {
      labels: sorted.map(c => c.name.length > 30 ? c.name.slice(0, 28) + '…' : c.name),
      datasets: [{
        data: sorted.map(c => c.rate.toFixed(1)),
        backgroundColor: colors,
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: {
        label: ctx => {
          const c = sorted[ctx.dataIndex];
          return ` ${c.rate.toFixed(1)}% winrate · ${c.wins}V / ${c.total - c.wins}D · ${c.total} parties`;
        }
      }}},
      scales: {
        x: { grid: GRID, min: 0, max: 100, ticks: { callback: v => v + '%' } },
        y: { grid: { display: false }, ticks: { font: { size: 11 } } }
      }
    }
  });
}

// ══════════════════════════════════════════
// B — Heatmap heure/jour (CSS grid)
// ══════════════════════════════════════════
const DAY_LABELS  = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const HOUR_SLOTS  = ['0-3h', '4-7h', '8-11h', '12-15h', '16-19h', '20-23h'];

function hourToSlot(h) { return Math.floor(h / 4); }

function renderHeatmap(games) {
  const withTime = games.filter(g => g.dayOfWeek !== null && g.hour !== null);

  // Build 7×6 grid: wins, total
  const grid = Array.from({ length: 7 }, () => Array.from({ length: 6 }, () => ({ wins: 0, total: 0 })));
  withTime.forEach(g => {
    const slot = hourToSlot(g.hour);
    grid[g.dayOfWeek][slot].total++;
    if (g.result === 'Win') grid[g.dayOfWeek][slot].wins++;
  });

  const container = document.getElementById('heatmapGrid');
  container.innerHTML = '';

  // Header row: hour labels
  container.innerHTML += `<div class="hm-corner"></div>` +
    HOUR_SLOTS.map(h => `<div class="hm-header">${h}</div>`).join('');

  // Data rows
  DAY_LABELS.forEach((day, d) => {
    container.innerHTML += `<div class="hm-day">${day}</div>`;
    HOUR_SLOTS.forEach((_, s) => {
      const cell = grid[d][s];
      if (cell.total === 0) {
        container.innerHTML += `<div class="hm-cell hm-empty" title="Aucune partie">—</div>`;
        return;
      }
      const rate   = cell.wins / cell.total * 100;
      const label  = `${day} ${HOUR_SLOTS[s]} · ${cell.total} parties · ${rate.toFixed(0)}% WR`;
      // Color: red=0%, gold=50%, green=100%
      const hue    = rate >= 50 ? 130 + (rate - 50) * 0.4 : rate * 0.3;
      const sat    = 60 + rate * 0.2;
      const bg     = `hsla(${hue.toFixed(0)}, ${sat.toFixed(0)}%, 35%, 0.75)`;
      const border = `hsla(${hue.toFixed(0)}, ${sat.toFixed(0)}%, 50%, 0.5)`;
      container.innerHTML += `<div class="hm-cell" style="background:${bg};border-color:${border}" title="${label}">
        <span class="hm-pct">${rate.toFixed(0)}%</span>
        <span class="hm-games">${cell.total}</span>
      </div>`;
    });
  });
}

// ══════════════════════════════════════════
// C — Graphe de momentum (rolling 5-game WR)
// ══════════════════════════════════════════
function renderMomentum(games) {
  destroyChart('momentum');
  if (games.length < 5) {
    document.getElementById('momentumChart').parentElement.innerHTML =
      '<p style="color:var(--muted);font-style:italic;padding:24px 0;text-align:center">Pas assez de parties (min. 5).</p>';
    return;
  }

  const WINDOW = 5;
  const rolling = games.map((_, i) => {
    if (i < WINDOW - 1) return null;
    const slice = games.slice(i - WINDOW + 1, i + 1);
    return slice.filter(g => g.result === 'Win').length / WINDOW * 100;
  }).filter(v => v !== null);

  const labels = games.slice(WINDOW - 1).map((g, i) => `#${i + WINDOW} · ${g.date.slice(5)}`);

  // Detect streaks for annotation
  const streaks = [];
  let cur = { type: games[0].result, start: 0, len: 1 };
  for (let i = 1; i < games.length; i++) {
    if (games[i].result === cur.type) { cur.len++; }
    else {
      if (cur.len >= 3) streaks.push({ ...cur, end: i - 1 });
      cur = { type: games[i].result, start: i, len: 1 };
    }
  }
  if (cur.len >= 3) streaks.push({ ...cur, end: games.length - 1 });

  charts.momentum = new Chart(document.getElementById('momentumChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: `Winrate glissant (${WINDOW} parties)`,
        data: rolling,
        borderColor: ctx => {
          const g = ctx.chart.ctx.createLinearGradient(0, 0, ctx.chart.width, 0);
          g.addColorStop(0, 'rgba(155,89,182,.9)');
          g.addColorStop(1, 'rgba(52,152,219,.9)');
          return g;
        },
        borderWidth: 2.5,
        backgroundColor: ctx => {
          const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 200);
          g.addColorStop(0, 'rgba(155,89,182,.15)');
          g.addColorStop(1, 'rgba(155,89,182,0)');
          return g;
        },
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 6,
        tension: .4,
        pointBackgroundColor: rolling.map(v => v >= 60 ? 'rgba(78,204,163,.9)' : v >= 40 ? 'rgba(201,168,76,.9)' : 'rgba(232,93,122,.9)'),
      }, {
        // 50% reference line
        label: '50%',
        data: Array(rolling.length).fill(50),
        borderColor: 'rgba(201,168,76,.25)',
        borderWidth: 1,
        borderDash: [6, 4],
        pointRadius: 0,
        fill: false,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(20,22,40,.95)',
          borderColor: 'rgba(155,89,182,.4)', borderWidth: 1,
          callbacks: {
            label: ctx => ctx.datasetIndex === 0 ?
              ` Winrate glissant: ${ctx.parsed.y.toFixed(1)}%` : null
          }
        }
      },
      scales: {
        x: { grid: GRID, ticks: { maxTicksLimit: 12, maxRotation: 45 } },
        y: { grid: GRID, min: 0, max: 100, ticks: { callback: v => v + '%' } }
      }
    }
  });

  // Show longest streaks
  const bestWin  = streaks.filter(s => s.type === 'Win').sort((a,b)=>b.len-a.len)[0];
  const bestLoss = streaks.filter(s => s.type === 'Loss').sort((a,b)=>b.len-a.len)[0];
  const streakInfo = document.getElementById('momentumStreaks');
  streakInfo.innerHTML = [
    bestWin  ? `<span class="streak-badge win">🔥 Meilleure série: ${bestWin.len} victoires consécutives</span>` : '',
    bestLoss ? `<span class="streak-badge loss">💀 Pire série: ${bestLoss.len} défaites consécutives</span>` : '',
  ].filter(Boolean).join('');
}

// ══════════════════════════════════════════
// D — Matchup Predictor
// ══════════════════════════════════════════
function renderMatchupPredictor(games, activeDeck) {
  const container = document.getElementById('predictorContent');

  // Build matchup table from current filter
  const oppGroups = {};
  games.forEach(g => {
    if (!oppGroups[g.oppColors]) oppGroups[g.oppColors] = [];
    oppGroups[g.oppColors].push(g);
  });

  const matchups = Object.entries(oppGroups)
    .map(([opp, gs]) => {
      const wins = gs.filter(g => g.result === 'Win').length;
      const rate = wins / gs.length * 100;
      const last5 = gs.slice(-5).map(g => g.result === 'Win' ? '✓' : '✗');
      return { opp, total: gs.length, wins, losses: gs.length - wins, rate, last5 };
    })
    .filter(m => m.total >= 1)
    .sort((a, b) => b.total - a.total);

  if (!matchups.length) {
    container.innerHTML = '<p style="color:var(--muted);font-style:italic;text-align:center;padding:16px">Pas de données.</p>';
    return;
  }

  const deckLabel = activeDeck === 'all' ? 'tous decks' : activeDeck;

  container.innerHTML = `
    <div class="predictor-deck-label">Deck analysé : <strong>${deckLabel}</strong></div>
    <div class="predictor-grid">
      ${matchups.map(m => {
        const color   = m.rate >= 60 ? 'var(--win)' : m.rate >= 40 ? 'var(--gold-light)' : 'var(--loss)';
        const verdict = m.rate >= 60 ? 'Favorable' : m.rate >= 40 ? 'Équilibré' : 'Défavorable';
        const last5Html = m.last5.map(r =>
          `<span style="color:${r === '✓' ? 'var(--win)' : 'var(--loss)'}">${r}</span>`).join(' ');
        return `<div class="predictor-card">
          <div class="predictor-opp">${m.opp}</div>
          <div class="predictor-rate" style="color:${color}">${m.rate.toFixed(0)}%</div>
          <div class="predictor-verdict" style="color:${color}">${verdict}</div>
          <div class="predictor-record">${m.wins}V · ${m.losses}D · ${m.total} parties</div>
          <div class="predictor-last5">Dernières: ${last5Html}</div>
        </div>`;
      }).join('')}
    </div>`;
}

// ══════════════════════════════════════════
// E — Comparaison cette semaine vs semaine dernière
// ══════════════════════════════════════════
function getISOWeek(dateStr) {
  const d = new Date(dateStr);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return `${d.getUTCFullYear()}-W${String(Math.ceil(((d - yearStart) / 86400000 + 1) / 7)).padStart(2, '0')}`;
}

function weekStats(games) {
  const total = games.length;
  if (!total) return null;
  const wins     = games.filter(g => g.result === 'Win').length;
  const mmrStart = games[0].mmrBefore;
  const mmrEnd   = games[games.length - 1].mmrAfter;
  const avgDur   = games.reduce((s, g) => s + g.duration, 0) / total;
  return { total, wins, losses: total - wins, rate: wins / total * 100, mmrDelta: mmrEnd - mmrStart, avgDur };
}

function renderWeekComparison(allGames) {
  const byWeek = {};
  allGames.forEach(g => {
    const wk = getISOWeek(g.date);
    (byWeek[wk] = byWeek[wk] || []).push(g);
  });

  const weeks   = Object.keys(byWeek).sort();
  const lastTwo = weeks.slice(-2);

  if (lastTwo.length < 2) {
    document.getElementById('weekCompContent').innerHTML =
      '<p style="color:var(--muted);font-style:italic;text-align:center;padding:16px">Pas assez de données (au moins 2 semaines).</p>';
    return;
  }

  const [prevWk, currWk] = lastTwo;
  const prev = weekStats(byWeek[prevWk]);
  const curr = weekStats(byWeek[currWk]);

  function delta(curr, prev, fmt = v => (v >= 0 ? '+' : '') + v.toFixed(1)) {
    const d = curr - prev;
    return `<span style="color:${d >= 0 ? 'var(--win)' : 'var(--loss)'};font-size:12px">${fmt(d)}</span>`;
  }

  document.getElementById('weekCompContent').innerHTML = `
    <div class="week-comp-grid">
      <div class="week-col">
        <div class="week-label">Semaine précédente<br><span>${prevWk}</span></div>
        <div class="week-stat"><span>${prev.total}</span> parties</div>
        <div class="week-stat"><span style="color:var(--win)">${prev.wins}</span> victoires</div>
        <div class="week-stat"><span style="color:var(--loss)">${prev.losses}</span> défaites</div>
        <div class="week-stat"><span>${prev.rate.toFixed(1)}%</span> winrate</div>
        <div class="week-stat"><span style="color:${prev.mmrDelta >= 0 ? 'var(--win)' : 'var(--loss)'}">${prev.mmrDelta >= 0 ? '+' : ''}${prev.mmrDelta}</span> MMR</div>
        <div class="week-stat"><span>${prev.avgDur.toFixed(1)}m</span> durée moy.</div>
      </div>
      <div class="week-divider">⟷</div>
      <div class="week-col week-col-current">
        <div class="week-label">Cette semaine<br><span>${currWk}</span></div>
        <div class="week-stat"><span>${curr.total}</span> parties ${delta(curr.total, prev.total, v => (v >= 0 ? '+' : '') + Math.round(v))}</div>
        <div class="week-stat"><span style="color:var(--win)">${curr.wins}</span> victoires</div>
        <div class="week-stat"><span style="color:var(--loss)">${curr.losses}</span> défaites</div>
        <div class="week-stat"><span>${curr.rate.toFixed(1)}%</span> winrate ${delta(curr.rate, prev.rate)}</div>
        <div class="week-stat"><span style="color:${curr.mmrDelta >= 0 ? 'var(--win)' : 'var(--loss)'}">${curr.mmrDelta >= 0 ? '+' : ''}${curr.mmrDelta}</span> MMR ${delta(curr.mmrDelta, prev.mmrDelta, v => (v >= 0 ? '+' : '') + Math.round(v))}</div>
        <div class="week-stat"><span>${curr.avgDur.toFixed(1)}m</span> durée moy. ${delta(curr.avgDur, prev.avgDur)}</div>
      </div>
    </div>`;
}

// ══════════════════════════════════════════
// F — Objectifs MMR
// ══════════════════════════════════════════
function renderMMRGoals(games) {
  const currentMMR = games[games.length - 1].mmrAfter;
  const input      = document.getElementById('mmrGoalInput');
  const bar        = document.getElementById('mmrGoalBar');
  const info       = document.getElementById('mmrGoalInfo');

  // Load saved goal
  const saved = localStorage.getItem(LS_MMR_KEY);
  if (saved) input.value = saved;

  function update() {
    const target = parseInt(input.value);
    if (!target || isNaN(target)) { bar.innerHTML = ''; info.innerHTML = ''; return; }

    localStorage.setItem(LS_MMR_KEY, target);

    const startMMR = games[0].mmrBefore;
    const baseline = Math.min(startMMR, currentMMR, target);
    const span     = Math.abs(target - baseline);
    const progress = Math.max(0, Math.min(100,
      target > currentMMR
        ? (currentMMR - baseline) / (target - baseline) * 100
        : 100));

    const reached  = currentMMR >= target;
    const color    = reached ? 'var(--win)' : progress > 60 ? 'var(--gold)' : 'var(--amethyst)';

    bar.innerHTML = `
      <div class="goal-bar-track">
        <div class="goal-bar-fill" style="width:${progress.toFixed(1)}%;background:${color}"></div>
        <div class="goal-bar-marker" style="left:${progress.toFixed(1)}%"></div>
      </div>
      <div class="goal-bar-labels">
        <span>${currentMMR} MMR actuel</span>
        <span style="color:${color}">${progress.toFixed(0)}%</span>
        <span>${target} objectif</span>
      </div>`;

    if (reached) {
      info.innerHTML = `<span style="color:var(--win)">🎉 Objectif atteint ! MMR actuel : ${currentMMR}</span>`;
    } else {
      const gap = target - currentMMR;
      // Estimate games needed: avg MMR per win from data
      const wins    = games.filter(g => g.result === 'Win');
      const avgGain = wins.length
        ? wins.reduce((s, g) => s + (g.mmrAfter - g.mmrBefore), 0) / wins.length
        : 7;
      const wr        = games.filter(g => g.result === 'Win').length / games.length;
      const netPerGame = avgGain * wr + (avgGain * -0.8) * (1 - wr); // rough net MMR per game
      const estimated  = netPerGame > 0 ? Math.ceil(gap / netPerGame) : '?';
      info.innerHTML = `<span style="color:var(--muted)">Il manque <strong style="color:var(--text)">${gap} MMR</strong> · estimé à <strong style="color:var(--text)">~${estimated} parties</strong> au rythme actuel</span>`;
    }
  }

  input.addEventListener('input', update);
  update();
}

// ══════════════════════════════════════════
// G — Meilleur/pire deck (20 dernières parties)
// ══════════════════════════════════════════
function renderBestWorstDeck(allGames) {
  const last20  = allGames.slice(-20);
  const byDeck  = {};
  last20.forEach(g => { (byDeck[g.myColors] = byDeck[g.myColors] || []).push(g); });

  const stats = Object.entries(byDeck)
    .map(([deck, gs]) => {
      const wins = gs.filter(g => g.result === 'Win').length;
      return { deck, total: gs.length, wins, rate: wins / gs.length * 100 };
    })
    .filter(s => s.total >= 2)
    .sort((a, b) => b.rate - a.rate);

  const container = document.getElementById('bestWorstContent');
  if (!stats.length) {
    container.innerHTML = '<p style="color:var(--muted);font-style:italic;text-align:center;padding:16px">Pas assez de données.</p>';
    return;
  }

  container.innerHTML = stats.map((s, i) => {
    const isFirst = i === 0;
    const isLast  = i === stats.length - 1 && stats.length > 1;
    const medal   = isFirst ? '🥇' : isLast ? '💀' : `#${i + 1}`;
    const color   = s.rate >= 60 ? 'var(--win)' : s.rate >= 40 ? 'var(--gold-light)' : 'var(--loss)';
    const bg      = isFirst ? 'rgba(78,204,163,.08)' : isLast ? 'rgba(232,93,122,.08)' : 'transparent';
    const border  = isFirst ? 'rgba(78,204,163,.3)'  : isLast ? 'rgba(232,93,122,.3)'  : 'var(--border)';
    return `<div class="bw-row" style="background:${bg};border-color:${border}">
      <span class="bw-medal">${medal}</span>
      <span class="bw-deck">${s.deck}</span>
      <div class="bw-bar-wrap">
        <div class="bw-bar" style="width:${s.rate.toFixed(0)}%;background:${color}"></div>
      </div>
      <span class="bw-rate" style="color:${color}">${s.rate.toFixed(0)}%</span>
      <span class="bw-record">${s.wins}V/${s.total - s.wins}D</span>
    </div>`;
  }).join('');
}
