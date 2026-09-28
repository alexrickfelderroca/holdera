/*
 * _build/contenido/iconos.js — los ocho iconos de sección de Holdera.
 *
 * Origen: el diseño «Iconos secciones Holdera» que pasó Alex el 28-09-2026
 * (artifact de claude.ai, componente `Icon.dc.html`): «Ocho secciones, un solo
 * trazo. Iconos lineales sobre retícula de 48 px, trazo de 1,6 y un único
 * detalle en cobre por icono». La geometría de cada icono es la de ese
 * archivo, punto por punto; lo único que cambia es CÓMO se pinta el cobre:
 * allí era un atributo stroke="#B8612A" y aquí es la clase .sic-a, que lee
 * --sic-accent de :root. El sitio no admite literales de color fuera de :root
 * (_build/check-tokens.js), y un atributo de presentación no puede leer var().
 *
 * El trazo de 1,6 es en unidades de la retícula de 48: a 24 px en pantalla
 * mide 0,8 px, que es exactamente lo que enseña el diseño en su fila
 * «EN LA WEB · 24 PX». No se engorda al reducir.
 *
 * Uso:  icon('revenue', 24)            -> <svg class="sic sic--revenue" ...>
 *       icon('revenue', 48, 'pgf-ic')  -> con una clase más
 */
'use strict';

const PATHS = {
  hoy: `<circle cx="24" cy="24" r="17"/><path d="M24 9.5v2.5M38.5 24H36M24 38.5V36M9.5 24H12"/><path d="M24 24l8.2-2.2"/><path class="sic-a" d="M24 24v11"/><circle class="sic-dot" cx="24" cy="24" r="1.4"/>`,
  habitaciones: `<rect x="11" y="7" width="26" height="34" rx="1.5"/><path d="M11 15.5h26M11 24h26M11 32.5h26"/><path d="M21 41v-4.5h6V41"/><rect class="sic-a" x="15" y="18" width="7" height="3.5" rx="0.8"/>`,
  housekeeping: `<path d="M8 14v23M40 30v7"/><rect x="8" y="24" width="32" height="6" rx="1"/><rect x="11.5" y="18.5" width="9" height="5.5" rx="2.2"/><path class="sic-a" d="M33 7.5c0 4 1.5 5.5 5.5 5.5c-4 0-5.5 1.5-5.5 5.5c0-4-1.5-5.5-5.5-5.5c4 0 5.5-1.5 5.5-5.5z"/>`,
  revenue: `<path d="M9 9v30h31"/><rect x="14" y="29" width="5" height="10" rx="0.8"/><rect x="22" y="24" width="5" height="15" rx="0.8"/><rect x="30" y="19" width="5" height="20" rx="0.8"/><path class="sic-a" d="M13 22l8-5l7 2l10-8"/><path class="sic-a" d="M33.5 11H38v4.5"/>`,
  reservas: `<rect x="8" y="11" width="32" height="29" rx="2"/><path d="M8 19h32M16 7v7M32 7v7"/><rect class="sic-a sic-af" x="12" y="23.5" width="4.5" height="4.5" rx="1"/><rect class="sic-a sic-af" x="19.5" y="23.5" width="4.5" height="4.5" rx="1"/><rect class="sic-a sic-af" x="27" y="23.5" width="4.5" height="4.5" rx="1"/><rect x="12" y="31" width="4.5" height="4.5" rx="1"/><rect x="19.5" y="31" width="4.5" height="4.5" rx="1"/>`,
  trazabilidad: `<circle class="sic-a" cx="12" cy="24" r="4.5"/><path d="M16.5 24H30M21 24c4 0 4.5-10 9-10M21 24c4 0 4.5 10 9 10"/><rect x="30" y="11" width="9" height="6" rx="1.2"/><rect x="30" y="21" width="9" height="6" rx="1.2"/><rect x="30" y="31" width="9" height="6" rx="1.2"/>`,
  definiciones: `<path d="M24 14c-5-3-11-3-16-2v24c5-1 11-1 16 2c5-3 11-3 16-2V12c-5-1-11-1-16 2z"/><path d="M24 14v24M12 19h7.5M12 24h7.5M12 29h5"/><path class="sic-a" d="M30 12.5v9l2.5-2l2.5 2v-9.6"/>`,
  catalogo: `<rect x="9" y="9" width="13" height="13" rx="2"/><rect x="26" y="9" width="13" height="13" rx="2"/><rect x="9" y="26" width="13" height="13" rx="2"/><rect class="sic-a" x="26" y="26" width="13" height="13" rx="2" stroke-dasharray="3 2.6"/>`,
};

function icon(clave, size, extra) {
  const p = PATHS[clave];
  if (!p) throw new Error('Icono de sección desconocido: ' + clave);
  const cls = 'sic sic--' + clave + (extra ? ' ' + extra : '');
  return `<svg class="${cls}" width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${p}</svg>`;
}

module.exports = { icon, CLAVES: Object.keys(PATHS) };
