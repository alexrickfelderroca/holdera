#!/usr/bin/env node
/*
 * _build/panel-copy.js — la web aplicada al panel capturado (paso 14).
 *
 *   node _build/panel-copy.js            aplica (idempotente)
 *   node _build/panel-copy.js --check    solo comprueba; sale con 1 si falta algo
 *
 * 🔴 SE PASA DESPUÉS DE CADA RECAPTURA DEL PANEL (snapshot-panel.js borra
 * panel/ entero, y con él todo lo de aquí).
 *
 * Reunión con Alex (27-09-2026, PDF «Notas reunion»), sobre las pantallas del
 * panel que salen en el documento (Revenue y Reservations): «el lenguaje
 * técnico en bold, con una ventana al pasar el cursor que diga what it stands
 * for: MTD = Month to date, STLY = Same Time Last Year, OTB = On the books»,
 * «demasiadas explicaciones sobre una terminología que el que lo lee ya
 * entiende» y «el panel demo en general no es demasiado user friendly».
 *
 * El fuente del producto con los pasos 10-13 ya no existe en ninguna parte
 * (Jov12/holdera se quedó en el 19-09-2026), así que el panel no se puede
 * recompilar: se corrige sobre la captura. Tres cosas:
 *
 *   1. EL VOCABULARIO. "Month to date" pasa a MTD, "same time last year" a
 *      STLY, "on the books" a OTB, y las frases que explicaban cada etiqueta
 *      se quedan en la etiqueta. Es texto que React HIDRATA, y existe hasta en
 *      cuatro sitios a la vez: el HTML servido, el flight data incrustado en
 *      ese HTML, el payload .rsc de la navegación blanda y el chunk de JS del
 *      componente de cliente. Si uno solo se queda con la frase vieja, React
 *      encuentra dos textos distintos y la hidratación falla. Por eso:
 *        - cada frase se sustituye en LAS CUATRO representaciones, cada una
 *          con su escape (entidades HTML, JSON, JSON dentro de una cadena de
 *          JS con \u0026 para "&", literales de JS con \xNN);
 *        - en UNA sola pasada con la coincidencia más larga primero, así que
 *          una frase larga protegida (identidad) gana a la corta que contiene;
 *        - y se CUENTA: una frase que cambia en el HTML visible y en ninguna
 *          fuente de hidratación (flight, chunk, API) es un fallo de
 *          hidratación seguro, y el script se para sin escribir nada.
 *      Solo frases ENTERAS de un literal: el chunk parte las oraciones en
 *      trozos (un trozo = un nodo de texto), y una frase que cruzara dos
 *      trozos casaría en el HTML y no en el JS.
 *   2. LAS EXPLICACIONES LARGAS, FUERA: por CSS (panel/_holdera/holdera.css),
 *      nunca borrando nodos del árbol que React hidrata.
 *   3. LAS VENTANAS: panel/_holdera/terminos.js, con el glosario de la web
 *      (_build/contenido/glosario.json). Ver su cabecera: no toca el DOM de
 *      React.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const lib = require('./contenido/terminos-lib');

const ROOT = path.resolve(__dirname, '..');
const PANEL = path.join(ROOT, 'panel');
const OUT = path.join(PANEL, '_holdera');
const SRC_JS = path.join(__dirname, 'panel', 'terminos-panel.js');
const SRC_CSS = path.join(__dirname, 'panel', 'holdera-panel.css');
const CHECK = process.argv.includes('--check');

/* ---------------------------------------------------------------- las frases
   [de, a]. Todas GLOBALES: un chunk de JS lo comparten muchas páginas, y
   cambiar una frase en el chunk y no en todos los HTML que la pintan es
   romper la hidratación en los que se quedaron atrás. Por eso cada frase es
   lo bastante larga para significar lo mismo en cualquier pantalla.
   Las de identidad (de === a) protegen una frase larga de una corta que
   contiene: van a lectores de pantalla y ahí la sigla se lee peor. */
const FRASES = [
  // Revenue: cabecera y pestañas
  ['How the hotel is selling tonight, so far this month and across the book ahead — every figure read against the same point a year ago.', 'Tonight, MTD and the next 30 nights, each against STLY.'],
  ['Tonight, the month and the next 30 nights', 'Tonight, MTD and the next 30 nights'],
  ['Tonight, the month and the nights ahead', 'Tonight, MTD and the next 30 nights'],
  ['Month to date', 'MTD'],
  ['Picked up in the last 7 days', 'Pickup · last 7 days'],
  // Revenue: TRevPAR y sus fichas — la sigla ya lleva su ventana
  ['The whole hotel, not only the bedroom', 'Whole hotel'],
  ['TRevPAR · Total Revenue per Available Room', 'TRevPAR'],
  ['RevPAR · Revenue per Available Room', 'RevPAR'],
  ['RevPOR · Revenue per Occupied Room', 'RevPOR'],
  ['Rooms, food and beverage, spa and wellness and other services together, per available room.', 'Rooms + F&B + spa + other, per available room.'],
  ['The bedroom alone, per available room.', 'Rooms only, per available room.'],
  ['Food and beverage per available room: the department that opens most of the distance between the two figures beside it.', 'F&B per available room.'],
  ['What one occupied room is worth across the whole hotel tonight.', 'Whole-hotel revenue per occupied room.'],
  ['Total Revenue per Available Room: rooms, F&B, spa and other services', 'Rooms + F&B + spa + other'],
  // Revenue: gráficos
  ['This year, rooms on the books', 'OTB this year'],
  ['Same point last year', 'STLY'],
  ['Last year, final for these nights', 'LY final'],
  ['Last year, final', 'LY final'],
  ['Last year finished at', 'LY final:'],
  ['Same night last year, closed', 'LY, closed'],
  ['Same night last year, total revenue', 'LY total revenue'],
  ['Same night last year', 'LY'],
  ['Nights still on the books are excluded: a night that is still filling would drag its weekday down.', 'OTB nights excluded.'],
  // Reservas (ES): «noche a noche» pasa a «por fecha» (reunión del 28-09-2026)
  ['Parte del ingreso de habitación por canal, noche a noche.', 'Parte del ingreso de habitación por canal, por fecha.'],
  // Reservations
  ['The reservation book, night by night: what is on the books, at what rate, what has come in this week and how the same night stood a year ago.', 'OTB, ADR and pickup night by night, each against STLY.'],
  ['Each figure carries last year beside it, and says which last year it is: the same point in the booking curve, or how the month finished.', 'Each figure against STLY and LY final.'],
  ['How last year finished', 'LY final'],
  // La leyenda del calendario decía la sigla dos veces ("OTB — OTB, rooms…").
  // La segunda regla es para una captura ya pasada por la versión anterior.
  [' — on the books, rooms can still come in', ' — rooms can still come in'],
  [' — OTB, rooms can still come in', ' — rooms can still come in'],
  // Today
  ['Closed nights as occupied; tonight as projected; the next 7 as on the books (OTB) at', 'Closed nights actual · tonight projected · next 7 OTB at'],
  // Hotel / Habitaciones / Housekeeping: el aviso del edificio de demostración
  ['The building, floors and rooms are a generated demo layout: configuration, not data read from the PMS.', 'Demo layout: the building is illustrative.'],
  [" The totals are the snapshot's; which room holds each state is an illustrative distribution, not data.", ' Totals come from the PMS snapshot.'],
  // Las siglas, en cualquier pantalla
  ['Same Time Last Year', 'STLY'],
  ['Same time last year', 'STLY'],
  ['same time last year', 'STLY'],
  ['same night last year', 'STLY'],
  ['On the books', 'OTB'],
  ['on the books', 'OTB'],
  // Protegidas (lectores de pantalla)
  ['the same night last year at the same lead time', 'the same night last year at the same lead time'],
  ['Rooms on the books, rate and room revenue by room type', 'Rooms on the books, rate and room revenue by room type'],
];

/* --------------------------------------------------------------- escapes */
const htmlEsc = (s) => s.split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;').split('"').join('&quot;').split("'").join('&#x27;');
const jsonEsc = (s) => JSON.stringify(s).slice(1, -1);
const htmlJson = (s) => s.split('&').join('\\u0026').split('<').join('\\u003c').split('>').join('\\u003e').split('\u2028').join('\\u2028').split('\u2029').join('\\u2029');
const flightEsc = (s) => htmlJson(jsonEsc(jsonEsc(s)));
/* Un literal de JS minificado: comillas y barras escapadas, y lo que no es
   ASCII a veces tal cual y a veces como \xNN / \uNNNN (en el mismo chunk
   conviven "Hotel de demostración" y `Despu\xe9s`). Se prueban las dos. */
const jsRaw = (s) => s.split('\\').join('\\\\').split('"').join('\\"');
const jsAscii = (s) => jsRaw(s).replace(/[^\x00-\x7f]/g, (c) => {
  const n = c.charCodeAt(0);
  return n < 256 ? '\\x' + n.toString(16).padStart(2, '0') : '\\u' + n.toString(16).padStart(4, '0');
});

const REPR = {
  html: [htmlEsc],
  flight: [flightEsc],
  rsc: [jsonEsc],
  json: [jsonEsc],
  js: [jsRaw, jsAscii],
};

for (const [de, a] of FRASES) {
  for (const [otro] of FRASES) {
    if (de !== a && a.indexOf(otro) >= 0 && otro !== a) throw new Error(`"${a}" contiene "${otro}": una segunda pasada lo volvería a cambiar`);
  }
}

/* Un solo patrón por representación: alternativas de la más larga a la más
   corta, así en cada posición gana la frase más larga (y una protegida gana
   a la corta que contiene). */
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function compile(kind) {
  const map = new Map();
  for (const [de, a] of FRASES) {
    for (const f of REPR[kind]) {
      const k = f(de);
      if (!map.has(k)) map.set(k, { to: f(a), de });
    }
  }
  const keys = [...map.keys()].sort((x, y) => y.length - x.length);
  return { re: new RegExp(keys.map(esc).join('|'), 'g'), map };
}
const PAT = Object.fromEntries(Object.keys(REPR).map((k) => [k, compile(k)]));

const hits = new Map(); // de -> {html, flight, rsc, json, js}
/* Y por página: una frase que solo existe en la salida del servidor tiene que
   cambiar en el HTML visible y en el flight de ESA página el mismo número de
   veces. Si una fila del flight viniera partida entre dos <script> y la frase
   cayera en el corte, cambiaría en el HTML y no en el payload: el recuento
   global no lo vería, este sí. */
const perFile = new Map(); // file -> Map(de -> {html, flight})
let currentFile = null;
const count = (de, kind) => {
  if (!hits.has(de)) hits.set(de, { html: 0, flight: 0, rsc: 0, json: 0, js: 0 });
  hits.get(de)[kind]++;
  if (currentFile && (kind === 'html' || kind === 'flight')) {
    if (!perFile.has(currentFile)) perFile.set(currentFile, new Map());
    const m = perFile.get(currentFile);
    if (!m.has(de)) m.set(de, { html: 0, flight: 0 });
    m.get(de)[kind]++;
  }
};

function apply(text, kind) {
  const { re, map } = PAT[kind];
  re.lastIndex = 0;
  return text.replace(re, (m) => {
    const e = map.get(m);
    count(e.de, kind);
    return e.to;
  });
}

/* HTML: el texto visible y los atributos con escape HTML; el flight data de
   los <script>self.__next_f.push(...)</script> con el suyo. El resto de
   scripts y los <style> no se tocan. */
function applyHtml(html) {
  return html.replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)|(<style\b[^>]*>[\s\S]*?<\/style>)|([^<]+|<[^>]*>)/g,
    (whole, open, body, close, style) => {
      if (open !== undefined) {
        return body.indexOf('self.__next_f.push(') >= 0 ? open + apply(body, 'flight') + close : whole;
      }
      if (style !== undefined) return whole;
      return apply(whole, 'html');
    });
}

/* -------------------------------------------------------------- archivos */
function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== '_holdera') walk(p, out); }
    else out.push(p);
  }
  return out;
}

if (!fs.existsSync(PANEL)) { console.error('No hay panel/: captura primero con _build/snapshot-panel.js'); process.exit(1); }
const files = walk(PANEL, []);
const writes = [];

for (const f of files) {
  const rel = path.relative(PANEL, f).split(path.sep).join('/');
  let kind = null;
  if (/\.html$/.test(rel)) kind = 'html';
  else if (/\.rsc$/.test(rel)) kind = 'rsc';
  else if (/^_next\/static\/chunks\/.*\.js$/.test(rel)) kind = 'js';
  else if (/^api\/.*\.json$/.test(rel)) kind = 'json';
  if (!kind) continue;
  const src = fs.readFileSync(f, 'utf8');
  currentFile = kind === 'html' ? rel : null;
  const out = kind === 'html' ? applyHtml(src) : apply(src, kind);
  currentFile = null;
  if (out !== src) writes.push([f, out]);
}

/* --------------------------------------------------- ¿hidrata todo igual? */
let errores = 0;
const filas = [];
for (const [de, a] of FRASES) {
  const h = hits.get(de) || { html: 0, flight: 0, rsc: 0, json: 0, js: 0 };
  const cambia = de !== a;
  const total = h.html + h.flight + h.rsc + h.json + h.js;
  filas.push([cambia ? '' : '=', h.html, h.flight, h.rsc, h.js, h.json, de.length > 70 ? de.slice(0, 67) + '...' : de]);
  if (cambia && h.html > 0 && h.flight + h.js + h.json === 0) {
    console.error(`FALLO  "${de}": cambia en ${h.html} sitio(s) del HTML y en ninguna fuente de hidratación (flight, chunk o API). React vería dos textos distintos.`);
    errores++;
  }
  if (cambia && total === 0 && !CHECK) filas[filas.length - 1][0] = '-';
  // Frase solo de servidor (ni chunk ni API): página a página, cada cambio del
  // HTML visible tiene su gemelo en el flight. Al revés no hace falta: el
  // flight lleva props que solo se pintan al abrir un diálogo (en Revenue,
  // el nombre largo de "Pace vs STLY" que usa la ficha Detail), y esas no
  // están en el HTML servido que React compara al hidratar.
  if (cambia && h.js === 0 && h.json === 0) {
    for (const [file, m] of perFile) {
      const c = m.get(de);
      if (c && c.html > c.flight) {
        console.error(`FALLO  ${file}: "${de}" cambia ${c.html} vez/veces en el HTML y ${c.flight} en su flight data.`);
        errores++;
      }
    }
  }
}

/* ------------------------------------------------ las ventanas y el CSS */
function buildAssets() {
  const js = fs.readFileSync(SRC_JS, 'utf8');
  const A = '/* terms:panel-start */';
  const B = '/* terms:panel-end */';
  const a = js.indexOf(A);
  const b = js.indexOf(B);
  if (a < 0 || b < a) throw new Error('terminos-panel.js: faltan las marcas terms:panel');
  const data = {};
  for (const [id, e] of Object.entries(lib.panelData())) {
    const t = lib.term(id);
    const alias = (t.alias || []).filter((x) => /[A-Z]/.test(x) || x.split(' ').length > 1);
    data[id] = Object.assign({}, e, alias.length ? { a: alias } : {});
  }
  const json = JSON.stringify(data).split('\u2028').join('\\u2028').split('\u2029').join('\\u2029');
  const outJs = js.slice(0, a + A.length) + '\n  var T = ' + json + ';\n  ' + js.slice(b);
  const outCss = fs.readFileSync(SRC_CSS, 'utf8');
  const h = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);
  return { outJs, outCss, hJs: h(outJs), hCss: h(outCss) };
}
const assets = buildAssets();
const TAGS = `<link rel="stylesheet" href="/panel/_holdera/holdera.css?v=${assets.hCss}" data-holdera-terms>` +
  `<script src="/panel/_holdera/terminos.js?v=${assets.hJs}" defer data-holdera-terms></script>`;

function inject(html) {
  let out = html.replace(/<link [^>]*data-holdera-terms[^>]*>/g, '').replace(/<script [^>]*data-holdera-terms[^>]*><\/script>/g, '');
  const i = out.indexOf('</head>');
  if (i < 0) return out;
  return out.slice(0, i) + TAGS + out.slice(i);
}

/* Las páginas que ya estaban bien no entran en `writes`: se inyecta en todas
   las HTML, cambie o no su texto. */
const pending = new Map(writes);
let sinTags = 0;
for (const f of files) {
  if (!/\.html$/.test(f)) continue;
  const base = pending.has(f) ? pending.get(f) : fs.readFileSync(f, 'utf8');
  if (base.indexOf('</head>') < 0) continue;
  const next = inject(base);
  if (next !== base || pending.has(f)) pending.set(f, next);
  if (!base.includes(TAGS)) sinTags++;
}

/* ---------------------------------------------------------------- informe */
console.log('  prot  html flight   rsc    js  json  frase');
for (const r of filas) console.log(`  ${String(r[0]).padEnd(4)} ${String(r[1]).padStart(4)} ${String(r[2]).padStart(6)} ${String(r[3]).padStart(5)} ${String(r[4]).padStart(5)} ${String(r[5]).padStart(5)}  ${r[6]}`);
console.log('  (=: protegida, se queda igual · -: no aparece en ningún archivo)');

if (errores) {
  console.error(`\n${errores} frase(s) romperían la hidratación. No se ha escrito nada.`);
  process.exit(1);
}

if (CHECK) {
  const quedan = [...hits.entries()].filter(([de]) => FRASES.find((p) => p[0] === de && p[0] !== p[1]));
  const okAssets = fs.existsSync(path.join(OUT, 'terminos.js')) && fs.readFileSync(path.join(OUT, 'terminos.js'), 'utf8') === assets.outJs &&
    fs.existsSync(path.join(OUT, 'holdera.css')) && fs.readFileSync(path.join(OUT, 'holdera.css'), 'utf8') === assets.outCss;
  let fallos = 0;
  if (quedan.length) { console.error(`FALLO  quedan ${quedan.length} frase(s) sin aplicar: node _build/panel-copy.js`); fallos++; }
  if (sinTags) { console.error(`FALLO  ${sinTags} página(s) del panel sin las ventanas de términos (o con una versión vieja)`); fallos++; }
  if (!okAssets) { console.error('FALLO  panel/_holdera/ no está al día con _build/panel/ y glosario.json'); fallos++; }
  console.log(fallos ? `\n${fallos} fallo(s).` : '\nEl panel lleva el vocabulario y las ventanas de la web.');
  process.exit(fallos ? 1 : 0);
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'terminos.js'), assets.outJs);
fs.writeFileSync(path.join(OUT, 'holdera.css'), assets.outCss);
let n = 0;
for (const [f, out] of pending) {
  if (fs.readFileSync(f, 'utf8') !== out) { fs.writeFileSync(f, out); n++; }
}
console.log(`\n${n} archivo(s) reescritos · panel/_holdera/terminos.js (${Object.keys(lib.panelData()).length} términos) · panel/_holdera/holdera.css`);
