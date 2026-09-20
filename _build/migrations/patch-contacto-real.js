/*
 * _build/migrations/patch-contacto-real.js
 *
 * Alex confirmo los dos datos de contacto el 20-09-2026:
 *   email    info@holdera.es
 *   telefono +34 607 83 69 60
 *
 * Desde el paso 7 los marcadores son <span> SIN href a proposito: un <a> sin href
 * suspende `crawlable-anchors` en Lighthouse y bajo el SEO a 92. Ahora que los datos
 * son reales vuelven a ser enlaces DE VERDAD (mailto: y tel:), que es lo que quiere
 * un buscador y lo que quiere un movil.
 *
 * NO toca WhatsApp, Instagram ni LinkedIn: Alex no los ha dado. Que el telefono sea
 * movil NO significa que tenga WhatsApp — eso se pregunta, no se supone.
 *
 * Tambien corrige `[dominio por confirmar]` del aviso legal: el dominio se resolvio
 * en el paso 7 y es holdera.es. Era un marcador rancio.
 *
 * Idempotente: si ya esta aplicado, no cambia nada y lo dice.
 * Se usa split().join() y nunca String.replace(): en este proyecto un `$$` en el
 * texto de reemplazo se colapsa a `$` y ya rompio script.js tres veces.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');

const EMAIL = 'info@holdera.es';
const TEL_TEXTO = '+34 607 83 69 60';
const TEL_HREF = '+34607836960';

const ARCHIVOS = [
  'index.html',
  'nosotros.html',
  'partners.html',
  'contacto.html',
  'aviso-legal.html',
  'privacidad.html',
  '404.html',
  path.join('_build', 'shell', 'footer.html'),
];

const CAMBIOS = [
  {
    de: '<span data-placeholder="email">[email por confirmar]</span>',
    a: `<a href="mailto:${EMAIL}">${EMAIL}</a>`,
  },
  {
    de: '<span data-placeholder="telefono">[teléfono por confirmar]</span>',
    a: `<a href="tel:${TEL_HREF}">${TEL_TEXTO}</a>`,
  },
  {
    de: '<span class="ph">[dominio por confirmar]</span>',
    a: 'holdera.es',
  },
];

let tocados = 0;
let sustituciones = 0;

for (const rel of ARCHIVOS) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    console.error(`  ! no existe: ${rel}`);
    process.exitCode = 1;
    continue;
  }
  const antes = fs.readFileSync(abs, 'utf8');
  let texto = antes;
  const hechos = [];

  for (const { de, a } of CAMBIOS) {
    const n = texto.split(de).length - 1;
    if (n > 0) {
      texto = texto.split(de).join(a);
      hechos.push(`${n}x ${de.slice(0, 46)}...`);
      sustituciones += n;
    }
  }

  if (texto !== antes) {
    fs.writeFileSync(abs, texto);
    tocados += 1;
    console.log(`  ${rel}`);
    hechos.forEach((h) => console.log(`     ${h}`));
  }
}

console.log('');
if (sustituciones === 0) {
  console.log('Nada que hacer: ya estaba aplicado (o los marcadores cambiaron de forma).');
} else {
  console.log(`${sustituciones} sustituciones en ${tocados} archivos.`);
}
console.log('');
console.log('SIGUEN SIENDO MARCADORES (Alex no los ha dado):');
console.log('  whatsapp · instagram · linkedin · horario de atencion');
console.log('  razon social · NIF · domicilio social · fecha de las paginas legales');
console.log('');
console.log('Ahora: node _build/check-shell.js   (las 7 copias tienen que seguir coincidiendo)');
