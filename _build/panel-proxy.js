/**
 * panel-proxy.js — el puente que hace posible capturar el producto con basePath.
 *
 * El problema, medido:
 *
 *   - SIN basePath, el producto se sirve en `/` y se captura bien, pero al
 *     montarlo en `/panel/` el cliente de Next deriva su ruta de
 *     `location.pathname`, no la reconoce y **no hidrata**: el boton «Trace»
 *     —la pieza que demuestra la trazabilidad— se queda muerto.
 *   - CON basePath, hidrata, pero las paginas (Server Components) leen sus
 *     datos llamandose a si mismas por HTTP a `/api/...` (ver
 *     `app/lib/internalApi.ts` y DECISIONS.md en el producto). Con basePath esa
 *     ruta vive en `/panel/api/...`, la llamada da 404 y la pagina se renderiza
 *     vacia: 17 KB en vez de 420 KB.
 *
 * En vez de tocar el codigo del producto, este proxy se pone delante: reenvia
 * `/api/...` a `/panel/api/...` y lo demas tal cual. Como la app construye la
 * URL interna con la cabecera `Host` de la peticion, al capturar a traves del
 * proxy se llama a si misma A TRAVES DEL PROXY, y encuentra su API.
 *
 * Uso:
 *   HOLDERA_BASE_PATH=/panel HOLDERA_RUNTIME=demo npx next start   # :3000
 *   node _build/panel-proxy.js 3001 3000 /panel                    # :3001
 *   HOLDERA_PRODUCT_ORIGIN=http://localhost:3001 \
 *     node _build/snapshot-panel.js --src-base /panel --mount /panel/
 */

const http = require('http');

const PORT = Number(process.argv[2]) || 3001;
const TARGET_PORT = Number(process.argv[3]) || 3000;

/**
 * Git Bash en Windows convierte un argumento que empieza por '/' en una ruta de
 * disco ('C:/Program Files/Git/panel'). Se deshace para que el mismo comando
 * valga en bash, PowerShell y cmd.
 */
function normalizeBase(raw) {
  let v = String(raw || '/panel').trim();
  const msys = v.match(/^[A-Za-z]:[\\/](?:Program Files[\\/])?Git[\\/](.*)$/);
  if (msys) v = msys[1];
  v = v.replace(/\\/g, '/').replace(/\/+$/, '');
  if (!v) return '';
  return v.startsWith('/') ? v : '/' + v;
}

const BASE = normalizeBase(process.argv[4]);

const server = http.createServer((req, res) => {
  // La llamada que la app se hace a si misma llega sin prefijo: se le pone.
  const needsBase = req.url.startsWith('/api/') || req.url === '/api';
  const target = needsBase ? BASE + req.url : req.url;

  const proxied = http.request(
    {
      host: '127.0.0.1',
      port: TARGET_PORT,
      method: req.method,
      path: target,
      headers: { ...req.headers, host: `127.0.0.1:${PORT}` },
    },
    (upstream) => {
      res.writeHead(upstream.statusCode || 502, upstream.headers);
      upstream.pipe(res);
    }
  );

  proxied.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('proxy error: ' + err.message);
  });

  req.pipe(proxied);
});

server.listen(PORT, () => {
  console.log(`panel-proxy  :${PORT} -> :${TARGET_PORT}   /api/* -> ${BASE}/api/*`);
});
