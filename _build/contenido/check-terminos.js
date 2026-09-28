#!/usr/bin/env node
/*
 * _build/contenido/check-terminos.js — PUERTA: cada término en negrita tiene
 * su ventana.
 *
 *   node _build/contenido/check-terminos.js      (sale con 1 si algo falla)
 *
 * El encargo del paso 14 es que TODO término técnico del sitio lleve su
 * definición al pasar el cursor. Esto lo comprueba sobre los archivos reales,
 * página por página:
 *   1. cada data-term de cada página existe en glosario.json;
 *   2. no queda ningún marcador [[…]] sin convertir (se vería tal cual);
 *   3. toda página con algún término carga terminos.js (si no, no hay ventana);
 *   4. el bloque terms:data de terminos.js es EXACTAMENTE lo que sale hoy de
 *      glosario.json (un glosario editado sin volver a generar deja ventanas
 *      con la definición vieja, y eso no lo ve nadie mirando la página);
 *   5. y ninguna definición está vacía.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const lib = require('./terminos-lib');
const { pages, ROOT } = require('../site-pages');

let fallos = 0;
const fallo = (m) => { console.log('FALLO  ' + m); fallos++; };

for (const t of lib.DATA.terminos) {
  if (!t.def || !t.def.trim()) fallo(`glosario.json: "${t.id}" no tiene definición`);
  if (!t.def_en || !t.def_en.trim()) fallo(`glosario.json: "${t.id}" no tiene def_en (la usan las ventanas del panel)`);
}

let conTerminos = 0;
let total = 0;
for (const p of pages) {
  const html = fs.readFileSync(path.join(ROOT, p), 'utf8');
  const body = html.slice(html.indexOf('<body'));
  const usados = [...body.matchAll(/data-term="([^"]+)"/g)].map((m) => m[1]);
  for (const id of usados) if (!lib.term(id)) fallo(`${p}: data-term="${id}" no existe en glosario.json`);
  const visible = body.replace(/<script[\s\S]*?<\/script>/g, '');
  if (visible.indexOf('[[') >= 0) fallo(`${p}: queda un marcador [[…]] sin convertir`);
  if (usados.length) {
    conTerminos++;
    total += usados.length;
    if (!/<script src="terminos\.js(\?v=[0-9a-f]+)?" defer><\/script>/.test(html)) fallo(`${p}: tiene ${usados.length} términos y no carga terminos.js`);
  }
}

const js = fs.readFileSync(path.join(ROOT, 'terminos.js'), 'utf8');
const m = /\/\* terms:data-start \*\/\s*var T = ([\s\S]*?);\s*\/\* terms:data-end \*\//.exec(js);
if (!m) fallo('terminos.js: no encuentro el bloque terms:data');
else {
  let datos = null;
  try { datos = JSON.parse(m[1]); } catch (e) { fallo('terminos.js: el bloque terms:data no es JSON: ' + e.message); }
  if (datos && JSON.stringify(datos) !== JSON.stringify(lib.runtimeData())) {
    fallo('terminos.js está desfasado respecto a glosario.json: node _build/contenido/build-funciones.js');
  }
}

console.log(`${conTerminos} páginas con términos, ${total} términos marcados, ${lib.DATA.terminos.length} en el glosario.`);
console.log(fallos ? `${fallos} fallo(s).` : 'Todo término marcado tiene su definición.');
process.exit(fallos ? 1 : 0);
