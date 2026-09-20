/* HOLDERA — los colores de marca del hover de integraciones.
 *
 *   node _build/integraciones/build-brand-tokens.js         reescribe el bloque
 *   node _build/integraciones/build-brand-tokens.js --dry   solo lo imprime
 *
 * Escribe en `styles.css`, entre `/* logos:brand-start *&#47;` y
 * `/* logos:brand-end *&#47;`. Fuera de esas dos marcas no toca nada — el
 * resto del archivo es de otra sesion.
 *
 * QUE RESUELVE
 * ------------
 * Al pasar el raton por una integracion, el logotipo toma SU color de marca
 * y la celda no se mueve (Alex, 20-09-2026: «que cambia solo lo que viene a
 * ser el logo con su color original, no la cuadricula entera»). Los SVG son
 * monocromos en `currentColor`, asi que el color vive aqui y no dentro del
 * dibujo — requisito de `design-system.md` y de `check-tokens.js`.
 *
 * 🔴 EL COLOR DE MARCA NO SE COPIA TAL CUAL: SE MIDE
 * --------------------------------------------------
 * Un logotipo es un grafico no textual, asi que WCAG 1.4.11 le pide 3:1
 * contra su fondo. Y varios de estos colores estan pensados para el fondo
 * de su propia web, no para donde aterrizan aqui: medido sobre la celda
 * real del hero, el turquesa de Monei da 2,75:1 y el azul de SAP 2,78:1.
 * Con esos, el hover no "resalta" la marca: la BORRA.
 * Los suelos contra los que se mide, y por que son dos, en `SUELOS`.
 *
 * Por eso cada color pasa por `oscurecer()`: se conserva el tono y la
 * saturacion (HSL) y se baja la luminosidad en pasos de 1 % hasta llegar a
 * 3:1. El que ya pasa no se toca. El resultado y el color original quedan
 * los dos escritos en el CSS, para que se vea cuanto se movio y por que.
 *
 * Una marca sin color propio (Revo y Paycomet publican su logo en blanco o
 * negro) no genera token: el hover cae en `currentColor` y la marca
 * simplemente se oscurece, que es lo que hacia antes. No se inventa un
 * color de marca que la empresa no tiene.
 */
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const ROOT = path.join(HERE, '..', '..');
const CSS = path.join(ROOT, 'styles.css');
const START = '/* logos:brand-start */';
const END = '/* logos:brand-end */';
const DRY = process.argv.includes('--dry');

/* El fondo real de una celda: --w-60 (blanco translucido) sobre --bg.
 *
 * 🔴 Se LEE de styles.css, no se escribe aqui. La paleta de la web se esta
 * moviendo (toda la parte publica pasa a claro, decision de Alex el
 * 20-09-2026) y un fondo escrito a mano en el generador convierte esa
 * migracion en un fallo silencioso: los colores seguirian corregidos contra
 * un gris que ya no existe y nadie se enteraria hasta mirar una marca
 * lavada en pantalla. Asi basta con volver a pasar este script. */
function tokenValue(css, name) {
  const m = new RegExp('^\\s*' + name + ':\\s*([^;]+);', 'm').exec(css);
  return m ? m[1].trim() : null;
}
function parseColour(v) {
  const hex = /^#([0-9a-f]{6})$/i.exec(v);
  if (hex) return { rgb: [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)), a: 1 };
  const rgba = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)$/i.exec(v);
  if (rgba) return { rgb: [1, 2, 3].map((i) => Number(rgba[i])), a: rgba[4] === undefined ? 1 : Number(rgba[4]) };
  return null;
}
function mix(fg, alpha, bg) {
  return fg.map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha)));
}
const SUELOS = (() => {
  const css = fs.readFileSync(path.join(__dirname, '..', '..', 'styles.css'), 'utf8');
  const capa = parseColour(tokenValue(css, '--w-60') || '');
  const fondo = parseColour(tokenValue(css, '--bg') || '');
  if (!capa || !fondo) {
    throw new Error('no se pueden leer --w-60 y --bg de styles.css: sin el fondo real no se puede medir nada');
  }
  const celdaHero = mix(capa.rgb, capa.a, fondo.rgb);
  /* 🔴 SE MIDE CONTRA TODOS LOS SUELOS, NO CONTRA "EL PEOR".
     La misma marca se pinta en dos sitios con fondo distinto: la rejilla
     del hero (--w-60 sobre --bg) y las tarjetas del catalogo, blancas.

     La primera version de esto elegia UN suelo, el mas claro, "porque un
     color claro rinde peor sobre fondo claro". Es falso al reves: el ratio
     depende de la DIFERENCIA, asi que un color mas OSCURO que el fondo
     mejora cuanto mas claro es el fondo. Medido: el naranja de Redsys
     (#dc7c26) da 3,02:1 sobre blanco y 2,77:1 sobre #f5f5f5. Eligiendo el
     blanco, el generador lo daba por bueno y en el hero estaba suspenso.

     No hay un "peor suelo" universal, asi que no se elige: se exige 3:1
     contra CADA UNO. Es la misma leccion de `contrast.js` con el suelo del
     hero, aprendida otra vez por el otro lado. */
  return [celdaHero, [255, 255, 255]];
})();
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');
}
function luminance([r, g, b]) {
  const f = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function ratio(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function hslToRgb([h, s, l]) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    t = (t + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

/** El peor ratio de un color contra todos los suelos donde puede aterrizar. */
function peorRatio(rgb) {
  return SUELOS.reduce((peor, suelo) => Math.min(peor, ratio(rgb, suelo)), Infinity);
}

/** Baja la luminosidad conservando tono y saturacion hasta que TODOS los suelos llegan a `need`. */
function oscurecer(hex, need = 3) {
  const rgb = hexToRgb(hex);
  if (peorRatio(rgb) >= need) return { hex, movido: false, ratio: peorRatio(rgb) };
  const [h, s] = rgbToHsl(rgb);
  for (let l = rgbToHsl(rgb)[2]; l >= 0; l -= 0.01) {
    const cand = hslToRgb([h, s, l]).map(Math.round);
    if (peorRatio(cand) >= need) return { hex: rgbToHex(cand), movido: true, ratio: peorRatio(cand) };
  }
  return { hex: '#000000', movido: true, ratio: peorRatio([0, 0, 0]) };
}

function main() {
  const marcas = JSON.parse(fs.readFileSync(path.join(HERE, 'marcas.json'), 'utf8')).marcas;
  const catalogo = JSON.parse(fs.readFileSync(path.join(HERE, 'integraciones.json'), 'utf8'));
  const nombre = new Map(catalogo.integraciones.map((i) => [i.slug, i.nombre]));

  /* Los de simple-icons: su color oficial viaja con el icono. */
  let si = null;
  try {
    si = require(path.join(ROOT, '_build/logos/node_modules/si-current'));
  } catch { /* la carpeta no viaja en el repo; sin ella solo faltan 4 colores */ }
  const SI_SLUG = { redsys: 'Redsys', stripe: 'Stripe', sap: 'SAP' };
  const siHex = (slug) => {
    if (!si || !SI_SLUG[slug]) return null;
    const hit = Object.values(si).find((i) => i && i.title === SI_SLUG[slug]);
    return hit ? '#' + hit.hex.toLowerCase() : null;
  };

  /* La proporcion de cada dibujo, leida del archivo servido. Es la unica
     fuente honesta: el wordmark y el logotipo oficial de una misma marca no
     miden lo mismo, y quien decide cual se sirve es `build-logos.js`. */
  const SERVIDOS = path.join(ROOT, 'assets', 'img', 'integraciones');
  const ratioDe = (slug) => {
    const f = path.join(SERVIDOS, slug + '.svg');
    if (!fs.existsSync(f)) return null;
    const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(fs.readFileSync(f, 'utf8'));
    return vb ? `${vb[1]} / ${vb[2]}` : null;
  };

  const rows = [];
  // (los slugs sin color propio no generan token; su mascara se emite abajo)
  for (const slug of new Set([...Object.keys(marcas), ...Object.keys(SI_SLUG)])) {
    const origen = (marcas[slug] && marcas[slug].hex) || siHex(slug);
    if (!origen) {

      continue;
    }
    const d = oscurecer(origen);
    rows.push({ slug, nombre: nombre.get(slug) || slug, origen, hex: d.hex, movido: d.movido, ratio: d.ratio, ratio2: ratioDe(slug) });
  }
  rows.sort((a, b) => a.slug.localeCompare(b.slug));

  const lines = [];
  lines.push(START);
  lines.push('/* Generado por `node _build/integraciones/build-brand-tokens.js`. No editar a mano:');
  lines.push('   se reescribe entero. El color de cada marca es el que publica su empresa,');
  lines.push(`   oscurecido lo justo para llegar a 3:1 sobre CADA uno de los suelos donde`);
  lines.push(`   aterriza: ${SUELOS.map(rgbToHex).join(' y ')} (la celda del hero y la tarjeta del`);
  lines.push('   catalogo). El original va en el comentario de cada linea. */');
  lines.push(':root {');
  for (const r of rows) {
    const nota = r.movido ? `${r.origen} -> ${r.ratio.toFixed(2)}:1` : `${r.origen}, sin tocar, ${r.ratio.toFixed(2)}:1`;
    lines.push(`  --brand-${r.slug}: ${r.hex}; /* ${r.nombre}: ${nota} */`);
  }
  lines.push('}');
  lines.push('');
  lines.push('/* El puente: cada elemento que pinta una marca lleva data-brand="<slug>" y');
  lines.push('   con esto hereda su color en una sola variable, asi el consumidor escribe');
  lines.push('   UNA regla de hover y no cuarenta. Sin token, `--brand` no existe y el');
  lines.push('   hover cae en el color de reposo: ninguna marca se queda invisible. */');
  for (const r of rows) lines.push(`[data-brand="${r.slug}"] { --brand: var(--brand-${r.slug}); }`);

  /* --- El dibujo, por mascara y no incrustado -----------------------------
     Los 41 SVG son monocromos, asi que sirven de MASCARA: el color lo pone
     `background-color` y el archivo solo aporta la silueta. Asi el dibujo se
     pinta con `currentColor` sin tener que viajar dentro del HTML.

     Medido: incrustar los nueve de la rejilla del hero en `index.html`
     engordaba el documento de 18.885 a 30.845 bytes con brotli — un 63 % mas
     de HTML bloqueante por una rejilla decorativa del aside. Con mascara el
     documento se queda igual (18.862) y los nueve archivos se cachean aparte
     y los comparte la pagina de integraciones.

     `--mark-ratio` es la proporcion real de cada archivo (su viewBox), y va
     en `aspect-ratio` para que la caja mida lo que mide la marca: una
     mascara no tiene tamano intrinseco y sin esto todas saldrian cuadradas. */
  lines.push('');
  const servidos = fs
    .readdirSync(SERVIDOS)
    .filter((f) => f.endsWith('.svg'))
    .map((f) => f.slice(0, -4))
    .sort();
  for (const slug of servidos) {
    const r2 = ratioDe(slug);
    if (!r2) continue;
    lines.push(`[data-brand="${slug}"] { --mark: url("assets/img/integraciones/${slug}.svg"); --mark-ratio: ${r2}; }`);
  }
  lines.push(END);
  const block = lines.join('\n');

  if (DRY) {
    console.log(block);
    return;
  }
  let css = fs.readFileSync(CSS, 'utf8');
  const a = css.indexOf(START);
  const b = css.indexOf(END);
  if (a === -1 || b === -1) {
    css = css.replace(/\s*$/, '\n\n' + block + '\n');
  } else {
    css = css.slice(0, a) + block + css.slice(b + END.length);
  }
  fs.writeFileSync(CSS, css);
  const movidos = rows.filter((r) => r.movido);
  console.log(`${rows.length} colores de marca escritos en styles.css`);
  console.log(`  oscurecidos para llegar a 3:1 sobre la celda: ${movidos.length}`);
  for (const r of movidos) console.log(`    ${r.nombre.padEnd(14)} ${r.origen} -> ${r.hex}  (${r.ratio.toFixed(2)}:1)`);
}

main();
