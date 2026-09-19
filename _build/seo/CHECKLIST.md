# SEO — lo que queda en manos de Alex

Lo automático ya está: cabeceras (`_build/seo-inject.js`), JSON-LD, `sitemap.xml`, `robots.txt`, iconos, manifest y tarjeta social. Esta lista es lo que **no** se puede hacer sin ti o sin un dato real.

> **Pivote (19-09-2026).** La web deja de vender automatización con IA y pasa a vender **un producto: software de operaciones para hoteles**. Toda la capa SEO está reescrita en ese sentido. Lo que hay debajo está puesto al día con ese cambio: si una casilla sigue sin marcar, es porque de verdad no está hecha.

## 0. Qué cambió con el pivote (hecho, no hay nada que hacer)

- [x] `meta.json`: `shared.organization` (descripción, eslogan y los 11 `knowsAbout`), `shared.website` y los títulos/descripciones de las 7 páginas, en la voz del producto.
- [x] **Fuera los cinco nodos `Service`** de la home (`#servicio-asesorias` … `#servicio-ia`). Describían servicios de agencia y sus `@id` apuntaban a anclas que la página ya no tiene. En su lugar, **un solo `SoftwareApplication`** (`@id` `#software`) con `applicationCategory: BusinessApplication`, `operatingSystem: Web` y un `featureList` con las cinco pantallas: Hoy, Habitaciones, Housekeeping, Revenue y reservas, Trazabilidad.
- [x] `validate-meta.js`: la regla «la home debe llevar 5 Service» **se trasladó**, no se relajó. Ahora exige exactamente UN `SoftwareApplication`, con `provider` = la organización y un `featureList` de cinco entradas, y **falla** si reaparece cualquier nodo `Service`.
- [x] `site.webmanifest`: la descripción es la del producto.
- [x] Tarjeta social `assets/seo/og-default.png` regenerada desde `og-default.html`: decía «Sistemas con IA que ahorran tiempo y reducen costes». Ahora dice «Todo tu hotel en una pantalla, y cada cifra con su origen».
- [x] Las anclas vivas de la home son `#producto`, `#producto-hoy`, `#producto-habitaciones`, `#producto-housekeeping`, `#producto-revenue`, `#producto-trazabilidad` y `#como-trabajamos`. **No cambiarlas** sin cambiar `meta.json` a la vez.

## 1. Dominio y despliegue

- [x] **Dominio confirmado: `https://holdera.es`** (09-09-2026), en vivo, servido por Hostinger desde el repo de GitHub. `holdera.com` **no es de Alex**: si vuelve a aparecer en algún sitio, es un error. Vive en UN sitio: la constante `SITE` de `_build/seo-inject.js`.
- [x] Repo público `alexrickfelderroca/holdera`, rama `main`, despliegue automático en cada push. `.nojekyll` en la raíz.
- [x] `.htaccess` en el repo (404, sin listados, deniega `_build/` y los `.md`, `www` → sin www, caché). **Nunca crearlo a mano desde el gestor de archivos de hPanel**: el `git pull` del despliegue aborta y el sitio se queda congelado sin avisar.
- [x] `Redirect 301 /panel.html /panel/`: esa URL estuvo indexada y en el sitemap diez días.
- [ ] **Después de este pivote, ejecutar en este orden** (y antes de publicar):
  1. `node _build/seo/validate-meta.js`
  2. `node _build/seo-inject.js` — reescribe el bloque `<!-- seo:head -->` de las 7 páginas
  3. `node _build/seo/build-sitemap.js` — `sitemap.xml` + `robots.txt` (el `lastmod` del sitio pasó a `2026-09-19`)
  4. `node _build/check-tokens.js` · `node _build/contrast.js` · `node _build/check-shell.js`
  5. `node _build/version-assets.js` — **imprescindible** tras cualquier cambio de css o js: sin él el CDN sirve el CSS viejo con el HTML nuevo durante siete días
- [ ] **Purgar la caché del CDN** («Borrar caché» en el panel del sitio) y verificar con `?nocache=1`: el CDN de Hostinger (`Server: hcdn`) sirve la copia rancia en la URL canónica.
- [ ] `node _build/seo/build-og.js` **no funciona hoy en esta máquina**: Chrome no escribe el `--screenshot` (el proceso sale sin error y sin archivo) y `sharp` ya no está donde decía `HOLDERA_SHARP_PATH`. La tarjeta actual se generó capturando `og-default.html` con el MCP de Chrome DevTools y aplicando la misma cuantización de `build-og.js` (paleta de 256, dither 1.0, 1200×630, 55,7 KB). Si hace falta regenerarla: `HOLDERA_SHARP_PATH` puede apuntar a `holdera-product-hotel-operations-v1/holdera-product-hotel-operations-v1/node_modules`, que sí tiene `sharp`; el que hay que arreglar es el render.

## 2. Google

- [ ] **Search Console**: verificar el dominio (registro TXT en DNS, cubre www y sin www) y **enviar `https://holdera.es/sitemap.xml`**. Sigue sin hacerse.
- [ ] Pedir **indexación manual** de la home y de `/panel/` el día que se publique el pivote. Los títulos y descripciones de las 7 páginas han cambiado enteros: hasta que Google los vuelva a rastrear, en los resultados seguirá apareciendo la web de la agencia.
- [ ] **Google Business Profile**: crear la ficha. Categoría acorde al producto («Empresa de software» / «Proveedor de software»), zona de cobertura Barcelona, sin dirección pública si no hay local abierto. Mismo nombre y misma web que aquí.
- [ ] Probar cada página en la **prueba de resultados enriquecidos** (search.google.com/test/rich-results) y en el validador de schema.org una vez publicada. Mirar en concreto que el `SoftwareApplication` se reconozca y que **no** salga ningún aviso de valoración o precio ausente: no los lleva a propósito.
- [ ] Comprobar las tarjetas sociales en los depuradores de Facebook/LinkedIn y en la vista previa de X **con cache-buster**: los tres cachean la og:image vieja y seguirán enseñando la tarjeta de la agencia.

## 3. Datos reales → luego se añaden al JSON-LD

- [ ] **Contacto real** (email, teléfono, WhatsApp, Instagram, LinkedIn). Hoy son marcadores visibles `[… por confirmar]` en `<span>` **sin `href`** en las 7 páginas (`node _build/check-placeholders.js` los lista). Cuando haya datos: sustituir texto **y** añadir `contactPoint` + `sameAs` a `shared.organization` en `meta.json` (hay una nota con el formato). Hasta entonces el JSON-LD no lleva contacto a propósito.
- [ ] **El formulario de contacto sigue sin backend.** Es lo que más cuesta cada día que pasa: la web está publicada y no hay ninguna vía de contacto operativa.
- [ ] **Reseñas reales de hoteles** (con la cifra y el número reales). Solo entonces: sección de testimonios y `aggregateRating` en el JSON-LD. Nunca antes — el validador rechaza `aggregateRating`, `review` y `offers`, y está probado que los rechaza.
- [ ] **Precio / planes.** Si algún día se publican, van en la web **y** como `offers` del `SoftwareApplication`. Un precio en datos estructurados es una oferta: no se pone «de ejemplo».
- [ ] **Razón social, NIF y domicilio** en `aviso-legal.html` y `privacidad.html` (LSSI art. 10, RGPD art. 13). Las dos páginas están en el sitemap con prioridad 0.3.
- [ ] **Número de hoteles, años en producción, clientes.** No hay ninguna cifra de esas en la web ni en el JSON-LD, y no se inventa. Lo único confirmado y publicable: **más de 5 años de experiencia** y **sede en Barcelona**.

## 4. Contenido y palabras clave (3–5 por página)

La regla: una intención por página, la palabra clave principal en el `<title>`, en el `<h1>` y en el primer párrafo; las secundarias en los `<h2>`.

| Página | Principal | Secundarias |
|---|---|---|
| `index.html` | software de operaciones para hoteles | panel de operaciones hotelero · ocupación ADR RevPAR TRevPAR · trazabilidad de datos de hotel · housekeeping y estado de habitaciones |
| `nosotros.html` | producto de operaciones hoteleras Barcelona | software hotelero hecho en España · una cifra fiable vale más que diez plausibles |
| `partners.html` | export de PMS para hotel | qué datos exporta un PMS · ocupación diaria y reservas por noche · sin conexión en vivo |
| `contacto.html` | demo software operaciones hotel | qué puede enseñar tu PMS · software para hotel independiente Barcelona |
| `aviso-legal.html` / `privacidad.html` | (sin objetivo de tráfico) | — |

- [ ] **Un solo `<h1>` por página**, con la principal. `/panel/` es salida del producto capturada en estático: su `<h1>` lo escribe el producto, no `seo-inject`.
- [ ] **Vocabulario, y es SEO además de honestidad.** Se dice «export del PMS», «lo que tu PMS ya exporta», «Vacant Clean (VC)», «Vacant Dirty (VD)», «fuera de orden (OOO)», «pickup», «pace», «STLY». **Nunca** «tiempo real», «en vivo», «sincronización automática» ni «conectado a tu PMS»: no hay conexión en vivo. **Nunca** IA, machine learning, modelos, asistente, predicción ni forecast: el producto no lleva nada de eso y hay una prueba en su repo que lo verifica.
- [ ] **Nunca nombrar un PMS, una OTA ni un channel manager concreto.** Nombrarlo afirma una integración que no existe. Se habla por categoría: «tu PMS», «tu channel manager».
- [ ] **TRevPAR se explica entero cada vez que aparece**: ingreso TOTAL del hotel por habitación disponible — alojamiento + restauración + spa + otros servicios. Es la cifra que más herramientas calculan mal y es un argumento de venta, no una nota al pie.
- [ ] **El panel demo se presenta siempre como lo que es**: hotel **ficticio** de 100 habitaciones, 5 plantas y 60 días de histórico, congelado el **jueves 15 de enero de 2026 a las 14:30**. Nunca «tu hotel». Es público y no pide registro: eso sí se puede decir, y vende.
- [ ] Si algún día cada pantalla del producto merece su propia página (`producto/revenue.html`, etc.), añadirla a `meta.json` y volver a ejecutar sitemap + inject.

## 5. Imágenes

- [ ] **`alt` real en cada captura real** del producto que se añada: describe lo que se ve («Calendario de reservas de enero con el pickup de los últimos siete días»), nunca «imagen1.jpg». Las decorativas siguen con `alt=""`.
- [ ] **Las fotos del escaparate son de banco (Pexels)** y ya no ilustran servicios de agencia. Si acaban siendo capturas reales del producto, cambia el `data-bg` en `index.html` y su entrada en `assets/img/servicios/CREDITS.json`.
- [ ] La tarjeta social (`assets/seo/og-default.png`) se regenera desde `_build/seo/og-default.html` si cambia el titular. Necesita red (Geist se carga de Google Fonts) y hoy el renderizado de `build-og.js` está roto: ver el punto de la sección 1.

## 6. Enlazado interno

- [x] Nav y pie enlazan las 7 páginas; la nav ya no tiene submenú de servicios. La home enlaza las cinco pantallas del producto por ancla (`#producto-hoy` … `#producto-trazabilidad`).
- [ ] Desde `nosotros.html`, un enlace en el texto a `contacto.html` y **a `/panel/`**. Desde `partners.html`, un enlace a `index.html#producto-trazabilidad`.
- [ ] **Anchor text descriptivo**: «abrir el panel demo del hotel de ejemplo», nunca «clic aquí». `/panel/` es la mejor página de aterrizaje que hay: es el producto entero, funcionando, sin registro.
- [ ] Las páginas legales se enlazan solo desde el pie y desde el formulario (ya previsto).
- [ ] Rutas: hoy todo enlaza con extensión (`nosotros.html`) y las canónicas van igual. Si se quieren URLs limpias, hay que cambiar **a la vez** todos los enlaces, `meta.json` (`path`) y regenerar, o habrá contenido duplicado.

## 7. Rendimiento y accesibilidad (afectan al posicionamiento)

- [x] Lighthouse móvil en `https://holdera.es`: **100/100/100/100** con 0 fallos (paso 8, 10-09-2026), también en contacto y nosotros.
- [ ] **Volver a medirlo después del pivote**: han cambiado los cuerpos de las 7 páginas y el panel demo entero. El objetivo no baja de ahí.
- [ ] `prefers-reduced-motion` verificado en cada página que cambie.
- [ ] Sin scroll horizontal a 390×844 y 360×640, 0 anclas sin `href`, 0 inputs por debajo de 16px (Safari hace zoom y no vuelve solo).
- [ ] El defecto pendiente del borde de los botones sobre tinta (`.btn--on-dark.btn--secondary`, 1,59:1) sigue documentado en `CLAUDE.md`: decisión tuya, arreglo de una línea.
