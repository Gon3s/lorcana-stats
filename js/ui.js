/* ═══════════════════════════════════════
   ui.js — Upload screen, filter, nav, table
   ═══════════════════════════════════════ */

const LS_KEY     = 'inkwell_csv';
const LS_MMR_KEY = 'inkwell_mmr_goal';

// ── Screen transitions ───────────────────
function showUploadScreen() {
  document.getElementById('upload-screen').style.display  = 'flex';
  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('dashboard').style.display      = 'none';
}
function showLoadingScreen() {
  document.getElementById('upload-screen').style.display  = 'none';
  document.getElementById('loading-screen').style.display = 'flex';
  document.getElementById('dashboard').style.display      = 'none';
}
function showDashboard() {
  document.getElementById('upload-screen').style.display  = 'none';
  document.getElementById('loading-screen').style.display = 'none';
  document.getElementById('dashboard').style.display      = 'block';
}
function goToUpload() {
  document.getElementById('fileInput').value = '';
  showUploadScreen();
  checkSavedData();
}

// ── Error inline ─────────────────────────
function showUploadError(msg) {
  const el = document.getElementById('uploadError');
  el.textContent = '⚠ ' + msg;
  el.style.display = 'block';
}
function hideUploadError() {
  document.getElementById('uploadError').style.display = 'none';
}

// ── Saved data banner ────────────────────
function checkSavedData() {
  const saved = localStorage.getItem(LS_KEY);
  if (!saved) { document.getElementById('savedBanner').style.display = 'none'; return; }
  try {
    const p     = Papa.parse(saved.trim(), { header: true, skipEmptyLines: true });
    const count = p.data.length;
    const dates = p.data.map(r => r['Date']).filter(Boolean).sort();
    document.getElementById('savedLabel').textContent =
      `${count} parties · ${dates[0]} → ${dates[dates.length - 1]}`;
    document.getElementById('savedBanner').style.display = 'flex';
  } catch { localStorage.removeItem(LS_KEY); }
}

// ── Upload screen init ───────────────────
function initUploadScreen(onCSV) {
  const dropZone  = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const browseBtn = document.getElementById('browseBtn');

  browseBtn.addEventListener('click', e => { e.stopPropagation(); fileInput.click(); });
  dropZone.addEventListener('click',  () => fileInput.click());
  fileInput.addEventListener('change', e => { if (e.target.files[0]) handleFile(e.target.files[0], onCSV); });

  ['dragenter','dragover'].forEach(ev =>
    dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.add('dragover'); }));
  dropZone.addEventListener('dragleave', e => {
    if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('dragover');
  });
  dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0], onCSV);
  });

  document.getElementById('changeFileBtn').addEventListener('click',  goToUpload);
  document.getElementById('footerChangeBtn').addEventListener('click', goToUpload);

  document.getElementById('loadSavedBtn').addEventListener('click', () => {
    const csv = localStorage.getItem(LS_KEY);
    if (csv) { showLoadingScreen(); setTimeout(() => onCSV(csv), 50); }
  });
  document.getElementById('clearSavedBtn').addEventListener('click', () => {
    localStorage.removeItem(LS_KEY);
    document.getElementById('savedBanner').style.display = 'none';
  });
}

function handleFile(file, onCSV) {
  if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
    showUploadError('Le fichier doit être un CSV (.csv) exporté depuis duels.ink.');
    return;
  }
  hideUploadError();
  showLoadingScreen();
  const reader  = new FileReader();
  reader.onload = e => {
    const csv = e.target.result;
    try { localStorage.setItem(LS_KEY, csv); } catch {}
    setTimeout(() => onCSV(csv), 50);
  };
  reader.onerror = () => { showUploadScreen(); showUploadError('Impossible de lire le fichier.'); };
  reader.readAsText(file);
}

// ── Filter bar ───────────────────────────
function buildFilterBar(allGames, onFilter) {
  const decks   = [...new Set(allGames.map(g => g.myColors))].sort();
  const pillsEl = document.getElementById('filterPills');
  pillsEl.innerHTML = '';

  const allPill = createPill('Tous', 'all', true, allGames, onFilter);
  pillsEl.appendChild(allPill);
  decks.forEach(d => pillsEl.appendChild(createPill(d, d, false, allGames, onFilter)));

  updateFilterCount(allGames.length);
}

function createPill(label, value, active, allGames, onFilter) {
  const el = document.createElement('button');
  el.className   = 'filter-pill' + (active ? ' active' : '');
  el.textContent = label;
  el.dataset.value = value;
  el.addEventListener('click', () => {
    document.querySelectorAll('.filter-pill').forEach(p =>
      p.classList.toggle('active', p.dataset.value === value));
    const filtered = value === 'all' ? allGames : allGames.filter(g => g.myColors === value);
    updateFilterCount(filtered.length);
    onFilter(filtered, value);
  });
  return el;
}

function updateFilterCount(n) {
  document.getElementById('filterCount').innerHTML =
    `<span>${n}</span> partie${n > 1 ? 's' : ''}`;
}

// ── Recent games table ───────────────────
function renderTable(games) {
  document.getElementById('tableBody').innerHTML = [...games].reverse().slice(0, 20).map(g => {
    const d = g.mmrAfter - g.mmrBefore;
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
      <td style="text-align:right;color:${d >= 0 ? 'var(--win)' : 'var(--loss)'};font-family:'Cinzel',serif">${d >= 0 ? '+' : ''}${d}</td>
    </tr>`;
  }).join('');
}

// ── Streak ───────────────────────────────
function renderStreak(games) {
  document.getElementById('streakRow').innerHTML = games.slice(-20).map(g => {
    const w = g.result === 'Win';
    return `<div class="streak-dot ${w ? 'w' : 'l'}" title="${g.date} vs ${g.opponent}">${w ? 'V' : 'D'}</div>`;
  }).join('');
}

// ── Header meta ──────────────────────────
function updateHeader(games) {
  const wins  = games.filter(g => g.result === 'Win');
  const total = games.length;
  const endMMR   = games[games.length - 1].mmrAfter;
  const startMMR = games[0].mmrBefore;
  const peakMMR  = Math.max(...games.map(g => g.mmrAfter));
  const mmrGain  = endMMR - startMMR;
  const avgDur   = (games.reduce((s, g) => s + g.duration, 0) / total).toFixed(1);
  const dates    = games.map(g => g.date).sort();

  document.getElementById('kpiTotal').textContent   = total;
  document.getElementById('kpiWins').textContent    = wins.length;
  document.getElementById('kpiLosses').textContent  = total - wins.length;
  document.getElementById('kpiWinRate').textContent = (wins.length / total * 100).toFixed(1) + '%';
  document.getElementById('kpiMMR').textContent     = endMMR;
  document.getElementById('kpiDur').textContent     = avgDur + 'm';
  document.getElementById('headerMeta').textContent =
    `${dates[0]} → ${dates[dates.length - 1]}  ·  ${total} parties`;
  document.getElementById('mmrBadge').innerHTML =
    `✦ Départ: ${startMMR} &nbsp;→&nbsp; Peak: ${peakMMR} &nbsp;→&nbsp; Actuel: ${endMMR}` +
    ` &nbsp;(${mmrGain >= 0 ? '+' : ''}${mmrGain} pts)`;
}
