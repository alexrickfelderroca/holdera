/*
 * _build/migrations/patch-integraciones.js
 *
 * Encargo de Alex (20-09-2026), reafirmado por el explicitamente:
 *   "si que es verdad que nos integramos con eso ... yo te digo que lo hagas,
 *    lo haces. Asi que las integraciones tambien lo pones y lo comiteas."
 *
 * 🔴 PROCEDENCIA DE LA AFIRMACION, para quien lea esto dentro de seis meses:
 * las 50 integraciones salen del catalogo publico de Hotelgest, con quien
 * Holdera colabora en el sector (ver _build/integraciones/integraciones.json,
 * campo `procedencia`). Que Holdera integre cada una de ellas NO esta
 * verificado tecnicamente en este repositorio: es una AFIRMACION DE NEGOCIO
 * DE ALEX, dada el 20-09-2026 y publicada por instruccion suya. Entre ellas
 * hay seis que no son software sino organismos y regimenes legales
 * (SES Hospedajes, Ertzaintza, Mossos d'Esquadra, MiDNI, TicketBAI,
 * Verifactu): afirmarlas es afirmar cumplimiento normativo. Si alguna vez hay
 * que retirarlas, se quita su grupo de `grupos` en el JSON y se regenera.
 *
 * QUE HACE
 *   1. --bar-h de 46px a 80px EN :root (la barra se engorda, como pidio Alex).
 *   2. La barra de cuatro chips -> la tira giratoria de 41 marcas.
 *   3. El bloque .trace de la columna derecha -> la rejilla de nueve marcas.
 *   4. Seccion #integraciones nueva con las 50 por categorias.
 *   5. Boton de pausa en la tira (WCAG 2.2.2, nivel A).
 *
 * Idempotente. split().join(), nunca String.replace().
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const INDEX = path.join(ROOT, 'index.html');
const STYLES = path.join(ROOT, 'styles.css');
const PARTS = path.join(ROOT, '_build', 'parts');

const entre = (texto, a, b) => {
  const i = texto.indexOf(a);
  const j = texto.indexOf(b, i);
  if (i < 0 || j < 0) { console.error(`! no encuentro ${a}`); process.exit(1); }
  return texto.slice(i + a.length, j).trim();
};

const gen = fs.readFileSync(path.join(PARTS, 'integraciones.html'), 'utf8');
const TIRA = entre(gen, '<!-- part:tira -->', '<!-- /part:tira -->');
const NAV = entre(gen, '<!-- part:nav -->', '<!-- /part:nav -->');
const ASIDE = fs.readFileSync(path.join(PARTS, 'ints-aside.html'), 'utf8').trim();

/* ---------------- styles.css: la altura de la barra ---------------- */
let css = fs.readFileSync(STYLES, 'utf8');
const cssAntes = css;

if (css.includes('  --bar-h: 46px;')) {
  css = css.split('  --bar-h: 46px;').join(
    '  /* 80px, no 46: la barra inferior dejo de ser cuatro chips de texto y es\n'
    + '     la tira giratoria de integraciones, que necesita alto para los logos.\n'
    + '     🔴 Se sube AQUI, en :root, y no dentro de .hero__bar--mrq. Motivo: la\n'
    + '     linea 494 reserva el suelo de .hero__left con\n'
    + '     calc(var(--bar-inset) + var(--bar-h) + 26px) leyendo la RAIZ. Si la\n'
    + '     altura se reescribe solo en la barra, la columna izquierda sigue\n'
    + '     reservando 46 y se mete 34px dentro de la tira. */\n'
    + '  --bar-h: 80px;');
  console.log('  + styles.css: --bar-h 46 -> 80 en :root');
}

/* El escalon de altura corta ponia --bar-h en .hero__bar, donde .hero__left no
   lo ve. Se mueve a :root dentro de la misma media query. */
if (css.includes('  .hero__bar { --bar-h: 40px; font-size: 11px; }')) {
  css = css.split('  .hero__bar { --bar-h: 40px; font-size: 11px; }').join(
    '  /* El alto va en :root para que lo vea tambien la reserva de suelo de\n'
    + '     .hero__left (linea ~494). Antes estaba en .hero__bar y no lo veia. */\n'
    + '  :root { --bar-h: 62px; }\n'
    + '  .hero__bar { font-size: 11px; }');
  console.log('  + styles.css: escalon de altura corta a :root (62px)');
}

if (css !== cssAntes) fs.writeFileSync(STYLES, css);

/* ---------------- index.html ---------------- */
let html = fs.readFileSync(INDEX, 'utf8');
const htmlAntes = html;

function reemplazarBloque(nombre, inicio, fin, nuevo) {
  if (!html.includes(inicio)) { console.log(`  · ${nombre}: ya sustituido`); return; }
  if (html.split(inicio).length - 1 > 1) { console.error(`! ${nombre}: ancla ambigua`); process.exit(1); }
  const i = html.indexOf(inicio);
  const j = html.indexOf(fin, i);
  if (j < 0) { console.error(`! ${nombre}: sin cierre`); process.exit(1); }
  html = html.slice(0, i) + nuevo + html.slice(j + fin.length);
  console.log(`  ~ ${nombre}`);
}

// 1. la barra de cuatro chips -> la tira
reemplazarBloque('barra inferior -> tira de 41 marcas',
  '        <div class="hero__bar" data-enter style="--d:700">',
  '        </div>',
  TIRA.split('\n').map((l) => (l ? '        ' + l : l)).join('\n'));

// 2. la cadena de evidencia -> la rejilla de nueve marcas
reemplazarBloque('.trace -> rejilla de integraciones',
  '        <div class="trace" data-enter style="--d:520">',
  '        </div>',
  ASIDE.split('\n').map((l) => (l ? '        ' + l : l)).join('\n'));

// 3. la seccion con las 50, justo antes del contacto
if (!html.includes('id="integraciones"')) {
  const ancla = '    <section class="sheet sheet--cta" id="contacto"';
  if (!html.includes(ancla)) { console.error('! no encuentro la seccion de contacto'); process.exit(1); }
  const seccion = '    <section class="sheet" id="integraciones" aria-labelledby="ints-title">\n'
    + '      <div class="container">\n'
    + '        <p class="tag reveal" data-reveal="up">Integraciones</p>\n'
    + '        <h2 id="ints-title" class="sheet__title reveal" data-reveal="up" style="--i:1">Se conecta con <span class="fade">lo que ya usas.</span></h2>\n'
    + '      </div>\n'
    + '      <div class="container reveal" data-reveal="up" style="--i:2">\n'
    + NAV.split('\n').map((l) => (l ? '        ' + l : l)).join('\n') + '\n'
    + '      </div>\n'
    + '    </section>\n\n';
  html = html.split(ancla).join(seccion + ancla);
  console.log('  + seccion #integraciones (50 entradas, 10 grupos)');
}

if (html !== htmlAntes) fs.writeFileSync(INDEX, html);

/* ---------------- comprobaciones ---------------- */
const vivo = html.replace(/<!--[\s\S]*?-->/g, '');
const abre = (vivo.match(/<section\b/g) || []).length;
const cierra = (vivo.match(/<\/section>/g) || []).length;
console.log(`\n<section> ${abre}/${cierra} ${abre === cierra ? 'OK' : '!! DESCUADRE'}`);
const cuenta = (s) => html.split(s).length - 1;
console.log(`  .mrq__item (41 x2 pasadas): ${cuenta('class="mrq__item"')}`);
console.log(`  .hints__item (9): ${cuenta('class="hints__item"')}`);
console.log(`  .ints__group (10): ${cuenta('class="ints__group"')}`);
console.log(`  restos de .trace: ${cuenta('class="trace')}`);
console.log(`  restos de la barra vieja: ${cuenta('<div class="hero__bar" ')}`);
if (abre !== cierra) process.exit(1);
