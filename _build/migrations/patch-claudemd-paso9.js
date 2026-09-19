/**
 * patch-claudemd-paso9.js — paso 9 (19-09-2026)
 *
 * Saca el panel demo retirado de la memoria del proyecto (CLAUDE.md) y de la
 * lista de comprobacion de SEO.
 *
 * Lo que NO se toca, porque «panel» esta sobrecargado en este repo y borrarlo
 * seria una regresion silenciosa (lo cazo la verificacion adversaria):
 *   - el token `--panel` (la superficie opaca del drawer, viva en styles.css)
 *   - los «paneles» de obra del escaparate (.sc__img) y el panel `-b` del deck
 *   - hPanel / «el panel de Hostinger» / «el panel del sitio»
 *   - «panel del pecho» del robot
 *   - la ETIQUETA de nav «Panel demo», que sobrevive y ahora apunta a /panel/:
 *     borrarla dejaria la nav documentada en desacuerdo con la real
 *   - la trampa del `.sr-only` dentro de una tabla con scroll: la LECCION sigue
 *     siendo valida (el panel nuevo esta lleno de tablas anchas con scroll);
 *     solo se quita el nombre de clase `.pn-main`
 *
 * De un solo uso: falla si ya se aplico.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

/** Nunca String.replace con '$$' en el reemplazo: se come los dolares. */
const swap = (text, from, to) => text.split(from).join(to);

function apply(rel, pairs) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) { console.log(`  ${rel}: NO EXISTE`); return 0; }
  let text = fs.readFileSync(file, 'utf8');
  let hits = 0;
  const missed = [];
  for (const [from, to] of pairs) {
    if (!text.includes(from)) { missed.push(String(from).replace(/\s+/g, ' ').slice(0, 58)); continue; }
    text = swap(text, from, to);
    hits++;
  }
  fs.writeFileSync(file, text, 'utf8');
  console.log(`  ${rel}: ${hits}/${pairs.length} sustituciones`);
  for (const m of missed) console.log(`      no encontrado: ${m}`);
  return hits;
}

let total = 0;

total += apply('CLAUDE.md', [
  // --- paso 5: el panel deja de ser uno de sus entregables ---
  [
    '- **Paso 5 (hecho, 08-09-2026): sitio completo — bugs, páginas interiores, panel demo y SEO.**',
    '- **Paso 5 (hecho, 08-09-2026): sitio completo — bugs, páginas interiores y SEO.**',
  ],
  // --- paso 5, item 6: el panel entero fuera, y renumerar los que siguen ---
  [
    '  6. **Panel demo** (`panel.html` + `panel.css` + `panel.js` + `panel-data.js`): «Así podría ser tu panel», un panel de empresa ficticio y vivo (resumen, leads/CRM, bandeja unificada, agenda, finanzas, marketing, web y SEO, diagrama de automatizaciones, asistente IA, conexiones), con etiqueta «Datos de demostración» siempre visible y estado en `localStorage`.\n  7. **SEO técnico**',
    '  6. **SEO técnico**',
  ],
  ['\n  8. **Geist alojada en el sitio**', '\n  7. **Geist alojada en el sitio**'],

  // --- paso 8: los dos arreglos que eran del panel viejo ---
  [
    '  5. **iOS hacía zoom al tocar cualquier campo**: estaban a 15px (13,5px en el panel) y Safari amplía por debajo de 16px sin volver solo.',
    '  5. **iOS hacía zoom al tocar cualquier campo**: estaban a 15px y Safari amplía por debajo de 16px sin volver solo.',
  ],
  [
    '  8. **El diagrama del panel a 4,4px**: `viewBox` de 860×470 metido en 312px = escala 0,363. Ahora 1:1 con scroll lateral propio, el patrón que ya usan sus tablas anchas.\n  9. **Dos controles del panel sin nombre accesible en móvil** (`display: none` sobre su texto, quedaba solo un `<svg aria-hidden>`). Panel móvil **a11y 91 → 100**. No salía en escritorio: por eso el 100/100/100 del paso 5 no lo vio.\n  10. **Ergonomía táctil**',
    '  8. **Ergonomía táctil**',
  ],
  ['\n  11. **Batería**', '\n  9. **Batería**'],
  ['\n  12. **SEO 92 → 100**', '\n  10. **SEO 92 → 100**'],
  ['\n  13. 🔴 **Sellado de assets', '\n  11. 🔴 **Sellado de assets'],
  [
    '  - **Resultado**: Lighthouse móvil en **https://holdera.es 100/100/100/100** con 0 fallos; contacto, nosotros y panel igual. Las 4 puertas pasan. 7 páginas + panel a 390x844 y 360x640:',
    '  - **Resultado**: Lighthouse móvil en **https://holdera.es 100/100/100/100** con 0 fallos; contacto y nosotros igual. Las 4 puertas pasan. Las 7 páginas a 390x844 y 360x640:',
  ],

  // --- Stack / tokens / archivos ---
  [
    '- Siete páginas estáticas que comparten `styles.css` (+ `pages.css` las interiores, + `panel.css` el panel).',
    '- Siete páginas estáticas que comparten `styles.css` (+ `pages.css` las interiores).',
  ],
  [
    '- Capas alfa (`--w-*`, `--k-*`, `--accent-a*`, `--scrim`, `--panel`, `--fab-bg`, `--bar-a/b`)',
    '- Capas alfa (`--w-*`, `--k-*`, `--accent-a*`, `--panel`, `--bar-a/b`)',
  ],
  [
    '- **Páginas interiores**: `pages.css` define sus tokens propios con prefijo `--pg-*` en su `:root`; el panel, `--pn-*` en `panel.css`. `check-tokens.js` escanea los tres CSS y todas las páginas.',
    '- **Páginas interiores**: `pages.css` define sus tokens propios con prefijo `--pg-*` en su `:root`. `check-tokens.js` escanea los dos CSS y todas las páginas.',
  ],
  [
    ' `--sh-surface-3`, `--w-40` y `--scrim` se retiraron y **volvieron** porque `panel.css` los lee: siguen en `:root` de `styles.css` con esa nota.',
    ' `--sh-surface-3`, `--w-40` y `--scrim` volvieron una temporada porque los leía el panel demo retirado; en el paso 9 se fueron del todo.',
  ],
]);

console.log('');
if (total === 0) {
  console.error('ERROR: 0 sustituciones. O ya se aplico, o el texto cambio.');
  process.exit(1);
}
console.log(`OK: ${total} sustituciones`);
