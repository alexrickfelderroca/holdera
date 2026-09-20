/*
 * _build/wake-reveals.js — despierta los scroll-reveals ANTES de capturar.
 *
 * Por qué existe (y por qué no es opcional):
 *   _build/shoot.js captura con `captureBeyondViewport: true`, que fotografía
 *   la página entera SIN hacer scroll. Los reveals de este sitio
 *   (`.has-js .reveal { opacity: 0 }` en styles.css:1261) solo se encienden
 *   cuando el elemento ENTRA en pantalla: IntersectionObserver, barrido por
 *   getBoundingClientRect y un failsafe cada 3 s, los tres con la misma
 *   condición `inView`. Resultado: en una captura de página entera todo lo que
 *   está por debajo del pliegue sale a opacidad 0 y la página parece VACÍA.
 *
 *   Eso ya me engañó una vez con integraciones.html: 3.458 px de catálogo en el
 *   DOM, con su alto de layout correcto, y la captura enseñando un rectángulo
 *   negro. Estuve a punto de reportar como bug de la web lo que era un fallo
 *   del verificador. Es la lección que este proyecto ya tiene escrita tres
 *   veces: un verificador que miente es peor que no tener verificador.
 *
 * Uso:
 *   node _build/shoot.js --routes ... --out ... --eval-file _build/wake-reveals.js
 *
 * Devuelve un JSON con lo que encontró, para que la captura venga con su
 * propia prueba al lado: si `apagados` no es 0, la imagen NO es de fiar.
 */
(async () => {
  const doc = document.documentElement;
  const el = document.scrollingElement || doc;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // `scroll-behavior: smooth` está en el CSS del sitio. Con él, fijar scrollTop
  // y leer acto seguido devuelve la posición VIEJA: el deslizamiento es
  // asíncrono. Hay que apagarlo y forzar un flush de estilos, igual que hace
  // initScroll en script.js con el refresh de ScrollTrigger.
  const prevBehavior = doc.style.scrollBehavior;
  doc.style.scrollBehavior = 'auto';
  void doc.offsetHeight;

  const paso = Math.max(240, Math.round(innerHeight * 0.55));
  let alto = el.scrollHeight;

  // Bajada en pasos. Se recalcula el alto en cada vuelta porque las propias
  // secciones que se revelan pueden cambiarlo (y en la home el escenario
  // pineado del hero mide distinto según dónde estés).
  for (let y = 0; y < alto + innerHeight; y += paso) {
    el.scrollTop = y;
    await sleep(110);
    alto = el.scrollHeight;
  }

  el.scrollTop = alto;
  await sleep(320);

  // Dónde dejar la página para la foto. Por defecto arriba; con ?park=N se
  // aparca a N píxeles. Existe por la home: su hero está pineado en un
  // escenario de 17.005 px, así que una captura de página entera no dice nada
  // útil y hay que fotografiarla por tramos. La posición viaja en la QUERY
  // porque shoot.js solo sabe pasar una expresión, no argumentos.
  const park = Number(new URLSearchParams(location.search).get('park') || 0);

  // Vuelta arriba y espera generosa: en la home, volver por encima del inicio
  // del escenario dispara onLeaveBack, que remata el scrub, y `.is-settled`
  // apaga las transiciones de la nav. Sin esta espera la captura pilla la nav
  // a medio encender.
  //
  // 🔴 Y hay que INSISTIR: con el hero pineado, un solo `scrollTop = 0` no
  // agarra — medido, se quedaba en 2.820. ScrollTrigger vuelve a escribir la
  // posición en su propio frame, así que se reintenta hasta que la posición
  // se sostiene sola durante dos comprobaciones seguidas.
  for (let intento = 0; intento < 8; intento++) {
    el.scrollTop = park;
    await sleep(180);
    if (Math.abs(el.scrollTop - park) <= 2) {
      await sleep(180);
      if (Math.abs(el.scrollTop - park) <= 2) break;
    }
  }
  await sleep(700);

  doc.style.scrollBehavior = prevBehavior;

  const reveals = Array.from(document.querySelectorAll('.reveal'));
  const apagados = reveals.filter((n) => getComputedStyle(n).opacity === '0');

  return JSON.stringify({
    alto_pagina: alto,
    park,
    reveals: reveals.length,
    apagados: apagados.length,
    // Si queda alguno apagado es un fallo REAL de la página, no de la captura:
    // ha estado en pantalla y no se ha encendido.
    quien: apagados.slice(0, 6).map((n) => {
      const cls = typeof n.className === 'string' ? n.className : '';
      return (n.id ? '#' + n.id + ' ' : '') + cls;
    }),
    scroll_final: el.scrollTop,
  });
})()
