/*
 * _build/migrations/patch-telefono.js — cambia el teléfono publicado.
 *
 * El número que había publicado (+34 607 83 69 60) es INCORRECTO: lo dijo Alex
 * el 20-09-2026. El bueno llegó a esta sesión a través de otra sesión de
 * Claude, así que está marcado para que Alex lo confirme antes de publicar.
 *
 * Es parametrizable a propósito: si el número vuelve a cambiar, es un comando,
 * no una cacería por 19 archivos.
 *
 *   node _build/migrations/patch-telefono.js
 *   node _build/migrations/patch-telefono.js --de "+34626276538" --a "+34600000000"
 *
 * Toca las 17 páginas, la copia de referencia del pie (_build/shell/footer.html,
 * sin la cual check-shell.js falla) y el contactPoint del JSON-LD en
 * _build/seo/meta.json. Después hay que pasar:
 *   node _build/seo-inject.js && node _build/check-shell.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const arg = (n, d) => {
  const i = process.argv.indexOf('--' + n);
  return i === -1 || !process.argv[i + 1] ? d : process.argv[i + 1];
};

const RAIZ = path.join(__dirname, '..', '..');

// Las dos formas en que vive un teléfono en este sitio: el href de tel: (sin
// espacios) y el texto visible (con ellos). Cambiar solo una deja un enlace que
// marca un número distinto del que se lee, que es peor que no cambiar nada.
const VIEJO_HREF = arg('de-href', '+34607836960');
const VIEJO_TEXTO = arg('de-texto', '+34 607 83 69 60');
const NUEVO_HREF = arg('a-href', '+34626276538');
const NUEVO_TEXTO = arg('a-texto', '+34 626 27 65 38');

function archivos(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      // panel/ es de otra sesión y además es una captura generada; el producto
      // no se comitea; node_modules ni se mira.
      if (['panel', 'holdera-product-hotel-operations-v1', 'node_modules', '.git', '.screenshots'].includes(e.name)) continue;
      archivos(p, acc);
    } else if (/\.(html|json)$/.test(e.name) && !/\.bak$/.test(e.name)) {
      acc.push(p);
    }
  }
  return acc;
}

const tocados = [];
for (const abs of archivos(RAIZ)) {
  // Las migraciones anteriores guardan el número viejo como parte de su
  // historia: reescribirlas sería falsear lo que hicieron.
  if (abs.includes(path.join('_build', 'migrations'))) continue;
  const antes = fs.readFileSync(abs, 'utf8');
  if (!antes.includes(VIEJO_HREF) && !antes.includes(VIEJO_TEXTO)) continue;
  const despues = antes.split(VIEJO_HREF).join(NUEVO_HREF).split(VIEJO_TEXTO).join(NUEVO_TEXTO);
  fs.writeFileSync(abs, despues);
  const n = (antes.split(VIEJO_HREF).length - 1) + (antes.split(VIEJO_TEXTO).length - 1);
  tocados.push({ rel: path.relative(RAIZ, abs), n });
}

if (!tocados.length) {
  console.log('\n  No se ha encontrado ' + VIEJO_HREF + ' en ninguna parte. ¿Ya estaba aplicado?\n');
  process.exit(1);
}

const total = tocados.reduce((s, t) => s + t.n, 0);
console.log('\n  ' + VIEJO_TEXTO + '  ->  ' + NUEVO_TEXTO);
console.log('  ' + total + ' sustituciones en ' + tocados.length + ' archivos:\n');
tocados.sort((a, b) => a.rel.localeCompare(b.rel)).forEach((t) => console.log('    ' + String(t.n).padStart(2) + '  ' + t.rel));
console.log('\n  Ahora: node _build/seo-inject.js  &&  node _build/check-shell.js\n');
