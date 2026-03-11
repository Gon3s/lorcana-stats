/**
 * advanced/goals.js — Objectif MMR (SRP)
 * Calcule la progression et estime les parties restantes.
 * La persistance passe par LS_KEYS (DIP).
 */

import { LS_KEYS } from '../constants.js';

/** Estime le nombre de parties nécessaires pour atteindre `gap` MMR. */
function estimateGames(games, gap) {
  const wins    = games.filter(g => g.result === 'Win');
  const avgGain = wins.length
    ? wins.reduce((s, g) => s + (g.mmrAfter - g.mmrBefore), 0) / wins.length
    : 7;
  const wr         = wins.length / games.length;
  const netPerGame = avgGain * wr + avgGain * -0.8 * (1 - wr);
  return netPerGame > 0 ? Math.ceil(gap / netPerGame) : '?';
}

function barColor(reached, progress) {
  if (reached)       return 'var(--win)';
  if (progress > 60) return 'var(--gold)';
  return 'var(--amethyst)';
}

export function renderMMRGoals(games) {
  const currentMMR = games[games.length - 1].mmrAfter;
  const input      = document.getElementById('mmrGoalInput');
  const bar        = document.getElementById('mmrGoalBar');
  const info       = document.getElementById('mmrGoalInfo');

  const saved = localStorage.getItem(LS_KEYS.MMR_GOAL);
  if (saved) input.value = saved;

  function update() {
    const target = parseInt(input.value);
    if (!target || isNaN(target)) { bar.innerHTML = ''; info.innerHTML = ''; return; }

    localStorage.setItem(LS_KEYS.MMR_GOAL, String(target));

    const startMMR = games[0].mmrBefore;
    const baseline = Math.min(startMMR, currentMMR, target);
    const reached  = currentMMR >= target;
    const progress = reached ? 100 : Math.max(0, Math.min(100,
      (currentMMR - baseline) / (target - baseline) * 100
    ));
    const color = barColor(reached, progress);

    bar.innerHTML = `
      <div class="goal-bar-track">
        <div class="goal-bar-fill"   style="width:${progress.toFixed(1)}%;background:${color}"></div>
        <div class="goal-bar-marker" style="left:${progress.toFixed(1)}%"></div>
      </div>
      <div class="goal-bar-labels">
        <span>${currentMMR} MMR actuel</span>
        <span style="color:${color}">${progress.toFixed(0)}%</span>
        <span>${target} objectif</span>
      </div>`;

    if (reached) {
      info.innerHTML = `<span class="text-win">🎉 Objectif atteint ! MMR actuel : ${currentMMR}</span>`;
    } else {
      const gap = target - currentMMR;
      info.innerHTML = `
        <span style="color:var(--muted)">
          Il manque <strong style="color:var(--text)">${gap} MMR</strong>
          · estimé à <strong style="color:var(--text)">~${estimateGames(games, gap)} parties</strong>
          au rythme actuel
        </span>`;
    }
  }

  input.addEventListener('input', update);
  update();
}
