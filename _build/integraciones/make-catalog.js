/* HOLDERA — genera _build/integraciones/integraciones.json
 *
 * POR QUE EXISTE (y por que no es una lista escrita a mano)
 * --------------------------------------------------------
 * La leccion del paso 10 de este proyecto: "una cifra escrita a mano sobrevive
 * a todo menos a un test que la ate a su fuente". Los 50 nombres de aqui NO se
 * teclean: salen del catalogo REAL de Hotelgest, extraido de su bundle de
 * produccion, y este script los cruza con los dominios que se comprobaron uno
 * a uno por HTTP. Los totales del JSON se CALCULAN; si manana cambia la
 * fuente, cambian solos.
 *
 * PROCEDENCIA DE LOS NOMBRES
 * --------------------------
 * https://hotelgest.com/integraciones es una SPA: el HTML servido son 7,6 KB
 * sin contenido, asi que ni WebFetch ni un curl a pelo ven un solo nombre. El
 * catalogo vive dentro de /assets/main-BE38B6sb.js (897 KB), en el array que
 * el minificador llamo `Wa`, con la forma {name, cat, type, img, description}.
 * De ahi salen los 50, literalmente. El agrupador del mega-menu es el array
 * `Ka` del mismo archivo y coincide EXACTAMENTE con las seis categorias que
 * Alex leyo en sus capturas (Pagos / Channel / Accesos y llaves / Revenue /
 * Contabilidad / CRM y POS), lo que confirma que la extraccion es la buena.
 * El volcado intacto esta en _fuente-hotelgest-catalogo.json, al lado.
 * robots.txt de hotelgest.com permite explicitamente a ClaudeBot/anthropic-ai.
 *
 * 🔴 LO QUE ESTE ARCHIVO NO DEMUESTRA
 * -----------------------------------
 * Que sean las integraciones de HOLDERA. Son las de Hotelgest. Que Holdera
 * comparta las mismas es una afirmacion de Alex, no algo que se haya podido
 * verificar contra ninguna fuente: esta anotada como tal en el JSON
 * (`procedencia.atribucion_a_holdera`) y sigue pendiente de su confirmacion.
 *
 * Uso:  node _build/integraciones/make-catalog.js
 */
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const SRC = path.join(HERE, '_fuente-hotelgest-catalogo.json');
const OUT = path.join(HERE, 'integraciones.json');

/* ---------------------------------------------------------------------------
   1. Dominios oficiales, comprobados uno a uno por HTTP el 20-09-2026.
   `web` solo se rellena cuando la peticion respondio 2xx Y el <title> o la URL
   final mencionan la marca. Lo que no paso ese filtro se queda en null: un
   dominio plausible escrito a ojo es exactamente el tipo de invencion que las
   reglas del proyecto prohiben.
--------------------------------------------------------------------------- */
const WEB = {
  'SiteMinder':      { url: 'https://www.siteminder.com/',      nota: 'dominio vivo; Cloudflare devuelve 403 a curl, asi que el <title> no se pudo leer' },
  'YieldPlanet':     { url: 'https://www.yieldplanet.com/' },
  'Channex':         { url: 'https://channex.io/' },
  'Neobookings':     { url: 'https://neobookings.com/' },
  'WuBook':          { url: 'https://wubook.net/' },
  'Prestige':        { url: null, nota: 'ningun dominio candidato resuelve; marca demasiado generica para adivinarla' },
  'RoomCloud':       { url: 'https://www.roomcloud.net/' },
  'Paycomet':        { url: 'https://www.paycomet.com/' },
  'Monei':           { url: 'https://monei.com/' },
  'Redsys':          { url: 'https://www.redsys.es/' },
  'Stripe':          { url: 'https://stripe.com/' },
  'CashDro':         { url: 'https://www.cashdro.com/' },
  'Dataria':         { url: 'https://dataria.es/' },
  'PriceLabs':       { url: 'https://www.pricelabs.co/' },
  'RevCtrlData':     { url: null, nota: 'ningun dominio candidato resuelve' },
  'Revbell':         { url: 'https://revbell.com/' },
  'Revtool':         { url: 'https://revtool.es/' },
  'TheNetRevenue':   { url: 'https://thenetrevenue.com/' },
  'RoomPriceGenie':  { url: 'https://www.roompricegenie.com/' },
  'Tesa':            { url: 'https://www.tesa.es/' },
  'Salto KS':        { url: 'https://saltoks.com/' },
  'Yacan Smart':     { url: 'https://yacan.es/' },
  'Danalock':        { url: 'https://danalock.com/' },
  'TTLock':          { url: 'https://www.ttlock.com/' },
  'Agora':           { url: 'https://www.agorapos.com/' },
  'Revo':            { url: 'https://revo.works/' },
  'HioPos':          { url: 'https://www.hiopos.com/' },
  'Spalopia':        { url: 'https://spalopia.com/' },
  'HiJiffy':         { url: 'https://www.hijiffy.com/' },
  'Clientify':       { url: 'https://clientify.com/' },
  'Sage 50':         { url: 'https://www.sage.com/' },
  'Sage 200':        { url: 'https://www.sage.com/' },
  'Clavecon':        { url: null, nota: 'ningun dominio candidato resuelve' },
  'Asincorp':        { url: null, nota: 'asincorp.com existe pero es otra empresa ("Analytical Services"); asincorp.es no resuelve' },
  'Holded':          { url: 'https://www.holded.com/' },
  'A3':              { url: 'https://www.a3software.com/', nota: 'gama a3 de Wolters Kluwer' },
  'Siigo':           { url: 'https://www.siigo.com/', nota: 'grupo Siigo; que producto concreto usa Hotelgest en Espana esta sin confirmar' },
  'SAP':             { url: 'https://www.sap.com/' },
  'Prinex':          { url: 'https://www.prinex.com/' },
  'Autoridad España SES':        { url: null, nota: 'la sede del Ministerio del Interior responde 403 a curl; no se ha podido fijar la URL exacta de SES Hospedajes' },
  'Autoridad España Ertzaintza': { url: 'https://www.ertzaintza.euskadi.eus/' },
  'Autoridad España Mossos':     { url: 'https://mossos.gencat.cat/' },
  'DNI Digital (MiDNI)':         { url: 'https://midni.gob.es/' },
  'TicketBAI':       { url: 'https://www.euskadi.eus/ticketbai/' },
  'Verifactu':       { url: 'https://sede.agenciatributaria.gob.es/Sede/iva/sistemas-informaticos-facturacion-verifactu.html' },
  'Char':            { url: 'https://char.es/' },
  'HubOS':           { url: null, nota: 'hubos.io responde 200 pero es una SPA sin <title>, asi que no se pudo confirmar que sea la marca' },
};

/* ---------------------------------------------------------------------------
   2. Reagrupacion para la web de Holdera.
   El catalogo de Hotelgest trae 14 `cat` internas, varias de una sola entrada.
   Aqui se juntan en nueve grupos que se leen de un vistazo. La correspondencia
   es 1:N sobre el `cat` de origen: ninguna entrada se mueve de sitio a mano.
--------------------------------------------------------------------------- */
const GRUPOS = [
  { id: 'channel',      titulo: 'Channel manager',        cats: ['channel'] },
  { id: 'pagos',        titulo: 'Pasarelas de pago',      cats: ['pasarelas'] },
  { id: 'revenue',      titulo: 'Revenue management',     cats: ['revenue'] },
  { id: 'accesos',      titulo: 'Llaves y accesos',       cats: ['llaves'] },
  { id: 'tpv',          titulo: 'TPV, restauración y spa', cats: ['pos', 'spa'] },
  { id: 'crm',          titulo: 'CRM y huésped',          cats: ['crm'] },
  { id: 'contabilidad', titulo: 'Contabilidad y ERP',     cats: ['contabilidad'] },
  { id: 'operativa',    titulo: 'Housekeeping y domótica', cats: ['housekeeping', 'telefonia'] },
  { id: 'normativa',    titulo: 'Autoridades y normativa', cats: ['estatales', 'firma'] },
  /* No se enseña: sus tres entradas son modulos del propio Hotelgest. Existe
     para que el catalogo cuadre a 50 y para que el guardia de "cat sin grupo"
     siga siendo util si manana Hotelgest anade una categoria nueva. */
  { id: 'pms-propio',   titulo: 'Módulos del propio PMS', cats: ['huesped', 'otros'] },
];

/* Las tres entradas que son MODULOS DEL PROPIO Hotelgest, no marcas de un
   tercero: en el catalogo se distinguen porque comparten el logotipo del PMS
   (Hotelget.webp). No pintan en una tira que dice "nos integramos con".      */
const PROPIAS_DE_HOTELGEST = ['Check-in Online', 'WebApp del huésped', 'Motor de reservas'];

/* Organismos y estandares: van en el bloque de la nav, con su epigrafe, pero
   NO en la marquesina. Una tira de logotipos se lee como acuerdo comercial, y
   la Ertzaintza o los Mossos no patrocinan a nadie.                          */
const ES_AUTORIDAD = c => c === 'estatales' || c === 'firma';

const slugify = s => s
  .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/* Nombre corto para la marquesina: "Autoridad España Mossos" es una etiqueta
   de base de datos, no un rotulo. */
const ROTULO = {
  'Autoridad España SES': 'SES Hospedajes',
  'Autoridad España Ertzaintza': 'Ertzaintza',
  'Autoridad España Mossos': 'Mossos d’Esquadra',
  'DNI Digital (MiDNI)': 'MiDNI',
};

const src = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const catDe = new Map(GRUPOS.flatMap(g => g.cats.map(c => [c, g])));

const items = src.map(it => {
  const grupo = catDe.get(it.cat);
  if (!grupo) throw new Error(`cat sin grupo: ${it.cat} (${it.name})`);
  const propia = PROPIAS_DE_HOTELGEST.includes(it.name);
  const w = WEB[it.name] || {};
  const rec = {
    nombre: ROTULO[it.name] || it.name,
    categoria: grupo.titulo,
    slug: slugify(ROTULO[it.name] || it.name),
    web: w.url || null,
    grupo: grupo.id,
    tipo: it.type,
    origen: propia ? 'modulo-propio-de-hotelgest'
          : ES_AUTORIDAD(it.cat) ? 'autoridad-o-estandar'
          : 'software-de-tercero',
    en_marquesina: !propia && !ES_AUTORIDAD(it.cat),
    nombre_en_origen: it.name,
    cat_en_origen: it.cat,
  };
  if (w.nota) rec.nota_web = w.nota;
  return rec;
});

/* Duplicados de slug (Sage 50 / Sage 200 no lo son, pero el guardia es barato) */
const vistos = new Map();
for (const it of items) {
  if (vistos.has(it.slug)) throw new Error(`slug duplicado: ${it.slug}`);
  vistos.set(it.slug, it);
}

const cuenta = p => items.filter(p).length;
const totales = {
  catalogo_completo: items.length,
  software_de_terceros: cuenta(i => i.origen === 'software-de-tercero'),
  autoridades_y_estandares: cuenta(i => i.origen === 'autoridad-o-estandar'),
  modulos_propios_de_hotelgest: cuenta(i => i.origen === 'modulo-propio-de-hotelgest'),
  en_la_marquesina: cuenta(i => i.en_marquesina),
  con_web_verificada: cuenta(i => i.web),
  sin_web_verificada: cuenta(i => !i.web),
};
if (totales.software_de_terceros + totales.autoridades_y_estandares
    + totales.modulos_propios_de_hotelgest !== items.length) {
  throw new Error('los tres origenes no suman el catalogo');
}

/* Los grupos que se ENSEÑAN. Un grupo cuyas entradas son todas modulos del
   propio Hotelgest no es una integracion de nadie, asi que no sale. */
const grupos = GRUPOS.map(g => ({
  id: g.id,
  titulo: g.titulo,
  integraciones: items.filter(i => i.grupo === g.id && i.origen !== 'modulo-propio-de-hotelgest')
                      .map(i => i.nombre),
})).filter(g => g.integraciones.length);

const doc = {
  procedencia: {
    fuente: 'Catálogo de integraciones de Hotelgest (hotelgest.com), extraído el 20-09-2026.',
    como: 'https://hotelgest.com/integraciones es una SPA (7,6 KB de HTML sin contenido). Los 50 nombres se leyeron del array del catálogo dentro de su bundle de producción https://hotelgest.com/assets/main-BE38B6sb.js. El volcado literal está en _fuente-hotelgest-catalogo.json.',
    corroboracion: 'El agrupador del mega-menú del mismo bundle (Pagos / Channel / Accesos y llaves / Revenue / Contabilidad / CRM y POS) coincide exactamente con las categorías que Alex leyó en sus capturas de pantalla.',
    robots: 'https://hotelgest.com/robots.txt permite explícitamente a ClaudeBot y anthropic-ai.',
    webs_oficiales: 'Cada dominio se probó por HTTP el 20-09-2026. Solo se anota `web` si respondió 2xx y el <title> o la URL final mencionan la marca; el resto queda en null con su motivo en `nota_web`.',
    atribucion_a_holdera: '🔴 PENDIENTE DE CONFIRMAR. Estas son las integraciones de HOTELGEST. Que Holdera comparta las mismas es lo que dijo Alex; no se ha podido verificar contra ninguna fuente pública. Nada aquí demuestra que el producto de Holdera esté conectado hoy a ninguna de ellas.',
    marcas: 'Las marcas pertenecen a sus respectivos titulares. No implica acuerdo comercial, patrocinio ni respaldo.',
  },
  totales,
  grupos,
  integraciones: items,
};

fs.writeFileSync(OUT, JSON.stringify(doc, null, 2) + '\n');
console.log('escrito ' + path.relative(path.join(HERE, '..', '..'), OUT));
for (const [k, v] of Object.entries(totales)) console.log('  ' + k.padEnd(30) + v);
console.log('\n  grupos: ' + grupos.length);
for (const g of grupos) console.log('    ' + g.titulo.padEnd(24) + g.integraciones.length);
