/*
 * _build/site-pages.js — LA lista de paginas del sitio, una sola vez.
 *
 * Por que existe: hasta hoy cada guardia enumeraba las paginas a su manera y
 * tres de las cinco lo hacian A MANO:
 *     check-shell.js      lista escrita a mano de 7
 *     version-assets.js   lista escrita a mano
 *     check-tokens.js     readdirSync de la RAIZ
 *     check-placeholders  readdirSync de la RAIZ
 *     contrast.js         su propia lista
 * Con todo plano en la raiz eso colaba. En cuanto aparecio la primera pagina
 * en subcarpeta (/funciones/<slug>/index.html) las cinco se quedaron mirando
 * a otro lado, y una puerta que no mira una pagina PASA EN VERDE sobre ella:
 * es exactamente el fallo del paso 9 con panel.css, y el mismo que aparecio
 * hoy con hotel-anim.css. Se arregla en la causa, no en cinco sitios.
 *
 *   const { pages, roots } = require('./site-pages');
 *   pages  -> ['404.html', 'funciones/index.html', 'index.html', ...]
 *             rutas relativas a la raiz del proyecto, con barra /, ordenadas
 *   roots  -> cuantos niveles hay que subir desde cada pagina ('' o '../../')
 *
 * Se descubren SOLAS: cualquier .html bajo la raiz o bajo las carpetas de
 * contenido. No hay lista que actualizar y por tanto no hay lista que olvidar.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

/* Carpetas que NO son el sitio: el tooling, la captura del producto (259
 * paginas de Next con su propio <head>), los assets y lo aparcado. */
const EXCLUIR = new Set(['_build', 'panel', 'node_modules', '.git', 'assets', 'brain-hologram', '.screenshots', 'animacion-hotel-holdera']);

function recorrer(dir, rel, salida) {
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const nombre = entrada.name;
    if (entrada.isDirectory()) {
      if (EXCLUIR.has(nombre) || nombre.startsWith('.')) continue;
      recorrer(path.join(dir, nombre), rel ? rel + '/' + nombre : nombre, salida);
    } else if (/\.html$/i.test(nombre) && !/\.bak$/i.test(nombre)) {
      salida.push(rel ? rel + '/' + nombre : nombre);
    }
  }
}

const pages = [];
recorrer(ROOT, '', pages);
pages.sort();

/* Cuantos '../' necesita cada pagina para llegar a la raiz. Las paginas en
 * subcarpeta llevan <base href="/"> (el patron de 404.html), asi que sus
 * enlaces son absolutos; esto sirve para los guardias que resuelven rutas de
 * assets, no para reescribir href. */
const roots = {};
for (const p of pages) {
  const niveles = p.split('/').length - 1;
  roots[p] = niveles ? '../'.repeat(niveles) : '';
}

/* Las paginas que llevan el shell copiado (cabecera, drawer, pie). Es el
 * sitio entero: si alguna vez hay una que no lo lleve, se excluye AQUI y se
 * escribe por que. */
const conShell = pages.slice();

/* Las hojas de estilo y los scripts que el sitio CARGA DE VERDAD, leidos de
 * las propias paginas en vez de escritos a mano.
 *
 * Mismo motivo que la lista de paginas: CSS_FILES de check-tokens.js era
 * ['styles.css','pages.css'] y hubo que acordarse de anadir hotel-anim.css y
 * sections.css. Con la primera pagina en subcarpeta aparecio
 * funciones/funciones.css y la lista volvia a quedarse corta — un literal de
 * color ahi habria pasado la puerta. Si una pagina lo enlaza, se vigila.
 *
 * Se descartan los externos (http, //) y se quita el sello ?v=<sha1>. */
function assets() {
  const css = new Set();
  const js = new Set();
  const limpio = (u) => u.split('?')[0].replace(/^\.?\//, '');
  const externo = (u) => /^(https?:)?\/\//.test(u) || u.startsWith('data:');

  for (const p of pages) {
    const src = fs.readFileSync(path.join(ROOT, p), 'utf8');
    const base = /<base\s+href="\/"/.test(src) ? '' : p.includes('/') ? p.slice(0, p.lastIndexOf('/') + 1) : '';
    for (const m of src.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/gi)) {
      if (!externo(m[1])) css.add(base + limpio(m[1]));
    }
    for (const m of src.matchAll(/<script[^>]+src="([^"]+)"/gi)) {
      if (!externo(m[1])) js.add(base + limpio(m[1]));
    }
  }
  const existe = (f) => fs.existsSync(path.join(ROOT, f));
  return {
    css: [...css].filter(existe).sort(),
    js: [...js].filter(existe).sort(),
    faltan: [...css, ...js].filter((f) => !existe(f)).sort(),
  };
}

module.exports = { ROOT, pages, roots, conShell, assets };

if (require.main === module) {
  console.log(pages.length + ' paginas:');
  pages.forEach((p) => console.log('  ' + p + (roots[p] ? '   (sube ' + roots[p] + ')' : '')));
}
