/* HOLDERA — brain.js
   The hero hologram: a 10.000-point cloud of the brain, drawn in raw WebGL.

   Why no three.js: the scene is one static point cloud with a scroll-driven
   pose. A hand-written program is ~9 KB against ~600 KB of library, adds no CDN
   that can fail, and keeps the page the hand-coded vanilla build it is meant to
   be (see CLAUDE.md). The geometry is assets/model/brain-points.bin — int16 XYZ
   pulled out of brain-hologram/source/Brain.fbx by _build/brain-extract.py.

   Degradation, in order:
     · no JS        → the poster <img> is already in the markup and stays
     · no WebGL     → same, the canvas never reveals itself
     · fetch fails  → same
     · reduced motion → the cloud renders, fully assembled, and never moves

   This module is the ONLY writer of the figure's pose while scrolling. GSAP in
   script.js deliberately does not tween .hero__figure any more: two writers on
   one transform fight, so the drift and spin happen inside the scene instead. */
(() => {
  'use strict';

  const canvas = document.querySelector('[data-brain]');
  if (!canvas) return;
  const figure = canvas.closest('.hero__figure');
  const stage = document.querySelector('.hero-stage');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const POINTS_URL = 'assets/model/brain-points.bin';
  const SIZES_URL = 'assets/model/brain-sizes.bin';
  /* Surface data, computed from the cloud itself by _build/brain-shade.js.
     Without it every point is the same ink and a random 10% is accent, which is
     why the old cloud read as confetti in a blob: nothing in the shader knew
     where the folds were. aNrm gives the surface direction, aCav says whether a
     point sits in a sulcus (crease) or on a gyrus (crown). Both are optional —
     if either fetch fails the shader falls back to the flat look rather than
     dropping to the poster, because a flat brain still beats no brain. */
  const NRM_URL = 'assets/model/brain-nrm.bin';
  const SHADE_URL = 'assets/model/brain-shade.bin';
  const QUANT = 1.2 / 32767;          // matches brain-extract.py
  const DESKTOP = window.matchMedia('(min-width: 901px)');

  /* ------------------------------------------------------------------ *
   * GL context                                                          *
   * ------------------------------------------------------------------ */
  // every giving-up path routes through here, which is what puts the poster on
  // screen: .is-fallback is the only thing that gives it a background-image
  const fallback = reason => {
    if (reason) console.warn('[Holdera] brain hologram:', reason);
    if (figure) { figure.classList.remove('is-live'); figure.classList.add('is-fallback'); }
  };

  let gl = null;
  try {
    const opts = { alpha: true, antialias: true, depth: false, premultipliedAlpha: true, powerPreference: 'low-power' };
    gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
  } catch (e) { gl = null; }
  if (!gl) { fallback('no WebGL context'); return; }

  const VERT = [
    'precision highp float;',
    'attribute vec3 aPos;',
    'attribute float aSize;',
    'attribute float aOrder;',        // 0 at the base of the brain, 1 at the crown
    'attribute vec3 aNrm;',           // surface normal (PCA of local neighbours)
    'attribute vec2 aShade;',         // x = cavity (0 crown .. 1 sulcus), y = local density
    /* Cursor displacement, in EYE space and computed on the CPU (see the
       interaction block below). Eye space and not model space on purpose: the
       push has to line up with where the pointer is ON SCREEN, and the model
       is spinning underneath. Applying it after uMV keeps it screen-aligned
       however far the brain has turned. */
    'attribute vec3 aDisp;',
    'uniform mat4 uProj;',
    'uniform mat4 uMV;',
    'uniform mat3 uNormalM;',         // model rotation only, for the normal
    'uniform float uTime;',
    'uniform float uScale;',
    'uniform float uReveal;',
    // uShaded is the ONE uniform declared in both stages, and the two stages
    // have different default float precisions (highp here, mediump in the
    // fragment shader). GL rejects the LINK when a shared uniform's precision
    // differs, so it is qualified explicitly in both — do not drop this.
    'uniform mediump float uShaded;', // 1 when the surface data loaded, 0 when it did not
    'varying float vDepth;',
    'varying float vFade;',
    'varying float vSeed;',
    'varying float vCav;',
    'varying float vDen;',            // local neighbour density = how occluded this point is
    'varying float vFacing;',         // how squarely this point faces the camera
    'varying float vLambert;',
    'void main() {',
    // bottom-up assembly: each point has its own slice of the reveal window
    '  float local = clamp(uReveal * 1.38 - aOrder * 0.34, 0.0, 1.0);',
    '  float ease = local * local * (3.0 - 2.0 * local);',
    '  float seed = fract(sin(aOrder * 977.13 + aPos.x * 31.7 + aPos.z * 57.1) * 43758.5453);',
    '  vSeed = seed;',
    // points fly in from outside the skull and settle onto the surface
    '  vec3 pos = mix(aPos * 2.35, aPos, ease);',
    '  vec4 mv = uMV * vec4(pos, 1.0);',
    '  mv.xyz += aDisp;',
    '  gl_Position = uProj * mv;',
    '  float dist = max(-mv.z, 0.001);',
    '  vDepth = dist;',
    '  vFade = ease;',
    '  float twinkle = 0.86 + 0.14 * sin(uTime * 1.7 + seed * 44.0);',
    // the surface, rotated with the model. The camera looks down -Z, so +Z of
    // the rotated normal is exactly "facing us".
    '  vec3 n = normalize(uNormalM * aNrm);',
    '  vFacing = mix(1.0, clamp(n.z, 0.0, 1.0), uShaded);',
    '  vCav = aShade.x;',
    '  vLambert = clamp(dot(n, normalize(vec3(-0.42, 0.66, 0.62))), 0.0, 1.0);',
    // Points in a crease are drawn slightly LARGER, not smaller. Shrinking them
    // was the first attempt and it backfired: a sulcus point is already darker
    // and already further from the camera, so making it smaller too left the
    // creases sparse — and a sparse patch of small dark dots on a light ground
    // reads LIGHTER than its surroundings, i.e. exactly inside out. Fattening
    // them instead lets the creases close up into continuous dark lines.
    '  float crease = mix(1.0, 1.0 + 0.16 * aShade.x, uShaded);',
    '  vDen = aShade.y;',
    '  gl_PointSize = uScale * aSize * twinkle * crease / dist;',
    '}',
  ].join('\n');

  const FRAG = [
    'precision mediump float;',
    'uniform vec3 uInk;',
    'uniform vec3 uAccent;',
    'uniform vec3 uCrown;',           // gyrus crown — the lit top of a fold
    'uniform vec3 uSulcus;',          // sulcus — the crease between two folds
    'uniform float uNear;',
    'uniform float uFar;',
    'uniform float uAlpha;',
    'uniform mediump float uShaded;', // must match the vertex shader's qualifier
    'varying float vDepth;',
    'varying float vFade;',
    'varying float vSeed;',
    'varying float vCav;',
    'varying float vDen;',
    'varying float vFacing;',
    'varying float vLambert;',
    'void main() {',
    '  vec2 d = gl_PointCoord - vec2(0.5);',
    '  float r2 = dot(d, d);',
    '  if (r2 > 0.25) discard;',
    '  float soft = 1.0 - smoothstep(0.02, 0.25, r2);',
    // aerial perspective: the far half of the cloud thins out towards the page,
    // which is what makes a flat sprite field read as a volume
    '  float depth = clamp((vDepth - uNear) / (uFar - uNear), 0.0, 1.0);',
    // The aerial fade was standing in for occlusion, which the facing cull below
    // now does properly and far more selectively. Applying both at full strength
    // multiplies two culls together and the cloud washes out to nothing, so when
    // shading is on the depth fade backs off to a gentle depth cue.
    '  float aerial = mix(mix(0.92, 0.07, depth), mix(1.00, 0.62, depth), uShaded);',
    '  float a = aerial * soft * vFade * uAlpha;',
    // Facing cull. This is the change that makes the thing read as a brain:
    // without it the far surface draws through the near one and the two shells
    // average into noise, so no amount of colour can show a fold. Points turned
    // away keep a little presence so the silhouette stays whole.
    // Exponent BELOW 1 on purpose. Measured on the real cloud, mean facing is
    // 0.202 and only 19.6% of points face the camera above 0.5 — which is just
    // what a closed surface does. An exponent above 1 therefore deletes most of
    // the ink and the brain turns to dust; 0.85 lifts the obliquely-lit middle
    // band back up while still cutting the true backfaces to the 0.05 floor.
    '  a *= mix(1.0, 0.05 + 0.95 * pow(vFacing, 0.85), uShaded);',
    // crown -> sulcus ramp. The window is deliberately narrow and centred on
    // the middle of the measured cavity range, so most points land at one end
    // or the other and the folds separate instead of washing into a gradient.
    '  float t = smoothstep(0.25, 0.78, vCav);',
    '  vec3 surface = mix(uCrown, uSulcus, t);',
    // light the crowns only: a lit crease would fill in the very line we want
    '  surface *= 0.80 + 0.32 * vLambert * (1.0 - t);',
    // Crowded neighbourhoods are points tucked inside a fold, so they get
    // less sky. This is a cheap ambient occlusion and it is what stops the
    // crowns reading as one flat sheet of taupe.
    '  surface *= 1.0 - 0.30 * smoothstep(0.35, 0.95, vDen);',
    // rim: the accent rides the silhouette instead of being sprinkled at random
    '  float rim = pow(1.0 - vFacing, 3.0);',
    '  surface = mix(surface, uAccent, rim * 0.34);',
    // a sparse warm glint keeps some of the old life without reading as confetti
    '  surface = mix(surface, uAccent, step(0.972, vSeed) * 0.75);',
    '  vec3 flat_c = mix(uInk, uAccent, step(0.9, vSeed));',
    '  vec3 c = mix(flat_c, surface, uShaded);',
    '  gl_FragColor = vec4(c * a, a);',   // premultiplied
    '}',
  ].join('\n');

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn('[Holdera] shader:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) { fallback('shader did not compile'); return; }
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    fallback('link: ' + gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  const A = {
    pos: gl.getAttribLocation(prog, 'aPos'),
    size: gl.getAttribLocation(prog, 'aSize'),
    order: gl.getAttribLocation(prog, 'aOrder'),
    nrm: gl.getAttribLocation(prog, 'aNrm'),
    shade: gl.getAttribLocation(prog, 'aShade'),
    disp: gl.getAttribLocation(prog, 'aDisp'),
  };
  const U = {};
  ['uProj', 'uMV', 'uNormalM', 'uTime', 'uScale', 'uReveal', 'uShaded',
   'uInk', 'uAccent', 'uCrown', 'uSulcus', 'uNear', 'uFar', 'uAlpha']
    .forEach(k => { U[k] = gl.getUniformLocation(prog, k); });

  /* ------------------------------------------------------------------ *
   * Minimal mat4 (column-major, the layout GL wants)                    *
   * ------------------------------------------------------------------ */
  const perspective = (fovY, aspect, near, far) => {
    const f = 1 / Math.tan(fovY / 2), nf = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0,
    ]);
  };
  /* There is no matrix multiply here any more. The projection and the
     model-view go to the shader SEPARATELY (uProj / uMV) rather than
     pre-multiplied into one uMVP, because the cursor displacement has to be
     added in between them — in eye space, after uMV and before uProj. */
  // model-view built directly: yaw about Y, pitch about X, then translate
  const modelView = (yaw, pitch, tx, ty, tz, scale) => {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cx = Math.cos(pitch), sx = Math.sin(pitch);
    // R = Rx * Ry, then uniform scale
    const m = new Float32Array(16);
    m[0] = cy * scale;            m[1] = sx * sy * scale;   m[2] = -cx * sy * scale;  m[3] = 0;
    m[4] = 0;                     m[5] = cx * scale;        m[6] = sx * scale;        m[7] = 0;
    m[8] = sy * scale;            m[9] = -sx * cy * scale;  m[10] = cx * cy * scale;  m[11] = 0;
    m[12] = tx;                   m[13] = ty;               m[14] = tz;               m[15] = 1;
    return m;
  };

  /* ------------------------------------------------------------------ *
   * Brand colours, read from the stylesheet so :root stays the source   *
   * ------------------------------------------------------------------ */
  const cssRGB = (name, fallback) => {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const m = /^#([0-9a-f]{6})$/i.exec(raw);
    const hex = m ? m[1] : fallback;
    return [
      parseInt(hex.slice(0, 2), 16) / 255,
      parseInt(hex.slice(2, 4), 16) / 255,
      parseInt(hex.slice(4, 6), 16) / 255,
    ];
  };
  const INK = cssRGB('--ink', '101010');
  const ACCENT = cssRGB('--accent', 'f08a24');
  const CROWN = cssRGB('--brain-crown', '8a7867');
  const SULCUS = cssRGB('--brain-sulcus', '0c0b0a');

  /* ------------------------------------------------------------------ *
   * Geometry                                                            *
   * ------------------------------------------------------------------ */
  let count = 0, ready = false, raf = 0, running = true;
  let revealStart = 0;
  /* Kept at module scope because the cursor interaction needs them every frame:
     POS to put each point into eye space, disp/vel to carry its spring state. */
  let POS = null, disp = null, vel = null, dispBuf = null;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  let shaded = 0;                     // 0 until the surface data is confirmed usable

  // the two surface buffers resolve to null rather than rejecting: they are an
  // enhancement, and losing them should cost the folds, not the whole hologram
  const optional = url => fetch(url)
    .then(r => (r.ok ? r.arrayBuffer() : null))
    .catch(() => null);

  Promise.all([
    fetch(POINTS_URL).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }),
    fetch(SIZES_URL).then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }),
    optional(NRM_URL),
    optional(SHADE_URL),
  ]).then(([pointsBuf, sizesBuf, nrmBuf, shadeBuf]) => {
    const q = new Int16Array(pointsBuf);
    count = (q.length / 3) | 0;
    if (!count) throw new Error('empty point cloud');

    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) pos[i] = q[i] * QUANT;

    const raw = new Uint8Array(sizesBuf);
    const size = new Float32Array(count);
    const order = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // the byte is the particle radius relative to twice the median (128 = median)
      size[i] = raw.length === count ? 0.55 + (raw[i] / 128) * 0.55 : 1;
      order[i] = i / (count - 1);      // the file is sorted bottom-up
    }

    const bind = (data, loc, comps) => {
      const b = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, comps, gl.FLOAT, false, 0, 0);
    };
    bind(pos, A.pos, 3);
    bind(size, A.size, 1);
    bind(order, A.order, 1);

    /* Cursor displacement lives in its own DYNAMIC_DRAW buffer: it is the only
       thing about the cloud that changes per frame, and it is only re-uploaded
       on frames where something actually moved (see cursorFrame). */
    POS = pos;
    disp = new Float32Array(count * 3);
    vel = new Float32Array(count * 3);
    dispBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, dispBuf);
    gl.bufferData(gl.ARRAY_BUFFER, disp, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(A.disp);
    gl.vertexAttribPointer(A.disp, 3, gl.FLOAT, false, 0, 0);

    /* Surface data. Length is checked against the point count before it is
       trusted: a stale .bin from an older extraction would otherwise shade the
       wrong points and quietly ruin the model rather than fail. */
    const nrmRaw = nrmBuf && new Int8Array(nrmBuf);
    const shadeRaw = shadeBuf && new Uint8Array(shadeBuf);
    if (nrmRaw && shadeRaw && nrmRaw.length === count * 3 && shadeRaw.length === count * 2) {
      const nrm = new Float32Array(count * 3);
      for (let i = 0; i < count * 3; i++) nrm[i] = nrmRaw[i] / 127;
      const sh = new Float32Array(count * 2);
      for (let i = 0; i < count * 2; i++) sh[i] = shadeRaw[i] / 255;
      bind(nrm, A.nrm, 3);
      bind(sh, A.shade, 2);
      shaded = 1;
    } else {
      if (nrmBuf || shadeBuf) {
        console.warn('[Holdera] brain surface data ignored: length mismatch (' +
          (nrmRaw ? nrmRaw.length : 'none') + '/' + (shadeRaw ? shadeRaw.length : 'none') +
          ' for ' + count + ' points) — falling back to the flat cloud');
      }
      // Attributes that are never enabled read as (0,0,0,1) in GL, which would
      // make every normal zero. uShaded=0 already discards their contribution,
      // but the constant is set explicitly so the state does not depend on it.
      if (A.nrm >= 0) gl.disableVertexAttribArray(A.nrm);
      if (A.shade >= 0) gl.disableVertexAttribArray(A.shade);
      if (A.nrm >= 0) gl.vertexAttrib3f(A.nrm, 0, 0, 1);
      if (A.shade >= 0) gl.vertexAttrib2f(A.shade, 0, 0);
    }

    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);   // premultiplied
    gl.clearColor(0, 0, 0, 0);

    gl.uniform3fv(U.uInk, INK);
    gl.uniform3fv(U.uAccent, ACCENT);
    gl.uniform3fv(U.uCrown, CROWN);
    gl.uniform3fv(U.uSulcus, SULCUS);
    gl.uniform1f(U.uShaded, shaded);

    ready = true;
    if (figure) figure.classList.add('is-live');
    resize();
    revealStart = performance.now();
    loop();
  }).catch(err => fallback('point cloud unavailable: ' + err));

  /* ------------------------------------------------------------------ *
   * Sizing                                                              *
   * ------------------------------------------------------------------ */
  let W = 0, H = 0, dpr = 1;
  function resize() {
    // offsetWidth/Height, NOT getBoundingClientRect(): the rect is measured
    // after CSS transforms, and the hero entrance scales .hero__figure from
    // 0.97 to 1 over 1100ms. Since resize() runs every frame, a transformed
    // measurement reallocates the drawing buffer ~30 times during the entrance
    // (hundreds of MB of churn) because the size guard below never matches.
    const cw = canvas.offsetWidth, ch = canvas.offsetHeight;
    if (!cw || !ch) return;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);   // 2 was 4x the pixels of a 1x screen for a soft point cloud; 1.5 keeps it crisp at ~2.25x
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
      // resizing the canvas clears it. If no loop is running (reduced motion,
      // or off screen) nothing would ever repaint it, so repaint here.
      if (!raf && ready) drawOnce(performance.now());
    }, 150);
  }, { passive: true });

  /* ------------------------------------------------------------------ *
   * Scroll progress — measured here, not taken from GSAP, so the        *
   * choreography survives a dead CDN                                    *
   * ------------------------------------------------------------------ */
  let progress = 0;
  /* 🔴 Sin puerta de escritorio (arreglado en el paso 8, movil).
     Esto decia `if (!stage || !DESKTOP.matches) return 0;`, o sea que en movil
     `progress` valia 0 SIEMPRE. Y `pose()` deriva de progress el descenso, el
     giro (SPIN = 1,6 vueltas) y el escalado: los tres quedaban a cero. El
     cerebro ocupa un tercio del hero y era lo unico que un usuario de movil
     espera ver moverse; solo le quedaba el balanceo de reposo (±0,06 rad).
     Era, literalmente, la queja de Alex: «nada de lo que se tiene que mover se
     mueve, esta completamente estatica».
     La formula ya funciona en movil sin cambios: por debajo de 901px el hero no
     esta pineado y `.hero-stage` tiene `height: auto`, asi que offsetHeight es
     el alto real del hero (1470px medidos a 390x844) y el rango sale 626px. */
  function readProgress() {
    if (!stage) return 0;
    const range = stage.offsetHeight - window.innerHeight;
    if (range <= 4) return 0;
    return clamp(-stage.getBoundingClientRect().top / range, 0, 1);
  }
  let scrollPending = false;
  window.addEventListener('scroll', () => {
    if (scrollPending) return;
    scrollPending = true;
    requestAnimationFrame(() => { scrollPending = false; progress = readProgress(); });
  }, { passive: true });
  progress = readProgress();

  /* ------------------------------------------------------------------ *
   * Cursor interaction — the water-drop reaction Alex asked for          *
   *                                                                      *
   * Reference: the VWLAB "Video Projection" drop, where the tiles of the  *
   * shape are shoved aside by the pointer and then flow back. Same idea    *
   * here, on 10.000 points.                                               *
   *                                                                       *
   * Three decisions:                                                      *
   *                                                                       *
   * · EYE SPACE, not model space. The push has to happen where the        *
   *   pointer is on screen, and the brain is spinning: displacing in      *
   *   model space would make the dent travel with the model. The shader   *
   *   adds aDisp AFTER uMV, so a point's escape is always straight away   *
   *   from the cursor as seen by the camera.                              *
   *                                                                       *
   * · SPRING STATE ON THE CPU. The wake — points thrown out and drifting  *
   *   home — needs per-point velocity, which a stateless shader cannot    *
   *   hold. 10.000 iterations of a dozen flops is nothing; the buffer     *
   *   upload is 120 KB, so it is skipped on every frame where nothing     *
   *   has moved (see `energy`), which is most of them.                    *
   *                                                                       *
   * · REDUCED MOTION OPTS OUT ENTIRELY. With motion reduced the loop      *
   *   paints one frame and stops, so a cursor push would either not be    *
   *   drawn or would freeze the cloud mid-splash.                         *
   * ------------------------------------------------------------------ */
  const CUR = {
    on: false,          // pointer inside the figure's box
    x: 0, y: 0,         // client coords
    ex: 0, ey: 0,       // eye-space target, recomputed per frame
    vx: 0, vy: 0,       // pointer velocity in eye units (drives the throw)
    lx: 0, ly: 0,
    speed: 0,
  };
  /* Tuned against a fast flick, not a slow drift: the first numbers here looked
     right when the pointer crawled and tore the silhouette apart when it did
     not. MAX_DISP is the guard rail — 0.30 on a cloud that spans about +-1.1
     means a point can be shoved roughly an eighth of the brain's width and no
     further, so the shape always survives the gesture. */
  const RADIUS = 0.55;      // world units; the cloud spans roughly +-1.1
  const FORCE = 0.0070;
  const SWIRL = 0.0026;     // a touch of curl so it reads as liquid, not rubber
  const TENSION = 0.024;    // pull back home
  const FRICTION = 0.905;
  const MAX_DISP = 0.30;
  let energy = 0;           // total displacement; 0 means there is nothing to upload

  if (!reduce) {
    window.addEventListener('mousemove', e => {
      // Nothing to do while the hero is off-screen or the cloud is not up yet —
      // and no layout read either: this listener is page-wide and the deck is
      // writing custom properties every frame further down.
      if (!running || !ready) { CUR.on = false; return; }
      // Only while the pointer is actually over the figure. Outside it the
      // cloud eases home instead of being tugged by a cursor that is on the
      // content sheet.
      const r = canvas.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right &&
                     e.clientY >= r.top && e.clientY <= r.bottom;
      CUR.on = inside && r.width > 0;
      if (!inside) return;
      CUR.x = e.clientX; CUR.y = e.clientY;
    }, { passive: true });
    window.addEventListener('mouseleave', () => { CUR.on = false; }, { passive: true });
    window.addEventListener('blur', () => { CUR.on = false; });
  }

  /* Advances the springs and re-uploads the buffer. Returns nothing; bails out
     without touching GL when there is neither a pointer nor any residue. */
  function cursorFrame(mv, fovY, aspect) {
    if (reduce || !disp || !POS) return;
    if (!CUR.on && energy < 1e-4) return;

    // where the pointer lands on the plane the brain sits on
    if (CUR.on) {
      const r = canvas.getBoundingClientRect();
      const ndcX = r.width ? ((CUR.x - r.left) / r.width) * 2 - 1 : 0;
      const ndcY = r.height ? 1 - ((CUR.y - r.top) / r.height) * 2 : 0;
      const halfH = CAM_Z * Math.tan(fovY / 2);
      const nx = ndcX * halfH * aspect;
      const ny = ndcY * halfH;
      CUR.vx = nx - CUR.lx; CUR.vy = ny - CUR.ly;
      CUR.lx = nx; CUR.ly = ny;
      CUR.ex = nx; CUR.ey = ny;
      CUR.speed = Math.min(1.2, Math.hypot(CUR.vx, CUR.vy) * 7);
    } else {
      CUR.speed = 0;
    }

    const m0 = mv[0], m4 = mv[4], m8 = mv[8], m12 = mv[12];
    const m1 = mv[1], m5 = mv[5], m9 = mv[9], m13 = mv[13];
    const r2 = RADIUS * RADIUS;
    const push = FORCE * (1 + CUR.speed);
    const swirl = SWIRL * (1 + CUR.speed);
    const active = CUR.on;
    let sum = 0;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const px = POS[i3], py = POS[i3 + 1], pz = POS[i3 + 2];

      if (active) {
        // eye-space X/Y only: the test is "how far from the cursor on screen"
        const ex = m0 * px + m4 * py + m8 * pz + m12;
        const ey = m1 * px + m5 * py + m9 * pz + m13;
        const dx = ex - CUR.ex, dy = ey - CUR.ey;
        const d2 = dx * dx + dy * dy;
        if (d2 < r2) {
          const d = Math.sqrt(d2) || 1e-5;
          let f = 1 - d / RADIUS;
          f *= f;                       // tighter core, softer edge
          const ux = dx / d, uy = dy / d;
          vel[i3] += ux * f * push - uy * f * swirl;
          vel[i3 + 1] += uy * f * push + ux * f * swirl;
          vel[i3 + 2] += f * push * 0.42;   // and a little towards the camera
        }
      }

      let dxv = disp[i3], dyv = disp[i3 + 1], dzv = disp[i3 + 2];
      let vxv = (vel[i3] - dxv * TENSION) * FRICTION;
      let vyv = (vel[i3 + 1] - dyv * TENSION) * FRICTION;
      let vzv = (vel[i3 + 2] - dzv * TENSION) * FRICTION;
      dxv += vxv; dyv += vyv; dzv += vzv;

      const mag = Math.hypot(dxv, dyv, dzv);
      if (mag > MAX_DISP) { const k = MAX_DISP / mag; dxv *= k; dyv *= k; dzv *= k; }

      vel[i3] = vxv; vel[i3 + 1] = vyv; vel[i3 + 2] = vzv;
      disp[i3] = dxv; disp[i3 + 1] = dyv; disp[i3 + 2] = dzv;
      sum += mag;
    }

    energy = sum / count;
    gl.bindBuffer(gl.ARRAY_BUFFER, dispBuf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, disp);
  }

  /* ------------------------------------------------------------------ *
   * Draw                                                                *
   * ------------------------------------------------------------------ */
  const FOV = 40 * Math.PI / 180;    // vertical field of view on a comfortably wide canvas
  /* A fixed VERTICAL fov does not scale a narrow canvas down, it crops it left
     and right — the cloud would lose up to ~44% of its points on a portrait
     tablet, which lands on the desktop side of the 900px breakpoint. Below this
     aspect the frustum opens vertically instead, so the framing behaves like
     object-fit: contain (which is what the old robot <img> did for free).
     0.88 is just under the widest silhouette the cloud reaches while spinning,
     so the framing at the common desktop ratios is unchanged. */
  const FIT_ASPECT = 0.88;
  const BASE_PITCH = 0.16;
  const BASE_YAW = -0.5;
  const SPIN = Math.PI * 1.6;        // most of a turn across the hero, like the GT3
  const CAM_Z = 4.35;

  function pose(tSec) {
    // With reduced motion the pose must not depend on the scroll either: the
    // single still frame can be drawn at any scroll position (the observer or a
    // resize can trigger it), and a scroll-derived pose would then render the
    // brain sunk and fully faded — i.e. an empty square that never repaints.
    const p = reduce ? 0 : progress;
    const pe = p * p * (3 - 2 * p);
    const idle = reduce ? 0 : 1;
    // Alex's brief: the page lifts, the brain sinks. Everything else in the hero
    // is tweened upward by GSAP; this is the only thing that travels down.
    /* Amplitudes distintas en movil, y no por gusto: la caja es mucho mas
       corta (405px medidos contra los ~900 de escritorio) y `.hero` tiene
       `overflow: hidden`. Un descenso de 1,55 unidades de mundo son ~217 css px
       — con la nube midiendo 219px de alto, al final del scroll el cerebro se
       habria salido casi entero por abajo. 0,62 son ~87px: baja de verdad, se
       nota, y la nube sigue dentro del cuadro. El giro tambien se recorta: 1,6
       vueltas en 626px de scroll se lee como un trompo, no como una deriva. */
    const wide = DESKTOP.matches;
    const drift = pe * (wide ? 1.55 : 0.62);
    const bob = Math.sin(tSec * 0.85) * 0.05 * idle;
    const yaw = BASE_YAW + pe * (wide ? SPIN : SPIN * 0.45) + Math.sin(tSec * 0.28) * 0.06 * idle;
    const pitch = BASE_PITCH + pe * 0.10;
    const scale = 1 + pe * (wide ? 0.10 : 0.06);
    return { yaw, pitch, tx: 0, ty: -drift + bob, tz: -CAM_Z, scale };
  }

  function drawOnce(now) {
    // never let `now` be undefined: it feeds a subtraction, and one NaN in the
    // reveal uniform makes the whole cloud disappear rather than fail loudly
    if (typeof now !== 'number') now = performance.now();
    const tSec = now / 1000;
    resize();
    if (!W || !H) return;

    const pv = pose(tSec);
    const mv = modelView(pv.yaw, pv.pitch, pv.tx, pv.ty, pv.tz, pv.scale);
    const aspect = W / H;
    const fovY = aspect >= FIT_ASPECT ? FOV : 2 * Math.atan(Math.tan(FOV / 2) * FIT_ASPECT / aspect);
    const proj = perspective(fovY, aspect, 0.1, 40);
    // springs first: it writes the buffer the draw below reads
    cursorFrame(mv, fovY, aspect);

    const reveal = reduce ? 1 : clamp((now - revealStart) / 1700, 0, 1);
    // once the sheet is nearly over the hero there is nothing left to look at
    // (never with reduced motion: see pose() — the still frame must stay opaque)
    const alpha = reduce ? 1 : 1 - clamp((progress - 0.72) / 0.2, 0, 1);

    gl.uniformMatrix4fv(U.uProj, false, proj);
    gl.uniformMatrix4fv(U.uMV, false, mv);
    /* The normal matrix is the model-view's rotation, with the uniform scale
       divided back out. Scale is uniform here, so the inverse-transpose the
       textbook asks for reduces to exactly this — and unlike an
       inverse-transpose it cannot blow up when the scale is small. */
    const s = pv.scale || 1;
    gl.uniformMatrix3fv(U.uNormalM, false, new Float32Array([
      mv[0] / s, mv[1] / s, mv[2] / s,
      mv[4] / s, mv[5] / s, mv[6] / s,
      mv[8] / s, mv[9] / s, mv[10] / s,
    ]));
    gl.uniform1f(U.uTime, tSec);
    gl.uniform1f(U.uReveal, reveal);
    gl.uniform1f(U.uAlpha, alpha);
    gl.uniform1f(U.uNear, CAM_Z - 1.15);
    gl.uniform1f(U.uFar, CAM_Z + 1.35);
    // point size is in device pixels, so it scales with the backing store.
    // Shading culls ~80% of the cloud's opacity by facing, so the points that
    // survive have to cover more ground or the brain reads as dust.
    gl.uniform1f(U.uScale, H * 0.0195 * (shaded ? 1.42 : 1));

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, count);
  }

  /* One frame. Reschedules itself only while it should be moving, so the rAF
     actually stops when the hero is off screen or motion is reduced — and
     start() is the single place that gets it going again. */
  function frame(now) {
    raf = 0;
    if (!ready || !running) return;
    drawOnce(now);
    if (!reduce) raf = requestAnimationFrame(frame);
  }
  function start() {
    if (!raf && ready && running) raf = requestAnimationFrame(frame);
  }
  const loop = start;

  /* pause while the hero is off screen */
  if ('IntersectionObserver' in window && stage) {
    new IntersectionObserver(entries => {
      entries.forEach(e => {
        running = e.isIntersecting;
        // reduced motion holds a single still frame, so it only needs redrawing
        // if the canvas was resized while it was away
        if (running && ready) { if (reduce) drawOnce(performance.now()); else start(); }
      });
    }, { threshold: 0 }).observe(stage);
  }

  /* a lost context leaves a permanently blank canvas: bring the poster back */
  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    ready = false;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    fallback('context lost');
  }, false);
})();
