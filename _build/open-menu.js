/*
 * _build/open-menu.js — abre un desplegable de la barra y lo deja abierto para
 * la foto. Se elige con ?menu=funciones o ?menu=integraciones.
 *
 * Trampa que motiva la mitad del archivo: los oyentes de estos paneles filtran
 * por `e.pointerType === 'mouse'`, así que un PointerEvent sintético SIN ese
 * campo no hace absolutamente nada y el componente parece roto. Está
 * documentado en las trampas del paso 10 y cuesta una ronda entera cada vez
 * que se olvida.
 */
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const cual = new URLSearchParams(location.search).get('menu') || 'funciones';
  const id = 'mnu-' + cual;

  const trigger = document.querySelector('[data-menu="' + id + '"]');
  const panel = document.getElementById(id);
  if (!trigger || !panel) {
    return JSON.stringify({ error: 'no encuentro el disparador o el panel', id });
  }

  const opts = { bubbles: true, cancelable: true, pointerType: 'mouse', pointerId: 1, isPrimary: true };
  trigger.dispatchEvent(new PointerEvent('pointerenter', opts));
  trigger.dispatchEvent(new PointerEvent('pointerover', opts));
  trigger.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false, cancelable: true }));
  await sleep(420);

  // Si el hover no bastó, se prueba el clic: el disparador es un <a> con href,
  // así que hay que impedir la navegación o la página se va y la foto es otra.
  let abierto = !panel.hidden && getComputedStyle(panel).visibility !== 'hidden';
  if (!abierto) {
    const stop = (e) => e.preventDefault();
    trigger.addEventListener('click', stop, true);
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    await sleep(420);
    trigger.removeEventListener('click', stop, true);
    abierto = !panel.hidden && getComputedStyle(panel).visibility !== 'hidden';
  }

  const r = panel.getBoundingClientRect();
  const cs = getComputedStyle(panel);

  // Cuántas teselas del panel son ENLACES de verdad. Es el diagnóstico del
  // «no te deja clicar»: una tesela que no es <a> no lleva a ninguna parte por
  // muy clicable que parezca.
  const teselas = panel.querySelectorAll('.mnu__tile');
  const teselasEnlace = panel.querySelectorAll('.mnu__tile a');

  return JSON.stringify({
    menu: cual,
    abierto,
    hidden: panel.hidden,
    caja: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    fondo: cs.backgroundColor,
    color_texto: cs.color,
    teselas: teselas.length,
    teselas_que_son_enlace: teselasEnlace.length,
    hueco_disparador_panel: Math.round(r.y - trigger.getBoundingClientRect().bottom),
  });
})()
