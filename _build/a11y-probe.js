/*
 * _build/a11y-probe.js — auditoría de contraste EN LA PÁGINA, no sobre píxeles.
 *
 * Se evalúa dentro del navegador (node _build/shoot.js --eval-file …) y devuelve
 * un informe por página. Mide lo que la trampa del proyecto exige: el color del
 * texto compuesto sobre SU PILA de fondos, no sobre el token que uno supone.
 *
 *   · el frente puede llevar alfa (todos los --label-* lo llevan);
 *   · el fondo casi nunca está en el propio elemento: hay que subir por los
 *     ancestros acumulando cada capa translúcida hasta encontrar una opaca;
 *   · color-mix() y las capas alfa NO se parsean a ojo: getComputedStyle ya
 *     devuelve rgb()/rgba() resueltos, que es justo lo que hace falta.
 *
 * El umbral es el de WCAG 2.1 AA: 4.5:1 para texto normal y 3:1 para texto
 * grande (>=24px, o >=18.66px en negrita). Los elementos deshabilitados
 * (aria-disabled) quedan exentos por 1.4.3, igual que en el resto del panel.
 */
(() => {
  const parse = (c) => {
    const m = String(c).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  const lin = (v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const lum = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const ratio = (a, b) => {
    const l1 = lum(a), l2 = lum(b);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  const hex = (c) =>
    '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

  // The background stack: walk up until an opaque layer closes it.
  function backdrop(el) {
    const layers = [];
    let n = el;
    while (n && n !== document.documentElement) {
      const cs = getComputedStyle(n);
      const bg = parse(cs.backgroundColor);
      if (bg && bg.a > 0) {
        layers.push(bg);
        if (bg.a >= 0.999) break;
      }
      // an image or gradient background: give up, this needs a pixel probe
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return { unknown: true, layers };
      n = n.parentElement;
    }
    const root = parse(getComputedStyle(document.documentElement).backgroundColor) || {
      r: 255, g: 255, b: 255, a: 1,
    };
    let base = root.a >= 0.999 ? root : { r: 255, g: 255, b: 255, a: 1 };
    for (let i = layers.length - 1; i >= 0; i--) base = over(layers[i], base);
    return { color: base };
  }

  const fails = [];
  const seen = new Set();
  let checked = 0;

  document.querySelectorAll('body *').forEach((el) => {
    // only elements whose own text node is visible
    let text = '';
    for (const n of el.childNodes) if (n.nodeType === 3) text += n.nodeValue;
    text = text.trim();
    if (!text) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.15) return;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return;
    if (el.closest('[aria-disabled="true"]')) return;
    if (el.closest('.visually-hidden, .sr-only')) return;
    // the hotel scene is a drawing, not text on a surface
    if (el.closest('.hs, svg')) return;

    const fg = parse(cs.color);
    if (!fg) return;
    const bd = backdrop(el);
    if (bd.unknown || !bd.color) return;
    const front = fg.a >= 0.999 ? fg : over(fg, bd.color);
    const cr = ratio(front, bd.color);
    checked++;

    const size = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5;
    if (cr + 0.005 < need) {
      const key = el.className + '|' + Math.round(size) + '|' + hex(front) + '|' + hex(bd.color);
      if (seen.has(key)) return;
      seen.add(key);
      fails.push({
        sel:
          el.tagName.toLowerCase() +
          (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''),
        text: text.slice(0, 34),
        size: Math.round(size * 10) / 10,
        weight,
        fg: hex(front),
        bg: hex(bd.color),
        ratio: Math.round(cr * 100) / 100,
        need,
      });
    }
  });

  // Non-text: the boundary of a control that only its outline identifies.
  const controlFails = [];
  document.querySelectorAll('.segmented, .rv-seg, .day-nav, .bkx-months, input, select, textarea').forEach((el) => {
    const cs = getComputedStyle(el);
    const bw = parseFloat(cs.borderTopWidth);
    if (!bw) return;
    const bc = parse(cs.borderTopColor);
    const bd = backdrop(el);
    if (!bc || !bd.color) return;
    const edge = bc.a >= 0.999 ? bc : over(bc, bd.color);
    const cr = ratio(edge, bd.color);
    if (cr < 3) controlFails.push({ sel: el.className.slice(0, 30), ratio: Math.round(cr * 100) / 100 });
  });

  return { url: location.pathname, checked, failCount: fails.length, fails: fails.slice(0, 14), controlFails };
})();
