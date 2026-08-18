/* Caja: cobrar mesas, vender bebidas y cerrar el día. */

(() => {
  const $ = s => document.querySelector(s);
  const st = { mesa: null, metodo: 'Efectivo', tab: 'cuenta' };

  const etqMesa = m => (isNaN(Number(m)) ? m : `Mesa ${m}`);

  // ── Columna 1: cuentas abiertas ──────────────────────────────────────────
  function pintarCuentas() {
    const cuentas = Store.cuentas();
    $('#lista-cuentas').innerHTML = cuentas.map(c => {
      const espera = c.pedidos.some(p => p.estado === 'nuevo' || p.estado === 'preparando');
      const rotulo = c.mesas.length > 1
        ? c.mesas.join('+')
        : (isNaN(Number(c.mesa)) ? c.mesa.slice(0, 3) : c.mesa);
      return `<button type="button" class="cuenta-item ${c.mesa === st.mesa ? 'activa' : ''} ${espera ? 'espera' : ''}" data-mesa="${UI.esc(c.mesa)}">
        <span class="mesa-n">${UI.esc(rotulo)}</span>
        <span>
          <b>${UI.esc(c.nombre)}</b>
          <small>${UI.hora(c.desde)} · ${c.pedidos.length} ronda${c.pedidos.length === 1 ? '' : 's'}${espera ? ' · en cocina' : ''}</small>
        </span>
        <span class="tot dinero">${c.total.toFixed(2)}</span>
      </button>`;
    }).join('') || '<div class="vacio-msg">No hay cuentas abiertas.<br>Los pedidos del mozo aparecen acá.</div>';

    $('#k-abiertas').textContent = cuentas.length;
    $('#k-porcobrar').textContent = UI.soles(cuentas.reduce((t, c) => t + c.total, 0));

    if (!$('#abrir-mesa').dataset.listo) {
      $('#abrir-mesa').innerHTML = '<option value="">Abrir mesa…</option>' +
        Store.mesas().map(m => `<option value="${UI.esc(m)}">${UI.esc(etqMesa(m))}</option>`).join('');
      $('#abrir-mesa').dataset.listo = '1';
    }
  }

  $('#lista-cuentas').addEventListener('click', e => {
    const b = e.target.closest('.cuenta-item');
    if (b) seleccionar(b.dataset.mesa);
  });

  $('#abrir-mesa').onchange = e => {
    if (e.target.value) seleccionar(e.target.value);
    e.target.value = '';
  };

  function seleccionar(mesa) {
    st.mesa = mesa;
    $('#desc-monto').value = 0;
    $('#desc-pct').value = 0;
    $('#recibido').value = 0;
    if (st.tab !== 'cuenta') cambiarTab('cuenta');
    pintarTodo();
  }

  // ── Columna 2: detalle de la cuenta ──────────────────────────────────────
  function pintarDetalle() {
    if (!st.mesa) {
      $('#detalle').innerHTML = '<div class="detalle-vacio">Elige una cuenta de la izquierda<br>o abre una mesa para vender bebidas.</div>';
      return;
    }
    const c = Store.cuentaDe(st.mesa);
    const rondas = c ? c.pedidos.slice().sort((a, b) => a.creado - b.creado) : [];

    let filas = '';
    rondas.forEach(p => {
      const deOtraMesa = c && c.mesas.length > 1 ? ` · mesa ${UI.esc(p.mesa)}` : '';
      filas += `<tr><td colspan="5" style="background:var(--panel-2);padding:6px 14px">
        <span class="eyebrow">${p.origen === 'caja' ? 'Venta directa' : `Pedido N° ${p.num}`}${deOtraMesa} · ${UI.hora(p.creado)}</span>
        <span class="pill ${p.estado}" style="margin-left:8px">${p.estado}</span>
      </td></tr>`;
      p.items.forEach(i => {
        const pu = Store.precioItem(i);
        filas += `<tr>
          <td class="n">${i.cant}</td>
          <td>${UI.chapa(i.codigo, i.bar ? 'bar' : '')}
            <span style="margin-left:8px">${UI.esc(i.nombre)}${i.tamano === 'F' ? ' (Fam.)' : ''}</span>
            ${i.notas ? `<small style="display:block;color:var(--txt-dim);margin-left:calc(2.1em + 8px)">${UI.esc(i.notas)}</small>` : ''}
          </td>
          <td class="n">${pu.toFixed(2)}</td>
          <td class="n"><b>${(pu * i.cant).toFixed(2)}</b></td>
          <td class="n"><button class="quitar" data-quitar="${p.id}|${i.uid}" title="Quitar de la cuenta">×</button></td>
        </tr>`;
      });
    });

    $('#detalle').innerHTML = `
      <div class="det-cab">
        <h1>${UI.esc(Store.nombreCuenta(st.mesa))}</h1>
        <div class="sub">${c
          ? `Abierta ${UI.hora(c.desde)} · ${rondas.length} ronda${rondas.length === 1 ? '' : 's'} · ${UI.soles(c.total)}`
          : 'Cuenta vacía — agrega algo abajo'}</div>
      </div>
      ${filas ? `<table class="tabla">
        <thead><tr><th class="n">Cant</th><th>Plato</th><th class="n">c/u</th><th class="n">Importe</th><th></th></tr></thead>
        <tbody>${filas}</tbody>
      </table>` : '<div class="detalle-vacio">Sin consumo registrado.</div>'}`;
  }

  $('#panel-cuenta').addEventListener('click', e => {
    const q = e.target.closest('[data-quitar]');
    if (!q) return;
    const [pid, uid] = q.dataset.quitar.split('|');
    if (confirm('¿Quitar este plato de la cuenta?')) {
      Store.quitarItem(pid, uid);
      pintarTodo();
    }
  });

  // ── Agregar rápido ───────────────────────────────────────────────────────
  /* Todo lo que sale de barra, sea la categoría que sea. Antes esto miraba
     una categoría fija y, al cambiar la carta, la grilla quedó vacía. */
  let catBarra = 'todas';

  function pintarBebidas() {
    const deBarra = Store.carta().filter(p => p.bar && !p.out);
    const cats = CATEGORIAS.filter(c => deBarra.some(p => p.cat === c.id));

    $('#barra-cats').innerHTML =
      `<button type="button" class="cat-chip ${catBarra === 'todas' ? 'on' : ''}" data-cat="todas">Todas</button>` +
      cats.map(c => `<button type="button" class="cat-chip ${catBarra === c.id ? 'on' : ''}" data-cat="${c.id}">${UI.esc(c.nombre)}</button>`).join('');

    const lista = catBarra === 'todas' ? deBarra : deBarra.filter(p => p.cat === catBarra);
    $('#grid-bebidas').innerHTML = lista.map(p => `
      <button type="button" class="bebida-btn" data-c="${p.c}" title="${UI.esc(p.n)}">
        <span class="bn">${p.c}</span>
        <span class="bt">${UI.esc(p.n)}</span>
        <span class="bp">${p.p.toFixed(2)}</span>
      </button>`).join('') || '<div class="vacio-msg">Nada en esta categoría</div>';
  }

  $('#barra-cats').addEventListener('click', e => {
    const b = e.target.closest('.cat-chip');
    if (!b) return;
    catBarra = b.dataset.cat;
    pintarBebidas();
  });

  function agregar(codigo, cant = 1) {
    if (!st.mesa) return UI.toast('Elige o abre una mesa primero', 'error');
    const p = Store.plato(codigo);
    if (!p) return UI.toast(`El código ${codigo} no está en la carta`, 'error');
    Store.agregarItem(st.mesa, {
      codigo: p.c, nombre: p.n, precio: p.p, precioF: p.pf || null,
      cant, tamano: 'R', notas: '', bar: !!p.bar, detalle: p.d || ''
    });
    UI.toast(`${cant} × ${p.n}`, 'ok');
    pintarTodo();
  }

  $('#grid-bebidas').addEventListener('click', e => {
    const b = e.target.closest('[data-c]');
    if (b) agregar(Number(b.dataset.c), 1);
  });

  $('#add-codigo').onclick = () => {
    const c = Number($('#codigo-rapido').value);
    const n = Math.max(1, Number($('#cant-rapida').value) || 1);
    if (!c) return;
    agregar(c, n);
    $('#codigo-rapido').value = '';
    $('#cant-rapida').value = 1;
    $('#codigo-rapido').focus();
  };
  $('#codigo-rapido').addEventListener('keydown', e => { if (e.key === 'Enter') $('#add-codigo').click(); });

  // ── Pedido para llevar ───────────────────────────────────────────────────
  /* Se arma igual que el del mozo —eligiendo de la carta— y sale a cocina,
     no a la cuenta de caja: es comida que hay que cocinar. */
  const dlgLlevar = $('#dlg-llevar');
  const llevar = { items: [], mesa: null, cat: 'todas' };

  function abrirLlevar() {
    llevar.items = [];
    llevar.mesa = Store.nuevaMesaLlevar();
    llevar.cat = 'todas';
    $('#llevar-mesa').textContent = llevar.mesa;
    $('#llevar-buscar').value = '';
    pintarLlevarCats();
    pintarLlevarCarta();
    pintarLlevarPedido();
    dlgLlevar.showModal();
  }

  function pintarLlevarCats() {
    const cats = CATEGORIAS.filter(c => Store.carta().some(p => p.cat === c.id));
    $('#llevar-cats').innerHTML =
      `<button type="button" class="cat-chip ${llevar.cat === 'todas' ? 'on' : ''}" data-cat="todas">Todas</button>` +
      cats.map(c => `<button type="button" class="cat-chip ${llevar.cat === c.id ? 'on' : ''}" data-cat="${c.id}">${UI.esc(c.nombre)}</button>`).join('');
  }

  function pintarLlevarCarta() {
    const q = $('#llevar-buscar').value;
    let lista = Store.carta().filter(p => !p.out);
    if (llevar.cat !== 'todas') lista = lista.filter(p => p.cat === llevar.cat);
    lista = Texto.filtrarCarta(lista, q);

    $('#llevar-resultados').innerHTML = lista.map(p => `
      <button type="button" class="lista-item" data-c="${p.c}">
        ${UI.chapa(p.c, p.bar ? 'bar' : '')}
        <span class="li-nom">${Texto.resaltar(p.n, q)}${p.d ? `<em>${UI.esc(p.d)}</em>` : ''}</span>
        <span class="li-pre">${UI.soles(p.p)}</span>
      </button>`).join('') ||
      `<div class="lista-nada"><b>Nada con “${UI.esc(q)}”</b>Prueba con menos letras.</div>`;
  }

  function pintarLlevarPedido() {
    const n = llevar.items.reduce((t, i) => t + i.cant, 0);
    $('#llevar-conteo').textContent = n;
    $('#llevar-lineas').innerHTML = llevar.items.map((i, idx) => `
      <div class="llevar-linea" data-i="${idx}">
        ${UI.chapa(i.codigo, i.bar ? 'bar' : '')}
        <span class="ln"><b>${UI.esc(i.nombre)}</b>
          <input data-nota="${idx}" value="${UI.esc(i.notas)}" placeholder="Nota para cocina…"></span>
        <button type="button" class="menos" data-menos="${idx}" aria-label="Menos uno">−</button>
        <span class="cn">${i.cant}</span>
        <button type="button" class="mas" data-mas="${idx}" aria-label="Más uno">+</button>
      </div>`).join('') ||
      '<div class="vacio-msg">Toca los platos de la izquierda para armar el pedido.</div>';

    const total = llevar.items.reduce((t, i) => t + i.precio * i.cant, 0);
    $('#llevar-total').textContent = UI.soles(total);
    $('#llevar-enviar').disabled = !llevar.items.length;
  }

  function llevarAgregar(codigo) {
    const p = Store.plato(codigo);
    if (!p) return;
    const ex = llevar.items.find(i => i.codigo === p.c && !i.notas);
    if (ex) ex.cant += 1;
    else llevar.items.push({
      codigo: p.c, nombre: p.n, precio: p.p, precioF: p.pf || null,
      cant: 1, tamano: 'R', notas: '', bar: !!p.bar, detalle: p.d || ''
    });
    pintarLlevarPedido();
  }

  $('#btn-llevar').onclick = abrirLlevar;
  $('#llevar-cancelar').onclick = () => dlgLlevar.close();
  $('#llevar-buscar').oninput = pintarLlevarCarta;

  $('#llevar-cats').addEventListener('click', e => {
    const b = e.target.closest('.cat-chip');
    if (!b) return;
    llevar.cat = b.dataset.cat;
    pintarLlevarCats();
    pintarLlevarCarta();
  });

  $('#llevar-resultados').addEventListener('click', e => {
    const b = e.target.closest('.lista-item');
    if (b) llevarAgregar(Number(b.dataset.c));
  });

  $('#llevar-lineas').addEventListener('click', e => {
    const mas = e.target.closest('[data-mas]');
    const menos = e.target.closest('[data-menos]');
    if (mas) { llevar.items[Number(mas.dataset.mas)].cant += 1; pintarLlevarPedido(); }
    if (menos) {
      const i = Number(menos.dataset.menos);
      llevar.items[i].cant -= 1;
      if (llevar.items[i].cant <= 0) llevar.items.splice(i, 1);
      pintarLlevarPedido();
    }
  });

  /* La nota se guarda mientras se escribe, sin repintar: repintar le quitaría
     el foco al cajero a media palabra. */
  $('#llevar-lineas').addEventListener('input', e => {
    const n = e.target.closest('[data-nota]');
    if (n) llevar.items[Number(n.dataset.nota)].notas = n.value;
  });

  $('#llevar-enviar').onclick = () => {
    if (!llevar.items.length) return;
    const p = Store.pedidoNuevo({
      mesa: llevar.mesa,
      mozo: Store.config().caja,
      items: llevar.items,
      origen: 'mozo'            // 'mozo' para que entre a la cola de cocina
    });
    let impresa = false;
    if (Store.config().imprimirAlEnviar) impresa = Impresion.imprimirComanda(p);
    UI.toast(`${llevar.mesa} · pedido N° ${p.num}${impresa ? ' · comanda impresa' : ' a cocina'}`, 'ok');
    dlgLlevar.close();
    seleccionar(llevar.mesa);   // queda abierta en caja, lista para cobrar
  };

  // ── Columna 3: cobro ─────────────────────────────────────────────────────
  const BILLETES = [10, 20, 50, 100, 200];

  $('#billetes').innerHTML =
    BILLETES.map(b => `<button type="button" data-b="${b}">${b}</button>`).join('') +
    '<button type="button" data-b="exacto">Exacto</button>';

  function subtotal() {
    const c = st.mesa ? Store.cuentaDe(st.mesa) : null;
    return c ? c.total : 0;
  }
  function descuento() {
    return Math.min(subtotal(), Math.max(0, Number($('#desc-monto').value) || 0));
  }
  const total = () => +(subtotal() - descuento()).toFixed(2);

  function pintarCobro() {
    const sub = subtotal(), des = descuento(), tot = total();
    const efectivo = st.metodo === 'Efectivo';
    const rec = Number($('#recibido').value) || 0;
    const dif = +(rec - tot).toFixed(2);

    $('#cobro-mesa').textContent = st.mesa ? Store.nombreCuenta(st.mesa) : '—';
    $('#zona-efectivo').style.display = efectivo ? '' : 'none';
    $('#metodos').querySelectorAll('.metodo-btn').forEach(b => b.classList.toggle('on', b.dataset.m === st.metodo));

    $('#resumen-cobro').innerHTML = `
      <div class="f"><span>Subtotal</span><span class="dinero">${UI.soles(sub)}</span></div>
      ${des ? `<div class="f"><span>Descuento</span><span class="dinero">− ${UI.soles(des)}</span></div>` : ''}
      <div class="f grande"><span class="eyebrow">Total</span><span class="val dinero">${UI.soles(tot)}</span></div>
      ${efectivo && rec > 0
        ? (dif >= 0
          ? `<div class="f vuelto"><span class="eyebrow">Vuelto</span><span class="val dinero">${UI.soles(dif)}</span></div>`
          : `<div class="f falta"><span class="eyebrow">Falta</span><span class="val dinero">${UI.soles(-dif)}</span></div>`)
        : ''}`;

    const puede = !!st.mesa && sub > 0 && (!efectivo || rec >= tot);
    $('#cobrar').disabled = !puede;
    $('#cobrar-sin').disabled = !puede;
    $('#precuenta').disabled = !st.mesa || sub <= 0;
  }

  $('#metodos').addEventListener('click', e => {
    const b = e.target.closest('.metodo-btn');
    if (!b) return;
    st.metodo = b.dataset.m;
    if (st.metodo === 'Efectivo' && !Number($('#recibido').value)) $('#recibido').value = total().toFixed(2);
    pintarCobro();
  });

  $('#billetes').addEventListener('click', e => {
    const b = e.target.closest('[data-b]');
    if (!b) return;
    const actual = Number($('#recibido').value) || 0;
    $('#recibido').value = b.dataset.b === 'exacto' ? total().toFixed(2) : (actual + Number(b.dataset.b)).toFixed(2);
    pintarCobro();
  });

  $('#recibido').oninput = pintarCobro;
  $('#desc-monto').oninput = () => {
    const sub = subtotal();
    $('#desc-pct').value = sub ? ((descuento() / sub) * 100).toFixed(1) : 0;
    pintarCobro();
  };
  $('#desc-pct').oninput = () => {
    const pct = Math.min(100, Math.max(0, Number($('#desc-pct').value) || 0));
    $('#desc-monto').value = (subtotal() * pct / 100).toFixed(2);
    pintarCobro();
  };

  function cobrar(imprimir) {
    if (!st.mesa) return;
    const enCocina = (Store.cuentaDe(st.mesa) || { pedidos: [] })
      .pedidos.some(p => p.estado === 'nuevo' || p.estado === 'preparando');
    if (enCocina && !confirm('Esta mesa todavía tiene platos en cocina. ¿Cobrar igual?')) return;

    const v = Store.cobrar(st.mesa, {
      descuento: descuento(),
      metodo: st.metodo,
      recibido: st.metodo === 'Efectivo' ? Number($('#recibido').value) || 0 : total()
    });
    if (!v) return UI.toast('No hay nada que cobrar', 'error');

    if (imprimir) Impresion.imprimirBoleta(v);
    UI.toast(`${v.nombreMesa} cobrada · ${UI.soles(v.total)}${v.vuelto ? ` · vuelto ${UI.soles(v.vuelto)}` : ''}`, 'ok');
    st.mesa = null;
    $('#desc-monto').value = 0;
    $('#desc-pct').value = 0;
    $('#recibido').value = 0;
    pintarTodo();
  }

  $('#cobrar').onclick = () => cobrar(true);
  $('#cobrar-sin').onclick = () => cobrar(false);
  $('#precuenta').onclick = () => Impresion.imprimirPrecuenta(st.mesa);

  // ── Pestaña: ventas del día ──────────────────────────────────────────────
  function pintarVentas() {
    const r = Store.resumenDia();
    const vs = Store.ventasDia().slice().reverse();
    const metodos = Object.entries(r.metodos);

    $('#panel-ventas').innerHTML = `
      <div class="kpis">
        <div class="kpi ancho"><div class="k">Vendido hoy</div><div class="v dinero">${UI.soles(r.total)}</div></div>
        <div class="kpi"><div class="k">Cuentas</div><div class="v">${r.ventas}</div></div>
        <div class="kpi"><div class="k">Ticket promedio</div><div class="v dinero">${UI.soles(r.promedio)}</div></div>
        ${metodos.map(([m, t]) => `<div class="kpi"><div class="k">${UI.esc(m)}</div><div class="v dinero">${UI.soles(t)}</div></div>`).join('')}
        ${r.descuentos ? `<div class="kpi"><div class="k">Descuentos</div><div class="v dinero">− ${UI.soles(r.descuentos)}</div></div>` : ''}
      </div>

      <div style="display:flex;gap:7px;padding:12px 14px;border-bottom:1px solid var(--linea);flex-wrap:wrap">
        <button class="btn chico" id="print-cierre">Imprimir cierre</button>
        <button class="btn chico fantasma" id="csv">Exportar CSV</button>
        <button class="btn chico fantasma" id="cerrar-dia">Cerrar día</button>
      </div>

      ${vs.length ? `<table class="tabla">
        <thead><tr><th>Hora</th><th>Mesa</th><th>Pago</th><th class="n">Total</th><th></th></tr></thead>
        <tbody>${vs.map(v => `<tr>
          <td class="dinero">${UI.hora(v.cerrado)}</td>
          <td><b>${UI.esc(v.nombreMesa || etqMesa(v.mesa))}</b><small style="display:block;color:var(--txt-dim)">N° ${String(v.num).padStart(5, '0')} · ${v.lineas.reduce((t, l) => t + l.cant, 0)} ítems</small></td>
          <td>${UI.esc(v.metodo)}</td>
          <td class="n"><b>${v.total.toFixed(2)}</b></td>
          <td class="n"><button class="btn chico fantasma" data-boleta="${v.id}">Copia</button></td>
        </tr>`).join('')}</tbody>
      </table>` : '<div class="detalle-vacio">Todavía no se ha cobrado nada hoy.</div>'}

      ${r.top.length ? `<div style="padding:14px">
        <p class="eyebrow" style="margin:0 0 8px">Más vendidos hoy</p>
        ${r.top.slice(0, 10).map(p => `<div style="display:flex;align-items:center;gap:10px;padding:5px 0;border-bottom:1px solid var(--linea)">
          ${UI.chapa(p.codigo)}
          <span style="flex:1">${UI.esc(p.nombre)}</span>
          <b class="dinero">${p.cant}</b>
        </div>`).join('')}
      </div>` : ''}`;

    $('#print-cierre').onclick = () => Impresion.imprimirCierre();
    $('#csv').onclick = exportarCSV;
    $('#cerrar-dia').onclick = () => {
      if (Store.cuentas().length && !confirm('Hay mesas abiertas sin cobrar. ¿Cerrar el día igual?')) return;
      if (!confirm('Cerrar el día archiva los pedidos ya cobrados. Las ventas quedan guardadas. ¿Continuar?')) return;
      Store.cerrarDia();
      UI.toast('Día cerrado', 'ok');
      pintarTodo();
    };
    $('#panel-ventas').querySelectorAll('[data-boleta]').forEach(b => {
      b.onclick = () => {
        const v = Store.estado().ventas.find(x => x.id === b.dataset.boleta);
        if (v) Impresion.imprimirBoleta(v);
      };
    });
  }

  function exportarCSV() {
    const vs = Store.ventasDia();
    const filas = [['N°', 'Fecha', 'Hora', 'Mesa', 'Codigo', 'Plato', 'Tamano', 'Cant', 'PU', 'Importe', 'Metodo', 'TotalCuenta']];
    vs.forEach(v => v.lineas.forEach(l => filas.push([
      v.num, v.dia, UI.hora(v.cerrado), v.mesa, l.codigo, l.nombre, l.tamano,
      l.cant, l.pu.toFixed(2), (l.pu * l.cant).toFixed(2), v.metodo, v.total.toFixed(2)
    ])));
    const csv = filas.map(f => f.map(x => `"${String(x).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `ventas-${Store.hoy()}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    UI.toast('CSV descargado', 'ok');
  }

  // ── Pestaña: ajustes ─────────────────────────────────────────────────────
  function pintarAjustes() {
    const c = Store.config();
    $('#panel-ajustes').innerHTML = `
      <div style="padding:16px">
        <p class="eyebrow" style="margin:0 0 12px">Datos del negocio</p>
        <div class="grid2" style="margin-bottom:14px">
          <div class="campo"><label for="cfg-negocio">Nombre</label><input id="cfg-negocio" value="${UI.esc(c.negocio)}"></div>
          <div class="campo"><label for="cfg-direccion">Dirección</label><input id="cfg-direccion" value="${UI.esc(c.direccion)}"></div>
          <div class="campo"><label for="cfg-ruc">RUC</label><input id="cfg-ruc" value="${UI.esc(c.ruc)}"></div>
          <div class="campo"><label for="cfg-moneda">Símbolo</label><input id="cfg-moneda" value="${UI.esc(c.moneda)}" maxlength="4"></div>
          <div class="campo"><label for="cfg-mesas">Cantidad de mesas</label><input id="cfg-mesas" type="number" min="1" max="80" value="${c.mesas}"></div>
          <div class="campo"><label for="cfg-caja">Cajero</label><input id="cfg-caja" value="${UI.esc(c.caja)}"></div>
        </div>
        <button class="btn primario" id="guardar-cfg">Guardar cambios</button>

        <hr style="border:0;border-top:1px solid var(--linea);margin:22px 0">

        <p class="eyebrow" style="margin:0 0 10px">Comandas de cocina</p>
        <button class="btn ${c.imprimirAlEnviar ? 'lacado' : 'fantasma'}" id="cfg-imprimir">
          ${c.imprimirAlEnviar ? 'Se imprime al enviar el pedido' : 'No se imprime sola'}
        </button>
        <p style="margin:8px 0 0;color:var(--txt-dim);font-size:.86rem;max-width:52ch">
          Con esto activado, la comanda sale por la impresora en cuanto el mozo
          manda el pedido, sin depender de que la pantalla de cocina esté abierta.
          Así trabaja el chifa hoy.
        </p>

        <hr style="border:0;border-top:1px solid var(--linea);margin:22px 0">

        <p class="eyebrow" style="margin:0 0 10px">Carta · precios y disponibilidad</p>
        <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
          <input id="buscar-carta" placeholder="Buscar plato o código" style="flex:1;min-width:180px">
          <button class="btn chico fantasma" id="nuevo-codigo">Añadir código</button>
        </div>
        <div id="editor-carta"></div>

        <hr style="border:0;border-top:1px solid var(--linea);margin:22px 0">
        <p class="eyebrow" style="margin:0 0 8px">Zona de riesgo</p>
        <button class="btn fantasma" id="borrar-todo" style="border-color:var(--alerta);color:var(--alerta)">Borrar todos los datos</button>
      </div>`;

    $('#guardar-cfg').onclick = () => {
      Store.setConfig({
        negocio: $('#cfg-negocio').value.trim() || 'Chifa',
        direccion: $('#cfg-direccion').value.trim(),
        ruc: $('#cfg-ruc').value.trim(),
        moneda: $('#cfg-moneda').value.trim() || 'S/',
        mesas: Math.min(80, Math.max(1, Number($('#cfg-mesas').value) || 16)),
        caja: $('#cfg-caja').value.trim() || 'Caja 1'
      });
      $('#abrir-mesa').dataset.listo = '';
      UI.toast('Ajustes guardados', 'ok');
      pintarTodo();
    };

    $('#cfg-imprimir').onclick = () => {
      Store.setConfig({ imprimirAlEnviar: !Store.config().imprimirAlEnviar });
      UI.toast(Store.config().imprimirAlEnviar
        ? 'La comanda se imprimirá al enviar el pedido'
        : 'La comanda ya no se imprime sola', 'ok');
      pintarAjustes();
    };

    $('#buscar-carta').oninput = pintarEditorCarta;
    $('#nuevo-codigo').onclick = () => {
      const c1 = prompt('¿Qué número le pones al plato?');
      if (!c1) return;
      const cod = Number(c1);
      if (!cod || cod < 1) return UI.toast('Número no válido', 'error');
      if (Store.plato(cod) && !confirm(`El ${cod} ya existe (${Store.plato(cod).n}). ¿Reemplazar?`)) return;
      const n = prompt('Nombre del plato');
      if (!n) return;
      const p = Number(prompt('Precio regular', '25'));
      Store.editarPlato(cod, { n: n.trim(), p: p || 0, cat: 'especiales', out: false });
      UI.toast(`Código ${cod} guardado`, 'ok');
      pintarEditorCarta();
      pintarBebidas();
    };

    $('#borrar-todo').onclick = () => {
      if (!confirm('Esto borra pedidos, ventas, ajustes y cambios de la carta. ¿Seguro?')) return;
      if (!confirm('Última confirmación: no se puede deshacer.')) return;
      Store.borrarTodo();
      localStorage.removeItem('chifa:borradores');
      location.reload();
    };

    pintarEditorCarta();
  }

  function pintarEditorCarta() {
    const f = ($('#buscar-carta') ? $('#buscar-carta').value : '').trim().toLowerCase();
    const lista = Store.carta().filter(p => !f || p.n.toLowerCase().includes(f) || String(p.c) === f);
    $('#editor-carta').innerHTML = `<table class="tabla" style="font-size:.88rem">
      <thead><tr><th>Cód</th><th>Nombre</th><th class="n">Regular</th><th class="n">Familiar</th><th></th></tr></thead>
      <tbody>${lista.map(p => `<tr data-c="${p.c}" style="${p.out ? 'opacity:.5' : ''}">
        <td>${UI.chapa(p.c, p.bar ? 'bar' : '')}</td>
        <td><input data-f="n" value="${UI.esc(p.n)}" style="width:100%;border-color:transparent;background:transparent"></td>
        <td class="n"><input data-f="p" type="number" step="0.5" min="0" value="${p.p}" style="width:74px;text-align:right;border-color:transparent;background:transparent"></td>
        <td class="n"><input data-f="pf" type="number" step="0.5" min="0" value="${p.pf || ''}" placeholder="—" style="width:74px;text-align:right;border-color:transparent;background:transparent"></td>
        <td class="n"><button class="btn chico fantasma" data-out="${p.c}">${p.out ? 'Agotado' : 'Hay'}</button></td>
      </tr>`).join('')}</tbody>
    </table>`;

    $('#editor-carta').querySelectorAll('input').forEach(inp => {
      inp.onchange = () => {
        const cod = Number(inp.closest('tr').dataset.c);
        const campo = inp.dataset.f;
        const valor = campo === 'n' ? inp.value.trim() : (inp.value === '' ? null : Number(inp.value));
        Store.editarPlato(cod, { [campo]: valor });
        UI.toast('Carta actualizada', 'ok');
        pintarBebidas();
      };
    });
    $('#editor-carta').querySelectorAll('[data-out]').forEach(b => {
      b.onclick = () => {
        const cod = Number(b.dataset.out);
        Store.editarPlato(cod, { out: !Store.plato(cod).out });
        pintarEditorCarta();
        pintarBebidas();
      };
    });
  }

  // ── Pestañas ─────────────────────────────────────────────────────────────
  function cambiarTab(tab) {
    st.tab = tab;
    $('#tabs').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    $('#panel-cuenta').style.display = tab === 'cuenta' ? '' : 'none';
    $('#panel-ventas').style.display = tab === 'ventas' ? '' : 'none';
    $('#panel-ajustes').style.display = tab === 'ajustes' ? '' : 'none';
    $('#rapido').style.display = tab === 'cuenta' ? '' : 'none';
    if (tab === 'ventas') pintarVentas();
    if (tab === 'ajustes') pintarAjustes();
  }
  $('#tabs').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b) cambiarTab(b.dataset.tab);
  });

  // ── Pintado general ─────────────────────────────────────────────────────
  function pintarTodo() {
    pintarCuentas();
    pintarDetalle();
    pintarCobro();
    if (st.tab === 'ventas') pintarVentas();
  }

  pintarBebidas();
  pintarTodo();
  Store.on(() => {
    // Si la mesa abierta ya se cobró desde otra pestaña, se limpia la selección.
    if (st.mesa && !Store.cuentaDe(st.mesa) && st.tab === 'cuenta') pintarTodo();
    else pintarTodo();
  });
  setInterval(() => { $('#reloj').textContent = UI.horaSeg(Date.now()); }, 1000);
  $('#reloj').textContent = UI.horaSeg(Date.now());
})();
