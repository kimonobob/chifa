/* Impresión en ticketera térmica de 80 mm.
   Arma el HTML del ticket, lo mete en #zona-impresion y llama a window.print().
   El CSS de @media print (app.css) oculta todo lo demás y fija el ancho.
   Para que salga sin diálogo, abrir Chrome con --kiosk-printing (ver README). */

const Impresion = (() => {

  function zona() {
    let z = document.getElementById('zona-impresion');
    if (!z) {
      z = document.createElement('div');
      z.id = 'zona-impresion';
      document.body.appendChild(z);
    }
    return z;
  }

  function imprimir(html) {
    const z = zona();
    z.innerHTML = html;
    // Un frame para que el navegador aplique estilos antes de abrir el diálogo.
    requestAnimationFrame(() => {
      window.print();
      setTimeout(() => { z.innerHTML = ''; }, 800);
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
  function comanda(p, { copia = false } = {}) {
    const items = p.items.filter(i => !i.bar);
    const barra = p.items.filter(i => i.bar);
    if (!items.length && !barra.length) return '';

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
      ${items.length ? `<table>${filas(items)}</table>` : ''}
      ${barra.length ? `${linea()}<div class="t-sub"><b>BARRA</b></div><table>${filas(barra)}</table>` : ''}
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
        <div style="font-size:44px;font-weight:700;line-height:1">${String(i.codigo).padStart(2, '0')}</div>
        <div class="t-nom" style="font-size:15px">${UI.esc(i.nombre)}${i.tamano === 'F' ? ' [FAM]' : ''}</div>
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

  return {
    imprimir,
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
    imprimirCierre(dia) { imprimir(cierre(dia)); }
  };
})();
