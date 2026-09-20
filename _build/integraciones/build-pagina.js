#!/usr/bin/env node
'use strict';
/*
 * _build/integraciones/build-pagina.js
 * Genera integraciones.html — LA pagina del catalogo de integraciones.
 *
 *   node _build/integraciones/build-pagina.js
 *   node _build/integraciones/build-pagina.js --dry-run     (no escribe, informa)
 *
 * POR QUE UN GENERADOR Y NO HTML A MANO
 * -------------------------------------
 * Son 50 fichas en 10 grupos y 41 logotipos INCRUSTADOS (un <svg> por marca,
 * porque un .svg cargado con <img> no hereda `currentColor` y se pintaria en
 * negro sobre la hoja oscura, es decir invisible). Mantener eso a mano es
 * garantizar que el dia que cambie el catalogo la pagina se quede vieja. Aqui
 * la unica fuente es _build/integraciones/integraciones.json; la pagina es
 * salida, no fuente. Si cambia el catalogo: se edita el JSON, se pasa
 * build-logos.js y se vuelve a pasar esto.
 *
 * DE DONDE SALE CADA COSA
 * -----------------------
 *   catalogo   _build/integraciones/integraciones.json  (nombre, categoria,
 *              slug, web verificada, grupos)
 *   logotipos  assets/img/integraciones/<slug>.svg      (41 de 50; los genera
 *              build-logos.js: 5 son la marca real de simple-icons y 36 son
 *              wordmarks tipograficos en Geist)
 *   cascara    _build/shell/header.html · drawer.html · footer.html
 *              SE LEEN, no se copian a mano: asi `node _build/check-shell.js`
 *              pasa siempre y un cambio de nav solo obliga a re-generar.
 *
 * LAS TRES CLASES DE FICHA (y por que no son un fallo)
 * ----------------------------------------------------
 *   data-mark="icon"   5 marcas con logotipo real (Redsys, Sage 50, Sage 200,
 *                      SAP, Stripe): el glifo oficial MAS el nombre al lado,
 *                      porque un glifo suelto no identifica a nadie que no lo
 *                      conozca ya.
 *   data-mark="word"   36 marcas cuyo "logotipo" es su propio nombre compuesto
 *                      en Geist. Aqui el SVG YA ES el nombre: repetirlo debajo
 *                      en un pie de ficha lo pondria dos veces.
 *   data-mark="texto"  9 sin dibujo a proposito (6 autoridades y 3 modulos del
 *                      propio PMS). Llevan el nombre compuesto en el MISMO
 *                      tipo, tamano y peso que los 36 wordmarks, asi que la
 *                      rejilla se lee igual de pareja. No se esconden: el
 *                      catalogo son 50.
 *
 * ENLACE SI, Y SOLO SI, LA WEB ESTA VERIFICADA
 * --------------------------------------------
 * `web` solo esta rellena cuando el dominio respondio 2xx y el <title> o la
 * URL final mencionan la marca (ver `procedencia.webs_oficiales` del JSON).
 * Son 41. Las otras 9 son <div>, no <a>: mandar a alguien a un dominio que no
 * hemos comprobado es peor que no enlazar. OJO: esos 41 NO son los mismos 41
 * que tienen dibujo — 36 coinciden, 5 tienen dibujo sin web (Prestige,
 * RevCtrlData, Clavecon, Asincorp, HubOS) y 5 tienen web sin dibujo
 * (Ertzaintza, Mossos, MiDNI, TicketBAI, Verifactu).
 *
 * EL <head>
 * ---------
 * El bloque entre <!-- seo:head --> y <!-- /seo:head --> sale VACIO, como
 * mandan las otras paginas: lo rellena `node _build/seo-inject.js` a partir de
 * _build/seo/meta.json. No escribirlo a mano aqui — se perderia al reinyectar.
 * <title>, description, theme-color, og:type y og:locale si van fuera del
 * bloque porque seo-inject los actualiza EN SU SITIO.
 *
 * SALE CON CODIGO 1 si el catalogo no cuadra (un nombre de grupo sin entrada,
 * un total distinto de 50, un SVG que no esta donde dice el slug). Un
 * generador que se calla y escribe 46 fichas es exactamente el "verde
 * mentiroso" que este proyecto ya ha pagado tres veces.
 */
const fs = require('fs');
const path = require('path');

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..');
const DRY = process.argv.includes('--dry-run');

const SALIDA = path.join(RAIZ, 'integraciones.html');
const CATALOGO = path.join(AQUI, 'integraciones.json');
const LOGOS = path.join(RAIZ, 'assets', 'img', 'integraciones');
const SHELL = path.join(RAIZ, '_build', 'shell');

/* --- 0. utilidades -------------------------------------------------------- */

/* NUNCA String.replace con texto de reemplazo dinamico: '$$' es un escape y se
   convierte en '$'. Trampa documentada de este proyecto, tres veces. */
const sust = (texto, a, b) => texto.split(a).join(b);

const esc = (s) => String(s)
  .split('&').join('&amp;')
  .split('<').join('&lt;')
  .split('>').join('&gt;')
  .split('"').join('&quot;');

const problemas = [];
const exigir = (cond, mensaje) => { if (!cond) problemas.push(mensaje); };

/* --- 1. catalogo ---------------------------------------------------------- */

const cat = JSON.parse(fs.readFileSync(CATALOGO, 'utf8'));
const porNombre = new Map(cat.integraciones.map((i) => [i.nombre, i]));

/* El campo `grupo` de una entrada NO siempre coincide con el `id` del grupo
   (los tres modulos del PMS dicen "pms-propio" y su grupo se llama "modulos").
   La lista buena es `grupos[].integraciones`, que es la que ordena el
   catalogo; se resuelve por NOMBRE contra el indice de arriba. */
const grupos = cat.grupos.map((g) => {
  const items = g.integraciones.map((nombre) => {
    const it = porNombre.get(nombre);
    exigir(it, `el grupo "${g.titulo}" nombra a "${nombre}" y no hay entrada con ese nombre`);
    if (!it) return null;

    const svgPath = path.join(LOGOS, it.slug + '.svg');
    let svg = null;
    if (fs.existsSync(svgPath)) svg = fs.readFileSync(svgPath, 'utf8').trim();

    /* 🔴 La pregunta NO es "¿este SVG lleva <text>?" sino "¿este dibujo YA
       dice el nombre de la marca?". Durante un tiempo dieron lo mismo, porque
       los unicos dibujos sin <text> eran cinco iconos cuadrados. Desde que la
       tuberia de logotipos trae los oficiales, ya no: el de SiteMinder es un
       logotipo completo de proporcion 7,07 que dice "SiteMinder" dentro.

       Clasificarlo como `icon` le ponia el nombre OTRA VEZ al lado y, peor,
       le daba `flex: none` en la hoja — asi que no podia encogerse y se salia
       33px por la izquierda de su ficha. Medido en pantalla.

       La proporcion lo separa limpiamente sobre los 41 dibujos actuales:
       por debajo de 2 solo hay iconos cuadrados (Stripe 0,71 · Redsys 1,0 ·
       Sage 1,79), y de 2 en adelante todo son logotipos que se explican solos
       (SAP 2,02 es el mas estrecho). */
    const vb = svg && /viewBox="([\d.\s-]+)"/.exec(svg);
    const caja = vb ? vb[1].trim().split(/\s+/).map(Number) : null;
    const proporcion = caja && caja[3] ? caja[2] / caja[3] : 0;
    const seExplicaSolo = Boolean(svg) && (svg.includes('<text') || proporcion >= 2);
    const marca = !svg ? 'texto' : (seExplicaSolo ? 'word' : 'icon');
    return { ...it, svg, marca };
  }).filter(Boolean);
  return { ...g, items };
});

const total = grupos.reduce((n, g) => n + g.items.length, 0);
exigir(grupos.length === cat.grupos.length,
  `salen ${grupos.length} grupos y el catalogo declara ${cat.grupos.length}`);
exigir(total === cat.totales.catalogo_completo,
  `salen ${total} fichas y el catalogo declara ${cat.totales.catalogo_completo}`);

const cuenta = { icon: 0, word: 0, texto: 0, enlace: 0 };
grupos.forEach((g) => g.items.forEach((i) => { cuenta[i.marca]++; if (i.web) cuenta.enlace++; }));
exigir(cuenta.icon + cuenta.word === 41,
  `${cuenta.icon + cuenta.word} fichas con dibujo y en assets/img/integraciones hay 41 svg`);
exigir(cuenta.enlace === cat.totales.con_web_verificada,
  `${cuenta.enlace} fichas con enlace y el catalogo declara ${cat.totales.con_web_verificada}`);

/* --- 2. la cascara (cabecera, drawer, pie) -------------------------------- */

/* Se lee tal cual. La UNICA diferencia permitida por check-shell.js que se
   aplica aqui es marcar el enlace de la pagina actual — y solo cuando el shell
   ya apunte a integraciones.html. Mientras la nav siga llevando a
   index.html#integraciones (el bloque del home, que el orquestador va a
   retirar) no se marca nada: un aria-current sobre un href que va a OTRA
   pagina seria mentira. Cuando el orquestador cambie el shell, basta con
   volver a pasar este script. */
function leerShell(archivo) {
  const txt = fs.readFileSync(path.join(SHELL, archivo), 'utf8').replace(/\s+$/, '');
  return sust(txt,
    '<a href="integraciones.html">Integraciones</a>',
    '<a href="integraciones.html" class="is-active" aria-current="page">Integraciones</a>');
}
function leerDrawer() {
  const txt = fs.readFileSync(path.join(SHELL, 'drawer.html'), 'utf8').replace(/\s+$/, '');
  return sust(txt,
    '<a class="mrow__link" href="integraciones.html"',
    '<a class="mrow__link is-active" aria-current="page" href="integraciones.html"');
}
const HEADER = leerShell('header.html');
const DRAWER = leerDrawer();
const FOOTER = fs.readFileSync(path.join(SHELL, 'footer.html'), 'utf8').replace(/\s+$/, '');

/* --- 3. una ficha --------------------------------------------------------- */

/* El .svg suelto es autosuficiente (lleva xmlns y, en los wordmark, los cuatro
   atributos de tipografia) porque nadie le aplica una hoja. Incrustado dentro
   del HTML el xmlns sobra — un <svg> en HTML ya esta en su espacio de nombres.
   El role/aria-label SI se conserva en los wordmark: ahi el dibujo ES el
   nombre, y es lo que le da nombre accesible al enlace. En los 5 iconos se
   cambia por aria-hidden, porque el nombre lo pone el texto de al lado y si no
   el enlace se llamaria "Stripe Stripe". */
function incrustar(it) {
  let s = sust(it.svg, ' xmlns="http://www.w3.org/2000/svg"', '');
  if (it.marca === 'icon') {
    s = sust(s, `role="img" aria-label="${esc(it.nombre)}"`, 'aria-hidden="true" focusable="false"');
  }
  return s;
}

/* Sin tildes y en minusculas: "Agora" tiene que salir tecleando "agora" y
   "Autoridades" tecleando "autoridades". `NFD` separa la tilde de la letra y
   el rango Unicode se la lleva. */
const plano = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

function ficha(it, g) {
  const busca = plano([it.nombre, it.tipo, g && g.titulo].filter(Boolean).join(' '));
  const attrs = ` data-group="${esc(g ? g.id : '')}" data-find="${esc(busca)}"`;
  const dentro = [];
  if (it.svg) dentro.push(incrustar(it));
  if (it.marca !== 'word') dentro.push(`<span class="pgi-card__name">${esc(it.nombre)}</span>`);

  const cuerpo = dentro.join('');
  const flecha = '<span class="pgi-card__out" aria-hidden="true">'
    + '<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'
    + '<path d="M5 11 11 5M6 5h5v5"/></svg></span>';

  if (it.web) {
    return `          <li class="pgi-cell"${attrs}>\n`
      + `            <a class="pgi-card" data-mark="${it.marca}" href="${esc(it.web)}" target="_blank" rel="noopener">`
      + cuerpo
      + `<span class="pgi-sr"> (nueva pestaña)</span>`
      + flecha
      + `</a>\n`
      + `          </li>`;
  }
  return `          <li class="pgi-cell"${attrs}>\n`
    + `            <div class="pgi-card pgi-card--flat" data-mark="${it.marca}">${cuerpo}</div>\n`
    + `          </li>`;
}

/* --- 4. un grupo ---------------------------------------------------------- */

function bloque(g, i) {
  const id = 'int-' + g.id;
  const n = g.items.length;
  const nota = g.nota
    ? `\n        <p class="pgi-group__note">${esc(g.nota)}</p>`
    : '';
  return `      <section class="pgi-group reveal" data-reveal="up" id="${id}" aria-labelledby="${id}-t" style="--i:${i % 4}">
        <div class="pgi-group__head">
          <h3 class="pgi-group__title" id="${id}-t">${esc(g.titulo)}</h3>
          <p class="pgi-group__n">${n} ${n === 1 ? 'sistema' : 'sistemas'}</p>
        </div>${nota}
        <ul class="pgi-grid">
${g.items.map((it) => ficha(it, g)).join('\n')}
        </ul>
      </section>`;
}

/* El carril: lo que la pagina no tenia y sin lo cual 50 fichas en 5,7
   pantallas no se pueden recorrer. La idea es la del catalogo de Hotelgest
   que paso Alex (buscador arriba, familias con su recuento debajo, todo
   pegajoso mientras se baja); lo que cambia es TODO lo demas — aqui no hay
   teja de color por marca ni tarjeta promocional intercalada, que es lo que
   convertiria esta pagina en un SaaS cualquiera.

   Sin JavaScript sigue siendo exactamente lo que era: una lista de anclas que
   salta a cada familia. El buscador solo aparece con `.has-js`, porque un
   campo de busqueda que no busca es peor que no tenerlo. */
const CATS = [
  `            <li><a class="pgi-cat is-on" href="#catalogo" data-cat="">Todas <b>${total}</b></a></li>`,
].concat(grupos.map((g) =>
  `            <li><a class="pgi-cat" href="#int-${g.id}" data-cat="${esc(g.id)}">${esc(g.titulo)} <b>${g.items.length}</b></a></li>`
)).join('\n');

const LUPA = '<svg class="pgi-search__ico" viewBox="0 0 16 16" width="15" height="15" fill="none" '
  + 'stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true">'
  + '<circle cx="7.2" cy="7.2" r="4.6"/><path d="m10.6 10.6 2.8 2.8"/></svg>';

const RAIL = `        <aside class="pgi-rail" aria-labelledby="pgi-rail-t">
          <div class="pgi-rail__in">
            <p class="pgi-rail__lab" id="pgi-rail-t">Catálogo</p>
            <p class="pgi-rail__n"><b>${total}</b> integraciones</p>

            <div class="pgi-search">
              <label class="pgi-sr" for="pgi-q">Buscar una integración por nombre o familia</label>
              ${LUPA}
              <input id="pgi-q" class="pgi-search__in" type="search" placeholder="Nombre o palabra clave…"
                     autocomplete="off" autocapitalize="off" spellcheck="false">
            </div>

            <p class="pgi-rail__lab">Familias</p>
            <ul class="pgi-rail__cats">
${CATS}
            </ul>
          </div>
        </aside>`;

/* --- 5. la pagina --------------------------------------------------------- */

const TITULO = 'Integraciones | Holdera';
const DESC = 'El catálogo completo de sistemas con los que trabaja Holdera: '
  + 'channel manager, pasarelas de pago, revenue, cerraduras, TPV, contabilidad y '
  + 'las autoridades a las que hay que declarar.';

const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(TITULO)}</title>
  <meta name="description" content="${esc(DESC)}">
  <meta name="theme-color" content="#e5e5e5">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="es_ES">
  <link rel="icon" href="assets/logo/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="styles.css">
  <link rel="preload" href="assets/fonts/geist-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="pages.css">
  <!-- La hoja de la rejilla de fichas. Sin esta linea la pagina se sirve sin
       estilar y el catalogo entero es un hueco negro: el CSS existia en
       _build/parts/ pero no lo cargaba nadie. -->
  <link rel="stylesheet" href="integraciones.css">
  <script>document.documentElement.classList.add('has-js');</script>
  <!-- El bloque SEO lo escribe _build/seo-inject.js desde _build/seo/meta.json.
       No editarlo a mano: la siguiente reinyección se lo lleva por delante. -->
  <!-- seo:head -->
  <!-- /seo:head -->
</head>
<body class="page">
  <a class="skip-link" href="#contenido">Saltar al contenido</a>
  <div class="grain" aria-hidden="true"></div>

  <!-- Cabecera FIJA (paso 6): acompaña al scroll en toda la página. Fuera del
       hero a propósito: el hero pasa a inert cuando la hoja lo tapa. -->
${HEADER}

  <!-- ============ PAGE BAND (light) ============ -->
  <div class="phead">
    <div class="phead__deco" aria-hidden="true"><div class="phead__wordmark">HOLDERA</div></div>
    <div class="container phead__inner">
      <div class="phead__copy">
        <p class="eyebrow" data-enter style="--d:60"><span class="eyebrow__bar" aria-hidden="true"></span>Integraciones</p>
        <h1 class="phead__title" id="page-title" data-enter style="--d:140"><span class="ln">Cincuenta sistemas.</span> <span class="ln">Una sola pantalla.</span></h1>
      </div>
      <p class="phead__lead" data-enter style="--d:260">Channel manager, pasarelas de pago, revenue, cerraduras, TPV, contabilidad y las autoridades a las que hay que declarar. Este es el catálogo entero, agrupado por lo que hace cada pieza.</p>
    </div>
    <div class="hero-sentinel" aria-hidden="true"></div>
  </div>

  <!-- ============ CONTENT SHEET (dark) ============ -->
  <main id="contenido" class="page__main">

    <section class="sheet" id="catalogo" aria-labelledby="cat-title">
      <div class="container">
        <div class="sec__head">
          <p class="tag reveal" data-reveal="up">Catálogo</p>
          <h2 id="cat-title" class="sheet__title reveal" data-reveal="up" style="--i:1">Nos integramos con</h2>
          <p class="sheet__lead reveal" data-reveal="up" style="--i:2">Diez familias de sistemas. Salta a la que te interese o bájalas todas. Cada ficha lleva a la web del fabricante cuando hemos podido verificarla.</p>
        </div>



        <!-- TODO (Alex): confirmar que el producto de Holdera hereda de verdad
             este catálogo antes de darlo por definitivo. La procedencia está
             anotada en _build/integraciones/integraciones.json, clave "procedencia":
             la lista es la de Hotelgest y esa herencia no se ha podido
             verificar contra ninguna fuente pública. -->
      <div class="pgi-layout">
${RAIL}

        <div class="pgi-col">
          <div class="pgi">
${grupos.map(bloque).join('\n\n')}
          </div>

          <!-- Estado vacio: lo pinta el filtro cuando no queda ninguna ficha.
               Una rejilla que se queda en blanco sin decir nada se lee como
               una pagina rota. -->
          <p class="pgi-empty" hidden>
            <span>Ninguna integración coincide con <b class="pgi-empty__q"></b>.</span>
            <button class="pgi-empty__all" type="button">Ver las ${total}</button>
          </p>
        </div>
      </div>

        <div class="pgi-foot reveal" data-reveal="up">
          <p class="pgi-foot__legal">Las marcas y los logotipos pertenecen a sus respectivos titulares. Aparecer en esta lista no implica acuerdo comercial, patrocinio ni respaldo.</p>
          <p class="pgi-foot__todo">Alcance y estado de cada conexión: <span data-placeholder="integraciones-alcance">[Alcance por confirmar]</span></p>
        </div>
      </div>
    </section>

    <section class="sheet sheet--cta" id="hablamos" aria-labelledby="cta-title">
      <div class="container ctaband">
        <div class="ctaband__text">
          <p class="tag reveal" data-reveal="up">Contacto</p>
          <h2 id="cta-title" class="sheet__title reveal" data-reveal="up" style="--i:1">¿Qué sistemas <span class="fade">tiene tu hotel?</span></h2>
          <p class="sheet__lead reveal" data-reveal="up" style="--i:2">Dinos con qué trabajas hoy: channel manager, TPV, cerraduras, quién te lleva la contabilidad. Miramos qué exporta cada uno y te decimos qué pantallas saldrían de ahí.</p>
        </div>
        <div class="ctaband__actions reveal" data-reveal="right">
          <a class="btn btn--primary btn--on-dark" href="contacto.html">
            <span>Habla con nosotros</span>
            <span class="btn__icon" aria-hidden="true"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg></span>
          </a>
          <a class="btn btn--secondary" href="panel/">Ver el panel demo</a>
        </div>
      </div>
    </section>

  </main>

${FOOTER}

${DRAWER}

  <script src="script.js" defer></script>
  <!-- Solo esta pagina: el filtro del catalogo. Fuera de script.js a proposito,
       que lo cargan las ocho paginas y esto solo sirve aqui. -->
  <script src="integraciones.js" defer></script>
</body>
</html>
`;

/* --- 6. escribir ---------------------------------------------------------- */

if (problemas.length) {
  problemas.filter(Boolean).forEach((p) => console.error('ERROR ' + p));
  if (problemas.filter(Boolean).length) process.exit(1);
}

/* `pgi-card` a secas o con el modificador: NO vale /class="pgi-card/g, que
   tambien casa con pgi-card__name y pgi-card__out y da 105. */
const fichas = (html.match(/class="pgi-card(?:"| pgi-card--flat")/g) || []).length;
const bloques = (html.match(/class="pgi-group reveal"/g) || []).length;
const enlaces = (html.match(/class="pgi-card" data-mark/g) || []).length;

/* El carril tiene que nombrar TODAS las familias mas "Todas". Si alguien
   anade un grupo y el carril se queda corto, el catalogo pasa a tener una
   familia inalcanzable desde el filtro — y en pantalla no se nota. */
const cats = (html.match(/class="pgi-cat[ "]/g) || []).length;
if (cats !== cat.grupos.length + 1) {
  console.error(`ERROR el carril lista ${cats} filtros y se esperaban ${cat.grupos.length + 1} (las `
    + `${cat.grupos.length} familias mas "Todas")`);
  process.exit(1);
}

/* Cada ficha tiene que ser buscable: sin `data-find` el filtro la esconde
   para siempre en cuanto alguien teclee una letra. */
const buscables = (html.match(/ data-find="/g) || []).length;
if (buscables !== cat.totales.catalogo_completo) {
  console.error(`ERROR ${buscables} fichas son buscables y hay ${cat.totales.catalogo_completo}`);
  process.exit(1);
}

if (fichas !== cat.totales.catalogo_completo || bloques !== cat.grupos.length) {
  console.error(`ERROR el HTML sale con ${fichas} fichas y ${bloques} grupos; se esperaban `
    + `${cat.totales.catalogo_completo} y ${cat.grupos.length}`);
  process.exit(1);
}

if (!DRY) fs.writeFileSync(SALIDA, html, 'utf8');

console.log((DRY ? '[dry-run] ' : '') + 'integraciones.html');
console.log(`  ${bloques} grupos · ${fichas} fichas · ${Math.round(html.length / 1024)} KB`);
console.log(`  marca real ${cuenta.icon} · wordmark ${cuenta.word} · sin dibujo ${cuenta.texto}`);
console.log(`  con enlace ${enlaces} · sin enlace ${fichas - enlaces}`);
console.log(`  carril: ${cats} filtros · ${buscables} fichas buscables`);
console.log('  el <head> lleva el bloque seo:head VACIO — pasa node _build/seo-inject.js');
console.log('  y sella los assets:            node _build/version-assets.js');
