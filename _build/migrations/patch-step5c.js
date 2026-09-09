/* HOLDERA — paso 5c (08-09-2026): la causa real del bug «la nav desaparece al
 * volver arriba» (R1), reproducida por fin en Chrome.
 *
 *   node _build/migrations/patch-step5c.js   (una sola vez; falla si se repite)
 *
 * Medido: scrollY 0, ScrollTrigger con start −7854 / end −6504 y progress 1 →
 * la nav a opacity 0 inline, copy y aside a 0,22 y desplazados, «is-scrolling»
 * puesto — y nada que hacer salvo recargar. ScrollTrigger guarda la posición de
 * scroll por URL en sessionStorage (su «scroll memory») y la reaplica en torno a
 * su primera medición: si la visita anterior a esa URL terminó abajo del todo,
 * el escenario se mide con ese desplazamiento y el disparador queda por encima
 * de la página. Un `ScrollTrigger.refresh()` devolvió start 0 / end 1350 al
 * instante.
 *
 * Tres capas, en script.js:
 *   1. `ScrollTrigger.clearScrollMemory()` nada más registrar el plugin.
 *   2. re-medir cuando la página se asienta (siguiente frame, `load`, fuentes).
 *   3. auto-curación: si el scroll está arriba (≤ 2px) y el hero sigue en
 *      «is-scrolling», re-medir y llevar la línea de tiempo a 0.
 * Y `is-scrolling` ya no puede ponerse con la página arriba.
 * De paso: el planeta pide sus texturas a 60% de viewport, no a 100% (a
 * 1440x900 el 100% ya cubría la sección desde el primer frame).
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
`    const gsap = window.gsap;
    gsap.registerPlugin(window.ScrollTrigger);
    const mm = gsap.matchMedia();`,
`    const gsap = window.gsap;
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
    const mm = gsap.matchMedia();`, 'register + clearScrollMemory');
js = sub(js,
`          onUpdate: self => hero.classList.toggle('is-scrolling', self.progress > 0.001),`,
`          // ...and never while the page is actually at the top, whatever the trigger thinks
          onUpdate: self => hero.classList.toggle('is-scrolling', self.progress > 0.001 && window.scrollY > 2),`, 'onUpdate guard');
js = sub(js,
`        .fromTo('.nav', { y: 0, opacity: 1 }, { y: -14, opacity: 0, ease: 'none', duration: 0.18, ...NO }, 0.82);
      return () => hero.classList.remove('is-scrolling');
    });`,
`        .fromTo('.nav', { y: 0, opacity: 1 }, { y: -14, opacity: 0, ease: 'none', duration: 0.18, ...NO }, 0.82);

      /* Self-healing. At the top of the page the hero must be at rest; if it is
         not (stale start/end, see clearScrollMemory above), re-measure and put
         the timeline at 0. Runs on every scroll event, costs two reads. */
      const heal = () => {
        if (window.scrollY > 2 || !hero.classList.contains('is-scrolling')) return;
        ST.refresh();
        if (hero.classList.contains('is-scrolling')) { tl.progress(0); hero.classList.remove('is-scrolling'); }
      };
      window.addEventListener('scroll', heal, { passive: true });
      // measure again once everything that can move the stage has settled
      requestAnimationFrame(() => ST.refresh());
      if (document.readyState !== 'complete') window.addEventListener('load', () => ST.refresh(), { once: true });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ST.refresh());
      setTimeout(heal, 250);
      return () => { window.removeEventListener('scroll', heal); hero.classList.remove('is-scrolling'); };
    });`, 'heal');
write('script.js', js);
console.log('script.js: clearScrollMemory, guard, heal');

let pl = read('planet.js');
pl = sub(pl, `    }, { rootMargin: '100% 0px' });`, `    }, { rootMargin: '60% 0px' });`, 'planet margin');
write('planet.js', pl);
console.log('planet.js: rootMargin 60%');
console.log('OK');
