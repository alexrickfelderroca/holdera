/* HOLDERA — Geist y Geist Mono alojadas en el propio sitio.
 *
 * Por qué: la hoja de Google Fonts era un CSS externo que bloquea el render y
 * que el navegador solo descubre DESPUÉS de styles.css, y luego pide la fuente
 * a un segundo dominio. El H1 es el LCP de la página, así que ese doble viaje
 * se paga en cada visita. Geist es SIL OFL: se puede alojar.
 *
 * Uso:  node _build/fetch-fonts.js
 *   1. pide a Google Fonts el CSS con un User-Agent de Chrome (así entrega
 *      woff2 variable por subconjunto),
 *   2. descarga los subconjuntos latin y latin-ext de las dos familias a
 *      assets/fonts/,
 *   3. escribe _build/fonts/geist-faces.css con los @font-face listos para
 *      pegar en styles.css (con font-display: swap y los unicode-range).
 * Pesos: Geist 300–700 (variable) · Geist Mono 400–500 (variable).
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'fonts');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.join(__dirname, 'fonts'), { recursive: true });
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const CSS_URL = 'https://fonts.googleapis.com/css2?family=Geist:wght@300..700&family=Geist+Mono:wght@400..500&display=swap';

const get = (url, binary) => new Promise((resolve, reject) => {
  https.get(url, { headers: { 'User-Agent': UA } }, res => {
    if (res.statusCode !== 200) { reject(new Error(res.statusCode + ' ' + url)); return; }
    const chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end', () => resolve(binary ? Buffer.concat(chunks) : Buffer.concat(chunks).toString('utf8')));
  }).on('error', reject);
});

(async () => {
  const css = await get(CSS_URL, false);
  const faces = [];
  const re = /\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const subset = m[1];
    const body = m[2];
    const family = /font-family:\s*'([^']+)'/.exec(body)[1];
    const weight = /font-weight:\s*([^;]+);/.exec(body)[1].trim();
    const url = /url\(([^)]+)\)/.exec(body)[1];
    const range = /unicode-range:\s*([^;]+);/.exec(body)[1].trim();
    faces.push({ subset, family, weight, url, range });
  }
  const keep = faces.filter(f => f.subset === 'latin' || f.subset === 'latin-ext');
  if (keep.length !== 4) throw new Error('esperaba 4 subconjuntos (2 familias x latin/latin-ext), hay ' + keep.length);
  let out = `/* Geist + Geist Mono, alojadas aquí (SIL OFL). Generado por _build/fetch-fonts.js
   el ${new Date().toISOString().slice(0, 10)}: subconjuntos latin y latin-ext, variables en peso. */\n`;
  for (const f of keep) {
    const slug = f.family.toLowerCase().replace(/\s+/g, '-') + '-' + f.subset + '.woff2';
    const buf = await get(f.url, true);
    fs.writeFileSync(path.join(OUT, slug), buf);
    console.log(String(Math.round(buf.length / 1024)).padStart(4) + ' KB  ' + slug + '  (' + f.weight + ')');
    out += `@font-face {
  font-family: '${f.family}';
  font-style: normal;
  font-weight: ${f.weight};
  font-display: swap;
  src: url("assets/fonts/${slug}") format("woff2");
  unicode-range: ${f.range};
}\n`;
  }
  fs.writeFileSync(path.join(__dirname, 'fonts', 'geist-faces.css'), out);
  console.log('-> _build/fonts/geist-faces.css');
})().catch(e => { console.error(e.message); process.exit(1); });
