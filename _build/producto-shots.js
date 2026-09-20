/* HOLDERA — las cinco capturas en bruto del escaparate del hero.
 *
 * `_build/producto-art.js` recorta `assets/img/producto/_raw/<clave>-full.png`
 * en los cuatro encuadres. Este script es el paso de ANTES: abre el panel
 * capturado en `panel/` y guarda esas cinco pantallas. Existe porque el
 * escaparate enseña el producto de verdad, así que cada rediseño del panel
 * deja la obra desfasada y hay que rehacerla — y hacerlo a mano por el MCP,
 * pantalla a pantalla, es donde se cuelan los encuadres desiguales.
 *
 * Dos de las cinco son de PÁGINA ENTERA (Hoy y Revenue: su gracia es la
 * longitud) y tres son de VIEWPORT a 1600x1000, como las de la tanda
 * anterior. La de trazabilidad abre el cajón de Evidence antes de disparar:
 * es la única que necesita una interacción, y es justo la pantalla que
 * demuestra la tesis del producto.
 *
 * Uso (con el sitio servido en 4177):
 *   node _build/serve.js 4177 &
 *   node _build/producto-shots.js
 *   NODE_PATH="<producto>/node_modules" node _build/producto-art.js
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const PORT = Number(process.env.CDP_PORT || 9222);
const BASE = process.env.PANEL_BASE || 'http://localhost:4177';
const OUT = path.resolve(__dirname, '..', 'assets', 'img', 'producto', '_raw');

const SHOTS = [
  { key: 'hoy', url: '/panel/', full: true, wait: 2600 },
  { key: 'habitaciones', url: '/panel/rooms/', full: false, wait: 2600 },
  { key: 'housekeeping', url: '/panel/rooms/layer-housekeeping/', full: false, wait: 2600 },
  { key: 'revenue', url: '/panel/revenue/', full: true, wait: 2600 },
  {
    key: 'trazabilidad',
    url: '/panel/operations/occupancy/businessdate-2026-01-14/',
    full: false,
    wait: 2600,
    // Open the Evidence drawer: the one screen that has to be interacted with,
    // and the one that shows what the product is actually for.
    after: `(() => {
      const btn = [...document.querySelectorAll('button, a')].find(
        (b) => /trace/i.test((b.textContent || '').trim())
      );
      if (!btn) return 'no trace button';
      btn.click();
      return 'clicked: ' + btn.textContent.trim().slice(0, 30);
    })()`,
  },
];

function hj(p, m = 'GET') {
  return new Promise((res, rej) => {
    const q = http.request({ host: '127.0.0.1', port: PORT, path: p, method: m }, (r) => {
      let b = '';
      r.setEncoding('utf8');
      r.on('data', (c) => (b += c));
      r.on('end', () => {
        try { res(b ? JSON.parse(b) : null); } catch { res(b); }
      });
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
  const send = (method, params = {}) =>
    new Promise((res, rej) => {
      const i = ++id;
      pend.set(i, { res, rej });
      ws.send(JSON.stringify({ id: i, method, params }));
    });

  try {
    await send('Page.enable');
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
    for (const s of SHOTS) {
      await send('Emulation.setDeviceMetricsOverride', {
        width: 1600, height: 1000, deviceScaleFactor: 1, mobile: false,
      });
      await send('Page.navigate', { url: BASE + s.url });
      await sleep(s.wait);
      if (s.after) {
        const r = await send('Runtime.evaluate', { expression: s.after, returnByValue: true });
        console.log('   ' + s.key + ': ' + r.result.value);
        await sleep(900);
      }
      const params = { format: 'png', captureBeyondViewport: !!s.full };
      if (s.full) {
        const m = await send('Page.getLayoutMetrics');
        const cs = m.cssContentSize || m.contentSize;
        params.clip = { x: 0, y: 0, width: Math.min(cs.width, 1600), height: Math.min(cs.height, 4200), scale: 1 };
      }
      const shot = await send('Page.captureScreenshot', params);
      const file = path.join(OUT, s.key + '-full.png');
      fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
      const b = fs.readFileSync(file);
      console.log(
        `OK  ${s.key.padEnd(14)} ${b.readUInt32BE(16)}x${b.readUInt32BE(20)}  ${(b.length / 1024 / 1024).toFixed(2)} MB  ${s.url}`
      );
    }
  } finally {
    await hj('/json/close/' + t.id);
  }
})();
