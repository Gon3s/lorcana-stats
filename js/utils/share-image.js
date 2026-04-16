/**
 * share-image.js — Génération d'une image de partage des stats (Canvas HTML5)
 * Format : Story vertical 1080×1920, téléchargeable en PNG.
 */

import { winStats }      from '../charts/registry.js';
import { buildMatchups } from '../advanced/predictor.js';
import { INK_COLOR }     from './ink.js';

// ── Palette (identique aux variables CSS de style.css) ────────────────────────
const C = {
  bg:      '#0a0b14',
  surface: '#141628',
  raised:  '#1c1f38',
  border:  '#2a2f55',
  gold:    '#c9a84c',
  goldL:   '#f0cc6e',
  win:     '#4ecca3',
  loss:    '#e85d7a',
  text:    '#d4c9f0',
  muted:   '#7a7fa0',
};

const W = 1080;
const H = 1920;

// ── Helpers canvas ─────────────────────────────────────────────────────────────

function roundRect(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
}

/** Dessine les points de couleur d'une combinaison d'encres (ex: "Amethyst/Sapphire"). */
function drawInkDots(ctx, colorStr, cx, cy, radius = 14) {
  if (!colorStr) return 0;
  const parts = colorStr.split('/').map(s => s.trim().toLowerCase());
  parts.forEach((key, i) => {
    const hex = INK_COLOR[key] || C.muted;
    ctx.beginPath();
    ctx.arc(cx + i * (radius * 2 + 6), cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = hex;
    ctx.fill();
    // Contour fin
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
  return parts.length * (radius * 2 + 6) - 6;
}

/** Retourne la couleur verdict en fonction du taux de victoire. */
function verdictColor(rate) {
  if (rate >= 60) return C.win;
  if (rate >= 40) return C.goldL;
  return C.loss;
}

/** Retourne le label verdict en fonction du taux de victoire. */
function verdictLabel(rate) {
  if (rate >= 60) return 'Favorable';
  if (rate >= 40) return 'Équilibré';
  return 'Défavorable';
}

// ── Sections de dessin ─────────────────────────────────────────────────────────

/** Fond + décor étoilé léger. */
function drawBackground(ctx) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  // Particules subtiles
  ctx.fillStyle = 'rgba(201,168,76,0.06)';
  const seed = [37, 113, 227, 401, 593, 719, 811, 937, 1049, 1153,
                1279, 1361, 1487, 1597, 1699, 1801, 1901, 83, 199, 311];
  seed.forEach((s, i) => {
    const x = ((s * 17 + i * 97)  % (W - 40)) + 20;
    const y = ((s * 23 + i * 113) % (H - 40)) + 20;
    const r = (s % 3) + 1;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** Section header : titre + deck + divider. */
function drawHeader(ctx, activeDeck) {
  // Titre principal
  ctx.textAlign = 'center';
  ctx.fillStyle = C.gold;
  ctx.font = '700 72px Cinzel, serif';
  ctx.fillText('INKWELL STATS', W / 2, 130);

  // Sous-titre deck
  const deckLabel = (!activeDeck || activeDeck === 'all') ? 'Tous les decks' : activeDeck;
  ctx.fillStyle = C.muted;
  ctx.font = '400 32px "Crimson Pro", serif';
  ctx.fillText(deckLabel, W / 2, 185);

  // Trait doré centré
  const grd = ctx.createLinearGradient(W / 2 - 300, 0, W / 2 + 300, 0);
  grd.addColorStop(0, 'transparent');
  grd.addColorStop(0.5, C.gold);
  grd.addColorStop(1, 'transparent');
  ctx.strokeStyle = grd;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 300, 220);
  ctx.lineTo(W / 2 + 300, 220);
  ctx.stroke();
}

/** Section decks joués : combinaisons myColors avec dots + nb de parties. */
function drawDecksJoues(ctx, games, y) {
  // Grouper par myColors, trier par volume desc
  const groups = {};
  for (const g of games) {
    if (g.myColors) groups[g.myColors] = (groups[g.myColors] || 0) + 1;
  }
  const combos = Object.entries(groups).sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (!combos.length) return;

  // Label section
  ctx.textAlign = 'center';
  ctx.fillStyle = C.muted;
  ctx.font = '500 20px Cinzel, serif';
  ctx.fillText('DECKS JOUÉS', W / 2, y + 28);

  const dotR    = 11;
  const dotGap  = 4;
  const itemGap = 32;
  ctx.font = '300 22px "Crimson Pro", serif';

  // Calculer la largeur de chaque item pour centrage
  const items = combos.map(([combo, count]) => {
    const parts  = combo.split('/').map(s => s.trim().toLowerCase());
    const dotsW  = parts.length * (dotR * 2 + dotGap) - dotGap;
    const label  = combo + ` ×${count}`;
    const textW  = ctx.measureText(label).width;
    return { combo, count, parts, dotsW, label, textW, total: dotsW + 10 + textW };
  });

  const totalW = items.reduce((acc, it) => acc + it.total, 0) + itemGap * (items.length - 1);
  let x = W / 2 - totalW / 2;
  const lineY = y + 62;

  items.forEach(item => {
    // Dots d'encre
    item.parts.forEach((key, i) => {
      const hex = INK_COLOR[key] || C.muted;
      ctx.beginPath();
      ctx.arc(x + dotR + i * (dotR * 2 + dotGap), lineY, dotR, 0, Math.PI * 2);
      ctx.fillStyle = hex;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
    // Texte
    ctx.textAlign = 'left';
    ctx.fillStyle = C.text;
    ctx.font = '300 22px "Crimson Pro", serif';
    ctx.fillText(item.label, x + item.dotsW + 10, lineY + 8);
    x += item.total + itemGap;
  });
}

/** Section winrate : arc circulaire + stats V/D. */
function drawWinrate(ctx, stats) {
  const cx = W / 2;
  const cy = 520;
  const R  = 190;

  // Fond de l'arc
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.strokeStyle = C.raised;
  ctx.lineWidth = 28;
  ctx.stroke();

  // Halo externe léger
  ctx.beginPath();
  ctx.arc(cx, cy, R + 16, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(201,168,76,0.08)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Arc de progression
  const startAngle = -Math.PI / 2;
  const endAngle   = startAngle + (Math.PI * 2 * (stats.rate / 100));
  const arcColor   = stats.rate >= 50 ? C.win : C.loss;

  ctx.beginPath();
  ctx.arc(cx, cy, R, startAngle, endAngle);
  ctx.strokeStyle = arcColor;
  ctx.lineWidth = 28;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.lineCap = 'butt';

  // Valeur centrale
  ctx.textAlign = 'center';
  ctx.fillStyle = C.text;
  ctx.font = '700 100px Cinzel, serif';
  ctx.fillText(stats.rate.toFixed(1) + '%', cx, cy + 20);

  ctx.fillStyle = C.gold;
  ctx.font = '600 28px Cinzel, serif';
  ctx.fillText('WINRATE', cx, cy + 68);

  // Bilan V / D
  ctx.font = '300 34px "Crimson Pro", serif';
  ctx.fillStyle = C.win;
  ctx.fillText(`${stats.wins}V`, cx - 80, cy + 120);
  ctx.fillStyle = C.muted;
  ctx.fillText('·', cx, cy + 120);
  ctx.fillStyle = C.loss;
  ctx.fillText(`${stats.losses}D`, cx + 80, cy + 120);

  // Total parties
  ctx.fillStyle = C.muted;
  ctx.font = '300 26px "Crimson Pro", serif';
  ctx.fillText(`${stats.total} parties`, cx, cy + 162);
}

/** Divider. */
function drawDivider(ctx, y) {
  const grd = ctx.createLinearGradient(W / 2 - 400, 0, W / 2 + 400, 0);
  grd.addColorStop(0, 'transparent');
  grd.addColorStop(0.5, C.border);
  grd.addColorStop(1, 'transparent');
  ctx.strokeStyle = grd;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 400, y);
  ctx.lineTo(W / 2 + 400, y);
  ctx.stroke();
}

/** Section meilleur matchup. */
function drawBestMatchup(ctx, best, y) {
  if (!best) {
    ctx.textAlign = 'center';
    ctx.fillStyle = C.muted;
    ctx.font = 'italic 28px "Crimson Pro", serif';
    ctx.fillText('Pas assez de parties (min. 3)', W / 2, y + 70);
    return;
  }

  // Label section
  ctx.textAlign = 'center';
  ctx.fillStyle = C.gold;
  ctx.font = '600 26px Cinzel, serif';
  ctx.fillText('MEILLEUR MATCHUP', W / 2, y + 44);

  // Carte
  const cardX = 90, cardW = W - 180, cardH = 148;
  roundRect(ctx, cardX, y + 58, cardW, cardH, 18, C.surface);

  // Contour subtle
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 1;
  roundRect(ctx, cardX, y + 58, cardW, cardH, 18);
  ctx.stroke();

  // Dots d'encre adverse
  const dotsY = y + 58 + 50;
  const dotsX = cardX + 36;
  drawInkDots(ctx, best.opp, dotsX + 14, dotsY, 16);

  // Nom adversaire
  ctx.textAlign = 'left';
  ctx.fillStyle = C.text;
  ctx.font = '400 34px "Crimson Pro", serif';
  ctx.fillText(best.opp, dotsX + 80, dotsY + 10);

  // Winrate + verdict
  const vc = verdictColor(best.rate);
  ctx.textAlign = 'right';
  ctx.fillStyle = vc;
  ctx.font = '700 52px Cinzel, serif';
  ctx.fillText(best.rate.toFixed(0) + '%', cardX + cardW - 36, dotsY + 14);

  ctx.font = '400 22px "Crimson Pro", serif';
  ctx.fillText(verdictLabel(best.rate), cardX + cardW - 36, dotsY + 44);

  // Bilan
  ctx.textAlign = 'left';
  ctx.fillStyle = C.muted;
  ctx.font = '300 24px "Crimson Pro", serif';
  ctx.fillText(`${best.wins}V · ${best.losses}D · ${best.total} parties`, dotsX, y + 58 + 115);
}

/** Section Top 5 adversaires. */
function drawTop5(ctx, matchups, y) {
  // Label section
  ctx.textAlign = 'center';
  ctx.fillStyle = C.gold;
  ctx.font = '600 26px Cinzel, serif';
  ctx.fillText('TOP 5 ADVERSAIRES', W / 2, y + 44);

  const top5 = matchups.slice(0, 5);
  const rowH  = 132;
  const barW  = 660;
  const barH  = 18;
  const leftX = 90;

  top5.forEach((m, i) => {
    const ry = y + 70 + i * rowH;

    // Fond de ligne alternée
    if (i % 2 === 0) {
      roundRect(ctx, leftX - 10, ry - 10, W - 2 * (leftX - 10), rowH - 8, 12, 'rgba(28,31,56,0.5)');
    }

    // Dots encre
    const dotCy = ry + 22;
    drawInkDots(ctx, m.opp, leftX + 14, dotCy, 13);

    // Nom encre adverse
    ctx.textAlign = 'left';
    ctx.fillStyle = C.text;
    ctx.font = '400 30px "Crimson Pro", serif';
    ctx.fillText(m.opp, leftX + 68, dotCy + 10);

    // Barre de fond
    const barY = ry + 50;
    roundRect(ctx, leftX, barY, barW, barH, barH / 2, C.raised);

    // Segment victoires
    const wW = Math.round((m.wins / m.total) * barW);
    if (wW > 0) {
      roundRect(ctx, leftX, barY, wW, barH, barH / 2, C.win);
    }

    // Segment défaites (juxtaposé)
    const lW = Math.round((m.losses / m.total) * barW);
    if (lW > 0 && wW + lW <= barW) {
      roundRect(ctx, leftX + wW, barY, lW, barH, barH / 2, C.loss);
    }

    // Pourcentage global à droite de la barre
    const vc = verdictColor(m.rate);
    ctx.textAlign = 'right';
    ctx.fillStyle = vc;
    ctx.font = '700 30px Cinzel, serif';
    ctx.fillText(m.rate.toFixed(0) + '%', leftX + barW + 110, barY + 14);

    // Bilan V/D sous la barre
    ctx.textAlign = 'left';
    ctx.fillStyle = C.muted;
    ctx.font = '300 22px "Crimson Pro", serif';
    ctx.fillText(`${m.wins}V · ${m.losses}D · ${m.total}p`, leftX, barY + barH + 20);

    // Ligne OTP / OTD
    const orderParts = [];
    if (m.otpRate !== null) {
      orderParts.push({ label: `OTP ${m.otpRate.toFixed(0)}%`, color: m.otpRate >= 50 ? C.win : C.loss });
    }
    if (m.otdRate !== null) {
      orderParts.push({ label: `OTD ${m.otdRate.toFixed(0)}%`, color: m.otdRate >= 50 ? C.win : C.loss });
    }
    if (orderParts.length) {
      let ox = leftX;
      orderParts.forEach((part, pi) => {
        if (pi > 0) {
          ctx.fillStyle = C.border;
          ctx.font = '300 20px "Crimson Pro", serif';
          ctx.fillText(' · ', ox - 4, barY + barH + 42);
          ox += ctx.measureText(' · ').width;
        }
        ctx.fillStyle = part.color;
        ctx.font = '400 20px "Crimson Pro", serif';
        ctx.fillText(part.label, ox, barY + barH + 42);
        ox += ctx.measureText(part.label).width;
      });
    }
  });
}

/** Footer. */
function drawFooter(ctx, y) {
  drawDivider(ctx, y);

  const date = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  ctx.textAlign = 'center';
  ctx.fillStyle = C.muted;
  ctx.font = '300 26px "Crimson Pro", serif';
  ctx.fillText(date, W / 2, y + 60);

  ctx.fillStyle = C.gold;
  ctx.font = '500 24px Cinzel, serif';
  ctx.fillText('Inkwell Stats · duels.ink', W / 2, y + 100);

  // Petits gems décoratifs
  const gems = ['amber', 'amethyst', 'emerald', 'ruby', 'sapphire', 'steel'];
  const gemSpacing = 52;
  const gemStart = W / 2 - (gems.length - 1) / 2 * gemSpacing;
  gems.forEach((ink, i) => {
    const hex = INK_COLOR[ink] || C.muted;
    ctx.beginPath();
    ctx.arc(gemStart + i * gemSpacing, y + 148, 10, 0, Math.PI * 2);
    ctx.fillStyle = hex;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
}

// ── Export principal ───────────────────────────────────────────────────────────

/**
 * Génère l'image de partage sur un canvas offscreen et retourne un data URL PNG.
 * @param {object[]} games     — parties filtrées (store.getFiltered())
 * @param {string}   activeDeck — deck actif ('all' ou nom du deck)
 * @returns {Promise<string>}  — data URL PNG
 */
export async function generateShareImage(games, activeDeck) {
  await document.fonts.ready;

  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Données
  const stats    = winStats(games);
  const matchups = buildMatchups(games);
  const best     = matchups.filter(m => m.total >= 3 && m.rate >= 50)
                           .sort((a, b) => b.rate - a.rate)[0] || null;

  // Dessin
  drawBackground(ctx);
  drawHeader(ctx, activeDeck);
  drawDecksJoues(ctx, games, 228);
  drawWinrate(ctx, stats);
  drawDivider(ctx, 730);
  drawBestMatchup(ctx, best, 750);
  drawDivider(ctx, 980);
  drawTop5(ctx, matchups, 998);
  drawFooter(ctx, 1740);

  return canvas.toDataURL('image/png');
}

/**
 * Génère et déclenche le téléchargement de l'image de partage.
 * @param {object[]} games
 * @param {string}   activeDeck
 */
export async function downloadShareImage(games, activeDeck) {
  const dataUrl = await generateShareImage(games, activeDeck);
  const a = document.createElement('a');
  a.href     = dataUrl;
  a.download = 'inkwell-stats.png';
  a.click();
}
