/*
 * _build/integraciones/build-aside.js
 *
 * La TERCERA pieza de integraciones: la rejilla compacta que va en la columna
 * derecha del hero, donde hasta ahora estaba la cadena de evidencia (.trace).
 * Encargo de Alex (20-09-2026): "vuelve a poner las tecnologias con las que
 * colaboramos en la parte central derecha de la landing".
 *
 * Las otras dos piezas las genera build-logos.js --part:
 *   (A) la tira que recorre la barra inferior del hero
 *   (B) el bloque por categorias que va en el menu
 *
 * Aqui no caben 41 marcas: el hueco son ~370px de ancho. Van NUEVE, elegidas
 * una por categoria para que la rejilla cuente de que va el ecosistema en vez
 * de repetir siete channel managers, y un enlace al bloque completo.
 *
 * Reutiliza los <svg> que ya emite la tira, asi que no hay una segunda fuente
 * de verdad para el dibujo de cada marca.
 *
 *   node _build/integraciones/build-aside.js
 */
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const PARTS = path.join(DIR, '..', 'parts');
const catalogo = JSON.parse(fs.readFileSync(path.join(DIR, 'integraciones.json'), 'utf8'));
const lista = Array.isArray(catalogo) ? catalogo : (catalogo.integraciones || catalogo.items || []);

/* Nueve marcas en el orden en que cuenta la historia de una noche de hotel:
   entra la reserva, se cobra, se fija la tarifa, se abre la puerta, se
   consume, se atiende al huesped, se contabiliza y se limpia.
 *
 * Solo entran marcas DIBUJABLES. Quedan fuera a proposito las dos categorias
 * que no son un logotipo de tercero:
 *   - «Autoridades y normativa» (SES Hospedajes, Ertzaintza, Mossos, MiDNI,
 *     TicketBAI, Verifactu): son organismos y regimenes legales. Poner el
 *     escudo de una policia en una cinta de marcas no es lo mismo que decir
 *     que se presentan los partes, que es lo que de verdad se hace.
 *   - «Modulos del propio PMS»: no son un tercero.
 * Las dos SI salen en el listado completo por categorias de #integraciones,
 * que es donde se leen con su nombre y su contexto. */
const ELEGIDAS = [
  'SiteMinder',   // channel manager
  'Redsys',       // pago (marca real de simple-icons, no wordmark)
  'PriceLabs',    // revenue
  'Salto KS',     // llaves
  'Revo',         // TPV
  'HiJiffy',      // CRM y huesped
  'Holded',       // contabilidad
  'HubOS',        // housekeeping
  'Stripe',       // pago internacional (marca real)
];

const elegidas = ELEGIDAS.map((n) => {
  const c = lista.find((x) => x.nombre === n);
  if (!c) { console.error(`! "${n}" no esta en integraciones.json`); process.exit(1); }
  return c;
});

/* Los <svg> se sacan de la tira ya generada: una sola fuente de verdad. */
const tira = fs.readFileSync(path.join(PARTS, 'integraciones.html'), 'utf8');
const svgDe = (nombre) => {
  const re = new RegExp('<svg[^>]*aria-label="' + nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[\\s\\S]*?<\\/svg>');
  const m = tira.match(re);
  if (!m) { console.error(`! no encuentro el svg de ${nombre} en integraciones.html`); process.exit(1); }
  return m[0];
};

const filas = elegidas.map((c) => {
  const svg = svgDe(c.nombre).replace('role="img"', 'role="img" focusable="false"');
  return `    <li class="hints__item" title="${c.categoria}">${svg}</li>`;
}).join('\n');

const salida = `<!-- ===========================================================================
     INTEGRACIONES · rejilla compacta de la columna derecha del hero.
     GENERADO por node _build/integraciones/build-aside.js — no editar a mano.

     Sustituye al bloque .trace (la cadena de evidencia 01-04), que se movio de
     sitio. Son nueve marcas, UNA POR CATEGORIA, no las nueve mas conocidas:
     asi la rejilla dice "reservas, cobro, tarifa, llave, TPV, contabilidad,
     huesped, domotica y normativa" en vez de repetir channel managers.

     Los dibujos son los mismos <svg> de la tira inferior (misma fuente).
     Van en currentColor y heredan el color del contenedor.
     =========================================================================== -->
<div class="hints" data-enter style="--d:520">
  <p class="hints__label">Nos integramos con</p>
  <ul class="hints__grid">
${filas}
  </ul>
  <a class="hints__link" href="#integraciones">Ver las ${lista.length} integraciones<span class="hints__arrow" aria-hidden="true"><svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg></span></a>
</div>
`;

fs.writeFileSync(path.join(PARTS, 'ints-aside.html'), salida);
console.log(`escrito _build/parts/ints-aside.html`);
console.log(`  9 marcas, una por categoria: ${elegidas.map((c) => c.nombre).join(', ')}`);
console.log(`  enlace a #integraciones (${lista.length} en total)`);
