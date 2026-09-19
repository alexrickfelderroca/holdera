/**
 * patch-purgar-panel-viejo.js — paso 9 (19-09-2026)
 *
 * Saca del tooling toda referencia al panel demo retirado. Todas las entradas
 * que se tocan aqui YA estaban inertes: tanto `check-tokens.js` como
 * `contrast.js` filtran su lista de archivos con `existsSync`, asi que los
 * cuatro archivos borrados se caian solos y las cuatro reglas de la lista
 * blanca no las consultaba nadie. Verificado antes y despues: las cuatro
 * puertas salen 0.
 *
 * Lo que NO toca, a proposito (lo cazo la verificacion adversaria):
 *   - `contrast.js` `const PANEL = ['.drawer__panel', 'background']` — es el
 *     DRAWER lateral, base de medida de cuatro comprobaciones vivas. Borrarlo
 *     revienta el script con ReferenceError.
 *   - la fila `WebApplication` de `validate-meta.js` — es una tabla generica de
 *     campos obligatorios, y es justo el tipo que llevara el panel NUEVO. Sin
 *     ella, ese nodo pasaria el validador sin comprobar nada y en silencio.
 *   - el codigo bajo los comentarios de `check-tokens.js` (bucle multi-:root,
 *     matcher de plantillas, `isFamilyPrefix`): solo se reescribe el texto.
 *
 * De un solo uso: falla si ya se aplico.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const report = [];

/** Nunca String.replace con '$$' en el reemplazo: se come los dolares. */
const swap = (text, from, to) => text.split(from).join(to);

function edit(rel, pairs) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) { report.push([rel, 'NO EXISTE']); return 0; }
  let text = fs.readFileSync(file, 'utf8');
  let hits = 0;
  for (const [from, to] of pairs) {
    if (!text.includes(from)) continue;
    text = swap(text, from, to);
    hits++;
  }
  if (hits) fs.writeFileSync(file, text, 'utf8');
  report.push([rel, hits ? `${hits}/${pairs.length} sustituciones` : 'sin cambios']);
  return hits;
}

let total = 0;

// --- check-tokens.js: listas de archivos + comentarios que nombran el panel ---
total += edit('_build/check-tokens.js', [
  [
    "const CSS_FILES = ['styles.css', 'pages.css', 'panel.css'].filter(exists);",
    "const CSS_FILES = ['styles.css', 'pages.css'].filter(exists);",
  ],
  [
    "const JS_FILES = ['brain.js', 'fish.js', 'planet.js', 'script.js', 'waves.js', 'panel.js', 'panel-data.js'].filter(exists);",
    "const JS_FILES = ['brain.js', 'fish.js', 'planet.js', 'script.js', 'waves.js'].filter(exists);",
  ],
  [
    '(site tokens), pages.css (inner pages, --pg-* tokens) and panel.css (the\n   demo panel, --pn-* tokens). Each may carry its own :root block; a token',
    '(site tokens) and pages.css (inner pages, --pg-* tokens). Each may carry\n   its own :root block; a token',
  ],
  [
    'declare :root more than once (panel.css keeps semantic tokens apart from',
    'declare :root more than once (a stylesheet may keep semantic tokens apart from',
  ],
  [
    'a style string (the panel writes chart colours that way). */',
    'a style string. */',
  ],
  [
    "/* A script may BUILD a token name from a prefix ('--pn-s' + i for the five\n   chart series). The literal '--pn-s' is then a reference to the family, not",
    "/* A script may BUILD a token name from a prefix ('--x-s' + i for a family of\n   numbered tokens). The literal prefix is then a reference to the family, not",
  ],
]);

// --- contrast.js: lista de hojas + lista blanca de reglas del panel ---
total += edit('_build/contrast.js', [
  [
    "const cssFiles = ['styles.css', 'pages.css', 'panel.css']",
    "const cssFiles = ['styles.css', 'pages.css']",
  ],
]);

// --- build-og.js: la tarjeta social del panel viejo ---
total += edit('_build/seo/build-og.js', [
  ["  { html: 'og-panel.html', png: 'og-panel.png' },\n", ''],
]);

// --- script.js y su migracion: comentario que nombra el panel viejo ---
const navComment = [
  "// the fixed bar (paso 6); the panel has none",
  "// the fixed bar (paso 6)",
];
total += edit('script.js', [navComment]);
total += edit('_build/migrations/patch-step6.js', [navComment]);

// --- snapshot-panel.js: la nota que compara con el panel viejo ---
total += edit('_build/snapshot-panel.js', [
  [
    ' * (El panel viejo NO llevaba noindex a proposito: era UNA pagina de marketing y\n * ponerselo bajo Lighthouse a SEO 66. Aqui la entrada conserva ese trato.)',
    ' * (La entrada se indexa a proposito: ponerle noindex a una pagina de marketing\n * baja Lighthouse a SEO 66.)',
  ],
]);

for (const [rel, msg] of report) console.log(`  ${rel.padEnd(36)} ${msg}`);
console.log('');
if (total === 0) {
  console.error('ERROR: 0 sustituciones. O ya se aplico, o el texto cambio.');
  process.exit(1);
}
console.log(`OK: ${total} sustituciones`);
