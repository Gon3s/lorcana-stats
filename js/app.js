/* ═══════════════════════════════════════
   LORCANA DASHBOARD — app.js
   ═══════════════════════════════════════ */

// ── Config ──────────────────────────────
const CSV_PATH = 'data/game-history.csv';

// ── State ───────────────────────────────
let allGames = [];
let activeFilter = 'all';
let charts = {};

// ── Chart.js global defaults ────────────
Chart.defaults.color = '#7a7fa0';
Chart.defaults.font.family = "'Crimson Pro', Georgia, serif";
Chart.defaults.font.size = 13;
const GRID = { color: 'rgba(42,47,85,.7)', lineWidth: 1 };

// ── Color palette ────────────────────────
const COLOR_MAP = {
  Amethyst: '#9b59b6', Sapphire: '#3498db', Ruby: '#e74c3c',
  Emerald: '#2ecc71',  Steel: '#95a5a6',    Amber: '#f39c12',
};

const DECK_PALETTE = [
  '#9b59b6','#3498db','#e74c3c','#2ecc71','#f39c12','#95a5a6',
  '#e74c3c','#1abc9c','#e67e22','#8e44ad',
];

// ═══════════════════════════════════════
// BOOT
// ═══════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  loadCSV();
});

async function loadCSV() {
  try {
    const res = await fetch(CSV_PATH);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    parseAndRender(text);
  } catch (err) {
    showError(err);
  }
}

// ═══════════════════════════════════════
// PARSE
// ═══════════════════════════════════════
function parseAndRender(csvText) {
  const parsed = Papa.parse(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim(),
  });

  if (parsed.errors.length && !parsed.data.length) {
    showError(new Error('CSV parse failed: ' + parsed.errors[0].message));
    return;
  }

  allGames = parsed.data.map(row => ({
    date:        (row['Date'] || '').trim(),
    startedAt:   (row['Started At'] || '').trim(),
    result:      (row['Result'] || '').trim(),
    opponent:    (row['Opponent'] || '').trim(),
    myLore:      parseInt(row['My Lore']) || 0,
    oppLore:     parseInt(row['Opponent Lore']) || 0,
    turns:       parseInt(row['Turns']) || 0,
    duration:    parseDuration(row['Duration'] || ''),
    source:      (row['Source'] || '').trim(),
    turnOrder:   (row['Turn Order'] || '').trim(),
    queue:       (row['Queue'] || '').trim(),
    myColors:    (row['My Colors'] || '').trim(),
    oppColors:   (row['Opponent Colors'] || '').trim(),
    format:      (row['Match Format'] || '').trim(),
    mmrBefore:   parseInt(row['MMR Before']) || 0,
    mmrAfter:    parseInt(row['MMR After']) || 0,
  })).filter(g => g.result && g.myColors);

  // Sort chronological oldest → newest
  allGames.sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));

  hideLoading();
  buildFilterBar();
  renderAll(allGames);
}

function parseDuration(str) {
  const m = str.match(/(\d+)m/);
  return m ? parseInt(m[1]) : 0;
}

// ═══════════════════════════════════════
// FILTER
// ═══════════════════════════════════════
function buildFilterBar() {
  const decks = [...new Set(allGames.map(g => g.myColors))].sort();
  const pillsEl = document.getElementById('filterPills');

  const allPill = makePill('Tous les decks', 'all');
  allPill.classList.add('active');
  pillsEl.appendChild(allPill);

  decks.forEach(deck => {
    pillsEl.appendChild(makePill(deck, deck));
  });

  updateFilterCount(allGames.length);
}

function makePill(label, value) {
  const el = document.createElement('button');
  el.className = 'filter-pill';
  el.textContent = label;
  el.dataset.value = value;
  el.addEventListener('click', () => applyFilter(value));
  return el;
}

function applyFilter(value) {
  activeFilter = value;

  document.querySelectorAll('.filter-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.value === value);
  });

  const filtered = value === 'all' ? allGames : allGames.filter(g => g.myColors === value);
  updateFilterCount(filtered.length);
  renderAll(filtered);
}

function updateFilterCount(n) {
  const el = document.getElementById('filterCount');
  el.innerHTML = `<span>${n}</span> partie${n > 1 ? 's' : ''}`;
}

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════
function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key];
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

function winStats(games) {
  const w = games.filter(g => g.result === 'Win').length;
  return { wins: w, total: games.length, rate: games.length ? (w / games.length * 100) : 0 };
}

function avg(arr) {
  return arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
}

function destroyChart(key) {
  if (charts[key]) { charts[key].destroy(); delete charts[key]; }
}

// ═══════════════════════════════════════
// RENDER ALL
// ═══════════════════════════════════════
function renderAll(games) {
  if (!games.length) return;

  const wins   = games.filter(g => g.result === 'Win');
  const losses = games.filter(g => g.result === 'Loss');
  const total  = games.length;

  // KPIs
  const endMMR   = games[games.length - 1].mmrAfter;
  const startMMR = games[0].mmrBefore;
  const peakMMR  = Math.max(...games.map(g => g.mmrAfter));
  const mmrGain  = endMMR - startMMR;
  const avgDur   = avg(games.map(g => g.duration)).toFixed(1);

  document.getElementById('kpiTotal').textContent   = total;
  document.getElementById('kpiWins').textContent    = wins.length;
  document.getElementById('kpiLosses').textContent  = losses.length;
  document.getElementById('kpiWinRate').textContent = (wins.length / total * 100).toFixed(1) + '%';
  document.getElementById('kpiMMR').textContent     = endMMR;
  document.getElementById('kpiDur').textContent     = avgDur + 'm';

  // Header meta
  const dates = games.map(g => g.date).sort();
  document.getElementById('headerMeta').textContent =
    `${dates[0]} → ${dates[dates.length - 1]}  ·  ${total} parties`;

  // MMR badge
  document.getElementById('mmrBadge').innerHTML =
    `✦ Départ: ${startMMR} &nbsp;→&nbsp; Peak: ${peakMMR} &nbsp;→&nbsp; Actuel: ${endMMR}` +
    ` &nbsp;(${mmrGain >= 0 ? '+' : ''}${mmrGain} pts)`;

  renderMMRChart(games);
  renderWinLossDonut(wins, losses, total, avgDur, peakMMR);
  renderDailyChart(games);
  renderDeckBars(games, 'myColors', 'myDeckBars');
  renderDeckBars(games, 'oppColors', 'oppDeckBars', 2);
  renderTurnOrder(games);
  renderDurationChart(games);
  renderLoreChart(wins);
  renderScatter(games);
  renderTurnsChart(games);
  renderStreak(games);
  renderMMRByDeck(games);
  renderTable(games);
}

// ═══════════════════════════════════════
// CHARTS
// ═══════════════════════════════════════

/* 1 — MMR evolution */
function renderMMRChart(games) {
  destroyChart('mmr');
  const labels = games.map((g, i) => `#${i + 1} · ${g.date.slice(5)}`);
  const values = games.map(g => g.mmrAfter);
  const ptColors = games.map(g => g.result === 'Win' ? 'rgba(78,204,163,.85)' : 'rgba(232,93,122,.85)');

  charts.mmr = new Chart(document.getElementById('mmrChart'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: 'rgba(201,168,76,.9)',
        borderWidth: 2,
        backgroundColor: ctx => {
          const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 260);
          g.addColorStop(0, 'rgba(201,168,76,.22)');
          g.addColorStop(1, 'rgba(201,168,76,.00)');
          return g;
        },
        fill: true,
        pointBackgroundColor: ptColors,
        pointBorderColor: ptColors,
        pointRadius: 4,
        pointHoverRadius: 7,
        tension: .35,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(20,22,40,.95)',
          borderColor: 'rgba(201,168,76,.4)',
          borderWidth: 1,
          callbacks: {
            title: ctx => games[ctx[0].dataIndex].opponent,
            label: ctx => {
              const g = games[ctx.dataIndex];
              const d = g.mmrAfter - g.mmrBefore;
              return ` MMR: ${ctx.parsed.y}  (${d >= 0 ? '+' : ''}${d})  · ${g.result === 'Win' ? '✓ Victoire' : '✗ Défaite'}`;
            }
          }
        }
      },
      scales: {
        x: { grid: GRID, ticks: { maxTicksLimit: 14, maxRotation: 45 } },
        y: { grid: GRID }
      }
    }
  });
}

/* 2 — Win/Loss donut */
function renderWinLossDonut(wins, losses, total, avgDur, peakMMR) {
  destroyChart('wl');
  charts.wl = new Chart(document.getElementById('winLossChart'), {
    type: 'doughnut',
    data: {
      labels: ['Victoires', 'Défaites'],
      datasets: [{
        data: [wins.length, losses.length],
        backgroundColor: ['rgba(78,204,163,.85)', 'rgba(232,93,122,.85)'],
        borderColor:     ['rgba(78,204,163,.3)',  'rgba(232,93,122,.3)'],
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: {
          label: ctx => ` ${ctx.label}: ${ctx.parsed} (${(ctx.parsed / total * 100).toFixed(1)}%)`
        }}
      }
    }
  });

  const wr = (wins.length / total * 100).toFixed(1);
  document.getElementById('wlLegend').innerHTML = `
    <div class="legend-item">
      <div class="legend-dot" style="background:var(--win)"></div>
      <span class="legend-label">Victoires</span>
      <span class="legend-value">${wins.length}<span class="legend-pct">${wr}%</span></span>
    </div>
    <div class="legend-item">
      <div class="legend-dot" style="background:var(--loss)"></div>
      <span class="legend-label">Défaites</span>
      <span class="legend-value">${losses.length}<span class="legend-pct">${(100 - parseFloat(wr)).toFixed(1)}%</span></span>
    </div>
    <div class="legend-sep"></div>
    <div class="legend-item">
      <span class="legend-label" style="color:var(--muted)">Peak MMR</span>
      <span class="legend-value" style="color:var(--gold-light)">${peakMMR}</span>
    </div>
    <div class="legend-item">
      <span class="legend-label" style="color:var(--muted)">Durée moy.</span>
      <span class="legend-value">${avgDur}<span class="legend-pct">min</span></span>
    </div>`;
}

/* 3 — Daily stacked bar */
function renderDailyChart(games) {
  destroyChart('daily');
  const byDate = groupBy(games, 'date');
  const dates  = Object.keys(byDate).sort();
  charts.daily = new Chart(document.getElementById('dailyChart'), {
    type: 'bar',
    data: {
      labels: dates.map(d => d.slice(5)),
      datasets: [
        { label: 'Victoires', data: dates.map(d => byDate[d].filter(g => g.result === 'Win').length),
          backgroundColor: 'rgba(78,204,163,.75)', borderRadius: 4, stack: 's' },
        { label: 'Défaites',  data: dates.map(d => byDate[d].filter(g => g.result === 'Loss').length),
          backgroundColor: 'rgba(232,93,122,.75)', borderRadius: 4, stack: 's' },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 14 } } },
      scales: {
        x: { grid: { display: false }, stacked: true },
        y: { grid: GRID, stacked: true, ticks: { stepSize: 2 } }
      }
    }
  });
}

/* 4 — Generic horizontal bar winrates */
function renderDeckBars(games, colorKey, containerId, minGames = 1) {
  const groups = groupBy(games, colorKey);
  const stats  = Object.entries(groups)
    .map(([k, v]) => ({ deck: k, ...winStats(v) }))
    .filter(s => s.total >= minGames)
    .sort((a, b) => b.total - a.total);

  const el = document.getElementById(containerId);
  el.innerHTML = '';
  stats.forEach(s => {
    const pct   = s.rate;
    const color = pct >= 50 ? '#4ecca3' : '#e85d7a';
    el.innerHTML += `
      <div class="bar-row">
        <div class="bar-label" title="${s.deck}">${s.deck}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${pct.toFixed(1)}%;background:${color}"></div>
        </div>
        <div class="bar-stat">${pct.toFixed(0)}%<span style="font-size:11px;color:var(--muted);margin-left:4px">(${s.total})</span></div>
      </div>`;
  });
}

/* 5 — Turn order */
function renderTurnOrder(games) {
  destroyChart('turn');
  const otp = games.filter(g => g.turnOrder === 'OTP');
  const otd = games.filter(g => g.turnOrder === 'OTD');
  const ws  = [winStats(otp), winStats(otd)];

  charts.turn = new Chart(document.getElementById('turnChart'), {
    type: 'bar',
    data: {
      labels: ['OTP (1er)', 'OTD (2ème)'],
      datasets: [
        { label: 'Victoires', data: [ws[0].wins,                ws[1].wins],
          backgroundColor: 'rgba(78,204,163,.8)', borderRadius: 6 },
        { label: 'Défaites',  data: [ws[0].total - ws[0].wins, ws[1].total - ws[1].wins],
          backgroundColor: 'rgba(232,93,122,.8)', borderRadius: 6 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } } },
      scales: { x: { grid: { display: false } }, y: { grid: GRID } }
    }
  });

  document.getElementById('turnCards').innerHTML = ['otp','otd'].map((t, i) => `
    <div class="turn-card">
      <span class="turn-badge ${t}">${t.toUpperCase()}</span>
      <div class="turn-value" style="color:${t === 'otp' ? 'var(--amethyst)' : 'var(--sapphire)'}">${ws[i].rate.toFixed(1)}%</div>
      <div class="turn-sub">${ws[i].wins}V / ${ws[i].total - ws[i].wins}D · ${ws[i].total} parties</div>
    </div>`).join('');
}

/* 6 — Duration histogram */
function renderDurationChart(games) {
  destroyChart('dur');
  const buckets = { '1-5m': 0, '6-10m': 0, '11-15m': 0, '16-20m': 0, '21m+': 0 };
  games.forEach(g => {
    if      (g.duration <= 5)  buckets['1-5m']++;
    else if (g.duration <= 10) buckets['6-10m']++;
    else if (g.duration <= 15) buckets['11-15m']++;
    else if (g.duration <= 20) buckets['16-20m']++;
    else                       buckets['21m+']++;
  });

  charts.dur = new Chart(document.getElementById('durChart'), {
    type: 'bar',
    data: {
      labels: Object.keys(buckets),
      datasets: [{ data: Object.values(buckets),
        backgroundColor: ['rgba(201,168,76,.9)','rgba(52,152,219,.9)','rgba(155,89,182,.9)','rgba(46,204,113,.9)','rgba(232,93,122,.9)'],
        borderRadius: 6 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { grid: { display: false } }, y: { grid: GRID } }
    }
  });
}

/* 7 — Avg lore on wins per deck */
function renderLoreChart(wins) {
  destroyChart('lore');
  const loreByDeck = {};
  wins.forEach(g => {
    if (!loreByDeck[g.myColors]) loreByDeck[g.myColors] = [];
    loreByDeck[g.myColors].push(g.myLore);
  });
  const labels = Object.keys(loreByDeck);
  const avgs   = labels.map(k => avg(loreByDeck[k]).toFixed(1));

  charts.lore = new Chart(document.getElementById('loreChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data: avgs,
        backgroundColor: 'rgba(201,168,76,.75)',
        borderColor:     'rgba(201,168,76,.3)',
        borderWidth: 1, borderRadius: 6 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { grid: { display: false } }, y: { grid: GRID, max: 25 } }
    }
  });
}

/* 8 — Scatter lore */
function renderScatter(games) {
  destroyChart('scatter');
  const pts = games.map(g => ({
    x: g.myLore, y: g.oppLore,
    bg:     g.result === 'Win' ? 'rgba(78,204,163,.7)'  : 'rgba(232,93,122,.7)',
    border: g.result === 'Win' ? 'rgba(78,204,163,1)'   : 'rgba(232,93,122,1)',
  }));

  charts.scatter = new Chart(document.getElementById('scatterChart'), {
    type: 'scatter',
    data: {
      datasets: [{
        data: pts.map(p => ({ x: p.x, y: p.y })),
        pointBackgroundColor: pts.map(p => p.bg),
        pointBorderColor:     pts.map(p => p.border),
        pointRadius: 5, pointHoverRadius: 8,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: {
        label: ctx => {
          const g = games[ctx.dataIndex];
          return ` Moi: ${g.myLore} lore | Eux: ${g.oppLore} lore — ${g.result === 'Win' ? '✓ Victoire' : '✗ Défaite'} vs ${g.opponent}`;
        }
      }}},
      scales: {
        x: { grid: GRID, title: { display: true, text: 'Mon Lore', color: '#7a7fa0' } },
        y: { grid: GRID, title: { display: true, text: 'Lore Adverse', color: '#7a7fa0' } }
      }
    }
  });
}

/* 9 — Turns histogram */
function renderTurnsChart(games) {
  destroyChart('turns');
  const b = { '1-5': 0, '6-8': 0, '9-11': 0, '12-14': 0, '15+': 0 };
  games.forEach(g => {
    if      (g.turns <= 5)  b['1-5']++;
    else if (g.turns <= 8)  b['6-8']++;
    else if (g.turns <= 11) b['9-11']++;
    else if (g.turns <= 14) b['12-14']++;
    else                    b['15+']++;
  });

  charts.turns = new Chart(document.getElementById('turnsChart'), {
    type: 'bar',
    data: {
      labels: Object.keys(b),
      datasets: [{ data: Object.values(b),
        backgroundColor: ['rgba(155,89,182,.8)','rgba(52,152,219,.8)','rgba(201,168,76,.8)','rgba(46,204,113,.8)','rgba(232,93,122,.8)'],
        borderRadius: 6 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { grid: { display: false } }, y: { grid: GRID } }
    }
  });
}

/* 10 — Last 20 streak */
function renderStreak(games) {
  const last20 = games.slice(-20);
  const el = document.getElementById('streakRow');
  el.innerHTML = last20.map(g => {
    const w = g.result === 'Win';
    return `<div class="streak-dot ${w ? 'w' : 'l'}" title="${g.date} vs ${g.opponent}">${w ? 'V' : 'D'}</div>`;
  }).join('');
}

/* 11 — Avg MMR delta by deck */
function renderMMRByDeck(games) {
  destroyChart('mmrDeck');
  const byDeck = {};
  games.forEach(g => {
    if (!byDeck[g.myColors]) byDeck[g.myColors] = [];
    byDeck[g.myColors].push(g.mmrAfter - g.mmrBefore);
  });
  const labels = Object.keys(byDeck);
  const avgs   = labels.map(k => parseFloat(avg(byDeck[k]).toFixed(1)));
  const colors = avgs.map(v => v >= 0 ? 'rgba(78,204,163,.8)' : 'rgba(232,93,122,.8)');

  charts.mmrDeck = new Chart(document.getElementById('mmrDeckChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data: avgs, backgroundColor: colors, borderRadius: 6 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: {
        label: ctx => ` Δ MMR moy: ${ctx.parsed.y >= 0 ? '+' : ''}${ctx.parsed.y}`
      }}},
      scales: {
        x: { grid: { display: false } },
        y: { grid: GRID, ticks: { callback: v => (v > 0 ? '+' : '') + v } }
      }
    }
  });
}

/* 12 — Recent games table */
function renderTable(games) {
  const rows = [...games].reverse().slice(0, 20);
  document.getElementById('tableBody').innerHTML = rows.map(g => {
    const delta     = g.mmrAfter - g.mmrBefore;
    const deltaStr  = (delta >= 0 ? '+' : '') + delta;
    const deltaColor = delta >= 0 ? 'var(--win)' : 'var(--loss)';
    const isWin = g.result === 'Win';
    return `<tr>
      <td>${g.date.slice(5)}</td>
      <td><span class="win-badge ${isWin ? 'win' : 'loss'}">${isWin ? '✓ Victoire' : '✗ Défaite'}</span></td>
      <td>${g.opponent}</td>
      <td style="font-size:12px">${g.myColors}</td>
      <td style="font-size:12px">${g.oppColors}</td>
      <td style="text-align:center;color:var(--win)">${g.myLore}</td>
      <td style="text-align:center;color:var(--loss)">${g.oppLore}</td>
      <td style="text-align:center">${g.turns}</td>
      <td style="text-align:center">${g.duration}m</td>
      <td style="text-align:right;color:${deltaColor};font-family:'Cinzel',serif">${deltaStr}</td>
    </tr>`;
  }).join('');
}

// ═══════════════════════════════════════
// UI UTILS
// ═══════════════════════════════════════
function hideLoading() {
  document.getElementById('loading-screen').classList.add('hidden');
  document.getElementById('dashboard').style.display = 'block';
}

function showError(err) {
  console.error(err);
  document.getElementById('loading-screen').classList.add('hidden');
  document.getElementById('error-screen').classList.add('visible');
}
