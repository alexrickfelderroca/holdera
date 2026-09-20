/*
 * _build/parts/build-menus.js  —  node _build/parts/build-menus.js
 *
 * Genera _build/parts/menus.html y menus-drawer.html desde los datos reales:
   _build/contenido/features.json y _build/integraciones/integraciones.json +
   assets/img/integraciones/<slug>.svg (inline, para que currentColor y Geist
   funcionen: un <img src=".svg"> no hereda ni el color ni la fuente). */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const feat = JSON.parse(fs.readFileSync(path.join(ROOT, '_build/contenido/features.json'), 'utf8'));
const ints = JSON.parse(fs.readFileSync(path.join(ROOT, '_build/integraciones/integraciones.json'), 'utf8'));

/* --- nombres cortos de menu, derivados del campo `clave` ------------------
   Los `titulo` de features.json son frases enteras ("El dia de hoy, tal como
   esta a esta hora"): no caben en un menu y no es asi como lo hace la
   referencia, que usa nombres de una o dos palabras con la frase debajo. */
const CORTO = {
  hoy: 'Hoy',
  habitaciones: 'Habitaciones',
  housekeeping: 'Housekeeping',
  revenue: 'Revenue',
  reservas: 'Reservas',
  trazabilidad: 'Trazabilidad',
  definiciones: 'Definiciones',
  catalogo: 'Catálogo de métricas',
};
/* Tres columnas. Un menu de ocho entradas en una sola lista no dice nada de
   como se relacionan; agrupadas, el menu ya explica el producto. */
const COLUMNAS = [
  { titulo: 'La operación', claves: ['hoy', 'habitaciones', 'housekeeping'] },
  { titulo: 'Lo comercial', claves: ['revenue', 'reservas'] },
  { titulo: 'La cifra y su origen', claves: ['trazabilidad', 'definiciones', 'catalogo'] },
];

/* --- integraciones: que grupos salen en el desplegable ---------------------
   No caben los 50. Salen las cuatro categorias con mas marcas reconocibles
   (24 fichas); las otras seis quedan como enlaces de texto en el pie del
   panel, y el CTA lleva a la pagina entera. Es lo que hace la referencia con
   su "+27 more integrations". */
const GRUPOS_FICHA = ['channel', 'revenue', 'pagos', 'accesos'];

const byNombre = new Map(ints.integraciones.map((i) => [i.nombre, i]));
const grupoPorId = new Map(ints.grupos.map((g) => [g.id, g]));

function svgInline(slug, nombre) {
  const f = path.join(ROOT, 'assets/img/integraciones', slug + '.svg');
  if (!fs.existsSync(f)) return null;
  let s = fs.readFileSync(f, 'utf8').trim();
  // fuera el xmlns (va inline en HTML), el fill (lo pone el CSS con currentColor)
  // y los atributos de fuente del <text> (los hereda del documento: Geist).
  s = s.replace(' xmlns="http://www.w3.org/2000/svg"', '');
  s = s.replace(' fill="currentColor"', '');
  s = s.replace(/ font-family="[^"]*"/, '').replace(/ font-size="[^"]*"/, '').replace(/ font-weight="[^"]*"/, '').replace(/ letter-spacing="[^"]*"/, '');
  s = s.replace('<svg ', '<svg class="mnu__logo" ');
  const esIcono = !s.includes('<text');
  return { svg: s, esIcono, nombre };
}

/* Reindenta un bloque para pegarlo dentro de otro: quita la sangria minima que
   trae y le pone la del destino. La primera linea va sin tocar porque ya la
   coloca el literal que la interpola. */
function indent(h, n) {
  const ls = h.split('\n');
  const resto = ls.slice(1).filter((l) => l.trim());
  const min = resto.length ? Math.min(...resto.map((l) => l.match(/^ */)[0].length)) : 0;
  return ls.map((l, i) => (i === 0 || !l.trim() ? l : ' '.repeat(n + 2) + l.slice(min))).join('\n');
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const CHEV = '<span class="mnu__chev" aria-hidden="true"><svg viewBox="0 0 10 6" width="10" height="6" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M1 1.5 5 4.75 9 1.5"/></svg></span>';
const FLECHA = '<span class="mnu__arrow" aria-hidden="true"><svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg></span>';

/* ========================= (A) PANEL DE FUNCIONES ======================== */
function panelFunciones() {
  const cols = COLUMNAS.map((c) => {
    const items = c.claves.map((k) => {
      const f = feat.features.find((x) => x.clave === k);
      return `              <li><a class="mnu__item" href="/funciones/${f.slug}/">
                <span class="mnu__name">${esc(CORTO[k])}</span>
                <span class="mnu__desc">${esc(f.frase)}</span>
              </a></li>`;
    }).join('\n');
    return `          <div class="mnu__col">
            <p class="mnu__cat" id="mnu-fn-${c.claves[0]}">${esc(c.titulo)}</p>
            <ul class="mnu__list" aria-labelledby="mnu-fn-${c.claves[0]}">
${items}
            </ul>
          </div>`;
  }).join('\n');

  return `<div class="mnu__panel mnu__panel--fn" id="mnu-funciones" data-menu-panel hidden>
      <div class="mnu__inner">
        <div class="mnu__cols mnu__cols--fn">
${cols}
        </div>
      </div>
      <div class="mnu__foot">
        <p class="mnu__note">Ocho funciones. Cada una abre su pantalla en el panel demo.</p>
        <a class="mnu__all" href="/funciones/">Ver todas las funciones${FLECHA}</a>
      </div>
    </div>`;
}

/* ====================== (B) PANEL DE INTEGRACIONES ====================== */
function panelIntegraciones() {
  let fichas = 0;
  const cols = GRUPOS_FICHA.map((gid) => {
    const g = grupoPorId.get(gid);
    const tiles = g.integraciones.map((nombre) => {
      const it = byNombre.get(nombre);
      const marca = it && it.slug ? svgInline(it.slug, nombre) : null;
      fichas++;
      if (!marca) {
        // sin SVG: la ficha es el nombre en texto, nunca un hueco vacio
        return `              <li class="mnu__tile" data-mark="text"><span class="mnu__brand">${esc(nombre)}</span></li>`;
      }
      if (marca.esIcono) {
        return `              <li class="mnu__tile" data-mark="icon">${marca.svg}<span class="mnu__brand">${esc(nombre)}</span></li>`;
      }
      return `              <li class="mnu__tile">${marca.svg}</li>`;
    }).join('\n');
    return `          <div class="mnu__col">
            <a class="mnu__cat mnu__cat--link" href="/integraciones.html#int-${g.id}">${esc(g.titulo)}${FLECHA}</a>
            <ul class="mnu__tiles">
${tiles}
            </ul>
          </div>`;
  }).join('\n');

  const resto = ints.grupos.filter((g) => !GRUPOS_FICHA.includes(g.id));
  const restoLinks = resto.map((g) =>
    `          <li><a class="mnu__more" href="/integraciones.html#int-${g.id}">${esc(g.titulo)}</a></li>`
  ).join('\n');

  return {
    fichas,
    html: `<div class="mnu__panel mnu__panel--ints" id="mnu-integraciones" data-menu-panel hidden>
      <div class="mnu__inner">
        <div class="mnu__cols mnu__cols--ints">
${cols}
        </div>
        <ul class="mnu__mores">
${restoLinks}
        </ul>
      </div>
      <div class="mnu__foot">
        <p class="mnu__note">Las marcas pertenecen a sus respectivos titulares.</p>
        <a class="mnu__all" href="/integraciones.html">Ver las ${ints.totales.catalogo_completo} integraciones${FLECHA}</a>
      </div>
    </div>`,
  };
}

const pInts = panelIntegraciones();

/* ============================== menus.html ============================== */
const menus = `<!-- ===========================================================================
     HOLDERA · LOS DOS DESPLEGABLES DE LA BARRA
     GENERADO por  node _build/parts/build-menus.js  — no editar a mano.
     Sus fuentes:
       _build/contenido/features.json          (los 8 nombres y sus frases)
       _build/integraciones/integraciones.json (los 10 grupos, 50 marcas)
       assets/img/integraciones/<slug>.svg     (las 24 fichas de logo)

     QUE ES: el <nav class="nav__links"> ENTERO, listo para sustituir al que
     hoy hay en _build/shell/header.html, con "Cómo funciona" retirada y dos
     entradas nuevas con desplegable: Funciones e Integraciones.

     COMO SE PEGA
     ------------
     1. Sustituye el bloque <nav class="nav__links"> … </nav> de
        _build/shell/header.html por el de aquí abajo (entre part:nav-links).
     2. Replica el shell a las páginas: node _build/replicate-shell.js
        y comprueba con node _build/check-shell.js.
     3. menus.css se APENDA al final de styles.css (ver la cabecera de ese
        archivo: check-tokens.js y contrast.js llevan la lista de hojas
        escrita a mano, y un .css nuevo no lo mira ningún guardia).
     4. menus.js se carga como <script defer src="menus.js"> DESPUÉS de
        script.js, o se apenda a script.js: es un IIFE independiente y sale
        solo si no encuentra ningún [data-menu].

     DESTINOS, comprobados por HTTP el 20-09-2026 contra localhost:4177:
     /funciones/ y las ocho /funciones/<slug>/ devuelven 200, igual que
     /integraciones.html. Las diez anclas de grupo son las que esa página
     escribe de verdad — id="int-channel", "int-pagos", … — no los ids
     pelados del JSON, que fue el primer intento y no existía ninguno.
     🔴 Si esas páginas se regeneran con otro esquema de anclas, este menú
     apunta a un ancla muerta SIN FALLAR: el navegador se queda arriba de la
     página y nadie se entera. Volver a pasar la comprobación.

     🔴 ESTAS SON LAS INTEGRACIONES DE HOTELGEST. Que el producto de Holdera
        herede las mismas es lo que dijo Alex; no está verificado contra
        ninguna fuente pública. Mismo TODO que ya lleva la sección
        #integraciones de index.html.

     SIN JS: los dos disparadores son <a href> de verdad a /funciones/ y a
     /integraciones.html, y los paneles llevan el atributo hidden, así que no
     se ven nunca. menus.js convierte cada <a> en el <button> con
     aria-expanded / aria-controls que pide un desplegable accesible. Nunca
     hay un <button> muerto en el HTML.
     =========================================================================== -->

<!-- part:nav-links -->
        <nav class="nav__links" aria-label="Principal">
          <a href="index.html">Inicio</a>

          <a class="mnu__trigger" href="/funciones/" data-menu="mnu-funciones">Funciones${CHEV}</a>
          ${indent(panelFunciones(), 10)}

          <a class="mnu__trigger" href="/integraciones.html" data-menu="mnu-integraciones">Integraciones${CHEV}</a>
          ${indent(pInts.html, 10)}

          <a href="nosotros.html">Nosotros</a>
          <a href="partners.html">Partners</a>
          <a href="panel/">Panel demo</a>
          <a href="contacto.html">Contacto</a>
        </nav>
<!-- /part:nav-links -->
`;

/* =========================== menus-drawer.html =========================== */
function filaDrawer(id, etiqueta, href, i, banda, sub) {
  return `        <div class="msub" data-msub>
          <a class="mrow__link msub__head" href="${href}" data-msub-trigger data-msub-panel="${id}" style="--i:${i}">
            <span class="mrow__label">${esc(etiqueta)}</span>
            <span class="msub__chev" aria-hidden="true"><svg viewBox="0 0 12 8" width="12" height="8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 2 6 6.25 10.5 2"/></svg></span>
            ${banda}
          </a>
          <div class="msub__list" id="${id}" hidden>
${sub}
          </div>
        </div>`;
}

const bandaFn = '<span class="mrow__band" aria-hidden="true"><span class="mrow__track"><span class="mrow__inner" aria-hidden="true">' +
  ['Hoy', 'Habitaciones', 'Housekeeping', 'Revenue', 'Reservas', 'Trazabilidad', 'Definiciones', 'Catálogo de métricas']
    .concat(['Hoy', 'Habitaciones', 'Housekeeping', 'Revenue', 'Reservas', 'Trazabilidad', 'Definiciones', 'Catálogo de métricas'])
    .map((w) => `<span>${esc(w)}</span>`).join('') + '</span></span></span>';

const marcasBanda = GRUPOS_FICHA.flatMap((g) => grupoPorId.get(g).integraciones).slice(0, 10);
const bandaInts = '<span class="mrow__band" aria-hidden="true"><span class="mrow__track"><span class="mrow__inner" aria-hidden="true">' +
  marcasBanda.concat(marcasBanda).map((w) => `<span>${esc(w)}</span>`).join('') + '</span></span></span>';

const subFn = feat.features.map((f) =>
  `            <a class="msub__item" href="/funciones/${f.slug}/">
              <span class="msub__name">${esc(CORTO[f.clave])}</span>
              <span class="msub__desc">${esc(f.frase)}</span>
            </a>`
).join('\n') + `\n            <a class="msub__all" href="/funciones/">Ver todas las funciones${FLECHA}</a>`;

/* El recuento de cada grupo NO puede decir «marcas» a secas: dos de los diez
   no lo son. `normativa` son SES Hospedajes, Verifactu, los Mossos… —
   organismos y estandares, no empresas con las que uno se integre
   comercialmente— y `modulos` son piezas del propio PMS, cosa que el JSON dice
   con todas sus letras en su campo `nota`. Llamarlos marcas seria inventar. */
function cuenta(g) {
  const n = g.integraciones.length;
  if (g.id === 'modulos') return n + ' piezas del propio PMS';
  if (g.id === 'normativa') return n + ' organismos y estándares';
  return n + (n === 1 ? ' integración' : ' integraciones');
}
const subInts = ints.grupos.map((g) =>
  `            <a class="msub__item" href="/integraciones.html#int-${g.id}">
              <span class="msub__name">${esc(g.titulo)}</span>
              <span class="msub__desc">${esc(cuenta(g))}</span>
            </a>`
).join('\n') + `\n            <a class="msub__all" href="/integraciones.html">Ver las ${ints.totales.catalogo_completo} integraciones${FLECHA}</a>`;

const drawer = `<!-- ===========================================================================
     HOLDERA · LOS DOS DESPLEGABLES, VERSIÓN DRAWER
     GENERADO por  node _build/parts/build-menus.js  — no editar a mano
     (ver la cabecera de menus.html).

     QUE ES: las DOS filas que sustituyen, dentro de
     <nav class="drawer__links mrows"> de _build/shell/drawer.html, a las dos
     filas actuales «Cómo funciona» (--i:2) e «Integraciones» (--i:3). El resto
     de filas del drawer no se toca; solo hay que renumerar --i a partir de
     «Nosotros» si se quiere conservar el escalonado (hoy va 3,4,5,6 y con
     estas dos pasa a 3,4,5,6 igualmente: las dos nuevas ocupan 1 y 2).

     La fila sigue siendo un .mrow__link con su .mrow__band, así que el
     efecto de banda que ya escribe script.js (línea ~515,
     document.querySelectorAll('.mrow__link')) la sigue cogiendo.

     🔴 ORDEN DE CARGA: script.js engancha el cierre del drawer con
        $$('.drawer__links a, .drawer__foot a') en su arranque. menus.js
        sustituye el <a> disparador por un <button>, así que ese <a> deja de
        existir y el disparador NO cierra el drawer — que es justo lo que se
        quiere. Los .msub__item sí son <a> desde el HTML y sí lo cierran.
     =========================================================================== -->

<!-- part:drawer-rows -->
${filaDrawer('msub-funciones', 'Funciones', '/funciones/', 1, bandaFn, subFn)}
${filaDrawer('msub-integraciones', 'Integraciones', '/integraciones.html', 2, bandaInts, subInts)}
<!-- /part:drawer-rows -->
`;

fs.writeFileSync(path.join(ROOT, '_build/parts/menus.html'), menus, 'utf8');
fs.writeFileSync(path.join(ROOT, '_build/parts/menus-drawer.html'), drawer, 'utf8');
console.log('menus.html         ' + menus.length + ' bytes');
console.log('menus-drawer.html  ' + drawer.length + ' bytes');
console.log('fichas de logo en el desplegable: ' + pInts.fichas);
console.log('grupos con ficha: ' + GRUPOS_FICHA.join(', '));
console.log('grupos solo en el pie: ' + ints.grupos.filter((g) => !GRUPOS_FICHA.includes(g.id)).map((g) => g.id).join(', '));
