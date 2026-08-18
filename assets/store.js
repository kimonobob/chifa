/* Estado compartido del chifa.
   Guarda en localStorage y avisa a las otras pestañas por BroadcastChannel,
   así el mozo, la cocina y la caja ven lo mismo al instante.               */

const Store = (() => {
  /* v2: entró la carta real de Cuatro Dragones. Los datos de la v1 tenían
     otros códigos y otros precios, así que se parte de cero en vez de
     mezclarlos y sacar cuentas equivocadas. */
  const KEY = 'chifa:estado:v2';
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
    grupos: [],          // mesas unidas: [{ id, mesas:['3','4'], principal:'3' }]
    cartaEdits: {},
    seq: { pedido: 0, venta: 0 },
    dia: hoy(),
    config: {
      mozo: 'Mozo 1',
      caja: 'Caja 1',
      mesas: 10,
      negocio: 'Chifa Cuatro Dragones',
      direccion: '',
      ruc: '',
      moneda: 'S/',
      modoImpresion: 'manual',    // 'manual' | 'auto'
      teclaImpresion: 'p',        // tecla que dispara la impresión en cocina
      formatoImpresion: 'comanda',// 'comanda' (un papel por pedido) | 'plato'
      sonido: true,
      letraCocina: 1,            // multiplicador del tamaño de letra en cocina
      vistaCocina: 'tablero',    // 'tablero' | 'uno' (plato por plato)
      ordenCocina: 'llegada'     // 'llegada' | 'rapido' | 'demorado'
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

  /* El mozo no ve Delivery: esos pedidos los toma la caja. */
  const SOLO_CAJA = ['Delivery'];
  function mesasMozo() {
    return mesas().filter(m => !SOLO_CAJA.includes(m));
  }

  function minutosPlato(codigo) {
    const p = plato(codigo);
    if (!p) return 10;
    if (p.min) return p.min;
    return MINUTOS_CATEGORIA[p.cat] || 10;
  }

  /* Las numeradas van primero y en orden; después las de nombre. */
  function ordenMesa(a, b) {
    const na = Number(a), nb = Number(b);
    if (isNaN(na) && isNaN(nb)) return String(a).localeCompare(String(b));
    if (isNaN(na)) return 1;
    if (isNaN(nb)) return -1;
    return na - nb;
  }

  // ── Mesas unidas ─────────────────────────────────────────────────────────
  /* Cuando el mozo junta dos mesas, los pedidos siguen guardándose con su
     mesa original: lo que se une es la CUENTA. Así, al separarlas, cada una
     se queda con lo suyo. */
  function grupos() { return leer().grupos || []; }

  function grupoDe(mesa) {
    return grupos().find(g => g.mesas.includes(String(mesa))) || null;
  }

  /* Todas las mesas que comparten cuenta con esta (incluida ella misma). */
  function mesasDe(mesa) {
    const g = grupoDe(mesa);
    return g ? g.mesas.slice() : [String(mesa)];
  }

  /* Bajo qué mesa se agrupa la cuenta: la principal del grupo, o ella misma. */
  function claveCuenta(mesa) {
    const g = grupoDe(mesa);
    return g ? g.principal : String(mesa);
  }

  function unirMesas(a, b) {
    a = String(a); b = String(b);
    if (a === b) return null;
    return mutar(s => {
      if (!s.grupos) s.grupos = [];
      const ga = s.grupos.find(g => g.mesas.includes(a));
      const gb = s.grupos.find(g => g.mesas.includes(b));
      const juntas = new Set([
        ...(ga ? ga.mesas : [a]),
        ...(gb ? gb.mesas : [b])
      ]);
      s.grupos = s.grupos.filter(g => g !== ga && g !== gb);
      const lista = [...juntas].sort(ordenMesa);
      const g = {
        id: `G${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
        mesas: lista,
        principal: lista[0],
        desde: Date.now()
      };
      s.grupos.push(g);
      return g;
    });
  }

  /* Separa el grupo completo al que pertenece esa mesa. */
  function separarMesas(mesa) {
    mutar(s => {
      s.grupos = (s.grupos || []).filter(g => !g.mesas.includes(String(mesa)));
    });
  }

  const etiqueta = m => (isNaN(Number(m)) ? m : `Mesa ${m}`);

  /* "Mesa 3" · "Mesas 3 + 4" · "Llevar" */
  function nombreCuenta(mesa) {
    const ms = mesasDe(mesa);
    if (ms.length === 1) return etiqueta(ms[0]);
    return 'Mesas ' + ms.join(' + ');
  }

  /* Versión corta para el ticket y las tarjetas de cocina: "3+4" */
  function mesaCorta(mesa) {
    return mesasDe(mesa).join('+');
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
      detalle: i.detalle || '',      // qué trae el plato, para la cocina
      bar: !!i.bar,
      prio: 0,               // la cocina lo usa para adelantar o postergar
      hechas: listo ? i.cant : 0,   // unidades ya despachadas de esta línea
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
      if (estado === 'listo' || estado === 'servido') {
        p.items.forEach(i => {
          i.listo = true;
          i.hechas = i.cant;
          i.tiempos = Array.from({ length: i.cant }, (_, k) => (i.tiempos || [])[k] || Date.now());
        });
      }
    });
  }

  function marcarItem(pedidoId, uid, listo) {
    mutar(s => {
      const p = s.pedidos.find(x => x.id === pedidoId);
      if (!p) return;
      const i = p.items.find(y => y.uid === uid);
      if (i) {
        i.listo = listo;
        i.hechas = listo ? i.cant : 0;
        i.tiempos = listo
          ? Array.from({ length: i.cant }, (_, k) => (i.tiempos || [])[k] || Date.now())
          : [];
      }
      if (p.estado === 'nuevo' && listo) { p.estado = 'preparando'; p.inicio = Date.now(); }
    });
  }

  /* Despacha UNA unidad de la línea. Un "3 × chaufa" se marca tres veces,
     porque el cocinero los saca de a uno. */
  function marcarUnidad(pedidoId, uid) {
    mutar(s => {
      const p = s.pedidos.find(x => x.id === pedidoId);
      if (!p) return;
      const i = p.items.find(y => y.uid === uid);
      if (!i) return;
      if ((i.hechas || 0) >= i.cant) return;
      i.hechas = (i.hechas || 0) + 1;
      i.tiempos = (i.tiempos || []).concat(Date.now());   // cuándo salió cada unidad
      i.listo = i.hechas >= i.cant;
      if (p.estado === 'nuevo') { p.estado = 'preparando'; p.inicio = Date.now(); }
      // Si ya salió todo lo que cocina, la comanda pasa a "listo".
      const deCocina = p.items.filter(x => !x.bar);
      if (deCocina.length && deCocina.every(x => x.listo)) {
        p.estado = 'listo';
        p.listoEn = Date.now();
      }
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

  /* La cola vista plato por plato: cada unidad por separado, no por comanda.
     Un "3 × chaufa" se abre en tres platos, porque el cocinero los saca de
     a uno. */
  function platosPendientes() {
    const cola = [];
    pedidosCocina().forEach(p => {
      p.items.forEach(i => {
        if (i.bar || i.listo) return;
        for (let u = i.hechas || 0; u < i.cant; u++) {
          cola.push({
            clave: `${p.id}|${i.uid}|${u}`,
            pedidoId: p.id, uid: i.uid, unidad: u,
            num: p.num, mesa: p.mesa, mozo: p.mozo, creado: p.creado,
            estado: p.estado,
            codigo: i.codigo, nombre: i.nombre, tamano: i.tamano,
            notas: i.notas, detalle: i.detalle || '', cant: i.cant,
            prio: i.prio || 0,
            minutos: minutosPlato(i.codigo)
          });
        }
      });
    });
    return cola;
  }

  /* Deshacer: el cocinero marcó un plato por equivocación. */
  function desmarcarUnidad(pedidoId, uid) {
    mutar(s => {
      const p = s.pedidos.find(x => x.id === pedidoId);
      if (!p) return;
      const i = p.items.find(y => y.uid === uid);
      if (!i || !(i.hechas > 0)) return;
      i.hechas -= 1;
      i.tiempos = (i.tiempos || []).slice(0, i.hechas);
      i.listo = i.hechas >= i.cant;
      if (p.estado === 'listo' || p.estado === 'servido') {
        p.estado = 'preparando';
        delete p.listoEn;
      }
    });
  }

  /* Los platos que ya salieron, del más reciente al más antiguo. */
  function platosEntregados(limite = 30) {
    const lista = [];
    pedidosActivos()
      .filter(p => p.origen !== 'caja' && !p.pagado)
      .forEach(p => {
        p.items.forEach(i => {
          if (i.bar) return;
          const t = i.tiempos || [];
          for (let u = 0; u < (i.hechas || 0); u++) {
            lista.push({
              clave: `${p.id}|${i.uid}|${u}`,
              pedidoId: p.id, uid: i.uid, unidad: u,
              codigo: i.codigo, nombre: i.nombre, tamano: i.tamano,
              mesa: p.mesa, num: p.num, cant: i.cant,
              cuando: t[u] || p.listoEn || p.creado
            });
          }
        });
      });
    return lista.sort((a, b) => b.cuando - a.cuando).slice(0, limite);
  }

  /* Adelantar un plato (el más fácil, el que ya casi sale) o mandarlo al
     final de la cola. */
  function priorizarItem(pedidoId, uid, alFinal = false) {
    mutar(s => {
      const activos = s.pedidos
        .filter(p => p.estado !== 'anulado' && !p.pagado && p.origen !== 'caja')
        .flatMap(p => p.items.filter(i => !i.listo && !i.bar));
      if (!activos.length) return;
      const prios = activos.map(i => i.prio || 0);
      const nueva = alFinal ? Math.max(...prios) + 1 : Math.min(...prios) - 1;
      const p = s.pedidos.find(x => x.id === pedidoId);
      const i = p && p.items.find(y => y.uid === uid);
      if (i) i.prio = nueva;
    });
  }

  // ── Cuentas por mesa ─────────────────────────────────────────────────────
  function precioItem(i) {
    return i.tamano === 'F' && i.precioF ? i.precioF : i.precio;
  }

  /* Una cuenta por mesa; las mesas unidas comparten una sola. */
  function cuentas() {
    const abiertos = pedidosActivos().filter(p => !p.pagado);
    const porClave = new Map();
    abiertos.forEach(p => {
      const clave = claveCuenta(p.mesa);
      if (!porClave.has(clave)) {
        porClave.set(clave, {
          mesa: clave,
          mesas: mesasDe(clave),
          nombre: nombreCuenta(clave),
          pedidos: [], total: 0, desde: p.creado
        });
      }
      const m = porClave.get(clave);
      m.pedidos.push(p);
      m.desde = Math.min(m.desde, p.creado);
      p.items.forEach(i => (m.total += precioItem(i) * i.cant));
    });
    return [...porClave.values()].sort((a, b) => ordenMesa(a.mesa, b.mesa));
  }

  function cuentaDe(mesa) {
    return cuentas().find(c => c.mesa === claveCuenta(mesa)) || null;
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
    const delGrupo = mesasDe(mesa);          // cobra todas las mesas unidas
    const nombre = nombreCuenta(mesa);
    const corta = mesaCorta(mesa);
    return mutar(s => {
      const pedidos = s.pedidos.filter(p => delGrupo.includes(p.mesa) && !p.pagado && p.estado !== 'anulado');
      const subtotal = lineas.reduce((t, l) => t + l.pu * l.cant, 0);
      const total = Math.max(0, +(subtotal - descuento).toFixed(2));
      if (s.dia !== hoy()) { s.dia = hoy(); s.seq.venta = 0; }
      s.seq.venta += 1;
      const venta = {
        id: `V${Date.now().toString(36)}`,
        num: s.seq.venta,
        mesa: String(claveCuenta(mesa)),
        mesas: delGrupo,
        nombreMesa: nombre,
        mesaCorta: corta,
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
      // Cobrada la cuenta, las mesas vuelven a quedar sueltas.
      s.grupos = (s.grupos || []).filter(g => !g.mesas.some(m => delGrupo.includes(m)));
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
    carta, plato, editarPlato, mesas, mesasMozo, ordenMesa, minutosPlato,
    platosPendientes, platosEntregados, priorizarItem, desmarcarUnidad,
    grupos, grupoDe, mesasDe, claveCuenta, unirMesas, separarMesas, nombreCuenta, mesaCorta,
    pedidoNuevo, agregarItem, estadoPedido, marcarItem, marcarUnidad,
    anularPedido, quitarItem, marcarImpreso,
    pedidosActivos, pedidosCocina,
    cuentas, cuentaDe, lineasDe, precioItem, cobrar, ventasDia, resumenDia,
    config, setConfig, cerrarDia, borrarTodo
  };
})();

/* ── Búsqueda de platos ─────────────────────────────────────────────────────
   El mozo escribe rápido y no siempre igual que la carta: "tipacay" por
   "Tipakay", "arros" por "arroz", sin tildes. Se normalizan las dos partes
   antes de comparar, guardando el mapa de posiciones para poder resaltar
   sobre el nombre original.                                                */
const Texto = (() => {
  const EQUIV = { k: 'c', z: 's', v: 'b' };

  function conMapa(texto, sinEspacios) {
    const s = String(texto);
    let norm = '';
    const mapa = [];
    for (let i = 0; i < s.length; i++) {
      let c = s[i].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (!c) continue;                       // era solo una tilde
      c = c[0];
      if (sinEspacios && /\s/.test(c)) continue;
      if (EQUIV[c]) c = EQUIV[c];
      norm += c;
      mapa.push(i);
    }
    return { norm, mapa };
  }

  const normalizar = t => conMapa(t).norm;

  /* ¿Están todas las palabras escritas dentro del texto? Devuelve además
     dónde caen, en posiciones del texto original. */
  function coincide(texto, consulta) {
    const palabras = normalizar(consulta).split(' ').filter(Boolean);
    if (!palabras.length) return { ok: true, tramos: [] };
    // 1) Cada palabra escrita tiene que aparecer en el nombre.
    const { norm, mapa } = conMapa(texto);
    const tramos = [];
    let todas = true;
    for (const p of palabras) {
      const i = norm.indexOf(p);
      if (i === -1) { todas = false; break; }
      tramos.push([mapa[i], mapa[i + p.length - 1] + 1]);
    }
    if (todas) return { ok: true, tramos };

    /* 2) Todo junto, ignorando los espacios: la carta dice "Pollo Ti Pa Kay"
       pero el mozo escribe "tipacay" de corrido. */
    const seguido = palabras.join('');
    const pegado = conMapa(texto, true);
    const j = pegado.norm.indexOf(seguido);
    if (j === -1) return { ok: false, tramos: [] };
    return {
      ok: true,
      tramos: [[pegado.mapa[j], pegado.mapa[j + seguido.length - 1] + 1]]
    };
  }

  /* Devuelve el nombre con <mark> sobre lo que coincidió. */
  function resaltar(texto, consulta) {
    const { ok, tramos } = coincide(texto, consulta);
    if (!ok || !tramos.length) return UI.esc(texto);
    const unidos = [];
    tramos.slice().sort((a, b) => a[0] - b[0]).forEach(t => {
      const u = unidos[unidos.length - 1];
      if (u && t[0] <= u[1]) u[1] = Math.max(u[1], t[1]);
      else unidos.push(t.slice());
    });
    let html = '', pos = 0;
    unidos.forEach(([a, b]) => {
      html += UI.esc(texto.slice(pos, a)) + '<mark>' + UI.esc(texto.slice(a, b)) + '</mark>';
      pos = b;
    });
    return html + UI.esc(texto.slice(pos));
  }

  /* Solo dígitos busca por código; lo demás, por nombre. */
  function filtrarCarta(lista, consulta) {
    const q = String(consulta || '').trim();
    if (!q) return lista;
    if (/^\d+$/.test(q)) return lista.filter(p => String(p.c).startsWith(q));
    return lista.filter(p => coincide(p.n, q).ok);
  }

  return { normalizar, coincide, resaltar, filtrarCarta };
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
