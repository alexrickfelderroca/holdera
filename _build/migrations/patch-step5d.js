/* HOLDERA — paso 5d (08-09-2026): la causa RAÍZ del bug de la nav (R1) y tres
 * hallazgos de la auditoría de runtime.
 *
 *   node _build/migrations/patch-step5d.js   (una sola vez; falla si se repite)
 *
 * R1, reproducido con GSAP 3.12.5 sin minificar: en `_refreshAll`, ScrollTrigger
 * anota `rec = scrollY`, escribe `html.style.scrollBehavior = "auto"`, llama a
 * `scrollTo(0)` EN LA MISMA TAREA (sin forzar estilos), mide y restaura. Con
 * `html { scroll-behavior: smooth }` Chrome no aplica ese `auto` a tiempo: el
 * `scrollTo(0)` se convierte en un deslizamiento suave, la caché de scroll de ST
 * ya cree que está a 0, y el escenario se mide en la posición real →
 * `start = −scrollY`. Con la página abajo (7975) queda `start −7975 / end −6625`
 * y toda la página es progreso 1: nav a 0, copy y aside a 0,22, y después el
 * deslizamiento pendiente lleva la página arriba sola — «vuelvo arriba y no hay
 * menús hasta recargar». Cualquier `refresh()` con la página desplazada lo
 * provoca (resize, maximizar, DevTools, zoom, `load` tardío, visibilitychange
 * con cambio de tamaño). Validado en página: con `refreshInit` forzando el
 * `auto` inline y un flush de estilos, el refresh a 7975 mide 0 / 1350.
 *
 *   script.js  — listeners refreshInit/refresh (auto + flush, y se retira el
 *                inline después para que las anclas sigan siendo suaves);
 *                start/end NUMÉRICOS para el escenario (saltan la medición por
 *                rect); enlaces profundos del deck: corrección 'instant' y sin
 *                segundo aterrizaje tras un clic suave; el reloj vuelve a
 *                marcar al volver a la pestaña.
 *   brain.js   — el `mousemove` global no mide layout si el hero no se ve.
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

let js = read('script.js');
js = sub(js,
`    ST.clearScrollMemory();
    const mm = gsap.matchMedia();`,
`    ST.clearScrollMemory();
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
    ST.addEventListener('refresh', () => { html.style.scrollBehavior = ''; });
    const mm = gsap.matchMedia();`, 'refreshInit');
js = sub(js,
`          trigger: '.hero-stage', start: 'top top', end: 'bottom bottom', scrub: 0.7, invalidateOnRefresh: true,`,
`          // numeric, not 'top top' / 'bottom bottom': the stage is the first thing
          // on the page, so its start IS 0 and its end is its height minus the
          // viewport — numbers skip the rect measurement the note above is about
          trigger: '.hero-stage', start: 0, end: () => document.querySelector('.hero-stage').offsetHeight - window.innerHeight,
          scrub: 0.7, invalidateOnRefresh: true,`, 'numeric start/end');
js = sub(js,
`  const goTo = (k, behavior) => {
    window.scrollTo({ top: Math.max(0, slideTop(k)), behavior });
    // the sticky stage can settle after the first jump (fonts, images): land twice
    setTimeout(() => window.scrollTo({ top: Math.max(0, slideTop(k)), behavior: 'auto' }), behavior === 'auto' ? 60 : 900);
  };`,
`  /* 'instant', never 'auto': with html { scroll-behavior: smooth } an 'auto'
     scrollTo GLIDES, so a deep link on load slid from the native jump to the
     slide. The second landing exists only for the instant case (the sticky
     stage can settle after the first jump); after a smooth click it yanked the
     page back if the wheel had moved meanwhile. */
  const goTo = (k, behavior) => {
    window.scrollTo({ top: Math.max(0, slideTop(k)), behavior });
    if (behavior === 'instant') setTimeout(() => window.scrollTo({ top: Math.max(0, slideTop(k)), behavior: 'instant' }), 60);
  };`, 'goTo');
js = sub(js,
`  const fromHash = () => { const k = indexOfHash(location.hash); if (k >= 0) goTo(k, 'auto'); };`,
`  const fromHash = () => { const k = indexOfHash(location.hash); if (k >= 0) goTo(k, 'instant'); };`, 'fromHash');
js = sub(js,
`    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    goTo(k, behavior);`,
`    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
    goTo(k, behavior);`, 'click behavior');
js = sub(js,
`    setTimeout(() => { tick(); setInterval(tick, 60000); }, 60000 - (Date.now() % 60000));`,
`    setTimeout(() => { tick(); setInterval(tick, 60000); }, 60000 - (Date.now() % 60000));
    // a throttled background tab can miss ticks: catch up when it comes back
    document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });`, 'clock');
write('script.js', js);
console.log('script.js: refreshInit/refresh, start/end numéricos, deck instant, reloj');

let br = read('brain.js');
br = sub(br,
`    window.addEventListener('mousemove', e => {
      // Only while the pointer is actually over the figure. Outside it the
      // cloud eases home instead of being tugged by a cursor that is on the
      // content sheet.
      const r = canvas.getBoundingClientRect();`,
`    window.addEventListener('mousemove', e => {
      // Nothing to do while the hero is off-screen or the cloud is not up yet —
      // and no layout read either: this listener is page-wide and the deck is
      // writing custom properties every frame further down.
      if (!running || !ready) { CUR.on = false; return; }
      // Only while the pointer is actually over the figure. Outside it the
      // cloud eases home instead of being tugged by a cursor that is on the
      // content sheet.
      const r = canvas.getBoundingClientRect();`, 'brain mousemove gate');
write('brain.js', br);
console.log('brain.js: mousemove sin layout fuera de pantalla');
console.log('OK');
