/* HOLDERA — waves.js
   El tejido de lineas del hero: una malla de hilos finos que ondula con ruido
   Perlin y se aparta del cursor. Recreacion del componente "Perlin Wave Lines"
   que paso Alex, re-teñido a la paleta de la casa.

   Que cambia respecto a la referencia, y por que:
   · La referencia pinta lineas BLANCAS opacas sobre azul oscuro. Aqui el hero
     es gris claro y el encargo era que fuese DISCRETO y que no le quitase
     protagonismo al texto, asi que el hilo es tinta a muy baja alfa y su color
     sale de un token de :root (--wave-line), nunca de un literal.
   · Va DEBAJO de todo: z-index 0 dentro del hero, por debajo del cerebro (1),
     del copy (2), de la barra (4) y de la nav (5). Nunca tapa nada.
   · Lleva una mascara radial que apaga el campo justo donde vive el titular y
     la tarjeta lateral. El motivo es medible: el extremo palido del degradado
     del H1 (--text-fade #7a7a7a) mide 3,41:1 sobre #e5e5e5, y el minimo de la
     casa para texto grande es 3:1. Cada hilo que cruza por detras oscurece el
     fondo local, y ese margen se agota enseguida. La mascara y la alfa baja son
     las dos mitades del mismo arreglo — no toques una sin medir la otra con
     _build/contrast.js.
   · prefers-reduced-motion: se pinta UN fotograma quieto y no se escucha al
     raton. El tejido sigue estando, pero no se mueve.
   · Sin JS no hay lienzo y no falta nada: es decoracion pura.

   Sin CDN, como brain.js / planet.js / fish.js. */
(() => {
  'use strict';

  const canvas = document.querySelector('[data-waves]');
  if (!canvas) return;
  const host = canvas.parentElement;
  const hero = canvas.closest('.hero');
  if (!host || !hero) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------ *
   * Ruido Perlin (portado de la referencia, sin cambios de algoritmo)   *
   * ------------------------------------------------------------------ */
  function Grad(x, y, z) { this.x = x; this.y = y; this.z = z; }
  Grad.prototype.dot2 = function (x, y) { return this.x * x + this.y * y; };

  function Noise(seed) {
    this.grad3 = [
      new Grad(1, 1, 0), new Grad(-1, 1, 0), new Grad(1, -1, 0), new Grad(-1, -1, 0),
      new Grad(1, 0, 1), new Grad(-1, 0, 1), new Grad(1, 0, -1), new Grad(-1, 0, -1),
      new Grad(0, 1, 1), new Grad(0, -1, 1), new Grad(0, 1, -1), new Grad(0, -1, -1),
    ];
    this.p = [
      151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99,
      37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32,
      57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27,
      166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244,
      102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130,
      116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123, 5, 202, 38, 147,
      118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213,
      119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98, 108,
      110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12,
      191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84,
      204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141,
      128, 195, 78, 66, 215, 61, 156, 180,
    ];
    this.perm = new Array(512);
    this.gradP = new Array(512);
    this.seed(seed || 0);
  }
  Noise.prototype.seed = function (seed) {
    if (seed > 0 && seed < 1) seed *= 65536;
    seed = Math.floor(seed);
    if (seed < 256) seed |= seed << 8;
    for (let i = 0; i < 256; i++) {
      const v = (i & 1) ? this.p[i] ^ (seed & 255) : this.p[i] ^ ((seed >> 8) & 255);
      this.perm[i] = this.perm[i + 256] = v;
      this.gradP[i] = this.gradP[i + 256] = this.grad3[v % 12];
    }
  };
  Noise.prototype.fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  Noise.prototype.lerp = (a, b, t) => (1 - t) * a + t * b;
  Noise.prototype.perlin2 = function (x, y) {
    let X = Math.floor(x), Y = Math.floor(y);
    x -= X; y -= Y; X &= 255; Y &= 255;
    const n00 = this.gradP[X + this.perm[Y]].dot2(x, y);
    const n01 = this.gradP[X + this.perm[Y + 1]].dot2(x, y - 1);
    const n10 = this.gradP[X + 1 + this.perm[Y]].dot2(x - 1, y);
    const n11 = this.gradP[X + 1 + this.perm[Y + 1]].dot2(x - 1, y - 1);
    const u = this.fade(x);
    return this.lerp(this.lerp(n00, n10, u), this.lerp(n01, n11, u), this.fade(y));
  };

  /* ------------------------------------------------------------------ *
   * Color: sale de :root, nunca de un literal                           *
   * ------------------------------------------------------------------ */
  const parseRGBA = (raw, fb) => {
    const m = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?/i.exec(raw || '');
    if (m) return [+m[1], +m[2], +m[3], m[4] == null ? 1 : +m[4]];
    const h = /^#([0-9a-f]{6})$/i.exec((raw || '').trim());
    if (h) {
      const n = parseInt(h[1], 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
    }
    return fb;
  };
  const token = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  const LINE = parseRGBA(token('--wave-line'), [255, 255, 255, 0.62]);
  const STROKE = 'rgba(' + LINE[0] + ',' + LINE[1] + ',' + LINE[2] + ',' + LINE[3] + ')';

  /* Aqui hubo un cambio de tono para el escaparate y se ha quitado: no podia
     verse. El campo es z-index 0 dentro del hero y el telon del escaparate es
     z-index 3 al 93 % de opacidad, asi que del hilo sobrevive un 7 % — del
     orden de 1/255. Recolorear algo que esta tapado es codigo muerto. */

  /* ------------------------------------------------------------------ *
   * Configuracion — mas espaciada y mucho mas tenue que la referencia   *
   * ------------------------------------------------------------------ */
  const cfg = {
    waveSpeedX: 0.0125,
    waveSpeedY: 0.01,
    waveAmpX: 34,
    waveAmpY: 16,
    friction: 0.9,
    tension: 0.01,
    maxCursorMove: 90,
    xGap: 18,
    yGap: 40,
  };

  const noise = new Noise(0.42);         // semilla fija: el tejido no cambia entre cargas
  let lines = [];
  let W = 0, H = 0, dpr = 1;
  const bounds = { w: 0, h: 0, left: 0, top: 0 };
  const mouse = { x: -10, y: 0, lx: 0, ly: 0, sx: 0, sy: 0, v: 0, vs: 0, a: 0, set: false };

  /* Solo el origen. bounds.w/h los fija setSize(); volver a leerlos aqui
     anadia dos lecturas de layout mas por cada movimiento del raton sin
     aportar nada. */
  function measure() {
    const r = host.getBoundingClientRect();
    bounds.left = r.left; bounds.top = r.top;
  }

  function setSize() {
    // offsetWidth/Height y no el rect: el rect se mide DESPUES de las
    // transformaciones CSS, y esto se llama en cada fotograma (misma trampa
    // que documenta brain.js).
    const cw = host.offsetWidth, chh = host.offsetHeight;
    if (!cw || !chh) return false;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);   // 2 was 4x the pixels of a 1x screen for a soft point cloud; 1.5 keeps it crisp at ~2.25x
    const w = Math.round(cw * dpr), h = Math.round(chh * dpr);
    if (w === W && h === H) return false;
    W = w; H = h;
    canvas.width = w; canvas.height = h;
    canvas.style.width = cw + 'px';
    canvas.style.height = chh + 'px';
    bounds.w = cw; bounds.h = chh;
    return true;
  }

  function setLines() {
    const width = bounds.w, height = bounds.h;
    lines = [];
    const oWidth = width + 200, oHeight = height + 30;
    const totalLines = Math.ceil(oWidth / cfg.xGap);
    const totalPoints = Math.ceil(oHeight / cfg.yGap);
    const xStart = (width - cfg.xGap * totalLines) / 2;
    const yStart = (height - cfg.yGap * totalPoints) / 2;
    for (let i = 0; i <= totalLines; i++) {
      const pts = [];
      for (let j = 0; j <= totalPoints; j++) {
        pts.push({
          x: xStart + cfg.xGap * i,
          y: yStart + cfg.yGap * j,
          wave: { x: 0, y: 0 },
          cursor: { x: 0, y: 0, vx: 0, vy: 0 },
        });
      }
      lines.push(pts);
    }
  }

  function movePoints(time) {
    for (let li = 0; li < lines.length; li++) {
      const pts = lines[li];
      for (let pi = 0; pi < pts.length; pi++) {
        const p = pts[pi];
        const move = noise.perlin2(
          (p.x + time * cfg.waveSpeedX) * 2e-3,
          (p.y + time * cfg.waveSpeedY) * 15e-4,
        ) * 12;
        p.wave.x = Math.cos(move) * cfg.waveAmpX;
        p.wave.y = Math.sin(move) * cfg.waveAmpY;

        const dx = p.x - mouse.sx, dy = p.y - mouse.sy;
        const dist = Math.hypot(dx, dy);
        const l = Math.max(150, mouse.vs);
        if (dist < l) {
          const s = 1 - dist / l;
          const f = Math.cos(dist * 1e-3) * s;
          p.cursor.vx += Math.cos(mouse.a) * f * l * mouse.vs * 55e-5;
          p.cursor.vy += Math.sin(mouse.a) * f * l * mouse.vs * 55e-5;
        }
        p.cursor.vx += (0 - p.cursor.x) * cfg.tension;
        p.cursor.vy += (0 - p.cursor.y) * cfg.tension;
        p.cursor.vx *= cfg.friction;
        p.cursor.vy *= cfg.friction;
        p.cursor.x += p.cursor.vx * 2;
        p.cursor.y += p.cursor.vy * 2;
        p.cursor.x = Math.min(cfg.maxCursorMove, Math.max(-cfg.maxCursorMove, p.cursor.x));
        p.cursor.y = Math.min(cfg.maxCursorMove, Math.max(-cfg.maxCursorMove, p.cursor.y));
      }
    }
  }

  const moved = (point, withCursor) => ({
    x: point.x + point.wave.x + (withCursor ? point.cursor.x : 0),
    y: point.y + point.wave.y + (withCursor ? point.cursor.y : 0),
  });

  function drawLines() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, bounds.w, bounds.h);
    ctx.lineWidth = 1;
    ctx.strokeStyle = STROKE;
    ctx.beginPath();
    for (let li = 0; li < lines.length; li++) {
      const points = lines[li];
      let p1 = moved(points[0], false);
      ctx.moveTo(p1.x, p1.y);
      for (let idx = 0; idx < points.length; idx++) {
        const isLast = idx === points.length - 1;
        p1 = moved(points[idx], !isLast);
        const nextPoint = points[idx + 1] || points[points.length - 1];
        const p2 = moved(nextPoint, !isLast);
        ctx.lineTo(p1.x, p1.y);
        if (isLast) ctx.moveTo(p2.x, p2.y);
      }
    }
    ctx.stroke();
  }

  /* ------------------------------------------------------------------ *
   * Raton                                                               *
   * ------------------------------------------------------------------ */
  function updateMouse(cx, cy) {
    /* Si el campo no se esta dibujando, no midas nada. Los oyentes viven en
       `window` y `touchmove` se dispara sin parar en CADA gesto de scroll de
       un movil: sin esta puerta, tres lecturas de layout por evento en una
       pagina que ya esta corriendo el WebGL del planeta, y para un efecto que
       ni siquiera esta en pantalla. */
    if (!running || !booted) return;
    measure();
    mouse.x = cx - bounds.left;
    mouse.y = cy - bounds.top;
    if (!mouse.set) {
      mouse.sx = mouse.x; mouse.sy = mouse.y;
      mouse.lx = mouse.x; mouse.ly = mouse.y;
      mouse.set = true;
    }
  }
  const onMouseMove = e => updateMouse(e.clientX, e.clientY);
  const onTouchMove = e => {
    if (!e.touches || !e.touches.length) return;
    updateMouse(e.touches[0].clientX, e.touches[0].clientY);
  };

  /* ------------------------------------------------------------------ *
   * Bucle                                                               *
   * ------------------------------------------------------------------ */
  let raf = 0, running = true, booted = false;

  function step(t) {
    mouse.sx += (mouse.x - mouse.sx) * 0.1;
    mouse.sy += (mouse.y - mouse.sy) * 0.1;
    const dx = mouse.x - mouse.lx, dy = mouse.y - mouse.ly;
    const d = Math.hypot(dx, dy);
    mouse.v = d;
    mouse.vs += (d - mouse.vs) * 0.1;
    mouse.vs = Math.min(90, mouse.vs);
    mouse.lx = mouse.x; mouse.ly = mouse.y;
    mouse.a = Math.atan2(dy, dx);
    movePoints(t);
    drawLines();
  }

  function frame(t) {
    raf = 0;
    if (!running) return;
    if (setSize()) setLines();
    step(t);
    raf = requestAnimationFrame(frame);
  }
  function start() {
    if (raf || reduce || !running) return;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  function boot() {
    if (!setSize()) return false;
    setLines();
    booted = true;
    if (reduce) step(0);
    else start();
    return true;
  }

  if (!boot()) {
    // el hero aun no tiene caja (fuentes en vuelo): reintenta en el siguiente frame
    requestAnimationFrame(() => { boot(); });
  }

  /* ResizeObserver sobre el propio hero, no `resize` de window.
     Por debajo de 901px el hero es `height: auto`, asi que su caja cambia sin
     que la ventana cambie de tamano — cuando aterriza Geist, por ejemplo. Con
     movimiento reducido no hay bucle que vuelva a llamar a setSize(), y el
     lienzo se quedaba con su tamano viejo: una banda sin pintar al pie del
     hero hasta el siguiente giro de pantalla. `resize` de window no ve nada de
     eso; el observador si. */
  const onBox = () => {
    if (!booted) { boot(); return; }
    if (setSize()) setLines();
    // un lienzo redimensionado se queda en blanco si nadie lo repinta, y con
    // movimiento reducido no hay bucle que lo haga (misma trampa que brain.js)
    if (!raf) step(performance.now());
  };
  if ('ResizeObserver' in window) {
    let pending = false;
    new ResizeObserver(() => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => { pending = false; onBox(); });
    }).observe(host);
  } else {
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(onBox, 150);
    }, { passive: true });
  }

  if (!reduce) {
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
  }

  /* pausa mientras el hero no se ve */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      entries.forEach(e => {
        running = e.isIntersecting;
        if (running) { if (reduce) { if (booted) step(performance.now()); } else start(); }
        else stop();
      });
    }, { threshold: 0 }).observe(hero);
  }

})();
