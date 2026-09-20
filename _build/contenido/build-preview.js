#!/usr/bin/env node
/* ==========================================================================
   Monta _build/contenido/preview-bloques.html con los tres bloques nuevos sobre la hoja
   oscura del sitio, para poder verlos y medirlos ANTES de que el orquestador
   los pegue en index.html.

   No es una página del sitio: no entra en el sitemap, no lleva cabecera ni
   pie, y el .htaccess ya deniega _build/ en producción.

   Dos cosas que hace y que, si faltan, hacen que la captura MIENTA:
     · pone .has-js y marca los .reveal como .is-in. En el sitio eso lo hace
       script.js; aquí no se carga (arrastra el hero, el cerebro y el deck).
       Sin esto, todo el bloque se queda a opacity 0 y la captura sale vacía
       con el hueco reservado — pasó en la primera pasada.
     · sella css y js con ?v=<ms>. Chrome cachea y una medición sobre el CSS
       viejo es peor que no medir.

   Uso:  node _build/contenido/build-preview.js
         node _build/shoot.js --url http://localhost:4177/_build/contenido/preview-bloques.html ...
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const PARTS = path.join(DIR, '..', 'parts');
const leer = (f) => fs.readFileSync(path.join(PARTS, f), 'utf8');
const v = Date.now();

const html = `<!doctype html>
<html lang="es" data-preview>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Previsualización de los bloques nuevos · Holdera</title>
<link rel="stylesheet" href="/styles.css?v=${v}">
<link rel="stylesheet" href="/_build/parts/features.css?v=${v}">
<link rel="stylesheet" href="/_build/parts/opera.css?v=${v}">
<link rel="stylesheet" href="/_build/parts/faq.css?v=${v}">
<style>
  /* Solo para esta página de prueba: en el sitio, main es la hoja que se
     desliza sobre el hero, y aquí no hay hero debajo del que salir. */
  html[data-preview] main { margin-top: 0; border-radius: 0; box-shadow: none; }
  html[data-preview] body { background: var(--sh-bg); }
</style>
<script>
  document.documentElement.classList.add('has-js');
  addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('is-in'); });
  });
</script>
<script src="/_build/parts/features.js?v=${v}" defer></script>
</head>
<body>
<main>
${leer('features.html')}

${leer('opera.html')}

${leer('faq.html')}
</main>
</body>
</html>
`;

fs.writeFileSync(path.join(DIR, 'preview-bloques.html'), html, 'utf8');
console.log('preview-bloques.html montado — http://localhost:4177/_build/contenido/preview-bloques.html  (v=' + v + ')');
