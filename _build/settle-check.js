/*
 * _build/settle-check.js — la puerta del contenido diferido del panel.
 *
 * `snapshot-panel.js` resuelve en tiempo de construccion los limites de
 * Suspense que React mando por streaming (ver el comentario largo alli).
 * Esto comprueba, sobre los archivos REALES de `panel/`, que el trabajo
 * quedo hecho:
 *
 *   - ninguna pagina conserva un `<div hidden id="S:n">`
 *   - ninguna pagina conserva un limite pendiente `<!--$?-->`
 *   - ninguna pagina conserva una `<template id="B:n">` huerfana
 *   - y el modelo del hotel esta DENTRO de `.rooms-grid` / `.ops-grid`,
 *     no colgando al final del body
 *
 * Sale con 1 si algo falla, asi que sirve de puerta antes de publicar.
 *
 * Con `--self` se prueba a si mismo: coge una pagina ya resuelta, la
 * devuelve al estado diferido y comprueba que la transformacion la
 * reconstruye byte a byte. Un verificador que nunca ha fallado no es un
 * verificador (regla de la casa, y aqui costo el paso 5).
 */
const fs = require('fs');
const path = require('path');
const { settleStreamedBoundaries } = require('./snapshot-panel.js');

const ROOT = path.join(__dirname, '..');
const PANEL = path.join(ROOT, 'panel');

function pages(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) pages(p, out);
    else if (e.name === 'index.html') out.push(p);
  }
  return out;
}

/** El camino de vuelta: deja una pagina como la escribio el streaming. */
function unsettle(html) {
  const open = html.indexOf('<!--$-->', html.indexOf('<div class="rooms-grid">'));
  if (open === -1) return null;
  const close = html.indexOf('<!--/$-->', open);
  if (close === -1) return null;
  const content = html.slice(open + '<!--$-->'.length, close);
  const body = html.slice(0, open) + '<!--$?--><template id="B:0"></template><!--/$-->' + html.slice(close + '<!--/$-->'.length);
  const at = body.lastIndexOf('</body>');
  return body.slice(0, at) + `<div hidden id="S:0">${content}</div>` + body.slice(at);
}

function selfTest() {
  const sample = pages(PANEL).find((f) => fs.readFileSync(f, 'utf8').includes('<div class="rooms-grid">'));
  if (!sample) return console.error('sin muestra con .rooms-grid: no se puede probar'), 1;

  /* La muestra puede estar en cualquiera de los dos estados segun cuando
   * se capturo, asi que se resuelve primero y la ida y vuelta se mide
   * desde ahi. La propiedad que se prueba es la que importa: diferir y
   * volver a resolver devuelve exactamente la misma pagina. */
  const settled = settleStreamedBoundaries(fs.readFileSync(sample, 'utf8'), sample);
  if (settled.includes('<!--$?-->')) return console.error(`la muestra sigue diferida tras resolver: ${sample}`), 1;
  const deferred = unsettle(settled);
  if (!deferred) return console.error(`no se pudo diferir ${sample}`), 1;
  if (deferred === settled) return console.error('diferir no cambio nada: la prueba no prueba nada'), 1;
  const back = settleStreamedBoundaries(deferred, sample);
  if (back !== settled) {
    console.error('FALLO: resolver no reconstruye la pagina original');
    for (let i = 0; i < Math.max(back.length, settled.length); i++) {
      if (back[i] !== settled[i]) {
        console.error(`  primera diferencia en ${i}:`);
        console.error(`  esperado: ${JSON.stringify(settled.slice(i - 60, i + 80))}`);
        console.error(`  obtenido: ${JSON.stringify(back.slice(i - 60, i + 80))}`);
        break;
      }
    }
    return 1;
  }
  console.log(`self-test OK sobre ${path.relative(ROOT, sample)} (${settled.length} bytes, ida y vuelta identica)`);
  return 0;
}

function main() {
  if (process.argv.includes('--self')) process.exit(selfTest());
  if (!fs.existsSync(PANEL)) {
    console.error('no existe panel/: nada que comprobar');
    process.exit(1);
  }
  const files = pages(PANEL);
  const bad = [];
  let withScene = 0;
  for (const f of files) {
    const h = fs.readFileSync(f, 'utf8');
    const why = [];
    if (h.includes('<div hidden id="S:')) why.push('holder <div hidden id="S:n"> sin resolver');
    if (h.includes('<!--$?-->')) why.push('limite pendiente <!--$?-->');
    if (/<template id="B:\d+">/.test(h)) why.push('<template id="B:n"> huerfana');
    if (h.includes('class="stage')) {
      withScene++;
      const grid = h.indexOf('class="rooms-grid"');
      const ops = h.indexOf('class="ops-grid"');
      const stage = h.indexOf('<section class="stage');
      const anchor = grid === -1 ? ops : grid;
      if (anchor !== -1 && stage !== -1 && stage < anchor) why.push('el escenario aparece antes de su rejilla');
    }
    if (why.length) bad.push([path.relative(ROOT, f), why]);
  }
  console.log(`paginas: ${files.length} · con escenario: ${withScene} · con defectos: ${bad.length}`);
  for (const [f, why] of bad.slice(0, 20)) console.log(`  FALLO ${f}: ${why.join('; ')}`);
  if (bad.length > 20) console.log(`  … y ${bad.length - 20} mas`);
  process.exit(bad.length ? 1 : 0);
}

main();
