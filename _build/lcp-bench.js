/*
 * _build/lcp-bench.js — mide LCP/CLS/FCP varias veces por URL, con la MISMA
 * emulación, y saca la mediana. Una sola traza no distingue una regresión de
 * un arranque en frío; esto sí.
 *
 *   node _build/lcp-bench.js http://localhost:4177/panel/ http://localhost:4188/panel/ --runs 5
 *
 * Opciones: --runs N (3) · --cpu N (4) · --net Slow4G|Fast4G|none · --vp WxHxDPR
 */
const http = require('http');
const PORT = 9222;

function arg(n, d) { const i = process.argv.indexOf('--' + n); return i === -1 ? d : process.argv[i + 1]; }
const URLS = process.argv.slice(2).filter((a) => a.startsWith('http'));
const RUNS = Number(arg('runs', 3));
const CPU = Number(arg('cpu', 4));
const NET = String(arg('net', 'Slow4G'));
const VP = String(arg('vp', '390x844x3')).split('x').map(Number);

const NETS = {
  Slow4G: { downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8, latency: 400 },
  Fast4G: { downloadThroughput: (9000 * 1024) / 8, uploadThroughput: (1500 * 1024) / 8, latency: 85 },
  none: { downloadThroughput: -1, uploadThroughput: -1, latency: 0 },
};

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
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

(async () => {
  if (!URLS.length) { console.error('usage: node _build/lcp-bench.js <url> [url...] [--runs N]'); process.exit(2); }
  const t = await hj('/json/new?about:blank', 'PUT');
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const pend = new Map();
  await new Promise((r) => ws.addEventListener('open', r));
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
  });
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });

  const results = {};
  try {
    await send('Page.enable');
    await send('Network.enable');
    for (const url of URLS) {
      const runs = [];
      for (let i = 0; i < RUNS; i++) {
        await send('Network.clearBrowserCache');
        await send('Network.setCacheDisabled', { cacheDisabled: true });
        await send('Emulation.setCPUThrottlingRate', { rate: CPU });
        await send('Network.emulateNetworkConditions', { offline: false, ...NETS[NET] });
        await send('Emulation.setDeviceMetricsOverride', { width: VP[0], height: VP[1], deviceScaleFactor: VP[2] || 1, mobile: true });
        await send('Page.navigate', { url: 'about:blank' });
        await sleep(250);
        await send('Page.navigate', { url });
        await sleep(9000);
        const r = await send('Runtime.evaluate', {
          returnByValue: true, awaitPromise: true,
          expression: `new Promise((done) => {
            let lcp = 0, cls = 0;
            try {
              const e = performance.getEntriesByType('largest-contentful-paint');
              if (e.length) lcp = e[e.length - 1].startTime;
            } catch {}
            try { new PerformanceObserver((l) => { for (const x of l.getEntries()) if (!x.hadRecentInput) cls += x.value; }).observe({ type: 'layout-shift', buffered: true }); } catch {}
            try { new PerformanceObserver((l) => { const x = l.getEntries(); lcp = Math.max(lcp, x[x.length - 1].startTime); }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch {}
            const fcp = (performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime || 0;
            const nav = performance.getEntriesByType('navigation')[0] || {};
            const res = performance.getEntriesByType('resource');
            const css = res.filter(r => r.name.endsWith('.css'));
            setTimeout(() => done({
              lcp: Math.round(lcp), cls: Math.round(cls * 1000) / 1000, fcp: Math.round(fcp),
              domReady: Math.round(nav.domContentLoadedEventEnd || 0),
              load: Math.round(nav.loadEventEnd || 0),
              cssCount: css.length,
              cssBytes: css.reduce((a, r) => a + (r.encodedBodySize || 0), 0),
              cssDone: Math.round(Math.max(0, ...css.map(r => r.responseEnd))),
              resources: res.length,
              transfer: res.reduce((a, r) => a + (r.encodedBodySize || 0), 0),
            }), 400);
          })`,
        });
        runs.push(r.result.value);
      }
      results[url] = {
        lcp: median(runs.map((r) => r.lcp)),
        fcp: median(runs.map((r) => r.fcp)),
        cls: median(runs.map((r) => r.cls)),
        cssDone: median(runs.map((r) => r.cssDone)),
        cssBytes: runs[0].cssBytes,
        cssCount: runs[0].cssCount,
        resources: runs[0].resources,
        transfer: runs[0].transfer,
        all: runs.map((r) => r.lcp),
      };
    }
  } finally {
    try { await send('Emulation.setCPUThrottlingRate', { rate: 1 }); } catch {}
    await hj('/json/close/' + t.id);
  }
  console.log(`runs=${RUNS} cpu=${CPU}x net=${NET} vp=${VP.join('x')}\n`);
  for (const [u, r] of Object.entries(results)) {
    console.log(u);
    console.log(`  LCP ${String(r.lcp).padStart(5)} ms   FCP ${String(r.fcp).padStart(5)} ms   CLS ${r.cls}`);
    console.log(`  css ${r.cssCount} files, ${(r.cssBytes / 1024).toFixed(0)} KB over the wire, last one done at ${r.cssDone} ms`);
    console.log(`  ${r.resources} resources, ${(r.transfer / 1024).toFixed(0)} KB total`);
    console.log(`  lcp runs: ${r.all.join(', ')}\n`);
  }
})();
