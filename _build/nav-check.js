/*
 * _build/nav-check.js — comprueba COMO navega el panel, no solo que navegue.
 *
 * El panel es una app de Next capturada en archivos. El router del App Router
 * no navega leyendo el HTML: pide a la misma URL un flight payload (cabecera
 * `RSC: 1`). Si el servidor le devuelve el documento HTML, el router se rinde y
 * hace una navegacion DURA — recarga entera. Se ve enseguida en el hotel: la
 * escena 3D vive en el layout de /rooms y NO deberia desmontarse al ir de
 * planta a habitacion, porque la camara anima el cambio en 760 ms. Con una
 * recarga se desmonta y el movimiento no ocurre nunca.
 *
 * Esto lo mide de verdad: pone una marca en `window`, pulsa el enlace, y mira
 * si la marca sigue ahi. Si sigue, el documento sobrevivio (navegacion blanda).
 * Y comprueba ademas que la escena es EL MISMO nodo del DOM y que la camara
 * cambio de nivel.
 *
 * Las rutas con query son la excepcion a proposito: su carpeta
 * (/panel/date-2026-01-14/) no es una ruta que la aplicacion conozca, asi que
 * el snapshot le quita ese clic al router y lo hace el navegador. Ahi lo que se
 * exige es que la pagina que sale diga el dia que dice la URL.
 *
 * Uso (sitio servido en 4177, o --base https://holdera.es):
 *   node _build/nav-check.js
 *   node _build/nav-check.js --base https://holdera.es
 */
const http = require('http');

function arg(n, d) { const i = process.argv.indexOf('--' + n); return i === -1 ? d : process.argv[i + 1]; }
const PORT = Number(arg('port', 9222));
const BASE = String(arg('base', 'http://localhost:4177')).replace(/\/$/, '');

/** Cada paso: donde empieza, que enlace pulsa, y que tiene que pasar. */
const STEPS = [
  {
    name: 'portada -> Hotel (barra lateral)',
    from: '/panel/',
    pick: `[...document.querySelectorAll('a.shell-nav-item')].find(a => /\\/rooms\\/$/.test(a.getAttribute('href')))`,
    expect: { soft: true, url: '/panel/rooms/' },
  },
  {
    name: 'Hotel -> planta F5 (en el modelo)',
    from: '/panel/rooms/',
    pick: `[...document.querySelectorAll('a.hs-floor')].find(a => /floor\\/F5\\/$/.test(a.getAttribute('href')))`,
    expect: { soft: true, url: '/panel/rooms/floor/F5/', camera: 'is-floor', sameScene: true },
  },
  {
    name: 'planta -> habitacion (la camara entra)',
    from: '/panel/rooms/floor/F5/',
    pick: `[...document.querySelectorAll('a.hs-room-link')].find(a => /\\/rooms\\/50\\d\\/$/.test(a.getAttribute('href')))`,
    expect: { soft: true, camera: 'is-room', sameScene: true },
  },
  {
    name: 'habitacion -> Revenue (otro layout)',
    from: '/panel/rooms/502/',
    pick: `document.querySelector('a.shell-nav-item[href$="/panel/revenue/"]')`,
    expect: { soft: true, url: '/panel/revenue/' },
  },
  {
    name: 'Revenue -> Reservas',
    from: '/panel/revenue/',
    pick: `document.querySelector('a.shell-nav-item[href*="bookings"]')`,
    expect: { soft: true, url: '/panel/revenue/bookings/' },
  },
  {
    name: 'Ground Floor -> zona (la camara baja a la zona)',
    from: '/panel/operations/',
    pick: `[...document.querySelectorAll('a')].find(a => /\\/operations\\/restaurant\\/$/.test(a.getAttribute('href') || ''))`,
    expect: { soft: true, camera: 'is-zone', sameScene: true },
  },
  {
    name: 'conmutador de fecha (ruta con query: dura, pero el dia correcto)',
    // Vive en Today, que desde el 20-09-2026 ya no es la raiz.
    from: '/panel/today/',
    pick: `[...document.querySelectorAll('a')].find(a => /\\/panel\\/date-2026-01-14\\/$/.test(a.getAttribute('href') || ''))`,
    expect: { soft: false, url: '/panel/date-2026-01-14/', text: '14 January 2026' },
  },
  {
    name: 'conmutador de hora (idem)',
    from: '/panel/today/',
    pick: `[...document.querySelectorAll('a')].find(a => /\\/panel\\/time-20-3a00\\/$/.test(a.getAttribute('href') || ''))`,
    expect: { soft: false, url: '/panel/time-20-3a00/', text: '20:00' },
  },
];

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
  const t = await hj('/json/new?about:blank', 'PUT');
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  let id = 0; const pend = new Map();
  await new Promise((r) => ws.addEventListener('open', r));
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
  });
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  /*
   * Una navegacion DURA mata el contexto de ejecucion a mitad del evaluate, y
   * CDP contesta con un error en vez de con un resultado. Eso NO es un fallo
   * del script: es justo la senal que se esta midiendo. Se captura y se
   * devuelve como marca.
   */
  const evaluate = async (expression) => {
    try {
      const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (r.exceptionDetails) return { __error: r.exceptionDetails.text };
      return r.result && r.result.value;
    } catch (e) {
      return { __error: e.message };
    }
  };

  let pass = 0;
  const fails = [];
  try {
    await send('Page.enable');
    await send('Runtime.enable');
    /*
     * 🔴 LA PESTANA TIENE QUE ESTAR EN PRIMER PLANO.
     *
     * Una pestana creada por /json/new nace en segundo plano y Chrome no la
     * pinta. React 19 hidrata de forma selectiva, asi que lo que depende de
     * verse —la escena del hotel— NO HIDRATA NUNCA en una pestana oculta:
     * medido, la barra lateral tenia su fibra a los 500 ms y los 20 enlaces de
     * habitacion seguian con cero a los 10 segundos. Sin esto, el verificador
     * pulsa un <a> sin React, el navegador lo sigue, y se informa de una
     * "navegacion dura" que en un navegador de verdad no existe.
     */
    await send('Page.bringToFront').catch(() => {});
    /*
     * Y ademas hay que obligar al compositor a PRODUCIR FOTOGRAMAS. Traer la
     * pestana al frente no basta si la ventana esta tapada o minimizada:
     * Chrome estrangula los temporizadores de una pagina que no se ve, y el
     * planificador de React —que es quien termina de hidratar la escena— no
     * llega a tener turno nunca. Un screencast activo mantiene la pagina
     * "visible" para el compositor. Medido sin esto: la barra lateral con su
     * fibra a los 500 ms y los 20 enlaces de habitacion a CERO a los 10 s.
     */
    await send('Page.startScreencast', { format: 'jpeg', quality: 10, maxWidth: 200, maxHeight: 200, everyNthFrame: 30 }).catch(() => {});
    await send('Emulation.setFocusEmulationEnabled', { enabled: true }).catch(() => {});
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

    for (const step of STEPS) {
      await send('Page.navigate', { url: BASE + step.from });
      await send('Page.bringToFront').catch(() => {});
      /*
       * Esperar a que REACT HAYA HIDRATADO **EL ENLACE QUE SE VA A PULSAR**.
       *
       * Hasta que React no se engancha a ese nodo, un <Link> es un <a href>
       * normal y el clic lo sigue el navegador: navegacion dura. Con un sleep
       * fijo el resultado salia distinto en cada pasada —8/8, luego 4/8— y
       * parecia un fallo del panel cuando era del reloj.
       *
       * Y no vale preguntar por un enlace cualquiera: la barra lateral hidrata
       * en 250 ms y la escena del hotel bastante despues, asi que esperar por
       * `.shell-nav-item` daba por listo un `a.hs-room-link` que todavia tenia
       * CERO fibras de React. Se pregunta por el elemento concreto.
       */
      let hydrated = false;
      for (let i = 0; i < 60; i++) {
        const ready = await evaluate(`(() => {
          const el = ${step.pick};
          if (!el) return false;
          return Object.keys(el).some(k => k.startsWith('__react'));
        })()`);
        if (ready === true) { hydrated = true; break; }
        await sleep(250);
      }
      if (!hydrated) console.log('       (aviso: el enlace no llego a hidratar en 15 s)');
      await sleep(400);
      const res = await evaluate(`(async () => {
        window.__alive = 'yes';
        const sceneBefore = document.querySelector('.hs');
        window.__scene = sceneBefore;
        const cameraBefore = sceneBefore ? String(sceneBefore.className.baseVal ?? sceneBefore.className) : '';
        const el = ${step.pick};
        if (!el) return { missing: true };
        const r = el.getBoundingClientRect();
        const o = { bubbles: true, cancelable: true, view: window, button: 0, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
        for (const type of ['pointerdown','mousedown','mouseup','click']) el.dispatchEvent(new MouseEvent(type, o));
        await new Promise(res => setTimeout(res, 2400));
        const sceneAfter = document.querySelector('.hs');
        return {
          href: el.getAttribute('href'),
          soft: window.__alive === 'yes',
          sameScene: window.__scene === sceneAfter,
          cameraBefore,
          cameraAfter: sceneAfter ? String(sceneAfter.className.baseVal ?? sceneAfter.className) : '',
          url: location.pathname,
          text: document.body.innerText.slice(0, 4000),
        };
      })()`);

      /*
       * Un contexto destruido ES el resultado: navegacion dura. Pero hay que
       * ESPERAR al documento nuevo antes de volver a preguntar: si se pregunta
       * en el mismo instante, el evaluate cae en el hueco entre los dos
       * documentos y devuelve otro error, y entonces el informe sale con
       * "url undefined" — que parece un fallo del panel y es del verificador.
       * Se reintenta hasta tres veces con un segundo de por medio.
       */
      let got = res;
      if (!got || got.__error) {
        for (let attempt = 0; attempt < 3; attempt++) {
          await sleep(1200);
          got = await evaluate(`({ soft: window.__alive === 'yes', url: location.pathname, text: document.body.innerText.slice(0, 4000), cameraAfter: (document.querySelector('.hs') ? String(document.querySelector('.hs').className.baseVal ?? document.querySelector('.hs').className) : ''), sameScene: false })`);
          if (got && !got.__error && got.url) break;
        }
        if (!got || got.__error) got = { soft: false, url: '(sin respuesta)', text: '', cameraAfter: '', sameScene: false };
      }

      const problems = [];
      if (got.missing) problems.push('no se encontro el enlace');
      if (step.expect.soft !== undefined && got.soft !== step.expect.soft) {
        problems.push(`navegacion ${got.soft ? 'BLANDA' : 'DURA'}, se esperaba ${step.expect.soft ? 'blanda' : 'dura'}`);
      }
      if (step.expect.url && got.url !== step.expect.url) problems.push(`url ${got.url}, se esperaba ${step.expect.url}`);
      if (step.expect.sameScene && !got.sameScene) problems.push('la escena se remonto (nodo distinto)');
      if (step.expect.camera && !(got.cameraAfter || '').includes(step.expect.camera)) {
        problems.push(`camara "${got.cameraAfter}", se esperaba ${step.expect.camera}`);
      }
      if (step.expect.text && !(got.text || '').includes(step.expect.text)) problems.push(`la pagina no dice "${step.expect.text}"`);

      if (problems.length) { fails.push({ step: step.name, problems }); console.log('FALLO  ' + step.name); problems.forEach(p => console.log('        - ' + p)); }
      else { pass++; console.log('OK     ' + step.name + (step.expect.camera ? `  (${got.cameraBefore.replace('hs ', '')} -> ${got.cameraAfter.replace('hs ', '')})` : '')); }
    }
  } finally {
    await hj('/json/close/' + t.id);
  }

  console.log(`\n${pass}/${STEPS.length} pasos correctos en ${BASE}`);
  if (fails.length) process.exitCode = 1;
})();
