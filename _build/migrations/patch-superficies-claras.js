/*
 * _build/migrations/patch-superficies-claras.js
 *
 * Las reglas que NO se arreglan cambiando un token, porque llevan el supuesto
 * «esto va sobre fondo oscuro» escrito dentro de la propia regla.
 * Migración de una sola ejecución: si algo ya está aplicado, aborta sin
 * escribir nada (y lo dice), en vez de aplicar la mitad.
 *
 * Se ejecuta DESPUÉS de `node _build/paleta-clara.js --apply`.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const RAIZ = path.join(__dirname, '..', '..');

const PARCHES = [
  {
    archivo: 'styles.css',
    porque:
      'El chip del monograma se aclaraba al pasar sobre la hoja OSCURA, para ' +
      'no ser un cuadrado negro sobre negro. Con la hoja clara ese aclarado ' +
      'deja un chip casi blanco con el monograma BLANCO encima: invisible. ' +
      'El chip vuelve a ser de tinta siempre, que además es lo mismo que hace ' +
      'el botón primario.',
    antes:
      '.nav.is-veiled .nav__mark, .nav.is-over-sheet .nav__mark { background: var(--on-ink-hi); }',
    despues:
      '/* El chip del monograma es de tinta SIEMPRE. Tenía un aclarado para\n' +
      '   cuando la nav pasaba sobre la hoja oscura; con toda la web clara ese\n' +
      '   aclarado dejaba un chip casi blanco con el monograma blanco dentro. */',
  },
  {
    archivo: 'styles.css',
    porque:
      'La barra inferior del hero era una banda de tinta. Su texto era blanco ' +
      'al 84% y su sombra la del botón de tinta, que lleva un realce blanco ' +
      'interior. Sobre una banda clara los dos son invisibles.',
    antes: '  color: var(--w-84); font-size: 12px; letter-spacing: 0.01em;\n  box-shadow: var(--shadow-ink);',
    despues: '  color: var(--text-2); font-size: 12px; letter-spacing: 0.01em;\n  box-shadow: var(--shadow-soft);',
  },
  {
    archivo: 'sections.css',
    porque: 'El hover de una marca de la marquesina subía a blanco. Ahora sube a tinta.',
    antes: '.hero__bar--mrq .mrq__item:hover svg { color: var(--w-90); }',
    despues: '.hero__bar--mrq .mrq__item:hover svg { color: var(--text); }',
  },
  {
    archivo: 'sections.css',
    porque: 'El botón de pausa de la marquesina, mismo caso.',
    antes: '.mrq__pause:hover { color: var(--w-90); border-color: var(--on-ink-hi); }',
    despues: '.mrq__pause:hover { color: var(--text); border-color: var(--border-strong); }',
  },
];

const porArchivo = {};
const errores = [];

for (const p of PARCHES) {
  const abs = path.join(RAIZ, p.archivo);
  const texto = porArchivo[abs] !== undefined ? porArchivo[abs] : fs.readFileSync(abs, 'utf8');
  const veces = texto.split(p.antes).length - 1;
  if (veces !== 1) {
    errores.push(
      p.archivo + '  «' + p.antes.split('\n')[0].slice(0, 58) + '…»  -> encontrado ' + veces + ' veces'
    );
    continue;
  }
  // split/join y no replace(): en el texto de reemplazo `$$` y `$\`` son
  // escapes y este proyecto ya se ha roto DOS veces por ahí.
  porArchivo[abs] = texto.split(p.antes).join(p.despues);
}

if (errores.length) {
  console.log('\n  NO SE HA ESCRITO NADA:\n');
  errores.forEach((e) => console.log('    ' + e));
  console.log('\n  (si ya estaba aplicado, esto es lo correcto: es de una sola ejecución)\n');
  process.exit(1);
}

for (const [abs, texto] of Object.entries(porArchivo)) fs.writeFileSync(abs, texto);
console.log('\n  ' + PARCHES.length + ' reglas parcheadas en ' + Object.keys(porArchivo).length + ' archivos:\n');
PARCHES.forEach((p) => console.log('    ' + p.archivo.padEnd(14) + p.antes.split('\n')[0].trim().slice(0, 62)));
console.log('');
