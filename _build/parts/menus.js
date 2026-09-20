/* HOLDERA — los dos desplegables de la barra (Funciones e Integraciones) y sus
   equivalentes dentro del drawer.

   Mismo estilo que script.js: un IIFE por pieza, 'use strict', sin CDN, sin
   dependencias, y todo aditivo — si este archivo no llega, la pagina sigue
   funcionando: los dos disparadores son <a href> de verdad a /funciones/ y a
   /integraciones.html, y los paneles llevan el atributo hidden en el HTML, asi
   que no se ven nunca.

   LA PIEZA QUE HAY QUE ENTENDER
   -----------------------------
   En el HTML el disparador es un ENLACE. Aqui se convierte en un <button> con
   aria-expanded y aria-controls, que es lo que un desplegable necesita para
   existir para un lector de pantalla y para el teclado. El orden importa en
   los dos sentidos:
     - un <button> escrito en el HTML seria un boton MUERTO sin JS;
     - un <a> con aria-expanded miente: un enlace no despliega nada.
   Por eso la conversion se hace aqui y no en el markup.

   COMO SE CARGA
   -------------
   <script defer src="menus.js"></script> DESPUES de script.js, o apendado al
   final de script.js. Los dos bloques salen solos si no encuentran su nodo.

   🔴 ORDEN CON script.js (drawer). script.js engancha el cierre del drawer con
   $$('.drawer__links a, .drawer__foot a') en su arranque. Al sustituir el <a>
   disparador por un <button>, ese <a> deja de existir y el disparador NO
   cierra el drawer — que es justo lo que se quiere, porque su trabajo es
   desplegar. Los .msub__item siguen siendo <a> desde el HTML y si lo cierran.
   Si algun dia menus.js se cargara ANTES que script.js, el resultado es el
   mismo: script.js ya no encontraria ese <a>. */

/* --------------------------------------------------------------------------
   1) Los dos desplegables de la barra
   -------------------------------------------------------------------------- */
(() => {
  'use strict';
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  const disparadores = $$('.nav__links > [data-menu]');
  if (!disparadores.length) return;

  /* Un <a> pasa a <button> conservando clase, contenido y atributos de datos.
     El href se guarda en data-href: no se usa hoy, pero deja el destino a la
     vista de quien inspeccione el DOM y de cualquier cosa que quiera
     reconstruir el enlace. */
  function aBoton(a) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = a.className;
    b.innerHTML = a.innerHTML;
    Array.prototype.forEach.call(a.attributes, (at) => {
      if (at.name === 'href' || at.name === 'class') return;
      b.setAttribute(at.name, at.value);
    });
    b.setAttribute('data-href', a.getAttribute('href') || '');
    a.replaceWith(b);
    return b;
  }

  const grupos = [];
  disparadores.forEach((a) => {
    const panel = document.getElementById(a.getAttribute('data-menu'));
    if (!panel) return;                      // sin panel no hay desplegable: se queda como enlace
    const btn = aBoton(a);
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', panel.id);
    grupos.push({ btn, panel, bloqueado: false });
  });
  if (!grupos.length) return;

  let abierto = null;
  let temporizador = null;

  const focoDentro = (g) => $$('a[href], button:not([disabled])', g.panel);

  /* El panel cuelga de SU disparador, no del centro de la barra: es asi como
     lo hace la referencia y es lo que dice de quien es el panel. Se escribe en
     --mnu-x, que el CSS lee como `left`; si esto no llegara a ejecutarse el
     valor por defecto del CSS (50%) lo deja centrado, que es lo unico sensato
     sin saber de quien cuelga.
     32px de correccion: el panel tiene 24 de relleno y la primera columna 8
     mas, asi que restandolos el ROTULO del panel cae en la misma vertical que
     el texto del disparador. Y se recorta a los margenes de la pagina, porque
     el panel de integraciones mide 1020 y colgado del cuarto item se saldria
     por la derecha. */
  function situar(g) {
    const nav = g.btn.closest('.nav');
    if (!nav) return;
    const cajaNav = nav.getBoundingClientRect();
    const cajaBtn = g.btn.getBoundingClientRect();
    const aire = parseFloat(getComputedStyle(nav).paddingLeft) || 0;
    const ancho = g.panel.offsetWidth;
    const tope = Math.max(aire, cajaNav.width - ancho - aire);
    const x = Math.min(Math.max(cajaBtn.left - cajaNav.left - 32, aire), tope);
    g.panel.style.setProperty('--mnu-x', Math.round(x) + 'px');
  }

  function abrir(g) {
    if (abierto === g) return;
    if (abierto) cerrar(abierto, false);
    g.panel.hidden = false;                  // la animacion de entrada arranca aqui: es CSS
    situar(g);                               // despues de quitar hidden: offsetWidth de un display:none es 0
    g.btn.setAttribute('aria-expanded', 'true');
    abierto = g;
  }

  /* Al cerrar no hay animacion de salida a proposito: un menu que tarda en
     irse se interpone en lo que has ido a pulsar. */
  function cerrar(g, devolverFoco) {
    if (!g) return;
    g.panel.hidden = true;
    g.btn.setAttribute('aria-expanded', 'false');
    if (abierto === g) abierto = null;
    if (devolverFoco && typeof g.btn.focus === 'function') g.btn.focus();
  }

  const conRaton = (e) => !e.pointerType || e.pointerType === 'mouse';
  const sobre = (g) => g.btn.matches(':hover') || g.panel.matches(':hover');

  grupos.forEach((g) => {
    /* Clic: la via principal, y la unica en tactil. Al cerrar con el clic se
       bloquea la apertura por raton hasta que el puntero se vaya, o el propio
       hover lo reabriria en el mismo gesto. */
    g.btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (abierto === g) { cerrar(g, false); g.bloqueado = true; }
      else abrir(g);
    });

    g.btn.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        abrir(g);
        const f = focoDentro(g);
        if (f.length) f[0].focus();
      }
    });

    /* El raton es un ATAJO, nunca la unica via (un menu que solo abre con el
       raton no existe ni para el teclado ni para el dedo). 90ms de intencion
       para no abrirlo al pasar de largo camino de "Nosotros". */
    [g.btn, g.panel].forEach((zona) => {
      zona.addEventListener('pointerenter', (e) => {
        if (!conRaton(e) || g.bloqueado) return;
        clearTimeout(temporizador);
        temporizador = setTimeout(() => abrir(g), 90);
      });
      /* 300ms de gracia: entre el borde de la barra y el panel hay
         --mnu-drop (6px) mas el aire de la propia barra, y el puntero pasa por
         ahi sin estar sobre ninguno de los dos. Al vencer el plazo se
         pregunta por :hover de verdad en vez de suponerlo. */
      zona.addEventListener('pointerleave', (e) => {
        if (!conRaton(e)) return;
        clearTimeout(temporizador);
        temporizador = setTimeout(() => {
          if (abierto === g && !sobre(g)) cerrar(g, false);
        }, 300);
      });
    });

    g.btn.addEventListener('pointerleave', (e) => { if (conRaton(e)) g.bloqueado = false; });
  });

  /* Escape cierra y devuelve el foco al boton. */
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !abierto) return;
    e.preventDefault();
    clearTimeout(temporizador);
    cerrar(abierto, true);
  });

  /* Clic fuera. pointerdown y no click: cierra en cuanto se aprieta, antes de
     que el navegador decida si eso fue un clic o el principio de un arrastre. */
  document.addEventListener('pointerdown', (e) => {
    if (!abierto) return;
    if (abierto.panel.contains(e.target) || abierto.btn.contains(e.target)) return;
    clearTimeout(temporizador);
    cerrar(abierto, false);
  });

  /* Tabular fuera del panel lo cierra. Esto es lo que hace que Tab RECORRA el
     panel y salga por el otro lado a la entrada siguiente de la barra, sin
     trampa de foco: el panel va justo detras de su boton en el DOM, asi que
     el orden natural ya es el correcto y aqui solo hay que recogerlo. */
  document.addEventListener('focusin', (e) => {
    if (!abierto) return;
    if (abierto.panel.contains(e.target) || abierto.btn.contains(e.target)) return;
    clearTimeout(temporizador);
    cerrar(abierto, false);
  });

  /* Un scroll con el menu abierto lo deja flotando sobre contenido que ya no
     es el suyo — y ademas la barra cambia de vestido a mitad. Se cierra.
     Con el resize pasa lo mismo y ademas la X calculada deja de valer, asi que
     en vez de recolocarlo en cada frame de un arrastre de ventana, se cierra:
     es lo que hace cualquier menu del sistema. */
  const cerrarPorEntorno = () => {
    if (abierto) { clearTimeout(temporizador); cerrar(abierto, false); }
  };
  window.addEventListener('scroll', cerrarPorEntorno, { passive: true });
  window.addEventListener('resize', cerrarPorEntorno, { passive: true });
})();

/* --------------------------------------------------------------------------
   2) Los mismos dos menus dentro del drawer

   Aqui NO hay apertura por raton (el drawer es la via tactil) y NO hay Escape
   propio: script.js ya escucha Escape mientras el drawer esta abierto y lo
   cierra entero, que es lo que espera quien pulsa Escape con un menu a
   pantalla completa delante. Anadir otro manejador dejaria el foco puesto en
   un boton dentro de un drawer recien marcado inert.
   -------------------------------------------------------------------------- */
(() => {
  'use strict';
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  const cabezas = $$('[data-msub-trigger]');
  if (!cabezas.length) return;

  function aBoton(a) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = a.className;
    b.innerHTML = a.innerHTML;
    Array.prototype.forEach.call(a.attributes, (at) => {
      if (at.name === 'href' || at.name === 'class') return;
      b.setAttribute(at.name, at.value);     // incluye style="--i:n", que es el escalonado de entrada
    });
    b.setAttribute('data-href', a.getAttribute('href') || '');
    a.replaceWith(b);
    return b;
  }

  const filas = [];
  cabezas.forEach((a) => {
    const lista = document.getElementById(a.getAttribute('data-msub-panel'));
    if (!lista) return;
    const btn = aBoton(a);
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', lista.id);
    filas.push({ btn, lista });
  });

  filas.forEach((f) => {
    f.btn.addEventListener('click', (e) => {
      e.preventDefault();
      const abrir = f.lista.hidden;
      /* Una sola abierta a la vez: el drawer no tiene tanto alto. */
      filas.forEach((o) => {
        o.lista.hidden = true;
        o.btn.setAttribute('aria-expanded', 'false');
      });
      if (abrir) {
        f.lista.hidden = false;
        f.btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* Al cerrarse el drawer, las sublistas vuelven a su sitio: si no, la
     siguiente vez se abre con la de la vez anterior desplegada y el usuario no
     ve las siete filas que esperaba. El drawer avisa por su clase, no por un
     evento, asi que se observa el atributo que script.js escribe. */
  const drawer = document.getElementById('drawer');
  if (drawer && 'MutationObserver' in window) {
    new MutationObserver(() => {
      if (drawer.classList.contains('is-open')) return;
      filas.forEach((f) => {
        f.lista.hidden = true;
        f.btn.setAttribute('aria-expanded', 'false');
      });
    }).observe(drawer, { attributes: true, attributeFilter: ['class'] });
  }
})();
