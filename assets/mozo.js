/* Módulo del mozo: marcar códigos y enviar rondas a cocina. */

(() => {
  const $ = s => document.querySelector(s);
  const BORRADORES = 'chifa:borradores';

  const st = {
    mesa: null,
    buf: '',                 // dígitos marcados, máximo 3
    cant: 1,
    tamano: 'R',
    notas: new Set(),
    filtro: '',
    borradores: cargarBorradores()
  };

  /* El almacenamiento puede estar bloqueado (modo privado, políticas del
     equipo). Si falla, la pantalla sigue funcionando; solo no recuerda nada. */
  function cargarBorradores() {
    try { return JSON.parse(localStorage.getItem(BORRADORES)) || {}; }
    catch (e) { return {}; }
  }
  function guardarBorradores() {
    try { localStorage.setItem(BORRADORES, JSON.stringify(st.borradores)); }
    catch (e) { /* sin persistencia */ }
  }
  function recordarMesa(m) {
    try { sessionStorage.setItem('chifa:mesa', m); } catch (e) {}
  }
  function mesaRecordada() {
    try { return sessionStorage.getItem('chifa:mesa'); } catch (e) { return null; }
  }
  const borrador = () => (st.mesa ? (st.borradores[st.mesa] || (st.borradores[st.mesa] = [])) : []);

  const platoActual = () => (st.buf ? Store.plato(Number(st.buf)) : null);

  // ── Mesas ────────────────────────────────────────────────────────────────
  function pintarMesas() {
    const cuentas = Store.cuentas();
    $('#mesas').innerHTML = Store.mesas().map(m => {
      const c = cuentas.find(x => x.mesa === m);
      const pend = (st.borradores[m] || []).length;
      const clases = ['mesa-btn'];
      if (c) clases.push('ocupada');
      if (m === st.mesa) clases.push('activa');
      const etq = isNaN(Number(m)) ? m : `Mesa ${m}`;
      return `<button type="button" class="${clases.join(' ')}" data-mesa="${UI.esc(m)}" title="${etq}">
        ${isNaN(Number(m)) ? UI.esc(m.slice(0, 4)) : UI.esc(m)}
        <small>${pend ? `+${pend}` : c ? c.total.toFixed(0) : '·'}</small>
      </button>`;
    }).join('');
  }

  // ── Lector ───────────────────────────────────────────────────────────────
  function pintarLector() {
    const p = platoActual();
    const d = st.buf.padStart(3, ' ').split('');
    $('#slots').innerHTML = d.map((ch, i) => {
      const vacio = ch === ' ';
      const cursor = i === st.buf.length - 1 || (!st.buf && i === 2);
      return `<span class="slot ${vacio ? 'vacio' : ''} ${cursor && st.buf ? 'cursor' : ''}">${vacio ? '·' : ch}</span>`;
    }).join('');

    const nom = $('#nombre'), pre = $('#precio'), cat = $('#cat');
    if (!st.buf) {
      nom.textContent = 'Marca un código';
      nom.classList.add('libre');
      pre.textContent = '';
      cat.textContent = 'Del 1 al 128';
    } else if (!p) {
      nom.textContent = 'Código sin asignar';
      nom.classList.add('libre');
      pre.textContent = '';
      cat.textContent = 'Revisa la carta';
    } else if (p.out) {
      nom.textContent = p.n;
      nom.classList.add('libre');
      pre.textContent = '';
      cat.innerHTML = '<span class="pill nuevo">Agotado · cocina lo marcó</span>';
    } else {
      nom.textContent = p.n;
      nom.classList.remove('libre');
      pre.textContent = UI.soles(st.tamano === 'F' && p.pf ? p.pf : p.p);
      const c = CATEGORIAS.find(x => x.id === p.cat);
      cat.textContent = (c ? c.nombre : '') + (p.bar ? ' · barra' : '');
    }

    const puedeF = !!(p && p.pf);
    $('#tamanos').querySelectorAll('button').forEach(b => {
      b.classList.toggle('on', b.dataset.t === st.tamano);
      if (b.dataset.t === 'F') b.disabled = !puedeF;
    });
    $('#cant').textContent = st.cant;
    $('#keypad .agregar').disabled = !p || p.out || !st.mesa;
  }

  // ── Rueda de códigos ─────────────────────────────────────────────────────
  const rueda = $('#rueda');
  let bloqueoScroll = false, tScroll = null;

  function pintarRueda() {
    const f = st.filtro.trim().toLowerCase();
    const lista = Store.carta().filter(p => !f || p.n.toLowerCase().includes(f) || String(p.c) === f);
    rueda.innerHTML = lista.map(p => `
      <button type="button" class="rueda-item" data-c="${p.c}" style="${p.out ? 'opacity:.28' : ''}">
        <span class="rn">${String(p.c).padStart(2, '0')}</span>
        <span class="rt">${p.out ? 'AGOTADO' : UI.esc(p.n)}</span>
      </button>`).join('') || '<div class="vacio-msg">Nada con ese nombre</div>';
    marcarCentro();
  }

  function marcarCentro() {
    const n = Number(st.buf);
    rueda.querySelectorAll('.rueda-item').forEach(el => {
      el.classList.toggle('centro', Number(el.dataset.c) === n);
    });
  }

  function centrar(codigo, suave = true) {
    const el = rueda.querySelector(`.rueda-item[data-c="${codigo}"]`);
    if (!el) return;
    bloqueoScroll = true;
    el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: suave ? 'smooth' : 'auto' });
    clearTimeout(centrar._t);
    centrar._t = setTimeout(() => { bloqueoScroll = false; }, 420);
  }

  function codigoEnCentro() {
    const caja = rueda.getBoundingClientRect();
    const cx = caja.left + caja.width / 2;
    let mejor = null, dist = Infinity;
    rueda.querySelectorAll('.rueda-item').forEach(el => {
      const r = el.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - cx);
      if (d < dist) { dist = d; mejor = el; }
    });
    return mejor ? Number(mejor.dataset.c) : null;
  }

  rueda.addEventListener('scroll', () => {
    if (bloqueoScroll) return;
    clearTimeout(tScroll);
    tScroll = setTimeout(() => {
      const c = codigoEnCentro();
      if (c != null && String(c) !== st.buf) {
        st.buf = String(c);
        if (!platoActual() || !platoActual().pf) st.tamano = 'R';
        pintarLector();
        marcarCentro();
      }
    }, 110);
  });

  /* Arrastre con mouse: en pantalla táctil el scroll nativo ya funciona. */
  let arrastre = null;
  rueda.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch') return;
    arrastre = { x: e.clientX, scroll: rueda.scrollLeft, movido: 0 };
    rueda.classList.add('arrastrando');
  });
  rueda.addEventListener('pointermove', e => {
    if (!arrastre) return;
    const dx = e.clientX - arrastre.x;
    arrastre.movido = Math.max(arrastre.movido, Math.abs(dx));
    rueda.scrollLeft = arrastre.scroll - dx;
  });
  const soltar = () => {
    if (!arrastre) return;
    const movido = arrastre.movido;
    arrastre = null;
    rueda.classList.remove('arrastrando');
    if (movido > 6) {
      const c = codigoEnCentro();
      if (c != null) { st.buf = String(c); pintarLector(); centrar(c); marcarCentro(); }
    }
  };
  rueda.addEventListener('pointerup', soltar);
  rueda.addEventListener('pointercancel', soltar);
  rueda.addEventListener('pointerleave', soltar);

  rueda.addEventListener('click', e => {
    const it = e.target.closest('.rueda-item');
    if (!it) return;
    setBuf(it.dataset.c);
  });

  /* Rueda del mouse sobre el lector: sube o baja el código de uno en uno. */
  $('.lector').addEventListener('wheel', e => {
    if (!st.buf) return;
    e.preventDefault();
    mover(e.deltaY > 0 ? 1 : -1);
  }, { passive: false });

  // ── Teclado en pantalla ──────────────────────────────────────────────────
  const TECLAS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'C', '0', '⌫'];
  $('#keypad').innerHTML =
    TECLAS.map(k => {
      const aux = k === 'C' || k === '⌫';
      return `<button type="button" class="${aux ? 'aux borrar' : ''}" data-k="${k}">${k}</button>`;
    }).join('') +
    '<button type="button" class="agregar" data-k="add" disabled>Agregar al pedido</button>';

  $('#keypad').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    const k = b.dataset.k;
    if (k === 'C') setBuf('');
    else if (k === '⌫') setBuf(st.buf.slice(0, -1));
    else if (k === 'add') agregar();
    else digito(k);
  });

  // ── Notas rápidas ────────────────────────────────────────────────────────
  $('#notas').innerHTML = NOTAS_RAPIDAS.map(n =>
    `<button type="button" class="nota-chip" data-n="${UI.esc(n)}">${UI.esc(n)}</button>`).join('');
  $('#notas').addEventListener('click', e => {
    const b = e.target.closest('.nota-chip');
    if (!b) return;
    const n = b.dataset.n;
    st.notas.has(n) ? st.notas.delete(n) : st.notas.add(n);
    b.classList.toggle('on', st.notas.has(n));
  });

  function notasTexto() {
    const libre = $('#nota-libre').value.trim();
    return [...st.notas, libre].filter(Boolean).join(' · ');
  }
  function limpiarNotas() {
    st.notas.clear();
    $('#nota-libre').value = '';
    $('#notas').querySelectorAll('.nota-chip').forEach(b => b.classList.remove('on'));
  }

  // ── Acciones sobre el código ─────────────────────────────────────────────
  function setBuf(v, conCentro = true) {
    st.buf = String(v).replace(/\D/g, '').slice(0, 3).replace(/^0+(?=\d)/, '');
    const p = platoActual();
    if (!p || !p.pf) st.tamano = 'R';
    pintarLector();
    marcarCentro();
    if (conCentro && st.buf) centrar(Number(st.buf));
  }

  function digito(d) {
    // Tres dígitos ya marcados: el siguiente empieza un código nuevo.
    setBuf(st.buf.length >= 3 ? d : st.buf + d);
  }

  function mover(paso) {
    const lista = Store.carta().map(p => p.c);
    const i = lista.indexOf(Number(st.buf));
    const j = i === -1 ? 0 : Math.min(lista.length - 1, Math.max(0, i + paso));
    setBuf(lista[j]);
  }

  function setCant(v) {
    st.cant = Math.min(99, Math.max(1, v));
    $('#cant').textContent = st.cant;
  }
  $('#mas').onclick = () => setCant(st.cant + 1);
  $('#menos').onclick = () => setCant(st.cant - 1);

  $('#tamanos').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    st.tamano = b.dataset.t;
    pintarLector();
  });

  $('#buscar').addEventListener('input', e => {
    st.filtro = e.target.value;
    pintarRueda();
  });

  // ── Borrador del pedido ──────────────────────────────────────────────────
  function agregar() {
    if (!st.mesa) return UI.toast('Elige la mesa primero', 'error');
    const p = platoActual();
    if (!p) return UI.toast('Ese código no está en la carta', 'error');
    if (p.out) return UI.toast(`${p.n} está agotado`, 'error');

    const notas = notasTexto();
    const items = borrador();
    const igual = items.find(i => i.codigo === p.c && i.tamano === st.tamano && i.notas === notas);
    if (igual) igual.cant += st.cant;
    else items.push({
      codigo: p.c, nombre: p.n, precio: p.p, precioF: p.pf || null,
      cant: st.cant, tamano: st.tamano, notas, bar: !!p.bar
    });

    guardarBorradores();
    UI.toast(`${st.cant} × ${p.n}${st.tamano === 'F' ? ' familiar' : ''}`, 'ok');
    setBuf('');
    setCant(1);
    limpiarNotas();
    pintarPedido();
    pintarMesas();
  }

  function enviar() {
    const items = borrador();
    if (!st.mesa || !items.length) return;
    const p = Store.pedidoNuevo({ mesa: st.mesa, mozo: Store.config().mozo, items });
    st.borradores[st.mesa] = [];
    guardarBorradores();
    UI.toast(`Pedido N° ${p.num} enviado a cocina`, 'ok');
    pintarPedido();
    pintarMesas();
  }
  $('#enviar').onclick = enviar;

  $('#vaciar').onclick = () => {
    if (!st.mesa || !borrador().length) return;
    st.borradores[st.mesa] = [];
    guardarBorradores();
    pintarPedido();
    pintarMesas();
  };

  $('#lineas').addEventListener('click', e => {
    const q = e.target.closest('[data-quitar]');
    if (q) {
      borrador().splice(Number(q.dataset.quitar), 1);
      guardarBorradores();
      pintarPedido();
      pintarMesas();
      return;
    }
    const a = e.target.closest('[data-anular]');
    if (a) {
      const [pid, uid] = a.dataset.anular.split('|');
      if (confirm('¿Quitar este plato del pedido ya enviado?')) {
        Store.quitarItem(pid, uid);
        pintarPedido();
        pintarMesas();
      }
      return;
    }
    const r = e.target.closest('[data-reimprimir]');
    if (r) {
      const p = Store.pedidosActivos().find(x => x.id === r.dataset.reimprimir);
      if (p) Impresion.imprimirComanda(p, { copia: true });
    }
  });

  function pintarPedido() {
    $('#titulo-mesa').textContent = st.mesa
      ? (isNaN(Number(st.mesa)) ? st.mesa : `Mesa ${st.mesa}`)
      : 'Mesa —';

    const cuenta = st.mesa ? Store.cuentaDe(st.mesa) : null;
    const items = borrador();
    let html = '';

    // Rondas ya enviadas
    if (cuenta) {
      cuenta.pedidos.slice().sort((a, b) => a.creado - b.creado).forEach(p => {
        html += `<div class="ronda-previa">
          <div class="rot">
            <span>Pedido N° ${p.num} · ${UI.hora(p.creado)}</span>
            <span>
              <span class="pill ${p.estado}">${p.estado}</span>
              <button class="btn chico fantasma" data-reimprimir="${p.id}" style="margin-left:6px">Copia</button>
            </span>
          </div>
          ${p.items.map(i => `
            <div class="linea enviada">
              ${UI.chapa(i.codigo, i.bar ? 'bar' : '')}
              <span class="txt"><b>${UI.esc(i.nombre)}${i.tamano === 'F' ? ' (Fam.)' : ''}</b>
                ${i.notas ? `<small>${UI.esc(i.notas)}</small>` : ''}</span>
              <span class="cant">${i.cant}</span>
              ${p.estado === 'nuevo'
                ? `<button class="quitar" data-anular="${p.id}|${i.uid}" title="Quitar">×</button>`
                : `<span class="dinero" style="font-size:.82rem;color:var(--txt-dim)">${(Store.precioItem(i) * i.cant).toFixed(2)}</span>`}
            </div>`).join('')}
        </div>`;
      });
    }

    // Ronda en preparación (aún no enviada)
    if (items.length) {
      html += `<div class="ronda-previa"><div class="rot"><span>Por enviar</span><span>${items.length} línea${items.length === 1 ? '' : 's'}</span></div></div>`;
      html += items.map((i, idx) => `
        <div class="linea">
          ${UI.chapa(i.codigo, i.bar ? 'bar' : '')}
          <span class="txt"><b>${UI.esc(i.nombre)}${i.tamano === 'F' ? ' (Fam.)' : ''}</b>
            ${i.notas ? `<small>${UI.esc(i.notas)}</small>` : ''}</span>
          <span class="cant">${i.cant}</span>
          <button class="quitar" data-quitar="${idx}" title="Quitar">×</button>
        </div>`).join('');
    }

    if (!html) {
      html = `<div class="vacio-msg">${st.mesa
        ? 'Marca un código y toca <b>Agregar al pedido</b>.'
        : 'Elige una mesa arriba para empezar.'}</div>`;
    }
    $('#lineas').innerHTML = html;

    const totalBorrador = items.reduce((t, i) =>
      t + (i.tamano === 'F' && i.precioF ? i.precioF : i.precio) * i.cant, 0);
    $('#total-borrador').textContent = UI.soles(totalBorrador);
    $('#total-mesa').textContent = UI.soles(cuenta ? cuenta.total : 0);
    $('#enviar').disabled = !st.mesa || !items.length;
  }

  // ── Selección de mesa ────────────────────────────────────────────────────
  $('#mesas').addEventListener('click', e => {
    const b = e.target.closest('.mesa-btn');
    if (!b) return;
    st.mesa = b.dataset.mesa;
    recordarMesa(st.mesa);
    pintarMesas();
    pintarPedido();
    pintarLector();
  });

  // ── Atajos de teclado ────────────────────────────────────────────────────
  document.addEventListener('keydown', e => {
    const enCampo = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);
    if (enCampo) {
      if (e.key === 'Escape') e.target.blur();
      return;
    }
    if (e.key >= '0' && e.key <= '9') { digito(e.key); e.preventDefault(); return; }
    switch (e.key) {
      case 'Backspace': setBuf(st.buf.slice(0, -1)); e.preventDefault(); break;
      case 'Escape':    setBuf(''); limpiarNotas(); setCant(1); break;
      case 'Enter':     e.ctrlKey ? enviar() : agregar(); e.preventDefault(); break;
      case 'ArrowRight': mover(1); e.preventDefault(); break;
      case 'ArrowLeft':  mover(-1); e.preventDefault(); break;
      case 'ArrowUp':    setCant(st.cant + 1); e.preventDefault(); break;
      case 'ArrowDown':  setCant(st.cant - 1); e.preventDefault(); break;
      case '+':          setCant(st.cant + 1); break;
      case '-':          setCant(st.cant - 1); break;
      case 'f': case 'F': {
        const p = platoActual();
        if (p && p.pf) { st.tamano = st.tamano === 'F' ? 'R' : 'F'; pintarLector(); }
        break;
      }
    }
  });

  // ── Arranque ─────────────────────────────────────────────────────────────
  const selMozo = $('#sel-mozo');
  selMozo.value = Store.config().mozo;
  selMozo.onchange = () => Store.setConfig({ mozo: selMozo.value });

  st.mesa = mesaRecordada() || null;
  if (st.mesa && !Store.mesas().includes(st.mesa)) st.mesa = null;

  pintarMesas();
  pintarRueda();
  pintarLector();
  pintarPedido();

  /* Avisar al mozo cuando cocina marca un pedido como listo. */
  let listosVistos = new Set(Store.pedidosActivos().filter(p => p.estado === 'listo').map(p => p.id));
  function revisarListos() {
    const listos = Store.pedidosActivos().filter(p => p.estado === 'listo');
    listos.forEach(p => {
      if (!listosVistos.has(p.id)) {
        listosVistos.add(p.id);
        UI.toast(`Listo para recoger: ${isNaN(Number(p.mesa)) ? p.mesa : `mesa ${p.mesa}`} · pedido N° ${p.num}`, 'ok');
        UI.campana();
      }
    });
    listosVistos = new Set([...listosVistos].filter(id => listos.some(p => p.id === id)));
  }

  /* La rueda solo se rearma si la carta cambió (agotados, precios): rearmarla
     en cada pedido nuevo le movería el scroll al mozo mientras marca. */
  let firmaCarta = JSON.stringify(Store.estado().cartaEdits);

  Store.on(() => {
    pintarMesas();
    pintarPedido();
    revisarListos();
    const firma = JSON.stringify(Store.estado().cartaEdits);
    if (firma !== firmaCarta) {
      firmaCarta = firma;
      pintarRueda();
      pintarLector();
      if (st.buf) centrar(Number(st.buf), false);
    }
  });
  setInterval(() => { $('#reloj').textContent = UI.horaSeg(Date.now()); }, 1000);
  $('#reloj').textContent = UI.horaSeg(Date.now());
})();
