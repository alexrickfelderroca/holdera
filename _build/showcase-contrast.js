/* showcase-contrast.js — mide el titular del escaparate del hero SOBRE LA OBRA.
 *
 * El titular (74px) se lee encima de cinco obras distintas, con un scrim y un
 * filter por delante: no hay forma de calcularlo desde el CSS, hay que mirar
 * el pixel. Y hay que mirar el pixel del FONDO, no el del texto: midiendo la
 * caja del titular tal cual sale "1.00:1, fondo rgb(245,243,239)", que es el
 * propio color de las letras (trampa documentada del paso 10). Por eso el
 * titular se pone en `color: transparent` antes de capturar.
 *
 * Cada rediseño del panel cambia esas cinco obras — son capturas suyas — asi
 * que esto se vuelve a pasar cada vez.
 *
 * Uso (sitio servido en 4177):
 *   node _build/showcase-contrast.js
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');

const PORT = Number(process.env.CDP_PORT || 9222);
const BASE = process.env.SITE_BASE || 'http://localhost:4177';
const TMP = path.resolve(__dirname, '..', '.screenshots', 'showcase-contrast');
const SERVICES = ['Hoy', 'Habitaciones', 'Housekeeping', 'Revenue y reservas', 'Trazabilidad'];

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

(async () => {
  fs.mkdirSync(TMP, { recursive: true });
  const t = await hj('/json/new?about:blank', 'PUT');
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const pend = new Map();
  await new Promise((r) => ws.addEventListener('open', r));
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
  });
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.value;

  let worst = { ratio: 99, name: '' };
  try {
    await send('Page.enable');
    await send('Runtime.enable');
    /*
     * La pestana de /json/new nace en segundo plano y Chrome estrangula los
     * temporizadores de una pagina que no se ve: el escaparate no llega a
     * armarse y los cinco titulos salen "no visible title". Traerla al frente
     * y mantener un screencast la mantiene "visible" para el compositor.
     */
    await send('Page.bringToFront').catch(() => {});
    await send('Page.startScreencast', { format: 'jpeg', quality: 10, maxWidth: 200, maxHeight: 200, everyNthFrame: 30 }).catch(() => {});
    await send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    await send('Page.navigate', { url: BASE + '/index.html' });
    await sleep(3200);
    for (const name of SERVICES) {
      const region = await evaluate(`(async () => {
        const li = [...document.querySelectorAll('li')].find(x => x.textContent.trim() === ${JSON.stringify(name)});
        if (!li) return null;
        const target = li.querySelector('a') || li;
        for (const type of ['pointerenter', 'pointerover', 'pointermove']) {
          target.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerType: 'mouse' }));
          li.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerType: 'mouse' }));
        }
        await new Promise(r => setTimeout(r, 1100));
        const titles = [...document.querySelectorAll('[class*="sc__title"], .sc__title')];
        const el = titles.find(t => Number(getComputedStyle(t).opacity) > 0.5);
        if (!el) return { missing: true, titles: titles.length };
        const colour = getComputedStyle(el).color;
        // Measure the GLYPH box, not the grid cell: a cell spans the whole
        // stage and drags in artwork the letters never touch.
        const range = document.createRange();
        range.selectNodeContents(el);
        const r = range.getBoundingClientRect();
        el.style.color = 'transparent';
        return { colour, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) };
      })()`);
      if (!region || region.missing) { console.log(name.padEnd(20), 'no visible title', JSON.stringify(region)); continue; }
      await sleep(250);
      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const file = path.join(TMP, name.replace(/\W+/g, '-') + '.png');
      fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
      await evaluate(`[...document.querySelectorAll('[class*="sc__title"], .sc__title')].forEach(t => t.style.color = '')`);

      const m = /rgba?\(([^)]+)\)/.exec(region.colour);
      const rgb = m[1].split(/[\s,/]+/).filter(Boolean).slice(0, 3).map(Number);
      const regions = [{ name, color: rgb, x: region.x, y: region.y, w: region.w, h: region.h, need: 3 }];
      const cfg = path.join(TMP, 'regions.json');
      fs.writeFileSync(cfg, JSON.stringify(regions));
      const out = execFileSync('node', [path.join(__dirname, 'png-probe.js'), file, '1', cfg], { encoding: 'utf8' });
      const ratio = Number((/([0-9.]+):1/.exec(out) || [])[1] || 0);
      if (ratio && ratio < worst.ratio) worst = { ratio, name };
      console.log(name.padEnd(20), out.trim().split('\n').map((l) => l.trim()).join(' | '));
    }
  } finally {
    await hj('/json/close/' + t.id);
  }
  console.log('\nworst title on artwork:', worst.ratio + ':1', '(' + worst.name + ')', worst.ratio >= 3 ? '— OK, a 74px title needs 3:1' : '— FAIL');
  if (worst.ratio < 3) process.exitCode = 1;
})();
