/*
 * _build/migrations/patch-integrar-recorrido.js
 *
 * Encargo de Alex (20-09-2026), su punto numero uno:
 *   "integra esta animacion justo debajo de la landing page; quita todo lo que
 *    hay debajo del hero y sustituyelo por la animacion"
 * y despues las secciones nuevas al estilo de la referencia del sector.
 *
 * QUE SALE de index.html
 *   - section.sheet--process  (el planeta + los cuatro pasos)   -> captura 1 de Alex
 *   - section.sheet--svc      (el deck de cinco pantallas)      -> capturas 2, 3 y 4
 *   - <script src="planet.js"> (se queda sin seccion)
 *
 * QUE ENTRA, en este orden, como primeros hijos de <main>
 *   1. #ha-recorrido  el recorrido animado por el hotel, en claro
 *   2. #conectado     "todo tu hotel, conectado": que se conecta y que no se
 *                     puede ensenar sin cada conexion
 *   3. #funciones     las funciones, deslizables, cada una con su pantalla
 *   4. #preguntas     las preguntas frecuentes (<details> nativo)
 * y #contacto se queda donde estaba, el ultimo.
 *
 * QUE SE QUEDA: el formulario de contacto. Alex mando su captura dentro del
 * lote de "todo lo que hay debajo del hero", pero es el UNICO punto de
 * conversion de la pagina y acaba de dar el email y el telefono para que
 * funcione. Quitarlo dejaria la web sin ninguna via de contacto. Si lo queria
 * fuera de verdad, se quita en una linea.
 *
 * ANCLAS: al irse esas dos secciones mueren #como-trabajamos, #producto y los
 * cinco #producto-*. Se remapean aqui dentro de index.html; la cabecera, el
 * drawer y el pie viven en _build/shell/ y se arreglan aparte.
 *
 * Idempotente. split().join(), nunca String.replace().
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const INDEX = path.join(ROOT, 'index.html');
const PARTS = path.join(ROOT, '_build', 'parts');

let html = fs.readFileSync(INDEX, 'utf8');
const original = html;

function leerParte(nombre) {
  const p = path.join(PARTS, nombre);
  if (!fs.existsSync(p)) { console.error(`  ! falta la pieza ${nombre}`); process.exit(1); }
  return fs.readFileSync(p, 'utf8').trim();
}

/* Corta de `desde` hasta el final de `hasta`. Exige UNA sola aparicion. */
function cortar(nombre, desde, hasta) {
  if (!html.includes(desde)) { console.log(`  · ${nombre}: ya no esta`); return; }
  if (html.split(desde).length - 1 > 1) { console.error(`  ! ${nombre}: ancla ambigua`); process.exit(1); }
  const i = html.indexOf(desde);
  const j = html.indexOf(hasta, i);
  if (j === -1) { console.error(`  ! ${nombre}: sin cierre`); process.exit(1); }
  const n = html.slice(i, j + hasta.length).split('\n').length;
  html = html.slice(0, i) + html.slice(j + hasta.length);
  console.log(`  - ${nombre}: fuera ${n} lineas`);
}

function una(nombre, de, a) {
  const n = html.split(de).length - 1;
  if (n === 0) { console.log(`  · ${nombre}: ya aplicado`); return; }
  if (n > 1) { console.error(`  ! ${nombre}: ${n} apariciones, esperaba 1`); process.exit(1); }
  html = html.split(de).join(a);
  console.log(`  + ${nombre}`);
}

console.log('index.html');

/* ---------- 1. hojas de estilo ---------- */
una('link hotel-anim.css',
  '  <link rel="stylesheet" href="styles.css?v=0fab7b99">',
  '  <link rel="stylesheet" href="styles.css?v=0fab7b99">\n'
  + '  <!-- El recorrido del hotel. Va DESPUES de styles.css: lee sus tokens del :root. -->\n'
  + '  <link rel="stylesheet" href="hotel-anim.css">\n'
  + '  <!-- Las tres secciones nuevas (conectado · funciones · preguntas). -->\n'
  + '  <link rel="stylesheet" href="sections.css">');

/* ---------- 2. fuera el planeta y el deck ---------- */
cortar('seccion .sheet--process',
  '    <section class="sheet sheet--process" id="como-trabajamos"',
  '    </section>\n');

cortar('comentario del deck',
  '    <!-- El producto: cinco pantallas encadenadas al scroll (data-deck).',
  'absoluto está detrás de .has-js. -->\n');

cortar('seccion .sheet--svc',
  '    <section class="sheet sheet--svc" id="producto"',
  '    </section>\n');

/* ---------- 3. entran las cuatro secciones nuevas ---------- */
const ancla = '  <main id="contenido">\n';
if (!html.includes(ancla)) { console.error('  ! no encuentro <main id="contenido">'); process.exit(1); }

if (!html.includes('id="ha-recorrido"')) {
  const bloques = [
    leerParte('hotel-anim.html'),
    leerParte('opera.html'),
    leerParte('features.html'),
    leerParte('faq.html'),
  ].join('\n\n');
  html = html.split(ancla).join(ancla + '\n' + bloques + '\n\n');
  console.log('  + 4 secciones nuevas dentro de <main>');
} else {
  console.log('  · secciones nuevas: ya estaban');
}

/* ---------- 4. las cifras inventadas fuera del fuente publicado ----------
 * El comentario de la pieza explica por que las escenas vienen apagadas y, al
 * explicarlo, ESCRIBE las cifras inventadas del original. No se renderizan,
 * pero se publican en el fuente de holdera.es, y son la unica aparicion de un
 * porcentaje o un simbolo de dolar en todo el marcado. El motivo se conserva;
 * los numeros, no. */
una('cifras inventadas fuera del comentario',
  'inventadas en dolares (98% CURRENT OCCUPANCY, $428K REVENUE THIS MO,\n     $186 REVPAR). Con la obra sustituida o aprobada por Alex se encienden',
  'inventadas en dolares (ocupacion, ingresos y RevPAR de un hotel que no\n     existe). Con la obra sustituida o aprobada por Alex se encienden');

/* ---------- 5. anclas que han muerto ---------- */
const remap = [
  ['#como-trabajamos', '#conectado'],
  ['#producto-hoy', '#funciones'],
  ['#producto-habitaciones', '#funciones'],
  ['#producto-housekeeping', '#funciones'],
  ['#producto-revenue', '#funciones'],
  ['#producto-trazabilidad', '#funciones'],
  ['#producto', '#ha-recorrido'],   // al final: los #producto-* ya se han ido
];
let n = 0;
for (const [de, a] of remap) {
  const c = html.split(`href="${de}"`).length - 1;
  if (c) { html = html.split(`href="${de}"`).join(`href="${a}"`); n += c; }
  const c2 = html.split(`href="index.html${de}"`).length - 1;
  if (c2) { html = html.split(`href="index.html${de}"`).join(`href="index.html${a}"`); n += c2; }
}
if (n) console.log(`  ~ ${n} ancla(s) remapeadas`);

/* ---------- 6. scripts ---------- */
cortar('script planet.js',
  '  <!-- planet.js is raw WebGL, no CDN -->',
  '  <script src="planet.js?v=987c881d" defer></script>\n');

una('script hotel-anim.js',
  '  <script src="brain.js?v=f883ece9" defer></script>',
  '  <script src="brain.js?v=f883ece9" defer></script>\n'
  + '  <!-- El recorrido del hotel: WebGL no, canvas no; SVG + CSS y su propio\n'
  + '       lector de scroll. Pide el plano y los datos medidos en diferido y\n'
  + '       solo en escritorio sin movimiento reducido. -->\n'
  + '  <script src="hotel-anim.js" defer></script>');

if (html === original) { console.log('\nNada que hacer.'); process.exit(0); }
fs.writeFileSync(INDEX, html);

/* ---------- comprobaciones ----------
 * Se cuenta sobre el marcado SIN COMENTARIOS. La primera version contaba sobre
 * el archivo entero y daba "7 abiertas / 6 cerradas": las piezas se documentan
 * a si mismas y la cabecera de hotel-anim.html dice, en prosa, «entre dos
 * <section class="sheet"> cualesquiera». Esa etiqueta de ejemplo no existe en
 * el arbol. Un verificador que cuenta comentarios manda a arreglar lo que no
 * esta roto — es la misma leccion que el hero vacio de shoot.js. */
const vivo = html.replace(/<!--[\s\S]*?-->/g, '');
const abre = (vivo.match(/<section\b/g) || []).length;
const cierra = (vivo.match(/<\/section>/g) || []).length;
console.log(`\n<section> ${abre} abiertas / ${cierra} cerradas ${abre === cierra ? 'OK' : '!! DESCUADRE'}`);
const main = (vivo.match(/<main\b/g) || []).length === 1 && (vivo.match(/<\/main>/g) || []).length === 1;
console.log(`<main> unico y cerrado: ${main ? 'OK' : '!! MAL'}`);
['ha-recorrido', 'conectado', 'funciones', 'preguntas', 'contacto'].forEach((id) => {
  console.log(`  id="${id}": ${html.includes(`id="${id}"`) ? 'OK' : '!! FALTA'}`);
});
['sheet--process', 'sheet--svc', 'planet.js', 'data-deck'].forEach((s) => {
  const c = html.split(s).length - 1;
  console.log(`  resto de ${s}: ${c} ${c === 0 ? 'OK' : '!!'}`);
});
// ningun href interno puede apuntar a un id que ya no existe
const huerfanos = [...html.matchAll(/href="(?:index\.html)?#([a-z0-9-]+)"/g)]
  .map((m) => m[1])
  .filter((v, i, a) => a.indexOf(v) === i)
  .filter((id) => !html.includes(`id="${id}"`));
console.log(`  anclas huerfanas: ${huerfanos.length ? huerfanos.join(', ') + ' !!' : '0 OK'}`);
if (abre !== cierra || !main || huerfanos.length) process.exit(1);
