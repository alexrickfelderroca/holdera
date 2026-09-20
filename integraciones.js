/**
 * EL FILTRO DEL CATÁLOGO DE INTEGRACIONES
 * =======================================
 *
 * Cincuenta fichas en diez familias son 5,7 pantallas de scroll. Sin una forma
 * de buscar, encontrar «Salto KS» es bajar mirando. Esto es lo que arregla eso:
 * un campo de texto y diez filtros por familia, los dos combinables.
 *
 * MEJORA PROGRESIVA, de verdad y no de boquilla:
 * - Sin JavaScript, el carril es una lista de anclas que salta a cada familia
 *   — exactamente lo que la página hacía antes — y el buscador ni siquiera se
 *   ve: lo esconde el CSS hasta que `.has-js` está en el `<html>`. Un campo de
 *   búsqueda que no busca es peor que no tener buscador.
 * - Con JavaScript, los mismos enlaces filtran y dejan de saltar.
 *
 * Nada se recalcula en caliente: cada ficha llega del generador con su
 * `data-find` ya normalizado (sin tildes, en minúsculas) y su `data-group`.
 * Aquí sólo se comparan cadenas y se marca una clase.
 *
 * No se borra nada del DOM. Filtrar ocultando deja el orden intacto, no
 * provoca reflujo de imágenes y permite que Ctrl+F del navegador siga
 * encontrando lo que está a la vista.
 */
(function () {
  'use strict';

  var raiz = document.querySelector('.pgi-layout');
  if (!raiz) return;

  var campo = raiz.querySelector('.pgi-search__in');
  var cats = Array.prototype.slice.call(raiz.querySelectorAll('.pgi-cat'));
  var fichas = Array.prototype.slice.call(raiz.querySelectorAll('.pgi-cell'));
  var grupos = Array.prototype.slice.call(raiz.querySelectorAll('.pgi-group'));
  var vacio = raiz.querySelector('.pgi-empty');
  var vacioQ = raiz.querySelector('.pgi-empty__q');
  var vacioBtn = raiz.querySelector('.pgi-empty__all');
  var cuenta = raiz.querySelector('.pgi-rail__n');
  if (!campo || !cats.length || !fichas.length) return;

  /** El texto original del contador, para poder volver a él. */
  var cuentaBase = cuenta ? cuenta.innerHTML : '';
  var total = fichas.length;

  var familia = '';
  var texto = '';

  /** Misma normalización que usa el generador: sin tildes y en minúsculas. */
  function plano(s) {
    return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  function aplicar() {
    var vistas = 0;

    for (var i = 0; i < fichas.length; i++) {
      var ficha = fichas[i];
      var okFamilia = !familia || ficha.getAttribute('data-group') === familia;
      var okTexto = !texto || (ficha.getAttribute('data-find') || '').indexOf(texto) !== -1;
      var ver = okFamilia && okTexto;
      ficha.classList.toggle('is-out', !ver);
      // Una ficha oculta no puede seguir siendo tabulable: el foco saltaría a
      // un enlace invisible. `inert` se lleva por delante el foco y el árbol
      // de accesibilidad de una vez.
      if (ver) ficha.removeAttribute('inert');
      else ficha.setAttribute('inert', '');
      if (ver) vistas++;
    }

    // Una familia sin fichas a la vista se va entera: si no, quedan diez
    // encabezados sueltos con nada debajo.
    for (var g = 0; g < grupos.length; g++) {
      var quedan = grupos[g].querySelectorAll('.pgi-cell:not(.is-out)').length;
      grupos[g].classList.toggle('is-out', quedan === 0);
    }

    if (vacio) {
      vacio.hidden = vistas !== 0;
      if (vacioQ) vacioQ.textContent = campo.value.trim();
    }

    if (cuenta) {
      cuenta.innerHTML = (familia || texto)
        ? '<b>' + vistas + '</b> de ' + total
        : cuentaBase;
    }
  }

  function marcar(activo) {
    for (var i = 0; i < cats.length; i++) {
      var on = cats[i] === activo;
      cats[i].classList.toggle('is-on', on);
      if (on) cats[i].setAttribute('aria-current', 'true');
      else cats[i].removeAttribute('aria-current');
    }
  }

  campo.addEventListener('input', function () {
    texto = plano(campo.value);
    aplicar();
  });

  // Escape vacía el campo, como en cualquier buscador. Algunos navegadores ya
  // lo hacen con `type="search"`; otros no, y el evento `search` no es fiable.
  campo.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !campo.value) return;
    campo.value = '';
    texto = '';
    aplicar();
  });

  for (var c = 0; c < cats.length; c++) {
    cats[c].addEventListener('click', function (e) {
      e.preventDefault();
      familia = this.getAttribute('data-cat') || '';
      marcar(this);
      aplicar();
      // Con el carril pegajoso a la izquierda no hace falta mover la página en
      // escritorio; en móvil el carril está arriba y el resultado queda fuera
      // de pantalla, así que ahí sí se acompaña.
      if (window.matchMedia('(max-width: 1099px)').matches) {
        var col = raiz.querySelector('.pgi-col');
        if (col) col.scrollIntoView({ block: 'start', behavior: 'smooth' });
      }
    });
  }

  if (vacioBtn) {
    vacioBtn.addEventListener('click', function () {
      campo.value = '';
      texto = '';
      familia = '';
      marcar(cats[0]);
      aplicar();
      campo.focus();
    });
  }
})();
