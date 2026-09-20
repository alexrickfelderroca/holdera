/* HOLDERA — mide la CAJA DE TINTA de cada marca de integraciones.
 *
 *   node _build/integraciones/measure-ink.js          mide y escribe ink.json
 *   node _build/integraciones/measure-ink.js --check   falla si esta desfasado
 *
 * SALIDA: _build/integraciones/ink.json
 *
 * POR QUE HACE FALTA MEDIR, Y NO SE PUEDE CALCULAR
 * -----------------------------------------------
 * El `viewBox` de un SVG NO es lo que ocupa el dibujo: es el lienzo que le
 * dejo quien lo exporto, y cada empresa deja el suyo. Si todas las marcas se
 * escalan a 24 de alto por su viewBox, la que trae aire alrededor sale
 * pequenita y la que viene justa sale enorme — que es exactamente lo que
 * enseno la hoja de contacto del 20-09-2026: SiteMinder y Holded gigantes,
 * PriceLabs y Sage ilegibles, todo a la misma "altura".
 *
 * Medido sobre los 41 archivos: la tinta ocupa entre el 55,7 % (Sage) y el
 * 100 % (SiteMinder, SAP, Revbell) de su viewBox. Casi el doble de tamano
 * real entre dos marcas que el CSS cree que miden lo mismo.
 *
 * La tinta real de un trazado solo la sabe quien lo rasteriza: hay curvas,
 * transformaciones, `clip-path` y grupos anidados. `getBBox()` del navegador
 * lo resuelve exacto; parsear los `d` a mano seria reimplementar medio motor
 * SVG para que ademas mintiese en los bordes. Por eso esto habla CDP con el
 * Chrome de trabajo (:9222), como `shoot.js`.
 *
 * 🔴 La pestana se ACTIVA antes de medir. Una pestana de `/json/new` nace en
 * segundo plano, y ahi `document.visibilityState` es 'hidden' y Chrome no da
 * frames: el layout del SVG puede no haberse resuelto y `getBBox()` devuelve
 * ceros. Es la misma trampa del paso 12 que devolvia capturas en blanco.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const HERE = __dirname;
const ROOT = path.join(HERE, '..', '..');
const SERVIDOS = path.join(ROOT, 'assets', 'img', 'integraciones');
const OUT = path.join(HERE, 'ink.json');
const PORT = 9222;
const CHECK = process.argv.includes('--check');

function httpJson(p, method = 'GET') {
  return new Promise((res, rej) => {
    const req = http.request({ host: '127.0.0.1', port: PORT, path: p, method }, (r) => {
      let b = '';
      r.setEncoding('utf8');
      r.on('data', (c) => (b += c));
      r.on('end', () => { try { res(b ? JSON.parse(b) : null); } catch { res(b); } });
    });
    req.on('error', rej);
    req.end();
  });
}

class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.p = new Map();
    ws.addEventListener('message', (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && this.p.has(m.id)) {
        const { resolve, reject } = this.p.get(m.id); this.p.delete(m.id);
        if (m.error) reject(new Error(m.error.message)); else resolve(m.result);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((res, rej) => { this.p.set(id, { resolve: res, reject: rej }); this.ws.send(JSON.stringify({ id, method, params })); });
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Una pagina con los 41 dibujos, cada uno en su <svg> a tamano natural. */
function sheet(files) {
  const figs = files
    .map((f) => {
      const slug = f.slice(0, -4);
      const svg = fs.readFileSync(path.join(SERVIDOS, f), 'utf8').trim().replace(' xmlns="http://www.w3.org/2000/svg"', '');
      return `<i data-slug="${slug}">${svg}</i>`;
    })
    .join('');
  return `<!doctype html><meta charset="utf-8"><style>i{display:block}svg{height:200px;width:auto}</style>${figs}`;
}

async function main() {
  const files = fs.readdirSync(SERVIDOS).filter((f) => f.endsWith('.svg')).sort();
  const t = await httpJson('/json/new?about:blank', 'PUT');
  if (!t || !t.webSocketDebuggerUrl) throw new Error('no se pudo abrir pestana en :' + PORT);
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j); });
  const cdp = new CDP(ws);
  let medidas;
  try {
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Page.bringToFront').catch(() => {});
    await httpJson('/json/activate/' + t.id).catch(() => {});
    await cdp.send('Page.setWebLifecycleState', { state: 'active' }).catch(() => {});
    await cdp.send('Page.navigate', { url: 'data:text/html;charset=utf-8,' + encodeURIComponent(sheet(files)) });
    await sleep(900);
    const r = await cdp.send('Runtime.evaluate', {
      expression: `(()=>{const o={};for(const i of document.querySelectorAll('i')){const s=i.querySelector('svg');const v=s.viewBox.baseVal;const b=s.getBBox();o[i.dataset.slug]={vb:[v.x,v.y,v.width,v.height],ink:[b.x,b.y,b.width,b.height]};}return JSON.stringify(o)})()`,
      returnByValue: true,
    });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
    medidas = JSON.parse(r.result.value);
  } finally {
    try { await httpJson('/json/close/' + t.id); } catch {}
  }

  const vacias = Object.entries(medidas).filter(([, m]) => !(m.ink[2] > 0 && m.ink[3] > 0));
  if (vacias.length) {
    console.error(`FALLO: ${vacias.length} marcas midieron 0 de tinta (pestana en segundo plano?): ${vacias.map(([s]) => s).join(', ')}`);
    process.exit(1);
  }

  const round = (n) => Math.round(n * 100) / 100;
  const out = {};
  for (const [slug, m] of Object.entries(medidas)) {
    out[slug] = { ink: m.ink.map(round), llenado: round(m.ink[3] / m.vb[3]) };
  }

  if (CHECK) {
    const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')).marcas : {};
    const cambiadas = Object.keys(out).filter((s) => JSON.stringify(prev[s]) !== JSON.stringify(out[s]));
    if (cambiadas.length) {
      console.error(`ink.json desfasado en ${cambiadas.length} marcas: ${cambiadas.slice(0, 8).join(', ')}`);
      console.error('  ejecuta: node _build/integraciones/measure-ink.js');
      process.exit(1);
    }
    console.log(`ink.json al dia (${Object.keys(out).length} marcas)`);
    return;
  }

  fs.writeFileSync(OUT, JSON.stringify({ medido: new Date().toISOString().slice(0, 10), fuente: 'getBBox() en Chrome via CDP', marcas: out }, null, 1) + '\n');
  const llenos = Object.values(out).map((m) => m.llenado).sort((a, b) => a - b);
  console.log(`medidas ${Object.keys(out).length} marcas -> ink.json`);
  console.log(`  llenado del viewBox: ${(llenos[0] * 100).toFixed(1)} % el minimo, ${(llenos[llenos.length - 1] * 100).toFixed(1)} % el maximo`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
