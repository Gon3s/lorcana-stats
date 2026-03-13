/**
 * html.js — Utilitaires de sécurité HTML (protection XSS)
 * Toutes les données utilisateur (CSV) doivent passer par esc() avant insertion dans innerHTML.
 */

/**
 * Échappe les caractères HTML spéciaux pour prévenir les injections XSS.
 * À utiliser sur toute donnée provenant du CSV avant insertion dans innerHTML.
 * @param {*} value
 * @returns {string}
 */
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
