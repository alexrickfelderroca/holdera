/* ==========================================================================
   HOLDERA — terminos.js
   La ventana pequeña de cada término técnico, y el filtro del glosario.

   Encargo de Alex (reunión del 27-09-2026): el lenguaje técnico va en negrita
   y, al poner el cursor encima, sale una ventana que dice qué significa
   («MTD = Month to date, STLY = Same Time Last Year, OTB = On the books»).

   El marcado lo escriben los generadores (_build/contenido/terminos-lib.js):
     <abbr class="term" data-term="adr" title="Average Daily Rate">ADR</abbr>
   Sin este script el title ya da la ventana nativa del navegador. Con él:
     - ratón: aparece al pasar por encima y se puede entrar en ella sin que se
       cierre (WCAG 1.4.13: persistente, se puede recorrer, Esc la cierra);
     - teclado: la PRIMERA aparición de cada término en la página es
       tabulable y su definición llega al lector de pantalla por
       aria-describedby. Solo la primera: cuarenta paradas de tabulador para
       leer la misma sigla serían un castigo, no una ayuda;
     - táctil: un toque la abre y otro (o tocar fuera) la cierra.
   La ventana visible va aria-hidden: lo que oye un lector es la definición
   oculta, una sola vez, y no la ventana repetida.

   Los datos van entre los marcadores terms:data y los escribe
   `node _build/contenido/build-funciones.js` desde glosario.json. No se
   editan a mano: se reescriben enteros.
   ========================================================================== */
(function () {
  'use strict';

  /* terms:data-start */
  var T = {"fisicas":["Habitaciones físicas","Physical rooms","","Todas las habitaciones del hotel, estén o no a la venta.",""],"disponibles":["Habitaciones disponibles","Rooms available","","Las habitaciones que se pueden vender: físicas menos OOO.","Físicas − OOO"],"vendidas":["Habitaciones vendidas","Rooms sold","","Habitaciones con reserva para una noche.",""],"rn":["RN","Room nights","Noches de habitación","Una habitación vendida durante una noche: la unidad de volumen del hotel.",""],"occupied":["Occupied","Occupied","Ocupada","Habitación con huésped alojado.",""],"vc":["VC","Vacant Clean","Libre y limpia","Libre, limpia y lista para vender.",""],"vd":["VD","Vacant Dirty","Libre y sucia","Libre y pendiente de limpieza.",""],"ip":["IP","Cleaning in progress","En limpieza","Housekeeping la está limpiando ahora.",""],"ooo":["OOO","Out of Order","Fuera de orden","Bloqueada por avería u obra: sale del inventario disponible.",""],"oos":["OOS","Out of Service","Fuera de servicio","Bloqueo breve por mantenimiento menor: sigue en el inventario disponible.",""],"in-house":["In house","In house","Alojados","Huéspedes alojados en el hotel ahora mismo.",""],"due-in":["Llegadas","","","Llegadas previstas hoy que aún no han hecho check-in.",""],"due-out":["Salidas","","","Salidas previstas hoy que aún no han hecho check-out.",""],"otb":["OTB","On the Books","En los libros","Reservas confirmadas para fechas futuras en el momento de la lectura.",""],"stly":["STLY","Same Time Last Year","Mismo momento del año pasado","La misma fecha del año pasado, leída al mismo lead time (364 días, mismo día de la semana).",""],"ly":["LY","Last Year","Año pasado","Cifra final del mismo periodo el año pasado.",""],"mtd":["MTD","Month to Date","Mes en curso","Acumulado desde el día 1 del mes hasta la fecha.",""],"booking-pace":["Booking pace","Booking pace","Ritmo de reservas","Ritmo al que entran las reservas de un periodo, frente a una referencia (normalmente STLY).",""],"lead-time":["Lead time","Lead time","Antelación","Días que faltan hasta la llegada en el momento de la lectura.",""],"noche-cerrada":["Noche cerrada","Closed night","","Noche ya pasada: sus cifras son reales, no OTB.",""],"comp-set":["Comp set","Competitive set","Set competitivo","Hoteles competidores con los que se compara el tuyo en ARI, MPI y RGI.",""],"pms":["PMS","Property Management System","","El sistema de gestión del hotel: reservas, habitaciones, estancias y facturación.",""],"pos":["POS","Point of Sale","TPV","El terminal de venta de restaurante, bar, spa o tienda.",""],"channel-manager":["Channel manager","Channel manager","","Reparte tarifas y disponibilidad entre los canales de venta.",""],"rms":["RMS","Revenue Management System","","Sistema que recomienda o fija tarifas según la demanda.",""],"crm":["CRM","Customer Relationship Management","","Base de datos de clientes y su historial.",""],"ota":["OTA","Online Travel Agency","Agencia de viajes online","Intermediario online: Booking.com, Expedia…",""],"gds":["GDS","Global Distribution System","","Sistema de reservas de agencias y empresas (Amadeus, Sabre…).",""],"directo":["Directo","Direct","","Reserva sin intermediario: web propia, teléfono o walk-in.",""],"fnb":["F&B","Food & Beverage","Alimentos y bebidas","Restauración: restaurante, bar, room service y banquetes.",""],"mice":["MICE","Meetings, Incentives, Conferences & Exhibitions","","Segmento de reuniones, incentivos, congresos y eventos.",""],"esg":["ESG","Environmental, Social & Governance","","Criterios ambientales, sociales y de gobierno.",""],"gop":["GOP","Gross Operating Profit","Beneficio operativo bruto","Ingresos totales menos los costes operativos del hotel.","Ingresos totales − costes operativos"],"night-audit":["Night audit","Night audit","Cierre del día","Cierre del día hotelero en el PMS: fija las cifras y abre el día siguiente.",""],"business-date":["Business date","Business date","Fecha de negocio","El día hotelero al que se imputa una cifra; cambia con el night audit.",""],"kpi":["KPI","Key Performance Indicator","Indicador clave","Métrica que mide el rendimiento del hotel.",""],"formula":["Fórmula","Formula","","Cómo se calcula el KPI a partir de sus entradas.",""],"entradas":["Entradas","Inputs","","El valor que toma cada variable de la fórmula.",""],"registro":["Registro de origen","Source record","","La fila del PMS (u otra fuente) de la que sale cada entrada.",""],"raw":["Dato en bruto","Raw record","","Esa fila tal como llegó de la fuente, sin transformar.",""],"occupancy_rate":["Occupancy","Occupancy rate","Ocupación","Porcentaje de las habitaciones disponibles que se han vendido.","Habitaciones vendidas ÷ habitaciones disponibles × 100"],"adr":["ADR","Average Daily Rate","Tarifa media diaria","Ingreso medio por habitación vendida.","Ingresos de habitaciones ÷ habitaciones vendidas"],"revpar":["RevPAR","Revenue per Available Room","","Ingreso de habitaciones por habitación disponible (ADR × Occ).","Ingresos de habitaciones ÷ habitaciones disponibles"],"trevpar":["TRevPAR","Total Revenue per Available Room","","Ingreso total del hotel por habitación disponible.","Ingresos totales ÷ habitaciones disponibles"],"revpor":["RevPOR","Revenue per Occupied Room","","Ingreso por habitación ocupada.","Ingresos ÷ habitaciones ocupadas"],"goppar":["GOPPAR","Gross Operating Profit per Available Room","","Beneficio operativo bruto por habitación disponible.","GOP ÷ habitaciones disponibles"],"goppor":["GOPPOR","Gross Operating Profit per Occupied Room","","Beneficio operativo bruto por habitación ocupada.","GOP ÷ habitaciones ocupadas"],"gop_margin":["GOP margin","GOP margin","Margen GOP","GOP sobre los ingresos.","GOP ÷ ingresos × 100"],"gross_profit_i_margin":["GP I margin","Gross Profit I margin","Margen bruto I","Primer nivel de margen bruto, según la definición contable del hotel.","Beneficio bruto I ÷ ingresos × 100"],"gross_profit_ii_margin":["GP II margin","Gross Profit II margin","Margen bruto II","Segundo nivel de margen bruto, según la definición contable del hotel.","Beneficio bruto II ÷ ingresos × 100"],"room_revenue":["Room revenue","Room revenue","Ingresos de habitaciones","Ingresos del departamento de habitaciones.","Suma de ingresos del departamento de habitaciones"],"total_revenue":["Total revenue","Total revenue","Ingresos totales","Ingresos de todos los departamentos incluidos.","Suma de ingresos departamentales incluidos"],"departmental_revenue":["Department revenue","Department revenue","Ingresos por departamento","Ingresos asignados a un departamento del hotel.","Suma de ingresos del departamento"],"departmental_profit":["Department profit","Department profit","Resultado por departamento","Ingresos del departamento menos sus costes directos.","Ingresos del departamento − costes directos"],"pickup":["Pickup","Pickup","","Habitaciones o ingresos OTB que han entrado entre dos lecturas.","OTB actual − OTB de la lectura anterior"],"pace_vs_stly":["Pace vs STLY","Pace versus Same Time Last Year","","Posición OTB frente a la del año pasado al mismo lead time.","OTB actual − OTB STLY al mismo lead time"],"booking_window":["Booking window","Booking window","Antelación de reserva","Días entre la creación de la reserva y la llegada.","Fecha de llegada − fecha de reserva"],"cancellation_rate":["Cancellation %","Cancellation rate","Tasa de cancelación","Reservas canceladas sobre las reservas elegibles.","Canceladas ÷ reservas elegibles × 100"],"no_show_rate":["No-show %","No-show rate","Tasa de no-show","Llegadas previstas que no se presentan.","No-shows ÷ llegadas previstas × 100"],"ari":["ARI","Average Rate Index","","ADR del hotel frente al de su comp set.","ADR del hotel ÷ ADR del comp set × 100"],"mpi":["MPI","Market Penetration Index","","Ocupación del hotel frente a la de su comp set.","Occ del hotel ÷ Occ del comp set × 100"],"rgi":["RGI","Revenue Generation Index","","RevPAR del hotel frente al de su comp set.","RevPAR del hotel ÷ RevPAR del comp set × 100"],"fnb_revpar":["F&B RevPAR","Food & Beverage Revenue per Available Room","","Ingresos de F&B por habitación disponible.","Ingresos F&B ÷ habitaciones disponibles"],"average_check":["Average check","Average check","Ticket medio","Ingreso medio de F&B por cubierto.","Ingresos F&B ÷ cubiertos"],"food_cost_percentage":["Food cost %","Food cost percentage","Coste de comida","Coste de los ingredientes sobre los ingresos de comida.","Ingredientes consumidos ÷ ingresos de comida × 100"],"beverage_cost_percentage":["Beverage cost %","Beverage cost percentage","Coste de bebida","Coste de la bebida sobre los ingresos de bebida.","Coste de bebida consumida ÷ ingresos de bebida × 100"],"prime_cost":["Prime cost %","Prime cost percentage","","Coste de mercancía más coste de personal de F&B, sobre ingresos de F&B.","(COGS + coste de personal) ÷ ingresos F&B × 100"],"revpash":["RevPASH","Revenue per Available Seat Hour","","Ingresos de F&B por asiento y hora disponibles.","Ingresos F&B ÷ (asientos × horas de servicio)"],"table_turnover_rate":["Table turns","Table turnover rate","Rotación de mesas","Cubiertos servidos por mesa en cada servicio.","Cubiertos servidos ÷ mesas por servicio"],"other_department_cogs_ratio":["Other dept COGS %","Other department COGS ratio","","Coste de mercancía sobre ingresos de otro departamento (spa, tienda…).","Coste de mercancía ÷ ingresos del departamento × 100"],"ooo_rate":["OOO rate","Out of Order rate","Tasa OOO","Habitaciones fuera de orden sobre el inventario físico.","Habitaciones OOO ÷ habitaciones físicas × 100"],"operational_occupancy":["Operational occupancy","Operational occupancy","Ocupación operativa","Ocupación sobre las habitaciones en servicio, sin contar las OOO.","Habitaciones ocupadas ÷ (físicas − OOO) × 100"],"cpor":["CPOR","Cost per Occupied Room","","Coste operativo por habitación ocupada.","Costes operativos totales ÷ habitaciones ocupadas"],"cogs":["COGS","Cost of Goods Sold","Coste de la mercancía vendida","Coste de la mercancía consumida en el periodo.","Inventario inicial + compras − inventario final"],"cogs_ratio":["COGS %","Cost of Goods Sold ratio","","Coste de la mercancía sobre los ingresos del departamento.","COGS ÷ ingresos del departamento × 100"],"maintenance_percentage":["Maintenance %","Maintenance percentage","Coste de mantenimiento","Coste de mantenimiento sobre los ingresos.","Coste de mantenimiento ÷ ingresos × 100"],"utility_cost_per_occupied_room":["Utility / occupied room","Utility cost per occupied room","Suministros por habitación ocupada","Coste de suministros por habitación ocupada.","Coste de suministros ÷ habitaciones ocupadas"],"direct_booking_ratio":["Direct booking %","Direct booking ratio","Reserva directa","Reservas por canal directo sobre el total.","Reservas directas ÷ reservas totales × 100"],"distribution_cost_percentage":["Distribution cost %","Distribution cost percentage","Coste de distribución","Comisiones y costes de distribución sobre los ingresos.","Costes de distribución ÷ ingresos totales × 100"],"gds_wholesale_mix":["GDS / wholesale mix","GDS and wholesale mix","Mix GDS / mayorista","Producción por GDS y mayoristas sobre el total.","Producción GDS y mayorista ÷ producción total × 100"],"conversion_rate":["Conversion rate","Conversion rate","Conversión web","Sesiones del motor de reservas que acaban en reserva.","Reservas directas completadas ÷ sesiones de reserva × 100"],"marketing_cost_per_acquisition":["CPA","Cost per Acquisition","Coste por adquisición","Gasto de marketing por cliente captado.","Gasto de marketing ÷ adquisiciones atribuidas"],"website_source_mix":["Website source mix","Website source mix","Mix de fuentes web","Reparto de la demanda de la web por fuente de captación.","Producción de la fuente ÷ producción web total × 100"],"alos":["ALOS","Average Length of Stay","Estancia media","Noches medias por estancia.","Room nights vendidas ÷ estancias"],"repeat_guest_ratio":["Repeat guest %","Repeat guest ratio","Huésped repetidor","Huéspedes que repiten sobre el total.","Huéspedes repetidores ÷ huéspedes totales × 100"],"loyalty_member_share":["Loyalty share","Loyalty member share","Cuota de fidelización","Estancias de miembros del programa de fidelización sobre el total.","Estancias de miembros ÷ estancias × 100"],"nps":["NPS","Net Promoter Score","","Porcentaje de promotores menos porcentaje de detractores.","% promotores − % detractores"],"gss":["GSS / CSAT","Guest Satisfaction Score / Customer Satisfaction","Satisfacción del huésped","Puntuación media de encuestas o reseñas en la escala declarada.","Media de respuestas en la escala declarada"],"guest_wait_time":["Guest wait","Guest wait time","Tiempo de espera","Minutos que espera un huésped en un punto de servicio.","Duración medida o estimada de la espera"],"labour_cost_ratio":["Labour cost %","Labour cost ratio","Coste de personal","Coste de personal sobre los ingresos.","Coste de personal ÷ ingresos × 100"],"payroll_per_occupied_room":["Payroll / occupied room","Payroll per occupied room","Nómina por habitación ocupada","Coste de nómina por habitación ocupada.","Coste de nómina ÷ habitaciones ocupadas"],"overtime_rate":["Overtime %","Overtime rate","Horas extra","Horas extra sobre las horas trabajadas.","Horas extra ÷ horas trabajadas × 100"],"staff_productivity":["Staff productivity","Staff productivity","Productividad del personal","Producción operativa por hora trabajada.","Producción declarada ÷ horas de trabajo"],"group_room_nights":["Group room nights","Group room nights","Room nights de grupo","Noches de habitación del segmento grupos y eventos.","Suma de room nights del segmento grupos"],"event_space_utilisation":["Event utilisation","Event space utilisation","Uso de espacios de eventos","Horas de espacio de eventos vendidas sobre las vendibles.","Horas-espacio reservadas ÷ horas-espacio vendibles × 100"],"energy_intensity":["Energy intensity","Energy intensity","Intensidad energética","Energía consumida por unidad de actividad del hotel.","Energía medida ÷ unidad de actividad"],"water_intensity":["Water intensity","Water intensity","Intensidad hídrica","Agua consumida por unidad de actividad del hotel.","Agua medida ÷ unidad de actividad"]};
  /* terms:data-end */

  var doc = document;
  var root = doc.documentElement;
  var tip = null;
  var parts = {};
  var current = null;
  var showTimer = 0;
  var hideTimer = 0;
  var lastPointer = 'mouse';
  var pointerAt = 0;
  var raf = 0;

  function el(tag, cls, parent) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (parent) parent.appendChild(n);
    return n;
  }

  function entry(node) {
    var id = node && node.getAttribute('data-term');
    return id && T[id] ? T[id] : null;
  }

  /* ---------------------------------------------------------------- ventana */
  function buildTip() {
    tip = el('div', 'term-tip', doc.body);
    tip.setAttribute('aria-hidden', 'true');
    tip.hidden = true;
    var head = el('p', 'term-tip__head', tip);
    parts.t = el('b', 'term-tip__t', head);
    parts.en = el('span', 'term-tip__en', head);
    parts.es = el('p', 'term-tip__es', tip);
    parts.d = el('p', 'term-tip__d', tip);
    parts.f = el('p', 'term-tip__f', tip);
    tip.addEventListener('pointerenter', function () { clearTimeout(hideTimer); });
    tip.addEventListener('pointerleave', function (e) {
      if (e.pointerType === 'mouse') scheduleHide();
    });
  }

  function fill(e) {
    parts.t.textContent = e[0];
    /* "Pickup" / "In house": la sigla ya es la palabra, no se repite. */
    var en = e[1] && e[1].toLowerCase() !== e[0].toLowerCase() ? e[1] : '';
    parts.en.textContent = en;
    parts.en.hidden = !en;
    parts.es.textContent = e[2] || '';
    parts.es.hidden = !e[2];
    parts.d.textContent = e[3] || '';
    parts.d.hidden = !e[3];
    parts.f.textContent = e[4] || '';
    parts.f.hidden = !e[4];
  }

  /* Encima del término; debajo si no cabe. La X se recorta al viewport y la
     flecha sigue apuntando al término aunque la ventana se haya desplazado. */
  function place() {
    raf = 0;
    if (!current || !tip || tip.hidden) return;
    var rects = current.getClientRects();
    if (!rects.length) { hide(); return; }
    var r = rects[0];
    var vw = root.clientWidth;
    var vh = window.innerHeight;
    var w = tip.offsetWidth;
    var h = tip.offsetHeight;
    var gap = 10;
    var below = r.top - h - gap < 8;
    if (below && r.bottom + h + gap > vh - 8 && r.top > vh - r.bottom) below = false;
    var top = below ? r.bottom + gap : r.top - h - gap;
    var mid = r.left + r.width / 2;
    var left = Math.max(8, Math.min(vw - w - 8, mid - w / 2));
    tip.style.left = Math.round(left) + 'px';
    tip.style.top = Math.round(top) + 'px';
    tip.style.setProperty('--tip-arrow', Math.round(Math.max(14, Math.min(w - 14, mid - left))) + 'px');
    tip.classList.toggle('is-below', below);
  }

  function show(node) {
    var e = entry(node);
    if (!e) return;
    clearTimeout(hideTimer);
    clearTimeout(showTimer);
    if (!tip) buildTip();
    if (current && current !== node) current.classList.remove('is-open');
    current = node;
    fill(e);
    tip.hidden = false;
    node.classList.add('is-open');
    place();
    tip.classList.add('is-in');
  }

  function hide() {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    if (current) current.classList.remove('is-open');
    current = null;
    if (tip) { tip.classList.remove('is-in'); tip.hidden = true; }
  }

  function scheduleShow(node) {
    clearTimeout(hideTimer);
    clearTimeout(showTimer);
    showTimer = setTimeout(function () { show(node); }, current ? 0 : 70);
  }

  /* 160 ms de gracia: lo que tarda el ratón en cruzar los 10 px que separan
     el término de su ventana. Sin ella la ventana se cierra justo cuando vas
     a entrar en ella. */
  function scheduleHide() {
    clearTimeout(showTimer);
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, 160);
  }

  function termOf(target) {
    return target && target.closest ? target.closest('.term[data-term]') : null;
  }

  /* ------------------------------------------------------ preparar el marcado */
  function prepare() {
    var nodes = doc.querySelectorAll('.term[data-term]');
    if (!nodes.length) return;
    var box = null;
    var seen = {};
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var id = n.getAttribute('data-term');
      var e = T[id];
      if (!e) continue;
      // La ventana de la casa sustituye a la nativa: fuera el title, o
      // saldrían las dos a la vez.
      if (n.hasAttribute('title')) {
        n.setAttribute('data-title', n.getAttribute('title'));
        n.removeAttribute('title');
      }
      if (seen[id]) continue;
      seen[id] = true;
      if (!box) {
        box = el('div', 'term-defs', null);
        box.hidden = true;
        doc.body.appendChild(box);
      }
      var def = el('span', null, box);
      def.id = 'term-def-' + id;
      def.textContent = [e[0] + (e[1] && e[1] !== e[0] ? ' (' + e[1] + ')' : '') + '.', e[3], e[4] ? 'Fórmula: ' + e[4] + '.' : '']
        .filter(Boolean).join(' ');
      // Dentro de un enlace o un botón el término ya es parte de algo
      // tabulable: no se le da otra parada.
      if (!n.closest('a, button')) n.setAttribute('tabindex', '0');
      n.setAttribute('aria-describedby', def.id);
    }
  }

  /* ------------------------------------------------------------- escuchas */
  doc.addEventListener('pointerdown', function (e) {
    lastPointer = e.pointerType || 'mouse';
    pointerAt = Date.now();
  }, true);

  doc.addEventListener('pointerover', function (e) {
    if (e.pointerType !== 'mouse') return;
    var n = termOf(e.target);
    if (n) scheduleShow(n);
  });

  doc.addEventListener('pointerout', function (e) {
    if (e.pointerType !== 'mouse' || !current) return;
    var from = termOf(e.target);
    if (!from) return;
    var to = e.relatedTarget;
    if (to && (from.contains(to) || (tip && tip.contains(to)))) return;
    scheduleHide();
  });

  /* Solo el foco de TECLADO abre la ventana. Un toque también enfoca el
     término (es tabulable) y justo después llega su click, que la alterna:
     si el foco la abriera, el click la cerraría en el mismo gesto. */
  doc.addEventListener('focusin', function (e) {
    var n = termOf(e.target);
    if (n) {
      if (Date.now() - pointerAt > 800) show(n);
    } else if (current && !(tip && tip.contains(e.target))) {
      hide();
    }
  });

  doc.addEventListener('focusout', function (e) {
    if (termOf(e.target) === current) scheduleHide();
  });

  doc.addEventListener('click', function (e) {
    var n = termOf(e.target);
    if (n) {
      // Táctil y lápiz: el toque abre y cierra. Con ratón ya está abierta
      // por el hover, y un clic no debe cerrarla.
      if (lastPointer !== 'mouse') {
        if (current === n) hide(); else show(n);
      }
      return;
    }
    if (current && !(tip && tip.contains(e.target))) hide();
  });

  doc.addEventListener('keydown', function (e) {
    if ((e.key === 'Escape' || e.key === 'Esc') && current) {
      hide();
    }
  });

  window.addEventListener('scroll', function () {
    if (!current) return;
    if (lastPointer !== 'mouse') { hide(); return; }
    if (!raf) raf = requestAnimationFrame(place);
  }, { passive: true, capture: true });

  window.addEventListener('resize', hide);

  /* -------------------------------------------------------- filtro del glosario
     Sin JS la página es la lista entera y el buscador no se enseña (lo
     esconde .has-js en CSS al revés: solo aparece con JS). */
  function fold(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function glossary() {
    var input = doc.querySelector('[data-gl-filter]');
    if (!input) return;
    var rows = [].slice.call(doc.querySelectorAll('[data-gl-row]'));
    var groups = [].slice.call(doc.querySelectorAll('[data-gl-group]'));
    var count = doc.querySelector('[data-gl-count]');
    var empty = doc.querySelector('[data-gl-empty]');
    var text = rows.map(function (r) { return fold(r.textContent); });
    var total = rows.length;
    var timer = 0;

    function run() {
      var q = fold(input.value.trim());
      var shown = 0;
      for (var i = 0; i < rows.length; i++) {
        var hit = !q || text[i].indexOf(q) !== -1;
        rows[i].hidden = !hit;
        if (hit) shown++;
      }
      for (var g = 0; g < groups.length; g++) {
        groups[g].hidden = !groups[g].querySelector('[data-gl-row]:not([hidden])');
      }
      if (empty) empty.hidden = shown !== 0;
      if (count) count.textContent = q ? shown + ' de ' + total + ' términos' : total + ' términos';
    }

    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(run, 90);
    });
    run();
  }

  function start() {
    prepare();
    glossary();
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start);
  else start();
})();
