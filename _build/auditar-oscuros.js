/*
 * _build/auditar-oscuros.js — lista TODO token que dé por supuesto un fondo
 * oscuro, en los seis CSS del sitio público.
 *
 * Criterio, mecánico a propósito: un alfa BLANCO (`rgba(255,...)`) solo sirve
 * sobre fondo oscuro, y un hex muy oscuro usado como superficie solo sirve si
 * encima va texto claro. Los dos son la huella de la inversión del paso 3.
 * Esto no decide nada: dice qué hay que mirar, para que la paleta clara no se
 * deje ninguno detrás.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const RAIZ = path.join(__dirname, '..');
const ARCHIVOS = ['styles.css', 'sections.css', 'pages.css', 'integraciones.css',
  'hotel-anim.css', path.join('funciones', 'funciones.css')];

function lum(hex) {
  const s = hex.replace('#', '');
  const t = s.length === 3 ? s.split('').map(c => c + c).join('') : s;
  const v = [0, 2, 4].map(i => parseInt(t.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}

const filas = [];
for (const rel of ARCHIVOS) {
  const p = path.join(RAIZ, rel);
  if (!fs.existsSync(p)) continue;
  const lineas = fs.readFileSync(p, 'utf8').split('\n');
  let dentroDeMarcaGenerada = false;
  lineas.forEach((l, i) => {
    if (l.includes('logos:brand-start')) dentroDeMarcaGenerada = true;
    if (l.includes('logos:brand-end')) { dentroDeMarcaGenerada = false; return; }
    if (dentroDeMarcaGenerada) return;           // bloque de otra sesión: no es mío
    const m = l.match(/^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/i);
    if (!m) return;
    const [, tok, val] = m;
    const motivos = [];
    if (/rgba\(\s*25[0-5]\s*,\s*2[0-9]{2}/.test(val)) motivos.push('alfa blanco');
    const hexes = val.match(/#[0-9a-f]{3,6}\b/gi) || [];
    for (const h of hexes) if (lum(h) < 0.06) motivos.push('hex oscuro ' + h);
    if (motivos.length) filas.push({ archivo: rel, linea: i + 1, tok, val: val.slice(0, 62), motivos: [...new Set(motivos)].join(' + ') });
  });
}

const porArchivo = {};
filas.forEach(f => { (porArchivo[f.archivo] ||= []).push(f); });
for (const [a, fs_] of Object.entries(porArchivo)) {
  console.log('\n  ' + a + '  (' + fs_.length + ')');
  fs_.forEach(f => console.log('    ' + String(f.linea).padStart(5) + '  ' + f.tok.padEnd(24) + f.motivos.padEnd(22) + f.val));
}
console.log('\n  TOTAL: ' + filas.length + ' tokens que suponen fondo oscuro.\n');
