/*
 * _build/migrations/patch-hero-sin-lista.js
 *
 * Encargo de Alex (20-09-2026): "take out the five words at the izquierda de la
 * landing page" — la lista .hero__works (Hoy · Habitaciones · Housekeeping ·
 * Revenue y reservas · Trazabilidad).
 *
 * Y con ella SE VA EL ESCAPARATE, que no es una decision aparte: script.js hace
 *   if (!works || !showcase || !hero) return;
 * es decir, el escaparate del paso 4 SOLO se dispara al pasar el raton por esa
 * lista. Quitar la lista y dejar el escaparate no deja "el escaparate sin lista":
 * deja 37 reglas de CSS y 805 KB de webp que no se pintan nunca. Se va entero.
 *
 * Lo que el escaparate ensenaba (las cinco pantallas del producto) no se pierde:
 * pasa a contarlo el recorrido animado del hotel que entra debajo del hero, la
 * seccion de features y el propio panel demo.
 *
 * Este script NO borra los .webp ni el CSS: eso se hace despues y por separado,
 * para que el paso sea reversible de un vistazo. Aqui solo sale el marcado.
 *
 * Idempotente: si ya esta aplicado, avisa y sale con 0.
 * split().join(), nunca String.replace() — en este proyecto un `$$` se colapsa.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.resolve(__dirname, '..', '..', 'index.html');
let html = fs.readFileSync(FILE, 'utf8');
const original = html;

/* Corta desde `desde` hasta el final de `hasta` (incluido). Exige que haya
 * exactamente UNA aparicion de cada ancla: si el archivo cambia de forma,
 * preferimos fallar ruidosamente a cortar por el sitio equivocado. */
function cortar(nombre, desde, hasta) {
  const nDesde = html.split(desde).length - 1;
  if (nDesde === 0) { console.log(`  · ${nombre}: ya no esta`); return 0; }
  if (nDesde > 1) { console.error(`  ! ${nombre}: ${nDesde} anclas de inicio, esperaba 1`); process.exit(1); }

  const i = html.indexOf(desde);
  const j = html.indexOf(hasta, i);
  if (j === -1) { console.error(`  ! ${nombre}: no encuentro el cierre "${hasta.slice(0, 30)}"`); process.exit(1); }

  const trozo = html.slice(i, j + hasta.length);
  html = html.slice(0, i) + html.slice(j + hasta.length);
  // deja como mucho una linea en blanco donde estaba
  html = html.split('\n\n\n').join('\n\n');
  console.log(`  ${nombre}: fuera ${trozo.split('\n').length} lineas`);
  return trozo.split('\n').length;
}

console.log('index.html:');

// 1. La lista de cinco enlaces, con su comentario explicativo.
cortar(
  'lista .hero__works',
  '      <!-- La lista va aquí, justo detrás del copy',
  '      </nav>\n',
);

// 2. El escaparate entero, con su comentario de cabecera. Termina justo antes
//    del cierre de <section class="hero">.
cortar(
  'escaparate .hero__showcase',
  '      <!-- ===== Escaparate del producto',
  '      </div>\n\n    </section>',
);

if (html === original) {
  console.log('\nNada que hacer: ya estaba aplicado.');
  process.exit(0);
}

// El cierre de </section> que se ha llevado el corte 2 hay que devolverlo.
if (!html.includes('    </section>\n  </div>\n\n  <!-- ============ CONTENT SHEET')) {
  html = html.split('  </div>\n\n  <!-- ============ CONTENT SHEET')
             .join('    </section>\n  </div>\n\n  <!-- ============ CONTENT SHEET');
}

fs.writeFileSync(FILE, html);

// --- comprobaciones de que no hemos roto el arbol ---
const abre = (html.match(/<section\b/g) || []).length;
const cierra = (html.match(/<\/section>/g) || []).length;
console.log(`\n<section> ${abre} abiertas / ${cierra} cerradas ${abre === cierra ? 'OK' : '!! DESCUADRE'}`);
['data-works', 'data-showcase', 'hero__works', 'sc__bg'].forEach((s) => {
  const n = html.split(s).length - 1;
  console.log(`  ${s}: ${n} ${n === 0 ? 'OK' : '!! quedan restos'}`);
});
if (abre !== cierra) process.exit(1);

console.log('\nPendiente aparte: retirar el CSS (.hero__works*, .sc__*, .is-showcase),');
console.log('el bloque de escaparate de script.js y los 20 webp de assets/img/producto/.');
