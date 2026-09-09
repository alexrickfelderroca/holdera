/* Oval tiles for the drawer's marquee rows.
 * Built ONLY from assets this project already owns — the brain point cloud, the
 * re-tinted planet map and the brand marks. No stock photography, nothing
 * invented, and no partner logo (that list is still unconfirmed with Alex, and
 * putting a company's mark in the menu would assert a relationship).
 * Run: NODE_PATH=<project with sharp>/node_modules node _build/menu-tiles.js */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'img', 'menu');
fs.mkdirSync(OUT, { recursive: true });

const W = 320, H = 420;
const INK = '#121110', ACCENT = '#f08a24';

(async () => {
  // 1. the brain — "automatización con IA". The poster is DARK points on a pale
  // ground, so it goes on a light tile: screened onto ink it vanished entirely.
  await sharp({ create: { width: W, height: H, channels: 3, background: '#e5e5e5' } })
    .composite([{ input: await sharp(path.join(ROOT, 'assets/img/brain-poster.png'))
      .flatten({ background: '#e5e5e5' })
      .resize(300, 300, { fit: 'inside' }).toBuffer(), gravity: 'center' }])
    .jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(OUT, 'tile-ia.jpg'));

  // 2 & 3. two crops of the planet map — "integración" and "sistemas"
  await sharp(path.join(ROOT, 'assets/img/planet-color.jpg'))
    .extract({ left: 240, top: 180, width: 520, height: 680 }).resize(W, H)
    .modulate({ brightness: 1.25 }).jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(OUT, 'tile-mundo.jpg'));
  await sharp(path.join(ROOT, 'assets/img/planet-color.jpg'))
    .extract({ left: 1180, top: 120, width: 520, height: 680 }).resize(W, H)
    .modulate({ brightness: 1.25 }).jpeg({ quality: 82, mozjpeg: true })
    .toFile(path.join(OUT, 'tile-red.jpg'));

  // 4. the brand mark on accent
  await sharp({ create: { width: W, height: H, channels: 3, background: ACCENT } })
    .composite([{ input: await sharp(path.join(ROOT, 'assets/logo/holdera-monogram-dark.png'))
      .resize(null, 150, { fit: 'inside' }).toBuffer(), gravity: 'center' }])
    .jpeg({ quality: 84, mozjpeg: true }).toFile(path.join(OUT, 'tile-marca.jpg'));

  for (const f of fs.readdirSync(OUT)) {
    console.log(' ', f, (fs.statSync(path.join(OUT, f)).size / 1024).toFixed(1) + ' KB');
  }
})();
