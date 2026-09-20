/*
 * _build/migrations/patch-seo-contacto.js
 *
 * Anade email y telefono reales al nodo Organization de _build/seo/meta.json.
 * Estaba pendiente desde el paso 5: "despues de sustituir los marcadores, anadir
 * contactPoint/sameAs a shared.organization y reinyectar".
 *
 * `sameAs` NO se anade: son los perfiles sociales (Instagram, LinkedIn) y Alex
 * todavia no los ha dado. Meter un sameAs a un perfil que no existe le dice a
 * Google que Holdera es una entidad que no es.
 *
 * Idempotente. Despues hay que pasar `node _build/seo-inject.js`.
 */
const fs = require('fs');
const path = require('path');

const META = path.resolve(__dirname, '..', 'seo', 'meta.json');
const meta = JSON.parse(fs.readFileSync(META, 'utf8'));
const org = meta.shared && meta.shared.organization;

if (!org) {
  console.error('! no encuentro shared.organization en meta.json');
  process.exit(1);
}

const EMAIL = 'info@holdera.es';
const TEL = '+34607836960';

const antes = JSON.stringify(org);

org.email = EMAIL;
org.telephone = TEL;
org.contactPoint = [
  {
    '@type': 'ContactPoint',
    contactType: 'sales',
    email: EMAIL,
    telephone: TEL,
    areaServed: 'ES',
    availableLanguage: ['es'],
  },
];

if (JSON.stringify(org) === antes) {
  console.log('Nada que hacer: ya estaba.');
  process.exit(0);
}

// Se reescribe con la misma forma (2 espacios + salto final) que ya tenia el archivo.
fs.writeFileSync(META, JSON.stringify(meta, null, 2) + '\n');
console.log(`Organization: email=${EMAIL} telephone=${TEL} + contactPoint(sales)`);
console.log('sameAs NO anadido (Instagram/LinkedIn siguen sin confirmar).');
console.log('');
console.log('Ahora: node _build/seo-inject.js && node _build/seo/validate-meta.js');
