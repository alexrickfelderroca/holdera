/*
 * _build/migrations/patch-titulos-unificados.js
 *
 * Encargo de Alex (20-09-2026): «la tipografía del hero tiene que estar en todo
 * el resto de la web» y «los textos con este tipo de tipografía más fina hay
 * que quitarlos».
 *
 * Qué pasaba de verdad, medido: NO es un problema de fuente. Las 17 páginas
 * cargan Geist y ninguna cae al fallback (comprobado archivo a archivo,
 * resolviendo las rutas a mano). Lo que cambia es CÓMO se pinta un titular, y
 * hay dos tratamientos distintos conviviendo:
 *
 *   · hero (.hero__title) y cabecera de página interior (.phead__title):
 *     UN degradado de TRES paradas sobre el título ENTERO —
 *     --text 0% → --text-2 46% → --text-fade 100%. El apagado es gradual y
 *     recorre todo el bloque, así que apenas se nota como cambio de color.
 *
 *   · títulos de sección (.sheet__title): la primera mitad en --sh-text (casi
 *     negro) y la segunda envuelta en <span class="fade">, que arranca DE
 *     GOLPE en --sh-text-2 y termina en --sh-muted. El salto cae dentro del
 *     mismo título y a 74px se lee como si media frase estuviera en otra
 *     fuente más ligera. Son 42 titulares en 15 de las 17 páginas.
 *
 * El arreglo es que el título de sección use el MISMO degradado que el hero,
 * sobre el título entero, y que `.fade` deje de pintar el suyo. Los 42 <span
 * class="fade"> se quedan en el marcado: sin color ni fondo propios heredan el
 * `color: transparent` del padre y el degradado del padre se ve a través, así
 * que no hay que tocar 15 páginas. Si algún día vuelve a hacer falta marcar la
 * segunda mitad, el gancho sigue ahí.
 *
 * 🔴 El clip va en el MISMO elemento que se transforma. `.sheet__title` lleva
 * `.reveal`, que anima translateY: si el degradado viviera en un hijo, durante
 * la entrada el texto saldría INVISIBLE y aparecería de golpe al terminar — es
 * la trampa que ya costó una ronda con el H1 del hero en el paso 5.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const RAIZ = path.join(__dirname, '..', '..');
const ARCHIVO = path.join(RAIZ, 'styles.css');

const PARCHES = [
  {
    nombre: 'token --sh-fade (el espejo cálido de --text-fade)',
    antes: '  --sh-muted: #5f594e;',
    despues:
      '  --sh-muted: #5f594e;\n' +
      '  /* La parada más clara del degradado de un titular sobre la hoja: el\n' +
      '     espejo cálido de --text-fade (#7a7a7a), que es la misma parada sobre\n' +
      '     el hero. Sobre la hoja clara mide 4,30:1 y sobre una tarjeta 4,68:1 —\n' +
      '     mejor que el 3,41:1 del original, porque la hoja es más clara que el\n' +
      '     gris del hero. Un titular es texto grande y debe 3:1. */\n' +
      '  --sh-fade: #7a736a;',
  },
  {
    nombre: '.sheet__title con el degradado del hero',
    antes:
      '.sheet__title {\n' +
      '  max-width: 15ch; margin: 0 0 28px;\n' +
      '  font-size: clamp(38px, 5vw, 74px); line-height: 1.02; letter-spacing: -0.035em; font-weight: 500;\n' +
      '}',
    despues:
      '/* Mismo tratamiento que .hero__title y .phead__title: un solo degradado de\n' +
      '   tres paradas sobre el título ENTERO. Antes el apagado lo hacía un <span>\n' +
      '   a mitad de frase y se leía como un cambio de fuente.\n' +
      '   El interlineado baja de 1.02 a 0.98, que es el del hero y el de las\n' +
      '   cabeceras de página: los tres titulares grandes del sitio se componen\n' +
      '   ahora igual. */\n' +
      '.sheet__title {\n' +
      '  max-width: 15ch; margin: 0 0 28px;\n' +
      '  font-size: clamp(38px, 5vw, 74px); line-height: 0.98; letter-spacing: -0.035em; font-weight: 500;\n' +
      '  background: linear-gradient(100deg, var(--sh-text) 0%, var(--sh-text-2) 46%, var(--sh-fade) 100%);\n' +
      '  -webkit-background-clip: text; background-clip: text; color: transparent;\n' +
      '  text-wrap: balance;\n' +
      '}',
  },
  {
    nombre: '.fade deja de pintar su propio degradado',
    antes:
      '.fade {\n' +
      '  background: linear-gradient(90deg, var(--sh-text-2) 0%, var(--sh-muted) 100%);\n' +
      '  -webkit-background-clip: text; background-clip: text; color: transparent;\n' +
      '}',
    despues:
      '/* `.fade` ya no pinta nada: su padre lleva el degradado y lo recorta sobre\n' +
      '   todo el texto, hijos incluidos. El span hereda `color: transparent` y el\n' +
      '   degradado del padre se ve a través, así que los 42 <span class="fade">\n' +
      '   de las 15 páginas siguen en su sitio sin tocar ni una. Se conserva como\n' +
      '   gancho por si vuelve a hacer falta distinguir la segunda mitad. */\n' +
      '.fade { color: inherit; }',
  },
];

let texto = fs.readFileSync(ARCHIVO, 'utf8');
const errores = [];
for (const p of PARCHES) {
  const veces = texto.split(p.antes).length - 1;
  if (veces !== 1) { errores.push(p.nombre + ': encontrado ' + veces + ' veces'); continue; }
  texto = texto.split(p.antes).join(p.despues);   // split/join, nunca replace()
}

if (errores.length) {
  console.log('\n  NO SE HA ESCRITO NADA:\n');
  errores.forEach((e) => console.log('    ' + e));
  console.log('');
  process.exit(1);
}

fs.writeFileSync(ARCHIVO, texto);
console.log('\n  ' + PARCHES.length + ' parches aplicados en styles.css:');
PARCHES.forEach((p) => console.log('    · ' + p.nombre));
console.log('');
