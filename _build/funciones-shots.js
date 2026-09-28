/* HOLDERA — la captura del panel de cada página de /funciones/ (paso 14).
 *
 * Nota de Alex en la reunión (sobre Housekeeping): «esto tendría que estar
 * bajo el encuadre de room inventory status y se podría enseñar una foto».
 * Cada función enseña ahora SU pantalla del panel, al lado del texto. Estas
 * son esas fotos: assets/img/funciones/<captura>.webp, una por función de
 * _build/contenido/features.json, sacadas del panel que se sirve en /panel/
 * (el mismo que ve el visitante, ya pasado por _build/panel-copy.js).
 *
 * WebP directamente desde Chrome (Page.captureScreenshot format:'webp'): no
 * hace falta sharp. 1280x800 CSS a 1x: en la página la captura se pinta a
 * ~640 px, así que en una pantalla retina va a 1:1.
 *
 * Uso (sitio servido en 4177 y un Chrome con --remote-debugging-port=9222):
 *   node _build/serve.js 4177 &
 *   node _build/funciones-shots.js
 *   node _build/contenido/build-funciones.js && node _build/gates.js --fix
 *
 * 🔴 La pestaña se trae al frente y se marca activa ANTES de navegar: una
 * pestaña de /json/new nace en segundo plano, ahí requestAnimationFrame no
 * corre y React no termina de hidratar (trampa del paso 13). Sin esto la
 * captura sale con el hero en blanco o sin las siglas marcadas.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const PORT = Number(process.env.CDP_PORT || 9222);
const BASE = process.env.PANEL_BASE || 'http://localhost:4177';
const OUT = path.resolve(__dirname, '..', 'assets', 'img', 'funciones');
const FEATURES = JSON.parse(fs.readFileSync(path.join(__dirname, 'contenido', 'features.json'), 'utf8')).features;
const W = 1280;
const H = 800;

/* Lo que cada pantalla necesita antes de la foto. */
const ANTES = {
  // La traza: el cajón de Evidence abierto es lo que demuestra la función.
  trazabilidad: `(() => {
    const btn = [...document.querySelectorAll('button, a')].find((b) => /trace/i.test((b.textContent || '').trim()));
    if (!btn) return 'no trace button';
    btn.click();
    return 'clicked: ' + btn.textContent.trim().slice(0, 30);
  })()`,
};

function hj(p, m = 'GET') {
  return new Promise((res, rej) => {
    const q = http.request({ host: '127.0.0.1', port: PORT, path: p, method: m }, (r) => {
      let b = '';
      r.setEncoding('utf8');
      r.on('data', (c) => (b += c));
      r.on('end', () => { try { res(b ? JSON.parse(b) : null); } catch { res(b); } });
    });
    q.on('error', rej);
    q.end();
  });
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const t = await hj('/json/new?about:blank', 'PUT');
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0;
  const pend = new Map();
  await new Promise((r) => ws.addEventListener('open', r));
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) {
      const p = pend.get(m.id);
      pend.delete(m.id);
      m.error ? p.rej(new Error(m.error.message)) : p.res(m.result);
    }
  });
  const send = (method, params = {}) => new Promise((res, rej) => {
    const i = ++id;
    pend.set(i, { res, rej });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;

  try {
    await send('Page.enable');
    await send('Runtime.enable');
    await send('Page.bringToFront');
    await hj('/json/activate/' + t.id);
    try { await send('Page.setWebLifecycleState', { state: 'active' }); } catch (e) { /* no en todos los Chrome */ }
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: 'no-preference' }] });
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });

    for (const f of FEATURES) {
      await send('Page.navigate', { url: BASE + f.enlace });
      // Hidratado y con las siglas ya marcadas (terminos.js del panel corre
      // en idle): se espera a las dos cosas, con techo.
      const listo = await evaluate(`new Promise((ok) => {
        const t0 = Date.now();
        (function mira() {
          const a = document.querySelector('a[href]');
          const fibra = a && Object.keys(a).some((k) => k.startsWith('__reactFiber'));
          const hl = window.CSS && CSS.highlights && CSS.highlights.get('hx-term');
          if ((fibra && hl && hl.size > 0) || Date.now() - t0 > 9000) return ok({ fibra: !!fibra, siglas: hl ? hl.size : 0, ms: Date.now() - t0 });
          setTimeout(mira, 150);
        })();
      })`);
      // El enlace de vuelta a holdera.es es de la demo, no del producto.
      await evaluate(`(() => { const s = document.createElement('style'); s.textContent = '.holdera-site-back{display:none!important}'; document.head.appendChild(s); })()`);
      if (ANTES[f.clave]) {
        console.log('   ' + f.clave + ': ' + await evaluate(ANTES[f.clave]));
      }
      await sleep(f.clave === 'habitaciones' || f.clave === 'housekeeping' ? 2600 : 1200);
      const shot = await send('Page.captureScreenshot', { format: 'webp', quality: 82, clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
      const file = path.join(OUT, f.captura + '.webp');
      fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
      const kb = (fs.statSync(file).size / 1024).toFixed(0);
      console.log(`OK  ${f.captura.padEnd(14)} ${W}x${H}  ${kb} KB  hidratado:${listo.fibra} siglas:${listo.siglas} (${listo.ms} ms)  ${f.enlace}`);
    }
  } finally {
    await hj('/json/close/' + t.id);
    ws.close();
  }
})().catch((e) => { console.error(e); process.exit(1); });
