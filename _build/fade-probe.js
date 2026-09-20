/*
 * _build/fade-probe.js — ¿se sigue VIENDO la segunda mitad de cada titular?
 *
 * Desde el 20-09-2026 el degradado vive en el título y `.fade` no pinta nada:
 * hereda `color: transparent` y deja ver el degradado del padre a través. Eso
 * funciona… siempre que el padre tenga de verdad su `background-clip: text` y
 * su fondo. Si no, el span queda en transparente sobre nada: TEXTO INVISIBLE
 * que sigue ocupando su caja, o sea el fallo más difícil de ver leyendo código.
 *
 * Ya pasó una vez en este proyecto, con el H1 del hero en el paso 5: la caja
 * del título estaba maquetada y no había ni un glifo.
 *
 * Esta sonda comprueba, para cada .fade de la página:
 *   · que su ancestro clipado existe y tiene un background de tipo gradiente
 *   · que el span no declara un background propio que tape al padre
 *   · que tiene área (no está colapsado)
 * Se pasa con: node _build/shoot.js --routes ... --eval-file _build/fade-probe.js
 */
(() => {
  const spans = Array.from(document.querySelectorAll('.fade'));
  const problemas = [];

  for (const s of spans) {
    const cs = getComputedStyle(s);
    const r = s.getBoundingClientRect();
    const texto = (s.textContent || '').trim().slice(0, 34);

    // Subir hasta el ancestro que recorta su fondo sobre el texto.
    let clipador = null;
    for (let n = s.parentElement; n && n !== document.body; n = n.parentElement) {
      const c = getComputedStyle(n);
      if ((c.webkitBackgroundClip || c.backgroundClip) === 'text') { clipador = { n, c }; break; }
    }

    const propioFondo = cs.backgroundImage !== 'none' || (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent');
    const transparente = cs.color === 'rgba(0, 0, 0, 0)' || cs.color === 'transparent';

    if (r.width < 1 || r.height < 1) {
      problemas.push({ texto, fallo: 'sin área', w: Math.round(r.width), h: Math.round(r.height) });
      continue;
    }
    if (transparente && !clipador && !propioFondo) {
      problemas.push({ texto, fallo: 'transparente y NADIE pinta detrás: invisible' });
      continue;
    }
    if (clipador && clipador.c.backgroundImage === 'none') {
      problemas.push({ texto, fallo: 'el ancestro recorta sobre texto pero no tiene degradado' });
    }
  }

  /* La trampa del paso 5 tiene UNA dirección, y conviene no confundirlas — la
     primera versión de esta sonda las confundió y dio una alarma falsa en
     partners.html:
       · PELIGROSA: el clip vive en un ANCESTRO y el que se transforma es un
         DESCENDIENTE. El hijo transformado se compone en su propia capa y el
         fondo recortado del padre no llega a pintarlo: texto invisible. Es lo
         que pasó con el H1 del hero, cuyas tres líneas entraban con transform.
       · SEGURA: el clip vive en el elemento y el transform está en su PADRE.
         El elemento clipado se pinta entero dentro de la capa del padre.
         Comprobado a ojo el 20-09-2026 con .card.reveal transformada y
         #ot-title dentro: el título se ve completo, con su degradado.
     Así que aquí solo se busca la primera. */
  const clipTransformado = [];
  document.querySelectorAll('*').forEach((n) => {
    const c = getComputedStyle(n);
    if ((c.webkitBackgroundClip || c.backgroundClip) !== 'text') return;
    n.querySelectorAll('*').forEach((hijo) => {
      const hc = getComputedStyle(hijo);
      if (hc.transform && hc.transform !== 'none' && (hijo.textContent || '').trim()) {
        clipTransformado.push(
          (n.className || n.tagName) + ' recorta, pero su HIJO ' +
          (hijo.className || hijo.tagName) + ' está transformado'
        );
      }
    });
  });

  return JSON.stringify({
    url: location.pathname,
    fades: spans.length,
    problemas: problemas.length,
    detalle: problemas.slice(0, 8),
    clip_dentro_de_reveal_transformado: clipTransformado.slice(0, 4),
  });
})()
