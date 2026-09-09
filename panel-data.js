/* ==========================================================================
   HOLDERA — panel de demostración · datos de partida y presets por sector
   Todo lo que hay aquí es FICTICIO (demo). Las fechas se calculan desde la
   fecha real al arrancar, así el panel siempre habla de "esta semana" y
   "este mes". Nada de aquí sale a ninguna red: se construye en local.
   Expone window.PANEL_DATA = { PRESETS, PEOPLE, buildState }.
   ========================================================================== */
(function () {
  'use strict';

  /* ---- PRNG con semilla: los mismos números en cada carga del mismo preset,
     pero "sucios" (nunca 50 % ni decenas redondas). ---- */
  function mulberry(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const PEOPLE = [
    { name: 'Marta Roig', email: 'marta.roig' },
    { name: 'Ahmed El Idrissi', email: 'ahmed.elidrissi' },
    { name: 'Laia Puig', email: 'laia.puig' },
    { name: 'Jordi Ferrer', email: 'jordi.ferrer' },
    { name: 'Sofía Almeida', email: 'sofia.almeida' },
    { name: 'Chen Wei', email: 'chen.wei' },
    { name: 'Nuria Castells', email: 'nuria.castells' },
    { name: 'Pau Vidal', email: 'pau.vidal' },
    { name: 'Ingrid Solé', email: 'ingrid.sole' },
    { name: 'Karim Benali', email: 'karim.benali' },
    { name: 'Helena Prat', email: 'helena.prat' },
    { name: 'Marc Gimeno', email: 'marc.gimeno' },
    { name: 'Fatima Zahra', email: 'fatima.zahra' },
    { name: 'Oriol Camps', email: 'oriol.camps' },
    { name: 'Yolanda Ruiz', email: 'yolanda.ruiz' },
    { name: 'Daniel Okoye', email: 'daniel.okoye' },
    { name: 'Clara Ventura', email: 'clara.ventura' },
    { name: 'Tomás Herrera', email: 'tomas.herrera' }
  ];

  /* Cada preset cambia el VOCABULARIO (qué es un lead, qué se vende, qué se
     agenda) y el orden de magnitud de los importes. La estructura del estado
     es la misma para los cuatro. */
  const PRESETS = {
    b2b: {
      label: 'Servicios B2B',
      company: 'Vela & Asociados',
      leadWord: 'lead', leadWordPlural: 'leads',
      orgLabel: 'Empresa',
      orgs: ['Grupo Tramuntana', 'Logística Bages', 'Farmàcies Roca', 'Taller Solé', 'Estudi Puig Arquitectes', 'Distribucions Garraf', 'Bufete Almeida', 'Óptica Castells', 'Gimnasio Pulso', 'Pastisseria Vidal', 'Clínica Vetcare', 'Mobles Camps', 'Hotel Mirador', 'Impremta Gimeno', 'Fusteria Prat', 'Ferreteria Okoye', 'Viatges Ventura', 'Tèxtils Herrera'],
      sectorLabel: 'Sector',
      sectors: ['Logística', 'Retail', 'Salud', 'Servicios', 'Construcción', 'Hostelería'],
      services: ['Automatización de facturas', 'CRM y seguimiento comercial', 'Asistente de WhatsApp', 'Web y SEO', 'Campañas de captación'],
      value: [1800, 14500],
      eventTypes: { reunion: 'Reunión', llamada: 'Llamada', demo: 'Demo', visita: 'Visita' },
      revenueBase: 21400,
      expenses: [
        ['Nóminas equipo', 'Personal', 7412.6, true],
        ['Suscripción CRM', 'Software', 149, true],
        ['Dominio y alojamiento', 'Software', 38.4, true],
        ['Meta Ads', 'Publicidad', 987.4, false],
        ['Google Ads', 'Publicidad', 1312.15, false],
        ['Oficina Poblenou', 'Alquiler', 1150, true],
        ['Gestoría Blanch', 'Proveedores', 210, true],
        ['Diseño de piezas · Estudio Nau', 'Proveedores', 640, false],
        ['Material de oficina', 'Otros', 86.3, false]
      ],
      invoices: [['Grupo Tramuntana', 3480, 12], ['Óptica Castells', 1290, 4], ['Logística Bages', 5620, 27]],
      campaigns: [
        ['Captación · Automatización', 'meta', 'activa', 520, 19.2, 27],
        ['Retargeting web', 'meta', 'activa', 310, 24.6, 13],
        ['Historias · Casos de éxito', 'meta', 'pausada', 410, 31.8, 6],
        ['Búsqueda · "automatizar facturas"', 'google', 'activa', 780, 28.4, 22],
        ['Búsqueda · marca', 'google', 'activa', 260, 9.7, 11],
        ['Display · sector logística', 'google', 'activa', 640, 52.3, 6]
      ],
      adCopy: [['Facturas que se registran solas', 'Menos horas de gestoría, cero errores'], ['Tu WhatsApp responde 24 h', 'Con tu tono, con tus precios'], ['Tu CRM al día sin teclear', 'Cada lead, en su sitio']],
      keywords: [['automatizar facturas empresa', 4, 2, 1300], ['crm para pymes barcelona', 7, 1, 880], ['chatbot whatsapp empresas', 11, -2, 2900], ['automatización procesos pyme', 3, 0, 720], ['consultoría ia barcelona', 9, 4, 590], ['software gestión leads', 18, -3, 1600], ['agencia automatización', 6, 1, 410], ['asistente virtual empresa', 14, 5, 2400]],
      tasks: ['Añadir marcado FAQ a la página de servicios', 'Comprimir las tres imágenes del hero (LCP)', 'Reescribir el título de «CRM y seguimiento» con la palabra clave', 'Enlazar los casos de éxito desde la portada', 'Reducir el INP del formulario de contacto', 'Crear una página para «automatizar facturas»'],
      reviews: [['Grupo Tramuntana', 5, 'Nos montaron la automatización de facturas en dos semanas. Ahora la gestoría recibe todo sin que toquemos nada.'], ['Óptica Castells', 5, 'El WhatsApp contesta solo fuera de horario y las citas entran directas al calendario. Muy recomendables.'], ['Taller Solé', 4, 'Buen trabajo con la web y el seguimiento de leads. Tardaron un poco más de lo previsto pero el resultado es bueno.']],
      rating: 4.8, ratingCount: 127,
      hours: 'Las citas entran en Google Calendar y el equipo las ve al momento.',
      approvals: {
        whatsapp: ['Marta Roig', 'Hola Marta, gracias por escribirnos. Podemos ver la automatización de facturas el jueves a las 11:00 o el viernes a las 9:30. ¿Cuál te va mejor?'],
        invoice: ['Estudio Nau', 640, 'Diseño de piezas para las campañas de septiembre'],
        ads: ['Búsqueda · marca', 15],
        review: ['Taller Solé', 'Gracias por la confianza, Marc. Tomamos nota del plazo: en el siguiente proyecto os pasamos un calendario semanal desde el primer día.']
      }
    },

    inmobiliaria: {
      label: 'Inmobiliaria',
      company: 'Finques Miralles',
      leadWord: 'contacto', leadWordPlural: 'contactos',
      orgLabel: 'Inmueble',
      orgs: ['Piso en Gràcia · 3 hab', 'Ático en Sant Cugat', 'Local en Poblenou', 'Casa en Sitges', 'Piso en Eixample · 2 hab', 'Estudio en Sants', 'Dúplex en Sarrià', 'Piso en Badalona · 4 hab', 'Parking en Les Corts', 'Chalet en Castelldefels', 'Piso en Horta · 3 hab', 'Nave en Sant Boi', 'Piso en Vila de Gràcia', 'Ático en Poble-sec', 'Casa en Sant Just', 'Piso en Sant Andreu', 'Local en Gràcia', 'Piso en Clot · 2 hab'],
      sectorLabel: 'Operación',
      sectors: ['Compra', 'Venta', 'Alquiler', 'Inversión', 'Valoración', 'Local'],
      services: ['Valoración gratuita', 'Visita guiada', 'Home staging', 'Gestión de alquiler', 'Financiación'],
      value: [3200, 19800],
      eventTypes: { reunion: 'Firma', llamada: 'Llamada', demo: 'Tasación', visita: 'Visita' },
      revenueBase: 38600,
      expenses: [
        ['Nóminas agentes', 'Personal', 11840, true],
        ['Portales inmobiliarios', 'Software', 690, true],
        ['CRM inmobiliario', 'Software', 189, true],
        ['Meta Ads', 'Publicidad', 1420.6, false],
        ['Google Ads', 'Publicidad', 1874.3, false],
        ['Oficina Gràcia', 'Alquiler', 1680, true],
        ['Fotógrafo · Sesiones septiembre', 'Proveedores', 560, false],
        ['Gestoría', 'Proveedores', 240, true],
        ['Carteles y lonas', 'Otros', 132.5, false]
      ],
      invoices: [['Venta · Piso en Gràcia', 7920, 9], ['Alquiler · Local Poblenou', 1450, 3], ['Venta · Casa en Sitges', 14300, 21]],
      campaigns: [
        ['Captación de vendedores · Gràcia', 'meta', 'activa', 640, 17.4, 37],
        ['Retargeting · visitantes web', 'meta', 'activa', 280, 22.1, 13],
        ['Vídeo · Ático Sant Cugat', 'meta', 'pausada', 350, 41.2, 4],
        ['Búsqueda · "vender piso barcelona"', 'google', 'activa', 920, 26.8, 34],
        ['Búsqueda · marca', 'google', 'activa', 210, 8.1, 14],
        ['Display · inversores', 'google', 'activa', 520, 61.4, 5]
      ],
      adCopy: [['¿Cuánto vale tu piso?', 'Valoración gratuita en 24 h'], ['Vende en Gràcia sin visitas inútiles', 'Filtramos compradores por ti'], ['Tu alquiler, gestionado', 'Cobro puntual y cero llamadas']],
      keywords: [['vender piso barcelona', 5, 3, 3600], ['inmobiliaria gràcia', 3, 0, 720], ['valoración piso gratis', 8, 2, 1900], ['alquilar local poblenou', 6, -1, 480], ['pisos en venta sant cugat', 12, 4, 2400], ['inmobiliaria eixample', 9, 1, 590], ['gestión alquiler barcelona', 15, -2, 1300], ['home staging barcelona', 4, 6, 390]],
      tasks: ['Crear fichas con datos estructurados para cada inmueble', 'Comprimir las fotos de los pisos destacados (LCP)', 'Añadir la calculadora de valoración a la portada', 'Reescribir el título de la página de Gràcia', 'Reducir el INP del buscador de inmuebles', 'Publicar la guía «vender piso en Barcelona»'],
      reviews: [['Laia Puig', 5, 'Vendimos el piso en cinco semanas y nos avisaban de cada visita por WhatsApp. Cero estrés.'], ['Jordi Ferrer', 5, 'Muy claros con los precios y con los tiempos. La valoración fue realista y se cumplió.'], ['Sofía Almeida', 4, 'Buena gestión del alquiler. Me hubiera gustado algo más de comunicación al principio.']],
      rating: 4.7, ratingCount: 214,
      hours: 'Las visitas confirmadas entran solas en Google Calendar con la dirección del inmueble.',
      approvals: {
        whatsapp: ['Marta Roig', 'Hola Marta, el piso de Gràcia sigue disponible. Tenemos visitas el jueves a las 17:30 y el sábado a las 11:00. ¿Te reservo una?'],
        invoice: ['Foto Immo', 560, 'Sesiones de fotografía de septiembre'],
        ads: ['Búsqueda · marca', 15],
        review: ['Sofía Almeida', 'Gracias, Sofía. Tienes razón con la comunicación del inicio: desde este mes enviamos un resumen semanal a cada propietario.']
      }
    },

    hosteleria: {
      label: 'Hotel / restauración',
      company: 'Hotel Mar Blau',
      leadWord: 'reserva', leadWordPlural: 'reservas',
      orgLabel: 'Petición',
      orgs: ['Boda · 120 personas', 'Evento de empresa · 40 personas', 'Grupo · 12 personas', 'Estancia · 3 noches', 'Comida de Navidad · 65 personas', 'Escapada · 2 noches', 'Aniversario · 30 personas', 'Congreso · 80 personas', 'Grupo ciclista · 18 personas', 'Estancia · 5 noches', 'Cena privada · 14 personas', 'Bautizo · 45 personas', 'Retiro de yoga · 22 personas', 'Estancia · 1 noche', 'Presentación · 55 personas', 'Boda · 90 personas', 'Grupo · 8 personas', 'Estancia · 4 noches'],
      sectorLabel: 'Tipo',
      sectors: ['Bodas', 'Empresas', 'Grupos', 'Estancias', 'Celebraciones', 'Restaurante'],
      services: ['Menú degustación', 'Salón de eventos', 'Habitaciones con vistas', 'Desayuno incluido', 'Transporte al aeropuerto'],
      value: [320, 9800],
      eventTypes: { reunion: 'Degustación', llamada: 'Llamada', demo: 'Evento', visita: 'Visita' },
      revenueBase: 64200,
      expenses: [
        ['Nóminas equipo de sala y cocina', 'Personal', 21600, true],
        ['Motor de reservas', 'Software', 219, true],
        ['Canal manager', 'Software', 149, true],
        ['Meta Ads', 'Publicidad', 1180.2, false],
        ['Google Ads', 'Publicidad', 2140.75, false],
        ['Alquiler terraza', 'Alquiler', 2400, true],
        ['Proveedor de pescado · Llotja', 'Proveedores', 3860.4, false],
        ['Lavandería', 'Proveedores', 720, true],
        ['Reparación cámara frigorífica', 'Otros', 415, false]
      ],
      invoices: [['Boda · Familia Prat', 6400, 6], ['Evento · Tèxtils Herrera', 2850, 15], ['Congreso · Colegio de Arquitectos', 9200, 33]],
      campaigns: [
        ['Bodas 2027 · Costa', 'meta', 'activa', 580, 14.8, 41],
        ['Escapadas de otoño', 'meta', 'activa', 420, 11.2, 39],
        ['Reels · Menú degustación', 'meta', 'pausada', 260, 27.9, 7],
        ['Búsqueda · "hotel con vistas"', 'google', 'activa', 940, 18.6, 52],
        ['Búsqueda · marca', 'google', 'activa', 240, 6.4, 38],
        ['Display · eventos de empresa', 'google', 'activa', 480, 44.7, 9]
      ],
      adCopy: [['Tu boda frente al mar', 'Salón para 150 personas y jardín'], ['Escapada de otoño', 'Dos noches con desayuno'], ['Reuniones con vistas', 'Salas para 10 a 80 personas']],
      keywords: [['hotel con vistas al mar barcelona', 6, 2, 2900], ['boda frente al mar', 4, 1, 880], ['restaurante degustación costa', 9, -1, 1300], ['hotel eventos empresa', 12, 3, 1000], ['escapada romántica cerca barcelona', 8, 5, 3600], ['salón bodas 120 personas', 3, 0, 320], ['hotel mar blau', 1, 0, 590], ['menú degustación pescado', 15, -2, 720]],
      tasks: ['Añadir datos estructurados de hotel y restaurante', 'Comprimir las fotos de la galería (LCP)', 'Crear la página «Bodas» con precios orientativos', 'Reescribir el título de la portada con «vistas al mar»', 'Reducir el INP del motor de reservas', 'Publicar el menú degustación como página propia'],
      reviews: [['Helena Prat', 5, 'Celebramos la boda aquí y el equipo estuvo pendiente de todo. Las respuestas por WhatsApp eran inmediatas.'], ['Karim Benali', 5, 'Habitación con vistas y desayuno excelente. Reservar fue muy fácil.'], ['Ingrid Solé', 4, 'La cena de empresa salió muy bien. El aparcamiento se quedó pequeño para tanta gente.']],
      rating: 4.6, ratingCount: 892,
      hours: 'Las degustaciones y las visitas al salón entran en Google Calendar con el número de personas.',
      approvals: {
        whatsapp: ['Marta Roig', 'Hola Marta, tenemos el salón libre el 18 de octubre para 120 personas. ¿Te va bien venir a una degustación el jueves a las 12:00?'],
        invoice: ['Llotja de Vilanova', 3860.4, 'Pescado de la semana 36'],
        ads: ['Escapadas de otoño', 15],
        review: ['Ingrid Solé', 'Gracias, Ingrid. Para los próximos eventos grandes reservamos plazas en el aparcamiento de al lado y lo avisamos en la confirmación.']
      }
    },

    clinica: {
      label: 'Clínica / salud',
      company: 'Clínica Sarrià Salut',
      leadWord: 'paciente', leadWordPlural: 'pacientes',
      orgLabel: 'Tratamiento',
      orgs: ['Implante dental', 'Ortodoncia invisible', 'Blanqueamiento', 'Revisión anual', 'Fisioterapia · rodilla', 'Limpieza dental', 'Nutrición · plan 3 meses', 'Fisioterapia · espalda', 'Endodoncia', 'Carillas', 'Revisión infantil', 'Rehabilitación · hombro', 'Ortodoncia infantil', 'Estética · ácido hialurónico', 'Fisioterapia · deportiva', 'Prótesis', 'Nutrición · consulta', 'Empaste'],
      sectorLabel: 'Área',
      sectors: ['Odontología', 'Fisioterapia', 'Estética', 'Nutrición', 'Infantil', 'Urgencias'],
      services: ['Primera visita gratuita', 'Ortodoncia invisible', 'Implantes', 'Fisioterapia', 'Nutrición'],
      value: [90, 4200],
      eventTypes: { reunion: 'Primera visita', llamada: 'Llamada', demo: 'Tratamiento', visita: 'Revisión' },
      revenueBase: 46800,
      expenses: [
        ['Nóminas equipo clínico', 'Personal', 18900, true],
        ['Software de gestión clínica', 'Software', 189, true],
        ['Recordatorios SMS', 'Software', 64.2, true],
        ['Meta Ads', 'Publicidad', 860.5, false],
        ['Google Ads', 'Publicidad', 1490.3, false],
        ['Local Sarrià', 'Alquiler', 2950, true],
        ['Laboratorio protésico', 'Proveedores', 2140.8, false],
        ['Material sanitario', 'Proveedores', 1180.45, false],
        ['Mantenimiento equipos', 'Otros', 310, false]
      ],
      invoices: [['Mutua · Septiembre', 4210, 8], ['Ortodoncia · Pau Vidal', 1450, 2], ['Implantes · Chen Wei', 2980, 19]],
      campaigns: [
        ['Primera visita gratuita', 'meta', 'activa', 460, 12.6, 36],
        ['Ortodoncia invisible · adultos', 'meta', 'activa', 380, 21.3, 18],
        ['Vídeo · fisioterapia deportiva', 'meta', 'pausada', 220, 34.9, 5],
        ['Búsqueda · "dentista sarrià"', 'google', 'activa', 820, 19.8, 41],
        ['Búsqueda · marca', 'google', 'activa', 190, 7.2, 26],
        ['Display · nutrición', 'google', 'activa', 430, 48.1, 8]
      ],
      adCopy: [['Primera visita gratuita', 'Revisión y presupuesto sin compromiso'], ['Ortodoncia invisible', 'Financiación en 12 meses'], ['Fisioterapia deportiva', 'Cita en 48 h']],
      keywords: [['dentista sarrià', 2, 1, 1600], ['ortodoncia invisible barcelona', 7, 3, 2900], ['fisioterapia sarrià', 4, 0, 720], ['implantes dentales precio', 14, -2, 4400], ['clínica dental sant gervasi', 5, 2, 880], ['nutricionista barcelona', 19, 4, 3600], ['blanqueamiento dental barcelona', 9, -1, 1900], ['primera visita dentista gratis', 6, 5, 590]],
      tasks: ['Añadir datos estructurados de clínica y horarios', 'Comprimir las fotos del equipo (LCP)', 'Crear la página «Ortodoncia invisible» con precios orientativos', 'Reescribir el título de la portada con «Sarrià»', 'Reducir el INP del formulario de cita', 'Publicar la guía de cuidados tras un implante'],
      reviews: [['Nuria Castells', 5, 'Pedí cita por WhatsApp un domingo y me contestaron al momento. Trato excelente en la primera visita.'], ['Pau Vidal', 5, 'La ortodoncia va según lo previsto y los recordatorios de cita son muy útiles.'], ['Daniel Okoye', 4, 'Buenos profesionales. La sala de espera se llena un poco a primera hora.']],
      rating: 4.9, ratingCount: 341,
      hours: 'Las citas confirmadas por WhatsApp entran en Google Calendar con el tratamiento y el profesional.',
      approvals: {
        whatsapp: ['Marta Roig', 'Hola Marta, podemos hacer la primera visita el jueves a las 11:00 o el viernes a las 16:30. Es gratuita y dura unos 30 minutos. ¿Cuál te va mejor?'],
        invoice: ['Laboratorio Dentaltec', 2140.8, 'Prótesis y coronas de la semana 36'],
        ads: ['Primera visita gratuita', 15],
        review: ['Daniel Okoye', 'Gracias, Daniel. Hemos escalonado las citas de primera hora para que la sala de espera no se llene. Nos vemos en la próxima revisión.']
      }
    }
  };

  /* ---- fechas relativas al día real ---- */
  const DAY = 86400000;
  function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function mondayOf(d) { const x = startOfDay(d); const dow = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dow); return x; }
  function dayAt(base, dayOffset, h, m) { const x = new Date(base); x.setDate(x.getDate() + dayOffset); x.setHours(h, m || 0, 0, 0); return x; }
  function minutesAgo(now, min) { return new Date(now.getTime() - min * 60000); }
  function monthKey(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }

  const CHANNELS = ['whatsapp', 'instagram', 'web', 'email', 'llamada'];
  const STAGES = ['nuevo', 'contactado', 'reunion', 'propuesta', 'cerrado'];

  function buildState(presetKey, opts) {
    const P = PRESETS[presetKey] || PRESETS.b2b;
    const key = PRESETS[presetKey] ? presetKey : 'b2b';
    const rnd = mulberry(key.length * 7919 + 13);
    const now = new Date();
    const today = startOfDay(now);
    const monday = mondayOf(now);
    const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
    const between = (a, b) => a + rnd() * (b - a);
    const money = (a, b, step) => Math.round(between(a, b) / step) * step;
    let idc = 0;
    const id = (p) => p + '-' + (++idc).toString(36) + Math.floor(rnd() * 1e4).toString(36);

    /* ---- leads ---- */
    const stagePlan = ['nuevo', 'nuevo', 'nuevo', 'nuevo', 'contactado', 'contactado', 'contactado', 'reunion', 'reunion', 'propuesta', 'propuesta', 'cerrado', 'cerrado', 'nuevo', 'contactado', 'reunion'];
    const leads = PEOPLE.slice(0, 16).map((person, i) => {
      const channel = CHANNELS[(i * 3 + 1) % 5];
      const stage = stagePlan[i];
      const daysAgo = stage === 'nuevo' ? Math.floor(between(0, 3)) : Math.floor(between(3, 24));
      const value = money(P.value[0], P.value[1], P.value[1] > 5000 ? 50 : 10) + (i % 3 === 0 ? 0.5 : 0);
      const created = minutesAgo(now, daysAgo * 1440 + Math.floor(between(30, 600)));
      const lastAt = stage === 'nuevo' ? minutesAgo(now, Math.floor(between(6, 240))) : minutesAgo(now, Math.floor(between(120, 4000)));
      const org = P.orgs[i % P.orgs.length];
      const service = P.services[i % P.services.length];
      const timeline = [
        { at: created.toISOString(), channel, from: 'lead', text: firstMessage(P, channel, org, service) },
        { at: new Date(created.getTime() + 40000).toISOString(), channel, from: 'ia', text: 'Respuesta enviada en 40 s: horario, precios orientativos y dos huecos para hablar.' }
      ];
      if (stage !== 'nuevo') timeline.push({ at: new Date(created.getTime() + 3.2 * 3600000).toISOString(), channel: 'llamada', from: 'tu', text: 'Llamada de 12 min. Interés alto en «' + service + '».' });
      if (stage === 'reunion' || stage === 'propuesta' || stage === 'cerrado') timeline.push({ at: new Date(created.getTime() + 2 * DAY).toISOString(), channel: 'email', from: 'ia', text: 'Cita creada en Google Calendar y confirmación enviada por email.' });
      if (stage === 'propuesta' || stage === 'cerrado') timeline.push({ at: new Date(created.getTime() + 5 * DAY).toISOString(), channel: 'email', from: 'tu', text: 'Propuesta enviada: ' + service + ' · ' + Math.round(value) + ' €.' });
      if (stage === 'cerrado') timeline.push({ at: lastAt.toISOString(), channel: 'email', from: 'lead', text: 'Aceptada. Empezamos la semana que viene.' });
      return {
        id: id('l'), name: person.name, company: org, sector: P.sectors[i % P.sectors.length], value, channel, stage,
        score: Math.min(97, Math.max(31, Math.round(38 + rnd() * 55 + (stage === 'cerrado' ? 15 : 0)))),
        createdAt: created.toISOString(), lastAt: lastAt.toISOString(),
        service,
        summary: summaryFor(P, person.name, org, service, stage),
        next: nextFor(stage),
        timeline
      };
    });

    /* ---- bandeja: conversaciones ---- */
    const threads = [];
    const threadPlan = [
      [0, 'whatsapp', 'aprobacion', true], [1, 'instagram', 'ia', true], [2, 'email', 'tu', false], [3, 'web', 'aprobacion', true],
      [4, 'whatsapp', 'ia', false], [5, 'email', 'aprobacion', false], [6, 'instagram', 'tu', false], [7, 'whatsapp', 'ia', false],
      [8, 'web', 'ia', false], [9, 'email', 'tu', false], [10, 'whatsapp', 'ia', true], [11, 'instagram', 'ia', false]
    ];
    threadPlan.forEach(([li, channel, status, unread], k) => {
      const L = leads[li];
      const base = minutesAgo(now, 25 + k * 47 + Math.floor(rnd() * 30));
      const msgs = [
        { at: new Date(base.getTime() - 9 * 60000).toISOString(), from: 'lead', text: firstMessage(P, channel, L.company, L.service) },
        { at: new Date(base.getTime() - 8 * 60000).toISOString(), from: 'ia', text: 'Hola ' + L.name.split(' ')[0] + ', gracias por escribirnos. Te cuento: ' + serviceBlurb(P, L.service) }
      ];
      let draft = null;
      if (status === 'aprobacion') {
        msgs.push({ at: base.toISOString(), from: 'lead', text: followUp(P, k) });
        draft = draftFor(P, L.name.split(' ')[0], k);
      } else if (status === 'tu') {
        msgs.push({ at: new Date(base.getTime() - 5 * 60000).toISOString(), from: 'lead', text: followUp(P, k) });
        msgs.push({ at: base.toISOString(), from: 'tu', text: 'Perfecto, lo miro y te escribo esta tarde con los detalles.' });
      } else {
        msgs.push({ at: new Date(base.getTime() - 4 * 60000).toISOString(), from: 'lead', text: 'Genial, gracias.' });
        msgs.push({ at: base.toISOString(), from: 'ia', text: 'A ti. Si quieres, te reservo un hueco para hablarlo con el equipo.' });
      }
      threads.push({ id: id('t'), leadId: L.id, name: L.name, channel, subject: L.company, unread, status, messages: msgs, draft });
    });

    /* ---- agenda ---- */
    const T = P.eventTypes;
    const evPlan = [
      [0, 9, 30, 'reunion', 60, 'gcal', true, 3], [0, 12, 0, 'llamada', 30, 'gcal', true, 7], [0, 16, 0, 'demo', 45, 'gcal', false, 8],
      [1, 10, 0, 'reunion', 60, 'gcal', true, 4], [1, 15, 30, 'visita', 90, 'gcal', true, 9], [2, 9, 0, 'llamada', 30, 'gcal', true, 10],
      [2, 11, 30, 'demo', 60, 'gcal', false, 11], [2, 17, 0, 'reunion', 60, 'gcal', true, 12], [3, 10, 30, 'reunion', 60, 'gcal', true, 5],
      [3, 14, 0, 'visita', 90, 'gcal', false, 13], [4, 9, 30, 'llamada', 30, 'gcal', true, 14], [4, 12, 30, 'reunion', 60, 'gcal', true, 6],
      [4, 16, 30, 'demo', 45, 'gcal', true, 15], [5, 11, 0, 'visita', 60, 'gcal', true, 2],
      [7, 10, 0, 'reunion', 60, 'gcal', true, 1], [8, 12, 0, 'demo', 45, 'gcal', true, 0], [9, 9, 30, 'reunion', 60, 'gcal', true, 7],
      [-4, 11, 0, 'reunion', 60, 'gcal', true, 8], [-3, 16, 0, 'llamada', 30, 'gcal', true, 9], [-6, 10, 0, 'demo', 45, 'gcal', true, 3]
    ];
    const events = evPlan.map(([d, h, m, type, dur, source, confirmed, li]) => {
      const L = leads[li];
      return { id: id('e'), title: T[type] + ' · ' + L.name, type, start: dayAt(monday, d, h, m).toISOString(), dur, source, confirmed, leadId: L.id, who: L.name };
    });

    /* ---- finanzas ---- */
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const season = 1 + 0.09 * Math.sin((d.getMonth() + 2) / 12 * Math.PI * 2);
      const growth = 1 + (11 - i) * 0.018;
      const ingresos = Math.round(P.revenueBase * season * growth * between(0.93, 1.07) * 100) / 100;
      const gastos = Math.round(ingresos * between(0.58, 0.71) * 100) / 100;
      months.push({ key: monthKey(d), label: d.toLocaleDateString('es-ES', { month: 'short' }).replace('.', ''), ingresos, gastos });
    }
    const expenses = P.expenses.map(([concepto, categoria, importe, recurrente]) => ({ id: id('g'), concepto, categoria, importe, recurrente }));
    months[11].gastos = Math.round(expenses.reduce((s, e) => s + e.importe, 0) * 100) / 100;
    /* el mes actual va por la mitad: ingresos algo por encima del anterior, pero
       no redondos */
    months[11].ingresos = Math.round(months[10].ingresos * between(1.08, 1.16) * 100) / 100;
    const invoices = P.invoices.map(([cliente, importe, dias]) => ({ id: id('f'), cliente, importe, dueDaysAgo: dias, reminded: false }));

    /* ---- marketing ---- */
    const daily = (base) => Array.from({ length: 30 }, (_, i) => Math.round(base * (0.72 + rnd() * 0.56 + (i % 7 === 5 || i % 7 === 6 ? -0.18 : 0)) * 100) / 100);
    const camps = P.campaigns.map(([name, platform, state, budget, cpl, leads], i) => { const spend = Math.round(budget * (0.74 + ((i * 7) % 5) * 0.04) * 100) / 100; return { id: id('c'), name, platform, state, budget, cpl: Math.round(spend / leads * 100) / 100, leads }; });
    const sumBy = (pl, f) => camps.filter(c => c.platform === pl && c.state === 'activa').reduce((s, c) => s + f(c), 0);
    const meta = { key: 'meta', name: 'Meta Ads', budget: Math.round(sumBy('meta', c => c.budget)), spend: 0, impressions: 184320, clicks: 3912, leads: 0, revenue: 0, daily: daily(33) };
    const google = { key: 'google', name: 'Google Ads', budget: Math.round(sumBy('google', c => c.budget)), spend: 0, impressions: 61850, clicks: 2204, leads: 0, revenue: 0, daily: daily(44) };
    meta.leads = sumBy('meta', c => c.leads); google.leads = sumBy('google', c => c.leads);
    meta.spend = Math.round(sumBy('meta', c => c.cpl * c.leads) * 100) / 100; google.spend = Math.round(sumBy('google', c => c.cpl * c.leads) * 100) / 100;
    meta.revenue = Math.round(meta.spend * between(3.1, 3.9)); google.revenue = Math.round(google.spend * between(2.4, 3.2));
    meta.baseBudget = meta.budget; google.baseBudget = google.budget;
    meta.baseLeads = meta.leads; google.baseLeads = google.leads;
    meta.projBudget = meta.budget; google.projBudget = google.budget;

    /* ---- web y SEO ---- */
    const sc28 = Array.from({ length: 28 }, (_, i) => { const w = (i % 7 === 5 || i % 7 === 6) ? 0.62 : 1; return { clicks: Math.round((118 + i * 1.9 + rnd() * 40) * w), impressions: Math.round((5200 + i * 60 + rnd() * 1400) * w) }; });
    const sc3m = Array.from({ length: 13 }, (_, i) => ({ clicks: Math.round(640 + i * 28 + rnd() * 160), impressions: Math.round(29800 + i * 900 + rnd() * 6000) }));
    const keywords = P.keywords.map(([kw, pos, delta, vol]) => ({ kw, pos, delta, vol, spark: Array.from({ length: 10 }, (_, i) => Math.max(1, pos + delta * (1 - i / 9) + Math.round(rnd() * 3 - 1.5))) }));
    const tasks = P.tasks.map((text, i) => ({ id: id('k'), text, done: i === 3 }));
    const reviews = P.reviews.map(([name, stars, text], i) => ({ id: id('r'), name, stars, at: minutesAgo(now, 1440 * (i + 1) + 300 * i).toISOString(), text, reply: i === 2 ? P.approvals.review[1] : (i === 0 ? 'Gracias por contarlo. Es justo lo que queríamos: que no tengáis que tocar nada.' : 'Mil gracias. Nos alegra que reservar sea fácil: para eso está.'), status: i === 2 ? 'pendiente' : 'aprobada' }));

    /* ---- automatizaciones ---- */
    const rules = [
      ['Responde en WhatsApp fuera de horario', 'whatsapp', 'crm', 23, 4],
      ['Crea la cita cuando el cliente confirma', 'whatsapp', 'gcal', 6, 6],
      ['Registra la factura del proveedor en Gastos', 'gmail', 'gastos', 4, 9],
      ['Avisa si el CPL sube más de un 20 %', 'gads', 'crm', 1, 15],
      ['Pide reseña 2 días después del servicio', 'crm', 'whatsapp', 5, 3],
      ['Contesta al formulario web en menos de 1 minuto', 'web', 'gmail', 7, 5]
    ].map(([name, from, to, runsToday, minPerRun], i) => ({
      id: id('a'), name, from, to, on: true, runsToday, minPerRun,
      runsMonth: runsToday * 17 + Math.floor(rnd() * 23) + 3,
      lastAt: minutesAgo(now, 4 + i * 13 + Math.floor(rnd() * 20)).toISOString(),
      custom: false
    }));

    const connections = [
      ['gcal', 'Google Calendar', 'ok', 'Última sincronización: hoy a las {t}', 27],
      ['whatsapp', 'WhatsApp Business', 'ok', '128 conversaciones este mes', 3],
      ['gmail', 'Gmail', 'ok', '41 correos leídos hoy', 12],
      ['facturacion', 'Facturación', 'warn', 'Requiere reconexión: el acceso caducó ayer', 1500],
      ['instagram', 'Instagram', 'off', 'No configurado', null],
      ['gads', 'Google Ads', 'ok', 'Datos de hoy a las {t}', 41],
      ['mads', 'Meta Ads', 'ok', 'Datos de hoy a las {t}', 44],
      ['sc', 'Search Console', 'ok', 'Datos de ayer (Google los publica con un día de retraso)', 1300],
      ['gastos', 'Hoja de gastos', 'ok', '9 movimientos este mes', 190]
    ].map(([cid, name, status, detail, minAgo]) => ({ id: cid, name, status, detail, lastAt: minAgo == null ? null : minutesAgo(now, minAgo).toISOString() }));

    /* ---- aprobaciones (resumen) ---- */
    const A = P.approvals;
    const approvals = [
      { id: id('p'), kind: 'whatsapp', title: 'Respuesta de WhatsApp a ' + A.whatsapp[0], body: A.whatsapp[1], meta: 'Borrador de la IA · hace 6 min', status: 'pending', payload: { name: A.whatsapp[0] } },
      { id: id('p'), kind: 'factura', title: 'Factura de ' + A.invoice[0] + ' · ' + A.invoice[1].toLocaleString('es-ES', { minimumFractionDigits: 2 }) + ' €', body: A.invoice[2] + '. Leída en Gmail y lista para registrar en Gastos.', meta: 'Leída en Gmail · hace 22 min', status: 'pending', payload: { concepto: A.invoice[0], importe: A.invoice[1] } },
      { id: id('p'), kind: 'ads', title: 'Subir un ' + A.ads[1] + ' % el presupuesto de «' + A.ads[0] + '»', body: 'Es la campaña con el CPL más bajo de la cuenta. Propuesta: pasar de ' + camps.find(c => c.name === A.ads[0]).budget + ' € a ' + Math.round(camps.find(c => c.name === A.ads[0]).budget * (1 + A.ads[1] / 100)) + ' € al mes.', meta: 'Propuesta de la IA · hace 1 h', status: 'pending', payload: { campaign: A.ads[0], pct: A.ads[1] } },
      { id: id('p'), kind: 'resena', title: 'Respuesta a la reseña de ' + A.review[0] + ' (4 estrellas)', body: A.review[1], meta: 'Borrador de la IA · hace 2 h', status: 'pending', payload: { name: A.review[0] } }
    ];

    /* ---- actividad y avisos ---- */
    const feed = [
      [4, 'lead', 'Nuevo ' + P.leadWord + ' desde Instagram: ' + leads[1].name + '. Respondido por la IA en 40 s.'],
      [17, 'calendar', T.reunion + ' con ' + leads[3].name + ' creada en Google Calendar.'],
      [31, 'invoice', 'Factura de ' + A.invoice[0] + ' leída en Gmail. Pendiente de tu aprobación.'],
      [52, 'ads', 'El CPL de «' + camps[5].name + '» ha subido un 23 % esta semana.'],
      [78, 'review', 'Reseña de ' + P.reviews[0][0] + ' (5 estrellas) respondida.'],
      [104, 'whatsapp', 'Recordatorio enviado por WhatsApp a ' + leads[9].name + ' para mañana.']
    ].map(([min, kind, text]) => ({ id: id('n'), at: minutesAgo(now, min).toISOString(), kind, text }));
    const notifications = [
      [6, 'Marta Roig ha respondido por WhatsApp. Hay un borrador esperando tu aprobación.', false],
      [52, 'El CPL de «' + camps[5].name + '» ha subido un 23 %.', false],
      [1500, 'Facturación necesita reconectarse.', false],
      [2900, 'Se han creado 4 citas nuevas desde WhatsApp esta semana.', true]
    ].map(([min, text, read]) => ({ id: id('v'), at: minutesAgo(now, min).toISOString(), text, read }));

    /* ---- KPI base (lo que no se deriva de otra parte) ---- */
    const sparks = {
      ingresos: months.map(m => m.ingresos),
      leads: Array.from({ length: 12 }, (_, i) => Math.round(18 + i * 1.7 + rnd() * 9)),
      tareas: Array.from({ length: 12 }, (_, i) => Math.round(21 + i * 2.1 + rnd() * 12)),
      horas: Array.from({ length: 12 }, (_, i) => Math.round((14 + i * 1.9 + rnd() * 7) * 10) / 10)
    };

    return {
      v: 3,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      company: { name: (opts && opts.companyName) || P.company, sector: key, highlight: (opts && opts.highlight) || 'ivory', user: 'Alex' },
      ui: { range: 'mes', leadsMode: 'kanban', leadsChannel: 'todos', leadsSector: 'todos', inboxFilter: 'todos', selectedLead: null, selectedThread: threads[0].id, weekOffset: 0, scRange: '28d', kwSort: { key: 'pos', dir: 'asc' }, finTab: 'gastos' },
      leads, threads, events,
      finance: { months, expenses, invoices, cash: Math.round(P.revenueBase * 2.35) },
      marketing: { platforms: { meta, google }, campaigns: camps, proposal: null },
      web: {
        online: true, uptime: 99.97, visitsToday: 312 + Math.floor(rnd() * 90), conversions: 9 + Math.floor(rnd() * 4), speed: 1.9,
        cwv: { lcp: 2.1, cls: 0.07, inp: 236 },
        sc: { d28: sc28, m3: sc3m }, keywords, tasks,
        reviews: { rating: P.rating, count: P.ratingCount, items: reviews }
      },
      automations: { nodes: { whatsapp: true, instagram: true, gmail: true, web: true, telefono: true, crm: true, gcal: true, facturacion: true, gads: true, mads: true, gastos: true }, rules },
      connections, approvals, feed, notifications,
      kpi: {
        leadsBase: 34, leadsLastMonth: 27, automatedYesterday: 41,
        hoursLastMonth: Math.round(rules.reduce((s, r) => s + r.runsMonth * r.minPerRun, 0) / 60 * 0.885 * 10) / 10,
        byChannel: { whatsapp: 41, instagram: 23, web: 17, email: 12, llamada: 9 },
        sparks
      },
      assistant: { messages: [] }
    };
  }

  /* ---- frases por sector ---- */
  function firstMessage(P, channel, org, service) {
    const key = P.label;
    if (key === 'Inmobiliaria') return 'Hola, he visto «' + org + '» en vuestra web. ¿Sigue disponible? ¿Podría verlo esta semana?';
    if (key === 'Hotel / restauración') return 'Hola, quería información para «' + org + '». ¿Tenéis disponibilidad y precio orientativo?';
    if (key === 'Clínica / salud') return 'Hola, querría pedir cita para «' + org + '». ¿Tenéis hueco esta semana por la tarde?';
    return 'Hola, somos ' + org + '. Nos interesa «' + service + '». ¿Podéis contarnos cómo funciona y qué costaría?';
  }
  function serviceBlurb(P, service) {
    if (P.label === 'Inmobiliaria') return 'la valoración es gratuita y sin compromiso, y podemos organizar la visita en 48 h.';
    if (P.label === 'Hotel / restauración') return 'tenemos disponibilidad y te preparo un presupuesto en el día. ¿Para cuántas personas sería?';
    if (P.label === 'Clínica / salud') return 'la primera visita es gratuita y dura unos 30 minutos. Te propongo dos huecos.';
    return 'lo montamos en dos o tres semanas y se integra con lo que ya usáis. ¿Te va bien una llamada de 20 min para verlo?';
  }
  function followUp(P, k) {
    const opts = ['¿El jueves por la mañana os iría bien?', '¿Me podéis pasar precios antes de decidir?', 'Perfecto. ¿Me confirmáis el horario?', '¿Podemos hacerlo por videollamada?', '¿Cuánto tardaríais?'];
    return opts[k % opts.length];
  }
  function draftFor(P, first, k) {
    const opts = [
      'Hola ' + first + ', el jueves a las 11:00 nos va perfecto. Te envío la invitación ahora mismo y te confirmo por aquí.',
      'Hola ' + first + ', te paso los precios orientativos: dependen del alcance, pero te lo detallo en la llamada para no darte una cifra a ciegas.',
      'Hola ' + first + ', confirmado: te espero el jueves a las 11:00. Si necesitas cambiarlo, escríbeme por aquí.',
      'Hola ' + first + ', sí, por videollamada sin problema. Te mando el enlace con la invitación.',
      'Hola ' + first + ', entre dos y tres semanas desde que empecemos. Te lo confirmo con fechas en cuanto hablemos.'
    ];
    return opts[k % opts.length];
  }
  function summaryFor(P, name, org, service, stage) {
    const first = name.split(' ')[0];
    const base = {
      nuevo: first + ' acaba de escribir por «' + org + '» y pregunta por ' + service.toLowerCase() + '. La IA ha respondido con horarios y dos huecos para hablar.',
      contactado: 'Hablaste con ' + first + ' hace poco. Interés alto en ' + service.toLowerCase() + '; pidió que le pasaras precios orientativos antes de decidir.',
      reunion: 'Hay una cita en la agenda con ' + first + '. Quiere ver cómo encaja ' + service.toLowerCase() + ' con lo que ya tiene.',
      propuesta: 'Propuesta enviada a ' + first + ' para ' + service.toLowerCase() + '. Suele responder por la tarde; ha abierto el email dos veces.',
      cerrado: first + ' ha aceptado la propuesta de ' + service.toLowerCase() + '. Toca arrancar y pedir la reseña a los dos días.'
    };
    return base[stage] || base.nuevo;
  }
  function nextFor(stage) {
    return { nuevo: 'Llamar hoy antes de las 18:00', contactado: 'Enviar precios orientativos', reunion: 'Preparar la demo con sus datos', propuesta: 'Seguimiento el viernes si no responde', cerrado: 'Programar el arranque y pedir reseña' }[stage];
  }

  window.PANEL_DATA = { PRESETS, PEOPLE, CHANNELS, STAGES, buildState };
})();
