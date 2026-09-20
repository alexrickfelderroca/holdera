/*
 * _build/migrations/park-showcase.js — aparca el escaparate del hero.
 *
 * El escaparate (telón oscuro + tres paneles de obra que entraban con cuñas de
 * clip-path al pasar el ratón por un servicio) ya NO existe en el marcado:
 * `is-showcase`, `hero__works` y `.sc__` no aparecen en ninguna de las 17
 * páginas ni en script.js. Lo sustituyeron el recorrido del hotel y la rejilla
 * de integraciones. Quedan 64 reglas huérfanas repartidas en NUEVE grupos de
 * styles.css, algunos dentro de @media.
 *
 * Decisión de Alex (20-09-2026): aparcar, no borrar — la misma convención que
 * ya usa el proyecto con los peces y las tarjetas retiradas.
 *
 *   node _build/migrations/park-showcase.js            # en seco: dice qué movería
 *   node _build/migrations/park-showcase.js --aplicar  # lo mueve
 *
 * Las 20 capturas de assets/img/producto/ NO se tocan: se quedan donde están.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..', '..');
const ORIGEN = path.join(RAIZ, 'styles.css');
const DESTINO = path.join(RAIZ, '_build', 'parked', 'showcase.css');
const APLICAR = process.argv.includes('--aplicar');

/* Un selector es del escaparate si empieza por uno de estos. Se compara el
   selector ENTERO, no un `includes`: `.hero__wordmark` no puede colarse por
   parecerse a `.hero__works`. */
const PREFIJOS = ['.sc__', '.sc-', '.hero__works', '.hero__veil'];
const CLASES = ['is-showcase', 'is-veiled'];

function esDelEscaparate(sel) {
  const s = sel.trim();
  if (PREFIJOS.some((p) => s.startsWith(p))) return true;
  return CLASES.some((c) => s.includes('.' + c));
}

/* Recorre el archivo a mano en vez de con una expresión regular: hay que
   respetar el anidamiento de @media y las llaves dentro de los valores
   (gradientes, clip-path). Devuelve una lista plana de bloques con su
   contexto de @media. */
function trocear(css) {
  const bloques = [];
  let i = 0;
  let preludio = '';
  const pila = [];

  while (i < css.length) {
    const ch = css[i];
    if (ch === '{') {
      const p = preludio.trim();
      // Llave de apertura: ¿es una at-rule con bloque (@media/@supports) o una regla?
      if (p.startsWith('@media') || p.startsWith('@supports')) {
        pila.push({ prelude: p, desdeLlave: i });
        preludio = '';
        i++;
        continue;
      }
      // Regla normal: buscar su llave de cierre respetando anidamiento
      let depth = 1;
      let j = i + 1;
      while (j < css.length && depth > 0) {
        if (css[j] === '{') depth++;
        else if (css[j] === '}') depth--;
        j++;
      }
      bloques.push({
        /* El comentario se quita ANTES de partir por comas. Si no, un
           comentario con una coma dentro («visibility: hidden, not just
           opacity 0») se trocea como si fuera una lista de selectores, la
           regla sale clasificada como mixta y no se mueve. El comentario sigue
           viajando con la regla, porque `desde` arranca antes que él. */
        selectores: p.replace(/\/\*[\s\S]*?\*\//g, ' ').split(',').map((s) => s.trim()).filter(Boolean),
        media: pila.map((x) => x.prelude),
        // El comentario que precede a la regla viaja CON ella: es media hoja
        // de por qué existe y perderlo al aparcar sería tirar lo mejor.
        desde: i - preludio.length,
        hasta: j,
      });
      preludio = '';
      i = j;
      continue;
    }
    if (ch === '}') { pila.pop(); preludio = ''; i++; continue; }
    preludio += ch;
    i++;
  }
  return bloques;
}

const css = fs.readFileSync(ORIGEN, 'utf8');
const bloques = trocear(css);

const aMover = bloques.filter(
  (b) => b.selectores.length > 0 && b.selectores.every(esDelEscaparate)
);
const mixtos = bloques.filter(
  (b) => b.selectores.some(esDelEscaparate) && !b.selectores.every(esDelEscaparate)
);

console.log('\n  reglas SOLO del escaparate: ' + aMover.length);
console.log('  reglas MIXTAS (escaparate + otra cosa): ' + mixtos.length);
if (mixtos.length) {
  console.log('\n  🔴 Las mixtas NO se mueven: partirlas es como se rompe una hoja de estilo.');
  mixtos.forEach((b) => console.log('     ' + b.selectores.join(', ').slice(0, 96)));
}

const porMedia = {};
aMover.forEach((b) => {
  const k = b.media.join(' && ') || '(sin media query)';
  (porMedia[k] ||= []).push(b);
});
console.log('');
for (const [k, lista] of Object.entries(porMedia)) {
  console.log('  ' + k + '  -> ' + lista.length + ' reglas');
}

if (!APLICAR) {
  console.log('\n  En seco. Para moverlas: --aplicar\n');
  process.exit(0);
}

/* --- escribir el aparcado --- */
let salida =
  '/* ==========================================================================\n' +
  '   EL ESCAPARATE DEL HERO — APARCADO el 20-09-2026\n' +
  '\n' +
  '   Qué era: al pasar el ratón por un servicio de la lista del hero, un telón\n' +
  '   (--sc-veil) oscurecía el hero entero y entraban tres paneles de obra con\n' +
  '   cuñas de clip-path desde distintos bordes, más el título grande del\n' +
  '   servicio. Referencia: grid-animations-8.mp4 («Directional Hover Reveal»).\n' +
  '\n' +
  '   Por qué está aquí: el marcado desapareció cuando la web giró al recorrido\n' +
  '   del hotel y a la rejilla de integraciones. Estas reglas se quedaron\n' +
  '   huérfanas en styles.css y, al pasar la web a paleta clara, hacían fallar\n' +
  '   la puerta de contraste con NUEVE suspensos contra un telón que ya no\n' +
  '   pinta nadie.\n' +
  '\n' +
  '   Qué hace falta para devolverlo:\n' +
  '     1. el marcado (.hero__works-list, .sc__stage, .sc__img, .sc__title)\n' +
  '     2. el JS que pone .is-showcase / .is-veiled y precarga la obra por data-bg\n' +
  '     3. los tokens --sc-veil y --sc-title-scrim en :root de styles.css\n' +
  '     4. las diez declaraciones de _build/contrast.js (ver el comentario allí)\n' +
  '     5. la obra: assets/img/producto/*.webp, que SIGUE en su sitio\n' +
  '   🔴 Y ojo: estos colores son de la etapa OSCURA. El telón oscurecía un hero\n' +
  '   claro, así que --on-ink-* eran texto claro; hoy --on-ink-* es tinta. Si\n' +
  '   vuelve, hay que re-derivar su texto, no pegarlo tal cual.\n' +
  '   ========================================================================== */\n\n';

for (const [k, lista] of Object.entries(porMedia)) {
  const dentro = lista[0].media;
  const trozos = lista.map((b) => css.slice(b.desde, b.hasta).trim());
  if (!dentro.length) {
    salida += trozos.join('\n\n') + '\n\n';
  } else {
    salida += dentro.join(' {\n') + ' {\n';
    salida += trozos.map((t) => t.split('\n').map((l) => '  ' + l).join('\n')).join('\n\n') + '\n';
    salida += dentro.map(() => '}').join('\n') + '\n\n';
  }
}

fs.mkdirSync(path.dirname(DESTINO), { recursive: true });
fs.writeFileSync(DESTINO, salida);

/* --- quitarlas del original, de atrás hacia delante --- */
let nuevo = css;
aMover.sort((a, b) => b.desde - a.desde).forEach((b) => {
  nuevo = nuevo.slice(0, b.desde) + nuevo.slice(b.hasta);
});
// Los tokens del escaparate salen del :root (son solo estos dos).
nuevo = nuevo
  .split(/\n[ \t]*--sc-veil:[^;]+;/).join('')
  .replace(/\n[ \t]*--sc-title-scrim:[\s\S]*?\);/, '');
// Tres o más saltos seguidos quedan feos tras quitar bloques.
nuevo = nuevo.replace(/\n{4,}/g, '\n\n\n');

fs.writeFileSync(ORIGEN, nuevo);
console.log('\n  MOVIDAS ' + aMover.length + ' reglas a _build/parked/showcase.css');
console.log('  styles.css: ' + css.length + ' -> ' + nuevo.length + ' bytes\n');
