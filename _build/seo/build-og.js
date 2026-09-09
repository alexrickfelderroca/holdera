#!/usr/bin/env node
'use strict';
/*
 * _build/seo/build-og.js — renderiza las tarjetas sociales (og:image) a PNG.
 *
 *   node _build/seo/build-og.js
 *
 * 1. Abre cada _build/seo/og-*.html con Chrome headless a 1200x630 y captura
 *    un PNG en bruto en la carpeta temporal del sistema.
 * 2. Lo pasa por sharp: comprueba las dimensiones, lo cuantiza a paleta
 *    (dither alto para que el degradado no bandee) y lo deja en assets/seo/.
 * 3. Falla (código 1) si algún PNG no mide 1200x630 o pesa >= 200 KB.
 *
 * Geist se carga de Google Fonts DENTRO del HTML: sin red, Chrome cae a
 * system-ui y el resultado NO es el bueno. Se comprueba la red antes y se
 * avisa; no se aborta por si Alex quiere ver el resultado igualmente.
 *
 * sharp no está en este proyecto (sin build): se toma prestado del node_modules
 * de otro proyecto con NODE_PATH. Ver SHARP_PATH.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = __dirname;
const OUT = path.join(ROOT, 'assets', 'seo');
const SHARP_PATH = 'C:/Users/Rickfelder/Desktop/aplomo/site/node_modules';
const MAX_BYTES = 200 * 1024;
const W = 1200, H = 630;

const CARDS = [
  { html: 'og-default.html', png: 'og-default.png' },
  { html: 'og-panel.html', png: 'og-panel.png' },
];

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe'),
];

function requireSharp() {
  try { return require('sharp'); } catch (e) { /* sigue */ }
  try { return require(path.join(SHARP_PATH, 'sharp')); } catch (e) {
    console.error('No encuentro sharp. Ejecuta con NODE_PATH="' + SHARP_PATH + '" o ajusta SHARP_PATH.');
    process.exit(1);
  }
}

function findChrome() {
  const hit = CHROME_CANDIDATES.find((p) => p && fs.existsSync(p));
  if (!hit) { console.error('No encuentro chrome.exe en: ' + CHROME_CANDIDATES.join(' | ')); process.exit(1); }
  return hit;
}

function fontsReachable() {
  return new Promise((resolve) => {
    const req = https.request({ host: 'fonts.googleapis.com', path: '/css2?family=Geist&display=block', method: 'HEAD', timeout: 6000 }, (res) => {
      res.resume(); resolve(res.statusCode > 0 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

function fileUrl(p) {
  return 'file:///' + p.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/').replace(/^([A-Za-z])%3A/, '$1:');
}

function render(chrome, htmlPath, rawPng, profileDir) {
  const args = [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
    '--window-size=' + W + ',' + H, '--force-device-scale-factor=1',
    '--virtual-time-budget=10000',
    '--user-data-dir=' + profileDir,
    '--screenshot=' + rawPng,
    fileUrl(htmlPath),
  ];
  // Chrome escribe ruido en stderr aunque todo vaya bien: se ignora y se
  // comprueba el archivo, que es lo único que cuenta.
  spawnSync(chrome, args, { stdio: ['ignore', 'ignore', 'ignore'], timeout: 60000 });
  if (!fs.existsSync(rawPng)) throw new Error('Chrome no ha escrito ' + rawPng);
}

(async () => {
  const sharp = requireSharp();
  const chrome = findChrome();
  const online = await fontsReachable();
  if (!online) console.warn('AVISO: fonts.googleapis.com no responde: Geist no cargará y la tarjeta saldrá en system-ui.');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'holdera-og-'));
  fs.mkdirSync(OUT, { recursive: true });
  let failed = false;

  for (const card of CARDS) {
    const htmlPath = path.join(SRC, card.html);
    const rawPng = path.join(tmp, card.png.replace(/\.png$/, '-raw.png'));
    const outPng = path.join(OUT, card.png);
    render(chrome, htmlPath, rawPng, path.join(tmp, 'profile'));

    const meta = await sharp(rawPng).metadata();
    if (meta.width !== W || meta.height !== H) {
      console.error('FALLO ' + card.png + ': mide ' + meta.width + 'x' + meta.height + ', esperaba ' + W + 'x' + H);
      failed = true; continue;
    }
    // Paleta de 256 colores con dither: el suelo es un degradado suave y con
    // dither alto no bandea; recorta el peso a menos de la mitad.
    await sharp(rawPng).png({ palette: true, quality: 92, colours: 256, dither: 1.0, effort: 10, compressionLevel: 9 }).toFile(outPng);
    const bytes = fs.statSync(outPng).size;
    const ok = bytes < MAX_BYTES;
    if (!ok) failed = true;
    console.log((ok ? 'OK   ' : 'FALLO') + ' ' + path.relative(ROOT, outPng) + '  ' + W + 'x' + H + '  ' + (bytes / 1024).toFixed(1) + ' KB' + (ok ? '' : '  (>= 200 KB)') + '  [bruto ' + (fs.statSync(rawPng).size / 1024).toFixed(1) + ' KB]');
  }
  if (!online) console.warn('Recuerda: sin red la tipografía NO es Geist. Vuelve a generar con conexión.');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
