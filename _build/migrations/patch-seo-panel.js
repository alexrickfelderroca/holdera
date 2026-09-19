/**
 * patch-seo-panel.js — paso 9 (19-09-2026)
 *
 * `panel.html` ya no existe: el panel demo es ahora el producto real capturado
 * en `/panel/` (259 archivos estaticos). Esta migracion saca la pagina vieja de
 * la capa SEO y apunta el sitemap a la entrada nueva.
 *
 * Lo que NO hace, a proposito: meter las 259 paginas del panel en `meta.json`.
 * Son salida del producto, no paginas del sitio: no llevan el bloque
 * `<!-- seo:head -->` que reescribe `seo-inject.js`, y 258 de ellas van con
 * `noindex,follow` puesto por `snapshot-panel.js`.
 *
 * De un solo uso: falla si ya se aplico.
 * Uso: node _build/migrations/patch-seo-panel.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const steps = [];

function edit(rel, fn) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) { steps.push([rel, 'NO EXISTE']); return; }
  const before = fs.readFileSync(file, 'utf8');
  const after = fn(before);
  if (after === before) { steps.push([rel, 'sin cambios']); return; }
  fs.writeFileSync(file, after, 'utf8');
  steps.push([rel, 'actualizado']);
}

/** Nunca String.replace con '$$' en el reemplazo. */
const swap = (text, from, to) => text.split(from).join(to);

// 1. meta.json: fuera la entrada de panel.html.
edit('_build/seo/meta.json', (text) => {
  const data = JSON.parse(text);
  const list = Array.isArray(data) ? data : data.pages;
  const idx = list.findIndex((p) => p.file === 'panel.html');
  if (idx === -1) return text;
  list.splice(idx, 1);
  return JSON.stringify(data, null, 2) + '\n';
});

// 2. sitemap.xml: la entrada del panel es ahora /panel/.
edit('sitemap.xml', (text) =>
  swap(text, 'https://holdera.es/panel.html', 'https://holdera.es/panel/')
);

// 3. version-assets.js: ya no hay panel.html que sellar.
edit('_build/version-assets.js', (text) =>
  swap(text, "'aviso-legal.html', 'privacidad.html', '404.html', 'panel.html',",
             "'aviso-legal.html', 'privacidad.html', '404.html',")
);

// 4. validate-meta.js: la regla que exigia WebApplication en panel.html.
edit('_build/seo/validate-meta.js', (text) => {
  const line = text.split('\n').find((l) => l.includes("page.file === 'panel.html'"));
  if (!line) return text;
  const start = text.indexOf(line);
  const end = text.indexOf('\n', start) + 1;
  return text.slice(0, start) + text.slice(end);
});

// 5. seo-inject.js: solo es un ejemplo de uso en la cabecera.
edit('_build/seo-inject.js', (text) =>
  swap(text, '--only index.html,panel.html', '--only index.html,contacto.html')
);

for (const [rel, msg] of steps) console.log(`  ${rel.padEnd(32)} ${msg}`);
console.log('');

const changed = steps.filter((s) => s[1] === 'actualizado').length;
if (changed === 0) {
  console.error('ERROR: 0 archivos cambiados. O ya se aplico, o el texto cambio.');
  process.exit(1);
}
console.log(`OK: ${changed} archivos actualizados`);
