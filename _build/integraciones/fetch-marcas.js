/* HOLDERA — baja el logotipo OFICIAL de cada marca de su propia web.
 *
 *   node _build/integraciones/fetch-marcas.js            baja y normaliza
 *   node _build/integraciones/fetch-marcas.js --dry      solo informa
 *
  * SALIDA: _build/integraciones/marcas/<slug>.svg  +  _build/integraciones/marcas.json
 *
 * POR QUE EXISTE
 * --------------
 * `build-logos.js` genera WORDMARKS: el nombre de la marca compuesto en la
 * tipografia de Holdera. Es honesto y no se apropia de nada, pero Alex lo
 * vio en pantalla el 20-09-2026 y dijo lo evidente: nueve rectangulos con
 * texto dentro no son logotipos, son una tabla de nombres.
 *
 * Esto baja el logotipo de verdad DONDE SE PUEDE, y lo dice cuando no se
 * puede. No hay termino medio ni dibujo aproximado: o es la marca de la
 * empresa tal y como ella la publica, o es el wordmark de `build-logos.js`.
 *
 * 🔴 LO QUE NO SE PUEDE Y HAY QUE SABER
 * -------------------------------------
 * simple-icons (CC0) cubre 3 de las 50: Redsys, Stripe y SAP. Su "Agora"
 * es Agora.io, otra empresa — lista negra en `build-logos.js`. El resto son
 * marcas hoteleras espanolas y hay que ir a su web una por una. Medido el
 * 20-09-2026 sobre las 39 que declaran web en `integraciones.json`:
 *   - 1 no responde (revtool), 1 mas no resuelve (hubos)
 *   - unas sirven el logo como archivo .svg y otras como <svg> en linea
 *   - varias sirven el logo de OTRA empresa en su portada (Revo ensena el
 *     de Cloudbeds y el de Cegid; Prinex, el de Blackstone; Yacan, el de
 *     Google via un widget de resenas). Un logotipo correcto de la empresa
 *     equivocada es peor que un wordmark, porque parece bien: por eso cada
 *     marca lleva una RECETA escrita a mano y verificada, nunca un
 *     "coge el primer svg que ponga logo".
 *
 * LICENCIA
 * --------
 * Son marcas registradas de terceros. Se usan para decir con que se integra
 * Holdera, que es uso nominativo y lo normal en una pagina de integraciones,
 * pero NO son CC0 y no se redibujan ni se alteran de forma: solo se
 * reescalan y se pasan a un color. Si alguna empresa pide retirarla, se
 * quita su receta de aqui y vuelve a su wordmark sin tocar nada mas.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const HERE = __dirname;
const ROOT = path.join(HERE, '..', '..');
const OUTDIR = path.join(HERE, 'marcas');
const CACHE = path.join(HERE, '.cache-marcas');
const DRY = process.argv.includes('--dry');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36';

/* --- LAS RECETAS ----------------------------------------------------------
 * `page`  la URL de donde sale (no siempre la home: siteminder.com/ devuelve
 *         un reto de Cloudflare a curl y siteminder.com/es/ no).
 * `pick`  como encontrarlo dentro de esa pagina:
 *           {inline: /regex/}  el primer <svg> del documento que case
 *           {file: 'url'}      un .svg suelto, absoluto o relativo a `page`
 * `hex`   el color de marca, leido del propio archivo o de su web.
 * `nota`  por que esta receta y no otra. Se guarda en marcas.json.
 */
const RECETAS = {
  siteminder: {
    // Revisado a ojo en la hoja de contacto del 20-09-2026: su blanco es
    // fondo o adorno, no un calado — la marca se lee entera en monocromo.
    calado_revisado: true,
    page: 'https://www.siteminder.com/es/',
    pick: { inline: /viewBox="0 0 191 27"/ },
    nota: 'La home en ingles devuelve un reto de Cloudflare a curl; /es/ no. Su logo en linea no lleva title ni aria-label: se ancla en el viewBox 191x27 de la cabecera (div.header-logo).',
  },
  pricelabs: {
    // Revisado a ojo en la hoja de contacto del 20-09-2026: su blanco es
    // fondo o adorno, no un calado — la marca se lee entera en monocromo.
    calado_revisado: true,
    page: 'https://www.pricelabs.co/',
    pick: { inline: /aria-label="PriceLabs Logo"/i },
    nota: 'Logo en linea en la cabecera, con aria-label propio.',
  },
  'salto-ks': {
    // Revisado a ojo en la hoja de contacto del 20-09-2026: su blanco es
    // fondo o adorno, no un calado — la marca se lee entera en monocromo.
    calado_revisado: true,
    page: 'https://saltosystems.com/en/',
    pick: { inline: /<title>Salto Systems<\/title>/i },
    nota: 'Salto KS es el producto; el logotipo es el de Salto Systems, la empresa.',
  },
  revo: {
    // Revisado a ojo en la hoja de contacto del 20-09-2026: su blanco es
    // fondo o adorno, no un calado — la marca se lee entera en monocromo.
    calado_revisado: true,
    page: 'https://revo.works/',
    pick: { inline: /<title>\s*Revo\s*<\/title>/i },
    nota: 'Su portada ensena tambien los logos de Cloudbeds y Cegid: hay que anclar en <title>Revo</title>.',
  },
  hijiffy: {
    // Revisado a ojo en la hoja de contacto del 20-09-2026: su blanco es
    // fondo o adorno, no un calado — la marca se lee entera en monocromo.
    calado_revisado: true,
    page: 'https://www.hijiffy.com/',
    pick: { file: 'https://www.hijiffy.com/wp-content/uploads/2026/01/Logo.svg' },
    nota: 'Archivo suelto en su WordPress. La copia del CDN de Nitro es la misma.',
  },
  holded: {
    // Revisado a ojo en la hoja de contacto del 20-09-2026: su blanco es
    // fondo o adorno, no un calado — la marca se lee entera en monocromo.
    calado_revisado: true,
    page: 'https://www.holded.com/',
    pick: { inline: /aria-label="Holded"[^>]*>\s*<path d="M14\.2796/i },
    nota: 'Dos <svg> con aria-label Holded: el de 120x18 es el completo, el de 20x18 solo el isotipo.',
  },
  paycomet: { page: 'https://www.paycomet.com/', pick: { file: 'https://www.paycomet.com/img/logo-paycomet.svg' }, calado_revisado: true, nota: 'Archivo suelto.' },
  monei: { page: 'https://monei.com/', pick: { file: 'https://assets.monei.com/images/logo.svg' }, calado_revisado: true, nota: 'Archivo suelto en su CDN.' },
  revbell: { page: 'https://revbell.com/', pick: { file: 'https://revbell.com/wp-content/uploads/2025/04/revbell-logo.svg' }, calado_revisado: true, nota: 'Archivo suelto en su WordPress.' },
};

/* Marcas que NO se intentan, y por que. Se quedan en wordmark a proposito. */
const SIN_LOGO = {
  sap:
    '🔴 SU LOGOTIPO ES UN CALADO y no sobrevive a pasarlo a un color: las letras "SAP" son BLANCAS recortadas sobre la franja azul, asi que al volverlo monocromo las letras toman el color de la franja y desaparecen. Medido en la hoja de contacto: un paralelogramo gris sin texto. Se usa el de simple-icons (CC0), que ya viene monocromo y pensado para esto.',
  roompricegenie:
    'Su unico SVG publico (rpg_Logo_black.svg) es el lockup APILADO, 255x185: llevado a 24 de alto mide 33 de ancho y su texto queda a ~6px. Un logotipo ilegible no mejora a un wordmark.',
  hubos: 'hubos.com y hubos.es no resuelven (20-09-2026, UA de navegador y siguiendo redirecciones).',
  revtool: 'Su dominio no responde.',
  yacan_smart: 'El unico .svg de "logo" de su portada es el de Google, de un widget de resenas.',
  prinex: 'El unico .svg de "logo" de su portada es el de Blackstone, su propietario.',
  'sage-50': 'Sage sirve UN logo para todos sus productos; un wordmark distingue Sage 50 de Sage 200 y el logo no.',
  'sage-200': 'Idem Sage 50.',
};

function curl(url, out) {
  try {
    execFileSync(
      'curl',
      ['-s', '-m', '25', '-L', '-A', UA, '-H', 'Accept: text/html,image/svg+xml,*/*', '-H', 'Accept-Language: es-ES,es;q=0.9,en;q=0.8', '-o', out, url],
      { stdio: 'ignore' }
    );
    return fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : null;
  } catch {
    return null;
  }
}

/** El primer <svg>…</svg> del documento que case con `re`. */
function inlineSvg(html, re) {
  for (const m of html.matchAll(/<svg[\s\S]*?<\/svg>/gi)) if (re.test(m[0])) return m[0];
  return null;
}

/** Los colores que trae el logotipo original, del mas usado al menos. */
function coloursOf(svg) {
  const count = new Map();
  for (const m of svg.matchAll(/(?:fill|stop-color)\s*[:=]\s*["']?(#[0-9a-f]{3,8})/gi)) {
    const hex = m[1].toLowerCase();
    if (hex === '#fff' || hex === '#ffffff' || hex === '#000' || hex === '#000000') continue;
    count.set(hex, (count.get(hex) || 0) + 1);
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([hex]) => (hex.length === 4 ? '#' + [...hex.slice(1)].map((c) => c + c).join('') : hex));
}

/**
 * El logotipo, pasado al contrato de la casa: monocromo en `currentColor`,
 * viewBox de alto 24 y ancho el que le toque.
 *
 * No se redibuja nada: se envuelve en un <g> con la escala que lleva su
 * caja original a 24 de alto. Los `fill`/`stroke` de color se cambian por
 * `currentColor`; los `fill="none"` se respetan, porque en un logotipo con
 * trazo quitarlos lo rellena de tinta y lo convierte en una mancha.
 */
function normalise(svg, label) {
  const vb = /viewBox\s*=\s*["']\s*([-\d.]+)[ ,]+([-\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/i.exec(svg);
  if (!vb) return null;
  const [, minx, miny, w, h] = vb.map(Number);
  if (!(w > 0 && h > 0)) return null;
  const k = 24 / h;
  const width = +(w * k).toFixed(2);

  let inner = svg.replace(/^[\s\S]*?<svg[^>]*>/i, '').replace(/<\/svg>\s*$/i, '');
  inner = inner.replace(/<title>[\s\S]*?<\/title>/gi, '');
  // Color -> currentColor. `none` se respeta.
  inner = inner.replace(/(fill|stroke)\s*=\s*"(?!none|url\()[^"]*"/gi, '$1="currentColor"');
  inner = inner.replace(/(fill|stroke)\s*:\s*(?!none|url\()[^;"']+/gi, '$1:currentColor');
  /* 🔴 Un `fill: url(#degradado)` NO es una referencia estructural, es color,
     y sobrevivia al barrido de arriba porque el patron excluye `url(`. El
     logotipo de SAP entraba asi: su franja iba pintada por un
     `<linearGradient>` de cinco paradas azules y salia en azul dentro de un
     archivo que se declara monocromo. Se convierte tambien, y despues se
     tiran los degradados, que ya no los referencia nadie y solo dejarian
     literales de color dentro del archivo.
     Lo que NO se toca es `clip-path="url(#…)"` ni `mask="url(#…)"`: esos si
     son estructura, y cambiarlos borra medio dibujo. */
  inner = inner.replace(/(fill|stroke)\s*=\s*"url\([^"]*\)"/gi, '$1="currentColor"');
  inner = inner.replace(/(fill|stroke)\s*:\s*url\([^;"')]*\)/gi, '$1:currentColor');
  inner = inner.replace(/<(linear|radial)Gradient[\s\S]*?<\/\1Gradient>/gi, '');

  const transform = `scale(${k.toFixed(6)}) translate(${-minx} ${-miny})`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 24" role="img" aria-label="${label}" fill="currentColor">` +
    `<g transform="${transform}">${inner.trim()}</g>` +
    `</svg>\n`
  );
}

function main() {
  fs.mkdirSync(CACHE, { recursive: true });
  /* Se vacia en cada pasada. Sin esto, retirar una receta —SAP, por su
     calado— dejaba su archivo viejo en la carpeta y `build-logos.js` lo
     seguia sirviendo: la decision de quitarlo no llegaba a la pagina. */
  if (!DRY) {
    fs.rmSync(OUTDIR, { recursive: true, force: true });
    fs.mkdirSync(OUTDIR, { recursive: true });
  }
  const catalogo = JSON.parse(fs.readFileSync(path.join(HERE, 'integraciones.json'), 'utf8'));
  const nombre = new Map(catalogo.integraciones.map((i) => [i.slug, i.nombre]));

  const marcas = {};
  const fallos = [];
  for (const [slug, receta] of Object.entries(RECETAS)) {
    const label = nombre.get(slug) || slug;
    let svg = null;
    if (receta.pick.file) {
      svg = curl(receta.pick.file, path.join(CACHE, slug + '.src.svg'));
      if (svg && !/<svg/i.test(svg)) svg = null;
    } else {
      const html = curl(receta.page, path.join(CACHE, slug + '.html'));
      if (html) svg = inlineSvg(html, receta.pick.inline);
    }
    if (!svg) {
      fallos.push(`${slug}: no se encontro el logotipo con su receta (${receta.page})`);
      continue;
    }
    /* 🔴 UN LOGOTIPO CALADO NO SE PUEDE PASAR A UN COLOR.
       Si el dibujo usa blanco Y algun otro color, lo normal es que el blanco
       sean letras o una forma RECORTADA sobre la otra: al volverlo monocromo
       las dos toman el mismo color y lo calado desaparece. Paso con SAP —
       las letras blancas sobre la franja azul se esfumaron y quedo un
       paralelogramo gris—, y lo peor es que un archivo asi no da ningun
       error: sale un logotipo mudo que en una captura parece una mancha.
       Se rechaza aqui y la marca se queda con su wordmark. */
    const tieneBlanco = /(?:fill|stop-color)\s*[:=]\s*["']?(?:#f{3}\b|#f{6}\b|white)/i.test(svg);
    const tieneColor = coloursOf(svg).length > 0;
    if (tieneBlanco && tieneColor && !receta.calado_revisado) {
      fallos.push(slug + ': mezcla blanco y color — probable calado, que al pasar a monocromo se borra. Revisalo y anade `calado_revisado: true` si de verdad no lo es.');
      continue;
    }
    const hex = coloursOf(svg);
    /* Una marca que va en una FILA tiene que ser ancha. Por debajo de 2:1 lo
       que ha llegado es un icono suelto o un lockup apilado, y los dos se
       leen mal a 13px de alto. Se avisa y se decide a mano: una receta con
       `icono: true` lo acepta (Redsys y Stripe son cuadrados y estan bien).
       Lo cazo RoomPriceGenie, 255x185. */
    const caja = /viewBox\s*=\s*["']\s*[-\d.]+[ ,]+[-\d.]+[ ,]+([\d.]+)[ ,]+([\d.]+)/i.exec(svg);
    const ratio = caja ? Number(caja[1]) / Number(caja[2]) : 0;
    if (ratio && ratio < 2 && !receta.icono) {
      fallos.push(slug + ': proporcion ' + ratio.toFixed(2) + ':1 — parece un lockup apilado o un icono, no una marca de fila. Anade `icono: true` a su receta si es correcto.');
      continue;
    }
    const out = normalise(svg, label);
    if (!out) {
      fallos.push(`${slug}: el svg no trae viewBox utilizable`);
      continue;
    }
    if (!DRY) fs.writeFileSync(path.join(OUTDIR, slug + '.svg'), out, 'utf8');
    marcas[slug] = { nombre: label, origen: receta.pick.file || receta.page, hex: hex[0] || null, colores: hex, nota: receta.nota, bytes: out.length };
    console.log(`  ok  ${slug.padEnd(16)} ${String(out.length).padStart(6)} B  color ${hex[0] || '(ninguno propio)'}`);
  }

  for (const [slug, why] of Object.entries(SIN_LOGO)) marcas[slug] = { nombre: nombre.get(slug) || slug, logo: false, nota: why };

  if (!DRY) {
    fs.writeFileSync(
      path.join(HERE, 'marcas.json'),
      JSON.stringify({ generado: new Date().toISOString().slice(0, 10), contrato: 'monocromo currentColor, viewBox de alto 24', marcas }, null, 1) + '\n'
    );
  }
  console.log(`\nlogotipos reales: ${Object.values(marcas).filter((m) => m.logo !== false).length}`);
  if (fallos.length) {
    console.log(`fallos: ${fallos.length}`);
    for (const f of fallos) console.log('  ! ' + f);
  }
  process.exit(fallos.length ? 1 : 0);
}

main();
