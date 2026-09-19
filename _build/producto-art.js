/* HOLDERA — convierte las capturas del panel en la obra del escaparate del hero.
 *
 * Las cinco superficies del producto (Hoy · Habitaciones · Housekeeping ·
 * Revenue y reservas · Trazabilidad) se enseñan en el hero con el revelado
 * direccional. Antes eran fotos de banco de un negocio genérico; ahora son
 * el producto de verdad, que es el único argumento de venta que tenemos.
 *
 * Entrada:  assets/img/producto/_raw/<clave>-full.png
 *           una captura de PÁGINA ENTERA de cada pantalla del panel, a 1600
 *           de ancho (Chrome DevTools, fullPage).
 * Salida:   assets/img/producto/<clave>-<bg|a|b|c>.webp
 *
 * Por qué recortar en vez de capturar cuatro veces: una captura de página
 * entera contiene ya los cuatro encuadres, y recortarla es determinista y
 * repetible. Los tamaños son los mismos que tenía la obra anterior para que
 * la rejilla del escaparate no se mueva: fondo 1600x1067 (3:2), panel -a en
 * vertical 694x1040, paneles -b y -c en horizontal 1040x694.
 *
 * sharp no está instalado en este repo: se toma prestado del producto con
 * NODE_PATH (ver CLAUDE.md).
 *
 * Uso:
 *   NODE_PATH="<producto>/node_modules" node _build/producto-art.js
 */
const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
} catch {
  console.error('sharp no está en la ruta. Pásalo con NODE_PATH, por ejemplo:');
  console.error('  NODE_PATH="<producto>/node_modules" node _build/producto-art.js');
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'img', 'producto');
const RAW = path.join(OUT, '_raw');

const KEYS = ['hoy', 'habitaciones', 'housekeeping', 'revenue', 'trazabilidad'];

/**
 * Los cuatro encuadres, en fracciones de la captura completa. `top` es la
 * fracción del ALTO donde empieza el recorte, `left` la del ANCHO; el tamaño
 * de salida es fijo. Se eligen así y no en píxeles porque las cinco pantallas
 * tienen alturas muy distintas (Today mide el triple que Metrics).
 */
const FRAMES = [
  { slot: 'bg', w: 1600, h: 1067, top: 0, left: 0, quality: 72 },
  { slot: 'a', w: 694, h: 1040, top: 0.06, left: 0.0, quality: 80 },
  { slot: 'b', w: 1040, h: 694, top: 0.3, left: 0.18, quality: 80 },
  { slot: 'c', w: 1040, h: 694, top: 0.58, left: 0.34, quality: 80 },
];

async function main() {
  if (!fs.existsSync(RAW)) {
    console.error(`No existe ${RAW}. Guarda ahí las capturas <clave>-full.png antes de convertir.`);
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });

  let made = 0;
  let missing = 0;
  let bytes = 0;

  for (const key of KEYS) {
    const src = path.join(RAW, `${key}-full.png`);
    if (!fs.existsSync(src)) {
      console.log(`FALTA  ${key}-full.png`);
      missing += FRAMES.length;
      continue;
    }
    const meta = await sharp(src).metadata();
    const W = meta.width ?? 0;
    const H = meta.height ?? 0;

    for (const frame of FRAMES) {
      // El recorte nunca puede salirse de la imagen: se escala a lo que haya
      // y se ancla dentro. Una pantalla corta da un recorte más apretado, no
      // un error.
      const cw = Math.min(frame.w, W);
      const ch = Math.min(frame.h, H);
      const left = Math.max(0, Math.min(Math.round(W * frame.left), W - cw));
      const top = Math.max(0, Math.min(Math.round(H * frame.top), H - ch));

      const dest = path.join(OUT, `${key}-${frame.slot}.webp`);
      await sharp(src)
        .extract({ left, top, width: cw, height: ch })
        .resize(frame.w, frame.h, { fit: 'cover', position: 'top' })
        .webp({ quality: frame.quality })
        .toFile(dest);

      const size = fs.statSync(dest).size;
      bytes += size;
      made++;
      console.log(`OK     ${key}-${frame.slot}.webp  ${frame.w}x${frame.h}  ${(size / 1024).toFixed(0)} KB  (recorte ${cw}x${ch} en ${left},${top} de ${W}x${H})`);
    }
  }

  console.log(`\n${made} archivo(s), ${(bytes / 1024).toFixed(0)} KB en total${missing ? `, ${missing} sin captura` : ''}`);
  if (missing) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
