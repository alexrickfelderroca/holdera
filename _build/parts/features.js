/* ==========================================================================
   BLOQUE: Funciones — las dos flechas del raíl. OPCIONAL.

   El raíl ya se desliza sin esto: con el dedo, con la rueda, con la barra de
   scroll y con el tabulador. Esto solo añade los dos botones de flecha.

   Cómo integrarlo (elige una):
     a) pegar el cuerpo de initFeatureRail() dentro del IIFE de script.js,
        junto a los demás bloques que se activan por presencia de nodo, y
        llamarlo una vez; o
     b) servir este archivo tal cual con <script src="features.js" defer>.

   Lo importante: es este script el que pone data-ft-ready en la sección, y
   el CSS no enseña las flechas hasta que ese atributo existe. Si el script
   no llega, no hay dos botones muertos en la página.
   ========================================================================== */
(function () {
  'use strict';

  function initFeatureRail() {
    var secciones = document.querySelectorAll('.ft');
    if (!secciones.length) return;

    Array.prototype.forEach.call(secciones, function (sec) {
      var via = sec.querySelector('[data-ft-viewport]');
      var prev = sec.querySelector('[data-ft-prev]');
      var next = sec.querySelector('[data-ft-next]');
      if (!via || !prev || !next) return;

      var lenta = window.matchMedia('(prefers-reduced-motion: reduce)');

      /* 🔴 El salto es ABSOLUTO, no relativo, y eso no es una preferencia.
         Con `scroll-snap-type: x mandatory`, un scrollBy() suave que aterriza
         entre dos puntos de anclaje provoca una segunda animación de reajuste;
         si llega otro scrollBy mientras esa corrección está en vuelo, Chrome
         se lo come. Medido en este raíl: tres clics seguidos en «siguiente»
         daban 484 → 884 → 884 (el tercero no movía nada), y desde el final
         «anterior» no volvía. Un scrollTo() a una posición calculada converge
         aunque le pisen la animación: si el clic llega a medio camino, el
         siguiente destino se calcula desde donde está de verdad.

         Los puntos se recalculan en cada clic: los anchos son clamp() y hay
         dos anchos distintos a propósito. */
      function puntos() {
        var rail = via.querySelector('.ft__rail');
        var inset = rail ? parseFloat(getComputedStyle(rail).paddingLeft) || 0 : 0;
        var base = via.getBoundingClientRect().left;
        var tope = via.scrollWidth - via.clientWidth;
        return Array.prototype.map.call(via.querySelectorAll('.ft-card'), function (c) {
          var x = c.getBoundingClientRect().left - base + via.scrollLeft - inset;
          return Math.min(tope, Math.max(0, Math.round(x)));
        });
      }

      function mover(signo) {
        var p = puntos();
        var tope = via.scrollWidth - via.clientWidth;
        var x = via.scrollLeft;
        var destino;
        if (signo > 0) {
          destino = p.find(function (o) { return o > x + 2; });
          if (destino === undefined) destino = tope;
        } else {
          var atras = p.filter(function (o) { return o < x - 2; });
          destino = atras.length ? atras[atras.length - 1] : 0;
        }
        via.scrollTo({
          left: Math.min(tope, Math.max(0, destino)),
          behavior: lenta.matches ? 'auto' : 'smooth'
        });
      }

      /* Un botón que no lleva a ninguna parte se apaga, pero NO se saca del
         orden de tabulación: desaparecer bajo el foco de alguien es peor que
         estar deshabilitado. aria-disabled + el click ignorado. */
      function pintar() {
        var max = via.scrollWidth - via.clientWidth;
        var x = via.scrollLeft;
        prev.setAttribute('aria-disabled', x <= 1 ? 'true' : 'false');
        next.setAttribute('aria-disabled', x >= max - 1 ? 'true' : 'false');
      }

      prev.addEventListener('click', function () {
        if (prev.getAttribute('aria-disabled') !== 'true') mover(-1);
      });
      next.addEventListener('click', function () {
        if (next.getAttribute('aria-disabled') !== 'true') mover(1);
      });

      var pendiente = false;
      via.addEventListener('scroll', function () {
        if (pendiente) return;
        pendiente = true;
        requestAnimationFrame(function () { pendiente = false; pintar(); });
      }, { passive: true });
      addEventListener('resize', pintar, { passive: true });

      pintar();
      sec.setAttribute('data-ft-ready', '');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFeatureRail);
  } else {
    initFeatureRail();
  }
})();
