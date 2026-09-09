const sharp = require('sharp');
const path = require('path');
const src = path.resolve(__dirname, '..') + '/';
const out = process.argv[2];
const jobs = [
  ['WhatsApp Image 2026-09-02 at 18.36.36.jpeg', 'holdera-logo-full'],
  ['WhatsApp Image 2026-09-02 at 18.36.39.jpeg', 'holdera-monogram'],
];
(async () => {
  for (const [file, name] of jobs) {
    const img = sharp(path.join(src, file)).greyscale();
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
    // luminance -> alpha, white fill; soft threshold to kill JPEG noise
    const rgba = Buffer.alloc(info.width * info.height * 4);
    let minX = info.width, minY = info.height, maxX = 0, maxY = 0;
    for (let i = 0; i < info.width * info.height; i++) {
      const v = data[i];
      const a = v < 40 ? 0 : v > 200 ? 255 : Math.round(((v - 40) / 160) * 255);
      rgba[i * 4] = 255; rgba[i * 4 + 1] = 255; rgba[i * 4 + 2] = 255; rgba[i * 4 + 3] = a;
      const x = i % info.width, y = (i / info.width) | 0; if (x < 8 || y < 8 || x >= info.width - 8 || y >= info.height - 8) { rgba[i * 4 + 3] = 0; continue; } if (a > 0) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
    }
    const pad = 24;
    const left = Math.max(0, minX - pad), top = Math.max(0, minY - pad);
    const width = Math.min(info.width, maxX + pad) - left, height = Math.min(info.height, maxY + pad) - top;
    const base = sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } });
    await base.clone().extract({ left, top, width, height }).png().toFile(path.join(out, name + '-white.png'));
    // dark variant for light backgrounds
    const dark = Buffer.from(rgba); for (let i = 0; i < dark.length; i += 4) { dark[i] = 10; dark[i + 1] = 10; dark[i + 2] = 10; }
    await sharp(dark, { raw: { width: info.width, height: info.height, channels: 4 } }).extract({ left, top, width, height }).png().toFile(path.join(out, name + '-dark.png'));
    console.log(name, 'bbox', { left, top, width, height }, 'ratio', (width / height).toFixed(3));
  }
})().catch(e => { console.error(e); process.exit(1); });
