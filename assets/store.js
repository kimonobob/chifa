/* Estado compartido del chifa.
   Guarda en localStorage y avisa a las otras pestañas por BroadcastChannel,
   así el mozo, la cocina y la caja ven lo mismo al instante.               */

const Store = (() => {
  const KEY = 'chifa:estado:v1';
  const canal = 'BroadcastChannel' in window ? new BroadcastChannel('chifa') : null;
  const oyentes = new Set();
  let cache = null;

  function hoy() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  const inicial = () => ({
    version: 1,
    pedidos: [],
    ventas: [],
    cartaEdits: {},
    seq: { pedido: 0, venta: 0 },
    dia: hoy(),
    config: {
      mozo: 'Mozo 1',
      caja: 'Caja 1',
      mesas: 16,
      negocio: 'Chifa Chifaa',
      direccion: 'Av. Principal 123',
      ruc: '',
      moneda: 'S/',
      modoImpresion: 'manual',    // 'manual' | 'auto'
      teclaImpresion: 'p',        // tecla que dispara la impresión en cocina
      formatoImpresion: 'comanda',// 'comanda' (un papel por pedido) | 'plato'
      sonido: true,
      letraCocina: 1             // multiplicador del tamaño de letra en cocina
    }
  });

  function leer() {
    if (cache) return cache;
    try {
      const raw = localStorage.getItem(KEY);
      cache = raw ? { ...inicial(), ...JSON.parse(raw) } : inicial();
      cache.config = { ...inicial().config, ...(cache.config || {}) };
    } catch (e) {
      cache = inicial();
    }
    return cache;
  }

  function escribir(s) {
    cache = s;
    localStorage.setItem(KEY, JSON.stringify(s));
  }

  /* Toda mutación relee del disco primero: si otra pestaña escribió mientras
     esta tenía una copia vieja, ese cambio no se pierde. */
  function mutar(fn) {
    cache = null;
    const s = leer();
    const r = fn(s);
    escribir(s);
    avisar('cambio');
    return r;
  }

  function avisar(tipo, datos) {
    if (canal) canal.postMessage({ tipo, datos });
    oyentes.forEach(cb => cb(tipo, datos));
  }

  if (canal) {
    canal.onmessage = e => {
      cache = null;
      oyentes.forEach(cb => cb(e.data.tipo, e.data.datos));
    };
  }
  window.addEventListener('storage', e => {
    if (e.key !== KEY) return;
    cache = null;
    oyentes.forEach(cb => cb('cambio'));
  });

  // ── Carta ────────────────────────────────────────────────────────────────
  function carta() {
    const edits = leer().cartaEdits || {};
    const base = CARTA_BASE.map(p => ({ ...p, ...(edits[p.c] || {}) }));
    Object.keys(edits).forEach(c => {   // códigos añadidos a mano
      if (!base.some(p => p.c === Number(c))) base.push({ c: Number(c), ...edits[c] });
    });
    return base.sort((a, b) => a.c - b.c);
  }

  function plato(codigo) {
    return carta().find(p => p.c === Number(codigo)) || null;
  }

  function editarPlato(codigo, campos) {
    mutar(s => { s.cartaEdits[codigo] = { ...(s.cartaEdits[codigo] || {}), ...campos }; });
  }

  // ── Mesas ────────────────────────────────────────────────────────────────
  function mesas() {
    const n = leer().config.mesas;
    const lista = [];
    for (let i = 1; i <= n; i++) lista.push(String(i));
    return lista.concat(['Llevar', 'Delivery', 'Barra']);
  }

  // ── Pedidos ──────────────────────────────────────────────────────────────
  function pedidoNuevo({ mesa, mozo, items, origen = 'mozo' }) {
    return mutar(s => {
      if (s.dia !== hoy()) { s.dia = hoy(); s.seq.pedido = 0; }
      s.seq.pedido += 1;
      const p = {
        id: `P${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
        num: s.seq.pedido,
        mesa: String(mesa),
        mozo: mozo || s.config.mozo,
        origen,
        creado: Date.now(),
        estado: origen === 'caja' ? 'servido' : 'nuevo',
        impreso: null,
        pagado: false,
        items: items.map(i => nuevoItem(i, origen === 'caja'))
      };
      s.pedidos.push(p);
      return p;
    });
  }

  /* Venta directa de caja: se pega a la ronda de caja que ya esté abierta en
     esa mesa, para no llenar la cuenta de tickets de una línea. */
  function agregarItem(mesa, item) {
    return mutar(s => {
      let p = s.pedidos.find(x =>
        x.mesa === String(mesa) && x.origen === 'caja' && !x.pagado && x.estado !== 'anulado');

      if (!p) {
        if (s.dia !== hoy()) { s.dia = hoy(); s.seq.pedido = 0; }
        s.seq.pedido += 1;
        p = {
          id: `P${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
          num: s.seq.pedido,
          mesa: String(mesa),
          mozo: s.config.caja,
          origen: 'caja',
          creado: Date.now(),
          estado: 'servido',
          impreso: null,
          pagado: false,
          items: []
        };
        s.pedidos.push(p);
      }

      const igual = p.items.find(i =>
        i.codigo === item.codigo &&
        i.tamano === (item.tamano || 'R') &&
        i.notas === (item.notas || ''));
      if (igual) igual.cant += item.cant;
      else p.items.push(nuevoItem(item, true));
      return p;
    });
  }

  function nuevoItem(i, listo = false) {
    return {
      uid: `I${Math.random().toString(36).slice(2, 9)}`,
      codigo: i.codigo,
      nombre: i.nombre,
      precio: i.precio,
      precioF: i.precioF || null,
      cant: i.cant,
      tamano: i.tamano || 'R',
      notas: i.notas || '',
      bar: !!i.bar,
      listo
    };
  }

  function estadoPedido(id, estado) {
    mutar(s => {
      const p = s.pedidos.find(x => x.id === id);
      if (!p) return;
      p.estado = estado;
      if (estado === 'preparando' && !p.inicio) p.inicio = Date.now();
      if (estado === 'listo') p.listoEn = Date.now();
      if (estado === 'listo' || estado === 'servido') p.items.forEach(i => (i.listo = true));
    });
  }

  function marcarItem(pedidoId, uid, listo) {
    mutar(s => {
      const p = s.pedidos.find(x => x.id === pedidoId);
      if (!p) return;
      const i = p.items.find(y => y.uid === uid);
      if (i) i.listo = listo;
      if (p.estado === 'nuevo' && listo) { p.estado = 'preparando'; p.inicio = Date.now(); }
    });
  }

  function anularPedido(id, motivo) {
    mutar(s => {
      const p = s.pedidos.find(x => x.id === id);
      if (p) { p.estado = 'anulado'; p.motivo = motivo || ''; }
    });
  }

  function quitarItem(pedidoId, uid) {
    mutar(s => {
      const p = s.pedidos.find(x => x.id === pedidoId);
      if (!p) return;
      p.items = p.items.filter(i => i.uid !== uid);
      if (!p.items.length) p.estado = 'anulado';
    });
  }

  function marcarImpreso(id) {
    mutar(s => {
      const p = s.pedidos.find(x => x.id === id);
      if (p) p.impreso = Date.now();
    });
  }

  function pedidosActivos() {
    return leer().pedidos.filter(p => p.estado !== 'anulado');
  }

  function pedidosCocina() {
    return pedidosActivos()
      .filter(p => p.origen !== 'caja' && ['nuevo', 'preparando', 'listo'].includes(p.estado))
      .sort((a, b) => a.creado - b.creado);
  }

  // ── Cuentas por mesa ─────────────────────────────────────────────────────
  function precioItem(i) {
    return i.tamano === 'F' && i.precioF ? i.precioF : i.precio;
  }

  function cuentas() {
    const abiertos = pedidosActivos().filter(p => !p.pagado);
    const porMesa = new Map();
    abiertos.forEach(p => {
      if (!porMesa.has(p.mesa)) porMesa.set(p.mesa, { mesa: p.mesa, pedidos: [], total: 0, desde: p.creado });
      const m = porMesa.get(p.mesa);
      m.pedidos.push(p);
      m.desde = Math.min(m.desde, p.creado);
      p.items.forEach(i => (m.total += precioItem(i) * i.cant));
    });
    return [...porMesa.values()].sort((a, b) => {
      const na = Number(a.mesa), nb = Number(b.mesa);
      if (isNaN(na) && isNaN(nb)) return a.mesa.localeCompare(b.mesa);
      if (isNaN(na)) return 1;
      if (isNaN(nb)) return -1;
      return na - nb;
    });
  }

  function cuentaDe(mesa) {
    return cuentas().find(c => c.mesa === String(mesa)) || null;
  }

  /* Junta los items repetidos de todas las rondas de una mesa en una sola
     lista de líneas cobrables. */
  function lineasDe(mesa) {
    const c = cuentaDe(mesa);
    if (!c) return [];
    const lineas = [];
    c.pedidos.forEach(p => p.items.forEach(i => {
      const pu = precioItem(i);
      const ex = lineas.find(l => l.codigo === i.codigo && l.tamano === i.tamano && l.pu === pu);
      if (ex) ex.cant += i.cant;
      else lineas.push({ codigo: i.codigo, nombre: i.nombre, tamano: i.tamano, cant: i.cant, pu });
    }));
    return lineas.sort((a, b) => a.codigo - b.codigo);
  }

  function cobrar(mesa, { descuento = 0, metodo = 'Efectivo', recibido = 0, nota = '' }) {
    const lineas = lineasDe(mesa);
    if (!lineas.length) return null;
    return mutar(s => {
      const pedidos = s.pedidos.filter(p => p.mesa === String(mesa) && !p.pagado && p.estado !== 'anulado');
      const subtotal = lineas.reduce((t, l) => t + l.pu * l.cant, 0);
      const total = Math.max(0, +(subtotal - descuento).toFixed(2));
      if (s.dia !== hoy()) { s.dia = hoy(); s.seq.venta = 0; }
      s.seq.venta += 1;
      const venta = {
        id: `V${Date.now().toString(36)}`,
        num: s.seq.venta,
        mesa: String(mesa),
        cerrado: Date.now(),
        dia: hoy(),
        cajero: s.config.caja,
        lineas, subtotal, descuento, total, metodo, nota,
        recibido: metodo === 'Efectivo' ? recibido : total,
        vuelto: metodo === 'Efectivo' ? +(recibido - total).toFixed(2) : 0,
        pedidos: pedidos.map(p => p.num)
      };
      s.ventas.push(venta);
      pedidos.forEach(p => {
        p.pagado = true;
        p.ventaId = venta.id;
        if (p.estado !== 'servido') p.estado = 'servido';
      });
      return venta;
    });
  }

  function ventasDia(dia) {
    return leer().ventas.filter(v => v.dia === (dia || hoy()));
  }

  function resumenDia(dia) {
    const vs = ventasDia(dia);
    const metodos = {}, platos = {};
    let total = 0, descuentos = 0;
    vs.forEach(v => {
      total += v.total;
      descuentos += v.descuento;
      metodos[v.metodo] = (metodos[v.metodo] || 0) + v.total;
      v.lineas.forEach(l => {
        const k = `${l.codigo}|${l.nombre}`;
        platos[k] = (platos[k] || 0) + l.cant;
      });
    });
    const top = Object.entries(platos)
      .map(([k, cant]) => ({ codigo: Number(k.split('|')[0]), nombre: k.split('|')[1], cant }))
      .sort((a, b) => b.cant - a.cant);
    return { ventas: vs.length, total, descuentos, metodos, top, promedio: vs.length ? total / vs.length : 0 };
  }

  // ── Config ───────────────────────────────────────────────────────────────
  function config() { return leer().config; }
  function setConfig(campos) { mutar(s => { s.config = { ...s.config, ...campos }; }); }

  function cerrarDia() {
    mutar(s => {
      s.pedidos = s.pedidos.filter(p => !p.pagado && p.estado !== 'anulado');
      s.dia = hoy();
    });
  }

  function borrarTodo() {
    localStorage.removeItem(KEY);
    cache = null;
    avisar('cambio');
  }

  return {
    on: cb => { oyentes.add(cb); return () => oyentes.delete(cb); },
    estado: leer, hoy, avisar,
    carta, plato, editarPlato, mesas,
    pedidoNuevo, agregarItem, estadoPedido, marcarItem, anularPedido, quitarItem, marcarImpreso,
    pedidosActivos, pedidosCocina,
    cuentas, cuentaDe, lineasDe, precioItem, cobrar, ventasDia, resumenDia,
    config, setConfig, cerrarDia, borrarTodo
  };
})();

// ── Utilidades compartidas ─────────────────────────────────────────────────
const UI = {
  soles(n) { return `${Store.config().moneda} ${Number(n || 0).toFixed(2)}`; },
  hora(ts) { return new Date(ts).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }); },
  horaSeg(ts) { return new Date(ts).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }); },
  fecha(ts) { return new Date(ts).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }); },
  transcurrido(ts) {
    const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    const m = Math.floor(s / 60);
    return m < 60 ? `${m}:${String(s % 60).padStart(2, '0')}` : `${Math.floor(m / 60)}h ${m % 60}m`;
  },
  minutos(ts) { return (Date.now() - ts) / 60000; },
  esc(t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  },
  chapa(codigo, extra = '') {
    return `<span class="chapa ${extra}">${String(codigo).padStart(2, '0')}</span>`;
  },
  toast(msg, tipo = '') {
    let z = document.querySelector('.toasts');
    if (!z) { z = document.createElement('div'); z.className = 'toasts'; document.body.appendChild(z); }
    const t = document.createElement('div');
    t.className = `toast ${tipo}`;
    t.textContent = msg;
    z.appendChild(t);
    setTimeout(() => { t.classList.add('fuera'); setTimeout(() => t.remove(), 300); }, 2400);
  },
  /* Campanilla sintetizada: sin archivos externos, funciona sin internet. */
  campana(veces = 1) {
    if (!Store.config().sonido) return;
    try {
      const ctx = UI._ctx || (UI._ctx = new (window.AudioContext || window.webkitAudioContext)());
      if (ctx.state === 'suspended') ctx.resume();
      for (let k = 0; k < veces; k++) {
        [1245, 830].forEach((f, idx) => {
          const o = ctx.createOscillator(), g = ctx.createGain();
          const t0 = ctx.currentTime + k * 0.42 + idx * 0.11;
          o.type = 'sine';
          o.frequency.value = f;
          g.gain.setValueAtTime(0, t0);
          g.gain.linearRampToValueAtTime(0.2, t0 + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0008, t0 + 0.7);
          o.connect(g).connect(ctx.destination);
          o.start(t0);
          o.stop(t0 + 0.72);
        });
      }
    } catch (e) { /* sin audio disponible */ }
  }
};
