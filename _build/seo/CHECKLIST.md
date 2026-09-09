# SEO — lo que queda en manos de Alex

Lo automático ya está: cabeceras (`_build/seo-inject.js`), JSON-LD, `sitemap.xml`, `robots.txt`, iconos, manifest y tarjetas sociales. Esta lista es lo que **no** se puede hacer sin ti o sin un dato real.

## 1. Dominio y despliegue
- [ ] **Confirmar el dominio.** Hoy todo apunta a `https://holdera.com`. Vive en UN sitio: la constante `SITE` de `_build/seo-inject.js`. Si cambia: editar `SITE` y ejecutar `node _build/seo-inject.js` y `node _build/seo/build-sitemap.js`.
- [ ] **GitHub Pages**: repo público en la cuenta `alexrickfelderroca`, Pages desde `main` / raíz. `.nojekyll` ya está en la raíz (evita que Jekyll ignore carpetas que empiezan por `_`, como `_build/`).
- [ ] **CNAME**: crear el archivo `CNAME` en la raíz con el dominio (una línea, sin `https://`) y configurar en el DNS los 4 registros A de GitHub Pages para el apex + un CNAME `www → <usuario>.github.io`. Activar "Enforce HTTPS" en el repo.
- [ ] **Decidir www o sin www** y redirigir el otro (Pages lo hace solo si el CNAME lleva el elegido). Las canónicas asumen **sin www**.
- [ ] Los `.mp4` de referencia y `styles.css.bak` están en la raíz del proyecto: **no subirlos** al repo (añadirlos a `.gitignore` o sacarlos de la carpeta). `robots.txt` los bloquea por si acaso, pero lo limpio es que no viajen.
- [ ] Antes de publicar, ejecutar en este orden: `node _build/seo/build-og.js` → `node _build/seo/build-icons.js` → `node _build/seo/build-sitemap.js` → `node _build/seo-inject.js` → `node _build/contrast.js` y `node _build/check-tokens.js`.

## 2. Google
- [ ] **Search Console**: verificar el dominio (registro TXT en DNS, cubre www y sin www) y **enviar `https://holdera.com/sitemap.xml`**.
- [ ] Pedir indexación manual de la home y de `panel.html` el día del lanzamiento.
- [ ] **Google Business Profile**: crear la ficha (empresa de servicios con zona de cobertura Barcelona, sin dirección pública si no hay local abierto). Mismo nombre, misma categoría ("Consultora de informática" o "Agencia de marketing digital"), misma web. Sin ficha no hay pack local para "automatización con IA Barcelona".
- [ ] Probar cada página en la **prueba de resultados enriquecidos** (search.google.com/test/rich-results) y en el validador de schema.org una vez publicada.
- [ ] Comprobar las tarjetas sociales en los depuradores de Facebook/LinkedIn y en la vista previa de X, después de publicar (necesitan la URL en vivo).

## 3. Datos reales → luego se añaden al JSON-LD
- [ ] **Contacto real** (email, teléfono, WhatsApp, Instagram). Cuando esté: sustituir los `[por confirmar]` del footer **y** añadir `contactPoint` + `sameAs` a `shared.organization` en `_build/seo/meta.json` (hay una nota con el formato). Hasta entonces el JSON-LD no lleva contacto a propósito.
- [ ] **Reseñas reales de Google** (con la cifra y el número reales). Solo entonces: sección de testimonios en la web y `aggregateRating` en la Organization. Nunca antes.
- [ ] **Cifra "+30 empresas automatizadas"** del hero: confirmar o quitar. No está en ninguna cabecera ni en el JSON-LD.
- [ ] **Partners**: confirmar que los ocho (OpenAI, Anthropic, Google Cloud, Azure, n8n, Make, HubSpot, Zapier) son reales. Entonces se puede añadir un `ItemList` en el JSON-LD de `partners.html`.
- [ ] **Razón social, NIF y domicilio** en `aviso-legal.html` y `privacidad.html` (LSSI art. 10, RGPD art. 13). Las páginas ya están en el sitemap con prioridad 0.3.

## 4. Contenido y palabras clave (3–5 por página)
La regla: una intención por página, la palabra clave principal en el `<title>`, en el `<h1>` y en el primer párrafo; las secundarias en los `<h2>`.

| Página | Principal | Secundarias |
|---|---|---|
| `index.html` | automatización con IA Barcelona | automatizar procesos empresa · sistemas con inteligencia artificial para empresas · agencia inteligencia artificial Barcelona · reducir costes con IA |
| `nosotros.html` | estudio de automatización con IA Barcelona | consultoría IA pymes · integración de sistemas con IA · transformación digital Barcelona |
| `partners.html` | integración n8n Make Zapier | automatización con OpenAI · CRM HubSpot a medida · tecnologías de automatización |
| `contacto.html` | asesoría automatización IA Barcelona | presupuesto automatización procesos · consultoría digital pymes Barcelona |
| `panel.html` | panel de control con IA para empresas | dashboard a medida empresa · CRM a medida · demo panel IA |
| `aviso-legal.html` / `privacidad.html` | (sin objetivo de tráfico) | — |

- [ ] **Un solo `<h1>` por página**, con la principal. En `panel.html` el `<h1>` debería ser "Así podría ser tu panel" seguido de un `<h2>` con la palabra clave ("Un panel de control con IA para tu empresa").
- [ ] Cada slide de servicios de la home lleva su `id` (`servicio-asesorias` … `servicio-ia`): el JSON-LD ya enlaza `https://holdera.com/#servicio-…` y la nav también. **No cambiar esos ids** sin cambiar `meta.json`.
- [ ] Cuando decidas listar el resto de servicios (webs, CRM, SEO, Ads, ecommerce), cada uno merece su propia página: `servicios/crm-a-medida.html`, etc. Añadirlas a `meta.json` y volver a ejecutar sitemap + inject.

## 5. Imágenes
- [ ] **`alt` real en cada foto real** que añadas (equipo, oficina, capturas de proyectos): describe lo que se ve, con la palabra clave si es natural ("Equipo de Holdera revisando un flujo de n8n"), nunca "imagen1.jpg". Las imágenes decorativas siguen con `alt=""`.
- [ ] Si sustituyes la obra gráfica generada de los servicios por capturas reales, cambia solo el `data-bg` en `index.html` y pon el `alt` en el `<h3>` correspondiente (los fondos CSS no llevan alt).
- [ ] Las tarjetas sociales (`assets/seo/og-*.png`) se regeneran con `node _build/seo/build-og.js` si cambia el titular. Necesita conexión (Geist se carga de Google Fonts).

## 6. Enlazado interno
- [ ] Nav y footer ya enlazan las 7 páginas; la home enlaza los 5 servicios por ancla. Falta: desde `nosotros.html` un enlace en el texto a `contacto.html` y a `panel.html`; desde `panel.html` un CTA a `contacto.html`; desde `partners.html` un enlace a `index.html#servicio-ia`.
- [ ] Anchor text descriptivo ("ver la demo del panel", no "clic aquí").
- [ ] Las páginas legales se enlazan solo desde el footer y desde el formulario (ya previsto). No hace falta más.
- [ ] Rutas: hoy todo enlaza a `nosotros.html` (con extensión) y las canónicas van igual. Si quieres URLs limpias (`/nosotros`), hay que cambiar **a la vez** todos los enlaces, `meta.json` (`path`) y regenerar. GitHub Pages sirve las dos formas, así que si no se hace todo junto habrá contenido duplicado.

## 7. Rendimiento y accesibilidad (afectan al posicionamiento)
- [ ] Lighthouse en la home publicada (móvil): objetivo ≥ 90 en Rendimiento y 100 en Accesibilidad y SEO. Los WebGL (cerebro, peces, planeta) son el coste principal; están ya en diferido.
- [ ] `prefers-reduced-motion` verificado en cada página nueva.
- [ ] El defecto pendiente del borde de los botones sobre tinta (`.btn--on-dark.btn--secondary`, 1,59:1) está documentado en `CLAUDE.md`: decisión tuya.
