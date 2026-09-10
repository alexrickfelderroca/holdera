/* patch-mobile-deck-art.js — migracion de una sola ejecucion (paso 8, movil).
 *
 * Por que: en movil cada diapositiva del deck de servicios ocupa una pantalla
 * entera (`.has-js .deck__stage { height: 420dvh }` para cinco diapositivas) y
 * su contenido es solo una tabla de seis filas y una palabra grande. Medido a
 * 390x844: quedaban ~600px de negro vacio por diapositiva. La obra fotografica
 * que llena ese hueco en escritorio (`.hero__showcase`) es un efecto de PUNTERO
 * y en movil no existe, asi que las 20 fotos de assets/img/servicios/ nunca se
 * llegaban a pedir: 0 de 20 cargadas, verificado en el navegador.
 *
 * Que hace: mete un <img> con el panel «-b» (landscape 1040x694, 11-45 KB) en
 * cada una de las cinco diapositivas, en diferido (loading="lazy"), con
 * width/height para que no haya salto de layout. El CSS lo muestra solo por
 * debajo de 901px: en escritorio el deck no cambia.
 *
 * alt="" a proposito: la foto ILUSTRA, no informa. Todo el contenido del
 * servicio esta en la tabla de arriba, asi que describir la foto solo mete
 * ruido en el arbol de accesibilidad. Es imagen decorativa segun WCAG 1.1.1.
 *
 * Falla si se repite (busca el marcador y aborta si ya esta).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const FILE = path.join(ROOT, 'index.html');

// slug -> panel que se usa. El «-b» es apaisado y el mas ligero de los tres.
const SLIDES = [
  { id: 'servicio-asesorias',      title: 'ASESORÍAS',      img: 'asesorias-b.webp' },
  { id: 'servicio-estrategia',     title: 'ESTRATEGIA',     img: 'estrategia-b.webp' },
  { id: 'servicio-transformacion', title: 'TRANSFORMACIÓN', img: 'transformacion-b.webp' },
  { id: 'servicio-marketing',      title: 'MARKETING',      img: 'marketing-b.webp' },
  { id: 'servicio-ia',             title: 'AUTOMATIZACIÓN', img: 'ia-b.webp' },
];

let html = fs.readFileSync(FILE, 'utf8');

if (html.includes('deck__art')) {
  console.error('ABORTADO: index.html ya tiene .deck__art. Esta migracion es de una sola ejecucion.');
  process.exit(1);
}

let done = 0;
for (const s of SLIDES) {
  const needle = `<h3 class="deck__title">${s.title}</h3>`;
  if (!html.includes(needle)) {
    console.error(`ABORTADO: no encuentro el titulo de ${s.id}: ${needle}`);
    process.exit(1);
  }
  const file = path.join(ROOT, 'assets', 'img', 'servicios', s.img);
  if (!fs.existsSync(file)) {
    console.error(`ABORTADO: falta la imagen ${s.img}`);
    process.exit(1);
  }
  const replacement =
    needle +
    '\n                <figure class="deck__art" aria-hidden="true">' +
    `<img src="assets/img/servicios/${s.img}" alt="" width="1040" height="694" loading="lazy" decoding="async">` +
    '</figure>';
  // split/join, nunca replace(): un '$' en el texto de reemplazo es un escape
  // y se come caracteres (ver CLAUDE.md, trampas del proyecto).
  html = html.split(needle).join(replacement);
  done++;
}

fs.writeFileSync(FILE, html);
console.log(`OK: ${done} diapositivas del deck llevan ya su fotografia (solo visible <= 900px).`);
