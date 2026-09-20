/* overflow-sweep.js — ¿hay texto que se sale de su caja?
 *
 * Por qué existe: el 20-09-2026 Alex informó de que en la lista de
 * habitaciones salía "Out of Order (OO", cortado a media palabra. La
 * píldora medía 116px dentro de una celda de 89,5px: no se recortaba a sí
 * misma, se DESBORDABA y la recortaba la tarjeta varios niveles más arriba.
 *
 * Ninguna de las puertas que ya existen lo habría visto: `contrast.js` mide
 * color, `check-tokens.js` mide el sistema de tokens, y un desbordamiento
 * horizontal de PÁGINA no ocurre porque la tarjeta lo recorta. Por eso esto
 * mira otra cosa: para cada elemento con texto, si su contenido no cabe en
 * él (`scrollWidth > clientWidth`) o si su caja se sale del ancestro que lo
 * recorta.
 *
 * Uso:
 *   node _build/overflow-sweep.js                      (rutas por defecto)
 *   node _build/overflow-sweep.js --vp 390x844 --dark
 *   node _build/overflow-sweep.js --routes /panel/revenue/,/panel/rooms/
 */
const http = require('http');

function arg(name, fallback = null) {
  const i = process.argv.indexOf('--' + name);
  if (i === -1) return fallback;
  const next = process.argv[i + 1];
  if (!next || next.startsWith('--')) return true;
  return next;
}
const has = (name) => process.argv.includes('--' + name);

const PORT = Number(arg('port', 9222));
const BASE = String(arg('base', 'http://localhost:4177')).replace(/\/$/, '');
const DARK = has('dark');
const [VW, VH] = String(arg('vp', '1440x900')).split('x').map(Number);
const ROUTES = String(
  arg(
    'routes',
    [
      '/panel/',
      '/panel/rooms/',
      '/panel/rooms/floor/F5/',
      '/panel/rooms/501/',
      '/panel/housekeeping/',
      '/panel/team/',
      '/panel/revenue/',
      '/panel/revenue/bookings/',
      '/panel/intelligence/',
      '/panel/metrics/',
      '/panel/history/',
    ].join(','),
  ),
).split(',').filter(Boolean);

function hj(p, m = 'GET') {
  return new Promise((res, rej) => {
    const q = http.request({ host: '127.0.0.1', port: PORT, path: p, method: m }, (r) => {
      let b = ''; r.setEncoding('utf8'); r.on('data', (c) => (b += c));
      r.on('end', () => { try { res(b ? JSON.parse(b) : null); } catch { res(b); } });
    });
    q.on('error', rej); q.end();
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Se ejecuta EN la página. Devuelve una lista de hallazgos, no un veredicto:
 * quien decide qué es un fallo es este archivo, no la página. */
const PROBE = `(() => {
  const out = [];
  const seen = new Set();

  /* El ancestro que de verdad RECORTA.
   *
   * auto y scroll no recortan: desplazan. Un carrusel de pestanas o una
   * tabla ancha con scroll horizontal tienen contenido fuera de su caja a
   * proposito, y contarlo daba 82 falsos positivos en movil, donde media
   * app pasa a ser scroll horizontal. Lo que corta de verdad es hidden y
   * clip: ahi el texto que se sale no se puede alcanzar de ninguna forma.
   *
   * (Sin acentos graves: esto vive dentro de un template literal.) */
  const clipper = (el) => {
    let p = el.parentElement;
    while (p && p !== document.documentElement) {
      const cs = getComputedStyle(p);
      const cuts = (v) => v === 'hidden' || v === 'clip';
      if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') return null;
      if (cuts(cs.overflowX) || cuts(cs.overflowY)) return p;
      p = p.parentElement;
    }
    return null;
  };

  const label = (el) => {
    const cls = (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className) || '';
    return el.tagName.toLowerCase() + (cls ? '.' + String(cls).trim().split(/\\s+/).slice(0, 2).join('.') : '');
  };

  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05) continue;
    // Solo hojas de texto: un contenedor puede desbordar por diseño.
    const txt = (el.textContent || '').trim();
    if (!txt || el.children.length) continue;
    if (el.closest('.sr-only, .visually-hidden, [aria-hidden="true"]')) continue;

    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    /* La tecnica estandar para texto de lector de pantalla es una caja de
     * 1px con overflow oculto: ahi "el contenido no cabe" es el objetivo,
     * no un fallo. Se reconoce por la caja, no por el nombre de la clase,
     * para no depender de como la llame cada proyecto. */
    if (el.clientWidth <= 2 || el.clientHeight <= 2) continue;

    // 1) El contenido no cabe en el propio elemento y este lo corta.
    if (el.scrollWidth > el.clientWidth + 1 && (cs.overflowX === 'hidden' || cs.overflowX === 'clip')) {
      const k = 'self:' + label(el) + ':' + txt.slice(0, 24);
      if (!seen.has(k)) { seen.add(k); out.push({ kind: 'clipped', el: label(el), text: txt.slice(0, 40), need: el.scrollWidth, have: el.clientWidth }); }
    }

    // 2) La caja se sale del ancestro que recorta.
    const c = clipper(el);
    if (c) {
      const cr = c.getBoundingClientRect();
      const over = Math.max(r.right - cr.right, cr.left - r.left);
      if (over > 1.5) {
        const k = 'esc:' + label(el) + ':' + txt.slice(0, 24);
        if (!seen.has(k)) { seen.add(k); out.push({ kind: 'escapes', el: label(el), text: txt.slice(0, 40), over: +over.toFixed(1), clipper: label(c) }); }
      }
    }
  }
  return { findings: out, docOverflow: document.documentElement.scrollWidth > innerWidth + 1 };
})()`;

(async () => {
  const t = await hj('/json/new?about:blank', 'PUT');
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const pend = new Map();
  await new Promise((r) => ws.addEventListener('open', r));
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
  });
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) return { __e: String((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text).slice(0, 300) };
    return r.result.value;
  };

  let total = 0;
  try {
    await send('Page.enable'); await send('Runtime.enable');
    /* La pestaña nace en segundo plano y Chrome estrangula sus temporizadores:
     * sin esto React no termina de hidratar y media página no existe todavía. */
    await send('Page.bringToFront').catch(() => {});
    await send('Page.startScreencast', { format: 'jpeg', quality: 10, maxWidth: 200, maxHeight: 200, everyNthFrame: 30 }).catch(() => {});
    await send('Emulation.setDeviceMetricsOverride', { width: VW, height: VH, deviceScaleFactor: 1, mobile: VW < 900 });
    if (DARK) await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });

    for (const route of ROUTES) {
      await send('Page.navigate', { url: BASE + route });
      await sleep(3800);
      const res = await ev(PROBE);
      if (!res || res.__e) { console.log(route, 'ERROR', res && res.__e); continue; }
      const n = res.findings.length;
      total += n;
      const flag = res.docOverflow ? '  [scroll horizontal de pagina]' : '';
      console.log((n ? 'FAIL ' : 'ok   ') + route.padEnd(30) + n + flag);
      for (const f of res.findings.slice(0, 12)) {
        console.log(
          '       ' + f.kind.padEnd(8),
          f.el.padEnd(30),
          f.kind === 'clipped' ? f.need + 'px en ' + f.have + 'px' : '+' + f.over + 'px fuera de ' + f.clipper,
          ' | ' + JSON.stringify(f.text),
        );
      }
      if (res.findings.length > 12) console.log('       ... y ' + (res.findings.length - 12) + ' mas');
    }
  } finally {
    await hj('/json/close/' + t.id);
  }

  console.log('\n' + VW + 'x' + VH + (DARK ? ' dark' : ' light') + ' — ' + total + ' hallazgos');
  if (total) process.exitCode = 1;
})();
