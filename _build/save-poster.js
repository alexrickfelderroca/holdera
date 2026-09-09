/* Decodes the data URL captured from _build/brain-poster.html into
   assets/img/brain-poster.png — the fallback image for browsers without WebGL
   and for no-JS.

   How the capture works (it needs a browser, so it is a two-step job):
     1. serve the project:  node _build/serve.js 4177
     2. open http://localhost:4177/_build/brain-poster.html, wait ~2.5 s for the
        cloud to finish assembling, and evaluate:
            document.querySelector('.brain__canvas').toDataURL('image/png')
        saving the result as {"dataUrl": "..."} to a JSON file
     3. node _build/save-poster.js <that file>

   The poster page pre-claims the WebGL context with preserveDrawingBuffer, so
   the readback is not empty; production brain.js never sets that flag. */
const fs = require('fs');
const path = require('path');

const src = process.argv[2];
if (!src) {
  console.error('usage: node _build/save-poster.js <capture.json>');
  process.exit(1);
}

const payload = JSON.parse(fs.readFileSync(src, 'utf8'));
const url = payload.dataUrl || payload.result || payload;
if (typeof url !== 'string' || url.indexOf('data:image/png;base64,') !== 0) {
  throw new Error('no PNG data URL in ' + src);
}

const png = Buffer.from(url.slice('data:image/png;base64,'.length), 'base64');
const sig = png.slice(0, 8).toString('hex');
if (sig !== '89504e470d0a1a0a') throw new Error('not a PNG (signature ' + sig + ')');
console.log(`captured ${png.readUInt32BE(16)}x${png.readUInt32BE(20)}, ${(png.length / 1024).toFixed(1)} KB raw`);

const out = path.join(__dirname, '..', 'assets', 'img', 'brain-poster.png');
fs.mkdirSync(path.dirname(out), { recursive: true });

/* 1024px RGBA lands at ~368 KB. The cloud is only ink, burnt orange and greys,
   so a 768px palette PNG holds up visually at a tenth of that. sharp is not a
   dependency of this project — borrow it from a project that has it:
     NODE_PATH=<ruta a un node_modules con sharp> node _build/save-poster.js ...
   Without sharp the raw capture is written instead, just larger. */
let sharp = null;
try { sharp = require('sharp'); } catch (e) { /* optional */ }

if (!sharp) {
  fs.writeFileSync(out, png);
  console.log(`wrote ${out} unoptimised (sharp not on NODE_PATH), ${(png.length / 1024).toFixed(1)} KB`);
} else {
  sharp(png)
    .resize(768, 768, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ palette: true, colors: 128, compressionLevel: 9, effort: 10 })
    .toBuffer()
    .then(buf => {
      fs.writeFileSync(out, buf);
      console.log(`wrote ${out}\n  768x768 palette PNG, ${(buf.length / 1024).toFixed(1)} KB`);
    })
    .catch(err => { console.error('sharp failed:', err.message); process.exit(1); });
}
