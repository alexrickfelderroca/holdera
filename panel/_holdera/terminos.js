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
  var T = {"rn":{"t":"RN","en":"Room nights","d":"One room sold for one night: the hotel's unit of volume.","f":"","des":"Una habitación vendida durante una noche: la unidad de volumen del hotel.","fes":"","a":["room nights"]},"vc":{"t":"VC","en":"Vacant Clean","d":"Empty, clean and ready to sell.","f":"","des":"Libre, limpia y lista para vender.","fes":""},"vd":{"t":"VD","en":"Vacant Dirty","d":"Empty and waiting to be cleaned.","f":"","des":"Libre y pendiente de limpieza.","fes":""},"ip":{"t":"IP","en":"Cleaning in progress","d":"Housekeeping is cleaning it now.","f":"","des":"Housekeeping la está limpiando ahora.","fes":""},"ooo":{"t":"OOO","en":"Out of Order","d":"Blocked for repairs or works: removed from sellable inventory.","f":"","des":"Bloqueada por avería u obra: sale del inventario disponible.","fes":""},"oos":{"t":"OOS","en":"Out of Service","d":"Short block for minor maintenance: stays in sellable inventory.","f":"","des":"Bloqueo breve por mantenimiento menor: sigue en el inventario disponible.","fes":""},"otb":{"t":"OTB","en":"On the Books","d":"Confirmed reservations for future dates at the time of reading.","f":"","des":"Reservas confirmadas para fechas futuras en el momento de la lectura.","fes":"","a":["on the books"]},"stly":{"t":"STLY","en":"Same Time Last Year","d":"The same date last year, read at the same lead time (364 days, same weekday).","f":"","des":"La misma fecha del año pasado, leída al mismo lead time (364 días, mismo día de la semana).","fes":""},"ly":{"t":"LY","en":"Last Year","d":"Final figure for the same period last year.","f":"","des":"Cifra final del mismo periodo el año pasado.","fes":""},"mtd":{"t":"MTD","en":"Month to Date","d":"Cumulative from the 1st of the month to date.","f":"","des":"Acumulado desde el día 1 del mes hasta la fecha.","fes":""},"lead-time":{"t":"Lead time","en":"Lead time","d":"Days left until arrival at the time of reading.","f":"","des":"Días que faltan hasta la llegada en el momento de la lectura.","fes":""},"pms":{"t":"PMS","en":"Property Management System","d":"The hotel's core system: reservations, rooms, stays and billing.","f":"","des":"El sistema de gestión del hotel: reservas, habitaciones, estancias y facturación.","fes":""},"pos":{"t":"POS","en":"Point of Sale","d":"The till system of the restaurant, bar, spa or shop.","f":"","des":"El terminal de venta de restaurante, bar, spa o tienda.","fes":""},"rms":{"t":"RMS","en":"Revenue Management System","d":"System that recommends or sets rates from demand.","f":"","des":"Sistema que recomienda o fija tarifas según la demanda.","fes":""},"crm":{"t":"CRM","en":"Customer Relationship Management","d":"Guest database and history.","f":"","des":"Base de datos de clientes y su historial.","fes":""},"ota":{"t":"OTA","en":"Online Travel Agency","d":"Online intermediary: Booking.com, Expedia…","f":"","des":"Intermediario online: Booking.com, Expedia…","fes":"","a":["online travel agency"]},"gds":{"t":"GDS","en":"Global Distribution System","d":"Booking system used by agencies and corporates (Amadeus, Sabre…).","f":"","des":"Sistema de reservas de agencias y empresas (Amadeus, Sabre…).","fes":""},"fnb":{"t":"F&B","en":"Food & Beverage","d":"Restaurant, bar, room service and banqueting.","f":"","des":"Restauración: restaurante, bar, room service y banquetes.","fes":""},"mice":{"t":"MICE","en":"Meetings, Incentives, Conferences & Exhibitions","d":"Meetings, incentives, conferences and events segment.","f":"","des":"Segmento de reuniones, incentivos, congresos y eventos.","fes":""},"esg":{"t":"ESG","en":"Environmental, Social & Governance","d":"Environmental, social and governance criteria.","f":"","des":"Criterios ambientales, sociales y de gobierno.","fes":""},"gop":{"t":"GOP","en":"Gross Operating Profit","d":"Total revenue minus the hotel's operating costs.","f":"Total revenue − operating expenses","des":"Ingresos totales menos los costes operativos del hotel.","fes":"Ingresos totales − costes operativos"},"kpi":{"t":"KPI","en":"Key Performance Indicator","d":"Metric that measures the hotel's performance.","f":"","des":"Métrica que mide el rendimiento del hotel.","fes":"","a":["KPIs"]},"adr":{"t":"ADR","en":"Average Daily Rate","d":"Average room revenue earned per room sold.","f":"Room Revenue / Rooms Sold","des":"Ingreso medio por habitación vendida.","fes":"Ingresos de habitaciones ÷ habitaciones vendidas"},"revpar":{"t":"RevPAR","en":"Revenue per Available Room","d":"Room revenue generated per room available for sale.","f":"Room Revenue / Rooms Available","des":"Ingreso de habitaciones por habitación disponible (ADR × Occ).","fes":"Ingresos de habitaciones ÷ habitaciones disponibles"},"trevpar":{"t":"TRevPAR","en":"Total Revenue per Available Room","d":"Total hotel revenue per available room.","f":"Total Revenue / Rooms Available","des":"Ingreso total del hotel por habitación disponible.","fes":"Ingresos totales ÷ habitaciones disponibles"},"revpor":{"t":"RevPOR","en":"Revenue per Occupied Room","d":"Revenue attributed per occupied room.","f":"Declared Revenue / Occupied Rooms","des":"Ingreso por habitación ocupada.","fes":"Ingresos ÷ habitaciones ocupadas"},"goppar":{"t":"GOPPAR","en":"Gross Operating Profit per Available Room","d":"Gross operating profit generated per available room.","f":"GOP / Rooms Available","des":"Beneficio operativo bruto por habitación disponible.","fes":"GOP ÷ habitaciones disponibles"},"goppor":{"t":"GOPPOR","en":"Gross Operating Profit per Occupied Room","d":"Gross operating profit generated per occupied room.","f":"GOP / Occupied Rooms","des":"Beneficio operativo bruto por habitación ocupada.","fes":"GOP ÷ habitaciones ocupadas"},"pickup":{"t":"Pickup","en":"Pickup","d":"Change in on-the-books rooms or revenue between two cutoffs.","f":"Current On-the-books - Prior On-the-books","des":"Habitaciones o ingresos OTB que han entrado entre dos lecturas.","fes":"OTB actual − OTB de la lectura anterior","a":["picked up"]},"pace_vs_stly":{"t":"Pace vs STLY","en":"Pace versus Same Time Last Year","d":"On-the-books position compared with the same lead-time cutoff last year.","f":"Current OTB at Lead Time - STLY OTB at Same Lead Time","des":"Posición OTB frente a la del año pasado al mismo lead time.","fes":"OTB actual − OTB STLY al mismo lead time"},"ari":{"t":"ARI","en":"Average Rate Index","d":"Hotel ADR relative to its competitive set.","f":"Hotel ADR / Comp-set ADR x 100","des":"ADR del hotel frente al de su comp set.","fes":"ADR del hotel ÷ ADR del comp set × 100"},"mpi":{"t":"MPI","en":"Market Penetration Index","d":"Hotel occupancy relative to its competitive set.","f":"Hotel Occupancy / Comp-set Occupancy x 100","des":"Ocupación del hotel frente a la de su comp set.","fes":"Occ del hotel ÷ Occ del comp set × 100"},"rgi":{"t":"RGI","en":"Revenue Generation Index","d":"Hotel RevPAR relative to its competitive set.","f":"Hotel RevPAR / Comp-set RevPAR x 100","des":"RevPAR del hotel frente al de su comp set.","fes":"RevPAR del hotel ÷ RevPAR del comp set × 100"},"fnb_revpar":{"t":"F&B RevPAR","en":"Food & Beverage Revenue per Available Room","d":"F&B revenue normalised by available rooms.","f":"F&B Revenue / Rooms Available","des":"Ingresos de F&B por habitación disponible.","fes":"Ingresos F&B ÷ habitaciones disponibles"},"revpash":{"t":"RevPASH","en":"Revenue per Available Seat Hour","d":"F&B revenue per available seat-hour.","f":"F&B Revenue / (Available Seats x Operating Hours)","des":"Ingresos de F&B por asiento y hora disponibles.","fes":"Ingresos F&B ÷ (asientos × horas de servicio)"},"cpor":{"t":"CPOR","en":"Cost per Occupied Room","d":"Operating cost allocated per occupied room.","f":"Total Operating Costs / Occupied Rooms","des":"Coste operativo por habitación ocupada.","fes":"Costes operativos totales ÷ habitaciones ocupadas"},"cogs":{"t":"COGS","en":"Cost of Goods Sold","d":"Cost of goods consumed over a period.","f":"Beginning Inventory + Purchases - Ending Inventory","des":"Coste de la mercancía consumida en el periodo.","fes":"Inventario inicial + compras − inventario final"},"marketing_cost_per_acquisition":{"t":"CPA","en":"Cost per Acquisition","d":"Marketing spend per attributed acquisition.","f":"Eligible Marketing Spend / Attributed Acquisitions","des":"Gasto de marketing por cliente captado.","fes":"Gasto de marketing ÷ adquisiciones atribuidas"},"alos":{"t":"ALOS","en":"Average Length of Stay","d":"Average room nights per stay.","f":"Room Nights Sold / Number of Stays","des":"Noches medias por estancia.","fes":"Room nights vendidas ÷ estancias"},"nps":{"t":"NPS","en":"Net Promoter Score","d":"Promoter share less detractor share.","f":"% Promoters - % Detractors","des":"Porcentaje de promotores menos porcentaje de detractores.","fes":"% promotores − % detractores"},"gss":{"t":"GSS / CSAT","en":"Guest Satisfaction Score / Customer Satisfaction","d":"Average survey or review score on a declared scale.","f":"Average eligible response score on declared scale","des":"Puntuación media de encuestas o reseñas en la escala declarada.","fes":"Media de respuestas en la escala declarada","a":["GSS","CSAT"]}};
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
