/**
 * snapshot-panel.js — congela el producto Holdera Hotel Operations (Next.js)
 * en HTML estatico servible desde holdera.es, que NO tiene runtime de Node.
 *
 * Por que funciona: el producto es determinista y esta congelado en un instante
 * fijo (jueves 15 enero 2026, 14:30 Europe/Madrid). Su HTML es siempre el mismo,
 * asi que se captura una vez y se sirve como archivo. No se inventa nada: lo que
 * se guarda es exactamente lo que el producto emite.
 *
 * Uso:
 *   1. arranca el producto (preferible en produccion, assets minificados):
 *        cd <producto> && npx next build && HOLDERA_RUNTIME=demo npx next start
 *      (o `npm run demo` para dev; los bundles pesan ~10x mas)
 *   2. node _build/snapshot-panel.js --out panel --mount /panel/
 *
 * Opciones:
 *   --out <dir>     carpeta de salida, relativa a la raiz del sitio (def. panel)
 *   --mount <ruta>  donde se monta en el sitio; reescribe /_next/ (def. /panel/)
 *   --seeds a,b,c   rutas de arranque extra (las variantes con ?query)
 *   --max <n>       tope de paginas, red de seguridad (def. 2000)
 *   --no-crawl      solo las semillas, sin seguir enlaces
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const ORIGIN = process.env.HOLDERA_PRODUCT_ORIGIN || 'http://localhost:3000';
const ROOT = path.resolve(__dirname, '..');

function arg(name, fallback) {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('--')) {
    return process.argv[idx + 1];
  }
  return fallback;
}
const flag = name => process.argv.includes(`--${name}`);

const OUT_DIR = path.join(ROOT, arg('out', 'panel'));
const MOUNT = (arg('mount', '/panel/') + '/').replace(/\/+$/, '/');
const MAX = Number(arg('max', '2000'));

/**
 * Prefijo bajo el que el SERVIDOR de origen publica el producto.
 *
 * Tiene que coincidir con el `basePath` con el que se compilo. Sin basePath el
 * cliente de Next deriva su ruta de `location.pathname` —`/panel/`—, no la
 * reconoce y NO HIDRATA: los enlaces siguen yendo porque son <a> reales, pero
 * nada con estado responde, y el boton «Trace» —la pieza que demuestra la
 * trazabilidad— se queda muerto. Comprobado: en la raiz hidrata, bajo /panel/
 * sin basePath no.
 *
 *   HOLDERA_BASE_PATH=/panel npx next build
 *   HOLDERA_BASE_PATH=/panel HOLDERA_RUNTIME=demo npx next start
 *   node _build/snapshot-panel.js --src-base /panel --mount /panel/
 */
const SRC_BASE = (arg('src-base', '') || '').replace(/\/+$/, '');

/** Quita el prefijo del servidor de origen de una ruta absoluta. */
function stripSrcBase(p) {
  if (!SRC_BASE) return p;
  if (p === SRC_BASE) return '/';
  if (p.startsWith(SRC_BASE + '/')) return p.slice(SRC_BASE.length);
  return p;
}

/**
 * Con `trailingSlash` el producto emite `/rooms/`, pero por dentro tambien
 * aparece `/rooms`. Son la MISMA pagina y acaban en el mismo archivo, asi que
 * se canonizan SIN barra final (salvo la raiz) antes de encolarlas: si no, se
 * capturan y reescriben dos veces. Medido: 377 paginas y 92 MB en vez de 259
 * y 54 MB, para exactamente el mismo contenido.
 */
function canonicalRoute(route) {
  const [p, query] = route.split('?');
  const clean = p.length > 1 ? p.replace(/\/+$/, '') || '/' : '/';
  return query ? `${clean}?${query}` : clean;
}

/**
 * Git Bash en Windows convierte un argumento que empieza por '/' en ruta de
 * disco ('C:/Program Files/Git/...'). Se normaliza para que funcione igual
 * desde bash, PowerShell o cmd.
 */
function normalizeRoute(raw) {
  let r = String(raw).trim();
  if (!r) return null;
  const msys = r.match(/^[A-Za-z]:[\\/](?:Program Files[\\/])?Git[\\/](.*)$/);
  if (msys) r = msys[1];
  r = r.replace(/\\/g, '/');
  if (!r.startsWith('/')) r = '/' + r;
  return r.replace(/\/{2,}/g, '/');
}

/**
 * Con basePath, Next normaliza la barra final con un 308 (/panel/ -> /panel).
 * Hay que seguir la redireccion o todo el crawl se queda en cuerpos vacios.
 */
function get(url, depth = 0, reqHeaders = undefined) {
  return new Promise((resolve, reject) => {
    // http.get(url, options, cb): la forma soportada para mandar cabeceras.
    // Pegarlas a un objeto URL no vale, Node solo copia los campos que conoce.
    http.get(url, { headers: reqHeaders || {} }, res => {
      const { statusCode: status, headers } = res;
      if ([301, 302, 307, 308].includes(status) && headers.location && depth < 5) {
        res.resume();
        const next = new URL(headers.location, url).href;
        return resolve(get(next, depth + 1, reqHeaders));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({
        status,
        type: headers['content-type'] || '',
        body: Buffer.concat(chunks),
      }));
    }).on('error', reject);
  });
}

function writeFile(rel, buf) {
  const full = path.join(OUT_DIR, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, buf);
}

/**
 * Ruta -> archivo en disco. Una ruta con query necesita nombre propio, porque
 * un servidor estatico no ve la query: /overview?period=30d se guarda como
 * overview/period-30d/index.html y el enlace se reescribe a esa carpeta.
 */
function routeToFile(route) {
  const [pathPart, query] = route.split('?');
  let clean = pathPart.replace(/^\/+|\/+$/g, '');
  if (query) {
    const slug = query
      .split('&').sort().join('-')
      .replace(/[^a-zA-Z0-9=-]/g, '-')
      .replace(/=/g, '-')
      .replace(/-+/g, '-')
      .toLowerCase();
    clean = clean ? `${clean}/${slug}` : slug;
  }
  return clean === '' ? 'index.html' : `${clean}/index.html`;
}

/**
 * Slug de una query -> nombre de archivo. La MISMA funcion esta duplicada, a
 * proposito, dentro del shim de fetch que se inyecta en el navegador: las dos
 * orillas tienen que producir exactamente el mismo nombre o el shim pedira un
 * archivo que no existe. Si tocas una, toca la otra.
 *   date=2026-01-15&time=09:00  ->  date-2026-01-15-time-09-00
 */
function slugFromParams(params) {
  return [...params.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([k, v]) => `${k}-${v}`)
    .join('-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-');
}

/** La URL publica de una ruta capturada, ya montada bajo MOUNT. */
function routeToHref(route) {
  const file = routeToFile(route);
  return MOUNT + file.replace(/index\.html$/, '');
}

/**
 * La MISMA ruta, pero SIN montar: lo que espera el router.
 *
 * Un <Link href> guarda la ruta logica y el router le pone el basePath al
 * navegar. Si en el flight data se escribe la ruta ya montada, el router la
 * monta OTRA VEZ y sale /panel/panel/date-2026-01-14/. El atributo href del
 * DOM, en cambio, tiene que ir montado: lo usa el navegador tal cual.
 * Dos destinos para la misma ruta, y por eso hay dos funciones.
 */
function routeToLogicalHref(route) {
  const file = routeToFile(route);
  return '/' + file.replace(/index\.html$/, '');
}

/**
 * El conmutador de fecha/hora del producto (Wed 14 / Thu 15 / Fri 16 x
 * Morning / Midday / Evening) es UN parametro en el servidor, pero en archivos
 * estaticos es UN ARCHIVO POR COMBINACION. Seguir esos enlaces a ciegas explota:
 * 60 fechas x 3 horas x 100 habitaciones son decenas de miles de copias casi
 * identicas, y cada pagina pesa ~300 KB porque lleva el edificio SVG en linea.
 * Medido: un crawl ingenuo encontro 8.060 URLs y 649 MB en solo 2.000 paginas.
 *
 * Por eso una ruta CON query solo se sigue si queryAllowed() la aprueba. El
 * resto de paginas se capturan en su momento por defecto, que es el instante
 * congelado de la demo.
 *
 * SWITCHER_DATES son las tres fechas que el conmutador del Today ofrece de
 * verdad; el producto enlaza a las 60 del historico, pero capturar 60 x 3 horas
 * x cada pantalla es justo la explosion que hay que evitar.
 */
const SWITCHER_DATES = new Set(['2026-01-14', '2026-01-15', '2026-01-16']);

function queryAllowed(base, query) {
  const params = new URLSearchParams(query);
  const date = params.get('date');

  switch (base) {
    case '/':
      // Solo las 9 combinaciones que el conmutador ofrece de verdad.
      return !date || SWITCHER_DATES.has(date);
    case '/rooms':
      // La lente de housekeeping si; las 60 fechas no.
      return !date;
    case '/overview':
      return true;              // ?period=30d|60d, son dos
    case '/operations/occupancy':
      return true;              // un dia cerrado por fecha: es el historico real
    default:
      return false;
  }
}

/** Enlaces internos que aparecen en el HTML. */
function extractLinks(html) {
  const out = new Set();
  for (const m of html.matchAll(/href="(\/[^"#]*)"/g)) {
    const href = m[1];
    if (href.startsWith('/_next/') || href.startsWith('/api/')) continue;
    if (/\.(css|js|png|jpe?g|webp|svg|ico|woff2?|txt|xml|json)$/i.test(href)) continue;

    const [rawPath, query] = href.split('?');
    // El HTML ya viene con el prefijo del servidor (/panel/...): se quita para
    // guardar la ruta LOGICA, que es como se indexa todo aqui dentro.
    const logicalPath = stripSrcBase(rawPath);
    const base = logicalPath.replace(/\/$/, '') || '/';
    if (query && !queryAllowed(base, query)) {
      out.add(canonicalRoute(logicalPath));   // la misma pagina, en su momento por defecto
      continue;
    }
    out.add(canonicalRoute(query ? `${logicalPath}?${query}` : logicalPath));
  }
  return [...out];
}

/**
 * El producto tiene su propia carcasa y NINGUN enlace de vuelta al sitio: quien
 * entra en /panel/ se queda dentro. Se inyecta una pastilla fija, con los mismos
 * tokens del sistema visual v3 del producto para que no parezca un injerto, que
 * devuelve a holdera.es y repite en castellano que los datos son de demostracion
 * (el producto ya lo dice en ingles en su propia chapa "Demo data").
 *
 * Va en position:fixed y fuera del flujo: no toca el layout de ninguna pantalla.
 */
/**
 * La pastilla se viste con los TOKENS del panel, no con literales.
 *
 * Antes llevaba los colores del sistema v3 escritos a mano (#25211b sobre
 * #7a766d): en el panel v5, que es claro y ademas tiene modo oscuro, eso era
 * un injerto oscuro en una pagina clara — exactamente el "app dentro de la
 * app" contra el que avisa la HIG. Leyendo var(--bg-group), var(--label) y
 * compania, la pastilla cambia de piel con el resto y no hay un segundo sitio
 * donde mantener la paleta. Cada var lleva su valor de reserva por si el
 * bloque de tokens no ha cargado todavia.
 *
 * WCAG 1.4.11: el control se identifica por su contorno, asi que el borde usa
 * --label-4, el escalon medido a 3:1 sobre las dos superficies (3,12:1 en
 * claro, 3,00:1 en oscuro). El fondo es opaco, no un fill translucido: un
 * fill sobre el lienzo compone a 1,1:1 y no dibujaria frontera ninguna.
 *
 * En escritorio se coloca en el hueco vacio de la barra lateral; por debajo de
 * 900px la barra se convierte en una tira horizontal y la pastilla se va abajo
 * a la derecha, con hueco al final del body para no cubrir el ultimo contenido.
 */
const BACKLINK_STYLE = `
<style data-holdera-chrome>
  .holdera-site-back {
    position: fixed; z-index: 9999;
    left: 12px; bottom: 96px; width: 212px;
    display: flex; align-items: center; gap: 10px;
    padding: 9px 14px; min-height: 44px; box-sizing: border-box;
    border: 1px solid var(--label-4, rgba(60,60,67,.56));
    border-radius: 14px;
    background: var(--bg-group, #ffffff);
    color: var(--label, #000000);
    font-family: var(--font-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
    font-size: 13px; font-weight: 600; line-height: 1.38; letter-spacing: -0.006em;
    text-decoration: none;
    box-shadow: 0 1px 3px rgba(0,0,0,.06), 0 1px 1px rgba(0,0,0,.04);
    transition: background 180ms cubic-bezier(.25,.1,.25,1);
  }
  .holdera-site-back > span:first-child {
    flex: 0 0 auto; font-size: 15px; line-height: 1;
    color: var(--accent-label, #a15e00);
  }
  .holdera-site-back b { font-weight: 600; }
  .holdera-site-back em {
    font-style: normal; display: block;
    font-size: 11px; font-weight: 400;
    color: var(--label-3, rgba(60,60,67,.72));
  }
  .holdera-site-back:hover { background: var(--bg-elevated, #ffffff); }
  .holdera-site-back:focus-visible {
    outline: 2px solid var(--accent-label, #a15e00); outline-offset: 2px;
  }

  @media (max-width: 900px) {
    body { padding-bottom: 76px; }
    .holdera-site-back {
      left: auto; right: 12px; bottom: 12px; width: auto;
      border-radius: 999px;
      box-shadow: 0 2px 6px rgba(0,0,0,.06), 0 12px 32px -8px rgba(0,0,0,.24);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .holdera-site-back { transition: none; }
  }
</style>`;

/**
 * El enlace de vuelta se crea DESDE JAVASCRIPT, despues de hidratar.
 *
 * En el App Router de Next, React hidrata el documento entero: cualquier nodo
 * que se meta en el HTML dentro de su arbol —probado con la barra lateral— lo
 * reconcilia y lo BORRA. En el HTML estaba y en pantalla no aparecia.
 *
 * Por eso se inyecta despues, y se vuelve a poner si desaparece: una navegacion
 * del router puede rehacer el arbol. El observador se limita a `body` y no mira
 * el subarbol, asi que no cuesta nada.
 */
const BACKLINK = `<script data-holdera-chrome>
(function () {
  var HTML = '<span aria-hidden="true">\\u2190</span>' +
             '<span><b>Volver a holdera.es</b>' +
             '<em>Datos de demostraci\\u00f3n</em></span>';
  function mount() {
    if (document.querySelector('.holdera-site-back')) return;
    var a = document.createElement('a');
    a.className = 'holdera-site-back';
    a.href = '/';
    a.setAttribute('data-holdera-chrome', '');
    a.innerHTML = HTML;
    document.body.appendChild(a);
  }
  function start() {
    mount();
    try {
      new MutationObserver(mount).observe(document.body, { childList: true });
    } catch (e) { setInterval(mount, 2000); }
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(start, 0);
  } else {
    document.addEventListener('DOMContentLoaded', start);
  }
})();
</script>`;

/**
 * El producto pide dos APIs desde el navegador:
 *   /api/today?date=&time=                 (RoomsStage, al cambiar de momento)
 *   /api/explain/<metricId>?businessDate=  (LineageDrawer, o sea Evidence)
 * En un sitio estatico no hay servidor que las responda. Este shim redirige
 * cada llamada al JSON precalculado. Va ANTES que los scripts de Next, porque
 * React puede pedirlas en cuanto hidrata.
 *
 * slug() es la copia en navegador de slugFromParams(): si cambia una, cambia
 * la otra o el shim pedira archivos que no existen.
 */
/**
 * Los enlaces que el snapshot MOVIO de sitio, y por que el router no puede
 * seguirlos.
 *
 * El conmutador de fecha y hora es UN parametro en el servidor y UNA CARPETA
 * por combinacion en estatico: /?date=2026-01-14 vive en
 * /panel/date-2026-01-14/. Esa carpeta no es una ruta que la aplicacion
 * conozca, asi que si el router navega a ella recibe un payload cuyo arbol es
 * el de "/" y no encaja: la URL cambia y la pagina se queda como estaba —
 * el 15 de enero bajo una URL que dice 14.
 *
 * Asi que ese clic se le quita al router: el atributo href del DOM ya apunta
 * al archivo correcto, y una navegacion normal del navegador lo sirve. Se
 * pierde la transicion suave en ESOS enlaces (son un conmutador, no un
 * recorrido por el hotel) y se gana que el dia que se ve sea el que dice la
 * URL. Todo lo demas —habitaciones, plantas, zonas, secciones— sigue siendo
 * navegacion blanda, que es donde esta la camara.
 *
 * En captura (`true`) para llegar antes que el manejador de React.
 */
function movedLinks(routes) {
  const moved = [...routes].filter(r => r.includes('?')).map(routeToHref);
  if (!moved.length) return '';
  return `<script data-holdera-chrome>
(function () {
  var MOVED = ${JSON.stringify(moved)};
  var set = {};
  for (var i = 0; i < MOVED.length; i++) set[MOVED[i]] = 1;
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var href = a.getAttribute('href');
    if (!set[href]) return;
    e.preventDefault();
    e.stopPropagation();
    location.assign(href);
  }, true);
})();
</script>`;
}

function fetchShim() {
  return `<script data-holdera-chrome>
(function () {
  var BASE = ${JSON.stringify(MOUNT)};
  var orig = window.fetch;
  function slug(params) {
    var out = [];
    params.forEach(function (v, k) { out.push(k + '-' + v); });
    return out.sort().join('-').toLowerCase()
      .replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
  }
  function toStatic(raw) {
    var u;
    try { u = new URL(raw, location.origin); } catch (e) { return null; }
    if (u.pathname.indexOf('/api/') !== 0) return null;
    var rest = u.pathname.slice(5).replace(/\\/$/, '');
    var s = slug(u.searchParams);
    return BASE + 'api/' + rest + (s ? '/' + s : '') + '.json';
  }
  window.fetch = function (input, init) {
    var raw = typeof input === 'string' ? input
            : (input && input.url) ? input.url : '';
    var target = toStatic(raw);
    if (target) return orig.call(this, target, init);
    return orig.apply(this, arguments);
  };
})();
</script>`;
}

/**
 * Reescribe el HTML capturado para que funcione como archivo estatico bajo
 * MOUNT: los assets de Next y todos los enlaces internos dejan de ser rutas
 * absolutas del servidor y pasan a apuntar dentro del snapshot.
 */
/**
 * SEO del panel. La ENTRADA (/panel/) se indexa: es la demo del producto y es
 * la que se enseña. Las otras 258 no: son la misma demo vista desde dentro
 * —"Room 407 · Holdera Demo Hotel"— en ingles, de un hotel que no existe. 258
 * paginas asi diluyen un sitio que hoy va 100 en SEO, y leidas sueltas desde un
 * buscador no se entienden. `follow` deja que el rastreador siga los enlaces.
 *
 * (La entrada se indexa a proposito: ponerle noindex a una pagina de marketing
 * baja Lighthouse a SEO 66.)
 */
function robotsFor(route) {
  const isEntry = route === '/' || route === '';
  return isEntry
    ? ''
    : '\n<meta name="robots" content="noindex,follow" data-holdera-chrome>';
}

/**
 * Un href logico -> su sitio dentro del snapshot. Devuelve null si no hay que
 * tocarlo (los assets de Next ya vienen con el prefijo correcto).
 *
 * Una sola pasada sobre TODOS los href absolutos, no una sustitucion por ruta
 * conocida: si no, un enlace con query que no se capturo —/intelligence/studio
 * ?metric=adr, uno por cada una de las 57 metricas— no coincide con ninguna
 * ruta, se queda absoluto y en el sitio publicado se va a un 404 de holdera.es.
 * Cuando la combinacion exacta no existe, se cae a la pagina base.
 */
function resolveHref(href, captured, { mounted = true } = {}) {
  if (href.startsWith(`${SRC_BASE}/_next/`) || href.startsWith('/_next/')) return null;

  const to = mounted ? routeToHref : routeToLogicalHref;
  const base = mounted ? MOUNT : '/';

  const [withQuery, hash] = href.split('#');
  const suffix = hash ? '#' + hash : '';
  const logical = stripSrcBase(withQuery);

  const canon = canonicalRoute(logical);
  if (captured.has(canon)) return `${to(canon)}${suffix}`;

  const bare = canonicalRoute(logical.split('?')[0]);
  if (captured.has(bare)) return `${to(bare)}${suffix}`;

  // Rutas sin barra final que si existen con ella, y viceversa.
  const alt = bare.endsWith('/') ? bare.slice(0, -1) : bare + '/';
  if (captured.has(alt)) return `${to(alt)}${suffix}`;

  if (bare === '/icon.svg') {
    const q = withQuery.includes('?') ? '?' + withQuery.split('?')[1] : '';
    return `${MOUNT}icon.svg${q}`;
  }

  // Nada coincide: al menos que no se salga del panel.
  return base;
}

/**
 * El payload RSC, con los mismos enlaces reescritos que el HTML.
 *
 * En el flight payload los href van como JSON plano ("href":"/rooms/501") y
 * SIN basePath ni barra final: el router se los pone al navegar. Los unicos
 * que hay que tocar son los que el snapshot movio de sitio — los que llevan
 * query, que en estatico viven en una carpeta con nombre propio
 * (/?date=2026-01-14 -> /panel/date-2026-01-14/). Sin esta pasada, el
 * conmutador de fecha y hora navegaria a una URL con query y el servidor
 * estatico devolveria el dia por defecto: datos de otro dia bajo una URL que
 * dice otra cosa, que es justo lo que este producto no hace.
 */
function rewriteRsc(text, discovered) {
  const captured = new Set(discovered);
  return text.replace(/"href":"(\/[^"]*)"/g, (whole, href) => {
    // Un enlace con query se deja EXACTAMENTE como esta: su carpeta no es una
    // ruta que el router conozca, asi que de ese clic se encarga el
    // interceptor (movedLinks) con una navegacion normal del navegador.
    if (href.includes('?')) return whole;
    // El resto, sin montar: quien lee esto es el router y el basePath lo pone el.
    const target = resolveHref(href, captured, { mounted: false });
    return target === null ? whole : `"href":"${target}"`;
  });
}

function rewrite(html, discovered, robots = '') {
  // Assets de Next: /_next/... -> <MOUNT>_next/...
  html = html.split('"/_next/').join(`"${MOUNT}_next/`);
  html = html.split('(/_next/').join(`(${MOUNT}_next/`);

  // Enlaces internos -> su carpeta dentro del snapshot.
  //
  // Una sola pasada sobre TODOS los href absolutos, no una sustitucion por ruta
  // conocida: si no, un enlace con query que no se capturo —/intelligence/studio
  // ?metric=adr, uno por cada una de las 57 metricas— no coincide con ninguna
  // ruta, se queda absoluto y en el sitio publicado se va a un 404 de holdera.es.
  // Cuando la combinacion exacta no existe, se cae a la pagina base.
  const captured = new Set(discovered);
  html = html.replace(/href="(\/[^"]*)"/g, (whole, href) => {
    const target = resolveHref(href, captured);
    return target === null ? whole : `href="${target}"`;
  });

  /*
   * Y LOS MISMOS ENLACES DENTRO DEL FLIGHT DATA EN LINEA.
   *
   * El HTML lleva los enlaces DOS veces: el atributo href que se ve, y el
   * payload RSC que va incrustado en un <script> para hidratar. Al pulsar un
   * <Link>, quien navega es el router con el href de sus PROPS —o sea el del
   * payload—, no con el atributo del DOM. Reescribir solo el atributo dejaba
   * el conmutador de fecha y hora empujando a "/?date=2026-01-14", una URL con
   * query que en estatico no existe: el servidor devolvia la pagina por
   * defecto y se veia el 15 de enero bajo una URL que decia 14. Datos de un
   * dia bajo la URL de otro es exactamente lo que este producto no hace.
   *
   * Dentro del <script> las comillas van escapadas, de ahi el \\" del patron.
   */
  html = html.replace(/\\"href\\":\\"(\/[^"\\]*)\\"/g, (whole, href) => {
    // Igual que en el payload: los enlaces con query se quedan como estan y
    // los recoge el interceptor. El resto, sin montar, porque el router le
    // pone el basePath — escribir aqui la ruta montada daba /panel/panel/...
    if (href.includes('?')) return whole;
    const target = resolveHref(href, captured, { mounted: false });
    return target === null ? whole : `\\"href\\":\\"${target}\\"`;
  });

  // Enlace de vuelta al sitio. Va DENTRO de la barra lateral del producto,
  // justo encima del bloque "DATA SOURCE": asi esta en el flujo y no puede
  // tapar ningun control. Una pastilla flotante si llegaba a cubrir el boton
  // "Trace the snapshot totals" de la ficha de habitacion.
  const close = html.lastIndexOf('</body>');
  if (close !== -1) {
    html = html.slice(0, close) + BACKLINK + html.slice(close);
  }

  const headClose = html.indexOf('</head>');
  if (headClose !== -1) {
    // `captured`, no `discovered`: discovered es un ITERADOR y arriba ya se
    // consumio al construir el Set. Pasarlo otra vez daba una lista vacia.
    html = html.slice(0, headClose) + BACKLINK_STYLE + robots + fetchShim() + movedLinks(captured) + html.slice(headClose);
  }

  return html;
}

async function main() {
  const seeds = arg('seeds', '/').split(',').map(normalizeRoute).filter(Boolean).map(canonicalRoute);

  console.log(`origen  : ${ORIGIN}`);
  console.log(`salida  : ${OUT_DIR}`);
  console.log(`montaje : ${MOUNT}`);
  console.log(`semillas: ${seeds.length}${flag('no-crawl') ? ' (sin crawl)' : ''}`);
  console.log('');

  const queue = [...seeds];
  const seen = new Set(seeds);
  const pages = new Map();   // ruta -> html crudo
  const assets = new Set();
  const failed = [];

  while (queue.length && pages.size < MAX) {
    const route = queue.shift();
    let res;
    try {
      res = await get(ORIGIN + SRC_BASE + route);
    } catch (e) {
      failed.push({ route, error: e.message });
      continue;
    }
    if (res.status !== 200 || !res.type.includes('text/html')) {
      failed.push({ route, status: res.status, type: res.type });
      continue;
    }

    const html = res.body.toString('utf8');
    pages.set(route, html);
    // Con basePath los assets vienen como /panel/_next/...; sin el, como
    // /_next/.... Se indexan siempre por su ruta LOGICA (sin prefijo).
    for (const m of html.matchAll(/(?:href|src)="([^"]*\/_next\/[^"]+)"/g)) {
      assets.add(stripSrcBase(m[1]));
    }

    if (!flag('no-crawl')) {
      for (const link of extractLinks(html)) {
        if (!seen.has(link)) { seen.add(link); queue.push(link); }
      }
    }

    if (pages.size % 25 === 0) {
      console.log(`  ${pages.size} paginas · ${queue.length} en cola`);
    }
  }

  if (pages.size >= MAX) console.log(`  AVISO: tope de ${MAX} paginas alcanzado, quedaban ${queue.length} en cola`);

  console.log('');
  console.log(`paginas capturadas: ${pages.size}`);

  // Segunda pasada: ahora que se conocen TODAS las rutas, reescribir enlaces.
  let htmlBytes = 0;
  for (const [route, html] of pages) {
    const rewritten = rewrite(html, pages.keys(), robotsFor(route));
    htmlBytes += Buffer.byteLength(rewritten);
    writeFile(routeToFile(route), rewritten);
  }

  /*
   * Tercera pasada: el PAYLOAD RSC de cada pagina.
   *
   * Sin esto la demo se siente como un sitio de los noventa y no como el
   * producto. El router del App Router no navega leyendo el HTML: pide a la
   * misma URL un flight payload (cabecera `RSC: 1`). Un servidor estatico le
   * devolvia el documento HTML, el router veia que no es un payload y se
   * rendia haciendo una navegacion DURA — recarga entera. Consecuencia
   * visible: la escena del hotel se DESMONTA y se vuelve a montar, asi que el
   * movimiento de camara de 760 ms entre planta y habitacion no ocurre nunca.
   * En Vercel, con servidor de Next detras, la misma navegacion es blanda y la
   * camara entra en la habitacion.
   *
   * Se guarda junto al index.html como index.rsc, y el .htaccess lo sirve
   * cuando la peticion trae la cabecera RSC (mod_rewrite con %{HTTP:RSC}).
   * El payload que se captura es el de ARBOL COMPLETO —se pide sin
   * Next-Router-State-Tree—, que es el unico que sirve viniendo de cualquier
   * pagina: uno parcial solo vale para el arbol desde el que se pidio.
   */
  let rscBytes = 0;
  let rscCount = 0;
  const rscFailed = [];
  for (const route of pages.keys()) {
    let res;
    try {
      res = await get(ORIGIN + SRC_BASE + route, 0, { RSC: '1' });
    } catch (e) {
      rscFailed.push({ route, error: e.message });
      continue;
    }
    if (res.status !== 200 || !res.type.includes('text/x-component')) {
      rscFailed.push({ route, status: res.status, type: res.type });
      continue;
    }
    const payload = rewriteRsc(res.body.toString('utf8'), pages.keys());
    rscBytes += Buffer.byteLength(payload);
    rscCount++;
    writeFile(routeToFile(route).replace(/index\.html$/, 'index.rsc'), payload);
    if (rscCount % 50 === 0) console.log(`  ${rscCount} payloads RSC`);
  }
  console.log(`payloads RSC: ${rscCount}${rscFailed.length ? ` · ${rscFailed.length} sin capturar` : ''}`);
  if (rscFailed.length) for (const f of rscFailed.slice(0, 5)) console.log('  FALLO', f.route, f.status || f.error, f.type || '');

  // Assets de Next, mas el favicon del producto (unica ruta suelta fuera de /_next/).
  //
  // OJO: las FUENTES no se referencian en el HTML, sino con url(...) DENTRO del
  // CSS. Recoger solo href/src deja las cuatro IBM Plex en 404 y el producto se
  // ve con la tipografia de respaldo — un fallo que no da error en consola de
  // React y que en una captura pasa por bueno. Por eso, tras bajar cada hoja de
  // estilo, se rastrean sus url() y se encolan.
  assets.add('/icon.svg');
  let assetBytes = 0;
  const pending = [...assets];
  const fetched = new Set();

  while (pending.length) {
    const a = pending.shift();
    if (fetched.has(a)) continue;
    fetched.add(a);

    let res;
    try { res = await get(ORIGIN + SRC_BASE + a); } catch { continue; }
    if (res.status !== 200) { failed.push({ route: a, status: res.status }); continue; }

    writeFile(a.replace(/^\//, ''), res.body);
    assetBytes += res.body.length;

    if (a.endsWith('.css')) {
      const css = res.body.toString('utf8');
      const dir = a.slice(0, a.lastIndexOf('/') + 1);   // /_next/static/chunks/
      for (const m of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
        const raw = m[1].trim();
        // Las fuentes van con ruta RELATIVA (url(../media/...)); tambien hay
        // url(#hs-stripes), que son filtros SVG del propio documento, y data:.
        if (!raw || raw.startsWith('#') || raw.startsWith('data:') || /^https?:/.test(raw)) continue;
        const abs = raw.startsWith('/')
          ? raw
          : new URL(raw, `http://x${dir}`).pathname;
        const logical = stripSrcBase(abs);
        if (!logical.startsWith('/_next/')) continue;
        if (!fetched.has(logical)) { pending.push(logical); assets.add(logical); }
      }
    }
  }

  // Las APIs que el cliente pide EN CALIENTE, precalculadas a JSON estatico.
  //
  //   /api/today?date=&time=          -> RoomsStage, al cambiar de momento
  //   /api/explain/<metricId>?businessDate=  -> LineageDrawer, o sea Evidence
  //
  // Sin esto el boton "Trace" —que es el diferenciador entero del producto—
  // da 404 en el sitio publicado. El shim de fetch (abajo) redirige cada
  // llamada a su archivo.
  const apiSaved = [];
  async function saveApi(rel, url) {
    try {
      const res = await get(ORIGIN + SRC_BASE + url);
      if (res.status !== 200) return false;
      writeFile(rel, res.body);
      apiSaved.push({ url, bytes: res.body.length });
      return true;
    } catch { return false; }
  }

  await saveApi('api/today.json', '/api/today');
  await saveApi('api/overview.json', '/api/overview');
  await saveApi('api/occupancy.json', '/api/occupancy');

  // /api/today para cada momento que el conmutador ofrece.
  const TIMES = ['09:00', '14:30', '20:00'];
  for (const date of SWITCHER_DATES) {
    for (const time of TIMES) {
      const params = new URLSearchParams({ date, time });
      await saveApi(`api/today/${slugFromParams(params)}.json`, `/api/today?${params}`);
    }
  }

  // /api/explain/<metricId> para cada dia del historico. Solo dos metricas
  // tienen explicacion (las demas responden 404 en el propio producto), asi
  // que se prueban y se guardan las que existen.
  const businessDates = [...pages.keys()]
    .map(r => (r.match(/businessDate=(\d{4}-\d{2}-\d{2})/) || [])[1])
    .filter(Boolean);
  const allDates = [...new Set(businessDates)];
  let explained = 0;
  for (const metricId of ['headline_occupancy', 'operational_occupancy']) {
    for (const businessDate of allDates) {
      const params = new URLSearchParams({ businessDate });
      const ok = await saveApi(
        `api/explain/${metricId}/${slugFromParams(params)}.json`,
        `/api/explain/${metricId}?${params}`
      );
      if (ok) explained++;
    }
  }
  console.log(`  explain precalculados: ${explained} (${allDates.length} fechas x 2 metricas)`);

  console.log('');
  console.log('resumen');
  console.log(`  paginas  ${pages.size}`);
  console.log(`  HTML     ${(htmlBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  RSC      ${(rscBytes / 1024 / 1024).toFixed(2)} MB  (${rscCount} payloads)`);
  console.log(`  assets   ${(assetBytes / 1024 / 1024).toFixed(2)} MB  (${assets.size} archivos)`);
  console.log(`  api      ${apiSaved.length} respuestas`);
  if (failed.length) {
    console.log(`  FALLOS   ${failed.length}`);
    for (const f of failed.slice(0, 15)) console.log(`    ${f.status || f.error}  ${f.route}`);
    if (failed.length > 15) console.log(`    ... y ${failed.length - 15} mas`);
  }

  fs.writeFileSync(
    path.join(OUT_DIR, '_snapshot-report.json'),
    JSON.stringify({
      origin: ORIGIN, mount: MOUNT,
      pages: [...pages.keys()], assets: [...assets], api: apiSaved, failed,
    }, null, 2)
  );

  process.exit(failed.length ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
