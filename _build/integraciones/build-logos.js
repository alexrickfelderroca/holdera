/* HOLDERA — genera los logotipos de la tira de integraciones.
 *
 *   node _build/integraciones/build-logos.js            escribe los .svg
 *   node _build/integraciones/build-logos.js --inline   ademas imprime el
 *                                                       marcado de la tira
 *
 * SALIDA: assets/img/integraciones/<slug>.svg — todos MONOCROMOS y en
 * currentColor, sin un solo literal de color. Es requisito del sistema de
 * tokens del proyecto (design-system.md: "ningun literal de color fuera de
 * :root") y ademas es lo que permite que la misma marca sirva sobre la tinta
 * de la barra del hero y sobre la hoja oscura sin generar dos versiones.
 *
 * DOS CLASES DE MARCA, Y POR QUE
 * ------------------------------
 * 1. MARCA REAL (5 entradas). Solo cuando simple-icons trae el logotipo
 *    oficial, que es CC0 y esta pensado para esto. Se copia su `path` tal cual.
 *
 * 2. WORDMARK TIPOGRAFICO (36 entradas). El resto son marcas hoteleras
 *    espanolas que simple-icons no cubre — y de 3.688 iconos indexados,
 *    ninguno las tiene. La alternativa seria descargar el logotipo registrado
 *    de cada empresa de su propia web y redibujarlo: eso es usar la marca de
 *    un tercero sin mirar sus normas de uso, y ademas 36 veces. Un wordmark
 *    —el nombre compuesto en la tipografia de Holdera— dice lo mismo, es
 *    honesto sobre lo que es, y no se apropia de nada.
 *
 * 🔴 simple-icons TIENE un icono "Agora" (#099DFD) y NO ES ESTE. Es Agora.io,
 *    la empresa de comunicaciones en tiempo real. El del catalogo de Hotelgest
 *    es Agora TPV (agorapos.com), software de hosteleria. Van en la lista negra
 *    de abajo: un logotipo correcto de la empresa equivocada es peor que un
 *    wordmark, porque parece bien.
 *
 * EL ANCHO DE LOS WORDMARK ESTA MEDIDO, NO ESTIMADO
 * -------------------------------------------------
 * Un <text> dentro de un SVG no tiene ancho conocido hasta que se pinta, y el
 * SVG necesita su viewBox de antemano. Los anchos salen de medir las 41
 * cadenas con Geist REALMENTE cargada (canvas measureText en la propia pagina,
 * via _build/shoot.js --eval-file; el resultado registro geistReady:true) y
 * estan cacheados en wordmark-widths.json. Ademas cada <text> lleva
 * `textLength` + `lengthAdjust`, asi que la caja mide ese ancho exacto AUNQUE
 * Geist no este disponible — un .svg abierto suelto no descuadra la tira.
 * Para rehacer la medida: ver la cabecera de wordmark-widths.json.
 */
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const ROOT = path.join(HERE, '..', '..');
const OUTDIR = path.join(ROOT, 'assets', 'img', 'integraciones');

const catalogo = JSON.parse(fs.readFileSync(path.join(HERE, 'integraciones.json'), 'utf8'));
const metrics = JSON.parse(fs.readFileSync(path.join(HERE, 'wordmark-widths.json'), 'utf8'));

/* --- 1. simple-icons ------------------------------------------------------
   Misma pareja de versiones fijadas que _build/build-partner-logos.js, y por
   el mismo motivo: ninguna sola cubre la lista. La carpeta NO viaja en el repo
   (.gitignore, porque su package.json hacia que Hostinger tratase el sitio
   como un proyecto de Node). Para recrearla:

     mkdir -p _build/logos && cd _build/logos && npm init -y \
       && npm i si-current@npm:simple-icons@^16.30.0 \
                si-legacy@npm:simple-icons@^11.15.0

   Si no esta, no pasa nada: las cinco marcas reales salen como wordmark y el
   script lo dice. Nunca falla por esto.                                      */
function loadSimpleIcons() {
  const base = path.join(HERE, '..', 'logos', 'node_modules');
  const sets = [];
  for (const pkg of ['si-current', 'si-legacy']) {
    try { sets.push(require(path.join(base, pkg))); } catch { /* opcional */ }
  }
  if (!sets.length) return null;
  const byTitle = new Map();
  for (const set of sets.reverse()) {            // current pisa a legacy
    for (const k of Object.keys(set)) {
      const ic = set[k];
      if (ic && ic.title && ic.path) byTitle.set(ic.title.toLowerCase(), ic);
    }
  }
  return byTitle;
}

/* Marca del catalogo -> titulo en simple-icons. Solo entra aqui lo que se ha
   comprobado que es LA MISMA empresa. */
const MARCA_REAL = {
  'Redsys':   'redsys',
  'Stripe':   'stripe',
  'Sage 50':  'sage',
  'Sage 200': 'sage',
  'SAP':      'sap',
};

/* Iconos de simple-icons que coinciden en NOMBRE con una entrada del catalogo
   pero son otra empresa. Nunca se usan; el script avisa si alguien los mete. */
const HOMONIMOS_PROHIBIDOS = {
  'Agora': 'simple-icons "Agora" es Agora.io (comunicaciones en tiempo real), no Ágora TPV de agorapos.com',
};

/* --- 2. helpers ----------------------------------------------------------- */
const esc = s => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const NS = 'http://www.w3.org/2000/svg';

/* Dos salidas por marca, con el MISMO dibujo:
   - `file`: el .svg suelto, autosuficiente — lleva xmlns, el fill y, en los
     wordmark, toda la tipografia, porque nadie le va a aplicar una hoja.
   - `slim`: la version que se incrusta en la pagina. Sin xmlns (un <svg> en
     HTML ya esta en el espacio de nombres SVG) y sin los cuatro atributos de
     tipografia, que se dicen UNA vez en el CSS. Son 82 copias en el hero:
     repetirlos costaba 38 KB de marcado, y asi cuestan 14. */

/* Marca real: el path oficial en una caja de 24. */
function svgIcono(nombre, icon, slim) {
  return `<svg ${slim ? '' : `xmlns="${NS}" `}viewBox="0 0 24 24" role="img" `
       + `aria-label="${esc(nombre)}"${slim ? '' : ' fill="currentColor"'}>`
       + `<path d="${icon.path}"/></svg>`;
}

/* Wordmark: el nombre compuesto en Geist dentro de una caja de 24 de alto.
   y=17.6 centra opticamente una caja de mayusculas de Geist (altura de caja
   ~0.72em = 11.5px a 16px) dentro de los 24: ocupa de 6.1 a 17.6, centro 11.85.
   El font-stack repite el de --font de styles.css; no se puede usar var() aqui
   porque un .svg abierto suelto no tiene ese token. */
function svgWordmark(nombre, ancho, slim) {
  const w = Math.round(ancho * 100) / 100;
  const tipo = slim ? '' :
      ` font-family="Geist, ui-sans-serif, system-ui, sans-serif"`
    + ` font-size="${metrics.size}" font-weight="${metrics.weight}"`
    + ` letter-spacing="${metrics.track}"`;
  return `<svg ${slim ? '' : `xmlns="${NS}" `}viewBox="0 0 ${w} 24" role="img" `
       + `aria-label="${esc(nombre)}"${slim ? '' : ' fill="currentColor"'}>`
       + `<text x="0" y="17.6"${tipo} `
       + `textLength="${w}" lengthAdjust="spacingAndGlyphs">${esc(nombre)}</text></svg>`;
}

/* --- 3. generar ----------------------------------------------------------- */
const si = loadSimpleIcons();
if (!si) console.warn('AVISO: _build/logos no esta instalado; TODO sale como wordmark.');

fs.mkdirSync(OUTDIR, { recursive: true });

const items = catalogo.integraciones.filter(i => i.en_marquesina);
const hechos = [];

for (const it of items) {
  if (HOMONIMOS_PROHIBIDOS[it.nombre] && MARCA_REAL[it.nombre]) {
    throw new Error(`${it.nombre}: ${HOMONIMOS_PROHIBIDOS[it.nombre]}`);
  }
  const titulo = MARCA_REAL[it.nombre];
  const icon = titulo && si ? si.get(titulo) : null;
  let file, slim, tipo, ratio;
  if (icon) {
    file = svgIcono(it.nombre, icon, false);
    slim = svgIcono(it.nombre, icon, true);
    tipo = 'marca-real';
    ratio = 1;                                   // 24x24
  } else {
    const ancho = metrics.widths[it.nombre];
    if (!ancho) throw new Error(`falta el ancho medido de "${it.nombre}" en wordmark-widths.json`);
    file = svgWordmark(it.nombre, ancho, false);
    slim = svgWordmark(it.nombre, ancho, true);
    tipo = 'wordmark';
    ratio = Math.round((ancho / 24) * 1000) / 1000;
  }
  for (const s of [file, slim]) {
    if (/(fill|stroke)\s*=\s*"#/i.test(s) || /#[0-9a-f]{3,8}\b/i.test(s)
        || /\b(rgb|hsl|oklch|lab)a?\s*\(/i.test(s)) {
      throw new Error(`${it.slug}.svg lleva un literal de color`);
    }
  }
  fs.writeFileSync(path.join(OUTDIR, it.slug + '.svg'), file + '\n');
  hechos.push({ ...it, tipo, ratio, bytes: Buffer.byteLength(file), slim });
}

const reales = hechos.filter(h => h.tipo === 'marca-real');
console.log(`escritos ${hechos.length} svg en assets/img/integraciones/`);
console.log(`  marca real (simple-icons): ${reales.length} -> ${reales.map(r => r.nombre).join(', ')}`);
console.log(`  wordmark tipografico:      ${hechos.length - reales.length}`);
console.log(`  peso total: ${hechos.reduce((a, h) => a + h.bytes, 0)} bytes`);

/* --- 4. marcado de la tira ------------------------------------------------
   Una sola pasada de <li>. El HTML de _build/parts/integraciones.html la lleva
   DUPLICADA (la copia con aria-hidden) para que el bucle no tenga costura.   */
if (process.argv.includes('--inline')) {
  const li = hechos.map(h =>
    `        <li class="mrq__item"${h.tipo === 'marca-real' ? ' data-mark="icon"' : ''}>${h.slim}</li>`
  ).join('\n');
  console.log('\n<!-- marcado: una pasada de la tira (' + Buffer.byteLength(li) + ' bytes) -->\n' + li);
}

/* --- 5. _build/parts/integraciones.html ----------------------------------
   El marcado se GENERA, no se teclea. Son 41 logotipos x2 copias mas 47
   nombres en nueve grupos: escritos a mano, la primera errata de un nombre de
   marca ajena sobrevive a cualquier revision. Aqui salen del JSON, que a su
   vez sale del catalogo real.                                               */
if (process.argv.includes('--part')) {
  const dest = path.join(HERE, '..', 'parts', 'integraciones.html');
  const fila = (oculta) => hechos.map(h =>
    `          <li class="mrq__item"${h.tipo === 'marca-real' ? ' data-mark="icon"' : ''}>${h.slim}</li>`
  ).join('\n');

  const grupos = catalogo.grupos.map(g => {
    const li = g.integraciones.map(n => `            <li>${esc(n)}</li>`).join('\n');
    return `        <li class="ints__group">\n`
         + `          <p class="ints__cat">${esc(g.titulo)}</p>\n`
         + `          <ul class="ints__items">\n${li}\n          </ul>\n`
         + `        </li>`;
  }).join('\n');

  const t = catalogo.totales;
  const html = `<!-- ===========================================================================
     HOLDERA · INTEGRACIONES — dos piezas, generadas por
     node _build/integraciones/build-logos.js --part
     NO EDITAR A MANO: se regenera desde _build/integraciones/integraciones.json.

     (A) LA TIRA DEL HERO — sustituye por completo al <div class="hero__bar">
         de index.html (el de los cuatro chips Hoy / Habitaciones / Revenue y
         reservas / Trazabilidad). Conserva la clase .hero__bar a proposito:
         de ella cuelgan la posicion, el z-index y la sombra que ya estaban en
         styles.css, y ademas _build/hero-fit.js busca ese selector para
         comprobar que la lista de servicios no invade la barra. Cambiarlo
         dejaria esa comprobacion midiendo un nodo que no existe, que es la
         peor forma de fallar: en silencio y en verde.

     (B) EL BLOQUE DE LA NAV — pensado para el drawer (_build/shell/drawer.html)
         y para un desplegable de escritorio. Va sobre superficie de tinta
         (--panel / --on-ink-*).

     🔴 Estas son las integraciones de HOTELGEST, no de Holdera. Que Holdera
        comparta las mismas es lo que dijo Alex; no esta verificado contra
        ninguna fuente. Ver procedencia.atribucion_a_holdera en el JSON.
     =========================================================================== -->

<!-- ======================= (A) TIRA DEL HERO =======================
     Los marcadores part:tira / part:nav estan para poder recortar cada pieza
     con un script sin equivocarse: este archivo MENCIONA <div class="hero__bar">
     dentro de un comentario en prosa, y un recortador ingenuo que busque esa
     cadena se lleva medio comentario por delante. Paso de verdad al verificar:
     el trozo inyectado incluia el comentario, el navegador lo parseaba como un
     DIV de verdad y aparecian DOS .hero__bar anidados — la de fuera sin la
     clase --mrq, asi que la barra seguia midiendo 46px y parecia que el CSS no
     se aplicaba. No era el CSS. Recorta SIEMPRE entre marcadores.
     ================================================================= -->
<!-- part:tira -->
<!-- ${t.en_la_marquesina} marcas. La segunda pasada es un CLON exacto y va aria-hidden:
     es lo que hace que el bucle no tenga costura (el track se desplaza -50%
     y al llegar vuelve a 0, donde el dibujo es identico). Un lector de
     pantalla lee la lista UNA vez.
     Con "prefers-reduced-motion" la tira se para y el visor pasa a ser
     desplazable con el dedo o la rueda; el clon se oculta. -->
<div class="hero__bar hero__bar--mrq mrq" data-enter style="--d:700">
  <p class="mrq__label" id="mrq-label">Nos integramos con</p>
  <div class="mrq__viewport">
    <div class="mrq__track">
      <ul class="mrq__row" aria-labelledby="mrq-label">
${fila(false)}
      </ul>
      <ul class="mrq__row" aria-hidden="true">
${fila(true)}
      </ul>
    </div>
  </div>
</div>
<!-- /part:tira -->


<!-- ==================== (B) BLOQUE DE LA NAV ==================== -->
<!-- part:nav -->
<!-- ${t.software_de_terceros + t.autoridades_y_estandares} entradas en ${catalogo.grupos.length} grupos. Listas anidadas, no una rejilla de
     tarjetas: los grupos tienen entre 2 y 9 miembros y una rejilla uniforme
     de tres columnas esta prohibida por el CLAUDE.md global. El titulo de
     grupo es un <p>, no un <h3>: este bloque se copia dentro del drawer y de
     la nav, y un encabezado decorativo ahi rompe el esquema h1->h2 de la
     pagina (trampa del paso 5). -->
<div class="ints">
  <p class="ints__eyebrow">Nos integramos con</p>
  <ul class="ints__groups">
${grupos}
  </ul>
  <p class="ints__note">Las marcas pertenecen a sus respectivos titulares.</p>
  <!-- TODO: confirmar con Alex que el producto de Holdera hereda de verdad
       estas integraciones de Hotelgest antes de publicar este bloque. -->
</div>
<!-- /part:nav -->
`;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, html);
  console.log(`\nescrito _build/parts/integraciones.html (${Buffer.byteLength(html)} bytes)`);
  console.log(`  tira: ${t.en_la_marquesina} marcas x2 pasadas`);
  console.log(`  nav:  ${catalogo.grupos.length} grupos, `
            + `${catalogo.grupos.reduce((a, g) => a + g.integraciones.length, 0)} entradas`);
}

module.exports = { hechos };
