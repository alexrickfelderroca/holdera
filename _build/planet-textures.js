/* hologram-gezegen  ->  web textures for the "Cómo trabajamos" planet.
 *
 * The source is a 4096x4096 equirectangular hologram map, and it is BLUE/CYAN.
 * Holdera's palette is warm neutral + orange, and the reference prompt says to
 * re-theme every colour to the project's tokens rather than copy the reference
 * palette — so the map is re-tinted here, at build time, instead of being
 * tinted in the shader (a shader tint costs a branch per fragment forever; a
 * build-time tint costs nothing and is inspectable as a PNG).
 *
 * The map is stored 1:1 but is a true 2:1 equirect content-wise, so resizing to
 * 2048x1024 removes the vertical stretch rather than distorting it.
 *
 * Ocean is pure black in the source (58% of pixels), land ~lum 125, coastlines
 * ~lum 209 — so a luminance ramp separates the three cleanly.
 *
 * Output (assets/img/):
 *   planet-color.jpg   2048x1024, re-tinted, no alpha needed
 *   planet-clouds.jpg  1024x512 GREYSCALE — used as an ALPHA mask in the
 *                      shader, so no alpha channel has to be shipped
 *
 * Run: NODE_PATH=<a project with sharp>/node_modules node _build/planet-textures.js
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'img');
fs.mkdirSync(OUT, { recursive: true });

const hex = h => [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];

/* The ramp. Stops are [luminance 0..1, colour]. Everything here is a warm
   neutral except the top stop, which is the brand accent doing what the cyan
   did in the source: glowing along the coastlines. */
const RAMP = (process.env.RAMP ? JSON.parse(process.env.RAMP) : [
  [0.00, '0d0c0b'],   // ocean — near-black, a touch warm so it is not a hole
  [0.18, '1a1714'],
  [0.42, '463c31'],   // continental interior
  [0.62, '6d5b46'],
  [0.82, 'a8804a'],   // shelf
  [1.00, 'f0a24c'],   // coastline glow — a lighter tint of --accent #f08a24
]).map(([t, h]) => [t, typeof h === 'string' ? hex(h) : h]);

function ramp(t) {
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  for (let i = 1; i < RAMP.length; i++) {
    if (t <= RAMP[i][0]) {
      const [t0, c0] = RAMP[i-1], [t1, c1] = RAMP[i];
      const k = (t - t0) / (t1 - t0 || 1);
      return [0,1,2].map(c => Math.round(c0[c] + (c1[c] - c0[c]) * k));
    }
  }
  return RAMP[RAMP.length-1][1];
}

// precompute a 256-entry LUT
const LUT = Array.from({length: 256}, (_, i) => ramp(i / 255));

(async () => {
  /* ---- planet colour ---- */
  const W = 2048, H = 1024;
  const { data, info } = await sharp(path.join(ROOT, 'hologram-gezegen/textures/Planet_Color.png'))
    .resize(W, H, { fit: 'fill', kernel: 'lanczos3' })
    .removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(W * H * 3);
  for (let i = 0; i < W * H; i++) {
    const r = data[i*3], g = data[i*3+1], b = data[i*3+2];
    const l = Math.round(0.2126*r + 0.7152*g + 0.0722*b);
    const c = LUT[l];
    out[i*3] = c[0]; out[i*3+1] = c[1]; out[i*3+2] = c[2];
  }
  const suffix = process.env.SUF || '';
  const colorFile = path.join(OUT, `planet-color${suffix}.jpg`);
  await sharp(out, { raw: { width: W, height: H, channels: 3 } })
    .jpeg({ quality: 86, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toFile(colorFile);

  /* ---- clouds, as a greyscale alpha mask ---- */
  const cloudFile = path.join(OUT, `planet-clouds${suffix}.jpg`);
  await sharp(path.join(ROOT, 'hologram-gezegen/textures/Clouds_Color.png'))
    .resize(1024, 512, { fit: 'fill', kernel: 'lanczos3' })
    .removeAlpha().greyscale()
    // the source clouds sit at mean lum 86 with the swirls brighter; lift the
    // gamma so only the actual cloud bodies survive as alpha, not the haze
    .linear(1.35, -34)
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(cloudFile);

  for (const f of [colorFile, cloudFile]) {
    console.log(path.basename(f), (fs.statSync(f).size / 1024).toFixed(1) + ' KB');
  }
})();
