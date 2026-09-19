/* HOLDERA — genera _build/shell/drawer.html.
 *
 * El drawer es una marquesina: cada fila repite sus palabras DOS veces con
 * una tesela entre palabra y palabra, y escribirlo a mano son 56 URLs por
 * página copiadas ocho veces. Se genera para que cambiar el texto de una
 * fila sea cambiar una línea aquí y volver a pasar
 * `node _build/shell/build-drawer.js` + `node _build/replicate-shell.js`.
 */
const fs = require('fs');
const path = require('path');

const TILES = ['tile-ia.jpg', 'tile-marca.jpg', 'tile-mundo.jpg', 'tile-red.jpg'];

const ROWS = [
  { href: 'index.html', label: 'Inicio', tile: 0, words: ['Operaciones de hotel', 'Todo el hotel, a la vez', 'Cada cifra con su origen', 'Barcelona'] },
  { href: 'index.html#producto', label: 'El producto', tile: 0, words: ['Hoy', 'Habitaciones y plantas', 'Housekeeping', 'Revenue y reservas'] },
  { href: 'index.html#como-trabajamos', label: 'Cómo trabajamos', tile: 1, words: ['Conectamos', 'Validamos', 'Publicamos', 'Trazamos'] },
  { href: 'nosotros.html', label: 'Nosotros', tile: 1, words: ['Producto propio', 'Más de 5 años', 'Con sede en Barcelona', 'En fase piloto'] },
  { href: 'partners.html', label: 'Partners', tile: 3, words: ['Cómo se conecta', 'Export del PMS', 'API y webhooks', 'CSV'] },
  { href: 'panel/', label: 'Panel demo', tile: 0, words: ['El producto, por dentro', 'Hoy · Habitaciones · Revenue', 'Pruébalo', 'Datos de demostración'] },
  { href: 'contacto.html', label: 'Contacto', tile: 1, words: ['Cuéntanos tu hotel', 'Sin compromiso', 'Hablamos hoy', 'Barcelona'] },
];

const img = (i) => `<i class="mrow__img" style="background-image:url('assets/img/menu/${TILES[i % TILES.length]}')"></i>`;

function band(row) {
  // Dos vueltas de las mismas palabras: la cinta se desplaza y tiene que
  // poder encadenarse sin costura.
  const parts = [];
  for (let loop = 0; loop < 2; loop++) {
    row.words.forEach((word, k) => {
      parts.push(`<span>${word}</span>`);
      parts.push(img(row.tile + loop * row.words.length + k));
    });
  }
  return `<span class="mrow__band" aria-hidden="true"><span class="mrow__track"><span class="mrow__inner" aria-hidden="true">${parts.join('')}</span></span></span>`;
}

const links = ROWS.map((row, i) => `        <a class="mrow__link" href="${row.href}" style="--i:${i}">
          <span class="mrow__label">${row.label}</span>
          ${band(row)}
        </a>`).join('\n');

const html = `  <!-- Side menu -->
  <div class="drawer" id="drawer" role="dialog" aria-modal="true" aria-label="Menú de navegación" aria-hidden="true" inert>
    <div class="drawer__panel">
      <div class="drawer__head">
        <span class="drawer__brand"><img src="assets/logo/holdera-monogram-white.png" alt="" width="12" height="25"><span>Holdera</span></span>
        <button type="button" class="btn btn--secondary btn--icon btn--on-dark drawer__close" data-drawer-close aria-label="Cerrar menú">
          <span class="burger is-x" aria-hidden="true"><i></i><i></i></span>
        </button>
      </div>
      <nav class="drawer__links mrows" aria-label="Menú">
${links}
      </nav>
      <div class="drawer__foot">
        <p class="drawer__meta"><span>Barcelona · España</span><span data-clock>—</span></p>
        <a class="btn btn--primary btn--on-dark" href="contacto.html"><span>Cuéntanos cómo es tu hotel</span><span class="btn__icon" aria-hidden="true"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg></span></a>
      </div>
    </div>
  </div>
  <!-- /drawer -->
`;

fs.writeFileSync(path.join(__dirname, 'drawer.html'), html);
console.log(`drawer.html: ${ROWS.length} filas, ${html.length} bytes`);
