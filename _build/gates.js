/* HOLDERA — las puertas, todas de una vez.
 *
 * Antes de publicar hay que pasar cinco comprobadores y volver a sellar los
 * assets. Estaban sueltos en el CLAUDE.md y se olvidaba uno; este los ejecuta
 * en el orden correcto y sale con 1 si alguno falla.
 *
 *   node _build/gates.js            comprueba (no escribe nada)
 *   node _build/gates.js --fix      además reinyecta el SEO, regenera el
 *                                   sitemap y sella css/js con su hash
 *   node _build/gates.js --strict   exige que no quede ningún marcador
 *                                   [por confirmar] (solo cuando Alex haya
 *                                   dado los datos de contacto)
 */
const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const fix = process.argv.includes('--fix');
const strict = process.argv.includes('--strict');

/** Los que escriben van ANTES de los que comprueban: si no, se comprueba lo viejo. */
const WRITERS = [
  ['node', ['_build/seo-inject.js'], 'reinyecta el bloque <head> de las 7 páginas desde meta.json'],
  ['node', ['_build/seo/build-sitemap.js'], 'regenera sitemap.xml desde meta.json'],
  ['node', ['_build/version-assets.js'], 'sella cada css/js con ?v=<sha1 de su contenido>'],
];

const CHECKS = [
  ['node', ['_build/check-tokens.js'], 'ningún literal de color fuera de :root, ningún token huérfano'],
  ['node', ['_build/contrast.js'], 'contraste WCAG de los pares vigilados'],
  ['node', ['_build/check-shell.js'], 'cabecera, drawer y pie idénticos en las 7 páginas'],
  ['node', ['_build/seo/validate-meta.js'], 'títulos <= 60 y descripciones <= 155 caracteres'],
  ['node', ['_build/check-placeholders.js', ...(strict ? ['--strict'] : [])], 'marcadores de contacto'],
];

function run(cmd, args, why) {
  const label = [cmd, ...args].join(' ');
  process.stdout.write(`\n── ${label}\n   ${why}\n`);
  const result = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
  const out = `${result.stdout || ''}${result.stderr || ''}`.trimEnd();
  if (out) console.log(out.split('\n').map((l) => `   ${l}`).join('\n'));
  const ok = result.status === 0;
  console.log(`   ${ok ? 'OK' : 'FALLA'} (código ${result.status})`);
  return ok;
}

let failed = 0;
if (fix) for (const [cmd, args, why] of WRITERS) if (!run(cmd, args, why)) failed++;
for (const [cmd, args, why] of CHECKS) if (!run(cmd, args, why)) failed++;

console.log(
  failed
    ? `\n${failed} puerta(s) cerrada(s). No se publica.`
    : `\nTodas las puertas pasan.${fix ? '' : '  (sin --fix no se ha sellado nada: pásalo antes de desplegar)'}`
);
process.exit(failed ? 1 : 0);
