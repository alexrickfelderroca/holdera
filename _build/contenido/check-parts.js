#!/usr/bin/env node
/* ==========================================================================
   HOLDERA — el marcado de los bloques nuevos dice lo mismo que su JSON.

   Por qué existe: el texto de las respuestas viaja DOS veces (en la página y
   en el dato estructurado de schema.org) y Google pide que sean el mismo. Y
   las features llevan enlaces profundos al panel que se pueden romper con
   cualquier recaptura. Esto lo comprueba leyendo los archivos de verdad.

   Comprueba, y sale con 1 si algo no cuadra:
     1. faq.html   ↔ faq.json      — las 12 preguntas y las 12 respuestas,
                                      palabra por palabra.
     2. faq-jsonld ↔ faq.json      — solo las respuestas SIN marcador.
     3. features.html ↔ features.json — título, frase, párrafo, enlace y los
                                      tres «qué contesta» de cada feature.
     4. Ni un literal de color fuera de :root en los tres CSS del bloque.
     5. Con --http <base>: que cada enlace profundo del panel devuelva 200.

   Uso:  node _build/contenido/check-parts.js
         node _build/contenido/check-parts.js --http http://localhost:4177
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const DIR = __dirname;                    // _build/contenido
const PARTS = path.join(DIR, '..', 'parts');
const read = (p) => fs.readFileSync(p, 'utf8');

let fallos = 0;
const fallo = (msg) => { console.error('FALLO  ' + msg); fallos++; };
const ok = (msg) => console.log('ok     ' + msg);

/* Texto visible de un fragmento de HTML, normalizado igual que lo leería
   alguien: se quitan las etiquetas y los comentarios, se colapsan espacios. */
function visible(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&laquo;/g, '«').replace(/&raquo;/g, '»')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/* Devuelve el HTML interior del primer elemento <tag ...id="id"> ... </tag>,
   contando apertura y cierre para soportar anidamiento. */
function bloque(html, tag, id) {
  const abre = new RegExp('<' + tag + '\\b[^>]*\\bid="' + id + '"[^>]*>', 'i');
  const m = abre.exec(html);
  if (!m) return null;
  const desde = m.index + m[0].length;
  const paso = new RegExp('<(/?)' + tag + '\\b', 'gi');
  paso.lastIndex = desde;
  let nivel = 1, t;
  while ((t = paso.exec(html))) {
    nivel += t[1] ? -1 : 1;
    if (nivel === 0) return html.slice(desde, t.index);
  }
  return null;
}

function entre(html, abreRe, cierraTag) {
  const m = abreRe.exec(html);
  if (!m) return null;
  const desde = m.index + m[0].length;
  const fin = html.indexOf('</' + cierraTag + '>', desde);
  return fin < 0 ? null : html.slice(desde, fin);
}

/* -------------------------------------------------------------- 1 y 2: FAQ */
const faq = JSON.parse(read(path.join(DIR, 'faq.json')));
const faqHtml = read(path.join(PARTS, 'faq.html'));
const faqLd = JSON.parse(read(path.join(DIR, 'faq-jsonld.json')));

for (const q of faq.preguntas) {
  const det = bloque(faqHtml, 'details', q.id);
  if (!det) { fallo(`faq.html no tiene <details id="${q.id}">`); continue; }

  const sum = entre(det, /<summary\b[^>]*>/i, 'summary');
  if (visible(sum || '') !== q.pregunta) {
    fallo(`${q.id}: la pregunta del HTML no es la de faq.json`);
    console.error('        html: ' + visible(sum || ''));
    console.error('        json: ' + q.pregunta);
  }

  const resp = entre(det, /<div class="faq__a">/i, 'div');
  if (visible(resp || '') !== q.respuesta) {
    fallo(`${q.id}: la respuesta del HTML no es la de faq.json`);
    console.error('        html: ' + visible(resp || '').slice(0, 160));
    console.error('        json: ' + q.respuesta.slice(0, 160));
  }
}
if (!fallos) ok(`faq.html dice lo mismo que faq.json — ${faq.preguntas.length} preguntas`);

const antes = fallos;
const conMarca = /\[[^\]\n]*por confirmar\]/i;
for (const q of faq.preguntas) {
  const tiene = conMarca.test(q.respuesta);
  if (tiene !== !!q.tieneMarcador) fallo(`${q.id}: tieneMarcador=${q.tieneMarcador} y el texto dice ${tiene}`);
  if (tiene && q.enJsonLd) fallo(`${q.id}: lleva marcador y está marcada para el JSON-LD`);
  // El marcador tiene que seguir el formato del resto del sitio, que es el
  // que reconoce _build/check-placeholders.js: nada detrás de "confirmar".
  if (tiene && !faqHtml.includes(q.respuesta.match(conMarca)[0])) {
    fallo(`${q.id}: el marcador del JSON no aparece literal en faq.html`);
  }
}
const enLd = faq.preguntas.filter((q) => q.enJsonLd);
if (faqLd.jsonld.mainEntity.length !== enLd.length) {
  fallo(`faq-jsonld.json tiene ${faqLd.jsonld.mainEntity.length} preguntas y faq.json marca ${enLd.length}`);
}
faqLd.jsonld.mainEntity.forEach((e, i) => {
  if (conMarca.test(e.acceptedAnswer.text)) fallo(`faq-jsonld: la pregunta ${i + 1} lleva un marcador`);
  const par = enLd.find((q) => q.pregunta === e.name);
  if (!par) fallo(`faq-jsonld: "${e.name}" no está en faq.json`);
  else if (par.respuesta !== e.acceptedAnswer.text) fallo(`faq-jsonld: la respuesta de "${e.name}" no coincide con faq.json`);
});
if (fallos === antes) ok(`faq-jsonld.json al día — ${enLd.length} preguntas, ${faq.preguntas.length - enLd.length} fuera por marcador`);

/* ---------------------------------------------------------- 3: las features */
const ft = JSON.parse(read(path.join(DIR, 'features.json')));
const ftHtml = read(path.join(PARTS, 'features.html'));
const antesFt = fallos;

for (const f of ft.features) {
  const li = bloque(ftHtml, 'li', 'funcion-' + f.clave);
  if (!li) { fallo(`features.html no tiene <li id="funcion-${f.clave}">`); continue; }

  const titulo = entre(li, /<a class="ft-card__link"[^>]*>/i, 'a');
  if (visible(titulo || '') !== f.titulo) fallo(`${f.clave}: el título del HTML no es el de features.json`);

  const kicker = entre(li, /<p class="ft-card__kicker">/i, 'p');
  if (visible(kicker || '') !== f.frase) fallo(`${f.clave}: la frase corta no coincide`);

  const body = entre(li, /<p class="ft-card__body">/i, 'p');
  if (visible(body || '') !== f.parrafo) fallo(`${f.clave}: el párrafo no coincide`);

  if (!new RegExp('href="' + f.enlace.replace(/[/]/g, '\\/') + '"').test(li)) {
    fallo(`${f.clave}: el href del HTML no es ${f.enlace}`);
  }
  if (!li.includes('data-feature-page="' + f.slug + '"')) fallo(`${f.clave}: falta data-feature-page="${f.slug}"`);

  const lista = entre(li, /<ul class="ft-card__q">/i, 'ul');
  const items = [...(lista || '').matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => visible(m[1]));
  if (items.join('|') !== f.contesta.join('|')) {
    fallo(`${f.clave}: los "qué contesta" no coinciden`);
    console.error('        html: ' + items.join(' / '));
    console.error('        json: ' + f.contesta.join(' / '));
  }
  if (!f.slug || !f.title || !f.metaDescription) fallo(`${f.clave}: le falta slug, title o metaDescription`);
  if (f.metaDescription.length > 165) fallo(`${f.clave}: metaDescription de ${f.metaDescription.length} caracteres (máx. 165)`);
  if (f.title.length > 65) fallo(`${f.clave}: title de ${f.title.length} caracteres (máx. 65)`);
}
const slugs = ft.features.map((f) => f.slug);
if (new Set(slugs).size !== slugs.length) fallo('hay slugs de feature repetidos');
if (fallos === antesFt) ok(`features.html dice lo mismo que features.json — ${ft.features.length} features`);

/* ------------------------------------------ 4: ni un color fuera de :root */
const antesCss = fallos;
for (const archivo of ['features.css', 'faq.css', 'opera.css']) {
  const p = path.join(PARTS, archivo);
  if (!fs.existsSync(p)) { fallo(`falta ${archivo}`); continue; }
  const css = read(p).replace(/\/\*[\s\S]*?\*\//g, '');   // fuera los comentarios
  // Trocea en :root { ... } y el resto.
  let fuera = '', i = 0;
  const re = /:root\s*\{/g;
  let m;
  while ((m = re.exec(css))) {
    fuera += css.slice(i, m.index);
    let nivel = 1, j = m.index + m[0].length;
    while (j < css.length && nivel > 0) { if (css[j] === '{') nivel++; else if (css[j] === '}') nivel--; j++; }
    i = j;
    re.lastIndex = j;
  }
  fuera += css.slice(i);
  const literales = [
    ...fuera.matchAll(/#[0-9a-f]{3,8}\b/gi),
    ...fuera.matchAll(/\b(?:rgba?|hsla?|oklch|color-mix)\s*\(/gi)
  ].map((x) => x[0]);
  if (literales.length) fallo(`${archivo}: ${literales.length} literal(es) de color fuera de :root — ${[...new Set(literales)].join(', ')}`);
}
if (fallos === antesCss) ok('los tres CSS no tienen ni un literal de color fuera de :root');

/* ------------------------------------------------ 5: los enlaces del panel */
const iHttp = process.argv.indexOf('--http');
if (iHttp !== -1) {
  const base = (process.argv[iHttp + 1] || 'http://localhost:4177').replace(/\/$/, '');
  const http = require(base.startsWith('https') ? 'https' : 'http');
  const pedir = (url) => new Promise((res) => {
    http.get(url, (r) => { r.resume(); res(r.statusCode); }).on('error', () => res(0));
  });
  (async () => {
    let malos = 0;
    for (const f of ft.features) {
      const code = await pedir(base + f.enlace);
      if (code !== 200) { console.error(`FALLO  ${f.clave}: ${base + f.enlace} devuelve ${code}`); malos++; }
      else console.log(`ok     ${String(code)}  ${f.enlace}`);
    }
    process.exit(fallos + malos ? 1 : 0);
  })();
} else {
  console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo en orden. Para comprobar los enlaces del panel: --http http://localhost:4177');
  process.exit(fallos ? 1 : 0);
}
