/* HOLDERA — planet.js
   "Cómo trabajamos": a textured planet that turns with the scroll while the
   four steps slide past it.

   This is the "Scroll-Spinning Earth" component Alex sent, rebuilt for this
   project's stack. The reference is Next + react-three-fiber + framer-motion-3d
   + drei + Lenis (~1.5 MB of dependencies for one lit sphere). None of that
   ships here: the page is hand-written vanilla with no build step, and there is
   already a precedent for raw WebGL in brain.js and fish.js. So the sphere is
   generated in JS, lit with one directional light exactly like the reference's
   <directionalLight intensity={3.5} position={[1,0,-.25]} />, and Lenis's
   smoothing is replaced by an exponential lerp toward the scroll target — which
   is all Lenis was contributing to the rotation.

   Textures come from hologram-gezegen (Alex's asset) via
   _build/planet-textures.js. The source map is CYAN; it is re-themed to the
   project's own palette at build time, per the reference prompt's own
   instruction not to copy the reference palette.

   Degradation, in order:
     · no JS       → the four steps render as a normal list, no canvas
     · no WebGL    → same; the canvas never reveals itself
     · no textures → same
     · reduced motion → the planet is drawn once, unrotated, and never moves
   The titles are never hidden behind any of this: they are ordinary markup and
   the planet is decoration behind them. */
(() => {
  'use strict';

  const section = document.querySelector('[data-planet-scene]');
  if (!section) return;
  const canvas = section.querySelector('[data-planet]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const COLOR_URL = 'assets/img/planet-color.jpg';
  const CLOUD_URL = 'assets/img/planet-clouds.jpg';

  const FOV = 45 * Math.PI / 180;
  const FIT_ASPECT = 1.0;
  const CAM_Z = 3.05;
  const TILT = -0.36;                // axial tilt, so it is not a spinning ball
  const SEGS_X = 72, SEGS_Y = 48;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  let gl = null;
  try {
    const opts = { alpha: true, antialias: true, depth: true, premultipliedAlpha: true, powerPreference: 'low-power' };
    gl = canvas && (canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts));
  } catch (e) { gl = null; }
  if (!gl) return;                   // the steps are the content; nothing to do

  const VERT = [
    'precision highp float;',
    'attribute vec3 aPos;',
    'attribute vec2 aUV;',
    'uniform mat4 uMVP;',
    'uniform mat3 uNormalM;',
    'varying vec2 vUV;',
    'varying vec3 vN;',
    'varying vec3 vPosV;',
    'uniform mat4 uMV;',
    'void main() {',
    '  vUV = aUV;',
    // a unit sphere's position IS its normal
    '  vN = normalize(uNormalM * aPos);',
    '  vec4 mv = uMV * vec4(aPos, 1.0);',
    '  vPosV = mv.xyz;',
    '  gl_Position = uMVP * vec4(aPos, 1.0);',
    '}',
  ].join('\n');

  const FRAG = [
    'precision mediump float;',
    'uniform sampler2D uTex;',
    'uniform float uCloud;',          // 1 when drawing the cloud shell
    'uniform float uAlpha;',
    'uniform vec3 uRim;',
    'uniform vec3 uCloudCol;',
    'varying vec2 vUV;',
    'varying vec3 vN;',
    'varying vec3 vPosV;',
    'void main() {',
    // the reference's single directional light, same direction
    '  vec3 L = normalize(vec3(1.0, 0.0, -0.25));',
    '  float lam = clamp(dot(vN, L), 0.0, 1.0);',
    // ambientLight intensity 0.1 in the reference; the terminator is softened a
    // little so the night side is readable rather than pure black
    '  float light = 0.10 + 1.30 * lam;',
    '  vec3 V = normalize(-vPosV);',
    '  float fres = pow(1.0 - clamp(dot(vN, V), 0.0, 1.0), 3.0);',
    '  vec4 t = texture2D(uTex, vUV);',
    '  if (uCloud > 0.5) {',
    // the cloud map ships as GREYSCALE and is used as an alpha mask, so no
    // alpha channel has to be transported
    '    float a = t.r * 0.42 * light * uAlpha;',
    '    gl_FragColor = vec4(uCloudCol * a, a);',
    '  } else {',
    '    vec3 c = t.rgb * light;',
    // the limb catches the light, which is what makes a flat-lit sphere read as
    // a globe rather than a disc
    '    c += uRim * fres * 0.42;',
    '    float a = uAlpha;',
    '    gl_FragColor = vec4(c * a, a);',
    '  }',
    '}',
  ].join('\n');

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('[Holdera] planet shader:', gl.getShaderInfoLog(s));
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

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('[Holdera] planet link:', gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  const A = { pos: gl.getAttribLocation(prog, 'aPos'), uv: gl.getAttribLocation(prog, 'aUV') };
  const U = {};
  ['uMVP', 'uMV', 'uNormalM', 'uTex', 'uCloud', 'uAlpha', 'uRim', 'uCloudCol']
    .forEach(k => { U[k] = gl.getUniformLocation(prog, k); });

  /* ---- UV sphere ---- */
  const verts = [], uvs = [], idx = [];
  for (let y = 0; y <= SEGS_Y; y++) {
    const v = y / SEGS_Y;
    const phi = v * Math.PI;                    // 0 at the north pole
    for (let x = 0; x <= SEGS_X; x++) {
      const u = x / SEGS_X;
      const theta = u * Math.PI * 2;
      verts.push(
        -Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta)
      );
      // v is flipped: image row 0 is the top of the map, which is the north pole
      uvs.push(u, v);
    }
  }
  for (let y = 0; y < SEGS_Y; y++) {
    for (let x = 0; x < SEGS_X; x++) {
      const a = y * (SEGS_X + 1) + x, b = a + SEGS_X + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const count = idx.length;

  const bind = (data, loc, comps) => {
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, comps, gl.FLOAT, false, 0, 0);
  };
  bind(new Float32Array(verts), A.pos, 3);
  bind(new Float32Array(uvs), A.uv, 2);
  const eb = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, eb);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);

  /* ---- textures ---- */
  function loadTexture(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const t = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
        // both maps are power-of-two (2048x1024, 1024x512) so mipmaps are legal
        // and worth it: the poles squeeze many texels into few pixels
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        // repeat around the seam in X, clamp at the poles in Y
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        resolve(t);
      };
      img.onerror = () => reject(new Error('texture failed: ' + url));
      img.src = url;
    });
  }

  let texColor = null, texCloud = null, ready = false, raf = 0, running = true;
  let W = 0, H = 0, dpr = 1;
  let spin = 0, spinTarget = 0, revealStart = 0;

  const RIM = cssRGB('--planet-rim', 'f0a24c');
  const CLOUD = cssRGB('--planet-cloud', 'e8ded0');

  /* The two maps (410 KB) were half the page weight and the planet sits two
     screens down: fetch them when the section comes within a viewport of the
     fold, not at load. Without IntersectionObserver, fetch at once as before. */
  let booted = false;
  const boot = () => {
    if (booted) return;
    booted = true;
    Promise.all([loadTexture(COLOR_URL), loadTexture(CLOUD_URL)])
    .then(([c, cl]) => {
      texColor = c; texCloud = cl;
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.CULL_FACE);
      gl.cullFace(gl.BACK);
      gl.clearColor(0, 0, 0, 0);
      gl.uniform3fv(U.uRim, RIM);
      gl.uniform3fv(U.uCloudCol, CLOUD);
      ready = true;
      section.classList.add('is-live');
      resize();
      revealStart = performance.now();
      spin = spinTarget = readProgress() * Math.PI * 2;
      start();
    })
    .catch(err => console.warn('[Holdera] planet:', err.message));
  };
  if ('IntersectionObserver' in window) {
    const near = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { near.disconnect(); boot(); }
    }, { rootMargin: '60% 0px' });
    near.observe(section);
  } else boot();

  function resize() {
    if (!canvas) return;
    const cw = canvas.offsetWidth, ch = canvas.offsetHeight;
    if (!cw || !ch) return;
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
      if (!raf && ready) draw(performance.now());
    }, 150);
  }, { passive: true });

  /* The reference's useScroll offset ['start end', 'end start'] — 0 when the
     section's top hits the bottom of the viewport, 1 when its bottom leaves the
     top. Reproduced exactly, so the rotation matches. */
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
    requestAnimationFrame(() => {
      scrollPending = false;
      // the reference feeds scrollYProgress (0..1) straight into rotation-y, so
      // one full pass of the section is one radian; a full turn reads better at
      // this size, hence the 2*PI
      spinTarget = readProgress() * Math.PI * 2;
    });
  }, { passive: true });

  function modelMatrix(yaw, tilt) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cz = Math.cos(tilt), sz = Math.sin(tilt);
    // Rz(tilt) * Ry(yaw), column-major
    return new Float32Array([
      cz * cy, sz * cy, -sy, 0,
      -sz, cz, 0, 0,
      cz * sy, sz * sy, cy, 0,
      0, 0, 0, 1,
    ]);
  }
  const view = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -CAM_Z, 1]);

  function draw(now) {
    if (typeof now !== 'number') now = performance.now();
    resize();
    if (!W || !H || !ready) return;

    // Lenis's job, without Lenis: ease the rotation toward the scroll target so
    // the planet glides instead of stepping with each scroll event.
    if (reduce) spin = 0;
    else spin += (spinTarget - spin) * 0.075;

    const aspect = W / H;
    const fovY = aspect >= FIT_ASPECT ? FOV : 2 * Math.atan(Math.tan(FOV / 2) * FIT_ASPECT / aspect);
    const proj = perspective(fovY, aspect, 0.1, 40);
    const model = modelMatrix(spin, TILT);
    const mv = mul(view, model);
    const mvp = mul(proj, mv);
    const reveal = reduce ? 1 : clamp((now - revealStart) / 1200, 0, 1);

    gl.uniformMatrix4fv(U.uMVP, false, mvp);
    gl.uniformMatrix4fv(U.uMV, false, mv);
    gl.uniformMatrix3fv(U.uNormalM, false, new Float32Array([
      mv[0], mv[1], mv[2], mv[4], mv[5], mv[6], mv[8], mv[9], mv[10],
    ]));

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // surface
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texColor);
    gl.uniform1i(U.uTex, 0);
    gl.uniform1f(U.uCloud, 0);
    gl.uniform1f(U.uAlpha, reveal);
    gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);

    // clouds, on the same geometry pushed out a hair. depthFunc LEQUAL plus a
    // slightly slower yaw is enough separation without a second buffer.
    const cloudModel = modelMatrix(spin * 1.06, TILT);
    const cmv = mul(view, cloudModel);
    // scale the shell out by 1.5%
    for (let i = 0; i < 11; i++) if (i % 4 !== 3) cmv[i] *= 1.015;
    gl.uniformMatrix4fv(U.uMVP, false, mul(proj, cmv));
    gl.uniformMatrix4fv(U.uMV, false, cmv);
    gl.bindTexture(gl.TEXTURE_2D, texCloud);
    gl.uniform1f(U.uCloud, 1);
    gl.drawElements(gl.TRIANGLES, count, gl.UNSIGNED_SHORT, 0);
  }

  function frame(now) {
    raf = 0;
    if (!running || !ready) return;
    draw(now);
    if (!reduce) raf = requestAnimationFrame(frame);
  }
  function start() { if (!raf && running && ready) raf = requestAnimationFrame(frame); }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      entries.forEach(e => {
        running = e.isIntersecting;
        if (running && ready) { if (reduce) draw(performance.now()); else start(); }
      });
    }, { threshold: 0 }).observe(section);
  }

  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    ready = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    section.classList.remove('is-live');
  }, false);
})();
