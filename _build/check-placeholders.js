/* HOLDERA — inventario de lo que sigue sin confirmar antes de publicar.
 *
 * Lista, página por página, los marcadores de datos pendientes:
 *   · enlaces [data-placeholder] (email, teléfono, WhatsApp, Instagram…)
 *   · textos "[… por confirmar]" / "[Razón social]" / "PENDIENTE"
 *   · comentarios <!-- TODO … -->
 * No falla (exit 0): es una lista para Alex, no una puerta. Con --strict sale
 * con 1 si queda algún marcador, para el día que se publique.
 *   node _build/check-placeholders.js [--strict]
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const strict = process.argv.includes('--strict');
const pages = fs.readdirSync(root).filter(f => /\.html$/i.test(f) && !/\.bak$/i.test(f)).sort();
let total = 0;
for (const f of pages) {
  const html = fs.readFileSync(path.join(root, f), 'utf8');
  const lines = html.split('\n');
  const hits = [];
  lines.forEach((l, i) => {
    if (/data-placeholder=|\[[^\]\n]*por confirmar\]|PENDIENTE|\[(Razón social|NIF|Domicilio[^\]]*|Nombre del fundador|fecha|Registro mercantil)\]/i.test(l)) hits.push((i + 1) + ': ' + l.trim().slice(0, 110));
    else if (/<!--\s*TODO/i.test(l)) hits.push((i + 1) + ': ' + l.trim().slice(0, 110));
  });
  if (!hits.length) continue;
  total += hits.length;
  console.log('\n' + f + ' (' + hits.length + ')');
  hits.forEach(h => console.log('   ' + h));
}
console.log('\n' + total + ' marcador(es) pendiente(s)');
process.exit(strict && total ? 1 : 0);
