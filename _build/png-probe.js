/* png-probe.js — mide contraste WCAG sobre PIXELES REALES de una captura.
 *
 * Por que existe: el contraste de un texto que se lee sobre obra grafica, un
 * canvas WebGL o un degradado NO se puede calcular desde el CSS. Hay que mirar
 * el pixel. `_build/measure.html` hace esto dentro del navegador; esto lo hace
 * desde Node sobre un PNG ya guardado, para poder comparar ANTES y DESPUES.
 *
 * No usa sharp: sharp no esta instalado en esta maquina (la ruta que el
 * CLAUDE.md daba, aplomo/site/node_modules, ya no existe). Decodifica el PNG a
 * mano con zlib, que viene con Node. Solo soporta lo que produce Chrome:
 * 8 bits por canal, color type 2 (RGB) o 6 (RGBA), sin entrelazar.
 *
 * Uso:
 *   node _build/png-probe.js <captura.png> <dpr> <regiones.json>
 *
 * regiones.json: [{ name, color:[r,g,b], x, y, w, h, need }]  (x/y/w/h en px CSS)
 * `need` es el ratio exigido (4.5 texto normal, 3 texto grande o no-texto).
 */

const fs = require('fs');
const zlib = require('zlib');

function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('no es un PNG');
  let pos = 8, width = 0, height = 0, bitDepth = 0, colorType = 0, interlace = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') break;
    pos += 12 + len;
  }
  if (bitDepth !== 8) throw new Error('solo 8 bits por canal, este tiene ' + bitDepth);
  if (interlace !== 0) throw new Error('PNG entrelazado no soportado');
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0;
  if (!channels) throw new Error('color type ' + colorType + ' no soportado');

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(height * stride);

  // Deshacer los filtros por scanline (PNG spec 9.2). Cada linea empieza con
  // un byte de filtro; a/b/c son el pixel de la izquierda, el de arriba y el
  // de arriba-izquierda.
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const src = y * (stride + 1) + 1;
    const dst = y * stride;
    for (let i = 0; i < stride; i++) {
      const x = raw[src + i];
      const a = i >= channels ? out[dst + i - channels] : 0;
      const b = y > 0 ? out[dst - stride + i] : 0;
      const c = (i >= channels && y > 0) ? out[dst - stride + i - channels] : 0;
      let v;
      if (filter === 0) v = x;
      else if (filter === 1) v = x + a;
      else if (filter === 2) v = x + b;
      else if (filter === 3) v = x + ((a + b) >> 1);
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      } else throw new Error('filtro PNG desconocido: ' + filter);
      out[dst + i] = v & 0xff;
    }
  }
  return { width, height, channels, data: out };
}

const toLinear = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const luminance = ([r, g, b]) => 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
const contrast = (a, b) => {
  const l1 = Math.max(luminance(a), luminance(b));
  const l2 = Math.min(luminance(a), luminance(b));
  return (l1 + 0.05) / (l2 + 0.05);
};

function probe(pngPath, dpr, regions) {
  const img = decodePNG(fs.readFileSync(pngPath));
  const rows = [];
  for (const r of regions) {
    let worst = Infinity, worstPx = null, best = -Infinity;
    const x0 = Math.max(0, Math.round(r.x * dpr));
    const y0 = Math.max(0, Math.round(r.y * dpr));
    const x1 = Math.min(img.width, Math.round((r.x + r.w) * dpr));
    const y1 = Math.min(img.height, Math.round((r.y + r.h) * dpr));
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const i = (y * img.width + x) * img.channels;
        const px = [img.data[i], img.data[i + 1], img.data[i + 2]];
        const cr = contrast(r.color, px);
        if (cr < worst) { worst = cr; worstPx = px; }
        if (cr > best) best = cr;
      }
    }
    rows.push({ name: r.name, worst, worstPx, best, need: r.need, pass: worst >= r.need });
  }
  return { img, rows };
}

module.exports = { decodePNG, contrast, luminance, probe };

if (require.main === module) {
  const [pngPath, dprArg, regionsPath] = process.argv.slice(2);
  if (!pngPath || !regionsPath) {
    console.error('uso: node _build/png-probe.js <captura.png> <dpr> <regiones.json>');
    process.exit(2);
  }
  const dpr = Number(dprArg) || 1;
  const regions = JSON.parse(fs.readFileSync(regionsPath, 'utf8'));
  const { img, rows } = probe(pngPath, dpr, regions);
  console.log(`imagen ${img.width}x${img.height} (${img.channels} canales), dpr ${dpr}`);
  console.log('');
  let failed = 0;
  for (const r of rows) {
    if (!r.pass) failed++;
    console.log(
      r.name.padEnd(30) +
      'peor ' + r.worst.toFixed(2).padStart(6) + ':1' +
      '  fondo rgb(' + r.worstPx.join(',') + ')'.padEnd(4) +
      '  mejor ' + r.best.toFixed(2).padStart(6) + ':1' +
      '  exige ' + String(r.need).padStart(3) + ':1  ' +
      (r.pass ? 'PASA' : 'FALLA')
    );
  }
  console.log('');
  console.log(failed ? `${failed} de ${rows.length} regiones FALLAN` : `las ${rows.length} regiones pasan`);
  process.exit(failed ? 1 : 0);
}
