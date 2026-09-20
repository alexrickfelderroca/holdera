/*
 * _build/migrations/patch-nav-entrable.js
 *
 * «Funciones» e «Integraciones» son los dos ÚNICOS elementos de la barra que
 * no llevan a ninguna parte. Medido en el DOM en vivo: los otros cinco son
 * <a href>; estos dos son <button> con href:null y el destino guardado en
 * data-href — un atributo que se escribe en DOS sitios y no se lee en NINGUNO
 * (el comentario de script.js:792 lo admite: «no se usa hoy»).
 *
 * Y con ratón era literalmente imposible entrar, por una interacción entre dos
 * partes que por separado están bien:
 *   1. `pointerenter` abre el panel a los 90 ms.
 *   2. el clic hace `if (abierto === g) cerrar(g)`.
 * Para cuando el clic llega, el panel SIEMPRE está abierto, así que el clic lo
 * cerraba y además bloqueaba la reapertura hasta sacar el puntero. Es exacta-
 * mente lo que describió Alex: «lo despliegas y no te deja clicar».
 *
 * El arreglo NO puede ser mover la apertura al chevron: el chevron está DENTRO
 * del ancla (`<a class="mnu__trigger">Funciones<span class="mnu__chev">…`), así
 * que burbujearía igual, y un <button> dentro de un <a> es marcado inválido.
 * El arreglo es leer data-href: panel abierto + clic = entrar.
 *
 * Criterio, que vale para los tres modos de entrada:
 *   · ratón   — el hover ya abrió el panel, así que el clic entra.
 *   · táctil  — no hay hover: el primer toque abre, el segundo entra.
 *   · teclado — Enter abre, Enter otra vez entra (y ArrowDown sigue metiendo
 *               el foco dentro del panel, que es lo que ya hacía).
 * Con esto el destino deja de ser inalcanzable en los tres.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const RAIZ = path.join(__dirname, '..', '..');
const ARCHIVO = path.join(RAIZ, 'script.js');

const PARCHES = [
  {
    nombre: 'desplegable de escritorio',
    antes:
      '    g.btn.addEventListener(\'click\', (e) => {\n' +
      '      e.preventDefault();\n' +
      '      if (abierto === g) { cerrar(g, false); g.bloqueado = true; }\n' +
      '      else abrir(g);\n' +
      '    });',
    despues:
      '    g.btn.addEventListener(\'click\', (e) => {\n' +
      '      e.preventDefault();\n' +
      '      /* 🔴 Con el panel ABIERTO, el clic ENTRA. Antes lo cerraba, y como\n' +
      '         `pointerenter` lo abre a los 90 ms, con raton el panel siempre\n' +
      '         estaba abierto cuando llegaba el clic: entrar era imposible.\n' +
      '         El destino vive en data-href porque aBoton() convierte el <a> en\n' +
      '         <button>; hasta hoy ese atributo se escribia y no lo leia nadie. */\n' +
      '      const destino = g.btn.getAttribute(\'data-href\');\n' +
      '      if (abierto === g) {\n' +
      '        if (destino) { window.location.href = destino; return; }\n' +
      '        cerrar(g, false); g.bloqueado = true;\n' +
      '        return;\n' +
      '      }\n' +
      '      abrir(g);\n' +
      '    });',
  },
  {
    nombre: 'submenú del drawer',
    antes:
      '    f.btn.addEventListener(\'click\', (e) => {\n' +
      '      e.preventDefault();\n' +
      '      const abrir = f.lista.hidden;',
    despues:
      '    f.btn.addEventListener(\'click\', (e) => {\n' +
      '      e.preventDefault();\n' +
      '      /* Mismo criterio que arriba: la sublista ya desplegada significa que\n' +
      '         las opciones estan a la vista, asi que el segundo toque ENTRA en la\n' +
      '         pagina de la seccion en vez de volver a cerrar. En tactil, que es\n' +
      '         donde vive el drawer, era el unico camino que faltaba. */\n' +
      '      const destino = f.btn.getAttribute(\'data-href\');\n' +
      '      if (!f.lista.hidden && destino) { window.location.href = destino; return; }\n' +
      '      const abrir = f.lista.hidden;',
  },
];

let texto = fs.readFileSync(ARCHIVO, 'utf8');
const errores = [];
for (const p of PARCHES) {
  const veces = texto.split(p.antes).length - 1;
  if (veces !== 1) { errores.push(p.nombre + ': encontrado ' + veces + ' veces (se esperaba 1)'); continue; }
  // split/join, nunca replace(): `$$` y "$`" son escapes en el texto de
  // reemplazo y este proyecto ya se ha roto dos veces por ahi.
  texto = texto.split(p.antes).join(p.despues);
}

if (errores.length) {
  console.log('\n  NO SE HA ESCRITO NADA:\n');
  errores.forEach((e) => console.log('    ' + e));
  console.log('\n  (de una sola ejecucion: si ya estaba aplicado, esto es lo correcto)\n');
  process.exit(1);
}

fs.writeFileSync(ARCHIVO, texto);
console.log('\n  script.js parcheado: ' + PARCHES.map((p) => p.nombre).join(' + ') + '\n');
