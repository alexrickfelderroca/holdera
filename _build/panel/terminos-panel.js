/* ==========================================================================
   HOLDERA — ventanas de términos dentro del panel demo (paso 14).

   FUENTE: _build/panel/terminos-panel.js. Lo copia a panel/_holdera/ el
   script _build/panel-copy.js, que además escribe el bloque de datos. La
   carpeta panel/ se borra entera en cada recaptura: no se edita allí.

   Lo mismo que terminos.js hace en la web —la sigla destacada y una ventana
   que dice qué significa al pasar el cursor— pero dentro de una aplicación
   de React ya hidratada, y eso cambia el cómo:

   🔴 NO SE TOCA EL DOM DE REACT. Envolver una sigla en un <abbr> es partir su
   nodo de texto, y React guarda referencias a esos nodos: la próxima vez que
   actualice ese texto (el panel de noche seleccionada, la lectura de un
   gráfico) escribiría en un nodo que ya no está en la página —el texto se
   queda congelado— o intentaría quitarlo y lanzaría NotFoundError, que tumba
   el árbol. Es el mismo fallo que provoca un traductor del navegador.
   Por eso:
     - el destacado es la API de CSS Custom Highlight: rangos sobre el texto
       que YA existe, pintados por ::highlight(hx-term) en holdera.css;
     - la ventana se decide por coordenadas (caretPositionFromPoint), no por
       un elemento sobre el que poner un listener;
     - un MutationObserver vuelve a buscar cuando React cambia el texto.
   Nada de esto escribe en un nodo que React conozca.

   Sin la API (navegadores anteriores a 2024) no pasa nada: no hay destacado
   ni ventana, y el panel sigue exactamente como estaba.
   ========================================================================== */
(function () {
  'use strict';

  /* terms:panel-start */
  var T = {};
  /* terms:panel-end */

  var doc = document;
  if (!window.CSS || !CSS.highlights || typeof Highlight === 'undefined') return;

  /* ------------------------------------------------------------ el patrón */
  var byKey = {};
  var keys = [];
  function add(k, id) {
    if (!k || byKey[k]) return;
    byKey[k] = id;
    keys.push(k);
  }
  Object.keys(T).forEach(function (id) {
    var e = T[id];
    [e.t].concat(e.a || []).forEach(function (k) {
      add(k, id);
      // "Pickup" / "pickup": las palabras (no las siglas) en las dos cajas.
      if (/^[A-Z][a-z]/.test(k)) add(k.charAt(0).toLowerCase() + k.slice(1), id);
      if (/^[a-z]/.test(k)) add(k.charAt(0).toUpperCase() + k.slice(1), id);
    });
  });
  keys.sort(function (a, b) { return b.length - a.length; });
  var esc = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
  /* Sin letra ni cifra pegada a ninguno de los dos lados: RevPAR no casa
     dentro de TRevPAR, ni LY dentro de STLY, ni IP dentro de una palabra. */
  var RE = new RegExp('(?<![A-Za-z0-9&/])(' + keys.map(esc).join('|') + ')(?![A-Za-z0-9])', 'g');

  var SKIP = 'script,style,noscript,textarea,input,select,option,svg,[aria-hidden="true"],[data-holdera-chrome],.hx-tip,[contenteditable]';

  /* ------------------------------------------------------------ el barrido */
  var HL = new Highlight();
  CSS.highlights.set('hx-term', HL);
  var byNode = new WeakMap();

  function scan() {
    HL.clear();
    byNode = new WeakMap();
    if (!doc.body) return;
    var walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.data || n.data.length < 2) return NodeFilter.FILTER_REJECT;
        var p = n.parentElement;
        if (!p || p.closest(SKIP)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    var n;
    while ((n = walker.nextNode())) {
      var m;
      var list = null;
      RE.lastIndex = 0;
      while ((m = RE.exec(n.data))) {
        var r = new Range();
        r.setStart(n, m.index);
        r.setEnd(n, m.index + m[0].length);
        HL.add(r);
        (list || (list = [])).push({ s: m.index, e: m.index + m[0].length, id: byKey[m[0]], r: r });
      }
      if (list) byNode.set(n, list);
    }
  }

  var scanTimer = 0;
  var lastScan = 0;
  function scheduleScan() {
    if (scanTimer) return;
    var wait = Math.max(120, 400 - (Date.now() - lastScan));
    scanTimer = setTimeout(function () {
      scanTimer = 0;
      lastScan = Date.now();
      scan();
      if (current) reanchor();
    }, wait);
  }

  /* ------------------------------------------------------------- la ventana */
  var tip = null;
  var parts = {};
  var current = null;   // { node, s, e, id, r }
  var hideTimer = 0;
  var raf = 0;
  var lastX = 0;
  var lastY = 0;

  function el(tag, cls, parent) {
    var x = doc.createElement(tag);
    if (cls) x.className = cls;
    if (parent) parent.appendChild(x);
    return x;
  }

  function buildTip() {
    tip = el('div', 'hx-tip', doc.body);
    tip.setAttribute('aria-hidden', 'true');
    tip.setAttribute('data-holdera-chrome', '');
    tip.hidden = true;
    var head = el('p', 'hx-tip__head', tip);
    parts.t = el('b', 'hx-tip__t', head);
    parts.en = el('span', 'hx-tip__en', head);
    parts.d = el('p', 'hx-tip__d', tip);
    parts.f = el('p', 'hx-tip__f', tip);
    tip.addEventListener('pointerenter', function () { clearTimeout(hideTimer); });
    tip.addEventListener('pointerleave', function () { scheduleHide(); });
  }

  /* El panel tiene su conmutador EN / ES: la definición sigue al idioma que
     el visitante ha elegido. La sigla y lo que significa van siempre en
     inglés, que es como se dicen en un hotel. */
  function spanish() {
    return !!doc.querySelector('.lang-switch-option.is-active[lang^="es"]');
  }

  function fill(id) {
    var e = T[id];
    var es = spanish();
    parts.t.textContent = e.t;
    var en = e.en && e.en.toLowerCase() !== e.t.toLowerCase() ? e.en : '';
    parts.en.textContent = en;
    parts.en.hidden = !en;
    parts.d.textContent = es ? (e.des || e.d) : e.d;
    var f = es ? (e.fes || e.f) : e.f;
    parts.f.textContent = f || '';
    parts.f.hidden = !f;
  }

  function rectOf(hit) {
    var rs = hit.r.getClientRects();
    return rs.length ? rs[0] : null;
  }

  function place() {
    raf = 0;
    if (!current || !tip || tip.hidden) return;
    var r = rectOf(current);
    if (!r || (!r.width && !r.height)) { hide(); return; }
    var vw = doc.documentElement.clientWidth;
    var vh = window.innerHeight;
    var w = tip.offsetWidth;
    var h = tip.offsetHeight;
    var gap = 9;
    var below = r.top - h - gap < 8;
    if (below && r.bottom + h + gap > vh - 8 && r.top > vh - r.bottom) below = false;
    var top = below ? r.bottom + gap : r.top - h - gap;
    var mid = r.left + r.width / 2;
    var left = Math.max(8, Math.min(vw - w - 8, mid - w / 2));
    tip.style.left = Math.round(left) + 'px';
    tip.style.top = Math.round(top) + 'px';
    tip.style.setProperty('--hx-arrow', Math.round(Math.max(14, Math.min(w - 14, mid - left))) + 'px');
    tip.classList.toggle('is-below', below);
  }

  function show(hit) {
    clearTimeout(hideTimer);
    if (!tip) buildTip();
    var same = current && current.r === hit.r;
    current = hit;
    if (!same) fill(hit.id);
    tip.hidden = false;
    place();
    tip.classList.add('is-in');
  }

  function hide() {
    clearTimeout(hideTimer);
    current = null;
    if (tip) { tip.classList.remove('is-in'); tip.hidden = true; }
  }

  function scheduleHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, 160);
  }

  /* Tras un nuevo barrido los rangos son otros: la ventana abierta se vuelve
     a enganchar al término que hay bajo el puntero, o se cierra. */
  function reanchor() {
    var hit = hitAt(lastX, lastY);
    if (hit) { current = hit; place(); } else hide();
  }

  /* --------------------------------------------------------- qué hay debajo */
  function caretAt(x, y) {
    if (doc.caretPositionFromPoint) {
      var p = doc.caretPositionFromPoint(x, y);
      return p ? { node: p.offsetNode, offset: p.offset } : null;
    }
    if (doc.caretRangeFromPoint) {
      var r = doc.caretRangeFromPoint(x, y);
      return r ? { node: r.startContainer, offset: r.startOffset } : null;
    }
    return null;
  }

  function inside(hit, x, y) {
    var rs = hit.r.getClientRects();
    for (var i = 0; i < rs.length; i++) {
      var q = rs[i];
      if (x >= q.left - 1 && x <= q.right + 1 && y >= q.top - 1 && y <= q.bottom + 1) return true;
    }
    return false;
  }

  function hitAt(x, y) {
    var pos = caretAt(x, y);
    if (!pos || !pos.node || pos.node.nodeType !== 3) return null;
    var list = byNode.get(pos.node);
    if (!list) return null;
    for (var i = 0; i < list.length; i++) {
      var h = list[i];
      if (pos.offset >= h.s && pos.offset <= h.e && inside(h, x, y)) return h;
    }
    return null;
  }

  /* --------------------------------------------------------------- escuchas */
  var moveRaf = 0;
  doc.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    lastX = e.clientX;
    lastY = e.clientY;
    if (moveRaf) return;
    moveRaf = requestAnimationFrame(function () {
      moveRaf = 0;
      if (tip && !tip.hidden && tip.contains(doc.elementFromPoint(lastX, lastY))) return;
      var hit = hitAt(lastX, lastY);
      if (hit) show(hit);
      else if (current) scheduleHide();
    });
  }, { passive: true });

  /* Táctil: un toque sobre la sigla abre la ventana; otro toque, en ella o
     fuera, la cierra. No se cancela nada: si la sigla está dentro de un
     enlace, el enlace sigue funcionando. */
  doc.addEventListener('pointerup', function (e) {
    if (e.pointerType === 'mouse') return;
    var hit = hitAt(e.clientX, e.clientY);
    if (hit && !(current && current.r === hit.r)) show(hit);
    else hide();
  }, { passive: true });

  doc.addEventListener('keydown', function (e) {
    if ((e.key === 'Escape' || e.key === 'Esc') && current) hide();
  });

  window.addEventListener('scroll', function () {
    if (!current) return;
    if (!raf) raf = requestAnimationFrame(place);
  }, { passive: true, capture: true });
  window.addEventListener('resize', hide);

  /* ----------------------------------------------------------------- inicio
     Después de hidratar: antes, React todavía puede reconciliar el texto y
     cualquier rango sobre él se quedaría colgando de un nodo viejo. */
  function start() {
    scan();
    lastScan = Date.now();
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) {
        var t = records[i].target;
        var host = t.nodeType === 1 ? t : t.parentElement;
        if (host && host.closest && host.closest('.hx-tip,[data-holdera-chrome]')) continue;
        scheduleScan();
        return;
      }
    }).observe(doc.body, { subtree: true, childList: true, characterData: true });
  }

  function whenIdle() {
    if (window.requestIdleCallback) requestIdleCallback(start, { timeout: 1500 });
    else setTimeout(start, 600);
  }
  if (doc.readyState === 'complete') whenIdle();
  else window.addEventListener('load', whenIdle);
})();
