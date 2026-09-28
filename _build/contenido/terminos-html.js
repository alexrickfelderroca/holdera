#!/usr/bin/env node
/*
 * _build/contenido/terminos-html.js — marcadores [[…]] en páginas escritas a mano.
 *
 *   node _build/contenido/terminos-html.js nosotros.html [otra.html …]
 *
 * Las páginas generadas (funciones, glosario) ya salen con los términos
 * marcados. Las que se escriben a mano —nosotros.html— usan el mismo
 * marcador en el texto: [[ADR]] o [[texto visible|id]]. Esto los convierte en
 * <abbr class="term" …> con terminos-lib.js, la misma función que usa el
 * generador, así que el marcado es idéntico en todo el sitio.
 *
 * Idempotente: después de pasarlo no queda ningún marcador, y un segundo pase
 * no cambia nada. Un marcador sin definición en glosario.json hace fallar el
 * script SIN escribir el archivo.
 *
 * Añade además <script src="terminos.js" defer> detrás de script.js si la
 * página tiene algún término y todavía no lo carga.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const lib = require('./terminos-lib');

const ROOT = path.resolve(__dirname, '..', '..');
const files = process.argv.slice(2);
if (!files.length) {
  console.error('Uso: node _build/contenido/terminos-html.js pagina.html [...]');
  process.exit(1);
}

let fallos = 0;
for (const rel of files) {
  const file = path.join(ROOT, rel);
  const src = fs.readFileSync(file, 'utf8');
  let out;
  try {
    /* Solo el texto entre etiquetas: un [[ ]] dentro de un atributo no es un
       término que se pueda marcar (no puede llevar etiquetas dentro). */
    out = src.replace(/>([^<]*\[\[[^<]*)</g, (whole, text) => {
      // El texto ya viene escapado como HTML; render() escaparía otra vez los
      // &amp;. Se desescapan las cuatro entidades que render() vuelve a poner.
      const raw = text.split('&lt;').join('<').split('&gt;').join('>').split('&quot;').join('"').split('&amp;').join('&');
      return '>' + lib.render(raw, rel) + '<';
    });
  } catch (e) {
    console.error('FALLO  ' + rel + ': ' + e.message);
    fallos++;
    continue;
  }
  if (out.indexOf('[[') >= 0) {
    console.error('FALLO  ' + rel + ': queda un [[ sin convertir (¿dentro de un atributo?)');
    fallos++;
    continue;
  }
  if (/class="term"/.test(out) && !/src="terminos\.js/.test(out)) {
    out = out.replace(/(<script src="script\.js[^"]*" defer><\/script>)/, '$1\n  <script src="terminos.js" defer></script>');
  }
  if (out !== src) {
    fs.writeFileSync(file, out);
    console.log('OK     ' + rel + ' — ' + (out.match(/class="term"/g) || []).length + ' términos');
  } else {
    console.log('igual  ' + rel);
  }
}
process.exit(fallos ? 1 : 0);
