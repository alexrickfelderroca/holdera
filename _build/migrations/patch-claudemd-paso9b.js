/**
 * patch-claudemd-paso9b.js — paso 9 (19-09-2026), segunda tanda
 *
 * Los bloques grandes del panel demo retirado que quedaban en CLAUDE.md.
 *
 * Dos matices que marco la verificacion adversaria:
 *   - La trampa del `.sr-only` dentro de una tabla con scroll NO se borra: la
 *     leccion sigue viva (el panel nuevo son 259 paginas llenas de tablas
 *     anchas con scroll). Solo se quita el nombre de clase `.pn-main`.
 *   - La trampa del noindex tampoco se borra: se reescribe para el panel nuevo,
 *     donde la decision es la misma (la ENTRADA se indexa) pero con un matiz
 *     que antes no existia (las otras 258 llevan noindex,follow).
 *   - «Un campo de formulario blanco sobre un panel casi blanco» se queda: ese
 *     «panel» es la tarjeta del formulario de contacto, no el panel demo.
 *
 * De un solo uso: falla si ya se aplico.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const FILE = path.join(ROOT, 'CLAUDE.md');

/** Nunca String.replace con '$$' en el reemplazo: se come los dolares. */
const swap = (text, from, to) => text.split(from).join(to);

let text = fs.readFileSync(FILE, 'utf8');
const lines = text.split('\n');

/** Borra la linea completa que empieza por `prefix`. */
function dropLine(prefix, label) {
  const idx = lines.findIndex((l) => l.startsWith(prefix));
  if (idx === -1) { console.log(`  no encontrado: ${label}`); return false; }
  lines.splice(idx, 1);
  console.log(`  borrada: ${label}`);
  return true;
}

let n = 0;
n += dropLine('- **Panel (`panel.css`)**:', 'bloque de tokens --pn-*') ? 1 : 0;
n += dropLine('- `panel.html` + `panel.css` + `panel.js` + `panel-data.js`', 'entrada de archivos del panel viejo') ? 1 : 0;

text = lines.join('\n');

const EDITS = [
  // la tarjeta social del panel viejo, fuera de la lista de assets
  [
    '- `assets/seo/og-default.png`, `og-panel.png` (1200×630)',
    '- `assets/seo/og-default.png` (1200×630)',
  ],
  // el titulo de la seccion de trampas del paso 5
  [
    '## Trampas del paso 5 (bugs, páginas, panel, SEO)',
    '## Trampas del paso 5 (bugs, páginas, SEO)',
  ],
  // main override: ya no hay panel.css
  [
    'toda página nueva tiene que sobreescribirlo (`pages.css` y `panel.css` lo hacen).',
    'toda página nueva tiene que sobreescribirlo (`pages.css` lo hace).',
  ],
  // la leccion del .sr-only se queda; se va el nombre de clase del panel viejo
  [
    '- **Un `.sr-only` posicionado en absoluto dentro de una tabla con scroll toma como contenedor a `.pn-main`** salvo que el envoltorio con scroll sea `position: relative`;',
    '- **Un `.sr-only` posicionado en absoluto dentro de una tabla con scroll toma como contenedor el contenedor de la app** salvo que el envoltorio con scroll sea `position: relative`;',
  ],
  // la trampa del noindex, reescrita para el panel nuevo
  [
    '- **El panel NO lleva `noindex`.** El constructor se lo puso por prudencia y Lighthouse bajó a SEO 66; es una página de marketing (título «Panel de control con IA para tu empresa (demo)») y `meta.json` la tiene como indexable con `WebApplication` en su JSON-LD.',
    '- **La ENTRADA del panel no lleva `noindex`, y las otras 258 sí.** Ponerle `noindex` a una página de marketing baja Lighthouse a SEO 66, así que `/panel/` se indexa; las 258 páginas de dentro llevan `noindex,follow` porque son la misma demo vista por dentro («Room 407 · Holdera Demo Hotel»), en inglés y de un hotel que no existe. Lo escribe `snapshot-panel.js`, no `seo-inject.js`.',
  ],
];

for (const [from, to] of EDITS) {
  if (!text.includes(from)) { console.log(`  no encontrado: ${from.replace(/\s+/g, ' ').slice(0, 56)}`); continue; }
  text = swap(text, from, to);
  n++;
  console.log(`  reescrita: ${from.replace(/\s+/g, ' ').slice(0, 56)}`);
}

fs.writeFileSync(FILE, text, 'utf8');
console.log('');
if (n === 0) { console.error('ERROR: 0 cambios.'); process.exit(1); }
console.log(`OK: ${n} cambios`);
