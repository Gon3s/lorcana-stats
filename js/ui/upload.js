/**
 * upload.js — Gestion de l'upload fichier & données sauvegardées (SRP)
 * Responsabilité : drag-drop, FileReader, banner données précédentes.
 * Dépendances injectées via paramètres (DIP).
 */

import { LS_KEYS }                           from '../constants.js';
import { showUploadScreen, showLoadingScreen } from './screens.js';

// ── Erreur inline ──────────────────────────────────────────────────────────

export function showUploadError(msg) {
  const el = document.getElementById('uploadError');
  el.textContent   = '⚠ ' + msg;
  el.style.display = 'block';
}

function hideUploadError() {
  document.getElementById('uploadError').style.display = 'none';
}

// ── Banner données sauvegardées ────────────────────────────────────────────

export function checkSavedData() {
  const saved = localStorage.getItem(LS_KEYS.CSV);
  if (!saved) { document.getElementById('savedBanner').style.display = 'none'; return; }

  try {
    const p     = Papa.parse(saved.trim(), { header: true, skipEmptyLines: true });
    const dates = p.data.map(r => r['Date']).filter(Boolean).sort();
    document.getElementById('savedLabel').textContent =
      `${p.data.length} parties · ${dates[0]} → ${dates[dates.length - 1]}`;
    document.getElementById('savedBanner').style.display = 'flex';
  } catch {
    localStorage.removeItem(LS_KEYS.CSV);
  }
}

// ── Lecture de fichier ─────────────────────────────────────────────────────

function handleFile(file, onCSV) {
  if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
    showUploadError('Le fichier doit être un CSV (.csv) exporté depuis duels.ink.');
    return;
  }

  hideUploadError();
  showLoadingScreen();

  const reader   = new FileReader();
  reader.onload  = e => {
    const csv = e.target.result;
    try { localStorage.setItem(LS_KEYS.CSV, csv); } catch { /* quota exceeded */ }
    setTimeout(() => onCSV(csv), 50);
  };
  reader.onerror = () => {
    showUploadScreen();
    showUploadError('Impossible de lire le fichier.');
  };
  reader.readAsText(file);
}

// ── Init de l'écran d'upload ───────────────────────────────────────────────

/**
 * @param {function(string): void} onCSV      - callback avec le texte CSV
 * @param {function(): void}       onGoUpload - callback "changer de fichier"
 */
export function initUploadScreen(onCSV, onGoUpload) {
  const dropZone  = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');

  document.getElementById('browseBtn')
    .addEventListener('click', e => { e.stopPropagation(); fileInput.click(); });

  dropZone.addEventListener('click',  () => fileInput.click());
  fileInput.addEventListener('change', e => {
    if (e.target.files[0]) handleFile(e.target.files[0], onCSV);
  });

  ['dragenter', 'dragover'].forEach(ev =>
    dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.add('dragover'); }));

  dropZone.addEventListener('dragleave', e => {
    if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0], onCSV);
  });

  document.getElementById('changeFileBtn') .addEventListener('click', onGoUpload);
  document.getElementById('footerChangeBtn').addEventListener('click', onGoUpload);

  document.getElementById('loadSavedBtn').addEventListener('click', () => {
    const csv = localStorage.getItem(LS_KEYS.CSV);
    if (csv) { showLoadingScreen(); setTimeout(() => onCSV(csv), 50); }
  });

  document.getElementById('clearSavedBtn').addEventListener('click', () => {
    localStorage.removeItem(LS_KEYS.CSV);
    document.getElementById('savedBanner').style.display = 'none';
  });
}
