/* HOLDERA — copia la cabecera, el drawer y el pie de _build/shell/ a las 7 páginas.
 *
 * `check-shell.js` COMPRUEBA que las copias coinciden; esto las HACE. Existe
 * porque un cambio de nav son 21 bloques idénticos repartidos por siete
 * archivos, y a mano siempre se queda uno a medias.
 *
 * Aplica las tres diferencias permitidas, las mismas que check-shell.js
 * normaliza al comparar:
 *   1. en index.html los enlaces a la propia página son anclas;
 *   2. el enlace de la página actual lleva class="is-active" aria-current="page";
 *   3. la indentación de cada bloque se conserva tal cual viene del shell.
 *
 * Uso: node _build/replicate-shell.js   (y después node _build/check-shell.js)
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SHELL = path.join(__dirname, 'shell');
const PAGES = ['index.html', 'nosotros.html', 'partners.html', 'contacto.html', 'aviso-legal.html', 'privacidad.html', '404.html'];

const SNIPPETS = {
  header: { file: 'header.html', start: '<header class="nav"', end: '</header>' },
  drawer: { file: 'drawer.html', start: '<div class="drawer"', end: '<!-- /drawer -->' },
  footer: { file: 'footer.html', start: '<footer class="footer">', end: '</footer>' },
};

/** El href que marca "estás aquí" en cada página. */
const SELF = {
  'index.html': 'index.html',
  'nosotros.html': 'nosotros.html',
  'partners.html': 'partners.html',
  'contacto.html': 'contacto.html',
};

function forPage(text, page, snippet) {
  let out = text;
  if (page === 'index.html') {
    out = out.replace(/href="index\.html#/g, 'href="#').replace(/href="index\.html"/g, 'href="#inicio"');
  }
  const self = SELF[page];
  // "Estás aquí" se marca SOLO en la nav principal. Marcarlo también en el
  // drawer y en el pie deja tres aria-current="page" en la misma página, que
  // para un lector de pantalla es ruido, no ayuda.
  if (self && snippet === 'header') {
    const href = page === 'index.html' ? '#inicio' : self;
    out = out.replace(`<a href="${href}">`, `<a href="${href}" class="is-active" aria-current="page">`);
  }
  return out;
}

let changed = 0;
for (const page of PAGES) {
  const file = path.join(ROOT, page);
  if (!fs.existsSync(file)) { console.log(`SKIP ${page} (no existe)`); continue; }
  let html = fs.readFileSync(file, 'utf8');
  for (const [name, s] of Object.entries(SNIPPETS)) {
    const ref = fs.readFileSync(path.join(SHELL, s.file), 'utf8').replace(/\s+$/, '');
    const a = html.indexOf(s.start);
    if (a < 0) { console.log(`FAIL ${page}: falta ${name}`); process.exitCode = 1; continue; }
    let b = html.indexOf(s.end, a);
    if (b < 0) { console.log(`FAIL ${page}: ${name} sin cierre`); process.exitCode = 1; continue; }
    b += s.end.length;
    // El bloque de referencia empieza con su propia indentación; hay que
    // respetar la que ya tiene la página en la primera línea.
    const lineStart = html.lastIndexOf('\n', a) + 1;
    const indent = html.slice(lineStart, a);
    const body = forPage(ref, page, name).replace(/^\s+/, '');
    const next = html.slice(0, lineStart) + indent + body + html.slice(b);
    if (next !== html) { html = next; changed++; }
  }
  fs.writeFileSync(file, html);
  console.log(`OK   ${page}`);
}
console.log(`\n${changed} bloque(s) reescrito(s)`);
