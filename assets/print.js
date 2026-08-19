/* Impresión en ticketera térmica de 80 mm.
   Arma el HTML del ticket, lo mete en #zona-impresion y llama a window.print().
   El CSS de @media print (app.css) oculta todo lo demás y fija el ancho.
   Para que salga sin diálogo, abrir Chrome con --kiosk-printing (ver README). */

const Impresion = (() => {

  /* ── Ticketera emulada (emulador/impresora.py) ─────────────────────────
     Para probar sin gastar papel ni tener la máquina delante: con el
     emulador encendido, el ticket se le manda a él y sale en el rollo de
     la pantalla en vez de abrir el diálogo del navegador.
        ...cocina.html?emulador=1   lo prende (y queda prendido en ese equipo)
        ...cocina.html?emulador=0   lo apaga y vuelve a la impresora
     Si el emulador no está levantado, la impresión se va al papel de
     verdad: una comanda perdida cuesta más que un susto.                 */
  const EMULADOR = 'http://127.0.0.1:8788';

  (() => {
    const p = new URLSearchParams(location.search).get('emulador');
    if (p === '1') localStorage.setItem('chifa.emulador', '1');
    if (p === '0') localStorage.removeItem('chifa.emulador');
  })();

  const emulando = () => localStorage.getItem('chifa.emulador') === '1';

  /* ── Qué equipo saca las comandas ──────────────────────────────────────
     La ticketera de cocina está enchufada a UN equipo. Cuando el mozo
     manda el pedido desde su tablet, el papel tiene que salir allá, no
     abrirle a él un diálogo de impresión en medio del salón.

     Por eso esto es una preferencia DEL EQUIPO y no se comparte con los
     demás: por defecto imprime la pantalla de cocina y nadie más. Si el
     chifa trabaja todo en una sola computadora, se le prende acá:
        ...mozo.html?impresora=si    este equipo sí saca las comandas
        ...cocina.html?impresora=no  este equipo no saca ninguna
     Esto solo manda sobre la impresión automática. Boletas, precuentas y
     copias salen siempre donde se aprieta el botón: si lo apretaste, es
     porque quieres el papel en la mano.                                  */
  const ROL = 'chifa.impresora';
  const rolPorDefecto = () => /cocina/i.test(location.pathname) ? 'si' : 'no';

  (() => {
    const p = new URLSearchParams(location.search).get('impresora');
    if (p === 'si' || p === 'no') localStorage.setItem(ROL, p);
  })();

  function rolImpresora() {
    try { return localStorage.getItem(ROL) || rolPorDefecto(); }
    catch (e) { return rolPorDefecto(); }
  }
  function setRolImpresora(v) {
    try { localStorage.setItem(ROL, v === 'si' ? 'si' : 'no'); } catch (e) {}
  }
  const imprimeComandas = () => rolImpresora() === 'si';

  function alEmulador(html) {
    // Texto plano a propósito: así el navegador no pide permiso previo
    // (preflight) para mandar el ticket al otro puerto.
    return fetch(`${EMULADOR}/ticket`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ html, titulo: document.title })
    }).then(r => r.json());
  }

  function zona() {
    let z = document.getElementById('zona-impresion');
    if (!z) {
      z = document.createElement('div');
      z.id = 'zona-impresion';
      document.body.appendChild(z);
    }
    return z;
  }

  function aPapel(html) {
    const z = zona();
    z.innerHTML = html;
    // Un frame para que el navegador aplique estilos antes de abrir el diálogo.
    requestAnimationFrame(() => {
      window.print();
      setTimeout(() => { z.innerHTML = ''; }, 800);
    });
  }

  function imprimir(html) {
    if (!emulando()) return aPapel(html);
    alEmulador(html)
      .then(r => {
        // La ticketera emulada puede estar sin papel o con la tapa abierta:
        // así se prueba qué pasa cuando la de verdad lo esté.
        if (!r.ok && window.UI) UI.toast(`La ticketera no imprimió: ${r.motivo}`, 'error');
      })
      .catch(() => {
        if (window.UI) UI.toast('Emulador apagado: el ticket va a la impresora', 'error');
        aPapel(html);
      });
  }

  const cab = () => {
    const c = Store.config();
    return `<div class="t-centro">
      <div class="t-titulo">${UI.esc(c.negocio)}</div>
      ${c.direccion ? `<div class="t-sub">${UI.esc(c.direccion)}</div>` : ''}
      ${c.ruc ? `<div class="t-sub">RUC ${UI.esc(c.ruc)}</div>` : ''}
    </div>`;
  };

  const linea = () => '<hr>';

  /* ── Comanda de cocina: solo lo que se cocina, códigos bien grandes ─────── */
  /* Comanda de cocina: solo lo que hay que preparar. Las bebidas nunca
     llegan acá — se suman a la cuenta y las sirve el mozo. */
  function comanda(p, { copia = false } = {}) {
    const items = p.items.filter(i => !i.bar);
    if (!items.length) return '';

    const filas = arr => arr.map(i => `
      <tr>
        <td class="t-cod">${String(i.codigo).padStart(2, '0')}</td>
        <td class="t-cant">${i.cant}x</td>
        <td class="t-nom">${UI.esc(i.nombre)}${i.tamano === 'F' ? ' [FAM]' : ''}
          ${i.detalle ? `<div class="t-nota" style="font-weight:400">${UI.esc(i.detalle)}</div>` : ''}
          ${i.notas ? `<div class="t-nota">${UI.esc(i.notas)}</div>` : ''}
        </td>
      </tr>`).join('');

    // La comanda lleva la mesa concreta a la que se sirve; si está unida a
    // otras, se anota abajo como referencia.
    const otras = Store.mesasDe(p.mesa).filter(m => m !== String(p.mesa));

    return `<div class="ticket">
      <div class="t-centro">
        <div class="t-titulo">COMANDA${copia ? ' (COPIA)' : ''}</div>
        <div class="t-mesa">MESA ${UI.esc(p.mesa)}</div>
        ${otras.length ? `<div class="t-sub">unida con ${UI.esc(otras.join(', '))}</div>` : ''}
        <div class="t-sub">Pedido N° ${p.num} &middot; ${UI.horaSeg(p.creado)}</div>
        <div class="t-sub">Mozo: ${UI.esc(p.mozo)}</div>
      </div>
      ${linea()}
      <table>${filas(items)}</table>
      ${linea()}
      <div class="t-pie">${items.reduce((t, i) => t + i.cant, 0)} platos &middot; impreso ${UI.horaSeg(Date.now())}</div>
    </div>`;
  }

  /* Un papel por platillo: el código enorme, para pegarlo en la barra de
     despacho. `unidad` numera la unidad dentro de la línea (plato 2 de 3). */
  function ticketPlato(p, i, unidad) {
    const varias = i.cant > 1;
    const cabeza = unidad != null && varias
      ? `${unidad + 1} de ${i.cant}`
      : (varias ? `${i.cant} unidades` : '1 plato');
    return `<div class="ticket">
      <div class="t-centro">
        <div class="t-mesa">MESA ${UI.esc(p.mesa)}</div>
        <div class="t-sub">Pedido N° ${p.num} &middot; ${UI.horaSeg(p.creado)}</div>
      </div>
      ${linea()}
      <div class="t-centro">
        <div style="font-size:62px;font-weight:700;line-height:1">${String(i.codigo).padStart(2, '0')}</div>
        <div class="t-nom" style="font-size:22px">${UI.esc(i.nombre)}${i.tamano === 'F' ? ' [FAM]' : ''}</div>
        <div class="t-sub">${cabeza}</div>
        ${i.detalle ? `<div class="t-nota" style="font-size:12px;font-weight:400">${UI.esc(i.detalle)}</div>` : ''}
        ${i.notas ? `<div class="t-nota" style="font-size:13px">${UI.esc(i.notas)}</div>` : ''}
      </div>
      ${linea()}
      <div class="t-pie">Mozo: ${UI.esc(p.mozo)}</div>
    </div>`;
  }

  /* Toda la comanda, pero con un papel por cada unidad de cada plato. */
  function comandaPorPlato(p) {
    return p.items.filter(i => !i.bar)
      .map(i => Array.from({ length: i.cant }, (_, u) => ticketPlato(p, i, u)).join(''))
      .join('');
  }

  /* ── Precuenta: lo que el cliente pide antes de pagar ───────────────────── */
  function precuenta(mesa) {
    const lineas = Store.lineasDe(mesa);
    if (!lineas.length) return '';
    const total = lineas.reduce((t, l) => t + l.pu * l.cant, 0);
    return `<div class="ticket">
      ${cab()}
      ${linea()}
      <div class="t-centro"><div class="t-titulo">PRECUENTA</div>
      <div class="t-mesa">MESA ${UI.esc(Store.mesaCorta(mesa))}</div>
      <div class="t-sub">${UI.fecha(Date.now())} &middot; ${UI.hora(Date.now())}</div></div>
      ${linea()}
      <table>${lineas.map(l => `
        <tr>
          <td class="t-cant">${l.cant}x</td>
          <td class="t-nom">${String(l.codigo).padStart(2, '0')} ${UI.esc(l.nombre)}${l.tamano === 'F' ? ' [FAM]' : ''}</td>
          <td class="t-n">${(l.pu * l.cant).toFixed(2)}</td>
        </tr>`).join('')}
      </table>
      ${linea()}
      <table><tr>
        <td class="t-tot">TOTAL</td>
        <td class="t-n t-tot">${UI.soles(total)}</td>
      </tr></table>
      ${linea()}
      <div class="t-pie">Este documento no es comprobante de pago.<br>¡Gracias por su visita!</div>
    </div>`;
  }

  /* ── Boleta: el comprobante después de cobrar ───────────────────────────── */
  function boleta(v) {
    return `<div class="ticket">
      ${cab()}
      ${linea()}
      <div class="t-centro"><div class="t-titulo">BOLETA DE VENTA</div>
      <div class="t-sub">N° ${String(v.num).padStart(5, '0')} &middot; ${UI.esc(v.nombreMesa || `Mesa ${v.mesa}`)}</div>
      <div class="t-sub">${UI.fecha(v.cerrado)} ${UI.hora(v.cerrado)} &middot; ${UI.esc(v.cajero)}</div></div>
      ${linea()}
      <table>${v.lineas.map(l => `
        <tr>
          <td class="t-cant">${l.cant}x</td>
          <td class="t-nom">${String(l.codigo).padStart(2, '0')} ${UI.esc(l.nombre)}${l.tamano === 'F' ? ' [FAM]' : ''}
            <div class="t-nota" style="font-weight:400">c/u ${l.pu.toFixed(2)}</div></td>
          <td class="t-n">${(l.pu * l.cant).toFixed(2)}</td>
        </tr>`).join('')}
      </table>
      ${linea()}
      <table>
        <tr><td>Subtotal</td><td class="t-n">${v.subtotal.toFixed(2)}</td></tr>
        ${v.descuento ? `<tr><td>Descuento</td><td class="t-n">-${v.descuento.toFixed(2)}</td></tr>` : ''}
        <tr><td class="t-tot">TOTAL</td><td class="t-n t-tot">${UI.soles(v.total)}</td></tr>
        <tr><td>Pago</td><td class="t-n">${UI.esc(v.metodo)}</td></tr>
        ${v.metodo === 'Efectivo' ? `
        <tr><td>Recibido</td><td class="t-n">${v.recibido.toFixed(2)}</td></tr>
        <tr><td class="t-tot">VUELTO</td><td class="t-n t-tot">${v.vuelto.toFixed(2)}</td></tr>` : ''}
      </table>
      ${v.nota ? `${linea()}<div class="t-sub">${UI.esc(v.nota)}</div>` : ''}
      ${linea()}
      <div class="t-pie">¡Gracias por su visita!<br>Vuelva pronto</div>
    </div>`;
  }

  /* ── Cierre de caja del día ─────────────────────────────────────────────── */
  function cierre(dia) {
    const r = Store.resumenDia(dia);
    return `<div class="ticket">
      ${cab()}
      ${linea()}
      <div class="t-centro"><div class="t-titulo">CIERRE DE CAJA</div>
      <div class="t-sub">${dia || Store.hoy()} &middot; ${UI.hora(Date.now())}</div>
      <div class="t-sub">${UI.esc(Store.config().caja)}</div></div>
      ${linea()}
      <table>
        <tr><td>Cuentas cobradas</td><td class="t-n">${r.ventas}</td></tr>
        <tr><td>Ticket promedio</td><td class="t-n">${r.promedio.toFixed(2)}</td></tr>
        ${r.descuentos ? `<tr><td>Descuentos</td><td class="t-n">-${r.descuentos.toFixed(2)}</td></tr>` : ''}
        <tr><td class="t-tot">TOTAL</td><td class="t-n t-tot">${UI.soles(r.total)}</td></tr>
      </table>
      ${linea()}
      <div class="t-sub"><b>POR MEDIO DE PAGO</b></div>
      <table>${Object.entries(r.metodos).map(([m, t]) =>
        `<tr><td>${UI.esc(m)}</td><td class="t-n">${t.toFixed(2)}</td></tr>`).join('') || '<tr><td>Sin ventas</td><td></td></tr>'}
      </table>
      ${linea()}
      <div class="t-sub"><b>MÁS VENDIDOS</b></div>
      <table>${r.top.slice(0, 12).map(p =>
        `<tr><td class="t-cod" style="font-size:12px">${String(p.codigo).padStart(2, '0')}</td>
             <td class="t-nom" style="font-size:11px">${UI.esc(p.nombre)}</td>
             <td class="t-n">${p.cant}</td></tr>`).join('') || '<tr><td>—</td><td></td><td></td></tr>'}
      </table>
      ${linea()}
      <div class="t-pie">Firma: ______________________</div>
    </div>`;
  }

  const api = {
    imprimir,
    imprimeComandas, rolImpresora, setRolImpresora,
    comanda, comandaPorPlato, ticketPlato, precuenta, boleta, cierre,
    /* Un solo plato de la cola: lo que usa la vista "uno por uno". */
    imprimirPlato(p, item, unidad) {
      imprimir(ticketPlato(p, item, unidad));
    },
    imprimirComanda(p, opts) {
      const html = comanda(p, opts);
      if (!html) return false;
      imprimir(html);
      Store.marcarImpreso(p.id);
      return true;
    },
    imprimirPorPlato(p) {
      const html = comandaPorPlato(p);
      if (!html) return false;
      imprimir(html);
      Store.marcarImpreso(p.id);
      return true;
    },
    imprimirPrecuenta(mesa) {
      const html = precuenta(mesa);
      if (!html) return false;
      imprimir(html);
      return true;
    },
    imprimirBoleta(v) { imprimir(boleta(v)); },
    imprimirCierre(dia) { imprimir(cierre(dia)); },

    /* Comanda automática, la del pedido recién mandado: sale únicamente en
       el equipo que tiene la ticketera de cocina. En cualquier otro
       devuelve false sin abrir nada, y el pedido queda sin marcar como
       impreso para que la cocina lo saque cuando le llegue. */
    comandaAuto(p, opts) {
      if (!imprimeComandas()) return false;
      return api.imprimirComanda(p, opts);
    }
  };

  return api;
})();
