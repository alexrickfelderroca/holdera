/*
 * _build/contenido/build-funciones.js
 * Genera las NUEVE paginas de /funciones/ : el indice y las ocho funciones.
 *
 *   node _build/contenido/build-funciones.js
 *
 * Que escribe (y reescribe entero en cada ejecucion — es idempotente):
 *   funciones/index.html
 *   funciones/<slug>/index.html          x8, slugs de features.json
 *   funciones/funciones.css              copia de _build/parts/pagina-funcion.css
 *   _build/contenido/meta-funciones.json fragmento para _build/seo/meta.json
 *
 * De donde sale el contenido:
 *   - _build/contenido/features.json es LA fuente del titulo, la frase, el
 *     parrafo, la pantalla, el enlace al panel, las preguntas y el SEO. No se
 *     reescribe aqui.
 *   - AMPLIACION (abajo) es lo que esta pagina anade al parrafo: dos parrafos
 *     mas, el limite declarado y una cita LITERAL del panel. Cada cita lleva
 *     escrito de que pantalla sale y se ha copiado del HTML servido en
 *     http://localhost:4177/panel/... , no de memoria.
 *
 * Tres trampas de este proyecto que estan resueltas aqui:
 *
 *   1. <base href="/">. La cabecera, el drawer y el pie estan COPIADOS desde
 *      _build/shell/*.html y usan rutas RELATIVAS (href="index.html",
 *      href="panel/"). Desde /funciones/<slug>/ esas rutas resolverian a
 *      /funciones/<slug>/index.html. El patron del sitio para eso es el de
 *      404.html: <base href="/"> en el <head> y los href del shell INTACTOS
 *      (check-shell.js compara caracter a caracter contra _build/shell/).
 *
 *   2. Con <base href="/"> un href="#contenido" a secas apunta a LA RAIZ
 *      (/#contenido), no a esta pagina. El enlace de salto va absoluto:
 *      href="/funciones/<slug>/#contenido". Mismo motivo que en 404.html.
 *
 *   3. styles.css estiliza el elemento `main` a pelo como la hoja deslizante
 *      del inicio (margin-top:-100dvh, radio, sombra). pages.css lo corrige
 *      (.page main{margin-top:calc(-1*var(--pg-lid))}), asi que el <body>
 *      lleva class="page" y la pagina carga pages.css SIEMPRE.
 *
 * El CSS, y como desaparece solo: el .htaccess deniega /_build/, asi que la
 * parte no se puede servir desde ahi. Mientras no este fundida en pages.css,
 * este script la copia a funciones/funciones.css y las nueve paginas la cargan
 * detras de pages.css. En cuanto alguien pegue la parte dentro de pages.css
 * —que es lo que el orquestador hizo con la de integraciones, y lo preferible
 * porque pages.css SI lo escanea check-tokens.js—, la siguiente ejecucion
 * detecta el token --pgf-row-hover alli, quita el <link> de las nueve paginas
 * y borra la copia. No hay que tocar nada aqui.
 *
 * Re-ejecutalo despues de CUALQUIER cambio en _build/shell/: replicate-shell.js
 * todavia lleva la lista de siete paginas escrita a mano y no toca estas nueve.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const SHELL = path.join(ROOT, '_build', 'shell');
const OUT_DIR = path.join(ROOT, 'funciones');
const CSS_SRC = path.join(ROOT, '_build', 'parts', 'pagina-funcion.css');

/* ¿Esta la parte ya fundida dentro de pages.css?
 *
 * El orquestador funde las partes de _build/parts/ dentro de pages.css — es lo
 * que hizo con la de integraciones (--pgi-*). Mientras no lo haya hecho con
 * esta, las paginas necesitan servirla aparte, porque el .htaccess deniega
 * /_build/. En cuanto este dentro, el <link> sobra y la copia tambien.
 *
 * Se detecta por un token propio en vez de por un comentario: los comentarios
 * se pierden al minificar o al reordenar, un token no. Volver a ejecutar el
 * generador despues de fundir la parte quita el enlace solo. */
const PAGES_CSS = path.join(ROOT, 'pages.css');
const CSS_FUNDIDO =
  fs.existsSync(PAGES_CSS) && fs.readFileSync(PAGES_CSS, 'utf8').indexOf('--pgf-row-hover') >= 0;

const FEATURES = JSON.parse(fs.readFileSync(path.join(__dirname, 'features.json'), 'utf8'));
const header = fs.readFileSync(path.join(SHELL, 'header.html'), 'utf8').replace(/\s+$/, '');
const drawer = fs.readFileSync(path.join(SHELL, 'drawer.html'), 'utf8').replace(/\s+$/, '');
const footer = fs.readFileSync(path.join(SHELL, 'footer.html'), 'utf8').replace(/\s+$/, '');

/* Nunca String.replace con '$$' en el reemplazo: '$$' es un escape y se
   convierte en '$'. Trampa documentada de este proyecto. split/join siempre. */
const esc = (s) => String(s).split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;');
const escAttr = (s) => esc(s).split('"').join('&quot;');
const dosDigitos = (n) => String(n).padStart(2, '0');

/* --------------------------------------------------------------------------
   El nombre SIMPLE de cada funcion: el que va en el menu desplegable, en las
   migas de pan y en el indice. Sale del campo `pantalla` de features.json,
   con dos excepciones: "Metricas" y "Metricas · Ocupacion" son la misma
   palabra para dos paginas distintas, y un desplegable con dos entradas
   iguales no se puede usar.
   -------------------------------------------------------------------------- */
const NOMBRE_CORTO = {
  hoy: 'Hoy',
  habitaciones: 'Habitaciones',
  housekeeping: 'Housekeeping',
  revenue: 'Revenue',
  reservas: 'Reservas',
  trazabilidad: 'Trazabilidad',
  definiciones: 'Definiciones',
  catalogo: 'Catálogo de métricas',
};

/* metaDescription de 159 caracteres: el maximo del sitio son 155
   (_build/seo/validate-meta.js, DESC_MAX). Se recorta AQUI y no en
   features.json para no tocar la fuente de otro agente; la frase es la misma
   sin el segundo "habitaciones". */
const META_DESC_OVERRIDE = {
  hoy: 'Llegadas, salidas, habitaciones en casa y listas a la hora en que las miras. Holdera lee la foto intradía de tu PMS y dice de cuándo es cada dato.',
};

/* --------------------------------------------------------------------------
   AMPLIACION — lo que esta pagina anade al parrafo de features.json.

   Regla: nada que el producto no haga. Todo lo de aqui esta leido del panel
   capturado que se sirve en /panel/ (hotel de demostracion congelado el
   jueves 15 de enero de 2026 a las 14:30) o del CLAUDE.md del proyecto.
   `cita` es texto LITERAL del panel — esta en ingles porque el producto esta
   en ingles, y la pagina lo dice al presentarlo.
   -------------------------------------------------------------------------- */
const AMPLIACION = {
  hoy: {
    cuerpo: [
      'El día no es una sola cifra. La pantalla parte las llegadas en las que ya han entrado y las que faltan, las salidas en las que ya se han ido y las que quedan, y pone al lado las habitaciones que están listas para recibir. Así la pregunta de recepción —¿me llega con lo que tengo limpio?— se contesta mirando, no sumando.',
      'Debajo, el hotel entero por plantas, con lo que ocurre en cada una. Y la hora, siempre: lo que ves es un instante concreto del export de tu PMS, no «ahora mismo», y eso también sale escrito en pantalla.',
    ],
    limiteTitulo: 'Una proyección no se enseña como un hecho',
    limite: 'La ocupación de esta noche todavía no ha ocurrido: sale marcada como no cerrada y con su definición todavía sin validar, no redondeada a un número limpio. Entre un export y el siguiente Holdera no rellena el hueco — enseña la hora de la foto y espera.',
    cita: { texto: 'Not final · Definition pending', donde: 'Hoy · ocupación de esta noche' },
  },
  habitaciones: {
    cuerpo: [
      'Cada planta trae su reparto en una línea —ocupadas, vacantes, fuera de orden—, así que la que va retrasada se ve antes de abrir nada. Al entrar en una, las habitaciones aparecen colocadas como están en el edificio, con su número y su estado.',
      'Y lo que no es habitación —cocina, spa, recepción, restaurante— está en el modelo, pero vacío de dato mientras la fuente no lo cubra. Aparece diciéndolo, en vez de con un cero que parecería un dato.',
    ],
    limiteTitulo: 'El plano es configuración; los totales son el dato',
    limite: 'Los recuentos por estado vienen de la foto del PMS. Qué habitación concreta tiene cada estado es, en la demo, una distribución ilustrativa del edificio de ejemplo, y el panel lo escribe en pantalla en vez de dejarte creer que estás viendo la 203 de verdad.',
    cita: { texto: "The totals are the snapshot's; which room holds each state is an illustrative distribution, not data.", donde: 'Hoy · el hotel ahora' },
  },
  housekeeping: {
    cuerpo: [
      'Los estados se cuentan por separado y se cruzan con las llegadas: si las Vacant Clean cubren las que todavía faltan por entrar, lo dice; si no, también. Y el reparto baja a planta, que es como se organiza un turno.',
      'La leyenda va en la misma pantalla y no en un manual —VC vacante limpia, IP en limpieza, VD vacante sucia—, y las fuera de orden y fuera de servicio se cuentan aparte porque no son trabajo de pisos.',
    ],
    limiteTitulo: 'Lo que la fuente no cubre sale vacío',
    limite: 'Holdera lee el estado, no lo inventa: una habitación sin estado sale como sin estado, nunca como limpia. Y las zonas comunes que el export no incluye aparecen en el modelo con el hueco escrito al lado.',
    cita: { texto: 'No zone operations from this source', donde: 'Housekeeping · zonas comunes' },
  },
  revenue: {
    cuerpo: [
      'Tres periodos en la misma fila —esta noche, el mes en curso y las treinta noches que vienen—, cada uno con su comparación al mismo punto de la curva del año pasado. Debajo, el TRevPAR con su reparto por departamentos, el gráfico de las sesenta y una noches y las tablas de mezcla por tipo de habitación y por canal.',
      'Cualquiera de esas cifras se abre en su detalle: qué mide, la fórmula con el valor que tomó cada entrada, y de dónde sale. La fórmula se lee del catálogo de métricas, así que hay una sola definición por métrica en todo el producto.',
    ],
    limiteTitulo: 'Lo que no viene del PMS va etiquetado',
    limite: 'El ingreso de habitación sale del libro de reservas. Restauración, spa y el resto de servicios están modelados a partir de supuestos declarados, y cada supuesto se imprime en el detalle de la cifra. Mientras tu POS no esté conectado, eso es lo que hay, y así se dice.',
    cita: { texto: 'Food and beverage, spa and other services are modelled from declared assumptions — every one of them is printed in the detail behind this figure.', donde: 'Revenue · TRevPAR' },
  },
  reservas: {
    cuerpo: [
      'El calendario va de diciembre a julio y cada noche trae su ocupación, su tarifa y las habitaciones que tiene vendidas. Al elegir una noche se abre su desglose por tipo de habitación, por canal y por departamento.',
      'Encima, dos lecturas del ritmo: lo que ha entrado en los últimos siete días, y la ocupación noche a noche contra la misma noche del año pasado —364 días atrás, para que coincida el día de la semana.',
    ],
    limiteTitulo: 'La línea de este año termina hoy',
    limite: 'Las noches posteriores a hoy enseñan lo que hay vendido ahora, no cómo va a acabar la noche. Holdera no pronostica: la única referencia de lo que viene es cómo terminó el año pasado, que ya es un hecho cerrado.',
    cita: { texto: 'Nights after today show what is on the books right now, not what the night will finish at.', donde: 'Reservas · pace' },
  },
  trazabilidad: {
    cuerpo: [
      'Los cuatro pasos son literales. La fórmula: «Occupied Rooms / (Physical Rooms − OOO Rooms)». Las entradas, con el valor que tomó cada una y el registro del que sale. El registro ya normalizado. Y la fila en bruto tal como entró, con su identificador de origen, su número de versión y su huella de contenido.',
      'Esa huella es lo que hace que el último paso no sea una promesa: si el dato de origen cambia, la huella cambia, y la cifra que colgaba de él deja de cuadrar sola.',
    ],
    limiteTitulo: 'Hoy la cadena llega entera en la ocupación',
    limite: 'Las métricas de ocupación son las que Holdera guarda con su linaje completo, y son las que puedes abrir hasta la fila en bruto. El resto del panel enseña su fórmula y el valor de cada entrada; el último escalón se completa según se conecta cada fuente. Preferimos decírtelo a que lo descubras tú.',
    cita: { texto: 'Traceable to the source record', donde: 'Traza · un día cerrado' },
  },
  definiciones: {
    cuerpo: [
      'En el panel las dos conviven: ocupación sobre las habitaciones físicas y ocupación sobre las que están en operación. Cada una con su fórmula escrita, su unidad, su versión de catálogo y su estado de definición.',
      'La diferencia no es cosmética: es exactamente tus habitaciones fuera de orden, y crece con ellas. Es la cifra que acaba en el informe que enseñas a tu propiedad, así que la eliges tú y queda escrito cuál elegiste.',
    ],
    limiteTitulo: 'Hasta que la valides, sale sin validar',
    limite: 'Las definiciones están mapeadas desde una guía de KPIs hotelera y salen marcadas como referencia, a la espera de que tu hotel valide su semántica. Holdera no decide por ti cuál es «tu» ocupación: enseña las dos y espera.',
    cita: { texto: 'Definition status: REFERENCE ONLY', donde: 'Métricas · Occupancy Rate' },
  },
  catalogo: {
    cuerpo: [
      'Cada métrica trae su fórmula, su unidad, su prioridad y su estado: si el hotel puede calcularla hoy, qué le falta, o si depende de una fuente externa. El filtro deja pedir justo eso —enséñame las que no puedo calcular— y la lista contesta con nombres, no con un aviso genérico.',
      'Sirve para planificar la conexión al revés de como suele hacerse: primero qué quieres poder medir, y después qué fuente hay que traer para poder medirlo.',
    ],
    limiteTitulo: 'Un hueco se enseña como hueco',
    limite: 'Ninguna casilla vacía se rellena con una estimación ni con un cero. Donde falta el dato aparece la fuente que falta —contabilidad, POS, una fuente de mercado— y la métrica se queda sin valor hasta que esa fuente exista.',
    cita: { texto: 'Missing inputs · External source required · Future capability', donde: 'Métricas · estados del catálogo' },
  },
};

/* La nota del pie de hoja: de que hotel son las cifras que se acaban de leer.
   Misma redaccion en las nueve paginas a proposito. */
const NOTA_DEMO = 'Las pantallas que enlazamos son el panel de demostración: un hotel de ejemplo de 100 habitaciones, congelado el jueves 15 de enero de 2026 a las 14:30. Las cifras son de ese hotel, no de ninguno real.';

const IMG_ALT = 'Holdera — software de operaciones para hoteles. Todo tu hotel en una pantalla, y cada cifra con su origen. holdera.es, Barcelona.';

const INDICE = {
  slug: null,
  path: '/funciones/',
  nombre: 'Funciones',
  title: 'Funciones del software hotelero | Holdera',
  metaDescription: 'Las ocho pantallas de Holdera, una por página: qué hace cada una, qué preguntas contesta y dónde está su límite declarado.',
  h1: '<span class="ln">Ocho pantallas.</span> <span class="ln">Y lo que contesta cada una.</span>',
  lead: 'El producto entero, una función por página: qué hace, qué preguntas responde y dónde está su límite. Todas se pueden abrir por dentro en el panel de demostración.',
};

/* -------------------------------------------------------------------------- */
const features = FEATURES.features.slice().sort((a, b) => a.orden - b.orden);
const total = features.length;

const flecha = (clase) =>
  `<span class="${clase}" aria-hidden="true"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg></span>`;

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

function migas(actual) {
  const filas = [
    '<a href="index.html">Inicio</a>',
    actual === null
      ? '<span aria-current="page">Funciones</span>'
      : '<a href="funciones/">Funciones</a>',
  ];
  if (actual !== null) filas.push(`<span aria-current="page">${esc(actual)}</span>`);
  return `<nav class="pgf-crumbs" aria-label="Migas de pan" data-enter style="--d:60">
          ${filas.join('\n          ')}
        </nav>`;
}

function cta(url) {
  return `    <section class="sheet sheet--cta" id="hablamos" aria-labelledby="cta-title">
      <div class="container ctaband">
        <div>
          <p class="tag reveal" data-reveal="up">Siguiente paso</p>
          <h2 id="cta-title" class="sheet__title reveal" data-reveal="up" style="--i:1">Ábrelo por dentro <span class="fade">y después hablamos.</span></h2>
          <p class="sheet__lead reveal" data-reveal="up" style="--i:2">El panel de demostración está abierto: no hay formulario delante. Si después quieres hablarlo, cuéntanos cómo es tu hotel —qué PMS usas, cuántas habitaciones tienes y qué informe estás rehaciendo a mano cada semana.</p>
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

function pie(url) {
  return `${footer}

${drawer}

  <script src="script.js" defer></script>
</body>
</html>
`;
}

/* --------------------------------------------------------------------------
   Una pagina de funcion
   -------------------------------------------------------------------------- */
function paginaFuncion(f, i) {
  const corto = NOMBRE_CORTO[f.clave];
  const amp = AMPLIACION[f.clave];
  const url = `/funciones/${f.slug}/`;
  const prev = i > 0 ? features[i - 1] : null;
  const next = i < total - 1 ? features[i + 1] : null;

  const preguntas = f.contesta.map((q, k) => `            <li class="pgf-q reveal" data-reveal="up">
              <span class="pgf-q__n" aria-hidden="true">${dosDigitos(k + 1)}</span>
              <p class="pgf-q__t">${esc(q)}</p>
            </li>`).join('\n');

  const cuerpo = [f.parrafo].concat(amp.cuerpo)
    .map((p) => `            <p>${esc(p)}</p>`).join('\n');

  const pagerLink = (feat, tipo) => {
    const c = NOMBRE_CORTO[feat.clave];
    const etiqueta = tipo === 'prev' ? 'Anterior' : 'Siguiente';
    return `          <a class="pgf-pager__link pgf-pager__link--${tipo}" href="funciones/${feat.slug}/" rel="${tipo}">
            <span class="pgf-pager__k">${esc(etiqueta)}</span>
            <span class="pgf-pager__t">${esc(c)}</span>
            <span class="pgf-pager__d">${esc(feat.frase)}</span>
          </a>`;
  };
  const pager = [prev ? pagerLink(prev, 'prev') : '', next ? pagerLink(next, 'next') : '']
    .filter(Boolean).join('\n');

  return `${head({
    title: f.title,
    description: META_DESC_OVERRIDE[f.clave] || f.metaDescription,
    ogTitle: `${corto} — ${f.frase}`,
    ogDescription: f.metaDescription,
  })}
<body class="page">
  <a class="skip-link" href="${url}#contenido">Saltar al contenido</a>
  <div class="grain" aria-hidden="true"></div>

${header}

  <!-- ============ PAGE BAND (light) ============ -->
  <div class="phead">
    <div class="phead__deco" aria-hidden="true"><div class="phead__wordmark">HOLDERA</div></div>
    <div class="container phead__inner">
      <div class="phead__copy">
        ${migas(corto)}
        <h1 class="phead__title" id="page-title" data-enter style="--d:140">${esc(f.titulo)}</h1>
      </div>
      <p class="phead__lead" data-enter style="--d:260">${esc(f.frase)}</p>
    </div>
    <div class="hero-sentinel" aria-hidden="true"></div>
  </div>

  <!-- ============ CONTENT SHEET (dark) ============ -->
  <main id="contenido" class="page__main">

    <section class="sheet sheet--intro" id="que-hace" aria-labelledby="qh-title">
      <div class="container pgf-lede">
        <div>
          <p class="tag reveal" data-reveal="up">Función ${dosDigitos(f.orden)} de ${dosDigitos(total)}</p>
          <h2 id="qh-title" class="sheet__title reveal" data-reveal="up" style="--i:1">Qué hace</h2>
          <aside class="pgf-deep reveal" data-reveal="up" style="--i:2" aria-labelledby="deep-title">
            <div class="pgf-deep__core">
              <p class="pgf-deep__k">Pantalla del producto</p>
              <p class="pgf-deep__name" id="deep-title">${esc(f.pantalla)}</p>
              <p class="pgf-deep__note">Ábrela en el panel de demostración y compruébalo tú: está abierto, sin registro.</p>
              <a class="btn btn--secondary" href="${escAttr(f.enlace)}"><span>${esc(f.enlaceEtiqueta)}</span>${flecha('btn__icon')}</a>
              <p class="pgf-deep__url">${esc(f.enlace)}</p>
            </div>
          </aside>
        </div>
        <div class="prose reveal" data-reveal="up" style="--i:3">
${cuerpo}
        </div>
      </div>
    </section>

    <section class="sheet sheet--process" id="que-contesta" aria-labelledby="qc-title">
      <div class="container">
        <div class="sec__head">
          <p class="tag reveal" data-reveal="up">Qué contesta</p>
          <h2 id="qc-title" class="sheet__title reveal" data-reveal="up" style="--i:1">Las preguntas <span class="fade">que se hacen a esta hora.</span></h2>
        </div>
        <ol class="pgf-qa">
${preguntas}
        </ol>
      </div>
    </section>

    <section class="sheet" id="limite" aria-labelledby="lim-title">
      <div class="container pgf-limit">
        <div>
          <p class="tag reveal" data-reveal="up">Lo que no hace</p>
          <h2 id="lim-title" class="sheet__title reveal" data-reveal="up" style="--i:1">${esc(amp.limiteTitulo)}</h2>
        </div>
        <div class="pgf-limit__body reveal" data-reveal="up" style="--i:2">
          <p>${esc(amp.limite)}</p>
          <figure class="pgf-cite">
            <blockquote>${esc(amp.cita.texto)}</blockquote>
            <figcaption>Literal del panel, en inglés · ${esc(amp.cita.donde)}</figcaption>
          </figure>
        </div>
      </div>
    </section>

    <section class="sheet sheet--process" id="mas-funciones" aria-labelledby="pag-title">
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
        </p>
      </div>
    </section>

${cta(url)}  </main>

${pie(url)}`;
}

/* --------------------------------------------------------------------------
   El indice
   -------------------------------------------------------------------------- */
function paginaIndice() {
  const filas = features.map((f) => {
    const corto = NOMBRE_CORTO[f.clave];
    return `          <li class="pgf-item reveal" data-reveal="up">
            <a href="funciones/${f.slug}/">
              <span class="pgf-item__n" aria-hidden="true">${dosDigitos(f.orden)}</span>
              <span class="pgf-item__c">
                <span class="pgf-item__t">${esc(corto)}</span>
                <span class="pgf-item__d">${esc(f.frase)}</span>
              </span>
              <span class="pgf-item__s">Pantalla · ${esc(f.pantalla)}</span>
              ${flecha('pgf-go')}
            </a>
          </li>`;
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

${header}

  <!-- ============ PAGE BAND (light) ============ -->
  <div class="phead">
    <div class="phead__deco" aria-hidden="true"><div class="phead__wordmark">HOLDERA</div></div>
    <div class="container phead__inner">
      <div class="phead__copy">
        ${migas(null)}
        <h1 class="phead__title" id="page-title" data-enter style="--d:140">${INDICE.h1}</h1>
      </div>
      <p class="phead__lead" data-enter style="--d:260">${esc(INDICE.lead)}</p>
    </div>
    <div class="hero-sentinel" aria-hidden="true"></div>
  </div>

  <!-- ============ CONTENT SHEET (dark) ============ -->
  <main id="contenido" class="page__main">

    <section class="sheet sheet--intro" id="todas" aria-labelledby="todas-title">
      <div class="container">
        <div class="sec__head">
          <p class="tag reveal" data-reveal="up">El producto, por partes</p>
          <h2 id="todas-title" class="sheet__title reveal" data-reveal="up" style="--i:1">Una función <span class="fade">por página.</span></h2>
          <p class="sheet__lead reveal" data-reveal="up" style="--i:2">Ninguna promete nada que no puedas abrir en el panel. Cada una acaba diciendo dónde está su límite, que es la parte que no suele estar escrita.</p>
        </div>
        <ol class="pgf-list">
${filas}
        </ol>
      </div>
    </section>

${cta(INDICE.path)}  </main>

${pie(INDICE.path)}`;
}

/* --------------------------------------------------------------------------
   meta.json — el fragmento que funde el orquestador
   -------------------------------------------------------------------------- */
function entradaMeta(o) {
  const crumbs = [
    { '@type': 'ListItem', position: 1, name: 'Inicio', item: '{{SITE}}/' },
  ];
  if (o.slug) {
    crumbs.push({ '@type': 'ListItem', position: 2, name: 'Funciones', item: '{{SITE}}/funciones/' });
    crumbs.push({ '@type': 'ListItem', position: 3, name: o.nombre, item: '{{SITE}}' + o.path });
  } else {
    crumbs.push({ '@type': 'ListItem', position: 2, name: 'Funciones', item: '{{SITE}}/funciones/' });
  }
  return {
    file: o.file,
    path: o.path,
    title: o.title,
    description: o.description,
    robots: 'index, follow',
    sitemap: { priority: o.priority },
    og: {
      type: 'website',
      title: o.ogTitle,
      description: o.ogDescription,
      image: '{{SITE}}/assets/seo/og-default.png',
      imageAlt: IMG_ALT,
    },
    graph: [
      {
        '@type': 'WebPage',
        '@id': '{{SITE}}' + o.path + '#webpage',
        url: '{{SITE}}' + o.path,
        name: o.title,
        description: o.description,
        isPartOf: { '@id': '{{SITE}}/#website' },
        about: { '@id': '{{SITE}}/#organization' },
        primaryImageOfPage: {
          '@type': 'ImageObject',
          url: '{{SITE}}/assets/seo/og-default.png',
          width: 1200,
          height: 630,
        },
        breadcrumb: { '@id': '{{SITE}}' + o.path + '#breadcrumb' },
        inLanguage: 'es-ES',
      },
      {
        '@type': 'BreadcrumbList',
        '@id': '{{SITE}}' + o.path + '#breadcrumb',
        itemListElement: crumbs,
      },
    ],
  };
}

/* -------------------------------------------------------------------------- */
function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  // El CSS servible. Si la parte ya esta dentro de pages.css, la copia sobra
  // y se borra: dos copias de las mismas reglas es la manera de que una se
  // quede vieja sin que nadie lo note.
  const copia = path.join(OUT_DIR, 'funciones.css');
  if (CSS_FUNDIDO) { if (fs.existsSync(copia)) fs.unlinkSync(copia); }
  else fs.writeFileSync(copia, fs.readFileSync(CSS_SRC, 'utf8'), 'utf8');

  const escritos = [];
  fs.writeFileSync(path.join(OUT_DIR, 'index.html'), paginaIndice(), 'utf8');
  escritos.push('funciones/index.html');

  features.forEach((f, i) => {
    const dir = path.join(OUT_DIR, f.slug);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), paginaFuncion(f, i), 'utf8');
    escritos.push(`funciones/${f.slug}/index.html`);
  });

  const meta = {
    _notes: [
      'Fragmento generado por _build/contenido/build-funciones.js. NO se edita a mano: se edita features.json o el generador y se vuelve a ejecutar.',
      'El orquestador funde estas nueve entradas dentro de meta.pages de _build/seo/meta.json (al final, despues de 404.html) y despues pasa: node _build/seo/validate-meta.js && node _build/seo-inject.js && node _build/seo/build-sitemap.js',
      'Comprobado contra las reglas de validate-meta.js: titulo <=60 y acabado en "| Holdera", descripcion entre 70 y 155, titulos y descripciones unicos entre si y contra las siete paginas que ya hay, un solo nodo WebPage, una sola BreadcrumbList, ningun nodo Service, ninguna propiedad prohibida.',
      'La descripcion de operacion-diaria-hotel se recorta de 159 a 146 caracteres respecto a features.json (el maximo del sitio son 155). Ver META_DESC_OVERRIDE en el generador.',
    ],
    pages: [],
  };

  meta.pages.push(entradaMeta({
    file: 'funciones/index.html',
    path: '/funciones/',
    slug: null,
    nombre: 'Funciones',
    title: INDICE.title,
    description: INDICE.metaDescription,
    ogTitle: 'Funciones de Holdera — una pantalla, una página',
    ogDescription: INDICE.metaDescription,
    priority: '0.8',
  }));

  features.forEach((f) => {
    const corto = NOMBRE_CORTO[f.clave];
    meta.pages.push(entradaMeta({
      file: `funciones/${f.slug}/index.html`,
      path: `/funciones/${f.slug}/`,
      slug: f.slug,
      nombre: corto,
      title: f.title,
      description: META_DESC_OVERRIDE[f.clave] || f.metaDescription,
      ogTitle: `${corto} — ${f.frase}`,
      ogDescription: f.metaDescription,
      priority: '0.7',
    }));
  });

  fs.writeFileSync(
    path.join(__dirname, 'meta-funciones.json'),
    JSON.stringify(meta, null, 2) + '\n',
    'utf8'
  );

  console.log(escritos.length + ' paginas escritas:');
  escritos.forEach((p) => console.log('  ' + p));
  console.log(CSS_FUNDIDO
    ? '  (pagina-funcion.css ya esta dentro de pages.css: sin <link> aparte y sin copia)'
    : '  funciones/funciones.css   (copia de _build/parts/pagina-funcion.css)');
  console.log('  _build/contenido/meta-funciones.json   (' + meta.pages.length + ' entradas)');
}

main();
