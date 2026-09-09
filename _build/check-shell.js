/* HOLDERA — guardia de la cabecera, el menú lateral y el pie compartidos.
 *
 * Las páginas son HTML estático sin build, así que la nav, el drawer y el
 * footer están COPIADOS en cada archivo. Este script comprueba que todas las
 * copias siguen siendo la misma que la de referencia en _build/shell/, salvo
 * las tres diferencias permitidas:
 *   1. en index.html los enlaces a la propia página son anclas (#servicios en
 *      vez de index.html#servicios, y "#inicio" en vez de "index.html");
 *   2. el enlace de la página actual lleva class="is-active" aria-current="page";
 *   3. espacios en blanco al principio de cada línea.
 * Sale con código 1 si alguna copia difiere. Uso: node _build/check-shell.js
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const SHELL = path.join(__dirname, 'shell');
const PAGES = ['index.html', 'nosotros.html', 'partners.html', 'contacto.html', 'aviso-legal.html', 'privacidad.html', '404.html'];

const norm = s => s
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/href="index\.html#/g, 'href="#')
  .replace(/href="index\.html"/g, 'href="#inicio"')
  .replace(/\s*class="is-active"\s*aria-current="page"/g, '')
  .replace(/\s*aria-current="page"\s*class="is-active"/g, '')
  .replace(/ class="([^"]*?) is-active"/g, ' class="$1"')
  .split('\n').map(l => l.trim()).filter(Boolean).join('\n');

const snippets = {
  header: { file: 'header.html', start: '<header class="nav"', end: '</header>' },
  drawer: { file: 'drawer.html', start: '<div class="drawer"', end: '<!-- /drawer -->' },
  footer: { file: 'footer.html', start: '<footer class="footer">', end: '</footer>' },
};

let failed = 0;
for (const [name, s] of Object.entries(snippets)) {
  const ref = norm(fs.readFileSync(path.join(SHELL, s.file), 'utf8'));
  for (const page of PAGES) {
    const file = path.join(ROOT, page);
    if (!fs.existsSync(file)) { console.log('SKIP ' + page + ' (no existe)'); continue; }
    const html = fs.readFileSync(file, 'utf8');
    const a = html.indexOf(s.start);
    if (a < 0) { console.log('FAIL ' + page + ': falta ' + name); failed++; continue; }
    let b = html.indexOf(s.end, a);
    if (b >= 0) b += s.end.length;
    if (b < 0) { console.log('FAIL ' + page + ': ' + name + ' sin cierre'); failed++; continue; }
    const got = norm(html.slice(a, b));
    if (got === ref) { console.log('OK   ' + page + ' ' + name); continue; }
    failed++;
    const gl = got.split('\n'), rl = ref.split('\n');
    let i = 0; while (i < gl.length && i < rl.length && gl[i] === rl[i]) i++;
    console.log('FAIL ' + page + ' ' + name + ' difiere en la línea ' + (i + 1) + ' del fragmento:');
    console.log('   página: ' + (gl[i] || '(fin)').slice(0, 140));
    console.log('   shell : ' + (rl[i] || '(fin)').slice(0, 140));
  }
}
console.log(failed ? '\n' + failed + ' diferencia(s)' : '\ntodas las copias coinciden');
process.exit(failed ? 1 : 0);
