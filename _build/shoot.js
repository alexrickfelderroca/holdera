/*
 * _build/shoot.js — capturas por lotes contra el Chrome de trabajo (CDP :9222).
 *
 * Por qué existe: verificar un rediseño del panel son DECENAS de pantallas por
 * dos viewports y dos esquemas de color. Hacerlo pidiendo captura a captura por
 * el MCP es lentísimo y, con varias sesiones, la pestaña seleccionada puede
 * cambiar a mitad (trampa documentada del paso 4 y del 10). Esto abre su PROPIA
 * pestaña, hace el trabajo y la cierra: no toca la pestaña de nadie.
 *
 * Uso:
 *   node _build/shoot.js --routes _build/shots/panel.json --out .screenshots/apple-panel/pass-1
 *   node _build/shoot.js --url http://localhost:4177/panel/ --out tmp --w 1440 --h 900
 *
 * Opciones:
 *   --routes <json>   lista [{path, name}] o ["/ruta", ...]
 *   --base <url>      prefijo de las rutas (por defecto http://localhost:4177)
 *   --out <dir>       carpeta de salida
 *   --w --h           viewport (por defecto 1440x900); repetible con --vp 1440x900,390x844
 *   --dark            además de light, captura en dark (sufijo -dark)
 *   --full            página entera (por defecto sí; --no-full para solo viewport)
 *   --scale <n>       deviceScaleFactor
 *   --wait <ms>       espera extra tras load
 *   --eval <js>       expresión a evaluar en cada página; el resultado se imprime
 *   --port <n>        puerto CDP (9222)
 */
const fs = require('fs');
const path = require('path');
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
const OUT = String(arg('out', '.screenshots/shots'));
const WAIT = Number(arg('wait', 450));
const SCALE = Number(arg('scale', 1));
const FULL = !has('no-full');
const DARK = has('dark');
const LIGHT = !has('only-dark');
let EVAL = arg('eval', null);
const EVAL_FILE = arg('eval-file', null);
if (EVAL_FILE && EVAL_FILE !== true) EVAL = require('fs').readFileSync(EVAL_FILE, 'utf8');

const viewports = String(arg('vp', `${arg('w', 1440)}x${arg('h', 900)}`))
  .split(',')
  .map((s) => {
    const [w, h] = s.split('x').map(Number);
    return { w, h, name: `${w}x${h}` };
  });

function httpJson(pathname, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: PORT, path: pathname, method }, (res) => {
      let b = '';
      res.setEncoding('utf8');
      res.on('data', (c) => (b += c));
      res.on('end', () => {
        try {
          resolve(b ? JSON.parse(b) : null);
        } catch {
          resolve(b);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.handlers = new Map();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message + ' (' + JSON.stringify(msg.error.data || '') + ')'));
        else resolve(msg.result);
      } else if (msg.method) {
        const hs = this.handlers.get(msg.method) || [];
        for (const h of hs) h(msg.params);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  on(method, fn) {
    if (!this.handlers.has(method)) this.handlers.set(method, []);
    this.handlers.get(method).push(fn);
  }
  off(method) {
    this.handlers.delete(method);
  }
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.addEventListener('open', () => resolve(new CDP(ws)));
    ws.addEventListener('error', (e) => reject(new Error('ws error ' + url)));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  let routes;
  const routesArg = arg('routes', null);
  const urlArg = arg('url', null);
  if (routesArg && routesArg !== true) {
    routes = JSON.parse(fs.readFileSync(routesArg, 'utf8'));
  } else if (urlArg) {
    routes = [{ url: String(urlArg), name: 'page' }];
  } else {
    console.error('need --routes or --url');
    process.exit(2);
  }
  routes = routes.map((r, i) => {
    if (typeof r === 'string') r = { path: r };
    const url = r.url || BASE + r.path;
    const name =
      r.name ||
      (r.path || url)
        .replace(/^https?:\/\/[^/]+/, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '') ||
      'root-' + i;
    return { url, name };
  });

  fs.mkdirSync(OUT, { recursive: true });

  const target = await httpJson('/json/new?about:blank', 'PUT');
  if (!target || !target.webSocketDebuggerUrl) throw new Error('could not open a tab: ' + JSON.stringify(target));
  const cdp = await connect(target.webSocketDebuggerUrl);

  const results = [];
  try {
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Network.enable');
    const consoleErrors = [];
    cdp.on('Runtime.exceptionThrown', (p) => {
      consoleErrors.push(String((p.exceptionDetails && p.exceptionDetails.text) || 'exception'));
    });

    const schemes = [];
    if (LIGHT) schemes.push('light');
    if (DARK) schemes.push('dark');

    for (const vp of viewports) {
      for (const scheme of schemes) {
        await cdp.send('Emulation.setEmulatedMedia', {
          features: [{ name: 'prefers-color-scheme', value: scheme }],
        });
        await cdp.send('Emulation.setDeviceMetricsOverride', {
          width: vp.w,
          height: vp.h,
          deviceScaleFactor: SCALE,
          mobile: vp.w <= 500,
        });
        for (const r of routes) {
          let loaded = false;
          const onLoad = () => (loaded = true);
          cdp.on('Page.loadEventFired', onLoad);
          await cdp.send('Page.navigate', { url: r.url });
          const t0 = Date.now();
          while (!loaded && Date.now() - t0 < 20000) await sleep(60);
          cdp.off('Page.loadEventFired');
          await sleep(WAIT);

          let extra = null;
          if (EVAL && EVAL !== true) {
            try {
              const res = await cdp.send('Runtime.evaluate', {
                expression: String(EVAL),
                returnByValue: true,
                awaitPromise: true,
              });
              extra = res.result && res.result.value;
            } catch (e) {
              extra = 'EVAL ERROR ' + e.message;
            }
          }

          let shotParams = { format: 'png', captureBeyondViewport: FULL };
          if (FULL) {
            const m = await cdp.send('Page.getLayoutMetrics');
            const cs = m.cssContentSize || m.contentSize;
            shotParams.clip = {
              x: 0,
              y: 0,
              width: Math.min(cs.width, 4000),
              height: Math.min(cs.height, 12000),
              scale: 1,
            };
          }
          const shot = await cdp.send('Page.captureScreenshot', shotParams);
          const suffix = scheme === 'dark' ? '-dark' : '';
          const file = path.join(OUT, `${r.name}-${vp.name}${suffix}.png`);
          fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
          const size = fs.statSync(file).size;
          results.push({ name: r.name, vp: vp.name, scheme, file, bytes: size, extra });
          console.log(
            `${file}  ${(size / 1024).toFixed(0)}KB` + (extra != null ? '  ' + JSON.stringify(extra) : '')
          );
        }
      }
    }
    if (consoleErrors.length) {
      console.log('\n!! page exceptions:');
      for (const e of [...new Set(consoleErrors)]) console.log('  ' + e);
    }
  } finally {
    try {
      await httpJson('/json/close/' + target.id);
    } catch {}
  }
  fs.writeFileSync(path.join(OUT, '_shots.json'), JSON.stringify(results, null, 2));
  console.log(`\n${results.length} shots -> ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
