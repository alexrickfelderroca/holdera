/* HOLDERA — escribe en disco lo que pinto _build/service-art.html.
 *
 * Uso:
 *   1. node _build/serve.js 4177
 *   2. abrir http://localhost:4177/_build/service-art.html en Chrome y ejecutar
 *      `await window.renderAll(0.74)`  -> devuelve [{file, data}]
 *   3. guardar ese JSON en un archivo y:  node _build/service-art.js <archivo.json>
 *
 * Se hace en dos pasos a proposito: el arte se pinta en un canvas de verdad,
 * asi que hay que mirarlo antes de escribirlo. Sin navegador no hay imagen.
 */
const fs = require('fs');
const path = require('path');

const src = process.argv[2];
if (!src) {
  console.error('uso: node _build/service-art.js <salida-de-renderAll.json>');
  process.exit(1);
}
const OUT = path.resolve(__dirname, '..', 'assets', 'img', 'servicios');
fs.mkdirSync(OUT, { recursive: true });

const raw = JSON.parse(fs.readFileSync(src, 'utf8'));
const list = Array.isArray(raw) ? raw : (raw.result || raw.value || raw.output);
if (!Array.isArray(list)) {
  console.error('no reconozco el JSON; claves:', Object.keys(raw));
  process.exit(1);
}

let total = 0;
for (const item of list) {
  const b64 = String(item.data).split(',')[1];
  const buf = Buffer.from(b64, 'base64');
  fs.writeFileSync(path.join(OUT, item.file), buf);
  total += buf.length;
  console.log(String(Math.round(buf.length / 1024)).padStart(5) + ' KB  ' + item.file);
}
console.log('---');
console.log(list.length + ' archivos, ' + Math.round(total / 1024) + ' KB en total -> assets/img/servicios/');
