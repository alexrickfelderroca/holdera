/* HOLDERA — paso 5 (08-09-2026): nav completa, pie nuevo, anclas por servicio.
 *
 * Se ejecuta UNA vez: node _build/migrations/patch-step5.js
 * Cada sustitución lanza si no encuentra su texto, así que repetirlo falla a
 * propósito (mismo criterio que las migraciones anteriores). Copia de
 * seguridad automática en *.step4.bak (git-ignorado).
 *
 * Lo que hace:
 *   index.html  — cabecera, isla+drawer y pie sustituidos por las copias de
 *                 _build/shell/ (variante index: anclas #… en vez de index.html#…);
 *                 la lista de servicios del hero y el submenú apuntan a UN slide
 *                 (#servicio-asesorias …) y cada slide del deck lleva su id;
 *                 «Qué hacemos» va a #servicios; marcador <!-- seo:head -->.
 *   styles.css  — pie a tres columnas, marcadores [data-placeholder], la nav de
 *                 siete entradas (reloj oculto antes), drawer con siete filas.
 *   script.js   — enlaces profundos al deck (#servicio-x → posición de scroll
 *                 del slide) y la corrección del hash al cargar.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const SHELL = path.join(ROOT, '_build', 'shell');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const write = (f, s) => fs.writeFileSync(path.join(ROOT, f), s, 'utf8');

function sub(src, from, to, label) {
  if (!src.includes(from)) throw new Error('no encuentro: ' + label);
  if (src.split(from).length !== 2) throw new Error('no es único: ' + label);
  return src.split(from).join(to);
}
function between(src, start, end, label) {
  const a = src.indexOf(start);
  if (a < 0) throw new Error('no encuentro el inicio de ' + label);
  const b = src.indexOf(end, a);
  if (b < 0) throw new Error('no encuentro el final de ' + label);
  return { a, b: b + end.length };
}

/* ---------- index.html ---------- */
let html = read('index.html');
fs.writeFileSync(path.join(ROOT, 'index.step4.bak'), html);

const forIndex = s => s
  .split('href="index.html#').join('href="#')
  .split('href="index.html"').join('href="#inicio"');
const header = forIndex(fs.readFileSync(path.join(SHELL, 'header.html'), 'utf8'))
  .split('<a href="#inicio">Inicio</a>').join('<a href="#inicio" class="is-active" aria-current="page">Inicio</a>');
const drawer = forIndex(fs.readFileSync(path.join(SHELL, 'drawer.html'), 'utf8'));
const footer = forIndex(fs.readFileSync(path.join(SHELL, 'footer.html'), 'utf8'));

let r = between(html, '      <header class="nav" data-enter style="--d:0">', '      </header>\n', 'cabecera');
html = html.slice(0, r.a) + header + html.slice(r.b);

r = between(html, '  <!-- Floating island nav (appears once the hero is scrolled past) -->', '  </div>\n\n  <script src="script.js" defer></script>', 'isla + drawer');
html = html.slice(0, r.a) + drawer + '\n  <script src="script.js" defer></script>' + html.slice(r.b);

r = between(html, '  <footer class="footer">', '  </footer>\n', 'pie');
html = html.slice(0, r.a) + footer + html.slice(r.b);

// lista de servicios del hero → un slide concreto
for (const k of ['asesorias', 'estrategia', 'transformacion', 'marketing', 'ia']) {
  html = sub(html, 'href="#servicios" data-work="' + k + '"', 'href="#servicio-' + k + '" data-work="' + k + '"', 'lista hero ' + k);
}
// slides del deck con id
const slides = [['Asesorías 1:1', 'asesorias'], ['Estrategia digital', 'estrategia'], ['Transformación digital', 'transformacion'], ['Marketing digital', 'marketing'], ['Automatización con IA', 'ia']];
for (const [label, k] of slides) {
  html = sub(html, '<article class="deck__slide" data-slide aria-label="' + label + '">', '<article class="deck__slide" id="servicio-' + k + '" data-slide aria-label="' + label + '">', 'slide ' + k);
}
// «Qué hacemos» → servicios (el rótulo prometía servicios y llevaba al proceso)
html = sub(html, '<a class="btn btn--secondary" href="#como-trabajamos">Qué hacemos</a>', '<a class="btn btn--secondary" href="#servicios">Qué hacemos</a>', 'CTA qué hacemos');
// marcador para la inyección SEO
html = sub(html, '  <script>document.documentElement.classList.add(\'has-js\');</script>\n</head>', '  <script>document.documentElement.classList.add(\'has-js\');</script>\n  <!-- seo:head -->\n</head>', 'marcador seo');
write('index.html', html);
console.log('index.html: cabecera, drawer, pie, anclas, ids y marcador SEO');

/* ---------- styles.css ---------- */
let css = read('styles.css');
fs.writeFileSync(path.join(ROOT, 'styles.step4.bak'), css);

css = sub(css,
`/* Footer */
.footer { position: relative; z-index: var(--z-sheet); background: var(--sh-bg-2); color: var(--sh-muted); border-top: 1px solid var(--sh-border); padding: 48px 0 40px; }
.footer__inner { display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; font-size: 13px; }
.footer__logo { width: 64px; height: auto; opacity: 0.9; }
.footer__line, .footer__copy { margin: 0; }
`,
`/* Footer — three columns (brand, site map, contact) over a legal line. The
   markup is shared by every page (_build/shell/footer.html) and guarded by
   _build/check-shell.js. Contact data is still unconfirmed: each link is a
   [data-placeholder] with a visible "[… por confirmar]" label, styled so it
   cannot be mistaken for real data. */
.footer { position: relative; z-index: var(--z-sheet); background: var(--sh-bg-2); color: var(--sh-muted); border-top: 1px solid var(--sh-border); padding: clamp(56px, 7vw, 96px) 0 32px; }
.footer__grid { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 40px clamp(32px, 5vw, 96px); align-items: start; }
.footer__brand { max-width: 38ch; }
.footer__logo { width: 64px; height: auto; opacity: 0.9; margin-bottom: 20px; }
.footer__line { margin: 0; font-size: 14px; line-height: 1.6; color: var(--sh-text-2); }
.footer__head { margin: 0 0 16px; font-family: var(--font-mono); font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--sh-text-2); }
.footer__nav, .footer__contact { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; font-size: 14px; }
.footer__nav a, .footer__contact a { color: var(--sh-text-2); text-decoration: none; transition: color var(--t-fast) var(--ease); }
.footer__nav a:hover, .footer__contact a:hover { color: var(--sh-text); }
.footer__addr { margin: 6px 0 0; font-size: 13px; color: var(--sh-muted); }
.footer__bottom { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px 24px; margin-top: clamp(40px, 5vw, 64px); padding-top: 24px; border-top: 1px solid var(--sh-border); font-size: 13px; }
.footer__copy { margin: 0; }
.footer__legal { display: flex; gap: 20px; }
.footer__legal a { color: var(--sh-muted); text-decoration: none; transition: color var(--t-fast) var(--ease); }
.footer__legal a:hover { color: var(--sh-text); }
/* A placeholder reads as a placeholder: mono, dashed underline, muted. Never
   restyle this to look like a real link — it exists so unconfirmed data cannot
   ship looking real (see CLAUDE.md, "Pendiente"). */
[data-placeholder] { font-family: var(--font-mono); font-size: 12.5px; letter-spacing: 0.02em; color: var(--sh-muted); border-bottom: 1px dashed var(--sh-border-strong); }
.footer__contact a[data-placeholder] { color: var(--sh-muted); }
`, 'footer css');

css = sub(css, `  .footer__inner { flex-direction: column; align-items: flex-start; }`, `  .footer__grid { grid-template-columns: 1fr; gap: 36px; }`, 'footer móvil');

// nav de siete entradas: el reloj se oculta antes para que la columna derecha
// no pise la central (medido: a 1080px la central mide ~540px y quedan 244px
// por lado; el reloj + Menú piden 230 — cabe, pero sin margen)
css = sub(css, `@media (max-width: 1000px) {
  .nav__tz { display: none; }
}`, `@media (max-width: 1120px) {
  .nav__tz { display: none; }
}`, 'nav tz breakpoint');

// drawer: siete filas tienen que caber en 900px de alto (antes cinco)
css = sub(css, `.mrow__label {
  display: block; padding: clamp(10px, 1.6vh, 22px) var(--gutter);
  font-size: clamp(30px, 5.4vw, 68px); line-height: 1.16; font-weight: 500;`, `.mrow__label {
  display: block; padding: clamp(6px, 1.1vh, 14px) var(--gutter);
  /* seven rows since the nav grew (Cómo trabajamos, Panel demo): at 68px the
     stack was 861px tall and the drawer has no scroll; 52px keeps 7 rows in
     ~620px at 1440x900 and ~540px at 1366x768 */
  font-size: clamp(26px, 4.2vw, 52px); line-height: 1.16; font-weight: 500;`, 'drawer rows');
css = sub(css, `.drawer__panel { border-left: 0; }`, `.drawer__panel { border-left: 0; overflow-y: auto; }`, 'drawer scroll');

// el degradado del H1 pasa del h1 a cada línea (ver comentario en el CSS)
css = sub(css, `.hero__title {
  font-size: clamp(46px, 5.1vw, 74px); line-height: 0.98; letter-spacing: -0.035em; font-weight: 500;
  margin: 0 0 24px;
  /* the dissolve is sampled once across the whole block so all three lines share one sweep */
  background: linear-gradient(100deg, var(--text) 0%, var(--text-2) 46%, var(--text-fade) 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.hero__title .line { display: block; overflow: hidden; padding-bottom: 0.06em; margin-bottom: -0.06em; }
.hero__title .line > span { display: inline-block; color: inherit; }`, `.hero__title {
  font-size: clamp(46px, 5.1vw, 74px); line-height: 0.98; letter-spacing: -0.035em; font-weight: 500;
  margin: 0 0 24px; color: var(--text);
}
.hero__title .line { display: block; overflow: hidden; padding-bottom: 0.06em; margin-bottom: -0.06em; }
/* The gradient lives on each LINE, not on the h1. background-clip: text only
   masks text that paints in the element's own layer, and during the entrance
   every line is a transformed (composited) inline-block: with the clip on the
   h1 the three lines slid in INVISIBLE and popped into place when the
   transition ended — caught on the mobile pass-1 screenshot (title box laid
   out, no glyphs). Each line carries its own copy of the sweep, sized to three
   lines and offset per line, so the block still darkens top-left and fades
   bottom-right as one gradient. */
.hero__title .line > span {
  display: inline-block;
  background: linear-gradient(100deg, var(--text) 0%, var(--text-2) 46%, var(--text-fade) 100%);
  background-size: 100% 300%;
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.hero__title .line:nth-child(2) > span { background-position: 0 50%; }
.hero__title .line:nth-child(3) > span { background-position: 0 100%; }`, 'h1 gradient per line');
write('styles.css', css);
console.log('styles.css: pie, placeholders, nav, drawer');

/* ---------- script.js ---------- */
let js = read('script.js');
fs.writeFileSync(path.join(ROOT, 'script.step4.bak'), js);
js = sub(js, `  let pending = false;
  const onScroll = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; frame(); });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  frame();
  // the sticky stage settles after layout; a late pass avoids a first slide
  // that never gets its is-live class
  setTimeout(frame, 300);
  setTimeout(frame, 1200);
})();`, `  let pending = false;
  const onScroll = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; frame(); });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  frame();
  // the sticky stage settles after layout; a late pass avoids a first slide
  // that never gets its is-live class
  setTimeout(frame, 300);
  setTimeout(frame, 1200);

  /* ---- deep links: #servicio-<x> lands ON that slide ----
     Every slide has an id, but with JS the five are stacked inside one sticky
     viewport, so a native hash jump lands on the stage and shows whichever
     slide the scroll maths picks — for every link that was slide 0 ("Estrategia
     digital" took you to Asesorías). The right place for slide k is the scroll
     position where frame() computes p = k, i.e. stage.top + travel * k/(n-1),
     plus a hair so the swap has fully settled. Used by the nav submenu, the
     hero list, and the hash on load (a link from another page). */
  const slideTop = k => {
    const r = stage.getBoundingClientRect();
    const travel = r.height - window.innerHeight;
    return scrollY + r.top + travel * (k / (slides.length - 1)) + (k ? 2 : 0);
  };
  const goTo = (k, behavior) => {
    window.scrollTo({ top: Math.max(0, slideTop(k)), behavior });
    // the sticky stage can settle after the first jump (fonts, images): land twice
    setTimeout(() => window.scrollTo({ top: Math.max(0, slideTop(k)), behavior: 'auto' }), behavior === 'auto' ? 60 : 900);
  };
  const indexOfHash = h => { const m = /^#servicio-/.test(h) ? slides.findIndex(s => '#' + s.id === h) : -1; return m; };
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href*="#servicio-"]');
    if (!a) return;
    const url = new URL(a.getAttribute('href'), location.href);
    if (url.pathname !== location.pathname) return;   // another page: let it navigate
    const k = indexOfHash(url.hash);
    if (k < 0) return;
    e.preventDefault();
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    goTo(k, behavior);
    if (history.replaceState) history.replaceState(null, '', url.hash);
  });
  const fromHash = () => { const k = indexOfHash(location.hash); if (k >= 0) goTo(k, 'auto'); };
  if (location.hash) { fromHash(); setTimeout(fromHash, 400); }
  window.addEventListener('hashchange', fromHash);
})();`, 'deck deep links');
write('script.js', js);
console.log('script.js: enlaces profundos al deck');
console.log('OK');
