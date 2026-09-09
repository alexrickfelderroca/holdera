# Migraciones (histórico, NO volver a ejecutar)

Estos tres scripts son la migración de un solo uso que convirtió la hoja de
contenido de casi negra a casi blanca el 07-09-2026, junto con el resto del
paso 2 (drawer opaco, barra de cuatro chips, logotipos de partners, cerebro).

Se guardan porque el proyecto **no está en git**: son el único registro de qué
cambió exactamente y por qué. El estado "antes" está en `styles.css.bak`.

Se ejecutaron una vez, en orden, y **fallan a propósito si se repiten** (cada
sustitución lanza una excepción si no encuentra su texto). Para rehacerlas hay
que restaurar `styles.css.bak` primero.

- `patch-styles.js`   — tokens: `--dk-*` → `--sh-*` (y su nuevo valor claro),
                        `--on-ink-*`, `--accent-ink`, drawer opaco
- `patch-styles-2.js` — componentes: terminal y nodos que siguen en tinta,
                        capas alfa blancas → negras, barra de chips, partners,
                        el cerebro en lugar del robot
- `patch-styles-3.js` — retirada de los 7 tokens que la migración dejó huérfanos

## `patch-styles-4.js` — correcciones de la revisión (07-09-2026)

Cambios salidos de una revisión adversarial multiagente del paso 2 (25 hallazgos
confirmados de 48; 23 refutados). Solo se aplicaron los que sobrevivieron a un
verificador independiente, y donde el verificador corrigió el arreglo propuesto,
lo aplicado es la versión corregida — en tres casos el arreglo original era una
regresión (mover la nube en horizontal la habría estampado sobre el widget y los
logotipos; el bisel propuesto reproducía exactamente el fallo que diagnosticaba;
y cambiar la barra a flex habría roto la rejilla 2×2 del móvil).
