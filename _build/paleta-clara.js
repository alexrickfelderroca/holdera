/*
 * _build/paleta-clara.js — deriva y VERIFICA la paleta clara de la hoja.
 *
 * Contexto: en el paso 3 la hoja (del hero al pie) se invirtió de clara a
 * oscura. Alex ha pedido (20-09-2026) que TODA la web pública vuelva a clara.
 * Los nombres de los tokens no cambian: cambia su VALOR. Igual que entonces,
 * pero al revés.
 *
 * Por qué es un script y no una tabla escrita a mano: este proyecto ya tiene
 * escrita tres veces la misma lección — un verificador con los valores
 * incrustados miente en las dos direcciones. Así que:
 *   1. Los valores de HOY se LEEN de styles.css, no se copian aquí.
 *   2. Los valores propuestos se declaran una sola vez, abajo.
 *   3. Cada par (frente sobre su pila de fondos) se compone y se mide de
 *      verdad, con alfa incluido, y sale con código 1 si algo no llega.
 *
 * Uso:
 *   node _build/paleta-clara.js            # tabla + veredicto
 *   node _build/paleta-clara.js --css      # escupe el bloque CSS ya listo
 */
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const CSS = fs.readFileSync(path.join(RAIZ, 'styles.css'), 'utf8');

/* ---------- color ---------- */

function hexARgb(h) {
  const s = h.replace('#', '').trim();
  const t = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
  return [parseInt(t.slice(0, 2), 16), parseInt(t.slice(2, 4), 16), parseInt(t.slice(4, 6), 16)];
}

function leerColor(v) {
  const s = String(v).trim();
  if (s.startsWith('#')) return { rgb: hexARgb(s), a: 1 };
  const m = s.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.]+)\s*)?\)/);
  if (!m) return null;
  return { rgb: [Number(m[1]), Number(m[2]), Number(m[3])], a: m[4] === undefined ? 1 : Number(m[4]) };
}

/* Compone una pila de capas de abajo a arriba. Es lo que hace falta de verdad:
   casi ningún texto de este sitio está sobre un color opaco — está sobre un
   borde translúcido sobre una tarjeta sobre la hoja. Medir contra el color que
   uno SUPONE que hay detrás es exactamente el fallo que metió 146 suspensos en
   el panel del paso 11. */
function componer(capas) {
  let out = null;
  for (const c of capas) {
    const cap = typeof c === 'string' ? leerColor(c) : c;
    if (!cap) throw new Error('color ilegible: ' + c);
    if (!out) { out = cap.a === 1 ? cap.rgb.slice() : cap.rgb.slice(); continue; }
    out = [0, 1, 2].map((i) => cap.rgb[i] * cap.a + out[i] * (1 - cap.a));
  }
  return out;
}

function luminancia(rgb) {
  const l = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
}

function ratio(frenteCapas, fondoCapas) {
  const f = componer(frenteCapas);
  const b = componer(fondoCapas);
  const [a, z] = [luminancia(f), luminancia(b)].sort((x, y) => y - x);
  return (a + 0.05) / (z + 0.05);
}

/* ---------- solucionadores ----------
 * Ajustar un alfa o una luminosidad «a ojo hasta que pase» es justo como se
 * cuela un 4.49. Estos dos buscan el valor MÍNIMO que cumple, y el informe
 * imprime cuánto margen queda.
 */

/* Alfa mínimo de una tinta sobre un fondo para que el borde resultante llegue
   a `min` contra ese mismo fondo. Devuelve el alfa redondeado hacia arriba al
   centésimo, para que el número quede legible en el CSS. */
function alfaMinimo(tintaRgb, fondoCapas, min) {
  const fondo = componer(fondoCapas);
  for (let a = 1; a <= 100; a++) {
    const alfa = a / 100;
    const compuesto = [0, 1, 2].map((i) => tintaRgb[i] * alfa + fondo[i] * (1 - alfa));
    const [hi, lo] = [luminancia(compuesto), luminancia(fondo)].sort((x, y) => y - x);
    if ((hi + 0.05) / (lo + 0.05) >= min) return alfa;
  }
  return null;
}

/* Oscurece un color conservando tono y saturación hasta llegar a `min` contra
   el PEOR de sus fondos. Es el mismo criterio que usa el generador de colores
   de marca, y por el mismo motivo: un acento que cambia de tono deja de ser el
   acento. */
function oscurecerHasta(hex, fondos, min) {
  const [r0, g0, b0] = hexARgb(hex);
  for (let k = 100; k >= 0; k--) {
    const f = k / 100;
    const rgb = [r0 * f, g0 * f, b0 * f];
    const peor = Math.min(...fondos.map((fo) => {
      const b = componer(fo);
      const [hi, lo] = [luminancia(rgb), luminancia(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    }));
    if (peor >= min) {
      return '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
    }
  }
  return null;
}

/* ---------- lo que hay hoy, leído del archivo ---------- */

function tokenDeHoy(nombre) {
  const re = new RegExp('^\\s*' + nombre.replace(/[-]/g, '\\-') + '\\s*:\\s*([^;]+);', 'm');
  const m = CSS.match(re);
  return m ? m[1].trim() : null;
}

/* ---------- la propuesta ----------
 *
 * Criterio de diseño, para que se pueda discutir sin leer números:
 *
 * 1. La hoja NO se vuelve del mismo gris que el hero. El hero es FRÍO
 *    (#e5e5e5, neutro puro) y la hoja oscura era CÁLIDA (#121110, #1c1a17,
 *    texto #f5f3ef). Al pasar a clara la hoja conserva su calidez: queda un
 *    blanco roto cálido contra un gris frío. Dos superficies claras que se
 *    distinguen por TEMPERATURA y no por valor. Si las igualara, la web
 *    entera sería un folio y se perdería la frontera que hoy organiza la
 *    página.
 * 2. La hoja es MÁS CLARA que el hero, no más oscura. En el diseño actual la
 *    hoja se desliza POR ENCIMA del hero como una tarjeta: lo que está más
 *    cerca va más claro.
 * 3. Cada valor claro es el espejo del oscuro en el mismo escalón de la rampa,
 *    no un color nuevo elegido a ojo.
 */
const PROPUESTA = {
  /* superficies de la hoja */
  '--sh-bg': '#f7f5f1',
  '--sh-bg-2': '#f2efea',
  '--sh-surface': '#ffffff',
  '--sh-surface-2': '#fbf9f5',

  /* texto de la hoja — espejo de #f5f3ef / #d2ccc2 / #9c958b */
  '--sh-text': '#16130f',
  '--sh-text-2': '#3a352d',
  '--sh-muted': '#5f594e',

  /* bordes: en claro el alfa es NEGRO cálido, no blanco */
  '--sh-border': 'rgba(22, 19, 15, 0.10)',
  '--sh-border-strong': 'rgba(22, 19, 15, 0.20)',
  /* 0.46 es el alfa MÍNIMO medido (`--solve`) para que el contorno llegue a
     3:1 sobre los dos fondos de la hoja. El campo va más pesado a propósito:
     un campo de formulario tiene que leerse como más presente que el contorno
     de un botón fantasma, y esa diferencia se pierde si los dos van al mínimo. */
  '--sh-field-border': 'rgba(22, 19, 15, 0.56)',
  '--sh-control-border': 'rgba(22, 19, 15, 0.46)',
  '--sh-tint': 'rgba(22, 19, 15, 0.035)',

  /* 🔴 En claro un realce blanco sobre casi blanco NO EXISTE: midió 1.00:1 la
     última vez que se intentó. La elevación vuelve a ser sombra abajo. El
     token no se borra (lo consumen varias reglas): se queda a `none`. */
  '--sh-bevel': 'none',

  /* el desplegable de la barra: la isla --mnu-* */
  '--mnu-surface': '#ffffff',
  '--mnu-tile': 'rgba(22, 19, 15, 0.045)',
  '--mnu-tile-hover': 'rgba(22, 19, 15, 0.075)',
  '--mnu-foot': 'rgba(22, 19, 15, 0.025)',
  '--mnu-text': '#16130f',
  '--mnu-text-2': '#3a352d',
  '--mnu-muted': '#5f594e',

  /* superficies que eran oscuras sobre página clara (drawer, barra del hero).
     Con toda la web clara dejan de ser una excepción y se alinean. */
  '--on-ink-text': '#16130f',
  '--on-ink-text-2': '#3a352d',
  '--on-ink-muted': '#5f594e',
  '--on-ink-border': 'rgba(22, 19, 15, 0.10)',
  '--on-ink-border-strong': 'rgba(22, 19, 15, 0.20)',
  '--panel': '#ffffff',

  /* el cristal oscuro de la nav sobre la hoja ya no tiene hoja oscura debajo */
  '--nav-glass': 'rgba(247, 245, 241, 0.82)',

  /* 🔴 --accent-ink y --accent-hero CONVERGEN, y se puede comprobar por qué.
     Existían separados porque el acento como texto necesitaba un valor sobre
     la hoja OSCURA (#f59b45, 8.67:1) y otro sobre el hero CLARO (#9c4c08,
     4.83:1). Con toda la web clara los dos trabajos son el mismo.
     Antes de fusionarlos hay que mirar los consumidores, que es la trampa que
     este proyecto ya pagó en el paso 3 al revés. Comprobado: --accent-hero
     solo lo leen DOS reglas — `--ha-line-focus` en hotel-anim.css:62 (una
     línea, gráfico, 3:1) y el `accent-color` de la casilla de consentimiento
     en styles.css:1222 (que pinta un tic BLANCO sobre el relleno y necesita
     que el relleno sea oscuro). Ninguna pinta texto sobre el suelo más oscuro
     del hero, porque `.stars` —el consumidor que obligaba a ese caso— se fue
     en el paso 10. Sin esa restricción no hace falta bajar hasta #734211, que
     ya no es naranja sino marrón.
     --accent-hero se queda como ALIAS para no tocar sus dos consumidores y
     para dejar escrito que ahora son el mismo color. */
  '--accent-ink': '#9c4c08',
  '--accent-hero': 'var(--accent-ink)',

  /* ---- los que encontró `node _build/auditar-oscuros.js` y faltaban ---- */

  /* La costura móvil. Por debajo de 901px la hoja NO se superpone al hero:
     `main{margin-top:0}` y los dos colores chocan en línea recta, así que la
     casa exige ≥3 paradas o ≥120px de solape. Antes iba de #e5e5e5 a casi
     negro y las tres paradas eran un salto enorme; ahora el salto es de #e5e5e5
     a #f7f5f1, mucho más corto, pero la rampa se queda porque el mínimo de la
     casa es de PARADAS, no de distancia de color. */
  '--seam-1': '#e9e7e4',
  '--seam-2': '#f0eeea',
  '--seam-3': '#f4f2ee',

  /* 🔴 El bisel iba escrito DENTRO de la sombra, no como `var(--sh-bevel)`.
     Cambiar solo el token no habría hecho nada: la sombra habría seguido
     pintando un realce blanco sobre una superficie casi blanca, que es
     invisible (1.00:1, medido en su día). En claro la elevación es sombra
     abajo, y hace falta una capa de contacto corta además de la difusa o la
     tarjeta flota sin apoyarse. */
  '--shadow-sh': '0 1px 2px rgba(22, 19, 15, 0.05), 0 8px 20px -10px rgba(22, 19, 15, 0.10), 0 28px 56px -28px rgba(22, 19, 15, 0.14)',

  /* El canto de la hoja donde se solapa con el hero. Era un pelo CLARO sobre
     oscuro; ahora es un pelo oscuro sobre claro, y la sombra tira hacia
     arriba porque la hoja sube por encima del hero. */
  '--shadow-sheet': '0 -1px 0 rgba(22, 19, 15, 0.07), 0 -14px 34px -14px rgba(22, 19, 15, 0.12), 0 -44px 110px -24px rgba(22, 19, 15, 0.10)',

  /* El realce de las superficies que eran oscuras (fondo del monograma de la
     nav, hover de los botones sobre tinta). Sobre claro, un blanco al 6% no
     existe: pasa a tinta. */
  '--on-ink-hi': 'rgba(22, 19, 15, 0.055)',

  /* La barra inferior del hero (la marquesina «Nos integramos con»). Era una
     banda de tinta sobre el hero claro: es la única «parte negra» que quedaba
     por encima del pliegue y la primera que se ve al abrir la web.
     Va en blanco translúcido y NO en blanco opaco a propósito: el tejido
     Perlin pasa por debajo y la banda tiene que dejarlo entrever, que es lo
     que la despega del fondo sin necesidad de un borde marcado. */
  '--bar-a': 'rgba(255, 255, 255, 0.94)',
  '--bar-b': 'rgba(255, 255, 255, 0.80)',
};

/* Tokens que viven en OTROS archivos. Van aparte porque el parcheador tiene
   que saber a qué archivo ir: buscar `--pg-numeral` en styles.css no lo
   encuentra, y un parcheador que no encuentra algo y calla es exactamente
   como se cuela media migración. */
const PROPUESTA_OTROS = {
  'pages.css': {
    /* El numeral gigante de fondo de las páginas interiores: relleno casi
       inexistente y contorno fino. Es decoración, nunca texto. */
    '--pg-numeral': 'rgba(22, 19, 15, 0.055)',
    '--pg-numeral-stroke': 'rgba(22, 19, 15, 0.16)',
  },
  'funciones/funciones.css': {
    '--pgf-stamp-border': 'rgba(22, 19, 15, 0.16)',
    '--pgf-row-hover': 'rgba(22, 19, 15, 0.045)',
  },
  'hotel-anim.css': {
    /* Sigue a --sh-bg por var(), así que se mueve solo; lo que hay que
       actualizar es el VALOR DE RESPALDO, que es el que se usa si alguien
       carga hotel-anim.css sin styles.css. */
    '--ha-seam-0': 'var(--sh-bg, #f7f5f1)',
  },
};

/* ---------- los pares que hay que verificar ----------
 * frente y fondo se escriben como PILAS (de abajo a arriba), que es como se
 * ven de verdad en pantalla.
 */
const P = (k) => PROPUESTA[k];

const PARES = [
  // cuerpo de la hoja
  ['texto de la hoja sobre el fondo', [P('--sh-text')], [P('--sh-bg')], 4.5],
  ['texto 2 sobre el fondo', [P('--sh-text-2')], [P('--sh-bg')], 4.5],
  ['apagado sobre el fondo', [P('--sh-muted')], [P('--sh-bg')], 4.5],
  ['texto sobre tarjeta', [P('--sh-text')], [P('--sh-surface')], 4.5],
  ['texto 2 sobre tarjeta', [P('--sh-text-2')], [P('--sh-surface')], 4.5],
  ['apagado sobre tarjeta', [P('--sh-muted')], [P('--sh-surface')], 4.5],
  ['apagado sobre tarjeta 2', [P('--sh-muted')], [P('--sh-surface-2')], 4.5],
  ['apagado sobre fondo 2', [P('--sh-muted')], [P('--sh-bg-2')], 4.5],
  // el acento como texto, en los cuatro fondos de la hoja + el hero
  ['acento-texto sobre fondo hoja', [P('--accent-ink')], [P('--sh-bg')], 4.5],
  ['acento-texto sobre tarjeta', [P('--accent-ink')], [P('--sh-surface')], 4.5],
  ['acento-texto sobre el hero', [P('--accent-ink')], ['#e5e5e5'], 4.5],
  // El suelo mas oscuro del hero ya no lleva texto de acento: su unico
  // consumidor era `.stars`, retirado en el paso 10. Se conserva el par como
  // GRAFICO (3:1), que es lo que pide la linea de foco del recorrido.
  ['acento como grafico sobre el suelo del hero', [P('--accent-ink')], ['#cbcbcb', 'rgba(0, 0, 0, 0.06)'], 3],
  ['tic blanco sobre el relleno del acento', ['#ffffff'], [P('--accent-ink')], 4.5],
  // bordes de control: 3:1 por WCAG 1.4.11
  ['borde de control sobre fondo hoja', [P('--sh-bg'), P('--sh-control-border')], [P('--sh-bg')], 3],
  ['borde de control sobre tarjeta', [P('--sh-surface'), P('--sh-control-border')], [P('--sh-surface')], 3],
  ['borde de campo sobre tarjeta', [P('--sh-surface'), P('--sh-field-border')], [P('--sh-surface')], 3],
  // el desplegable
  ['texto del menú sobre su fondo', [P('--mnu-text')], [P('--mnu-surface')], 4.5],
  ['descripción del menú sobre su fondo', [P('--mnu-text-2')], [P('--mnu-surface')], 4.5],
  ['rótulo apagado del menú', [P('--mnu-muted')], [P('--mnu-surface')], 4.5],
  ['texto del menú sobre tesela en hover', [P('--mnu-text')], [P('--mnu-surface'), P('--mnu-tile-hover')], 4.5],
  ['descripción sobre tesela en hover', [P('--mnu-text-2')], [P('--mnu-surface'), P('--mnu-tile-hover')], 4.5],
  ['rótulo apagado sobre el pie del menú', [P('--mnu-muted')], [P('--mnu-surface'), P('--mnu-foot')], 4.5],
  // el drawer
  ['texto del drawer', [P('--on-ink-text')], [P('--panel')], 4.5],
  ['texto 2 del drawer', [P('--on-ink-text-2')], [P('--panel')], 4.5],
  ['apagado del drawer', [P('--on-ink-muted')], [P('--panel')], 4.5],
  // 🔴 el defecto preexistente que Alex dejó sin tocar: el contorno era lo
  // ÚNICO que identificaba el botón de cerrar del drawer y medía 1.59:1.
  ['borde del botón fantasma del drawer', [P('--panel'), P('--sh-control-border')], [P('--panel')], 3],
  // la nav sobre la hoja
  ['texto de la nav sobre su cristal', [P('--sh-text')], [P('--sh-bg'), P('--nav-glass')], 4.5],
  // La barra del hero: se apoya en el SUELO del hero, que es la parte mas
  // oscura del degradado radial (--bg-3 + la vineta), no en --bg. Medir contra
  // la parada media es exactamente el fallo que dio un PASS 4.83 donde el
  // texto renderizaba a 3.99.
  ['texto de la barra del hero', ['#3d3d3d'], ['#cbcbcb', 'rgba(0, 0, 0, 0.06)', P('--bar-b')], 4.5],
  ['marca de la barra en hover', ['#141414'], ['#cbcbcb', 'rgba(0, 0, 0, 0.06)', P('--bar-a')], 4.5],
  ['rotulo de la barra sobre su parada mas clara', ['#3d3d3d'], ['#cbcbcb', 'rgba(0, 0, 0, 0.06)', P('--bar-a')], 4.5],
];

/* ---------- informe ---------- */

/* `--solve` no verifica: BUSCA. Imprime el valor mínimo que cumple cada
   restricción, para no ajustar a ojo hasta que el número pase por los pelos. */
if (process.argv.includes('--solve')) {
  const TINTA = hexARgb('#16130f');
  // El suelo más oscuro que puede producir el hero: --k-06 sobre --bg-3. No es
  // --bg (la parada MEDIA del degradado radial): medir contra la media es el
  // fallo que dio un PASS 4.83 donde el texto renderizaba a 3.99.
  const HERO_SUELO = ['#cbcbcb', 'rgba(0, 0, 0, 0.06)'];

  console.log('\n  ALFA MÍNIMO DE BORDE (tinta #16130f)');
  for (const [nom, fondo, min] of [
    ['control sobre la hoja  #f7f5f1', ['#f7f5f1'], 3],
    ['control sobre tarjeta  #ffffff', ['#ffffff'], 3],
    ['campo   sobre tarjeta  #ffffff', ['#ffffff'], 3],
    ['campo   sobre la hoja  #f7f5f1', ['#f7f5f1'], 3],
  ]) {
    console.log('    ' + nom.padEnd(34) + alfaMinimo(TINTA, fondo, min));
  }

  console.log('\n  EL ACENTO COMO TEXTO, un solo valor para toda la web');
  const fondos = [['#f7f5f1'], ['#ffffff'], ['#e5e5e5'], HERO_SUELO];
  const v = oscurecerHasta('#f08a24', fondos, 4.5);
  console.log('    desde --accent #f08a24  ->  ' + v);
  for (const f of fondos) {
    console.log('      sobre ' + JSON.stringify(f).padEnd(36) + ratio([v], f).toFixed(2));
  }
  console.log('\n    el valor de hoy #9c4c08 sobre el suelo del hero: ' +
    ratio(['#9c4c08'], HERO_SUELO).toFixed(2) + '  (por eso falla)');
  console.log('');
  process.exit(0);
}

/* `--apply` escribe los valores en los archivos, por PARCHE de una línea.
   Nunca reescribe un archivo entero: otra sesión de Claude tiene abiertos
   styles.css y sections.css ahora mismo, y un Write completo se lleva su
   trabajo por delante sin avisar.
   Si un token no aparece EXACTAMENTE una vez, no se escribe NADA: media
   migración aplicada es peor que ninguna, porque parece que funcionó. */
if (process.argv.includes('--apply')) {
  const porArchivo = { 'styles.css': PROPUESTA, ...PROPUESTA_OTROS };
  const pendientes = [];
  const errores = [];

  for (const [rel, tokens] of Object.entries(porArchivo)) {
    const abs = path.join(RAIZ, rel);
    let texto = fs.readFileSync(abs, 'utf8');

    // El bloque generado por la otra sesión queda fuera de los límites.
    const ini = texto.indexOf('/* logos:brand-start */');
    const fin = texto.indexOf('/* logos:brand-end */');
    const enBloqueAjeno = (i) => ini !== -1 && fin !== -1 && i > ini && i < fin;

    for (const [tok, valor] of Object.entries(tokens)) {
      const re = new RegExp('^([ \\t]*)(' + tok + ')(\\s*:\\s*)([^;]+)(;)', 'gm');
      const encontrados = [];
      let m;
      while ((m = re.exec(texto)) !== null) {
        if (!enBloqueAjeno(m.index)) encontrados.push(m);
      }
      if (encontrados.length !== 1) {
        errores.push(rel + '  ' + tok + '  -> encontrado ' + encontrados.length + ' veces (se esperaba 1)');
        continue;
      }
      const e = encontrados[0];
      pendientes.push({ rel, abs, tok, antes: e[4].trim(), despues: valor, desde: e.index, hasta: e.index + e[0].length, reemplazo: e[1] + e[2] + e[3] + valor + e[5] });
    }
  }

  if (errores.length) {
    console.log('\n  NO SE HA ESCRITO NADA. Estos tokens no se localizaron de forma única:\n');
    errores.forEach((x) => console.log('    ' + x));
    console.log('');
    process.exit(1);
  }

  // Se aplica por archivo y de atrás hacia delante, para que los índices de
  // los parches anteriores sigan siendo válidos.
  const agrupado = {};
  pendientes.forEach((p) => { (agrupado[p.abs] ||= []).push(p); });
  for (const [abs, lista] of Object.entries(agrupado)) {
    let texto = fs.readFileSync(abs, 'utf8');
    lista.sort((a, b) => b.desde - a.desde);
    for (const p of lista) texto = texto.slice(0, p.desde) + p.reemplazo + texto.slice(p.hasta);
    fs.writeFileSync(abs, texto);
  }

  console.log('\n  APLICADO — ' + pendientes.length + ' tokens en ' + Object.keys(agrupado).length + ' archivos\n');
  let ultimo = '';
  pendientes.sort((a, b) => (a.rel + a.tok).localeCompare(b.rel + b.tok)).forEach((p) => {
    if (p.rel !== ultimo) { console.log('  ' + p.rel); ultimo = p.rel; }
    console.log('    ' + p.tok.padEnd(24) + p.antes.slice(0, 30).padEnd(32) + '->  ' + p.despues.slice(0, 40));
  });
  console.log('');
  process.exit(0);
}

const soloCss = process.argv.includes('--css');
let fallos = 0;

if (!soloCss) {
  console.log('\n  TOKEN                       HOY            ->  PROPUESTO');
  console.log('  ' + '-'.repeat(64));
  for (const k of Object.keys(PROPUESTA)) {
    const hoy = tokenDeHoy(k);
    const marca = hoy === null ? '  (no existe hoy)' : '';
    console.log(
      '  ' + k.padEnd(26) + String(hoy || '—').padEnd(15) + '->  ' + PROPUESTA[k] + marca
    );
  }

  console.log('\n  PAR                                        RATIO   MIN   ');
  console.log('  ' + '-'.repeat(64));
  for (const [nombre, frente, fondo, min] of PARES) {
    const r = ratio(frente, fondo);
    const ok = r >= min;
    if (!ok) fallos++;
    console.log(
      '  ' + (ok ? 'OK  ' : 'MAL ') + nombre.padEnd(38) +
      r.toFixed(2).padStart(6) + '   ' + String(min).padStart(3)
    );
  }
  console.log('');
  if (fallos) {
    console.log('  ' + fallos + ' par(es) por debajo del mínimo. La paleta NO vale todavía.\n');
    process.exit(1);
  }
  console.log('  Los ' + PARES.length + ' pares pasan.\n');
} else {
  for (const k of Object.keys(PROPUESTA)) console.log('  ' + k + ': ' + PROPUESTA[k] + ';');
}
