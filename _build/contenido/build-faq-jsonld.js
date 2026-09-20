#!/usr/bin/env node
/* ==========================================================================
   Genera _build/contenido/faq-jsonld.json a partir de _build/contenido/faq.json

   Por qué existe en vez de escribirse a mano: Google pide que el texto de cada
   acceptedAnswer sea el MISMO que se ve en pantalla. Escribirlo dos veces es
   garantizar que un día dejen de coincidir.

   Y la regla dura del proyecto: una respuesta con marcador «[… por confirmar]»
   NO puede entrar en el JSON-LD — sería publicar como dato estructurado algo
   que ni siquiera está decidido. Este script lo comprueba dos veces (por la
   bandera del JSON y por el texto) y sale con 1 si alguna se cuela.

   Uso:  node _build/contenido/build-faq-jsonld.js
         node _build/contenido/build-faq-jsonld.js --check   (no escribe; falla
         si el archivo generado no coincide con lo que tocaría generar)
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const SRC = path.join(DIR, 'faq.json');
const OUT = path.join(DIR, 'faq-jsonld.json');
const MARCADOR = /\[[^\]]*por confirmar[^\]]*\]/i;

const src = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const preguntas = src.preguntas || [];

let fallos = 0;
for (const q of preguntas) {
  const texto = MARCADOR.test(q.respuesta);
  if (texto !== !!q.tieneMarcador) {
    console.error(`FALLO  ${q.id}: tieneMarcador=${q.tieneMarcador} pero el texto dice ${texto}`);
    fallos++;
  }
  if (q.enJsonLd && texto) {
    console.error(`FALLO  ${q.id}: lleva marcador y está marcada para el JSON-LD`);
    fallos++;
  }
}
if (fallos) process.exit(1);

const incluidas = preguntas.filter((q) => q.enJsonLd);

const out = {
  _meta: {
    fuente: '_build/contenido/faq.json — GENERADO por _build/contenido/build-faq-jsonld.js, no editar a mano',
    regla: `Solo entran las preguntas cuya respuesta NO lleva marcador. Hoy: ${incluidas.length} de ${preguntas.length}.`,
    excluidas: preguntas.filter((q) => !q.enJsonLd).map((q) => q.id),
    uso: 'Va al <head> de la página que publique el bloque FAQ, dentro del @graph que ya escribe _build/seo-inject.js. El texto de cada acceptedAnswer es IDÉNTICO al que se ve en pantalla: si cambia faq.json o faq.html, vuelve a generarlo.',
    generado: new Date().toISOString().slice(0, 10)
  },
  jsonld: {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': 'https://holdera.es/#faq',
    inLanguage: 'es-ES',
    isPartOf: { '@id': 'https://holdera.es/#website' },
    about: { '@id': 'https://holdera.es/#organization' },
    mainEntity: incluidas.map((q) => ({
      '@type': 'Question',
      name: q.pregunta,
      acceptedAnswer: { '@type': 'Answer', text: q.respuesta }
    }))
  }
};

const texto = JSON.stringify(out, null, 2) + '\n';

if (process.argv.includes('--check')) {
  const actual = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  // La fecha de generación cambia cada día: se ignora en la comparación.
  const sinFecha = (s) => s.replace(/"generado": "[^"]*"/, '"generado": "-"');
  if (sinFecha(actual) !== sinFecha(texto)) {
    console.error('FALLO  faq-jsonld.json está desincronizado con faq.json. Ejecuta el script sin --check.');
    process.exit(1);
  }
  console.log(`OK  faq-jsonld.json al día — ${incluidas.length} preguntas, ${preguntas.length - incluidas.length} excluidas por marcador.`);
  process.exit(0);
}

fs.writeFileSync(OUT, texto, 'utf8');
console.log(`OK  ${incluidas.length} preguntas en el JSON-LD; ${preguntas.length - incluidas.length} excluidas por marcador.`);
