/*
 * _build/contenido/build-funciones.js
 * Genera las páginas de /funciones/ (el índice y las ocho funciones) y
 * /glosario/, los menús de Funciones de la cabecera y del drawer, y los datos
 * de las ventanas de términos.
 *
 *   node _build/contenido/build-funciones.js
 *   node _build/replicate-shell.js        (lleva los menús nuevos a TODAS las páginas)
 *
 * Qué escribe (y reescribe entero en cada ejecución — es idempotente):
 *   funciones/index.html
 *   funciones/<slug>/index.html           x8, slugs de features.json
 *   glosario/index.html                   el catálogo de definiciones
 *   funciones/funciones.css               copia de _build/parts/pagina-funcion.css
 *   terminos.js                           el bloque terms:data, desde glosario.json
 *   _build/shell/header.html + drawer.html + footer.html   los menús de Funciones
 *   _build/contenido/meta-funciones.json  el fragmento SEO de estas diez páginas
 *   _build/seo/meta.json                  y ese fragmento, ya fundido en su sitio
 *
 * De dónde sale el contenido:
 *   - features.json: nombre, título, frase, resumen, encuadre, puntos,
 *     pantalla, enlace y SEO de cada función. Con marcadores [[ADR]].
 *   - glosario.json: todos los términos (vía terminos-lib.js).
 *   - iconos.js: los ocho iconos de sección del diseño de Alex.
 *
 * Paso 14 (28-09-2026) — la reunión con Alex, en una línea por nota del PDF:
 *   · «no es lenguaje hotelero, se tiene que comprimir, demasiado texto»:
 *     el cuerpo de cada función son ahora dos líneas y dos a cuatro puntos;
 *   · «el lenguaje técnico en bold, y una ventana al poner el cursor»: los
 *     marcadores [[…]] salen como <abbr class="term"> y terminos.js pone la
 *     ventana;
 *   · «rehacer la estructura entera; catálogo de definiciones (estilo el
 *     catálogo de KPIs de mi padre)»: cada función acaba en el catálogo de
 *     SUS términos, y /glosario/ es el catálogo entero;
 *   · «lo que no hace … why do we need this explanation? remove it»: el bloque
 *     «Lo que no hace» y su cita literal en inglés desaparecen de las ocho;
 *   · «esto tendría que estar bajo el encuadre de room inventory status y se
 *     podría enseñar una foto»: cada pantalla lleva su encuadre hotelero como
 *     título y la captura del panel al lado;
 *   · «la web tiene que ser genérica»: fuera todo lo que dependía de los datos
 *     del hotel de la demo (el 14:30, «de diciembre a julio», los 364 días…).
 *
 * Tres trampas de este proyecto que siguen resueltas aquí:
 *   1. <base href="/">: el shell va COPIADO con rutas relativas; desde una
 *      subcarpeta solo apuntan bien con base. Es el patrón de 404.html.
 *   2. Con base, un href="#contenido" a secas va a la portada: el enlace de
 *      salto va absoluto.
 *   3. styles.css estiliza `main` como la hoja deslizante de la home; pages.css
 *      lo corrige para <body class="page">, así que se carga SIEMPRE.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const lib = require('./terminos-lib');
const { icon } = require('./iconos');

const ROOT = path.resolve(__dirname, '..', '..');
const SHELL = path.join(ROOT, '_build', 'shell');
const OUT_DIR = path.join(ROOT, 'funciones');
const GL_DIR = path.join(ROOT, 'glosario');
const CSS_SRC = path.join(ROOT, '_build', 'parts', 'pagina-funcion.css');
const SHOTS = path.join(ROOT, 'assets', 'img', 'funciones');
const META_JSON = path.join(ROOT, '_build', 'seo', 'meta.json');

const PAGES_CSS = path.join(ROOT, 'pages.css');
const CSS_FUNDIDO =
  fs.existsSync(PAGES_CSS) && fs.readFileSync(PAGES_CSS, 'utf8').indexOf('--pgf-row-hover') >= 0;

const SRC = JSON.parse(fs.readFileSync(path.join(__dirname, 'features.json'), 'utf8'));
const features = SRC.features.slice().sort((a, b) => a.orden - b.orden);
const total = features.length;
const byClave = new Map(features.map((f) => [f.clave, f]));
const grupoDe = new Map();
for (const g of SRC.grupos) for (const c of g.claves) grupoDe.set(c, g);

const { esc, render, plain } = lib;
const escAttr = lib.escAttr;
const dosDigitos = (n) => String(n).padStart(2, '0');

const flecha = (clase) =>
  `<span class="${clase}" aria-hidden="true"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg></span>`;
const flechaMenu = `<span class="mnu__arrow" aria-hidden="true"><svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg></span>`;

/* La nota del pie de hoja. Genérica a propósito (nota de Alex: «la web tiene
   que ser genérica»): de qué son las pantallas enlazadas, sin fechas ni horas
   del hotel de la demo. */
const NOTA_DEMO = 'Las pantallas enlazadas son las del panel de demostración: un hotel ficticio de 100 habitaciones. Ninguna cifra es de un hotel real.';
const IMG_ALT = 'Holdera — software de operaciones para hoteles. Todo tu hotel en una pantalla, y cada cifra con su origen. holdera.es, Barcelona.';

const INDICE = {
  path: '/funciones/',
  title: 'Funciones del software hotelero | Holdera',
  metaDescription: 'Las ocho pantallas de Holdera, una por página: qué KPIs enseña cada una, en qué términos, y su captura del panel demo.',
  h1: '<span class="ln">Ocho pantallas,</span> <span class="ln">un solo hotel.</span>',
  lead: 'Operación, revenue y trazabilidad, pantalla a pantalla.',
};

const GLOSARIO = {
  path: '/glosario/',
  title: 'Glosario de KPIs hoteleros: ADR, RevPAR, OTB | Holdera',
  metaDescription: 'Definición y fórmula de 57 KPIs hoteleros y de las siglas del día a día: ADR, RevPAR, TRevPAR, GOPPAR, OTB, STLY, MTD, VC, VD, OOO, OOS y más.',
};

/* ------------------------------------------------------------ capturas */
/* Ancho y alto de un .webp leídos de su cabecera, para que el <img> lleve
   width/height reales (sin ellos la página salta al llegar la imagen: CLS). */
function webpSize(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') throw new Error('No es WebP: ' + file);
  const kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
  if (kind === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
  if (kind === 'VP8L') {
    const n = b.readUInt32LE(21);
    return { w: (n & 0x3fff) + 1, h: ((n >> 14) & 0x3fff) + 1 };
  }
  throw new Error('WebP desconocido: ' + file);
}

function captura(f) {
  const rel = `assets/img/funciones/${f.captura}.webp`;
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) {
    console.warn(`  AVISO: falta ${rel} — la página sale sin captura. Genérala con node _build/funciones-shots.js`);
    return '';
  }
  const { w, h } = webpSize(full);
  /* El enlace de la imagen es un atajo de ratón: el enlace de verdad, con su
     texto, es el botón de al lado. Por eso va fuera del orden de tabulación y
     del árbol de accesibilidad (no dos paradas para el mismo destino). */
  return `
        <figure class="pgf-shot reveal" data-reveal="up" style="--i:2">
          <a class="pgf-shot__frame" href="${escAttr(f.enlace)}" tabindex="-1" aria-hidden="true">
            <img src="${rel}" width="${w}" height="${h}" alt="" loading="lazy" decoding="async">
          </a>
          <figcaption>Panel demo · ${esc(f.pantalla)}</figcaption>
        </figure>`;
}

/* ------------------------------------------------------------- piezas */
const header = () => fs.readFileSync(path.join(SHELL, 'header.html'), 'utf8').replace(/\s+$/, '');
const drawer = () => fs.readFileSync(path.join(SHELL, 'drawer.html'), 'utf8').replace(/\s+$/, '');
const footer = () => fs.readFileSync(path.join(SHELL, 'footer.html'), 'utf8').replace(/\s+$/, '');

function head(o) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <!-- Esta pagina vive en una subcarpeta y la cabecera, el drawer y el pie
       estan COPIADOS del shell con rutas relativas ("index.html", "panel/").
       <base href="/"> es lo que hace que sigan apuntando a la raiz — el mismo
       patron que 404.html. Por eso el enlace de salto va absoluto: con base,
       un "#contenido" a secas iria a la portada. -->
  <base href="/">
  <title>${esc(o.title)}</title>
  <meta name="description" content="${escAttr(o.description)}">
  <meta name="theme-color" content="#e5e5e5">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escAttr(o.ogTitle)}">
  <meta property="og:description" content="${escAttr(o.ogDescription)}">
  <meta property="og:locale" content="es_ES">
  <link rel="icon" href="assets/logo/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="styles.css">
  <link rel="preload" href="assets/fonts/geist-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="pages.css">${CSS_FUNDIDO ? '' : '\n  <link rel="stylesheet" href="funciones/funciones.css">'}
  <script>document.documentElement.classList.add('has-js');</script>
  <!-- seo:head -->
  <!-- /seo:head -->
</head>`;
}

function migas(actual, seccion) {
  const filas = ['<a href="index.html">Inicio</a>'];
  if (seccion === 'glosario') filas.push('<span aria-current="page">Glosario</span>');
  else if (actual === null) filas.push('<span aria-current="page">Funciones</span>');
  else {
    filas.push('<a href="funciones/">Funciones</a>');
    filas.push(`<span aria-current="page">${esc(actual)}</span>`);
  }
  return `<nav class="pgf-crumbs" aria-label="Migas de pan" data-enter style="--d:60">
          ${filas.join('\n          ')}
        </nav>`;
}

function banda(crumbs, h1, lead) {
  return `  <!-- ============ PAGE BAND (light) ============ -->
  <div class="phead">
    <div class="phead__deco" aria-hidden="true"><div class="phead__wordmark">HOLDERA</div></div>
    <div class="container phead__inner">
      <div class="phead__copy">
        ${crumbs}
        <h1 class="phead__title" id="page-title" data-enter style="--d:140">${h1}</h1>
      </div>
      <p class="phead__lead" data-enter style="--d:260">${lead}</p>
    </div>
    <div class="hero-sentinel" aria-hidden="true"></div>
  </div>`;
}

function cta() {
  return `    <section class="sheet sheet--cta pgf-sec" id="hablamos" aria-labelledby="cta-title">
      <div class="container ctaband">
        <div>
          <p class="tag reveal" data-reveal="up">Siguiente paso</p>
          <h2 id="cta-title" class="sheet__title reveal" data-reveal="up" style="--i:1">Ábrelo por dentro <span class="fade">y después hablamos.</span></h2>
          <p class="sheet__lead reveal" data-reveal="up" style="--i:2">${render('El panel demo está abierto, sin registro. Si encaja, cuéntanos qué [[PMS]] usas y cuántas habitaciones tienes.', 'cta')}</p>
        </div>
        <div class="ctaband__actions reveal" data-reveal="up" style="--i:3">
          <a class="btn btn--primary btn--on-dark" href="contacto.html"><span>Cuéntanos cómo es tu hotel</span>${flecha('btn__icon')}</a>
          <a class="btn btn--secondary" href="panel/"><span>Abrir el panel demo</span></a>
        </div>
      </div>
      <div class="container">
        <p class="pgf-note reveal" data-reveal="up" style="--i:4">${esc(NOTA_DEMO)}</p>
      </div>
    </section>

`;
}

function pie() {
  return `${footer()}

${drawer()}

  <script src="script.js" defer></script>
  <script src="terminos.js" defer></script>
</body>
</html>
`;
}

/* ---------------------------------------------------- catálogo de términos */
function fila(t, conPanel) {
  const en = t.en && t.en.toLowerCase() !== t.t.toLowerCase() ? `<span class="gl-en">${esc(t.en)}</span>` : '';
  const es = t.es ? `<span class="gl-es">${esc(t.es)}</span>` : '';
  const f = t.f ? `<dd class="gl-f"><span class="gl-k">Fórmula</span>${esc(t.f)}</dd>` : '';
  let meta = '';
  if (t.tipo === 'kpi') {
    const bits = [];
    if (t.u) bits.push(`<span>Unidad: ${esc(t.u)}</span>`);
    if (conPanel) bits.push(`<a href="panel/metrics/${escAttr(t.id)}/" aria-label="${escAttr(t.t)} en el panel demo">En el panel${flecha('gl-arrow')}</a>`);
    if (bits.length) meta = `<dd class="gl-meta">${bits.join('')}</dd>`;
  }
  return `<dt class="gl-term"><span class="gl-code">${esc(t.t)}</span>${en}${es}</dt>
              <dd class="gl-def">${esc(t.def)}</dd>${f ? '\n              ' + f : ''}${meta ? '\n              ' + meta : ''}`;
}

function idsDe(f) {
  const textos = [f.titulo, f.frase, f.resumen, f.encuadre, ...f.puntos.flatMap((p) => [p.t, p.d])];
  const out = [];
  for (const s of textos) for (const id of lib.ids(s, f.clave)) if (!out.includes(id)) out.push(id);
  for (const k of f.terminos || []) {
    const t = lib.mustTerm(k, f.clave + '.terminos');
    if (!out.includes(t.id)) out.push(t.id);
  }
  return out;
}

/* ------------------------------------------------------------ una función */
function paginaFuncion(f, i) {
  const url = `/funciones/${f.slug}/`;
  const prev = i > 0 ? features[i - 1] : null;
  const next = i < total - 1 ? features[i + 1] : null;
  const g = grupoDe.get(f.clave);

  const puntos = f.puntos.map((p, k) => `            <li class="pgf-point">
              <span class="pgf-point__n" aria-hidden="true">${dosDigitos(k + 1)}</span>
              <div>
                <p class="pgf-point__t">${render(p.t, f.clave)}</p>
                <p class="pgf-point__d">${render(p.d, f.clave)}</p>
              </div>
            </li>`).join('\n');

  const terminos = idsDe(f).map((id) => lib.term(id));
  const filas = terminos.map((t) => `            <div class="gl-row">
              ${fila(t, true)}
            </div>`).join('\n');

  const pagerLink = (feat, tipo) => `          <a class="pgf-pager__link pgf-pager__link--${tipo}" href="funciones/${feat.slug}/" rel="${tipo}">
            <span class="pgf-pager__k">${tipo === 'prev' ? 'Anterior' : 'Siguiente'}</span>
            <span class="pgf-pager__row">${icon(feat.clave, 28)}<span class="pgf-pager__t">${esc(feat.nombre)}</span></span>
            <span class="pgf-pager__d">${esc(plain(feat.frase))}</span>
          </a>`;
  const pager = [prev ? pagerLink(prev, 'prev') : '', next ? pagerLink(next, 'next') : ''].filter(Boolean).join('\n');

  return `${head({
    title: f.title,
    description: f.metaDescription,
    ogTitle: `${f.nombre} — ${plain(f.frase)}`,
    ogDescription: f.metaDescription,
  })}
<body class="page">
  <a class="skip-link" href="${url}#contenido">Saltar al contenido</a>
  <div class="grain" aria-hidden="true"></div>

${header()}

${banda(migas(f.nombre), render(f.titulo, f.clave), render(f.frase, f.clave))}

  <!-- ============ CONTENT SHEET ============ -->
  <main id="contenido" class="page__main">

    <section class="sheet sheet--intro pgf-sec" id="pantalla" aria-labelledby="pt-title">
      <div class="container pgf-screen">
        <div class="pgf-screen__copy">
          <p class="tag reveal" data-reveal="up">Función ${dosDigitos(f.orden)} de ${dosDigitos(total)} · ${esc(g.nombre)}</p>
          <div class="pgf-screen__head reveal" data-reveal="up" style="--i:1">
            <span class="pgf-ic">${icon(f.clave, 40)}</span>
            <h2 id="pt-title" class="pgf-screen__title">${render(f.encuadre, f.clave)}</h2>
          </div>
          <p class="pgf-screen__lead reveal" data-reveal="up" style="--i:2">${render(f.resumen, f.clave)}</p>
          <ol class="pgf-points reveal" data-reveal="up" style="--i:3">
${puntos}
          </ol>
          <p class="pgf-screen__cta reveal" data-reveal="up" style="--i:4">
            <a class="btn btn--secondary" href="${escAttr(f.enlace)}"><span>${esc(f.enlaceEtiqueta)}</span>${flecha('btn__icon')}</a>
          </p>
        </div>${captura(f)}
      </div>
    </section>

    <section class="sheet sheet--process pgf-sec" id="terminos" aria-labelledby="tm-title">
      <div class="container">
        <div class="pgf-terms__head">
          <div>
            <p class="tag reveal" data-reveal="up">Términos de esta pantalla</p>
            <h2 id="tm-title" class="sheet__title reveal" data-reveal="up" style="--i:1">KPIs y siglas, <span class="fade">definidos.</span></h2>
          </div>
          <a class="btn btn--secondary reveal" data-reveal="up" style="--i:2" href="glosario/"><span>Ver el glosario completo</span>${flecha('btn__icon')}</a>
        </div>
        <dl class="gl-list reveal" data-reveal="up" style="--i:2">
${filas}
        </dl>
      </div>
    </section>

    <section class="sheet pgf-sec" id="mas-funciones" aria-labelledby="pag-title">
      <div class="container">
        <div class="sec__head">
          <p class="tag reveal" data-reveal="up">Sigue por aquí</p>
          <h2 id="pag-title" class="sheet__title reveal" data-reveal="up" style="--i:1">El resto <span class="fade">del producto.</span></h2>
        </div>
        <nav class="pgf-pager reveal" data-reveal="up" style="--i:2" aria-label="Funciones anterior y siguiente">
${pager}
        </nav>
        <p class="pgf-pager__all reveal" data-reveal="up" style="--i:3">
          <a class="btn btn--secondary" href="funciones/"><span>Ver las ${esc(String(total))} funciones</span>${flecha('btn__icon')}</a>
          <a class="btn btn--secondary" href="glosario/"><span>Glosario de KPIs</span>${flecha('btn__icon')}</a>
        </p>
      </div>
    </section>

${cta()}  </main>

${pie()}`;
}

/* ------------------------------------------------------------- el índice */
function paginaIndice() {
  const grupos = SRC.grupos.map((g) => {
    const filas = g.claves.map((c) => {
      const f = byClave.get(c);
      return `            <li class="pgf-item reveal" data-reveal="up">
              <a href="funciones/${f.slug}/">
                <span class="pgf-item__ic"><span class="pgf-ic">${icon(f.clave, 40)}</span></span>
                <span class="pgf-item__c">
                  <span class="pgf-item__t">${esc(f.nombre)}</span>
                  <span class="pgf-item__d">${esc(plain(f.frase))}</span>
                </span>
                <span class="pgf-item__s">Pantalla · ${esc(f.pantalla)}</span>
                ${flecha('pgf-go')}
              </a>
            </li>`;
    }).join('\n');
    return `        <div class="pgf-group">
          <h3 class="pgf-group__t reveal" data-reveal="up">${esc(g.nombre)}</h3>
          <ol class="pgf-list">
${filas}
          </ol>
        </div>`;
  }).join('\n');

  return `${head({
    title: INDICE.title,
    description: INDICE.metaDescription,
    ogTitle: 'Funciones de Holdera — una pantalla, una página',
    ogDescription: INDICE.metaDescription,
  })}
<body class="page">
  <a class="skip-link" href="${INDICE.path}#contenido">Saltar al contenido</a>
  <div class="grain" aria-hidden="true"></div>

${header()}

${banda(migas(null), INDICE.h1, esc(INDICE.lead))}

  <!-- ============ CONTENT SHEET ============ -->
  <main id="contenido" class="page__main">

    <section class="sheet sheet--intro pgf-sec" id="todas" aria-labelledby="todas-title">
      <div class="container">
        <div class="sec__head">
          <p class="tag reveal" data-reveal="up">El producto, por partes</p>
          <h2 id="todas-title" class="sheet__title reveal" data-reveal="up" style="--i:1">Una función <span class="fade">por página.</span></h2>
          <p class="sheet__lead reveal" data-reveal="up" style="--i:2">Cada una con su captura del panel demo y sus KPIs definidos.</p>
        </div>
        <div class="pgf-groups">
${grupos}
        </div>
        <div class="pgf-gl-cta reveal" data-reveal="up">
          <p><strong>Glosario de KPIs y términos</strong>${render('Las 57 fórmulas y todas las siglas: [[ADR]], [[RevPAR]], [[OTB]], [[STLY]], [[OOO]]…', 'indice')}</p>
          <a class="btn btn--secondary" href="glosario/"><span>Abrir el glosario</span>${flecha('btn__icon')}</a>
        </div>
      </div>
    </section>

${cta()}  </main>

${pie()}`;
}

/* ------------------------------------------------------------ el glosario */
function paginaGlosario() {
  const grupos = lib.DATA.grupos;
  const porGrupo = (id) => lib.DATA.terminos.filter((t) => t.grupo === id);
  const nTerm = lib.DATA.terminos.filter((t) => t.tipo !== 'kpi').length;
  const nKpi = lib.DATA.terminos.filter((t) => t.tipo === 'kpi').length;

  const chips = (tipo) => grupos.filter((g) => g.tipo === tipo)
    .map((g) => `<li><a href="glosario/#g-${g.id}">${esc(g.nombre)}</a></li>`).join('');

  const bloque = (g) => {
    const lista = porGrupo(g.id);
    const filas = lista.map((t) => `            <div class="gl-row" id="t-${escAttr(t.id)}" data-gl-row>
              ${fila(t, true)}
            </div>`).join('\n');
    return `        <section class="gl-group" id="g-${g.id}" data-gl-group aria-labelledby="g-${g.id}-t">
          <h3 class="gl-group__t" id="g-${g.id}-t">${esc(g.nombre)} <span class="gl-group__n">${lista.length}</span></h3>
          <dl class="gl-list">
${filas}
          </dl>
        </section>`;
  };

  const parte = (tipo) => grupos.filter((g) => g.tipo === tipo).map(bloque).join('\n');

  return `${head({
    title: GLOSARIO.title,
    description: GLOSARIO.metaDescription,
    ogTitle: 'Glosario de KPIs hoteleros — Holdera',
    ogDescription: GLOSARIO.metaDescription,
  })}
<body class="page">
  <a class="skip-link" href="${GLOSARIO.path}#contenido">Saltar al contenido</a>
  <div class="grain" aria-hidden="true"></div>

${header()}

${banda(migas(null, 'glosario'), '<span class="ln">Glosario de KPIs</span> <span class="ln">y términos hoteleros.</span>', esc(`${nKpi} KPIs y ${nTerm} términos del día a día, cada uno con su definición y, si es un KPI, su fórmula.`))}

  <!-- ============ CONTENT SHEET ============ -->
  <main id="contenido" class="page__main">

    <section class="sheet sheet--intro pgf-sec" id="catalogo" aria-labelledby="gl-title">
      <div class="container">
        <div class="gl-top">
          <div>
            <p class="tag reveal" data-reveal="up">Catálogo de definiciones</p>
            <h2 id="gl-title" class="sheet__title reveal" data-reveal="up" style="--i:1">Cada término, <span class="fade">con su fórmula.</span></h2>
          </div>
          <div class="gl-tools" role="search">
            <label class="gl-search" for="gl-q">
              <span class="gl-search__k">Buscar un término</span>
              <input id="gl-q" type="search" placeholder="ADR, pickup, OOO…" autocomplete="off" spellcheck="false" data-gl-filter>
            </label>
            <p class="gl-count" data-gl-count aria-live="polite">${nKpi + nTerm} términos</p>
          </div>
        </div>

        <nav class="gl-index" aria-label="Secciones del glosario">
          <div class="gl-index__row"><p class="gl-index__k">Términos</p><ul>${chips('termino')}</ul></div>
          <div class="gl-index__row"><p class="gl-index__k">KPIs</p><ul>${chips('kpi')}</ul></div>
        </nav>

        <p class="gl-empty" data-gl-empty hidden>Ningún término coincide con la búsqueda.</p>

        <div class="gl-part-wrap" id="terminos-del-dia">
          <h2 class="gl-part">Términos del día a día</h2>
          <p class="gl-part__lead">Estados de habitación, reservas, canales y sistemas: las siglas que salen en el panel y en esta web.</p>
${parte('termino')}
        </div>

        <div class="gl-part-wrap" id="kpis">
          <h2 class="gl-part">${nKpi} KPIs hoteleros</h2>
          <p class="gl-part__lead">El catálogo del producto, agrupado como una guía de KPIs: definición, fórmula y unidad. Cada uno se abre en el panel demo.</p>
${parte('kpi')}
        </div>
      </div>
    </section>

${cta()}  </main>

${pie()}`;
}

/* ------------------------------------------------------------- los menús
   El desplegable de Funciones (cabecera) y su lista en el drawer se generan
   desde features.json: nombre, frase SIN ventanas (un término dentro de un
   enlace sería una parada de más) e icono de 24 px, en las tres columnas del
   diseño de iconos. Se reescribe solo ese bloque de cada archivo del shell;
   después replicate-shell.js lo lleva a todas las páginas. */
function menus() {
  const cols = SRC.grupos.map((g) => {
    const idCat = 'mnu-fn-' + g.claves[0];
    const items = g.claves.map((c) => {
      const f = byClave.get(c);
      return `                      <li><a class="mnu__item mnu__item--ic" href="/funciones/${f.slug}/">
                        ${icon(f.clave, 24)}
                        <span class="mnu__txt"><span class="mnu__name">${esc(f.nombre)}</span>
                        <span class="mnu__desc">${esc(plain(f.frase))}</span></span>
                      </a></li>`;
    }).join('\n');
    return `                  <div class="mnu__col">
                    <p class="mnu__cat" id="${idCat}">${esc(g.nombre)}</p>
                    <ul class="mnu__list" aria-labelledby="${idCat}">
${items}
                    </ul>
                  </div>`;
  }).join('\n');

  const panel = `<div class="mnu__panel mnu__panel--fn" id="mnu-funciones" data-menu-panel hidden>
              <div class="mnu__inner">
                <div class="mnu__cols mnu__cols--fn">
${cols}
                </div>
              </div>
              <div class="mnu__foot">
                <a class="mnu__all" href="/glosario/">Glosario de KPIs y términos${flechaMenu}</a>
                <a class="mnu__all" href="/funciones/">Ver todas las funciones${flechaMenu}</a>
              </div>
            </div>`;

  const hFile = path.join(SHELL, 'header.html');
  let h = fs.readFileSync(hFile, 'utf8');
  const a = h.indexOf('<div class="mnu__panel mnu__panel--fn"');
  const b = h.indexOf('<a class="mnu__trigger" href="/integraciones.html"');
  if (a < 0 || b < 0 || b < a) throw new Error('header.html: no encuentro el panel de Funciones');
  const tail = h.slice(a, b);
  const end = tail.lastIndexOf('</div>') + '</div>'.length;
  h = h.slice(0, a) + panel + h.slice(a + end);
  fs.writeFileSync(hFile, h);

  const list = features.map((f) => `            <a class="msub__item msub__item--ic" href="/funciones/${f.slug}/">
              ${icon(f.clave, 24)}
              <span class="msub__txt"><span class="msub__name">${esc(f.nombre)}</span>
              <span class="msub__desc">${esc(plain(f.frase))}</span></span>
            </a>`).join('\n');
  const msub = `<div class="msub__list" id="msub-funciones" hidden>
${list}
            <a class="msub__all" href="/funciones/">Ver todas las funciones${flechaMenu}</a>
            <a class="msub__all" href="/glosario/">Glosario de KPIs${flechaMenu}</a>
          </div>`;
  const dFile = path.join(SHELL, 'drawer.html');
  let d = fs.readFileSync(dFile, 'utf8');
  const s = d.indexOf('<div class="msub__list" id="msub-funciones" hidden>');
  if (s < 0) throw new Error('drawer.html: no encuentro la lista de Funciones');
  const e = d.indexOf('</div>', s) + '</div>'.length;
  d = d.slice(0, s) + msub + d.slice(e);
  fs.writeFileSync(dFile, d);

  const fFile = path.join(SHELL, 'footer.html');
  let ft = fs.readFileSync(fFile, 'utf8');
  if (ft.indexOf('href="/glosario/"') < 0) {
    const anchor = '<a href="/funciones/">Funciones</a>';
    if (ft.indexOf(anchor) < 0) throw new Error('footer.html: no encuentro el enlace a Funciones');
    ft = ft.split(anchor).join(anchor + '\n        <a href="/glosario/">Glosario</a>');
    fs.writeFileSync(fFile, ft);
  }
}

/* ----------------------------------------- datos de la ventana (terminos.js) */
function datosVentana() {
  const file = path.join(ROOT, 'terminos.js');
  const src = fs.readFileSync(file, 'utf8');
  const A = '/* terms:data-start */';
  const B = '/* terms:data-end */';
  const a = src.indexOf(A);
  const b = src.indexOf(B);
  if (a < 0 || b < a) throw new Error('terminos.js: faltan las marcas terms:data');
  const json = JSON.stringify(lib.runtimeData()).split('\u2028').join('\\u2028').split('\u2029').join('\\u2029');
  const out = src.slice(0, a + A.length) + '\n  var T = ' + json + ';\n  ' + src.slice(b);
  fs.writeFileSync(file, out);
}

/* ------------------------------------------------------- meta.json (SEO) */
function entradaMeta(o) {
  const crumbs = [{ '@type': 'ListItem', position: 1, name: 'Inicio', item: '{{SITE}}/' }];
  if (o.slug) {
    crumbs.push({ '@type': 'ListItem', position: 2, name: 'Funciones', item: '{{SITE}}/funciones/' });
    crumbs.push({ '@type': 'ListItem', position: 3, name: o.nombre, item: '{{SITE}}' + o.path });
  } else {
    crumbs.push({ '@type': 'ListItem', position: 2, name: o.nombre, item: '{{SITE}}' + o.path });
  }
  const graph = [
    {
      '@type': 'WebPage',
      '@id': '{{SITE}}' + o.path + '#webpage',
      url: '{{SITE}}' + o.path,
      name: o.title,
      description: o.description,
      isPartOf: { '@id': '{{SITE}}/#website' },
      about: { '@id': '{{SITE}}/#organization' },
      primaryImageOfPage: { '@type': 'ImageObject', url: '{{SITE}}/assets/seo/og-default.png', width: 1200, height: 630 },
      breadcrumb: { '@id': '{{SITE}}' + o.path + '#breadcrumb' },
      inLanguage: 'es-ES',
    },
    { '@type': 'BreadcrumbList', '@id': '{{SITE}}' + o.path + '#breadcrumb', itemListElement: crumbs },
  ];
  if (o.extraGraph) graph.push(...o.extraGraph);
  return {
    file: o.file,
    path: o.path,
    title: o.title,
    description: o.description,
    robots: 'index, follow',
    sitemap: { priority: o.priority },
    og: { type: 'website', title: o.ogTitle, description: o.ogDescription, image: '{{SITE}}/assets/seo/og-default.png', imageAlt: IMG_ALT },
    graph,
  };
}

/* El glosario es un DefinedTermSet de schema.org: cada término, su nombre y
   su definición. Es lo que es, y es como lo entiende un buscador. */
function grafoGlosario() {
  const set = '{{SITE}}/glosario/#glosario';
  return [{
    '@type': 'DefinedTermSet',
    '@id': set,
    name: 'Glosario de KPIs y términos hoteleros',
    inLanguage: 'es-ES',
    hasDefinedTerm: lib.DATA.terminos.map((t) => ({
      '@type': 'DefinedTerm',
      '@id': '{{SITE}}/glosario/#t-' + t.id,
      name: t.en && t.en.toLowerCase() !== t.t.toLowerCase() ? `${t.t} (${t.en})` : t.t,
      termCode: t.t,
      description: t.f ? `${t.def} Fórmula: ${t.f}.` : t.def,
      inDefinedTermSet: { '@id': set },
    })),
  }];
}

function meta() {
  const pages = [];
  pages.push(entradaMeta({
    file: 'funciones/index.html', path: '/funciones/', nombre: 'Funciones',
    title: INDICE.title, description: INDICE.metaDescription,
    ogTitle: 'Funciones de Holdera — una pantalla, una página', ogDescription: INDICE.metaDescription,
    priority: '0.8',
  }));
  for (const f of features) {
    pages.push(entradaMeta({
      file: `funciones/${f.slug}/index.html`, path: `/funciones/${f.slug}/`, slug: f.slug, nombre: f.nombre,
      title: f.title, description: f.metaDescription,
      ogTitle: `${f.nombre} — ${plain(f.frase)}`, ogDescription: f.metaDescription,
      priority: '0.7',
    }));
  }
  pages.push(entradaMeta({
    file: 'glosario/index.html', path: '/glosario/', nombre: 'Glosario',
    title: GLOSARIO.title, description: GLOSARIO.metaDescription,
    ogTitle: 'Glosario de KPIs hoteleros — Holdera', ogDescription: GLOSARIO.metaDescription,
    priority: '0.7', extraGraph: grafoGlosario(),
  }));

  const fragment = {
    _notes: [
      'Fragmento generado por _build/contenido/build-funciones.js. NO se edita a mano: se edita features.json / glosario.json o el generador y se vuelve a ejecutar.',
      'El generador lo funde él mismo en meta.pages de _build/seo/meta.json (sustituye las entradas funciones/* y glosario/* en su sitio). Después: node _build/seo-inject.js && node _build/seo/build-sitemap.js',
    ],
    pages,
  };
  fs.writeFileSync(path.join(__dirname, 'meta-funciones.json'), JSON.stringify(fragment, null, 2) + '\n', 'utf8');

  // Fundido en meta.json: fuera las entradas viejas, dentro las nuevas, en el
  // hueco de la primera que había (o delante de integraciones.html).
  const m = JSON.parse(fs.readFileSync(META_JSON, 'utf8'));
  const mine = (p) => p.file.startsWith('funciones/') || p.file.startsWith('glosario/');
  let at = m.pages.findIndex(mine);
  if (at < 0) at = m.pages.findIndex((p) => p.file === 'integraciones.html');
  if (at < 0) at = m.pages.length;
  const before = m.pages.slice(0, at).filter((p) => !mine(p));
  const after = m.pages.slice(at).filter((p) => !mine(p));
  m.pages = before.concat(pages, after);
  fs.writeFileSync(META_JSON, JSON.stringify(m, null, 2) + '\n', 'utf8');
  return pages.length;
}

/* ------------------------------------------------------------------------ */
function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(GL_DIR, { recursive: true });

  const copia = path.join(OUT_DIR, 'funciones.css');
  if (CSS_FUNDIDO) { if (fs.existsSync(copia)) fs.unlinkSync(copia); }
  else fs.writeFileSync(copia, fs.readFileSync(CSS_SRC, 'utf8'), 'utf8');

  // Primero el shell: las páginas de aquí lo copian al generarse.
  menus();
  datosVentana();

  const escritos = [];
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), paginaIndice(), 'utf8');
  escritos.push('funciones/index.html');
  features.forEach((f, i) => {
    const dir = path.join(OUT_DIR, f.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), paginaFuncion(f, i), 'utf8');
    escritos.push(`funciones/${f.slug}/index.html`);
  });
  fs.writeFileSync(path.join(GL_DIR, 'index.html'), paginaGlosario(), 'utf8');
  escritos.push('glosario/index.html');

  const n = meta();

  console.log(escritos.length + ' paginas escritas:');
  escritos.forEach((p) => console.log('  ' + p));
  console.log('  terminos.js                  (bloque terms:data, ' + Object.keys(lib.runtimeData()).length + ' términos)');
  console.log('  _build/shell/header.html + drawer.html + footer.html   (menús de Funciones)');
  console.log('  _build/contenido/meta-funciones.json + _build/seo/meta.json   (' + n + ' entradas)');
  console.log(CSS_FUNDIDO ? '  (pagina-funcion.css ya está dentro de pages.css)' : '  funciones/funciones.css   (copia de _build/parts/pagina-funcion.css)');
  console.log('\nAhora: node _build/replicate-shell.js && node _build/gates.js --fix');
}

main();
