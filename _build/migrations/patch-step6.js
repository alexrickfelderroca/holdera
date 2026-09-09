/* HOLDERA — paso 6 (08-09-2026): la barra de navegación acompaña al scroll.
 *
 *   node _build/migrations/patch-step6.js   (una sola vez; falla si se repite)
 *
 * Encargo de Alex: «la barra horizontal ha de seguir bajando mientras
 * scroleas». Hasta ahora la nav vivía DENTRO del hero (absoluta), GSAP la
 * apagaba al final del escenario y la sustituía una isla flotante con el
 * monograma y MENÚ. Ahora:
 *   · la cabecera sale del hero / de la banda y va fija al principio del body,
 *     en las siete páginas (la copia sigue siendo la del shell);
 *   · a partir de 8px de scroll lleva un cristal claro (`is-scrolled`), y en
 *     cuanto la hoja oscura llega a su altura, cristal oscuro y colores on-ink
 *     (`is-over-sheet`); el escaparate la viste igual con `is-veiled`;
 *   · GSAP ya no la toca; la isla flotante desaparece (markup, CSS y JS); el
 *     centinela sigue sirviendo para dejar el hero `inert` cuando está tapado.
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
  return { out: src.slice(0, a) + src.slice(b), block: src.slice(a, b) };
}

/* ---------- páginas ---------- */
const PAGES = ['index.html', 'nosotros.html', 'partners.html', 'contacto.html', 'aviso-legal.html', 'privacidad.html', '404.html'];
for (const p of PAGES) {
  let html = read(p);
  fs.writeFileSync(path.join(ROOT, p.replace(/\.html$/, '.step5.bak')), html);
  // 1. la cabecera sale de su contenedor y va justo después del grano
  const h = cut(html, '      <header class="nav" data-enter style="--d:0">', '      </header>\n', p + ' cabecera');
  html = h.out;
  const header = h.block + '      </header>\n';
  html = sub(html, '  <div class="grain" aria-hidden="true"></div>\n',
    '  <div class="grain" aria-hidden="true"></div>\n\n  <!-- Cabecera FIJA (paso 6): acompaña al scroll en toda la página. Fuera del\n       hero a propósito: el hero pasa a inert cuando la hoja lo tapa. -->\n' + header + '\n', p + ' grano');
  // 2. fuera la isla flotante
  const f = cut(html, '  <!-- Floating island nav (appears once the page head is scrolled past) -->\n', '  <!-- Side menu -->', p + ' isla');
  html = f.out;
  write(p, html);
  console.log(p + ': cabecera fija, sin isla');
}
// el shell también
let sh = read(path.join('_build', 'shell', 'drawer.html'));
sh = cut(sh, '  <!-- Floating island nav (appears once the page head is scrolled past) -->\n', '  <!-- Side menu -->', 'shell isla').out;
write(path.join('_build', 'shell', 'drawer.html'), sh);
console.log('_build/shell/drawer.html: sin isla');

/* ---------- styles.css ---------- */
let css = read('styles.css');
fs.writeFileSync(path.join(ROOT, 'styles.step5.bak'), css);
css = sub(css, `  --fab-bg: rgba(48, 44, 39, 0.82);\n`,
`  /* the fixed nav's glass: light while it rides over the hero / the page band,
     dark once the sheet has reached it (paso 6) */
  --nav-glass-light: rgba(229, 229, 229, 0.82);
  --nav-glass: rgba(18, 17, 16, 0.80);
`, 'token fab-bg');
css = sub(css, `  --z-nav: 5;\n`, `  --z-nav: 30;   /* above the sheet (10) and the footer, below grain, drawer and skip link */\n`, 'z-nav');
css = sub(css, `  --z-fab: 70;\n`, '', 'z-fab');
css = sub(css, `.drawer :focus-visible, .fab :focus-visible { outline-color: var(--on-ink-text); }`,
  `.drawer :focus-visible { outline-color: var(--on-ink-text); }`, 'focus fab');
css = sub(css,
`/* Nav */
.nav {
  position: absolute; inset: 0 0 auto 0; height: var(--nav-h); z-index: var(--z-nav);
  display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
  padding: 0 var(--gutter);
}`,
`/* Nav — FIXED since paso 6: the bar follows the scroll on every page. It sits
   at the top of <body>, outside the hero (which goes inert once the sheet
   covers it). Three states written by script.js:
     is-scrolled   past 8px: a light glass so the bar stays legible over the
                   page band / the pinned hero, and it compresses to 64px
     is-over-sheet the dark sheet has reached the bar: dark glass, on-ink text
     is-veiled     the service showcase has darkened the hero: on-ink text */
.nav {
  position: fixed; inset: 0 0 auto 0; height: var(--nav-h); z-index: var(--z-nav);
  display: grid; grid-template-columns: 1fr auto 1fr; align-items: center;
  padding: 0 var(--gutter);
  background: transparent;
  transition: background-color var(--t-mid) var(--ease), height var(--t-mid) var(--ease),
              box-shadow var(--t-mid) var(--ease), opacity var(--t-slow) var(--ease), transform 1100ms var(--ease);
}
.nav.is-scrolled {
  height: 64px;
  background: var(--nav-glass-light);
  backdrop-filter: blur(18px) saturate(1.1); -webkit-backdrop-filter: blur(18px) saturate(1.1);
  box-shadow: 0 1px 0 var(--border);
}
.nav.is-over-sheet {
  background: var(--nav-glass);
  box-shadow: 0 1px 0 var(--on-ink-border);
}
/* the veil is transparent by design: the showcase's own backdrop is the ground */
.nav.is-veiled { background: transparent; backdrop-filter: none; -webkit-backdrop-filter: none; box-shadow: none; }
/* entrance: the nav is no longer under .hero [data-enter], so it has its own;
   script.js adds is-ready with the hero's, or at once on pages without one */
.has-js .nav[data-enter] { opacity: 0; transform: translateY(-10px); transition-delay: 120ms; }
.has-js .nav[data-enter].is-ready { opacity: 1; transform: none; transition-delay: 0s; }`, 'nav rule');
css = sub(css,
`/* The nav is the other thing that stays put, so it changes clothes too. */
.hero.is-showcase .nav__brand,
.hero.is-showcase .nav__links > a,
.hero.is-showcase .nav__sub-toggle { color: var(--on-ink-text-2); }
.hero.is-showcase .nav__links .is-active { color: var(--on-ink-text); }
.hero.is-showcase .nav__links .is-active::after { background: var(--on-ink-text); }
.hero.is-showcase .nav__tz-label { color: var(--on-ink-muted); }
.hero.is-showcase .nav__tz-time { color: var(--on-ink-text-2); }
.hero.is-showcase .nav__mark { background: var(--on-ink-hi); }
/* --sh-control-border, not --on-ink-border-strong: the MENÚ button is a ghost
   control whose ONLY affordance is its outline, so WCAG 1.4.11 asks 3:1.
   --on-ink-border-strong composites to 1.64:1 on the veil and the guard caught
   it. This is the same distinction the content sheet already makes between a
   decorative hairline and a control's boundary. */
.hero.is-showcase .nav .btn--secondary {
  border-color: var(--sh-control-border); color: var(--on-ink-text); background: transparent;
}
.hero.is-showcase .nav .btn--secondary:hover { background: var(--on-ink-hi); border-color: var(--on-ink-text-2); }
.hero.is-showcase :focus-visible { outline-color: var(--on-ink-text); }`,
`/* The nav changes clothes on a dark ground: the showcase veil (is-veiled) and
   the sheet (is-over-sheet) share the on-ink palette. */
.nav.is-veiled .nav__brand, .nav.is-over-sheet .nav__brand,
.nav.is-veiled .nav__links > a, .nav.is-over-sheet .nav__links > a,
.nav.is-veiled .nav__sub-toggle, .nav.is-over-sheet .nav__sub-toggle { color: var(--on-ink-text-2); }
.nav.is-veiled .nav__links .is-active, .nav.is-over-sheet .nav__links .is-active { color: var(--on-ink-text); }
.nav.is-veiled .nav__links .is-active::after, .nav.is-over-sheet .nav__links .is-active::after { background: var(--on-ink-text); }
.nav.is-veiled .nav__tz-label, .nav.is-over-sheet .nav__tz-label { color: var(--on-ink-muted); }
.nav.is-veiled .nav__tz-time, .nav.is-over-sheet .nav__tz-time { color: var(--on-ink-text-2); }
.nav.is-veiled .nav__mark, .nav.is-over-sheet .nav__mark { background: var(--on-ink-hi); }
.nav.is-veiled .nav__brand:hover, .nav.is-over-sheet .nav__brand:hover,
.nav.is-veiled .nav__links > a:hover, .nav.is-over-sheet .nav__links > a:hover,
.nav.is-veiled .nav__sub-toggle:hover, .nav.is-over-sheet .nav__sub-toggle:hover { color: var(--on-ink-text); }
/* --sh-control-border, not --on-ink-border-strong: the MENÚ button is a ghost
   control whose ONLY affordance is its outline, so WCAG 1.4.11 asks 3:1.
   --on-ink-border-strong composites to 1.64:1 on the veil and the guard caught
   it. This is the same distinction the content sheet already makes between a
   decorative hairline and a control's boundary. */
.nav.is-veiled .btn--secondary, .nav.is-over-sheet .btn--secondary {
  border-color: var(--sh-control-border); color: var(--on-ink-text); background: transparent;
}
.nav.is-veiled .btn--secondary:hover, .nav.is-over-sheet .btn--secondary:hover { background: var(--on-ink-hi); border-color: var(--on-ink-text-2); }
.nav.is-veiled :focus-visible, .nav.is-over-sheet :focus-visible { outline-color: var(--on-ink-text); }
.hero.is-showcase :focus-visible { outline-color: var(--on-ink-text); }`, 'nav on dark');
css = sub(css,
`.has-js .hero.is-settled .nav, .has-js .hero.is-settled .hero__wordmark { transition: none; }`,
`.has-js .hero.is-settled .hero__wordmark { transition: none; }`, 'settled');
css = sub(css,
`/* Floating island nav */
.fab {
  position: fixed; top: 20px; right: 20px; z-index: var(--z-fab);
  display: flex; align-items: center; gap: 8px; padding: 6px; border-radius: var(--r-pill);
  background: var(--fab-bg); border: 1px solid var(--on-ink-border-strong); color: var(--on-ink-text);
  backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); box-shadow: var(--shadow-dk);
  opacity: 0; transform: translateY(-14px); pointer-events: none;
  transition: opacity var(--t-mid) var(--ease), transform var(--t-mid) var(--ease);
}
.fab.is-visible { opacity: 1; transform: none; pointer-events: auto; }
.fab__brand { width: 36px; height: 36px; border-radius: 50%; background: var(--sh-bg); display: grid; place-items: center; box-shadow: var(--shadow-ink); }
.fab .btn--secondary { border-color: transparent; background: var(--on-ink-hi); }
.fab .btn--secondary:hover { background: var(--ink-hi); border-color: transparent; }
`, '', 'fab css');
css = sub(css, `.fab:not(.is-visible) { transition-timing-function: var(--ease-in); }\n`, '', 'fab ease');
write('styles.css', css);
console.log('styles.css: nav fija con tres estados, sin isla');

/* ---------- pages.css ---------- */
let pg = read('pages.css');
pg = sub(pg, `.has-js .phead [data-enter], .has-js .phead > .nav {
  animation: pg-in 900ms var(--ease) both;`, `.has-js .phead [data-enter] {
  animation: pg-in 900ms var(--ease) both;`, 'pages entrance');
pg = sub(pg, `  .has-js .phead [data-enter], .has-js .phead > .nav { animation: none; }`, `  .has-js .phead [data-enter] { animation: none; }`, 'pages reduced');
write('pages.css', pg);
console.log('pages.css: la nav ya no forma parte de la banda');

/* ---------- script.js ---------- */
let js = read('script.js');
fs.writeFileSync(path.join(ROOT, 'script.step5.bak'), js);
js = sub(js,
`  /* ---------- Hero load-in ---------- */
  const hero = $('.hero');`,
`  /* ---------- Hero load-in ---------- */
  const hero = $('.hero');
  const nav = $('body > .nav');   // the fixed bar (paso 6); the panel has none
  // pages without a hero show the bar at once; with a hero it joins the entrance below
  if (nav && !hero) requestAnimationFrame(() => nav.classList.add('is-ready'));`, 'nav ref');
js = sub(js,
`      requestAnimationFrame(() => {
        hero.classList.add('is-ready');`,
`      requestAnimationFrame(() => {
        hero.classList.add('is-ready');
        if (nav) nav.classList.add('is-ready');`, 'nav ready');
js = sub(js,
`        .fromTo('.hero__wordmark', { y: 0 }, { y: () => window.innerHeight * 0.14, ease: 'none', duration: 1, ...NO }, 0)
        .fromTo('.nav', { y: 0, opacity: 1 }, { y: -14, opacity: 0, ease: 'none', duration: 0.18, ...NO }, 0.82);`,
`        .fromTo('.hero__wordmark', { y: 0 }, { y: () => window.innerHeight * 0.14, ease: 'none', duration: 1, ...NO }, 0);
      // (the nav is no longer here: since paso 6 it is fixed and follows the scroll)`, 'gsap nav');
js = sub(js,
`  /* ---------- Floating island nav after the hero ---------- */
  const fab = $('.fab');
  const sentinel = $('.hero-sentinel');
  if (fab && sentinel) {
    const desktop = window.matchMedia('(min-width: 901px)');
    let shown = null;
    const setFab = on => {
      if (on === shown) return;
      shown = on;
      // hiding the island while its button holds focus would leave focus on an
      // aria-hidden control: hand it to the hero's own Menú button instead
      if (!on && fab.contains(document.activeElement)) { const b = $('.nav__menu'); if (b) b.focus({ preventScroll: true }); }
      fab.classList.toggle('is-visible', on);
      fab.setAttribute('aria-hidden', on ? 'false' : 'true');
      $$('a, button', fab).forEach(el => { el.tabIndex = on ? 0 : -1; });
      // on desktop the sticky hero is fully covered by the sheet at this point: take it out of the tab order
      if (hero) { if (on && desktop.matches) hero.setAttribute('inert', ''); else hero.removeAttribute('inert'); }
    };
    // driven by position, not by an observer: a jump-scroll can cross the sentinel without ever intersecting it
    let fabPending = false;
    const checkFab = () => { fabPending = false; setFab(sentinel.getBoundingClientRect().top < 0); };
    checkFab();
    window.addEventListener('scroll', () => { if (!fabPending) { fabPending = true; requestAnimationFrame(checkFab); } }, { passive: true });
    window.addEventListener('resize', checkFab, { passive: true });
    // crossing 900px changes whether the covered hero must be inert: re-evaluate
    desktop.addEventListener('change', () => { shown = null; checkFab(); });
  }`,
`  /* ---------- The fixed nav follows the scroll (paso 6) ----------
     Three things are decided from the scroll position, never from an observer
     (a jump-scroll can cross a sentinel without ever intersecting it):
       is-scrolled    past 8px — light glass, compact bar
       is-over-sheet  the dark sheet's top edge has reached the bar — dark glass
       hero inert     the sheet fully covers the pinned hero (desktop): nothing
                      invisible must stay in the tab order */
  const sentinel = $('.hero-sentinel');
  const mainEl = $('main');
  if (nav) {
    const desktop = window.matchMedia('(min-width: 901px)');
    let covered = null;
    const setCovered = on => {
      if (on === covered) return;
      covered = on;
      if (hero) { if (on && desktop.matches) hero.setAttribute('inert', ''); else hero.removeAttribute('inert'); }
    };
    let navPending = false;
    const checkNav = () => {
      navPending = false;
      nav.classList.toggle('is-scrolled', window.scrollY > 8);
      if (mainEl) nav.classList.toggle('is-over-sheet', mainEl.getBoundingClientRect().top < nav.offsetHeight);
      if (sentinel) setCovered(sentinel.getBoundingClientRect().top < 0);
    };
    checkNav();
    window.addEventListener('scroll', () => { if (!navPending) { navPending = true; requestAnimationFrame(checkNav); } }, { passive: true });
    window.addEventListener('resize', checkNav, { passive: true });
    // crossing 900px changes whether the covered hero must be inert: re-evaluate
    desktop.addEventListener('change', () => { covered = null; checkNav(); });
  }`, 'nav mode');
js = sub(js,
`    hero.classList.toggle('is-showcase', !!key);`,
`    hero.classList.toggle('is-showcase', !!key);
    // the fixed bar lives outside the hero now: it gets its own dark-ground class
    const bar = document.querySelector('body > .nav');
    if (bar) bar.classList.toggle('is-veiled', !!key);`, 'paint veiled');
write('script.js', js);
console.log('script.js: nav fija, sin isla, GSAP sin nav');

/* ---------- _build/contrast.js ---------- */
let ct = read(path.join('_build', 'contrast.js'));
const n = (ct.match(/\.hero\.is-showcase \.nav/g) || []).length;
ct = ct.split('.hero.is-showcase .nav .btn--secondary').join('.nav.is-veiled .btn--secondary');
ct = ct.split('.hero.is-showcase .nav').join('.nav.is-veiled .nav');
ct = sub(ct, `  ['showcase title on veil', ['.sc__title', 'color'],          VEIL, 3],`,
`  ['showcase title on veil', ['.sc__title', 'color'],          VEIL, 3],
  // the fixed bar over the two glasses (paso 6): text on glass on its ground
  ['nav link on light glass',  ['.nav__links > a', 'color'],                     [['.nav.is-scrolled', 'background'], { token: '--bg-3' }], 4.5],
  ['nav clock on light glass', ['.nav__tz-time', 'color'],                       [['.nav.is-scrolled', 'background'], { token: '--bg-3' }], 4.5],
  ['nav link on dark glass',   ['.nav.is-over-sheet .nav__links > a', 'color'],  [['.nav.is-over-sheet', 'background'], { token: '--sh-bg' }], 4.5],
  ['nav clock on dark glass',  ['.nav.is-over-sheet .nav__tz-time', 'color'],    [['.nav.is-over-sheet', 'background'], { token: '--sh-bg' }], 4.5],
  ['nav menu on dark glass',   ['.nav.is-over-sheet .btn--secondary', 'color'],  [['.nav.is-over-sheet', 'background'], { token: '--sh-bg' }], 4.5],
  ['nav menu border on dark glass', ['.nav.is-over-sheet .btn--secondary', 'border-color'], [['.nav.is-over-sheet', 'background'], { token: '--sh-bg' }], 3],`, 'contrast glass');
write(path.join('_build', 'contrast.js'), ct);
console.log('contrast.js: ' + n + ' selectores renombrados, cristales vigilados');
console.log('OK');
