/* HOLDERA — hero landing behaviour
   Base page works without JS (see .has-js gating in styles.css).
   GSAP + ScrollTrigger are optional: the sticky sheet works with CSS alone. */
(() => {
  'use strict';
  const html = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* ---------- Live clock (Barcelona) ---------- */
  const clocks = $$('[data-clock]');
  if (clocks.length) {
    const fmtT = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
    const fmtD = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Madrid' });
    const tick = () => {
      const now = new Date();
      const txt = `${fmtT.format(now)} · ${fmtD.format(now).replace('.', '')}`;
      clocks.forEach(el => { el.textContent = txt; });
    };
    tick();
    // re-tick on the minute boundary, then every minute
    setTimeout(() => { tick(); setInterval(tick, 60000); }, 60000 - (Date.now() % 60000));
    // a throttled background tab can miss ticks: catch up when it comes back
    document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
  }
  const year = $('[data-year]');
  if (year) year.textContent = String(new Date().getFullYear());

  /* The hero figure is the WebGL brain point cloud now (brain.js). Its fallback
     is the poster <img> that ships in the markup, so there is no image-error
     handler here any more — and, importantly, nothing in this file touches
     .hero__figure's transform: brain.js is its only writer while scrolling. */

  /* ---------- Hero load-in ---------- */
  const hero = $('.hero');
  const nav = $('body > .nav');   // the fixed bar (paso 6); the panel has none
  // pages without a hero show the bar at once; with a hero it joins the entrance below
  if (nav && !hero) requestAnimationFrame(() => nav.classList.add('is-ready'));
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
        if (nav) nav.classList.add('is-ready');
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
  }

  /* ---------- Scroll reveals: IO + rect check + failsafe ---------- */
  const reveals = $$('.reveal');
  const inView = el => { const r = el.getBoundingClientRect(); return r.top < window.innerHeight * 0.92 && r.bottom > 0; };
  const show = el => el.classList.add('is-in');
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(show);
  } else {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(el => { if (inView(el)) show(el); else io.observe(el); });
    // rect check on scroll (rAF-throttled) + timed failsafe, so nothing stays hidden if the observer misfires
    let pending = false;
    const sweep = () => { pending = false; reveals.forEach(el => { if (!el.classList.contains('is-in') && inView(el)) { show(el); io.unobserve(el); } }); };
    window.addEventListener('scroll', () => { if (!pending) { pending = true; requestAnimationFrame(sweep); } }, { passive: true });
    // periodic rect sweep: visible content always appears, off-screen content keeps its entrance
    const failsafe = setInterval(() => { sweep(); if (reveals.every(el => el.classList.contains('is-in'))) clearInterval(failsafe); }, 3000);
  }

  /* ---------- The fixed nav follows the scroll (paso 6) ----------
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
  }

  /* ---------- "Inicio" goes to the very top (the target sits inside the sticky hero) ---------- */
  $$('a[href="#inicio"]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    if (history.replaceState) history.replaceState(null, '', location.pathname + location.search);
  }));

  /* ---------- Services sub-menu ---------- */
  const subToggle = $('.nav__sub-toggle');
  const subItem = subToggle && subToggle.closest('.nav__item');
  if (subToggle && subItem) {
    const setSub = open => { subItem.classList.toggle('is-open', open); subToggle.setAttribute('aria-expanded', String(open)); };
    subToggle.addEventListener('click', () => setSub(!subItem.classList.contains('is-open')));
    document.addEventListener('click', e => { if (!subItem.contains(e.target)) setSub(false); });
    subItem.addEventListener('keydown', e => { if (e.key === 'Escape') { setSub(false); subToggle.focus(); } });
    subItem.addEventListener('focusout', e => { if (!subItem.contains(e.relatedTarget)) setSub(false); });
  }

  /* ---------- Side drawer ---------- */
  const drawer = $('#drawer');
  if (drawer) {
    const openers = $$('[data-drawer-open]');
    const closers = $$('[data-drawer-close]', drawer);
    const focusables = () => $$('a[href], button:not([disabled])', drawer.querySelector('.drawer__panel'));
    let lastFocus = null;
    const setOpen = open => {
      drawer.classList.toggle('is-open', open);
      drawer.setAttribute('aria-hidden', String(!open));
      if (open) drawer.removeAttribute('inert'); else drawer.setAttribute('inert', '');
      html.classList.toggle('is-locked', open);
      openers.forEach(b => b.setAttribute('aria-expanded', String(open)));
      if (open) {
        lastFocus = document.activeElement;
        setTimeout(() => { const f = focusables(); if (f.length) f[0].focus(); }, 60);
      } else if (lastFocus && typeof lastFocus.focus === 'function') {
        lastFocus.focus();
      }
    };
    openers.forEach(b => b.addEventListener('click', () => setOpen(true)));
    closers.forEach(b => b.addEventListener('click', () => setOpen(false)));
    $$('.drawer__links a, .drawer__foot a', drawer).forEach(a => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('focusin', e => {
      if (drawer.classList.contains('is-open') && !drawer.contains(e.target)) {
        const f = focusables(); if (f.length) f[0].focus();
      }
    });
    document.addEventListener('keydown', e => {
      if (!drawer.classList.contains('is-open')) return;
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false); return; }
      if (e.key === 'Tab') {
        const f = focusables(); if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ---------- Contact form (front-end only; TODO wire a backend) ---------- */
  const form = $('.form');
  if (form) {
    $$('input, textarea', form).forEach(f => f.addEventListener('input', () => {
      if (!f.classList.contains('is-invalid')) return;
      const valid = f.type === 'checkbox' ? f.checked : (f.checkValidity() && f.value.trim() !== '');
      if (!valid) return;
      f.classList.remove('is-invalid'); f.setAttribute('aria-invalid', 'false');
      const msg = document.getElementById('err-' + f.id.replace(/^f-/, ''));
      if (msg) { msg.hidden = true; f.removeAttribute('aria-describedby'); }
    }));
    form.addEventListener('submit', e => {
      e.preventDefault();
      const fields = $$('input, textarea', form);
      let ok = true;
      fields.forEach(f => {
        const valid = f.type === 'checkbox' ? f.checked : (f.checkValidity() && f.value.trim() !== '');
        f.classList.toggle('is-invalid', !valid);
        f.setAttribute('aria-invalid', String(!valid));
        const msg = document.getElementById('err-' + f.id.replace(/^f-/, ''));
        if (msg) {
          msg.hidden = valid;
          if (valid) f.removeAttribute('aria-describedby'); else f.setAttribute('aria-describedby', msg.id);
        }
        if (!valid) ok = false;
      });
      const err = $('.form__error', form);
      err.hidden = ok;
      if (!ok) { const first = $('.is-invalid', form); if (first) first.focus(); return; }
      $('.form__shell', form).hidden = true;
      const done = $('.form__done', form); done.hidden = false; done.focus();
    });
  }

  /* ---------- Scroll choreography (GSAP, desktop, motion allowed) ---------- */
  // Called twice — when the entrance ends and when the loader has both files —
  // and runs once whichever comes last.
  let scrollInit = false;
  function initScroll() {
    if (reduce || !hero || !entranceDone || scrollInit) return;
    if (!window.gsap || !window.ScrollTrigger) return;
    scrollInit = true;
    const gsap = window.gsap;
    const ST = window.ScrollTrigger;
    gsap.registerPlugin(ST);
    /* ScrollTrigger remembers the scroll position per URL (sessionStorage) and
       re-applies it around its first measurement. Reproduced 08-09-2026: a tab
       whose previous visit to this URL had ended near the bottom came back with
       start -7854 / end -6504 at scrollY 0 — progress 1 at the very top, the
       nav at opacity 0, copy and aside at 0.22, and no scroll that could undo
       it. That is the "menus gone until refresh" bug. Forget the memory here,
       re-measure once the page has settled, and self-heal at the top (below). */
    ST.clearScrollMemory();
    /* THE root cause of "the menus are gone when I scroll back up", found with
       the unminified plugin: on every refresh ScrollTrigger sets an inline
       scroll-behavior: auto and calls scrollTo(0) in the same task, without a
       style flush. With html { scroll-behavior: smooth } Chrome turns that
       scrollTo into a smooth glide, ST's scroll cache already believes it is at
       0, and the stage is measured at the REAL position: start = -scrollY.
       Refreshed at the bottom (7975) the trigger read start -7975 / end -6625,
       so the whole page was progress 1 — nav at 0 — and the pending glide then
       carried the page to the top on its own. Forcing the auto here, with a
       flush, makes the scrollTo instant; the inline style is removed again on
       refresh so anchors stay smooth. Validated: refresh at 7975 → 0 / 1350. */
    ST.addEventListener('refreshInit', () => { html.style.scrollBehavior = 'auto'; void html.offsetHeight; });
    // ST restores its recorded value inline AFTER this event fires, so the
    // clean-up has to wait one task or the inline "smooth" would stay forever
    ST.addEventListener('refresh', () => { setTimeout(() => { html.style.scrollBehavior = ''; }, 0); });
    const mm = gsap.matchMedia();
    mm.add('(min-width: 901px)', () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          // numeric, not 'top top' / 'bottom bottom': the stage is the first thing
          // on the page, so its start IS 0 and its end is its height minus the
          // viewport — numbers skip the rect measurement the note above is about
          trigger: '.hero-stage', start: 0, end: () => document.querySelector('.hero-stage').offsetHeight - window.innerHeight,
          scrub: 0.7, invalidateOnRefresh: true,
          // ...and never while the page is actually at the top, whatever the trigger thinks
          onUpdate: self => hero.classList.toggle('is-scrolling', self.progress > 0.001 && window.scrollY > 2),
          /* Back above the stage start the scrub is still catching up for
             0.7 s while is-scrolling has already been dropped: finish it NOW,
             so nav, copy and aside sit at their rest values the moment the top
             is reached and nothing is left in flight for a transition to grab. */
          onLeaveBack: self => {
            const t = self.getTween && self.getTween();
            if (t) t.progress(1);
            hero.classList.remove('is-scrolling');
          },
        },
      });
      // Two layers moving apart: the foreground (copy, aside, nav) lifts and thins
      // out, the background (wordmark, and the brain inside brain.js) sinks. The
      // gap between them is what uncovers the wordmark and the incoming sheet.
      //
      // .hero__figure is deliberately absent: brain.js drives the brain's drift,
      // spin and fade inside the WebGL scene. Tweening the element here as well
      // would put two writers on one transform.
      const NO = { immediateRender: false };
      tl.fromTo('.hero__copy', { y: 0, opacity: 1 }, { y: -120, opacity: 0.22, ease: 'none', duration: 0.6, ...NO }, 0)
        .fromTo('.hero__aside', { y: 0, opacity: 1 }, { y: -92, opacity: 0.22, ease: 'none', duration: 0.6, ...NO }, 0.04)
        .fromTo('.hero__wordmark', { y: 0 }, { y: () => window.innerHeight * 0.14, ease: 'none', duration: 1, ...NO }, 0);
      // (the nav is no longer here: since paso 6 it is fixed and follows the scroll)

      /* Self-healing. At the top of the page the hero must be at rest; if it is
         not (stale start/end, see clearScrollMemory above), re-measure and put
         the timeline at 0. Runs on every scroll event, costs two reads. */
      const heal = () => {
        if (window.scrollY > 4) return;
        const trig = tl.scrollTrigger;
        if (!trig) return;
        // judged on the TRIGGER, not on the class: onUpdate already refuses the
        // class at the top, so the class is clean even while the inline values
        // (nav opacity 0, copy at 0.22) are still the stale ones. "Stuck" means
        // well past the first pixels — at scrollY 2 the honest progress is
        // 2/1350 = 0.0015, and refreshing on THAT cancelled every smooth scroll
        // that started from a restored position of 1-4px.
        const stale = trig.start < -1 || trig.end <= trig.start;
        const stuck = trig.progress > 0.05;
        if (!stale && !stuck) return;
        ST.refresh();
        if (trig.progress > 0.05) tl.progress(0);
        hero.classList.remove('is-scrolling');
      };
      window.addEventListener('scroll', heal, { passive: true });
      // measure again once everything that can move the stage has settled
      requestAnimationFrame(() => ST.refresh());
      if (document.readyState !== 'complete') window.addEventListener('load', () => ST.refresh(), { once: true });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ST.refresh());
      setTimeout(heal, 250);
      return () => { window.removeEventListener('scroll', heal); hero.classList.remove('is-scrolling'); };
    });
  }
  // initScroll is scheduled from the hero load-in (see 'ready' above).
})();

/* --------------------------------------------------------------------------
   Orbit — the scroll wipe on the "Cómo trabajamos" step titles.

   The reference does this with framer-motion:
     const { scrollYProgress } = useScroll({ target: container,
                                             offset: ['start end', '25/speed vw end'] })
     const clipProgress = useTransform(scrollYProgress, [0,1], [100, 0])
     clip = inset(0 ${clipProgress}% 0 0)
   Same maths, written straight onto the element as --wipe (100 -> 0) and read
   by .ostep__fill's clip-path. Each title has its own progress, measured from
   its own box, which is what staggers them as they scroll.

   Everything here is additive: if it never runs, .ostep__base still shows the
   word and only the brighter overlay is missing.
   -------------------------------------------------------------------------- */
(() => {
  'use strict';
  const steps = Array.prototype.slice.call(document.querySelectorAll('.ostep'));
  if (!steps.length) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    // no scroll-driven reveal: show the bright copy outright rather than
    // leaving every title clipped to nothing
    steps.forEach(s => s.style.setProperty('--wipe', 0));
    return;
  }

  // the reference gives later projects a slower "speed", which stretches the
  // window they wipe over; same idea, keyed off the step's index
  const SPEEDS = [0.5, 0.5, 0.67, 0.8];

  function update() {
    const vh = window.innerHeight;
    for (let i = 0; i < steps.length; i++) {
      const el = steps[i];
      const r = el.getBoundingClientRect();
      const speed = SPEEDS[i % SPEEDS.length];
      // 0 when the top of the title reaches the bottom of the viewport,
      // 1 by the time it has travelled (25/speed)vw further up
      const travel = (25 / speed) * window.innerWidth / 100;
      const p = Math.max(0, Math.min(1, (vh - r.top) / (vh - travel + r.height || 1)));
      el.style.setProperty('--wipe', ((1 - p) * 100).toFixed(2));
    }
  }

  let pending = false;
  const onScroll = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; update(); });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
  // the observer can miss a fast scroll past the section, and a title left at
  // --wipe 100 is a title with no bright copy at all; a late sweep fixes it
  setTimeout(update, 400);
  setTimeout(update, 1600);
})();

/* --------------------------------------------------------------------------
   Pixelated reveal (hero card)

   Reference behaviour, reproduced exactly: a gridSize x gridSize grid of
   absolutely-positioned squares is shown one by one in RANDOM order over
   STEP ms; at STEP the underlying layer is swapped; then the same pixels are
   hidden again in a fresh random order. The eye reads it as the card
   dissolving into pixels and reassembling as something else.

   The reference uses GSAP staggers. This does not, on purpose: the page treats
   GSAP as an optional CDN layer and everything structural has to survive it
   being unreachable. A stagger is just index -> delay, which setTimeout does.

   Degradation:
     · no JS            -> the default face is what is already in the markup
     · reduced motion   -> the layer swaps with no flicker, grid never built
     · touch            -> tap toggles, since there is no hover
   -------------------------------------------------------------------------- */
(() => {
  'use strict';
  const cards = document.querySelectorAll('[data-pixel-reveal]');
  if (!cards.length) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches ||
    'ontouchstart' in window || navigator.maxTouchPoints > 0;

  const GRID = 7;
  const STEP = 300;                       // ms for one half of the flicker
  const SIZE = 100 / GRID;

  cards.forEach(card => {
    const grid = card.querySelector('[data-pixel-grid]');
    const alt = card.querySelector('[data-pixel-alt]');
    if (!alt) return;

    let active = false;
    let timers = [];
    const clear = () => { timers.forEach(clearTimeout); timers = []; };

    if (reduce || !grid) {
      // straight swap, no grid at all
      const set = on => { active = on; card.classList.toggle('is-swapped', on); };
      if (coarse) card.addEventListener('click', () => set(!active));
      else {
        card.addEventListener('mouseenter', () => set(true));
        card.addEventListener('mouseleave', () => set(false));
      }
      return;
    }

    const pixels = [];
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const p = document.createElement('i');
        p.className = 'widget__pixel';
        p.style.width = SIZE + '%';
        p.style.height = SIZE + '%';
        p.style.left = (c * SIZE) + '%';
        p.style.top = (r * SIZE) + '%';
        grid.appendChild(p);
        pixels.push(p);
      }
    }

    // Fisher-Yates over an index list, so "random order" is a real permutation
    // and every pixel is visited exactly once per half.
    const shuffled = () => {
      const a = pixels.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const k = Math.floor(Math.random() * (i + 1));
        const t = a[i]; a[i] = a[k]; a[k] = t;
      }
      return a;
    };

    const run = on => {
      active = on;
      clear();
      const each = STEP / pixels.length;

      pixels.forEach(p => { p.style.display = 'none'; });

      shuffled().forEach((p, i) => {
        timers.push(setTimeout(() => { p.style.display = 'block'; }, i * each));
      });

      timers.push(setTimeout(() => {
        card.classList.toggle('is-swapped', on);
      }, STEP));

      const out = shuffled();
      out.forEach((p, i) => {
        timers.push(setTimeout(() => { p.style.display = 'none'; }, STEP + i * each));
      });
    };

    if (coarse) {
      card.addEventListener('click', () => run(!active));
    } else {
      card.addEventListener('mouseenter', () => { if (!active) run(true); });
      card.addEventListener('mouseleave', () => { if (active) run(false); });
      // a keyboard user gets the same state change, since the card is a link
      card.addEventListener('focus', () => { if (!active) run(true); });
      card.addEventListener('blur', () => { if (active) run(false); });
    }
  });
})();

/* --------------------------------------------------------------------------
   Marquee menu rows — which edge the band comes from.

   The reference picks the closest edge with a squared-distance metric against
   the row's top and bottom midpoints, then animates the band and its inner
   wrapper in opposite directions with GSAP. The maths is reproduced exactly;
   the animation is not — it is a CSS transition on --edge, so the band slides
   with no library and, if this file never runs, the rows are still just links.
   -------------------------------------------------------------------------- */
(() => {
  'use strict';
  const rows = document.querySelectorAll('.mrow__link');
  if (!rows.length) return;

  const dist = (x, y, x2, y2) => {
    const dx = x - x2, dy = y - y2;
    return dx * dx + dy * dy;
  };

  rows.forEach(row => {
    // 'top' means the band arrives from above, so it starts at -101%
    const edgeFor = ev => {
      const r = row.getBoundingClientRect();
      const x = ev.clientX - r.left;
      const y = ev.clientY - r.top;
      return dist(x, y, r.width / 2, 0) < dist(x, y, r.width / 2, r.height) ? '-101%' : '101%';
    };
    const set = ev => row.style.setProperty('--edge', edgeFor(ev));

    row.addEventListener('mouseenter', set);
    // set it again on the way out so the band leaves towards whichever edge the
    // pointer actually left by, which is what makes it feel physical
    row.addEventListener('mouseleave', set);
    // keyboard has no pointer: pick a consistent direction
    row.addEventListener('focus', () => row.style.setProperty('--edge', '101%'));
  });
})();


/* --------------------------------------------------------------------------
   Servicios deck — the reference's page transition, advanced by scroll.

   Reference (click-driven, GSAP timeline):
     outgoing -> x:-50%, scale 0.8, opacity 0.4
     incoming -> x:100% .. 0
     both on one custom ease, 1.5s
   Here the same three properties are written from a scroll-derived progress, so
   the deck moves with the wheel instead of on a click. p runs 0..(n-1): the
   integer part is the slide you are leaving, the fraction is how far through
   the swap you are.

   Everything is a CSS custom property, so the browser composites it; JS only
   writes three numbers per visible slide per frame, and only the two slides
   taking part in the current swap are visible at all.
   -------------------------------------------------------------------------- */
(() => {
  'use strict';
  const deck = document.querySelector('[data-deck]');
  if (!deck) return;
  const stage = deck.querySelector('.deck__stage');
  const slides = Array.prototype.slice.call(deck.querySelectorAll('[data-slide]'));
  if (slides.length < 2 || !stage) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    // the CSS has already unstacked them; just mark them so the type is shown
    slides.forEach(s => { s.classList.add('is-live'); s.classList.add('is-entered'); });
    return;
  }

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  /* The reference's CustomEase "pageTransition" is
       M0,0 C0.38,0.05 0.48,0.58 0.65,0.82 0.82,1 1,1 1,1
     — a soft start, a quick middle and a long glide into place. That last part
     is what makes it feel warm rather than mechanical, so it is worth
     evaluating a real bezier instead of substituting a stock cubic.
     Newton-free: 12 bisection steps on x are exact enough at 60fps. */
  const bez = (p1x, p1y, p2x, p2y) => {
    const cx = 3 * p1x, bx = 3 * (p2x - p1x) - cx, ax = 1 - cx - bx;
    const cy = 3 * p1y, by = 3 * (p2y - p1y) - cy, ay = 1 - cy - by;
    const fx = u => ((ax * u + bx) * u + cx) * u;
    const fy = u => ((ay * u + by) * u + cy) * u;
    return x => {
      let lo = 0, hi = 1, u = x;
      for (let k = 0; k < 12; k++) { u = (lo + hi) / 2; if (fx(u) < x) lo = u; else hi = u; }
      return fy(u);
    };
  };
  const ease = bez(0.38, 0.05, 0.35, 1);

  let last = -1;
  function frame() {
    const r = stage.getBoundingClientRect();
    const travel = r.height - window.innerHeight;
    const p = travel > 0 ? clamp(-r.top / travel, 0, 1) * (slides.length - 1) : 0;
    const i = Math.min(slides.length - 2, Math.floor(p));
    const t = clamp(p - i, 0, 1);
    const e = ease(t);

    for (let k = 0; k < slides.length; k++) {
      const el = slides[k];
      const near = k === i || k === i + 1;
      el.classList.toggle('is-off', !near);
      if (!near) continue;
      /* The demo ALTERNATES: swap 0 travels vertically, swap 1 horizontally,
         and so on. Counted frame by frame off the video — the first change
         (0.2-0.9s) slides the new page up from the bottom, the second
         (1.9-2.5s) brings it in from the right. Both push the outgoing page
         away while shrinking it to 0.8 and fading it to 0.4. */
      const vertical = i % 2 === 0;
      if (k === i) {
        el.style.setProperty('--x', vertical ? '0%' : (-50 * e) + '%');
        el.style.setProperty('--y', vertical ? (-30 * e) + 'vh' : '0vh');
        el.style.setProperty('--s', (1 - 0.2 * e).toFixed(4));
        el.style.setProperty('--o', (1 - 0.6 * e).toFixed(4));
      } else {
        // the incoming panel TRANSLATES in whole — it is not revealed by a
        // clip, which would leave its contents standing still behind a mask
        el.style.setProperty('--x', vertical ? '0%' : (100 * (1 - e)) + '%');
        el.style.setProperty('--y', vertical ? (100 * (1 - e)) + '%' : '0%');
        el.style.setProperty('--s', '1');
        el.style.setProperty('--o', '1');
      }
    }

    // whichever slide is more than half-way on screen owns pointer events.
    // is-entered, once given, is never taken back: it drives the type entrance,
    // and a slide that is on its way OUT must keep its text.
    const live = t > 0.5 ? i + 1 : i;
    // every slide up TO the live one counts as entered, not just the live one:
    // arriving mid-deck (a deep link, or the browser restoring a scroll
    // position) would otherwise leave the outgoing slide's text at opacity 0
    // and you would watch an empty rectangle slide away.
    for (let k = 0; k <= live; k++) slides[k].classList.add('is-entered');
    if (live !== last) {
      slides.forEach((el, k) => el.classList.toggle('is-live', k === live));
      last = live;
    }
  }

  let pending = false;
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
  /* 'instant', never 'auto': with html { scroll-behavior: smooth } an 'auto'
     scrollTo GLIDES, so a deep link on load slid from the native jump to the
     slide. The second landing exists only for the instant case (the sticky
     stage can settle after the first jump); after a smooth click it yanked the
     page back if the wheel had moved meanwhile. */
  const goTo = (k, behavior) => {
    window.scrollTo({ top: Math.max(0, slideTop(k)), behavior });
    if (behavior === 'instant') setTimeout(() => window.scrollTo({ top: Math.max(0, slideTop(k)), behavior: 'instant' }), 60);
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
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
    goTo(k, behavior);
    if (history.replaceState) history.replaceState(null, '', url.hash);
  });
  const fromHash = () => { const k = indexOfHash(location.hash); if (k >= 0) goTo(k, 'instant'); };
  if (location.hash) { fromHash(); setTimeout(fromHash, 400); }
  window.addEventListener('hashchange', fromHash);
})();

/* --------------------------------------------------------------------------
   Service showcase — "Directional Hover Reveal".

   Hovering a service name in the hero list wipes its three artwork panels in
   from different edges, fades a full-bleed backdrop under them and brings up
   the service title, while the hero's own copy, card and point cloud step
   aside. Letting go puts everything back.

   Three decisions worth keeping:

   1. POINTER ONLY, and only a real mouse. The effect is decoration: it fires
      on pointerenter with pointerType === 'mouse' and never on keyboard focus.
      Blanking the H1 because somebody tabbed through five links would punish
      exactly the audience that cannot see the artwork. Keyboard gets a focus
      ring, screen readers get five plain links to #servicios, and a phone gets
      the list with no showcase at all.

   2. THE IMAGES ARE NOT IN THE INITIAL LOAD. 20 files, ~805 KB, all of it
      decoration for a hover that most visitors never perform. The sources sit
      in data-bg and are promoted to real background-image the moment the
      pointer enters the LIST — which is a second or so before any single name
      can be hovered, so they are already in flight when they are needed and
      cost nothing to everyone else.

   3. Without JS none of this exists and nothing is missing: the markup is a
      nav with five links, and the showcase layer has no background at all.
   -------------------------------------------------------------------------- */
(() => {
  'use strict';
  const works = document.querySelector('[data-works]');
  const showcase = document.querySelector('[data-showcase]');
  const hero = document.querySelector('.hero');
  if (!works || !showcase || !hero) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  const able = window.matchMedia('(min-width: 901px) and (hover: hover) and (pointer: fine)');

  const links = Array.from(works.querySelectorAll('a[data-work]'));
  const bgs = new Map();
  const items = new Map();
  showcase.querySelectorAll('.sc__bg[data-sc]').forEach(el => bgs.set(el.dataset.sc, el));
  showcase.querySelectorAll('.sc__item[data-sc]').forEach(el => items.set(el.dataset.sc, el));

  /* --- lazy sources ------------------------------------------------------ */
  let armed = false;
  function arm() {
    if (armed) return;
    armed = true;
    showcase.querySelectorAll('[data-bg]').forEach(el => {
      el.style.backgroundImage = 'url("' + el.getAttribute('data-bg') + '")';
      el.removeAttribute('data-bg');
    });
  }

  /* --- state ------------------------------------------------------------- */
  let current = null;
  let leaveTimer = null;

  function paint(key) {
    if (key === current) return;
    current = key;
    links.forEach(a => a.classList.toggle('is-current', a.dataset.work === key));
    bgs.forEach((el, k) => el.classList.toggle('is-on', k === key));
    items.forEach((el, k) => el.classList.toggle('is-on', k === key));
    hero.classList.toggle('is-showcase', !!key);
    // the fixed bar lives outside the hero now: it gets its own dark-ground class
    const bar = document.querySelector('body > .nav');
    if (bar) bar.classList.toggle('is-veiled', !!key);
    /* There is no call into waves.js here any more. It used to re-tone the
       thread for the dark veil, but the field is z-index 0 and the veil is
       z-index 3 at 93% opacity: the whole cross-module hook moved the
       composited pixel by about 1/255. Covered is covered. */
  }

  const clear = () => paint(null);

  function enter(key) {
    clearTimeout(leaveTimer);
    if (!able.matches) return;
    arm();
    // an open nav submenu over the dark veil looks like a leftover
    const openSub = document.querySelector('.nav__item.is-open');
    if (openSub) {
      openSub.classList.remove('is-open');
      const t = openSub.querySelector('.nav__sub-toggle');
      if (t) t.setAttribute('aria-expanded', 'false');
    }
    paint(key);
  }

  /* A small delay on the way out so sliding from one name to the next does not
     flash the hero back in between them. */
  function leave() {
    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(clear, 90);
  }

  works.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse' && able.matches) arm(); });

  links.forEach(a => {
    a.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') enter(a.dataset.work); });
    a.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') leave(); });
  });
  works.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') leave(); });

  /* Anything that can move the hero out from under the pointer clears it:
     otherwise the hero can be left dark with no pointer anywhere near the list
     (the sheet makes the hero inert on scroll, so no pointerleave ever comes). */
  window.addEventListener('scroll', () => { if (current) clear(); }, { passive: true });
  window.addEventListener('blur', clear);
  document.addEventListener('visibilitychange', () => { if (document.hidden) clear(); });
  able.addEventListener('change', () => { if (!able.matches) clear(); });
})();
