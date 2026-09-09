/* HOLDERA — Geist alojada en el sitio (08-09-2026). Idempotente.
 *
 *   node _build/migrations/patch-fonts.js [pagina.html ...]
 *
 * styles.css: inserta los @font-face de _build/fonts/geist-faces.css antes de
 *             :root (una sola vez).
 * páginas:    quita los dos preconnect a Google Fonts y el <link> de css2, y
 *             añade un preload del subconjunto latin de Geist justo después
 *             de styles.css. Sin argumentos toca todas las *.html de la raíz.
 * Antes: la hoja externa se descubría después de styles.css y la fuente
 * llegaba desde un segundo dominio — dos viajes que bloqueaban el H1 (LCP).
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const faces = fs.readFileSync(path.join(ROOT, '_build', 'fonts', 'geist-faces.css'), 'utf8');

/* ---- styles.css ---- */
const cssPath = path.join(ROOT, 'styles.css');
let css = fs.readFileSync(cssPath, 'utf8');
if (!css.includes("font-family: 'Geist';")) {
  const at = css.indexOf(':root {');
  if (at < 0) throw new Error('styles.css sin :root');
  css = css.slice(0, at) + faces + '\n' + css.slice(at);
  fs.writeFileSync(cssPath, css, 'utf8');
  console.log('styles.css: @font-face añadidos');
} else console.log('styles.css: ya tenía los @font-face');

/* ---- páginas ---- */
const args = process.argv.slice(2);
const pages = args.length ? args : fs.readdirSync(ROOT).filter(f => /\.html$/i.test(f) && !/\.bak$/i.test(f));
const PRELOAD = '<link rel="preload" href="assets/fonts/geist-latin.woff2" as="font" type="font/woff2" crossorigin>';
for (const p of pages) {
  const file = path.join(ROOT, p);
  if (!fs.existsSync(file)) { console.log(p + ': no existe'); continue; }
  let html = fs.readFileSync(file, 'utf8');
  const before = html;
  html = html.replace(/[ \t]*<link rel="preconnect" href="https:\/\/fonts\.g(?:oogleapis|static)\.com"[^>]*>\r?\n/g, '');
  html = html.replace(/[ \t]*<link[^>]*href="https:\/\/fonts\.googleapis\.com\/css2[^"]*"[^>]*>\r?\n/g, '');
  if (!html.includes(PRELOAD)) {
    const m = /([ \t]*)<link rel="stylesheet" href="styles\.css">\r?\n/.exec(html);
    if (!m) { console.log(p + ': sin <link> a styles.css — no se toca'); continue; }
    html = html.replace(m[0], m[0] + m[1] + PRELOAD + '\n');
  }
  if (html !== before) { fs.writeFileSync(file, html, 'utf8'); console.log(p + ': fuentes locales'); }
  else console.log(p + ': sin cambios');
}
