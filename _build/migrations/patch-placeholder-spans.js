/* patch-placeholder-spans.js — migracion de una sola ejecucion (paso 8, movil).
 *
 * Por que: los datos de contacto son marcadores «[… por confirmar]» a proposito
 * (decision de Alex, ver CLAUDE.md). En el paso 7 se les quito el href porque
 * apuntaban a URLs reales de terceros (instagram.com/PENDIENTE, wa.me/PENDIENTE),
 * pero se quedaron como <a> SIN href.
 *
 * Un <a> sin href no es un enlace: no es enfocable, no tiene rol de enlace y no
 * lleva a ninguna parte. Lighthouse lo marca — auditoria `crawlable-anchors`,
 * el UNICO fallo que quedaba: SEO 92 en movil, con los cuatro marcadores del
 * pie citados por nombre en el informe.
 *
 * El arreglo correcto es el elemento correcto: <span>. El estilo no cambia
 * (la regla es [data-placeholder], por atributo, no por etiqueta), el texto no
 * cambia y check-placeholders.js los sigue contando igual. `rel="noopener"` se
 * cae con el <a>: en un <span> no significa nada.
 *
 * Falla si se repite (no quedaria ningun <a data-placeholder> que convertir).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const FILES = [
  'index.html', 'nosotros.html', 'partners.html', 'contacto.html',
  'aviso-legal.html', 'privacidad.html', '404.html',
  path.join('_build', 'shell', 'footer.html'),
];

// <a ...data-placeholder="x"...>texto</a>  ->  <span data-placeholder="x">texto</span>
// Solo toca anclas que (a) llevan data-placeholder y (b) NO llevan href.
const RE = /<a\s+([^>]*?)>([^<]*)<\/a>/g;

let total = 0;
const perFile = [];

for (const rel of FILES) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) { console.error('ABORTADO: falta ' + rel); process.exit(1); }
  const before = fs.readFileSync(file, 'utf8');
  let n = 0;
  const after = before.replace(RE, (match, attrs, text) => {
    if (!/data-placeholder/.test(attrs)) return match;
    if (/\bhref\s*=/.test(attrs)) return match;   // un marcador YA relleno: no tocar
    const kept = attrs
      .replace(/\s*\brel\s*=\s*"[^"]*"/g, '')     // rel no aplica a un span
      .trim();
    n++;
    return '<span ' + kept + '>' + text + '</span>';
  });
  if (n) fs.writeFileSync(file, after);
  perFile.push(rel + ': ' + n);
  total += n;
}

if (!total) {
  console.error('ABORTADO: no habia ningun <a data-placeholder> sin href. Migracion ya aplicada.');
  process.exit(1);
}

console.log(perFile.join('\n'));
console.log('---');
console.log('OK: ' + total + ' marcadores convertidos de <a> sin href a <span>.');
