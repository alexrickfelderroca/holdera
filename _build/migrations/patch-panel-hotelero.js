/**
 * patch-panel-hotelero.js — paso 9 (19-09-2026)
 *
 * El panel demo deja de ser el de una empresa generica (leads, agenda,
 * finanzas) y pasa a ser el producto real de operaciones
 * hoteleras, capturado en /panel/. Esta migracion corrige el texto de la
 * cortinilla del drawer, que seguia anunciando el panel viejo.
 *
 * De un solo uso: falla si ya se aplico.
 * Uso: node _build/migrations/patch-panel-hotelero.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

/** Nunca String.replace con '$$' en el reemplazo: se come los dolares. */
function swap(text, from, to) {
  if (!text.includes(from)) return { text, hits: 0 };
  const parts = text.split(from);
  return { text: parts.join(to), hits: parts.length - 1 };
}

const EDITS = [
  ['Así podría ser tu panel', 'El producto, por dentro'],
  ['Leads · Agenda · Finanzas', 'Hoy · Habitaciones · Trazabilidad'],
];

const TARGETS = [
  '_build/shell/drawer.html',
  'index.html', 'nosotros.html', 'partners.html', 'contacto.html',
  'aviso-legal.html', 'privacidad.html', '404.html',
];

let totalHits = 0;
const report = [];

for (const rel of TARGETS) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) { report.push([rel, 'NO EXISTE']); continue; }

  let text = fs.readFileSync(file, 'utf8');
  let hits = 0;
  for (const [from, to] of EDITS) {
    const r = swap(text, from, to);
    text = r.text;
    hits += r.hits;
  }
  if (hits) fs.writeFileSync(file, text, 'utf8');
  totalHits += hits;
  report.push([rel, hits ? `${hits} sustituciones` : 'sin cambios']);
}

for (const [rel, msg] of report) console.log(`  ${rel.padEnd(28)} ${msg}`);
console.log('');

if (totalHits === 0) {
  console.error('ERROR: 0 sustituciones. O ya se aplico, o el texto cambio.');
  process.exit(1);
}
console.log(`OK: ${totalHits} sustituciones en ${report.filter(r => r[1].includes('sustitu')).length} archivos`);
