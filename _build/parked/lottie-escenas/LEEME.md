# Las cinco escenas Lottie del recorrido — APARCADAS

Son las escenas `product-1..5.json` que iban dentro de la tarjeta de cada
departamento en el original. Estan aqui y NO en `assets/anim/lottie/` por dos
motivos, y el segundo es el que manda:

1. `#ha-recorrido` viene con `data-ha-scenes="off"`, asi que la pagina no las
   pide nunca. En `assets/` serian 1,1 MB muertos.
2. `.htaccess` solo devuelve 403 para `/_build/`. En `assets/` cualquiera
   podria abrir `https://holdera.es/assets/anim/lottie/product-5.json` y leer
   dentro: estan en INGLES, el chat de `product-1` lo firma «Lance Agent»
   —nombre de producto de otra empresa— y `product-5` ensena cifras
   INVENTADAS en dolares. Publicar eso contradice la tesis del producto
   (ninguna cifra sin su origen) y la regla de no inventar datos.

La inversion por CSS SI funciona sobre ellas: se verifico con capturas a
escala 1,5 y se leen perfectamente. El problema es el contenido, no la tecnica.

## Para encenderlas

1. Sustituir o traducir la obra (quitar «Lance Agent» y las cifras en dolares).
2. `cp _build/parked/lottie-escenas/*.json assets/anim/lottie/`
3. En `index.html`, `data-ha-scenes="off"` -> `"on"`.
4. `node _build/version-assets.js`

`assets/anim/js/lottie.min.js` (52 KB br) sigue en su sitio: lo pide el JS
solo si las escenas estan encendidas.
