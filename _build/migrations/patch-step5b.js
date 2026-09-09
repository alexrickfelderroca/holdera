/* HOLDERA — paso 5b (08-09-2026): correcciones de la revisión multiagente.
 *
 * Se ejecuta UNA vez después de patch-step5.js:  node _build/migrations/patch-step5b.js
 * Cada sustitución lanza si no encuentra su texto (repetirlo falla a propósito).
 *
 *   index.html  — títulos de paso con UNA sola palabra (antes «EscuchamosEscuchamos»
 *                 para un rastreador); los cinco títulos del escaparate pasan de h3
 *                 a p (eran decoración y rompían el esquema h1→h2); índice visible
 *                 de los cinco servicios sobre el deck; GSAP ya no va en <script>;
 *                 TODO sobre «100% sistemas a medida».
 *   styles.css  — fuera el CSS de secciones retiradas (intro, peces, features,
 *                 terminal, scrim del drawer) y sus tokens; el barrido de los
 *                 títulos de paso pasa a ::before; en móvil la hoja no tiene
 *                 esquinas (dejaban ver el cuerpo oscuro) y el título del deck
 *                 cabe; el aside del hero acompaña a la columna izquierda en
 *                 alturas cortas; transiciones apagadas en .nav/.hero__wordmark
 *                 cuando la entrada ha terminado; hover de pasos en móvil.
 *   script.js   — GSAP se carga desde aquí solo en escritorio; onLeaveBack
 *                 remata el scrub al volver arriba; la isla devuelve el foco al
 *                 ocultarse; el bloque de «feature illustrations» (sin marcado)
 *                 desaparece.
 *   planet.js   — las texturas (410 KB) se piden cuando la sección se acerca.
 *   brain.js / waves.js — DPR tope 1,5.
 *   _build/contrast.js — fuera las comprobaciones de reglas que ya no existen;
 *                 dentro las del pie, el índice de servicios y el barrido.
 *   .gitignore  — fuentes 3D, vídeos de referencia y JPEG de WhatsApp.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const write = (f, s) => fs.writeFileSync(path.join(ROOT, f), s, 'utf8');
function sub(src, from, to, label) {
  if (!src.includes(from)) throw new Error('no encuentro: ' + label);
  if (src.split(from).length !== 2) throw new Error('no es único: ' + label);
  return src.split(from).join(to);
}
function cut(src, start, end, label) {
  const a = src.indexOf(start);
  if (a < 0) throw new Error('no encuentro el inicio de ' + label);
  const b = src.indexOf(end, a);
  if (b < 0) throw new Error('no encuentro el final de ' + label);
  return src.slice(0, a) + src.slice(b);
}

/* ---------- index.html ---------- */
let html = read('index.html');
for (const w of ['Escuchamos', 'Diseñamos', 'Integramos', 'Medimos']) {
  html = sub(html,
    '<h3 class="ostep__title"><span class="ostep__fill" aria-hidden="true">' + w + '</span><span class="ostep__base">' + w + '</span></h3>',
    '<h3 class="ostep__title" data-word="' + w + '">' + w + '</h3>', 'ostep ' + w);
}
for (const t of ['Asesorías 1:1', 'Estrategia digital', 'Transformación digital', 'Marketing digital', 'Automatización con IA']) {
  html = sub(html, '<h3 class="sc__title">' + t + '</h3>', '<p class="sc__title">' + t + '</p>', 'sc__title ' + t);
}
html = sub(html,
`        <h2 id="svc-title" class="sheet__title reveal" data-reveal="up" style="--i:1">Cinco formas <span class="fade">de trabajar contigo.</span></h2>
      </div>`,
`        <h2 id="svc-title" class="sheet__title reveal" data-reveal="up" style="--i:1">Cinco formas <span class="fade">de trabajar contigo.</span></h2>
        <!-- Índice siempre visible de los cinco servicios. El deck apila sus
             cinco diapositivas en un solo viewport pegajoso y oculta las que no
             están en escena, así que un rastreador o un lector de pantalla que
             llegaba a #servicios solo encontraba la primera. Cada enlace lleva a
             la ancla de su diapositiva; script.js desplaza el deck hasta ella. -->
        <ul class="svc-index reveal" data-reveal="up" style="--i:2" aria-label="Los cinco servicios">
          <li><a href="#servicio-asesorias">Asesorías 1:1 <small>Una sesión contigo</small></a></li>
          <li><a href="#servicio-estrategia">Estrategia digital <small>Un plan antes de invertir</small></a></li>
          <li><a href="#servicio-transformacion">Transformación digital <small>Tus procesos, dentro de un sistema</small></a></li>
          <li><a href="#servicio-marketing">Marketing digital <small>Que te encuentren y que convierta</small></a></li>
          <li><a href="#servicio-ia">Automatización con IA <small>Tareas repetitivas que se hacen solas</small></a></li>
        </ul>
      </div>`, 'svc-index');
html = sub(html,
`          <div class="stat"><b>100%</b><span>sistemas a medida</span></div>`,
`          <!-- TODO (Alex): confirmar «100% sistemas a medida» o quitarlo (no está en la lista de datos confirmados) -->
          <div class="stat"><b>100%</b><span>sistemas a medida</span></div>`, 'stat todo');
html = sub(html,
`  <!-- planet.js is raw WebGL, no CDN, and goes BEFORE the GSAP tags -->
  <script src="planet.js" defer></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js" defer></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js" defer></script>`,
`  <!-- planet.js is raw WebGL, no CDN -->
  <script src="planet.js" defer></script>
  <!-- GSAP + ScrollTrigger (cdnjs) los inyecta script.js SOLO en escritorio y
       sin movimiento reducido: son la capa opcional del scroll del hero y en
       móvil no se usan (42 KB menos por visita). La página nunca los espera. -->`, 'gsap tags');
write('index.html', html);
console.log('index.html: pasos, títulos del escaparate, índice de servicios, GSAP, TODO');

/* ---------- styles.css ---------- */
let css = read('styles.css');
// header comment: the sheet is dark
css = sub(css,
`   Art direction: light grey studio hero, grotesk type, orange accent, and a
   near-white "sheet" that slides up over the hero on scroll while the brain
   point cloud sinks behind it (brain.js).
   Fonts: Geist + Geist Mono (one superfamily). Colour lives only in :root (incl. alpha layers).
   Three colour groups: the light hero, --sh-* for the light content sheet, and
   --on-ink-* for the few surfaces that stay dark on it (side drawer, floating
   island, hero bar, terminal).`,
`   Art direction: light grey studio hero, grotesk type, orange accent, and a
   warm near-black "sheet" that slides up over the hero on scroll while the
   brain point cloud sinks behind it (brain.js). Dark from the sheet to the
   footer since 08-09-2026.
   Fonts: Geist + Geist Mono (one superfamily). Colour lives only in :root (incl. alpha layers).
   Three colour groups: the light hero, --sh-* for the dark content sheet, and
   --on-ink-* for the surfaces that were dark before the sheet was (side
   drawer, floating island, hero bar).`, 'css header');
css = sub(css, `   Content sheet (light) — slides up over the sticky hero`, `   Content sheet (dark) — slides up over the sticky hero`, 'sheet header');
// dead: intro sheet
css = sub(css,
`.sheet--intro {
  background:
    radial-gradient(70% 40% at 50% 0%, var(--accent-a10) 0%, var(--accent-a0) 60%),
    linear-gradient(180deg, var(--sh-bg) 0%, var(--sh-bg) calc(100% - 200px), var(--sh-bg-2) 100%);
}
`, '', 'sheet--intro');
// dead: fish hologram + features + terminal (sections removed from index.html)
css = cut(css, `/* --------------------------------------------------------------------------
   Fish hologram — six fish circling a funnel of eight text rings`, `/* Process */`, 'bloque peces/features/terminal');
// dead: drawer scrim
css = sub(css,
`.drawer__scrim {
  background: var(--scrim); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
  opacity: 0; transition: opacity var(--t-mid) var(--ease);
}
.drawer.is-open .drawer__scrim { opacity: 1; }
`, '', 'drawer scrim');
css = sub(css, `.drawer:not(.is-open) .drawer__panel, .drawer:not(.is-open) .drawer__scrim { transition-timing-function: var(--ease-in); }`,
  `.drawer:not(.is-open) .drawer__panel { transition-timing-function: var(--ease-in); }`, 'drawer scrim ease');
css = sub(css, `  .drawer__scrim { display: none; }\n`, '', 'drawer scrim mobile');
css = sub(css, `  --scrim: rgba(6, 5, 4, 0.66);\n`, '', 'token scrim');
css = sub(css,
`  /* fish hologram — read by fish.js (--fish-*) and by the ring CSS (--ring-*) */
  --fish-core: #c9b9a4;
  --fish-rim: #f08a24;
  --ring-line: rgba(255, 250, 242, 0.13);
  --ring-echo: rgba(210, 204, 194, 0.42);

`, '', 'tokens fish');
css = sub(css,
`  /* diagram strokes on the dark sheet — these replaced --k-24/--k-38, whose
     only consumers were .viz__spokes and .viz__path--2 */
  --w-09: rgba(255, 250, 242, 0.09);
  --w-22: rgba(255, 250, 242, 0.22);
  --w-40: rgba(255, 250, 242, 0.40);
`, `  /* the inset hairline of the showcase panels */
  --w-22: rgba(255, 250, 242, 0.22);
`, 'tokens viz');
// step titles: one text node, the wipe is a pseudo-element
css = sub(css,
`/* the bright copy, wiped in from the left as the title scrolls up */
.ostep__fill {
  position: absolute; inset: 0; color: var(--sh-text);
  clip-path: inset(0 100% 0 0);
  pointer-events: none;
}
.has-js .ostep__fill { clip-path: inset(0 calc(var(--wipe, 100) * 1%) 0 0); }
/* Without JS --wipe never arrives, so the fallback above would clip the bright
   copy away entirely. That is fine — .ostep__base underneath carries the word,
   and the fill is aria-hidden. The title is never invisible. */`,
`/* The bright copy, wiped in from the left as the title scrolls up. It is a
   PSEUDO-ELEMENT reading data-word, not a second span: two spans with the
   same word and no space between them were crawled as one glued token
   («EscuchamosEscuchamos»). The "/ \\"\\"" alt keeps the generated text out of
   the accessible name, so a screen reader hears the word once. */
.ostep__title::before {
  content: attr(data-word) / "";
  position: absolute; inset: 0; color: var(--sh-text);
  clip-path: inset(0 100% 0 0);
  pointer-events: none;
}
.has-js .ostep__title::before { clip-path: inset(0 calc(var(--wipe, 100) * 1%) 0 0); }
/* Without JS --wipe never arrives, so the fallback above would clip the bright
   copy away entirely. That is fine — the title's own text carries the word.
   The title is never invisible. */`, 'ostep fill');
css = sub(css,
`.has-js .ostep:hover .ostep__fill,
.has-js .ostep:focus-within .ostep__fill { color: var(--ink); }`,
`.has-js .ostep:hover .ostep__title::before,
.has-js .ostep:focus-within .ostep__title::before { color: var(--ink); }`, 'ostep fill hover');
css = sub(css, `  .has-js .ostep__fill { clip-path: inset(0 0 0 0); }`, `  .has-js .ostep__title::before { clip-path: inset(0 0 0 0); }`, 'ostep fill rm');
// mobile: the band never opens, so hover/focus must not paint the word ink on near-black
css = sub(css,
`  .orbit__gl { width: min(70vw, 380px); height: min(70vw, 380px); }
  .ostep { padding: 14px 0; }
}`,
`  .orbit__gl { width: min(70vw, 380px); height: min(70vw, 380px); }
  .ostep { padding: 14px 0; }
  /* ...and with no band, the desktop hover/focus colours (ink, for reading
     over the orange band) would paint the word ink on the near-black sheet:
     a focused step title at ~1.1:1. Keep the resting colours here. */
  .has-js .ostep:hover .ostep__title, .has-js .ostep:focus-within .ostep__title { color: var(--orbit-title); }
  .has-js .ostep:hover .ostep__title::before, .has-js .ostep:focus-within .ostep__title::before { color: var(--sh-text); }
  .has-js .ostep:hover .ostep__num, .has-js .ostep:focus-within .ostep__num { color: var(--accent-ink); }
}`, 'ostep mobile colours');
// deck title on phones: TRANSFORMACIÓN / AUTOMATIZACIÓN were clipped by the entrance mask at 13vw
css = sub(css, `  .deck__title { font-size: clamp(30px, 13vw, 84px); }`,
`  /* 9.6vw, not 13vw: «TRANSFORMACIÓN» is ~8.9em wide at this tracking and the
     title is overflow:hidden (the entrance mask), so at 390px anything above
     ~39px clips the word. 9.6vw is 37px there. */
  .deck__title { font-size: clamp(26px, 9.6vw, 84px); }`, 'deck title mobile');
// mobile sheet corners: no overlap below 901px, so the rounded lid showed the dark body between two light surfaces
css = sub(css, `  main { margin-top: 0; border-radius: var(--r-sheet-sm) var(--r-sheet-sm) 0 0; }`,
`  /* No radius here. Below 901px the sheet does not overlap the hero, so a
     rounded lid only exposed the dark body in two "ears" between the light
     hero and the light-grey start of the seam ramp. The seam IS the edge. */
  main { margin-top: 0; border-radius: 0; }`, 'main mobile radius');
css = sub(css, `  --r-sheet-sm: 28px;\n`, '', 'token r-sheet-sm');
// short desktop heights: the aside follows the left column down
css = sub(css,
`@media (min-width: 901px) and (max-height: 895px) {
  .hero__left { top: clamp(96px, 13vh, 190px); gap: clamp(14px, 2.2vh, 28px); }`,
`@media (min-width: 901px) and (max-height: 895px) {
  .hero__left { top: clamp(96px, 13vh, 190px); gap: clamp(14px, 2.2vh, 28px); }
  /* the aside shares the column's top, or the two heads drift apart */
  .hero__aside { top: clamp(96px, 13vh, 190px); }`, 'aside top 895');
css = sub(css,
`@media (min-width: 901px) and (max-height: 760px) {
  .hero__left { top: clamp(84px, 11vh, 120px); }`,
`@media (min-width: 901px) and (max-height: 760px) {
  .hero__left { top: clamp(84px, 11vh, 120px); }
  .hero__aside { top: clamp(84px, 11vh, 120px); }`, 'aside top 760');
// once the entrance is over, GSAP's two targets never see a CSS transition again
css = sub(css,
`/* GSAP owns .hero__figure transform once ready; keep the transition off then */
.has-js .hero.is-ready.is-scrolling [data-enter] { transition: none; }`,
`/* GSAP owns .hero__figure transform once ready; keep the transition off then */
.has-js .hero.is-ready.is-scrolling [data-enter] { transition: none; }
/* …and once the entrance has finished (is-settled, 2.1 s after is-ready) the
   two elements GSAP writes to with the scroll never transition again. Before
   this, scrolling back to the top re-armed the 900 ms entrance transition on
   top of the scrub's inline writes and the nav stayed invisible for up to
   ~1.8 s — long enough to read as "the menu is gone". */
.has-js .hero.is-settled .nav, .has-js .hero.is-settled .hero__wordmark { transition: none; }`, 'is-settled');
// the visible index of services above the deck
css = sub(css, `.deck { margin-top: clamp(32px, 4vw, 56px); }`,
`/* The always-visible index of the five services (see index.html). Pills with
   a control border (3:1), each a link to its slide's anchor. */
.svc-index { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 8px 10px; }
.svc-index a {
  display: inline-flex; align-items: baseline; gap: 8px; padding: 8px 14px;
  border-radius: var(--r-pill); border: 1px solid var(--sh-control-border);
  color: var(--sh-text); text-decoration: none; font-size: 13px; font-weight: 500;
  transition: background-color var(--t-fast) var(--ease), border-color var(--t-fast) var(--ease);
}
.svc-index a small { font-size: 12px; font-weight: 400; color: var(--sh-muted); }
.svc-index a:hover { background: var(--sh-tint); border-color: var(--sh-text-2); }
@media (max-width: 560px) { .svc-index a small { display: none; } }

.deck { margin-top: clamp(32px, 4vw, 56px); }`, 'svc-index css');
write('styles.css', css);
console.log('styles.css: limpieza, pasos, móvil, alturas, settled, índice');

/* ---------- script.js ---------- */
let js = read('script.js');
js = sub(js,
`  /* ---------- Hero load-in ---------- */
  const hero = $('.hero');
  if (hero) {
    let done = false;
    // Scroll choreography starts only after the entrance has finished, so GSAP never records
    // the pre-entrance state (opacity 0 / offset) as a start value.
    const ready = () => { if (!done) { done = true; requestAnimationFrame(() => { hero.classList.add('is-ready'); setTimeout(initScroll, 1500); }); } };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ready);
    setTimeout(ready, 900); // failsafe: never wait on fonts
  }`,
`  /* ---------- Hero load-in ---------- */
  const hero = $('.hero');
  const desktopMotion = window.matchMedia('(min-width: 901px)');
  let entranceDone = false;
  if (hero) {
    let done = false;
    // Scroll choreography starts only after the entrance has finished, so GSAP never records
    // the pre-entrance state (opacity 0 / offset) as a start value.
    const ready = () => {
      if (done) return;
      done = true;
      requestAnimationFrame(() => {
        hero.classList.add('is-ready');
        setTimeout(() => { entranceDone = true; initScroll(); }, 1500);
        /* is-settled switches the [data-enter] transitions off on the two
           elements GSAP writes to with the scroll (.nav, .hero__wordmark) once
           the longest entrance (700 + 120 + 1100 ms) is over. Until then a
           scrub write could be CSS-transitioned on top of GSAP's inline value,
           which is the 1.2–1.8 s "nav gone at the top" the audit measured.
           onLeaveBack in initScroll is the other half of that fix. */
        setTimeout(() => hero.classList.add('is-settled'), 2100);
      });
    };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ready);
    setTimeout(ready, 900); // failsafe: never wait on fonts

    /* GSAP + ScrollTrigger are fetched from HERE, not from <script> tags: they
       only ever run on desktop without reduced motion, and two deferred tags
       cost every phone 42 KB for nothing. The page never waits on them — the
       sticky sheet is CSS — so a hanging CDN still costs nothing. */
    const GSAP_SRC = [
      'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js',
    ];
    let loading = false;
    const loadGsap = () => {
      if (loading || reduce || !desktopMotion.matches) return;
      if (window.gsap && window.ScrollTrigger) { initScroll(); return; }
      loading = true;
      const add = i => {
        if (i >= GSAP_SRC.length) { initScroll(); return; }
        const s = document.createElement('script');
        s.src = GSAP_SRC[i]; s.async = true;
        s.onload = () => add(i + 1);
        s.onerror = () => { loading = false; };
        document.head.appendChild(s);
      };
      add(0);
    };
    loadGsap();
    desktopMotion.addEventListener('change', loadGsap);
  }`, 'hero load-in');
js = sub(js,
`  /* ---------- Scroll choreography (GSAP, desktop, motion allowed) ---------- */
  function initScroll() {
    if (reduce || !hero) return;
    if (!window.gsap || !window.ScrollTrigger) { // CDN still loading: retry once the window has loaded
      if (document.readyState !== 'complete') window.addEventListener('load', initScroll, { once: true });
      return;
    }
    const gsap = window.gsap;`,
`  /* ---------- Scroll choreography (GSAP, desktop, motion allowed) ---------- */
  // Called twice — when the entrance ends and when the loader has both files —
  // and runs once whichever comes last.
  let scrollInit = false;
  function initScroll() {
    if (reduce || !hero || !entranceDone || scrollInit) return;
    if (!window.gsap || !window.ScrollTrigger) return;
    scrollInit = true;
    const gsap = window.gsap;`, 'initScroll head');
js = sub(js,
`          onUpdate: self => hero.classList.toggle('is-scrolling', self.progress > 0.001),
        },`,
`          onUpdate: self => hero.classList.toggle('is-scrolling', self.progress > 0.001),
          /* Back above the stage start the scrub is still catching up for
             0.7 s while is-scrolling has already been dropped: finish it NOW,
             so nav, copy and aside sit at their rest values the moment the top
             is reached and nothing is left in flight for a transition to grab. */
          onLeaveBack: self => {
            const t = self.getTween && self.getTween();
            if (t) t.progress(1);
            hero.classList.remove('is-scrolling');
          },
        },`, 'onLeaveBack');
js = sub(js,
`    const setFab = on => {
      if (on === shown) return;
      shown = on;
      fab.classList.toggle('is-visible', on);`,
`    const setFab = on => {
      if (on === shown) return;
      shown = on;
      // hiding the island while its button holds focus would leave focus on an
      // aria-hidden control: hand it to the hero's own Menú button instead
      if (!on && fab.contains(document.activeElement)) { const b = $('.nav__menu'); if (b) b.focus({ preventScroll: true }); }
      fab.classList.toggle('is-visible', on);`, 'fab focus');
js = sub(js,
`    window.addEventListener('resize', checkFab, { passive: true });
  }`,
`    window.addEventListener('resize', checkFab, { passive: true });
    // crossing 900px changes whether the covered hero must be inert: re-evaluate
    desktop.addEventListener('change', () => { shown = null; checkFab(); });
  }`, 'fab breakpoint');
js = cut(js, `  /* ---------- Feature illustrations: animate only while on screen ---------- */`, `  /* ---------- Floating island nav after the hero ---------- */`, 'feature visuals');
write('script.js', js);
console.log('script.js: loader GSAP, onLeaveBack, isla, limpieza');

/* ---------- planet.js ---------- */
let pl = read('planet.js');
pl = sub(pl,
`  Promise.all([loadTexture(COLOR_URL), loadTexture(CLOUD_URL)])
    .then(([c, cl]) => {`,
`  /* The two maps (410 KB) were half the page weight and the planet sits two
     screens down: fetch them when the section comes within a viewport of the
     fold, not at load. Without IntersectionObserver, fetch at once as before. */
  let booted = false;
  const boot = () => {
    if (booted) return;
    booted = true;
    Promise.all([loadTexture(COLOR_URL), loadTexture(CLOUD_URL)])
    .then(([c, cl]) => {`, 'planet boot');
pl = sub(pl,
`    .catch(err => console.warn('[Holdera] planet:', err.message));`,
`    .catch(err => console.warn('[Holdera] planet:', err.message));
  };
  if ('IntersectionObserver' in window) {
    const near = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { near.disconnect(); boot(); }
    }, { rootMargin: '100% 0px' });
    near.observe(section);
  } else boot();`, 'planet observer');
write('planet.js', pl);
console.log('planet.js: texturas en diferido');

/* ---------- brain.js / waves.js ---------- */
for (const f of ['brain.js', 'waves.js']) {
  let s = read(f);
  s = sub(s, `dpr = Math.min(window.devicePixelRatio || 1, 2);`,
    `dpr = Math.min(window.devicePixelRatio || 1, 1.5);   // 2 was 4x the pixels of a 1x screen for a soft point cloud; 1.5 keeps it crisp at ~2.25x`, f + ' dpr');
  write(f, s);
}
console.log('brain.js / waves.js: DPR 1.5');

/* ---------- _build/contrast.js ---------- */
let ct = read(path.join('_build', 'contrast.js'));
ct = sub(ct, `const CARD = ['.feature__body', 'background'];\n`, '', 'contrast CARD');
ct = sub(ct, `const TERM = ['.term', 'background'];\n`, '', 'contrast TERM');
ct = sub(ct, `  ['feature body copy',     ['.feature__body p', 'color'],   [CARD], 4.5],
  ['feature number',        ['.feature__num', 'color'],      [CARD], 4.5],
`, '', 'contrast feature');
ct = sub(ct, `  ['step title resting',    ['.ostep__title', 'color'],      [STEP], 3],`,
`  ['step title resting',    ['.ostep__title', 'color'],      [STEP], 3],
  ['step title wiped',      ['.ostep__title::before', 'color'], [STEP], 3],`, 'contrast step wiped');
ct = sub(ct, `  ['footer text',           ['.footer', 'color'],            [['.footer', 'background']], 4.5],`,
`  ['footer text',           ['.footer', 'color'],            [['.footer', 'background']], 4.5],
  ['footer line',           ['.footer__line', 'color'],      [['.footer', 'background']], 4.5],
  ['footer link',           ['.footer__nav a, .footer__contact a', 'color'], [['.footer', 'background']], 4.5],
  ['footer placeholder',    ['[data-placeholder]', 'color'], [['.footer', 'background']], 4.5],
  ['footer legal link',     ['.footer__legal a', 'color'],   [['.footer', 'background']], 4.5],
  ['service index link',    ['.svc-index a', 'color'],       [SHEET], 4.5],
  ['service index note',    ['.svc-index a small', 'color'], [SHEET], 4.5],
  ['service index border',  ['.svc-index a', 'border'],      [SHEET], 3],`, 'contrast footer');
ct = sub(ct, `  ['terminal body',         ['.term', 'color'],               [TERM], 4.5],
  ['terminal window title', ['.term__bar span', 'color'],     [['.term__bar', 'background']], 4.5],
  ['diagram node label',    ['.viz__label--hi', 'fill'],      [['.viz__core', 'fill']], 4.5],
`, '', 'contrast term');
ct = sub(ct, `  '.term__prompt', '.term__ok', '.viz__label--accent', '.drawer__links a:hover',`, `  '.drawer__links a:hover',`, 'contrast allowlist');
write(path.join('_build', 'contrast.js'), ct);
console.log('contrast.js: reglas retiradas fuera, pie e índice dentro');

/* ---------- .gitignore ---------- */
let gi = read('.gitignore');
if (!gi.includes('/brain-hologram/')) {
  gi = gi.trimEnd() + `
# fuentes de los modelos 3D y material de referencia de Alex: no se sirven ni se
# publican; los resultados que sí viajan son assets/model/*.bin y assets/img/*
/brain-hologram/
/fish-hologram/
/hologram-gezegen/
/*.mp4
/WhatsApp Image *.jpeg
`;
  write('.gitignore', gi);
}
console.log('.gitignore: fuentes y referencias');
console.log('OK');
