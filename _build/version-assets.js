/* version-assets.js — sella los CSS y JS del sitio con el hash de su contenido.
 *
 * POR QUE EXISTE (paso 8):
 * El `.htaccess` cachea css y js SIETE DIAS (`max-age=604800`) y el HTML se
 * revalida siempre (`max-age=0`). Eso significa que tras un despliegue, quien
 * haya visitado holdera.es en la ultima semana recibe el HTML NUEVO con el CSS
 * VIEJO. No es teorico: medido en vivo justo despues del despliegue del paso 8,
 * https://holdera.es/styles.css devolvia 87.194 bytes (la version anterior)
 * mientras que https://holdera.es/styles.css?x=1 devolvia 96.117 (la nueva).
 * El CDN de Hostinger (`Server: hcdn`) sirve la copia rancia en la URL canonica
 * y solo va a origen cuando la URL cambia.
 *
 * Un HTML nuevo con un CSS viejo es PEOR que no desplegar: en el paso 8, las
 * cinco fotos nuevas del deck salen sin la regla que las oculta en escritorio.
 *
 * La solucion correcta no es purgar la cache a mano cada vez (se olvida), sino
 * que la URL cambie sola cuando cambia el archivo. Cada asset lleva `?v=<hash>`
 * con los 8 primeros caracteres del sha1 de su contenido: si el archivo no
 * cambia, la URL no cambia y la cache de 7 dias sigue haciendo su trabajo; si
 * cambia, la URL es nueva y el CDN va a origen.
 *
 * Es IDEMPOTENTE y re-ejecutable: reescribe el `?v=` que ya hubiera. Se pasa
 * despues de cualquier cambio en un css o un js, junto a las demas puertas.
 *
 * Solo toca rutas LOCALES: cdnjs y demas externos se quedan como estan.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const PAGES = [
  'index.html', 'nosotros.html', 'partners.html', 'contacto.html',
  'aviso-legal.html', 'privacidad.html', '404.html', 'panel.html',
];

const hashes = new Map();
function hashOf(file) {
  if (hashes.has(file)) return hashes.get(file);
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) return null;
  const h = crypto.createHash('sha1').update(fs.readFileSync(full)).digest('hex').slice(0, 8);
  hashes.set(file, h);
  return h;
}

// href="algo.css" | href="algo.css?v=abc" | src="algo.js" | src="algo.js?v=abc"
// Solo rutas relativas sin barra ni protocolo: nada de //cdn, http, /abs.
const RE = /\b(href|src)="(?!https?:|\/\/|\/)([A-Za-z0-9_\-./]+\.(?:css|js))(?:\?v=[0-9a-f]+)?"/g;

let changed = 0;
const report = [];

for (const page of PAGES) {
  const file = path.join(ROOT, page);
  if (!fs.existsSync(file)) { console.error('ABORTADO: falta ' + page); process.exit(1); }
  const before = fs.readFileSync(file, 'utf8');
  const seen = [];
  const after = before.replace(RE, (match, attr, asset) => {
    const h = hashOf(asset);
    if (!h) { seen.push(asset + ' (NO EXISTE, sin sellar)'); return match; }
    seen.push(asset + ' -> ' + h);
    return `${attr}="${asset}?v=${h}"`;
  });
  if (after !== before) { fs.writeFileSync(file, after); changed++; }
  report.push({ page, assets: seen });
}

for (const r of report) {
  console.log(r.page);
  r.assets.forEach(a => console.log('   ' + a));
}
console.log('');
console.log(changed ? `${changed} pagina(s) actualizadas.` : 'Ya estaban todas selladas con el hash actual.');
console.log(`${hashes.size} asset(s) distintos.`);
