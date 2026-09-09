#!/usr/bin/env node
'use strict';
/*
 * _build/seo/build-icons.js — iconos PNG de la marca para el manifest y iOS.
 *
 *   node _build/seo/build-icons.js
 *
 * Fuente: assets/logo/favicon.svg = baldosa de tinta #101010 con esquinas
 * rx 14/64 y una H serif entre dos barras (aproximación en texto Georgia del
 * monograma real). Decisión:
 *   - favicon-32.png se rasteriza del favicon.svg tal cual: su H gruesa está
 *     pensada para 16-32 px y es lo que la pestaña ya enseña.
 *   - 180/192/512 llevan la misma baldosa de tinta pero con el MONOGRAMA REAL
 *     (assets/logo/holdera-monogram-white.png, la H con barras del logotipo):
 *     a ese tamaño la H de Georgia se ve genérica y el monograma es la marca.
 *   - 180/192/512 van a sangre (sin esquinas transparentes): iOS y Android
 *     aplican su propia máscara. La marca ocupa el 55-59 % de alto, dentro del
 *     círculo seguro del 80 % que exige "purpose: maskable".
 * Todo se rasteriza con sharp a partir de un SVG construido aquí.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'assets', 'icons');
const SHARP_PATH = 'C:/Users/Rickfelder/Desktop/aplomo/site/node_modules';
const INK = '#101010';
const MONO = path.join(ROOT, 'assets', 'logo', 'holdera-monogram-white.png');
const FAVICON_SVG = path.join(ROOT, 'assets', 'logo', 'favicon.svg');
const MONO_W = 221, MONO_H = 458; // el PNG del monograma (con 24px de margen transparente)

function requireSharp() {
  try { return require('sharp'); } catch (e) { /* sigue */ }
  try { return require(path.join(SHARP_PATH, 'sharp')); } catch (e) {
    console.error('No encuentro sharp. Ejecuta con NODE_PATH="' + SHARP_PATH + '" o ajusta SHARP_PATH.');
    process.exit(1);
  }
}

// Baldosa de tinta + monograma centrado. rx=0 → a sangre (maskable / iOS).
function tileSvg(size, rx, markRatio, monoB64) {
  const markH = Math.round(size * markRatio);
  const markW = Math.round(markH * MONO_W / MONO_H);
  const x = Math.round((size - markW) / 2);
  const y = Math.round((size - markH) / 2);
  return Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
    '<rect width="' + size + '" height="' + size + '" rx="' + rx + '" fill="' + INK + '"/>' +
    '<image x="' + x + '" y="' + y + '" width="' + markW + '" height="' + markH + '" xlink:href="data:image/png;base64,' + monoB64 + '"/>' +
    '</svg>'
  );
}

(async () => {
  const sharp = requireSharp();
  fs.mkdirSync(OUT, { recursive: true });
  const monoB64 = fs.readFileSync(MONO).toString('base64');
  const favicon = fs.readFileSync(FAVICON_SVG);

  const jobs = [
    { name: 'icon-512.png', size: 512, src: tileSvg(512, 0, 0.59, monoB64) },
    { name: 'icon-192.png', size: 192, src: tileSvg(192, 0, 0.59, monoB64) },
    { name: 'apple-touch-icon.png', size: 180, src: tileSvg(180, 0, 0.55, monoB64) },
    // 32 px: el favicon.svg tal cual (density escala el viewBox de 64 a 32)
    { name: 'favicon-32.png', size: 32, src: favicon, density: 72 * (32 / 64) },
  ];

  let failed = false;
  for (const j of jobs) {
    const out = path.join(OUT, j.name);
    const input = j.density ? sharp(j.src, { density: j.density }) : sharp(j.src);
    await input.resize(j.size, j.size).png({ compressionLevel: 9, palette: true, quality: 100, effort: 10 }).toFile(out);
    const m = await sharp(out).metadata();
    const ok = m.width === j.size && m.height === j.size;
    if (!ok) failed = true;
    console.log((ok ? 'OK   ' : 'FALLO') + ' ' + path.relative(ROOT, out) + '  ' + m.width + 'x' + m.height + '  ' + (fs.statSync(out).size / 1024).toFixed(1) + ' KB');
  }
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
