# Listas de rutas para `_build/shoot.js`

Cada archivo es la lista de pantallas de una verificación, para poder repetirla
igual meses después en vez de reconstruirla de memoria.

- `panel.json` — las 18 pantallas del panel publicado, tal como se sirven en
  `/panel/…`. Es la lista de la línea base del paso 11.
- `final.json` — la misma lista, con las rutas del snapshot estático
  (`businessdate-…`, `layer-housekeeping`) en vez de las del servidor de
  desarrollo. Es la que se usa contra `http://localhost:4177`.
- `dev-all.json` — la misma lista contra `next dev` en la raíz
  (`http://localhost:3000`, sin `basePath`), para iterar sin reconstruir.

Uso:

    node _build/serve.js 4177 &
    node _build/shoot.js --routes _build/shots/final.json --out .screenshots/lo-que-sea --vp 1440x900 --dark
    node _build/shoot.js --routes _build/shots/final.json --out .screenshots/a11y --no-full --eval-file _build/a11y-probe.js
