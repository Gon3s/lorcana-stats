/* ═══════════════════════════════════════
   INKWELL STATS — app.js
   ═══════════════════════════════════════ */

const LS_KEY = 'inkwell_csv';

// ── State ───────────────────────────────
let allGames = [];
let activeFilter = 'all';
let charts = {};

// ── Chart.js defaults ───────────────────
Chart.defaults.color = '#7a7fa0';
Chart.defaults.font.family = "'Crimson Pro', Georgia, serif";
Chart.defaults.font.size = 13;
const GRID = { color: 'rgba(42,47,85,.7)', lineWidth: 1 };

// ═══════════════════════════════════════
// BOOT
// ═══════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initUploadScreen();
  checkSavedData();
});

// ═══════════════════════════════════════
// UPLOAD SCREEN
// ═══════════════════════════════════════
function initUploadScreen() {
  const dropZone   = document.getElementById('dropZone');
  const fileInput  = document.getElementById('fileInput');
  const browseBtn  = document.getElementById('browseBtn');
  const dropOverlay = document.getElementById('dropOverlay');

  // Click to browse
  browseBtn.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('click', e => {
    if (e.target === browseBtn) return;
    fileInput.click();
  });

  // File selected via picker
  fileInput.addEventListener('change', e => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  // Drag & drop
  dropZone.addEventListener('dragenter', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragover',  e => { e.preventDefault(); });
  dropZone.addEventListener('dragleave', e => {
    if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('dragover');
  });
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  // "Change file" buttons
  document.getElementById('changeFileBtn').addEventListener('click', goToUpload);
  document.getElementById('footerChangeBtn').addEventListener('click', goToUpload);

  // Saved data buttons
  document.getElementById('loadSavedBtn').addEventListener('click', () => {
    const csv = localStorage.getItem(LS_KEY);
    if (csv) processCSV(csv);
  });
  document.getElementById('clearSavedBtn').addEventListener('click', () => {
    localStorage.removeItem(LS_KEY);
    document.getElementById('savedBanner').style.display = 'none';
  });
}

function checkSavedData() {
  const saved = localStorage.getItem(LS_KEY);
  if (!saved) return;

  // Try to show info about saved data
  try {
    const parsed = Papa.parse(saved.trim(), { header: true, skipEmptyLines: true });
    const count  = parsed.data.length;
    const dates  = parsed.data.map(r => r['Date']).filter(Boolean).sort();
    const label  = `${count} parties · ${dates[0]} → ${dates[dates.length - 1]}`;

    document.getElementById('savedLabel').textContent = label;
    document.getElementById('savedBanner').style.display = 'flex';
  } catch {
    localStorage.removeItem(LS_KEY);
  }
}

function handleFile(file) {
  if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
    showUploadError('Le fichier doit être un CSV (.csv) exporté depuis Dreamborn.');
    return;
  }

  hideUploadError();
  showLoading();

  const reader = new FileReader();
  reader.onload = e => {
    const csv = e.target.result;
    try {
      localStorage.setItem(LS_KEY, csv);
    } catch { /* localStorage full, no problem */ }
    processCSV(csv);
  };
  reader.onerror = () => {
    hideLoading();
    showUploadError('Impossible de lire le fichier. Réessaie.');
  };
  reader.readAsText(file);
}

function goToUpload() {
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('upload-screen').style.display = 'flex';
  checkSavedData();
  // Reset file input so same file can be re-selected
  document.getElementById('fileInput').value = '';
}

function showUploadError(msg) {
  const el = document.getElementById('uploadError');
  el.textContent = '⚠ ' + msg;
  el.style.display = 'block';
}
function hideUploadError() {
  document.getElementById('uploadError').style.display = 'none';
}

// ═══════════════════════════════════════
// PARSE
// ═══════════════════════════════════════
function processCSV(csvText) {
  const parsed = Papa.parse(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim(),
  });

  if (!parsed.data.length) {
    hideLoading();
    showUploadError('Le fichier est vide ou son format n\'est pas reconnu.');
    return;
  }

  // Validate expected columns
  const cols = Object.keys(parsed.data[0]);
  const required = ['Result', 'My Colors', 'Opponent Colors'];
  const missing = required.filter(c => !cols.includes(c));
  if (missing.length) {
    hideLoading();
    showUploadError(`Colonnes manquantes : ${missing.join(', ')}. Vérifie que c'est bien un export Dreamborn.`);
    return;
  }

  allGames = parsed.data.map(row => ({
    date:      (row['Date'] || '').trim(),
    startedAt: (row['Started At'] || '').trim(),
    result:    (row['Result'] || '').trim(),
    opponent:  (row['Opponent'] || '').trim(),
    myLore:    parseInt(row['My Lore'])        || 0,
    oppLore:   parseInt(row['Opponent Lore'])  || 0,
    turns:     parseInt(row['Turns'])          || 0,
    duration:  parseDuration(row['Duration']   || ''),
    turnOrder: (row['Turn Order'] || '').trim(),
    myColors:  (row['My Colors'] || '').trim(),
    oppColors: (row['Opponent Colors'] || '').trim(),
    mmrBefore: parseInt(row['MMR Before'])     || 0,
    mmrAfter:  parseInt(row['MMR After'])      || 0,
  })).filter(g => g.result && g.myColors);

  allGames.sort((a, b) => new Date(a.startedAt) - new Date(b.startedAt));

  if (!allGames.length) {
    hideLoading();
    showUploadError('Aucune partie valide trouvée dans le fichier.');
    return;
  }

  showDashboard();
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
  const decks    = [...new Set(allGames.map(g => g.myColors))].sort();
  const pillsEl  = document.getElementById('filterPills');
  pillsEl.innerHTML = '';

  const allPill = makePill('Tous', 'all');
  allPill.classList.add('active');
  pillsEl.appendChild(allPill);
  decks.forEach(d => pillsEl.appendChild(makePill(d, d)));

  updateFilterCount(allGames.length);
}

function makePill(label, value) {
  const el = document.createElement('button');
  el.className = 'filter-pill';
  el.textContent = label;
  el.dataset.value = value;
  el.addEventListener('click', () => {
    activeFilter = value;
    document.querySelectorAll('.filter-pill').forEach(p =>
      p.classList.toggle('active', p.dataset.value === value));
    const filtered = value === 'all' ? allGames : allGames.filter(g => g.myColors === value);
    updateFilterCount(filtered.length);
    renderAll(filtered);
  });
  return el;
}

function updateFilterCount(n) {
  document.getElementById('filterCount').innerHTML =
    `<span>${n}</span> partie${n > 1 ? 's' : ''}`;
}

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════
const groupBy = (arr, key) => arr.reduce((a, i) => { (a[i[key]] = a[i[key]] || []).push(i); return a; }, {});
const winStats = gs => { const w = gs.filter(g => g.result === 'Win').length; return { wins: w, total: gs.length, rate: gs.length ? w / gs.length * 100 : 0 }; };
const avg      = arr => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
const destroyChart = k => { if (charts[k]) { charts[k].destroy(); delete charts[k]; } };

// ═══════════════════════════════════════
// RENDER ALL
// ═══════════════════════════════════════
function renderAll(games) {
  if (!games.length) return;

  const wins  = games.filter(g => g.result === 'Win');
  const total = games.length;
  const endMMR   = games[games.length - 1].mmrAfter;
  const startMMR = games[0].mmrBefore;
  const peakMMR  = Math.max(...games.map(g => g.mmrAfter));
  const mmrGain  = endMMR - startMMR;
  const avgDur   = avg(games.map(g => g.duration)).toFixed(1);

  document.getElementById('kpiTotal').textContent   = total;
  document.getElementById('kpiWins').textContent    = wins.length;
  document.getElementById('kpiLosses').textContent  = total - wins.length;
  document.getElementById('kpiWinRate').textContent = (wins.length / total * 100).toFixed(1) + '%';
  document.getElementById('kpiMMR').textContent     = endMMR;
  document.getElementById('kpiDur').textContent     = avgDur + 'm';

  const dates = games.map(g => g.date).sort();
  document.getElementById('headerMeta').textContent =
    `${dates[0]} → ${dates[dates.length - 1]}  ·  ${total} parties`;

  document.getElementById('mmrBadge').innerHTML =
    `✦ Départ: ${startMMR} &nbsp;→&nbsp; Peak: ${peakMMR} &nbsp;→&nbsp; Actuel: ${endMMR}` +
    ` &nbsp;(${mmrGain >= 0 ? '+' : ''}${mmrGain} pts)`;

  renderMMRChart(games);
  renderWinLossDonut(wins, total, avgDur, peakMMR);
  renderDailyChart(games);
  renderDeckBars(games, 'myColors',  'myDeckBars');
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

function renderMMRChart(games) {
  destroyChart('mmr');
  const ptColors = games.map(g => g.result === 'Win' ? 'rgba(78,204,163,.85)' : 'rgba(232,93,122,.85)');
  charts.mmr = new Chart(document.getElementById('mmrChart'), {
    type: 'line',
    data: {
      labels: games.map((g, i) => `#${i + 1} · ${g.date.slice(5)}`),
      datasets: [{
        data: games.map(g => g.mmrAfter),
        borderColor: 'rgba(201,168,76,.9)', borderWidth: 2,
        backgroundColor: ctx => {
          const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 260);
          g.addColorStop(0, 'rgba(201,168,76,.22)'); g.addColorStop(1, 'rgba(201,168,76,0)');
          return g;
        },
        fill: true, pointBackgroundColor: ptColors, pointBorderColor: ptColors,
        pointRadius: 4, pointHoverRadius: 7, tension: .35,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: {
        backgroundColor: 'rgba(20,22,40,.95)', borderColor: 'rgba(201,168,76,.4)', borderWidth: 1,
        callbacks: {
          title: ctx => games[ctx[0].dataIndex].opponent,
          label: ctx => {
            const g = games[ctx.dataIndex];
            const d = g.mmrAfter - g.mmrBefore;
            return ` MMR: ${ctx.parsed.y}  (${d >= 0 ? '+' : ''}${d})  · ${g.result === 'Win' ? '✓ Victoire' : '✗ Défaite'}`;
          }
        }
      }},
      scales: { x: { grid: GRID, ticks: { maxTicksLimit: 14, maxRotation: 45 } }, y: { grid: GRID } }
    }
  });
}

function renderWinLossDonut(wins, total, avgDur, peakMMR) {
  destroyChart('wl');
  const wr = (wins.length / total * 100).toFixed(1);
  charts.wl = new Chart(document.getElementById('winLossChart'), {
    type: 'doughnut',
    data: {
      labels: ['Victoires', 'Défaites'],
      datasets: [{ data: [wins.length, total - wins.length],
        backgroundColor: ['rgba(78,204,163,.85)','rgba(232,93,122,.85)'],
        borderColor:     ['rgba(78,204,163,.3)', 'rgba(232,93,122,.3)'],
        borderWidth: 2 }]
    },
    options: {
      responsive: true, maintainAspectRatio: true, cutout: '72%',
      plugins: { legend: { display: false }, tooltip: { callbacks: {
        label: ctx => ` ${ctx.label}: ${ctx.parsed} (${(ctx.parsed / total * 100).toFixed(1)}%)`
      }}}
    }
  });

  document.getElementById('wlLegend').innerHTML = `
    <div class="legend-item">
      <div class="legend-dot" style="background:var(--win)"></div>
      <span class="legend-label">Victoires</span>
      <span class="legend-value">${wins.length}<span class="legend-pct">${wr}%</span></span>
    </div>
    <div class="legend-item">
      <div class="legend-dot" style="background:var(--loss)"></div>
      <span class="legend-label">Défaites</span>
      <span class="legend-value">${total - wins.length}<span class="legend-pct">${(100 - parseFloat(wr)).toFixed(1)}%</span></span>
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
      scales: { x: { grid: { display: false }, stacked: true }, y: { grid: GRID, stacked: true } }
    }
  });
}

function renderDeckBars(games, colorKey, containerId, minGames = 1) {
  const stats = Object.entries(groupBy(games, colorKey))
    .map(([k, v]) => ({ deck: k, ...winStats(v) }))
    .filter(s => s.total >= minGames)
    .sort((a, b) => b.total - a.total);

  document.getElementById(containerId).innerHTML = stats.map(s => {
    const color = s.rate >= 50 ? '#4ecca3' : '#e85d7a';
    return `<div class="bar-row">
      <div class="bar-label" title="${s.deck}">${s.deck}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${s.rate.toFixed(1)}%;background:${color}"></div></div>
      <div class="bar-stat">${s.rate.toFixed(0)}%<span style="font-size:11px;color:var(--muted);margin-left:4px">(${s.total})</span></div>
    </div>`;
  }).join('');
}

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
        { label: 'Victoires', data: [ws[0].wins, ws[1].wins], backgroundColor: 'rgba(78,204,163,.8)', borderRadius: 6 },
        { label: 'Défaites',  data: [ws[0].total - ws[0].wins, ws[1].total - ws[1].wins], backgroundColor: 'rgba(232,93,122,.8)', borderRadius: 6 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } } },
      scales: { x: { grid: { display: false } }, y: { grid: GRID } }
    }
  });

  document.getElementById('turnCards').innerHTML = [
    { key: 'otp', label: 'OTP', w: ws[0], color: 'var(--amethyst)' },
    { key: 'otd', label: 'OTD', w: ws[1], color: 'var(--sapphire)' },
  ].map(t => `
    <div class="turn-card">
      <span class="turn-badge ${t.key}">${t.label}</span>
      <div class="turn-value" style="color:${t.color}">${t.w.rate.toFixed(1)}%</div>
      <div class="turn-sub">${t.w.wins}V / ${t.w.total - t.w.wins}D · ${t.w.total} parties</div>
    </div>`).join('');
}

function renderDurationChart(games) {
  destroyChart('dur');
  const b = { '1-5m': 0, '6-10m': 0, '11-15m': 0, '16-20m': 0, '21m+': 0 };
  games.forEach(g => {
    if      (g.duration <= 5)  b['1-5m']++;
    else if (g.duration <= 10) b['6-10m']++;
    else if (g.duration <= 15) b['11-15m']++;
    else if (g.duration <= 20) b['16-20m']++;
    else                       b['21m+']++;
  });
  charts.dur = new Chart(document.getElementById('durChart'), {
    type: 'bar',
    data: {
      labels: Object.keys(b),
      datasets: [{ data: Object.values(b),
        backgroundColor: ['rgba(201,168,76,.9)','rgba(52,152,219,.9)','rgba(155,89,182,.9)','rgba(46,204,113,.9)','rgba(232,93,122,.9)'],
        borderRadius: 6 }]
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { grid: { display: false } }, y: { grid: GRID } } }
  });
}

function renderLoreChart(wins) {
  destroyChart('lore');
  const loreByDeck = {};
  wins.forEach(g => { (loreByDeck[g.myColors] = loreByDeck[g.myColors] || []).push(g.myLore); });
  const labels = Object.keys(loreByDeck);
  charts.lore = new Chart(document.getElementById('loreChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data: labels.map(k => avg(loreByDeck[k]).toFixed(1)),
        backgroundColor: 'rgba(201,168,76,.75)', borderColor: 'rgba(201,168,76,.3)',
        borderWidth: 1, borderRadius: 6 }]
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { grid: { display: false } }, y: { grid: GRID, max: 25 } } }
  });
}

function renderScatter(games) {
  destroyChart('scatter');
  charts.scatter = new Chart(document.getElementById('scatterChart'), {
    type: 'scatter',
    data: {
      datasets: [{
        data: games.map(g => ({ x: g.myLore, y: g.oppLore })),
        pointBackgroundColor: games.map(g => g.result === 'Win' ? 'rgba(78,204,163,.7)' : 'rgba(232,93,122,.7)'),
        pointBorderColor:     games.map(g => g.result === 'Win' ? 'rgba(78,204,163,1)'  : 'rgba(232,93,122,1)'),
        pointRadius: 5, pointHoverRadius: 8,
      }]
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: {
        label: ctx => {
          const g = games[ctx.dataIndex];
          return ` Moi: ${g.myLore} | Eux: ${g.oppLore} — ${g.result === 'Win' ? '✓' : '✗'} vs ${g.opponent}`;
        }
      }}},
      scales: {
        x: { grid: GRID, title: { display: true, text: 'Mon Lore', color: '#7a7fa0' } },
        y: { grid: GRID, title: { display: true, text: 'Lore Adverse', color: '#7a7fa0' } }
      }
    }
  });
}

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
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { grid: { display: false } }, y: { grid: GRID } } }
  });
}

function renderStreak(games) {
  document.getElementById('streakRow').innerHTML = games.slice(-20).map(g => {
    const w = g.result === 'Win';
    return `<div class="streak-dot ${w ? 'w' : 'l'}" title="${g.date} vs ${g.opponent}">${w ? 'V' : 'D'}</div>`;
  }).join('');
}

function renderMMRByDeck(games) {
  destroyChart('mmrDeck');
  const byDeck = {};
  games.forEach(g => { (byDeck[g.myColors] = byDeck[g.myColors] || []).push(g.mmrAfter - g.mmrBefore); });
  const labels = Object.keys(byDeck);
  const avgs   = labels.map(k => parseFloat(avg(byDeck[k]).toFixed(1)));
  charts.mmrDeck = new Chart(document.getElementById('mmrDeckChart'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{ data: avgs,
        backgroundColor: avgs.map(v => v >= 0 ? 'rgba(78,204,163,.8)' : 'rgba(232,93,122,.8)'),
        borderRadius: 6 }]
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: {
        label: ctx => ` Δ MMR moy: ${ctx.parsed.y >= 0 ? '+' : ''}${ctx.parsed.y}`
      }}},
      scales: { x: { grid: { display: false } },
        y: { grid: GRID, ticks: { callback: v => (v > 0 ? '+' : '') + v } } }
    }
  });
}

function renderTable(games) {
  document.getElementById('tableBody').innerHTML = [...games].reverse().slice(0, 20).map(g => {
    const d = g.mmrAfter - g.mmrBefore;
    return `<tr>
      <td>${g.date.slice(5)}</td>
      <td><span class="win-badge ${g.result === 'Win' ? 'win' : 'loss'}">${g.result === 'Win' ? '✓ Victoire' : '✗ Défaite'}</span></td>
      <td>${g.opponent}</td>
      <td style="font-size:12px">${g.myColors}</td>
      <td style="font-size:12px">${g.oppColors}</td>
      <td style="text-align:center;color:var(--win)">${g.myLore}</td>
      <td style="text-align:center;color:var(--loss)">${g.oppLore}</td>
      <td style="text-align:center">${g.turns}</td>
      <td style="text-align:center">${g.duration}m</td>
      <td style="text-align:right;color:${d >= 0 ? 'var(--win)' : 'var(--loss)'};font-family:'Cinzel',serif">${d >= 0 ? '+' : ''}${d}</td>
    </tr>`;
  }).join('');
}

// ═══════════════════════════════════════
// SCREEN TRANSITIONS
// ═══════════════════════════════════════
function showLoading() {
  document.getElementById('upload-screen').style.display = 'none';
  document.getElementById('loading-screen').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('upload-screen').style.display = 'flex';
}

function showDashboard() {
  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('upload-screen').style.display  = 'none';
  document.getElementById('dashboard').style.display = 'block';
}
