/* ============================================================================
 * hotel-anim.js — el recorrido por el hotel (puerto de animacion-hotel-holdera/)
 *
 * QUE SE HA QUITADO DEL ORIGINAL, Y POR QUE
 *
 *  1. La escena "hero" entera (video hero-v4.mp4, poster, H1, CTA y el
 *     indicador de scroll). Esta animacion va DEBAJO del hero de holdera.es,
 *     que ya tiene su titular y su llamada; y el mp4 es material de terceros.
 *     Las curvas medidas (hero-map-data.js) se conservan INTACTAS y se
 *     reproyectan: el progreso local q in [0,1] se mapea a p = P0 + q*(1-P0)
 *     con P0 = 0.0404, que es la muestra donde el hero ya vale 0 y la escena de
 *     confianza vale 1. Asi no hay ni un tramo muerto al principio y toda la
 *     coreografia medida (plano, camara, departamentos, contadores) sigue
 *     cayendo donde se midio. El alto del escenario baja de 12 a 11,55
 *     pantallas por el mismo motivo: 0,0404 * 11 = 0,44 pantallas de recorrido
 *     que ya no hacen falta.
 *
 *  2. `updateNavTheme()` y su listener de scroll. script.js de holdera ya
 *     gobierna la barra con is-scrolled / is-over-sheet / is-veiled, y dos
 *     escritores sobre las clases de .nav es exactamente el bug que costo el
 *     paso 5d. Este archivo NO TOCA la nav. (Comprobado ademas que no hace
 *     falta: sobre este bloque claro la nav esta en is-over-sheet, cuyo cristal
 *     es --nav-glass rgba(18,17,16,.80); el texto --on-ink-text compone a
 *     ~8,5:1 encima. No hay nada que corregir.)
 *
 *  3. `.reveal` -> `.ha-reveal`. En holdera `.reveal[data-reveal]` ya existe
 *     con otra semantica y lo observa script.js.
 *
 *  4. Todos los id llevan prefijo `ha-`: index.html ya tiene #producto,
 *     #contacto, #inicio, #como-trabajamos y cinco #producto-*.
 *
 * QUE SE HA AÑADIDO
 *
 *  - Inversion de paleta en el ORIGEN del dibujo: las 3946 lineas del SVG se
 *    repintan al cargarlo con el valor de --ha-line, y los cinco grupos de
 *    detalle de departamento con --ha-line-focus. Los colores se LEEN de los
 *    tokens (sonda de color), no hay literales aqui.
 *
 *  - Un solo juego de contenido. El original duplicaba los cinco departamentos
 *    (tarjeta de escritorio + acordeon movil): dos veces el mismo <h3> en el
 *    DOM. Aqui la lista <ol class="ha-list"> es el contenido real y, al armar
 *    el modo pineado, sus nodos se MUEVEN a los paneles de la tarjeta y se
 *    devuelven al desarmar. Ni contenido duplicado ni tabulables invisibles.
 *
 *  - Degradacion: sin JS, con prefers-reduced-motion o por debajo de 901px no
 *    se pide ni un byte de los datos medidos y el escenario se queda en
 *    `height: auto` con los cinco departamentos apilados y legibles.
 * ========================================================================== */

(function () {
  "use strict";

  var root = document.querySelector(".ha");
  if (!root) return;

  var q1 = function (sel, ctx) { return (ctx || root).querySelector(sel); };
  var qa = function (sel, ctx) {
    return Array.prototype.slice.call((ctx || root).querySelectorAll(sel));
  };

  root.classList.add("is-js");

  var BASE = String(root.getAttribute("data-ha-assets") || "assets/anim/");
  if (BASE.charAt(BASE.length - 1) !== "/") BASE += "/";

  /* 🔴 LAS CINCO ESCENAS LOTTIE VIENEN APAGADAS, Y ES A PROPOSITO.
     Tecnicamente funcionan: la inversion por CSS deja el line-art y los 33
     <image> incrustados perfectamente legibles como tinta sobre claro
     (comprobado a escala 1,5 en .screenshots/hotel-anim-pivot/port-lottie/).
     Lo que no se puede publicar es lo que DICEN. product-1 lleva un chat en
     ingles firmado por "Lance Agent" —el nombre de producto de otra empresa— y
     product-5 ensena KPIs inventados en dolares: 98% CURRENT OCCUPANCY,
     $428K REVENUE THIS MO, $186 REVPAR. Eso es exactamente lo que este
     proyecto borro en el paso 9 al retirar el panel viejo, y contradice la
     tesis del producto: ninguna cifra sin su origen.
     Para encenderlas cuando la obra este sustituida o aprobada:
     data-ha-scenes="on" en el <section class="ha">. */
  var SCENES_ON = root.getAttribute("data-ha-scenes") === "on";
  if (!SCENES_ON) root.classList.add("ha--no-scenes");

  var mqDesktop = window.matchMedia("(min-width: 901px)");
  var mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------------------------------------------------------------- colores
     Una sonda: se le pide `color: var(--token, fallback)` y se lee el color
     calculado, que siempre vuelve como rgb(). Asi no hay que parsear hex, rgb,
     color-mix ni oklch a mano — el motor ya lo ha hecho. Es la misma leccion
     que la nota de contraste del 26-08: los colores se miden, no se adivinan. */
  var probe = document.createElement("span");
  probe.setAttribute("aria-hidden", "true");
  probe.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none";
  root.appendChild(probe);

  function colorOf(token, fallback) {
    probe.style.color = "var(" + token + ", " + fallback + ")";
    var m = /rgba?\(([^)]+)\)/.exec(getComputedStyle(probe).color || "");
    if (!m) return [0, 0, 0];
    var n = m[1].split(/[\s,/]+/).map(parseFloat);
    return [n[0] | 0, n[1] | 0, n[2] | 0];
  }
  function rgb(c) { return "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")"; }
  function mix(a, b, t) {
    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t)
    ];
  }

  var C = {
    line: colorOf("--ha-line", "#55504a"),
    focus: colorOf("--ha-line-focus", "#9c4c08"),
    bgA: colorOf("--ha-bg-a", "#e5e5e5"),
    bgB: colorOf("--ha-bg-b", "#faf9f7"),
    paper: colorOf("--ha-paper", "#f4f3f0")
  };

  /* --------------------------------------------------------------- revelados
     Con observador, ademas un barrido por rect y un plazo de seguridad: un
     estado inicial oculto NUNCA puede quedarse oculto si el observador falla
     (regla de la casa, preview-and-animation.md). */
  var revealEls = qa(".ha-reveal");
  function showAll() { revealEls.forEach(function (el) { el.classList.add("is-visible"); }); }
  if (mqMotion.matches || !("IntersectionObserver" in window)) {
    showAll();
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
    var sweep = function () {
      revealEls.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.92 && r.bottom > 0) el.classList.add("is-visible");
      });
    };
    sweep();
    window.addEventListener("scroll", sweep, { passive: true });
    window.setTimeout(showAll, 4000);
  }

  /* Lo mismo para las tres filas de resultados, que tambien entran desde
     opacity 0: observador + barrido por rect + plazo de seguridad. Sin las dos
     ultimas se quedaban INVISIBLES si el observador no llegaba a disparar —
     medido en la captura de pagina entera a 390 px, donde las tres filas no
     aparecian en ninguna parte. */
  var statsSweep = function () {
    var el = document.getElementById("ha-stats");
    if (!el) return;
    var r = el.getBoundingClientRect();
    if (r.top < window.innerHeight * 0.92 && r.bottom > 0) startCounters();
  };
  if (mqMotion.matches) {
    window.setTimeout(function () { startCounters(); }, 0);
  } else {
    window.addEventListener("scroll", statsSweep, { passive: true });
    window.setTimeout(function () { statsSweep(); }, 300);
    window.setTimeout(function () { startCounters(); }, 6000);
  }

  /* ------------------------------------------------------------ lottie (lib)
     237 KB. No se pide hasta que hay una escena que enseñar. */
  var libPromise = null;
  function loadLottieLib() {
    if (libPromise) return libPromise;
    libPromise = new Promise(function (resolve, reject) {
      if (window.lottie) return resolve();
      var s = document.createElement("script");
      s.src = BASE + "js/lottie.min.js";
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error("lottie")); };
      document.head.appendChild(s);
    });
    return libPromise;
  }

  var scenes = {};                       // dept -> { anim, ready, pending, loop }
  function ensureScene(dept, loop) {
    if (!SCENES_ON) return null;
    var entry = scenes[dept];
    if (entry) {
      if (loop && entry.anim && entry.ready) { entry.anim.loop = true; entry.anim.play(); }
      entry.loop = !!loop || entry.loop;
      return entry;
    }
    var host = q1('.ha-media[data-dept="' + dept + '"]');
    if (!host || !host.getAttribute("data-lottie")) return null;
    entry = scenes[dept] = { anim: null, ready: false, pending: 0, loop: !!loop };
    loadLottieLib().then(function () {
      if (!window.lottie) return;
      entry.anim = window.lottie.loadAnimation({
        container: host,
        renderer: "svg",
        loop: false,
        autoplay: false,
        path: BASE + host.getAttribute("data-lottie"),
        rendererSettings: { preserveAspectRatio: "xMidYMid meet", progressiveLoad: true }
      });
      entry.anim.addEventListener("DOMLoaded", function () {
        entry.ready = true;
        if (entry.loop) { entry.anim.loop = true; entry.anim.play(); }
        else scrubScene(dept, entry.pending);
      });
    })["catch"](function () { /* la escena es decorativa: si no llega, no llega */ });
    return entry;
  }
  function scrubScene(dept, local) {
    if (!SCENES_ON) return;
    var e = scenes[dept];
    if (!e) return;
    e.pending = local;
    if (!e.ready || !e.anim || e.loop) return;
    var total = e.anim.totalFrames || 1;
    e.anim.goToAndStop(Math.max(0, Math.min(total - 1, local * (total - 1))), true);
  }
  function resizeScenes() {
    Object.keys(scenes).forEach(function (d) {
      var e = scenes[d];
      if (e && e.anim && e.ready) { try { e.anim.resize(); } catch (err) { /* noop */ } }
    });
  }

  /* ------------------------------------------------------- el plano (el SVG)
     Un cargador para los dos usos: el plano pineado con camara, y el plano
     estatico de la version apilada. La INVERSION DE PALETA ocurre aqui: el
     archivo trae 3946 trazos #969696 pensados para fondo negro. */
  var GROUP_IDS = ["fixed", "#1-fade", "#2-fade", "#3-fade", "#4-fade", "#5-fade",
    "#1-front-of-house", "#2-back-of-house", "#3-sales", "#4-food-and-beverage", "#5-management"];
  var FOCUS_IDS = GROUP_IDS.slice(6);
  var GEOM = "path, line, polyline, polygon, circle, ellipse, rect";

  var svgText = null, svgPending = null;
  function fetchSvg() {
    if (svgText !== null) return Promise.resolve(svgText);
    if (svgPending) return svgPending;
    svgPending = fetch(BASE + "svg/entire-drawing.svg")
      .then(function (r) { if (!r.ok) throw new Error("map " + r.status); return r.text(); })
      .then(function (t) { svgText = t; return t; });
    return svgPending;
  }

  /* Limpieza identica a la del original (fuera la lamina #CDCDCD y el telon
     negro) MAS el repintado a la paleta clara. Importante el orden: primero
     todo a --ha-line, despues los cinco grupos de detalle a --ha-line-focus. */
  function prepareSvg(host, text) {
    host.innerHTML = text;
    var svg = host.querySelector("svg");
    if (!svg) return null;
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.querySelectorAll("rect").forEach(function (r) {
      if (parseFloat(r.getAttribute("width") || "0") > 40000) r.remove();
    });
    var frame = svg.querySelector('[id="Frame 7"]');
    var backdrop = frame && frame.querySelector(":scope > rect");
    if (backdrop) backdrop.remove();

    var ink = rgb(C.line), hot = rgb(C.focus);
    svg.querySelectorAll("[stroke]").forEach(function (el) {
      el.setAttribute("vector-effect", "non-scaling-stroke");
      el.setAttribute("stroke-width", "1");
      if (el.getAttribute("stroke") !== "none") el.setAttribute("stroke", ink);
    });
    svg.querySelectorAll("[fill]").forEach(function (el) {
      if (el.getAttribute("fill") !== "none") el.setAttribute("fill", ink);
    });
    FOCUS_IDS.forEach(function (id) {
      var g = svg.querySelector('[id="' + id + '"]');
      if (!g) return;
      g.querySelectorAll("[stroke]").forEach(function (el) {
        if (el.getAttribute("stroke") !== "none") el.setAttribute("stroke", hot);
      });
      g.querySelectorAll("[fill]").forEach(function (el) {
        if (el.getAttribute("fill") !== "none") el.setAttribute("fill", hot);
      });
    });
    return svg;
  }

  function mulberry32(a) {           // semilla fija: el desorden es el mismo cada vez
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function inOut2(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function out2(t) { return 1 - (1 - t) * (1 - t); }

  function applyItem(it, f) {
    var raw = 1.45 * f - 0.45 * it.r;
    var u = raw < 0 ? 0 : raw > 1 ? 1 : raw;
    var st = it.el.style;
    if (it.stroke) {
      if (it.dashed) {
        st.strokeOpacity = String(it.so * inOut2(u));
      } else {
        st.strokeDashoffset = String(it.len * (1 - inOut2(u)));
        st.strokeOpacity = String(it.so * (raw <= 0 ? 0 : raw >= 0.18 ? 1 : out2(raw / 0.18)));
      }
    }
    if (it.fill) st.fillOpacity = String(it.fo * inOut2(u));
  }

  function collect(g, rnd) {
    var items = [];
    g.querySelectorAll(GEOM).forEach(function (el) {
      var stroke = el.getAttribute("stroke"), fill = el.getAttribute("fill");
      var hasStroke = !!stroke && stroke !== "none";
      var hasFill = !!fill && fill !== "none";
      if (!hasStroke && !hasFill) return;
      var len = 0;
      if (hasStroke) { try { len = el.getTotalLength(); } catch (e) { len = 0; } }
      if (!(len > 0)) len = 0;
      var so = parseFloat(el.getAttribute("stroke-opacity") || "1");
      var da = el.getAttribute("stroke-dasharray");
      var it = {
        el: el, len: len, so: so, r: rnd(),
        stroke: hasStroke && len > 0,
        dashed: so === 0.2 || (!!da && da !== "none"),
        fill: hasFill, fo: parseFloat(el.getAttribute("fill-opacity") || "1")
      };
      if (it.stroke) el.style.strokeDasharray = it.dashed ? (da && da !== "none" ? da : "4px 6px") : String(len);
      applyItem(it, 0);
      items.push(it);
    });
    return { items: items, level: 0 };
  }

  /* El dato guarda, por grupo, mean(dibujado) * mean(opacidad). Esta tabla hace
     el camino de vuelta: de esa media al nivel f del grupo. */
  var levelFor = (function () {
    var N = 200, rnd = mulberry32(11), rs = [], M = [], i, k;
    for (i = 0; i < 400; i++) rs.push(rnd());
    for (k = 0; k <= N; k++) {
      var f = k / N, sd = 0, so = 0;
      for (i = 0; i < rs.length; i++) {
        var raw = 1.45 * f - 0.45 * rs[i];
        sd += inOut2(raw < 0 ? 0 : raw > 1 ? 1 : raw);
        so += raw <= 0 ? 0 : raw >= 0.18 ? 1 : out2(raw / 0.18);
      }
      M.push((sd / rs.length) * (so / rs.length));
    }
    return function (m) {
      if (m <= M[0]) return 0;
      if (m >= M[N]) return 1;
      var lo = 0, hi = N;
      while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (M[mid] <= m) lo = mid; else hi = mid; }
      return (lo + (m - M[lo]) / (M[hi] - M[lo])) / N;
    };
  })();

  /* --------------------------------------------------- plano estatico (apilado)
     Se dibuja una sola vez, cuando entra en pantalla. Con movimiento reducido
     aparece ya dibujado: no hay barrido. */
  var staticDone = false;
  function loadStaticMap() {
    var host = q1("#ha-mapStatic");
    if (!host || staticDone || !window.fetch) return;
    if (navigator.connection && navigator.connection.saveData) return;   // 91 KB br: no en ahorro de datos
    staticDone = true;
    fetchSvg().then(function (text) {
      var svg = prepareSvg(host, text);
      if (!svg) return;
      svg.setAttribute("viewBox", "1000 -400 41600 22800");
      FOCUS_IDS.forEach(function (id) {
        var g = svg.querySelector('[id="' + id + '"]');
        if (g) g.style.display = "none";
      });
      var drawing = svg.querySelector('[id="hotel-drawing"]');
      if (!drawing) return;
      var group = collect(drawing, mulberry32(7));
      if (mqMotion.matches) {
        for (var i = 0; i < group.items.length; i++) applyItem(group.items[i], 1);
        return;
      }
      var run = function () {
        var t0 = 0, DUR = 3200 * 1.45;
        var step = function (ts) {
          if (!t0) t0 = ts;
          var f = Math.min(1, (ts - t0) / DUR);
          for (var i2 = 0; i2 < group.items.length; i2++) applyItem(group.items[i2], f);
          if (f < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      };
      if (!("IntersectionObserver" in window)) { run(); return; }
      var seen = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting && e.intersectionRatio > 0.15; })) {
          seen.disconnect(); run();
        }
      }, { threshold: [0.15, 0.25] });
      seen.observe(host);
    })["catch"](function () { staticDone = false; });
  }

  /* ===================================================== el recorrido pineado */

  var section = q1("#ha-stage-section");
  var pin = q1("#ha-pin");
  var list = q1("#ha-list");
  var card = q1("#ha-card");
  var dash = q1("#ha-dash");
  var stats = q1("#ha-stats");
  var tabs = qa(".ha-tab");
  var items = qa(".ha-item");
  var stages = {
    trust: q1("#ha-stageTrust"),
    tour: q1("#ha-stageTour"),
    outcomes: q1("#ha-stageOutcomes")
  };
  var layer = {
    scrim: q1("#ha-scrim"),
    map: q1("#ha-mapLayer"),
    gradL: q1("#ha-gradL"),
    gradT: q1("#ha-gradT")
  };
  if (!section || !pin || !list || !card) return;

  var deptOrder = items.map(function (li) { return li.getAttribute("data-dept"); });
  /* Los umbrales estan en el espacio del ORIGINAL (p), donde se midieron. */
  var DEPT_START = [0.182, 0.323, 0.465, 0.616, 0.757, 0.889];
  var DEPT_FOCUS = [0.263, 0.404, 0.545, 0.687, 0.838];
  var P_OUTCOMES = 0.95;
  var P0 = 0.0404;                       // la muestra donde el hero ya vale 0
  function toOrig(q) { return P0 + q * (1 - P0); }
  function toLocal(p) { return (p - P0) / (1 - P0); }

  var D = null, DATA_DESKTOP = null, DATA_TABLET = null;
  var armed = false, activeDept = null, lastP = -1, ticking = false;
  var map = { svg: null, groups: {}, loading: false };
  var panels = {};

  /* ------------------------------------------------------- paneles y traslado
     Un solo juego de contenido: los nodos se MUEVEN, no se clonan. */
  items.forEach(function (li) {
    var d = li.getAttribute("data-dept");
    var p = document.createElement("div");
    p.className = "ha-card__panel";
    p.id = "ha-panel-" + d;
    p.setAttribute("role", "tabpanel");
    p.setAttribute("aria-labelledby", "ha-tab-" + d);
    panels[d] = p;
  });

  function armContent() {
    items.forEach(function (li) {
      var d = li.getAttribute("data-dept"), p = panels[d];
      while (li.firstChild) p.appendChild(li.firstChild);
      card.appendChild(p);
      var media = p.querySelector(".ha-media");
      var w = media ? parseFloat(getComputedStyle(media).getPropertyValue("--ha-lottie-w")) : 321;
      if (!(w > 0)) w = 321;
      p.style.width = (w + 36) + "px";
    });
    var tablist = q1("#ha-tabs");
    if (tablist) {
      tablist.setAttribute("role", "tablist");
      tablist.setAttribute("aria-orientation", "vertical");
    }
    tabs.forEach(function (t) {
      t.setAttribute("role", "tab");
      t.setAttribute("aria-controls", "ha-panel-" + t.getAttribute("data-dept"));
      t.setAttribute("aria-selected", "false");
      t.setAttribute("tabindex", "-1");
    });
    resizeScenes();
  }

  function disarmContent() {
    items.forEach(function (li) {
      var p = panels[li.getAttribute("data-dept")];
      while (p.firstChild) li.appendChild(p.firstChild);
      if (p.parentNode) p.parentNode.removeChild(p);
      p.removeAttribute("style");
      p.classList.remove("is-active");
    });
    var tablist = q1("#ha-tabs");
    if (tablist) {
      tablist.removeAttribute("role");
      tablist.removeAttribute("aria-orientation");
    }
    tabs.forEach(function (t) {
      t.removeAttribute("role");
      t.removeAttribute("aria-controls");
      t.removeAttribute("aria-selected");
      t.removeAttribute("tabindex");
      t.classList.remove("is-active");
    });
    activeDept = null;
    resizeScenes();
  }

  /* ---------------------------------------------------- interpolacion y camara */
  function locate(p) {
    var P = D.p, n = P.length;
    if (p <= P[0]) return [0, 0];
    if (p >= P[n - 1]) return [n - 2, 1];
    var lo = 0, hi = n - 1;
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (P[mid] <= p) lo = mid; else hi = mid; }
    return [lo, (p - P[lo]) / (P[lo + 1] - P[lo])];
  }
  function at(arr, s) { return arr[s[0]] + (arr[s[0] + 1] - arr[s[0]]) * s[1]; }

  var A0 = 1440 / 900, FX = 0.7, FY = 0.5;
  function camera(s, aspect) {
    var a = D.vb[s[0]], b = D.vb[s[0] + 1], t = s[1];
    var fx = (a[0] + FX * a[2]) + ((b[0] + FX * b[2]) - (a[0] + FX * a[2])) * t;
    var fy = (a[1] + FY * a[3]) + ((b[1] + FY * b[3]) - (a[1] + FY * a[3])) * t;
    var w0 = Math.exp(Math.log(a[2]) + (Math.log(b[2]) - Math.log(a[2])) * t);
    var A = D.aspect || A0;
    var h0 = w0 / A, w, h;
    if (aspect >= A) { w = w0; h = w0 / aspect; } else { h = h0; w = h0 * aspect; }
    return [fx - FX * w, fy - FY * h, w, h];
  }

  function loadPinnedMap() {
    var host = q1("#ha-map");
    if (!host || map.loading || map.svg || !window.fetch) return;
    map.loading = true;
    fetchSvg().then(function (text) {
      var svg = prepareSvg(host, text);
      if (!svg) return;
      var rnd = mulberry32(20260911);
      GROUP_IDS.forEach(function (id) {
        var g = svg.querySelector('[id="' + id + '"]');
        map.groups[id] = g ? collect(g, rnd) : null;
      });
      map.svg = svg;
      render(true);
    })["catch"](function () { /* el plano es decorativo: silencio */ })
      .then(function () { map.loading = false; });
  }

  /* ------------------------------------------------------------- la tarjeta */
  function panelOf(d) { return panels[d]; }
  function sizeCard(dept, animate) {
    var p = panelOf(dept);
    if (!card || !p) return;
    card.style.transition = animate
      ? "width var(--ha-t-resize) var(--ha-ease-io) var(--ha-t-swap), height var(--ha-t-resize) var(--ha-ease-io) var(--ha-t-swap)"
      : "none";
    card.style.width = p.offsetWidth + "px";
    card.style.height = p.offsetHeight + "px";
  }
  function placeDash(dept) {
    var btn = q1('.ha-tab[data-dept="' + dept + '"]');
    if (dash && btn) {
      dash.style.transform = "translateY(" + (btn.offsetTop + btn.offsetHeight / 2) + "px) translateY(-50%)";
    }
  }
  function setActiveDept(dept) {
    if (dept === activeDept) return;
    var first = !activeDept;
    activeDept = dept;
    tabs.forEach(function (t) {
      var on = t.getAttribute("data-dept") === dept;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.setAttribute("tabindex", on ? "0" : "-1");
    });
    placeDash(dept);
    items.forEach(function (li) {
      var d = li.getAttribute("data-dept"), p = panels[d], on = d === dept;
      p.style.transitionDelay = on && !first ? "0.68s" : "0s";
      p.classList.toggle("is-active", on);
      p.setAttribute("aria-hidden", on ? "false" : "true");
    });
    sizeCard(dept, !first);
  }
  function refreshCard() {
    if (armed && activeDept) { sizeCard(activeDept, false); placeDash(activeDept); }
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshCard);

  /* --------------------------------------------------------------- contadores */
  function startCounters() { if (stats) stats.classList.add("is-counting"); }
  function resetCounters() { if (stats) stats.classList.remove("is-counting"); }

  /* ------------------------------------------------------------- por fotograma */
  function progress() {
    var total = section.offsetHeight - window.innerHeight;
    if (total <= 0) return 1;
    var q = -section.getBoundingClientRect().top / total;
    return toOrig(Math.min(1, Math.max(0, q)));
  }

  function setStage(el, v) {
    if (!el) return;
    el.style.opacity = String(v);
    el.style.visibility = v > 0.001 ? "visible" : "hidden";
    el.style.pointerEvents = v > 0.5 ? "auto" : "none";
    el.classList.toggle("is-active", v > 0.5);
  }

  function render(force) {
    if (!armed || !D) return;
    var p = progress();
    if (!force && Math.abs(p - lastP) < 1e-5) return;
    lastP = p;

    var pr = pin.getBoundingClientRect();
    D = (pr.width / (pr.height || 1) < 1.1 && DATA_TABLET) ? DATA_TABLET : DATA_DESKTOP;
    var s = locate(p);

    /* El scrim ya no oscurece un video: es el PAPEL que va cubriendo el gris del
       hero hasta dejar el plano sobre papel limpio, y que se retira al final
       para que entre la ultima escena. Misma curva medida, color invertido. */
    var sa = at(D.scrim, s);
    layer.scrim.style.background = "rgba(" + C.paper[0] + "," + C.paper[1] + "," + C.paper[2] + "," + sa.toFixed(3) + ")";

    var mapOp = at(D.map, s);
    layer.map.style.opacity = String(mapOp);
    layer.map.style.visibility = mapOp > 0.001 ? "visible" : "hidden";
    layer.gradL.style.opacity = String(at(D.gradL, s));
    layer.gradT.style.opacity = String(at(D.gradT, s));

    /* El fondo medido iba de negro (0) a arena (247). Se normaliza esa rampa y
       se reproyecta entre los dos extremos CLAROS del proyecto. */
    var c0 = D.bg[s[0]], c1 = D.bg[s[0] + 1];
    var t = (c0[0] + (c1[0] - c0[0]) * s[1]) / 247;
    pin.style.backgroundColor = rgb(mix(C.bgA, C.bgB, t < 0 ? 0 : t > 1 ? 1 : t));

    setStage(stages.trust, at(D.trust, s));
    setStage(stages.tour, at(D.hud, s));
    var outOp = at(D.outcomes, s);
    setStage(stages.outcomes, outOp);

    if (map.svg) {
      var vb = camera(s, pr.width / (pr.height || 1));
      map.svg.setAttribute("viewBox",
        vb[0].toFixed(1) + " " + vb[1].toFixed(1) + " " + vb[2].toFixed(1) + " " + vb[3].toFixed(1));
      GROUP_IDS.forEach(function (id) {
        var g = map.groups[id];
        if (!g) return;
        var f = levelFor(at(D.groups[id], s));
        if (!force && Math.abs(f - g.level) < 0.002) return;
        g.level = f;
        for (var i = 0; i < g.items.length; i++) applyItem(g.items[i], f);
      });
    }

    var idx = 0;
    for (var d = 0; d < deptOrder.length; d++) if (p >= DEPT_START[d]) idx = d;
    setActiveDept(deptOrder[idx]);
    var local = (p - DEPT_START[idx]) / (DEPT_START[idx + 1] - DEPT_START[idx]);
    local = Math.min(1, Math.max(0, local));
    ensureScene(deptOrder[idx], false);
    scrubScene(deptOrder[idx], local);
    if (idx + 1 < deptOrder.length && p > DEPT_START[0] - 0.05) ensureScene(deptOrder[idx + 1], false);

    if (outOp > 0.5) startCounters(); else if (outOp < 0.1) resetCounters();
  }

  function onFrame() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; if (armed) render(false); });
  }

  /* section.offsetTop NO sirve: el offsetParent es .ha (position: relative)
     dentro de <main>, no el documento. El original vivia en una pagina donde
     la seccion colgaba del body. */
  function scrollToProgress(pOrig) {
    var total = section.offsetHeight - window.innerHeight;
    if (total <= 0) return;
    var top = section.getBoundingClientRect().top + window.pageYOffset;
    window.scrollTo({ top: top + total * toLocal(pOrig), behavior: mqMotion.matches ? "auto" : "smooth" });
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener("click", function () {
      var k = deptOrder.indexOf(tab.getAttribute("data-dept"));
      if (k < 0) return;
      if (!armed) return;
      scrollToProgress(DEPT_FOCUS[k]);
    });
    /* Patron de pestañas completo: flechas, Inicio y Fin. Sin esto, cinco
       botones con role="tab" son ARIA que miente. */
    tab.addEventListener("keydown", function (e) {
      var k = -1;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") k = (i + 1) % tabs.length;
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") k = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === "Home") k = 0;
      else if (e.key === "End") k = tabs.length - 1;
      if (k < 0) return;
      e.preventDefault();
      tabs[k].focus();
      tabs[k].click();
    });
  });

  var skip = q1("#ha-skip");
  if (skip) skip.addEventListener("click", function () { scrollToProgress(P_OUTCOMES); });

  /* ---------------------------------------------------- apilado: escenas y map */
  var stackedIo = null;
  function setupStacked() {
    loadStaticMap();
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (li) {
        var d0 = li.getAttribute("data-dept");
        ensureScene(d0, !mqMotion.matches);
        if (mqMotion.matches) scrubScene(d0, 1);
      });
      if (stats) startCounters();
      return;
    }
    if (stackedIo) return;
    stackedIo = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        if (en.target === stats) { startCounters(); stackedIo.unobserve(stats); return; }
        var d = en.target.getAttribute("data-dept");
        if (!d) return;
        ensureScene(d, !mqMotion.matches);
        /* Con movimiento reducido la escena no se reproduce ni se hace scrub, y
           el fotograma 0 de estos lottie esta VACIO: la caja quedaba en blanco.
           Se aparca en el ultimo fotograma, que es el estado "terminado". */
        if (mqMotion.matches) scrubScene(d, 1);
        stackedIo.unobserve(en.target);
      });
    }, { threshold: 0.25, rootMargin: "0px 0px -5% 0px" });
    items.forEach(function (li) { stackedIo.observe(li); });
    if (stats) stackedIo.observe(stats);
  }
  function teardownStacked() {
    if (stackedIo) { stackedIo.disconnect(); stackedIo = null; }
  }

  /* ------------------------------------------------------------ armar/desarmar */
  function clearInline() {
    [layer.scrim, layer.map, layer.gradL, layer.gradT, pin,
      stages.trust, stages.tour, stages.outcomes].forEach(function (el) {
      if (el) el.removeAttribute("style");
    });
    if (card) card.removeAttribute("style");
    if (dash) dash.removeAttribute("style");
  }

  function wantArmed() {
    return mqDesktop.matches && !mqMotion.matches && !!window.fetch && "Promise" in window;
  }

  var dataPromise = null;
  function loadData() {
    if (dataPromise) return dataPromise;
    dataPromise = Promise.all(["js/hero-map-data.js", "js/hero-map-data-tablet.js"].map(function (f) {
      return new Promise(function (resolve) {
        var s = document.createElement("script");
        s.src = BASE + f;
        s.async = true;
        s.onload = resolve;
        s.onerror = resolve;                 // el de tablet es opcional
        document.head.appendChild(s);
      });
    })).then(function () {
      DATA_DESKTOP = window.HERO_MAP_DATA || null;
      DATA_TABLET = window.HERO_MAP_DATA_TABLET || null;
      return !!DATA_DESKTOP;
    });
    return dataPromise;
  }

  function arm() {
    if (armed) return;
    armed = true;
    D = DATA_DESKTOP;
    root.classList.add("is-armed");
    teardownStacked();
    Object.keys(scenes).forEach(function (d) {
      var e = scenes[d];
      e.loop = false;
      if (e.anim && e.ready) { e.anim.loop = false; e.anim.pause(); }
    });
    armContent();
    lastP = -1;
    loadPinnedMap();
    render(true);
    /* Las cajas del panel se miden ANTES de que Geist aterrice; una segunda
       pasada corrige el alto de la tarjeta sin animarlo. */
    window.setTimeout(refreshCard, 120);
    notifyScrollTrigger();
  }

  function disarm() {
    if (!armed) {
      setupStacked();
      return;
    }
    armed = false;
    root.classList.remove("is-armed");
    clearInline();
    disarmContent();
    lastP = -1;
    setupStacked();
    notifyScrollTrigger();
  }

  /* Armar cambia el alto del documento en ~10.400 px de golpe, y en index.html
     hay otro ScrollTrigger (el deck de servicios) MAS ABAJO cuyas posiciones
     dependen de ese alto. Si no se avisa, el deck se dispara donde ya no esta.
     El refresh de ST con la pagina desplazada es el bug del paso 5d, pero
     initScroll ya lo neutraliza (refreshInit fuerza scroll-behavior:auto y usa
     start/end numericos) y ademas esto ocurre a los ~300 ms de la carga, con la
     pagina practicamente siempre arriba. Si GSAP no esta, no pasa nada. */
  function notifyScrollTrigger() {
    var ST = window.ScrollTrigger;
    if (!ST || typeof ST.refresh !== "function") return;
    requestAnimationFrame(function () { try { ST.refresh(); } catch (e) { /* noop */ } });
  }

  function setMode() {
    if (!wantArmed()) { disarm(); return; }
    loadData().then(function (ok) {
      if (!ok) { disarm(); return; }          // sin datos no hay recorrido: apilado
      if (wantArmed()) arm(); else disarm();
    });
  }

  setMode();
  window.addEventListener("scroll", onFrame, { passive: true });
  window.addEventListener("resize", function () {
    setMode();
    if (armed) { refreshCard(); render(true); }
  });
  var onMq = function () { setMode(); };
  if (mqDesktop.addEventListener) {
    mqDesktop.addEventListener("change", onMq);
    mqMotion.addEventListener("change", onMq);
  }
})();
