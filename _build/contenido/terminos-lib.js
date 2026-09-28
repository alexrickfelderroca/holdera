/*
 * _build/contenido/terminos-lib.js — los términos técnicos del sitio, en un sitio.
 *
 * Encargo de Alex (reunión del 27-09-2026, PDF «Notas reunion»): «tener el
 * lenguaje técnico en bold y tener la habilidad de poner el cursor encima y
 * que salga una ventana pequeña que te defina what it stands for: MTD = Month
 * to date, STLY = Same Time Last Year, OTB = On the books. Todo esto tiene que
 * estar aplicado a todo en todas las páginas».
 *
 * La fuente es _build/contenido/glosario.json. Este módulo la lee y ofrece:
 *
 *   render(texto)   texto con marcadores [[ADR]] o [[texto visible|id]] ->
 *                   HTML escapado con <abbr class="term" data-term="id"
 *                   title="Average Daily Rate">ADR</abbr>. Un marcador que
 *                   no resuelve a ningún término REVIENTA: un término sin
 *                   definición es exactamente lo que este encargo prohíbe.
 *   plain(texto)    el mismo texto sin marcadores (menús, <title>, meta).
 *   ids(texto)      los id de los términos que aparecen, en orden y sin repetir.
 *   term(clave)     la entrada del glosario (por id, por término o por alias).
 *   runtimeData()   el objeto compacto que viaja a terminos.js (la ventana).
 *   panelData()     lo mismo para las ventanas del panel demo (en inglés).
 *
 * Por qué <abbr> y no <strong>: es la etiqueta de HTML para una abreviatura
 * con su expansión, y con `title` la ventana existe aunque no cargue el JS
 * (la nativa del navegador). terminos.js la sustituye por la de la casa y
 * quita el title para que no salgan dos.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'glosario.json');
const DATA = JSON.parse(fs.readFileSync(FILE, 'utf8'));

/* Índice por clave en minúsculas: id, término y alias. glosario.json ya se
   comprobó sin claves repetidas; si alguien añade una que choca, se avisa. */
const INDEX = new Map();
for (const t of DATA.terminos) {
  for (const k of [t.id, t.t, ...(t.alias || [])]) {
    const key = String(k).toLowerCase();
    if (INDEX.has(key) && INDEX.get(key) !== t) {
      throw new Error(`glosario.json: la clave "${k}" apunta a dos términos (${INDEX.get(key).id} y ${t.id})`);
    }
    INDEX.set(key, t);
  }
}
const GRUPOS = new Map(DATA.grupos.map((g) => [g.id, g]));

/* Nunca String.replace con '$$' en el reemplazo (trampa documentada del
   proyecto): split/join o funciones de reemplazo. */
const esc = (s) => String(s).split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;');
const escAttr = (s) => esc(s).split('"').join('&quot;');

const MARK = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

function term(key) {
  const t = INDEX.get(String(key).trim().toLowerCase());
  return t || null;
}

function mustTerm(key, ctx) {
  const t = term(key);
  if (!t) throw new Error(`Término sin definición: [[${key}]]${ctx ? ' en ' + ctx : ''}. Añádelo a _build/contenido/glosario.json o quita el marcador.`);
  return t;
}

/* El title es la ventana SIN JavaScript. Si la sigla ya es la palabra entera
   ("Pickup", "In house"), repetirla no dice nada: va la definición. */
function titleFor(t) {
  return t.en && t.en.toLowerCase() !== t.t.toLowerCase() ? t.en : t.def;
}

function abbr(visible, t) {
  return `<abbr class="term" data-term="${escAttr(t.id)}" title="${escAttr(titleFor(t))}">${esc(visible)}</abbr>`;
}

/* texto con marcadores -> HTML. Lo que NO es marcador se escapa. */
function render(text, ctx) {
  const s = String(text);
  let out = '';
  let last = 0;
  for (const m of s.matchAll(MARK)) {
    out += esc(s.slice(last, m.index));
    const visible = m[1];
    const t = mustTerm(m[2] || m[1], ctx);
    out += abbr(visible, t);
    last = m.index + m[0].length;
  }
  return out + esc(s.slice(last));
}

function plain(text) {
  return String(text).replace(MARK, (_, visible) => visible);
}

function ids(text, ctx) {
  const out = [];
  for (const m of String(text).matchAll(MARK)) {
    const t = mustTerm(m[2] || m[1], ctx);
    if (!out.includes(t.id)) out.push(t.id);
  }
  return out;
}

/* Lo que necesita la ventana del sitio (español): [t, en, es, def, f]. Se
   manda TODO el glosario: son ~100 entradas, ~6 KB con brotli, cacheadas una
   vez para todo el sitio, y así ningún término escrito a mano en una página
   se queda sin ventana. */
function runtimeData() {
  const o = {};
  for (const t of DATA.terminos) o[t.id] = [t.t, t.en || '', t.es || '', t.def || '', t.f || ''];
  return o;
}

/* El panel está en inglés: sus ventanas llevan la definición inglesa (literal
   del catálogo del producto en los KPI) y, si el panel está en ES, la
   española. Solo los términos que el panel marca solo (panel !== false):
   las palabras comunes en inglés —"Occupancy", "Pickup" en una frase, "Due
   in"— marcadas en cada aparición serían ruido, no ayuda. */
function panelData() {
  const o = {};
  for (const t of DATA.terminos) {
    if (t.panel === false) continue;
    o[t.id] = { t: t.t, en: t.en || '', d: t.def_en || t.def, f: t.f_en || '', des: t.def || '', fes: t.f || '' };
  }
  return o;
}

module.exports = { DATA, GRUPOS, render, plain, ids, term, mustTerm, runtimeData, panelData, esc, escAttr, abbr };
