/* HOLDERA — fish.js
   The "Qué hacemos" hologram: six fish circling a funnel of eight rings.

   Geometry comes from fish-hologram/source/fishHologram.fbx via
   _build/fish-extract.py. The six fish in that file are SIX COPIES OF ONE MESH
   (identical topology, 1694 verts), so the mesh is uploaded once and drawn six
   times with a per-draw matrix — 33 KB of geometry for the whole scene.

   The eight rings are NOT drawn here. Alex's brief replaces them with text, so
   they live in the DOM as .fring elements and this module only positions and
   spins them. That is deliberate: the words are real text, so they are
   selectable, searchable, readable by a screen reader and present with no JS.

   Because the words are DOM and the fish are WebGL, the two have to agree about
   where "in 3D" is. They do: setScene() derives the CSS perspective and the
   world->pixel scale from the SAME focal length the GL projection uses, so a
   ring at world radius r lands exactly where a fish at world radius r does.
   See the derivation above setScene().

   Degradation, in order:
     · no JS      → rings render as a plain readable list, no canvas
     · no WebGL   → same list, canvas stays hidden, no poster needed because the
                    text IS the content here
     · fetch fails→ same
     · reduced motion → one frame, rings placed but not spinning */
(() => {
  'use strict';

  const section = document.querySelector('[data-fish-scene]');
  if (!section) return;
  const canvas = section.querySelector('[data-fish]');
  const stage = section.querySelector('.fscene');
  const rings = Array.prototype.slice.call(section.querySelectorAll('.fring'));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const POS_URL = 'assets/model/fish-pos.bin';
  const NRM_URL = 'assets/model/fish-nrm.bin';
  const IDX_URL = 'assets/model/fish-idx.bin';
  const META_URL = 'assets/model/fish-scene.json';

  /* ------------------------------------------------------------------ *
   * Scene constants — shared by the GL camera and the CSS rings         *
   * ------------------------------------------------------------------ */
  const FOV = 42 * Math.PI / 180;
  const FIT_ASPECT = 0.95;      // below this the frustum opens vertically, so a
                                // narrow canvas behaves like object-fit: contain
                                // instead of cropping the scene left and right
  /* The camera pulls IN on a narrow canvas. FIT_ASPECT already stops a
     portrait canvas from cropping the funnel, but 'do not crop' and 'fill the
     box' are different things: at 390px the funnel ended up 170px wide inside
     a 390x420 stage, marooned in empty space. */
  const CAM_Z_WIDE = 3.00, CAM_Z_NARROW = 3.30;
  let CAM_Z = CAM_Z_WIDE;
  const PITCH = 0.30;           // looking slightly down onto the funnel

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  /* ------------------------------------------------------------------ *
   * Ring placement                                                      *
   *                                                                     *
   * GL puts a world point (x, y, z) at, in pixels from the canvas centre*
   *     px = f * (H/2) * y / (CAM_Z - z)                                *
   * with f = 1/tan(fov/2).                                              *
   *                                                                     *
   * CSS with `perspective: P` puts an element translated (Ty, Tz) at    *
   *     px = Ty * P / (P - Tz)                                          *
   *                                                                     *
   * Substituting Ty = S*y, Tz = S*z and P = S*CAM_Z makes the two       *
   * identical for every point, where S = f*H/(2*CAM_Z) is the pixels per*
   * world unit at z = 0. So: perspective = f*H/2, scale = that / CAM_Z. *
   * ------------------------------------------------------------------ */
  function setScene(w, h) {
    CAM_Z = w <= 900 ? CAM_Z_NARROW : CAM_Z_WIDE;
    const aspect = w / h;
    const fovY = aspect >= FIT_ASPECT ? FOV : 2 * Math.atan(Math.tan(FOV / 2) * FIT_ASPECT / aspect);
    const f = 1 / Math.tan(fovY / 2);
    const persp = f * h / 2;
    const scale = persp / CAM_Z;
    if (stage) {
      stage.style.setProperty('--persp', persp.toFixed(2) + 'px');
      stage.style.setProperty('--u', scale.toFixed(4) + 'px');
      /* NEGATED on purpose. GL's +Y is up the screen, CSS's +Y is DOWN it, so
         the same rotateX angle tilts the two scenes opposite ways: at +PITCH
         the CSS rings would be seen from BELOW while the fish are seen from
         above. Placement negates Y for the same reason (translateY(-y*u)). */
      stage.style.setProperty('--pitch', (-PITCH * 180 / Math.PI).toFixed(3) + 'deg');
    }
    return { fovY, scale };
  }

  /* Rings are laid out from the SAME numbers the extractor wrote, so moving a
     ring in Blender moves the words with it. */
  function placeRings(meta) {
    if (!meta || !meta.rings) return;
    // fitWords() needs --u, and nothing has set it at this point in the boot
    if (stage && stage.offsetWidth) setScene(stage.offsetWidth, stage.offsetHeight);
    const src = meta.rings;
    /* RADIUS comes from the model — that progression is what gives the funnel
       its silhouette. HEIGHT does not: the artist bunched four rings into the
       bottom 0.23 units, which is fine for hairline hoops and unreadable for
       words, because at this scale that is ~20px between two lines of text.
       So the stack is respaced evenly over the model's own full height range,
       keeping the cone and giving every phrase room. */
    const ys = src.map(r => r.centre[1]);
    const yMin = Math.min.apply(null, ys), yMax = Math.max.apply(null, ys);
    const stepY = src.length > 1 ? (yMax - yMin) / (src.length - 1) : 0;

    rings.forEach((el, i) => {
      const r = src[i % src.length];
      if (!r) return;
      el.style.setProperty('--i', i);
      el.style.setProperty('--ry', (yMin + stepY * (i % src.length)).toFixed(4));
      el.style.setProperty('--rr', r.radius.toFixed(4));
    });
    section.classList.add('is-placed');
    fitWords();
  }

  /* How many copies of a phrase go round a ring.
   *
   * Two was not enough: the words are tangential (wrapped on the cylinder, not
   * billboarded) so a copy is unreadable as it passes the left and right edges,
   * and with copies only at 0 and 180 degrees BOTH are edge-on half the time —
   * the ring goes blank. Filling the circumference instead turns each ring into
   * a continuous BAND of text: whatever the rotation, the arc facing you reads.
   *
   * The count is measured, not guessed, because the phrases differ in length by
   * more than 2x and the radii by 2.5x, so any fixed number is wrong somewhere.
   */
  const GAP = 46;                       // px of breathing room between copies
  function fitWords() {
    const u = parseFloat(getComputedStyle(stage).getPropertyValue('--u')) || 0;
    if (!u) return;
    rings.forEach(el => {
      const first = el.querySelector('.fring__w');
      if (!first) return;
      const radius = parseFloat(el.style.getPropertyValue('--rr')) || 0.4;
      const circumference = 2 * Math.PI * radius * u;
      // measure the phrase unrotated, or the 3D transform skews the width
      const w = first.getBoundingClientRect().width || first.offsetWidth || 120;
      const want = clamp(Math.floor(circumference / (w + GAP)), 2, 8);

      let copies = el.querySelectorAll('.fring__w');
      while (copies.length > want) {
        // never remove the first: it is the one the screen reader gets and the
        // only one that shows if JS dies after this point
        el.removeChild(copies[copies.length - 1]);
        copies = el.querySelectorAll('.fring__w');
      }
      while (copies.length < want) {
        const clone = first.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        el.appendChild(clone);
        copies = el.querySelectorAll('.fring__w');
      }
      copies.forEach((c, k) => {
        c.style.setProperty('--k', k);
        c.style.setProperty('--n', copies.length);
      });
    });
  }

  /* Ring spin. Bigger rings turn slower, which is what makes the stack read as
     one object rather than eight unrelated hoops.

     Each word is also faded by how squarely it faces the camera.
     backface-visibility already removes the back half, but that leaves a word
     snapping from a hard-to-read vertical sliver straight to nothing at the
     edges. Fading it out before it gets there makes the band read as one
     rotating object instead of text flickering in and out. */
  function spinRings(t, prog) {
    for (let i = 0; i < rings.length; i++) {
      const el = rings[i];
      const dir = i % 2 ? -1 : 1;      // alternate, so neighbouring bands shear
      const speed = 0.055 - i * 0.0035;
      const rad = dir * (t * speed + prog * 1.15);
      el.style.setProperty('--spin', (rad * 180 / Math.PI).toFixed(2) + 'deg');

      const words = el.querySelectorAll('.fring__w');
      for (let k = 0; k < words.length; k++) {
        // a word sits at k/n of the way round, and faces the camera when the
        // ring's rotation brings that angle back to zero
        const facing = Math.cos(rad + (k / words.length) * Math.PI * 2);
        const o = clamp((facing - 0.10) / 0.45, 0, 1);
        // only write when it actually moved: this runs every frame over up to
        // ~40 elements and a style write per element per frame is real cost
        const prev = words[k]._o;
        if (prev === undefined || Math.abs(prev - o) > 0.02) {
          words[k].style.opacity = o.toFixed(3);
          words[k]._o = o;
        }
      }
    }
  }

  /* ------------------------------------------------------------------ *
   * Scroll progress across the section                                  *
   * ------------------------------------------------------------------ */
  let progress = 0;
  function readProgress() {
    const r = section.getBoundingClientRect();
    const range = r.height + window.innerHeight;
    if (range <= 4) return 0;
    return clamp((window.innerHeight - r.top) / range, 0, 1);
  }
  let scrollPending = false;
  window.addEventListener('scroll', () => {
    if (scrollPending) return;
    scrollPending = true;
    requestAnimationFrame(() => { scrollPending = false; progress = readProgress(); });
  }, { passive: true });
  progress = readProgress();

  /* ------------------------------------------------------------------ *
   * GL                                                                  *
   * ------------------------------------------------------------------ */
  let gl = null;
  if (canvas) {
    try {
      const opts = { alpha: true, antialias: true, depth: true, premultipliedAlpha: true, powerPreference: 'low-power' };
      gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
    } catch (e) { gl = null; }
  }

  // The rings are the content, so losing GL costs the fish and nothing else.
  // Place the rings first and only then try to draw, so a GL failure at any
  // later point still leaves a laid-out, spinning ring stack.
  fetch(META_URL)
    .then(r => (r.ok ? r.json() : null))
    .then(meta => {
      if (meta) placeRings(meta);
      if (!gl || !meta) { if (!gl) startRingsOnly(); return; }
      return boot(meta);
    })
    .catch(() => startRingsOnly());

  function startRingsOnly() {
    section.classList.add('is-ringsonly');
    loopRings();
  }

  const VERT = [
    'precision highp float;',
    'attribute vec3 aPos;',
    'attribute vec3 aNrm;',
    'uniform mat4 uMVP;',
    'uniform mat3 uNormalM;',
    'uniform mat4 uMV;',
    'varying float vFacing;',
    'varying float vY;',
    'varying float vDepth;',
    'void main() {',
    '  vec4 mv = uMV * vec4(aPos, 1.0);',
    '  gl_Position = uMVP * vec4(aPos, 1.0);',
    '  vec3 n = normalize(uNormalM * aNrm);',
    // view direction is from the point back to the camera at the origin
    '  vec3 v = normalize(-mv.xyz);',
    '  vFacing = clamp(dot(n, v), 0.0, 1.0);',
    '  vY = mv.y;',
    '  vDepth = max(-mv.z, 0.001);',
    '}',
  ].join('\n');

  const FRAG = [
    'precision mediump float;',
    'uniform vec3 uCore;',
    'uniform vec3 uRim;',
    'uniform float uAlpha;',
    'uniform float uScan;',
    'varying float vFacing;',
    'varying float vY;',
    'varying float vDepth;',
    'void main() {',
    // Fresnel: a hologram is bright exactly where the surface turns away, which
    // is what draws the silhouette and the interior contours at the same time.
    '  float fres = pow(1.0 - vFacing, 2.2);',
    // horizontal scanlines, in VIEW space so they stay level while a fish rolls
    '  float scan = 0.78 + 0.22 * sin(vY * 88.0 + uScan);',
    '  float body = 0.05 + 0.16 * vFacing;',
    '  vec3 c = uCore * body + uRim * fres * 1.15;',
    '  float a = (body * 0.42 + fres * 0.80) * scan * uAlpha;',
    // fade the far fish so the funnel keeps its depth
    '  a *= clamp(1.25 - vDepth * 0.20, 0.25, 1.0);',
    '  gl_FragColor = vec4(c * a, a);',   // premultiplied
    '}',
  ].join('\n');

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('[Holdera] fish shader:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  const cssRGB = (name, fb) => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const m = /^#([0-9a-f]{6})$/i.exec(raw);
    const hex = m ? m[1] : fb;
    return [
      parseInt(hex.slice(0, 2), 16) / 255,
      parseInt(hex.slice(2, 4), 16) / 255,
      parseInt(hex.slice(4, 6), 16) / 255,
    ];
  };

  /* --- tiny mat4, column-major, same convention as brain.js --- */
  const perspective = (fovY, aspect, near, far) => {
    const f = 1 / Math.tan(fovY / 2), nf = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0,
    ]);
  };
  const mul = (a, b) => {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
      }
    }
    return o;
  };

  let prog, A, U, count = 0, ready = false, raf = 0, running = true;
  let fishes = [], scale = 1, revealStart = 0;
  let W = 0, H = 0;

  function boot(meta) {
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { startRingsOnly(); return; }
    prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('[Holdera] fish link:', gl.getProgramInfoLog(prog));
      startRingsOnly(); return;
    }
    gl.useProgram(prog);
    A = { pos: gl.getAttribLocation(prog, 'aPos'), nrm: gl.getAttribLocation(prog, 'aNrm') };
    U = {};
    ['uMVP', 'uMV', 'uNormalM', 'uCore', 'uRim', 'uAlpha', 'uScan']
      .forEach(k => { U[k] = gl.getUniformLocation(prog, k); });

    return Promise.all([
      fetch(POS_URL).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }),
      fetch(NRM_URL).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }),
      fetch(IDX_URL).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }),
    ]).then(([pb, nb, ib]) => {
      const q = new Int16Array(pb);
      const Q = meta.fish.quant;
      const n = (q.length / 3) | 0;
      const pos = new Float32Array(n * 3);
      for (let i = 0; i < n * 3; i++) pos[i] = q[i] * Q;

      const ni = new Int8Array(nb);
      const nrm = new Float32Array(n * 3);
      for (let i = 0; i < n * 3; i++) nrm[i] = ni[i] / 127;

      const idx = new Uint16Array(ib);
      count = idx.length;

      const bind = (data, loc, comps) => {
        const b = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, b);
        gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, comps, gl.FLOAT, false, 0, 0);
      };
      bind(pos, A.pos, 3);
      bind(nrm, A.nrm, 3);
      const eb = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, eb);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);

      /* The mesh's long axis is LOCAL +Y (measured: 11.2 x 20.5 x 9.9 in the
         FBX's own units), so "forward" for a fish is its local +Y. Each fish is
         given an orbit derived from where the artist actually put it: same
         radius, same height, same starting angle. */
      // 0.62: at full model scale the fish are as long as a ring is wide and the
      // composition becomes six fish with some text behind them. The rings are
      // the content here, so the shoal is dressed down to a supporting role.
      scale = (meta.fish.instances[0] ? meta.fish.instances[0].scale : 0.0364) * 0.62;
      fishes = meta.fish.instances.map((f, i) => {
        const [x, y, z] = f.centre;
        return {
          r: Math.hypot(x, z),
          a0: Math.atan2(z, x),
          y: y,
          // alternate direction so the shoal does not read as a carousel
          dir: i % 2 ? -1 : 1,
          speed: 0.085 + (i % 3) * 0.022,
          bob: 0.05 + (i % 4) * 0.012,
          phase: i * 1.7,
        };
      });

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);   // premultiplied
      gl.disable(gl.DEPTH_TEST);   // additive-ish hologram: order does not matter
      gl.clearColor(0, 0, 0, 0);

      gl.uniform3fv(U.uCore, cssRGB('--fish-core', 'c9b9a4'));
      gl.uniform3fv(U.uRim, cssRGB('--fish-rim', 'f08a24'));

      ready = true;
      section.classList.add('is-live');
      resize();
      revealStart = performance.now();
      start();
    }).catch(err => {
      console.warn('[Holdera] fish geometry unavailable:', err);
      startRingsOnly();
    });
  }

  /* ------------------------------------------------------------------ *
   * Sizing — offsetWidth/Height, not getBoundingClientRect: the rect is *
   * measured after CSS transforms and this runs every frame.           *
   * ------------------------------------------------------------------ */
  let dpr = 1;
  function resize() {
    const host = canvas || stage;
    if (!host) return;
    const cw = host.offsetWidth, ch = host.offsetHeight;
    if (!cw || !ch) return;
    setScene(cw, ch);
    if (!gl || !canvas) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(cw * dpr), h = Math.round(ch * dpr);
    if (w === W && h === H) return;
    W = w; H = h;
    canvas.width = w; canvas.height = h;
    gl.viewport(0, 0, w, h);
  }

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
      fitWords();
      // a resized canvas is a blank canvas; with no loop running nothing would
      // ever repaint it
      if (!raf && ready) draw(performance.now());
    }, 150);
  }, { passive: true });

  /* ------------------------------------------------------------------ *
   * Per-fish model matrix: position on its orbit, nose along the tangent*
   * ------------------------------------------------------------------ */
  function fishMatrix(f, t, prog01) {
    const ang = f.a0 + f.dir * (t * f.speed + prog01 * 0.85);
    const y = f.y + Math.sin(t * 0.6 + f.phase) * f.bob;
    const px = Math.cos(ang) * f.r, pz = Math.sin(ang) * f.r;

    // forward = d/dang of the orbit = (-sin, 0, cos), scaled by direction
    const fx = -Math.sin(ang) * f.dir, fz = Math.cos(ang) * f.dir;
    // a small roll into the turn, so they bank like something alive
    const bank = 0.26 * f.dir;
    const ux = Math.cos(ang) * Math.sin(bank), uy = Math.cos(bank), uz = Math.sin(ang) * Math.sin(bank);
    // right = forward x up
    const rx = 0 * uz - fz * uy, ry = fz * ux - fx * uz, rz = fx * uy - 0 * ux;
    const rl = Math.hypot(rx, ry, rz) || 1;

    const s = scale;
    // columns are the images of local X, Y (the nose) and Z
    const m = new Float32Array(16);
    m[0] = (rx / rl) * s; m[1] = (ry / rl) * s; m[2] = (rz / rl) * s; m[3] = 0;
    m[4] = fx * s;        m[5] = 0;             m[6] = fz * s;        m[7] = 0;
    m[8] = ux * s;        m[9] = uy * s;        m[10] = uz * s;       m[11] = 0;
    m[12] = px;           m[13] = y;            m[14] = pz;           m[15] = 1;
    return m;
  }

  // camera: pitch down onto the funnel, then push the scene away
  function viewMatrix() {
    const cx = Math.cos(PITCH), sx = Math.sin(PITCH);
    return new Float32Array([
      1, 0, 0, 0,
      0, cx, sx, 0,
      0, -sx, cx, 0,
      0, 0, -CAM_Z, 1,
    ]);
  }

  function draw(now) {
    if (typeof now !== 'number') now = performance.now();
    const t = now / 1000;
    resize();
    if (!W || !H || !ready) return;

    const aspect = W / H;
    const fovY = aspect >= FIT_ASPECT ? FOV : 2 * Math.atan(Math.tan(FOV / 2) * FIT_ASPECT / aspect);
    const proj = perspective(fovY, aspect, 0.1, 40);
    const view = viewMatrix();
    const reveal = reduce ? 1 : clamp((now - revealStart) / 1500, 0, 1);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(U.uAlpha, reveal);
    gl.uniform1f(U.uScan, reduce ? 0 : t * 2.2);

    for (let i = 0; i < fishes.length; i++) {
      // With reduced motion the pose must not depend on time OR scroll: this
      // draws a single frame that can be repainted at any moment, and a moving
      // pose would make that repaint jump.
      const model = fishMatrix(fishes[i], reduce ? 0 : t, reduce ? 0 : progress);
      const mv = mul(view, model);
      const mvp = mul(proj, mv);
      gl.uniformMatrix4fv(U.uMVP, false, mvp);
      gl.uniformMatrix4fv(U.uMV, false, mv);
      const s = scale || 1;
      gl.uniformMatrix3fv(U.uNormalM, false, new Float32Array([
        mv[0] / s, mv[1] / s, mv[2] / s,
        mv[4] / s, mv[5] / s, mv[6] / s,
        mv[8] / s, mv[9] / s, mv[10] / s,
      ]));
      gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);
    }
  }

  function frame(now) {
    raf = 0;
    if (!running) return;
    if (ready) draw(now);
    if (!reduce) spinRings(now / 1000, progress);
    if (!reduce) raf = requestAnimationFrame(frame);
  }
  function start() {
    if (!raf && running) raf = requestAnimationFrame(frame);
  }
  function loopRings() {
    // no GL, but the rings still deserve their spin
    if (!reduce) start();
    else spinRings(0, 0);
  }

  if (reduce) { spinRings(0, 0); }

  /* pause while off screen */
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      entries.forEach(e => {
        running = e.isIntersecting;
        if (running) {
          if (reduce) { if (ready) draw(performance.now()); }
          else start();
        }
      });
    }, { threshold: 0 }).observe(section);
  }

  if (canvas) {
    canvas.addEventListener('webglcontextlost', e => {
      e.preventDefault();
      ready = false;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      section.classList.remove('is-live');
      startRingsOnly();
    }, false);
  }
})();
