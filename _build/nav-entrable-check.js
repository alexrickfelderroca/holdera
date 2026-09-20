/*
 * _build/nav-entrable-check.js — ¿se puede ENTRAR desde la barra?
 *
 * Comprueba el camino real del ratón: pasar el puntero por «Integraciones»
 * (que abre el panel a los 90 ms) y luego CLICAR. Antes del arreglo eso cerraba
 * el panel y no llevaba a ninguna parte.
 *
 * Cómo se lee el resultado, que es lo que importa:
 *   · Si la navegación ocurre, Chrome destruye el contexto de ejecución a mitad
 *     del evaluate y shoot.js imprime «EVAL ERROR … Execution context was
 *     destroyed». **Eso es el ÉXITO**, no un fallo del script: es exactamente
 *     la señal que se está midiendo, igual que en _build/nav-check.js.
 *   · Si NO hay navegación, el script termina y devuelve su JSON diciendo que
 *     el panel se cerró (o siguió abierto) sin ir a ninguna parte. Eso es el
 *     fallo.
 *   · Y la CAPTURA que shoot.js hace a continuación es la prueba visual: si sale
 *     el catálogo, se entró; si sale el hero, no.
 *
 * Qué menú probar: ?menu=funciones o ?menu=integraciones.
 */
(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const cual = new URLSearchParams(location.search).get('menu') || 'integraciones';
  const id = 'mnu-' + cual;

  const trigger = document.querySelector('[data-menu="' + id + '"]');
  const panel = document.getElementById(id);
  if (!trigger || !panel) return JSON.stringify({ error: 'no encuentro disparador o panel', id });

  const destino = trigger.getAttribute('data-href');
  const etiqueta = trigger.tagName;

  // Sin pointerType:'mouse' los oyentes lo ignoran — trampa documentada del
  // paso 10, y cuesta una ronda entera cada vez que se olvida.
  const opts = { bubbles: true, cancelable: true, pointerType: 'mouse', pointerId: 1, isPrimary: true };
  trigger.dispatchEvent(new PointerEvent('pointerenter', opts));
  trigger.dispatchEvent(new PointerEvent('pointerover', opts));
  await sleep(320);

  const abiertoAntesDelClic = !panel.hidden;
  const partida = location.href;

  trigger.click();
  await sleep(1400);            // si navega, el contexto muere aquí dentro

  return JSON.stringify({
    menu: cual,
    etiqueta_del_disparador: etiqueta,
    data_href: destino,
    abierto_antes_del_clic: abiertoAntesDelClic,
    navego: location.href !== partida,
    href_ahora: location.href,
    panel_sigue_abierto: !panel.hidden,
    veredicto: location.href !== partida ? 'ENTRA' : 'NO ENTRA',
  });
})()
