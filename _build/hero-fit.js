/* HOLDERA — comprobacion de encaje de la columna izquierda del hero.
 *
 * Por que existe: el hero se habia verificado SOLO a 1440x900, y a esa altura
 * el copy y la lista de servicios se libraban por 31px. Por debajo de ~870px de
 * alto se solapaban, y la lista (z-index 4) se comia los clics de los DOS
 * botones del hero. El fallo no se ve en la captura de referencia — es
 * exactamente la misma trampa que el `fov` fijo del cerebro.
 *
 * Esto se pega en la consola de Chrome (o se ejecuta con evaluate_script) y
 * mide, en cada viewport de la lista:
 *   1. que el copy y la lista NO se crucen,
 *   2. que la lista no invada la barra inferior,
 *   3. que elementFromPoint sobre los dos botones devuelva los botones.
 *
 * No se puede cambiar el viewport desde la propia pagina, asi que el bucle por
 * tamanos lo conduce quien llama (emulate + recarga entre medias). La funcion
 * mide UN viewport y devuelve el veredicto.
 */
window.heroFit = function () {
  const box = s => {
    const e = document.querySelector(s);
    if (!e) return null;
    const b = e.getBoundingClientRect();
    return { t: Math.round(b.top), b: Math.round(b.bottom), l: Math.round(b.left), r: Math.round(b.right) };
  };
  const probe = s => {
    const e = document.querySelector(s);
    if (!e) return ['missing'];
    const b = e.getBoundingClientRect();
    return [0.1, 0.3, 0.5, 0.7, 0.9].map(f => {
      const el = document.elementFromPoint(b.left + b.width * f, b.top + b.height / 2);
      return el ? el.closest('a,button') === e || e.contains(el) : false;
    });
  };

  const copy = box('.hero__copy');
  const works = box('[data-works]');
  const bar = box('.hero__bar');
  if (!copy || !works || !bar) return { skipped: 'mobile layout or missing nodes' };

  const gapCopyToWorks = works.t - copy.b;
  const gapWorksToBar = bar.t - works.b;
  const primary = probe('.hero__actions .btn--primary');
  const secondary = probe('.hero__actions .btn--secondary');
  const ctaClickable = primary.every(Boolean) && secondary.every(Boolean);

  return {
    viewport: innerWidth + 'x' + innerHeight,
    copy, works, bar,
    gapCopyToWorks,
    gapWorksToBar,
    ctaClickable,
    pass: gapCopyToWorks >= 0 && gapWorksToBar >= 0 && ctaClickable,
  };
};
