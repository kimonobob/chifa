/* Pantalla de cocina: comandas en vivo, cronómetro e impresión. */

(() => {
  const $ = s => document.querySelector(s);
  const conocidos = new Set(Store.pedidosCocina().map(p => p.id));  // lo ya visto al abrir no se reimprime
  let capturando = false;
  let foco = null;

  const NOMBRE_TECLA = {
    ' ': 'Espacio', Enter: 'Enter', Tab: 'Tab', Insert: 'Insert',
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
    '+': '+', '-': '−', '*': '*', '/': '/'
  };
  const mostrarTecla = k => NOMBRE_TECLA[k] || (k.length === 1 ? k.toUpperCase() : k);

  // ── Comandas ─────────────────────────────────────────────────────────────
  function tarjeta(p, enFoco = false) {
    const cocina = p.items.filter(i => !i.bar);
    const barra = p.items.filter(i => i.bar);
    const min = UI.minutos(p.creado);
    const tarde = p.estado !== 'listo' && min > 12;

    const li = i => `
      <li data-uid="${i.uid}" class="${i.listo ? 'hecho' : ''} ${i.bar ? 'es-bar' : ''}">
        <span class="cx">${i.cant}&times;</span>
        ${UI.chapa(i.codigo, i.bar ? 'bar' : '')}
        <span class="nom">${UI.esc(i.nombre)}${i.tamano === 'F' ? '<span class="tam">FAM</span>' : ''}
          ${i.detalle ? `<span class="detalle">${UI.esc(i.detalle)}</span>` : ''}
          ${i.notas ? `<span class="nota">${UI.esc(i.notas)}</span>` : ''}
        </span>
      </li>`;

    const botones = {
      nuevo: `<button class="btn laton" data-acc="preparando">Empezar</button>`,
      preparando: `<button class="btn jade" data-acc="listo">Pedido listo</button>`,
      listo: `<button class="btn fantasma" data-acc="servido">Entregado</button>`
    }[p.estado] || '';

    return `<article class="comanda est-${p.estado} ${tarde ? 'tarde' : ''} ${enFoco ? '' : 'nueva'}" data-id="${p.id}">
      <div class="comanda-cab" role="button" tabindex="0" title="Ver en grande">
        <span class="mesa">${isNaN(Number(p.mesa)) ? UI.esc(p.mesa) : `Mesa <b>${UI.esc(p.mesa)}</b>`}</span>
        <span class="nro">N° ${p.num} · ${UI.esc(p.mozo)}</span>
        <span class="crono" data-creado="${p.creado}">${UI.transcurrido(p.creado)}</span>
      </div>
      <ul class="comanda-items">
        ${cocina.map(li).join('')}
        ${barra.length ? `<li style="opacity:.75;grid-template-columns:1fr"><span class="pill bar">Barra</span></li>${barra.map(li).join('')}` : ''}
      </ul>
      <div class="comanda-pie">
        ${botones}
        <button class="btn fantasma" data-acc="imprimir">${p.impreso ? 'Copia' : 'Imprimir'}</button>
        <button class="btn fantasma" data-acc="anular" title="Anular pedido" style="flex:0 0 auto">✕</button>
        <span class="marca-impreso ${p.impreso ? '' : 'no'}">${p.impreso ? `impreso ${UI.hora(p.impreso)}` : 'sin imprimir'}</span>
      </div>
    </article>`;
  }

  // ── Vista "uno por uno" ──────────────────────────────────────────────────
  const vista = () => Store.config().vistaCocina || 'tablero';
  const orden = () => Store.config().ordenCocina || 'llegada';

  /* La cola respeta primero lo que el cocinero adelantó a mano; después, el
     criterio elegido. */
  function colaOrdenada() {
    const modo = orden();
    return Store.platosPendientes().sort((a, b) => {
      if (a.prio !== b.prio) return a.prio - b.prio;
      if (modo === 'rapido' && a.minutos !== b.minutos) return a.minutos - b.minutos;
      if (modo === 'demorado' && a.minutos !== b.minutos) return b.minutos - a.minutos;
      if (a.creado !== b.creado) return a.creado - b.creado;
      return a.unidad - b.unidad;
    });
  }

  function pintarUno() {
    const cola = colaOrdenada();
    $('#uno-conteo').textContent = Math.max(0, cola.length - 1);

    const s = cola[0];
    if (!s) {
      $('#uno-grande').innerHTML = `<div class="uno-vacio">
        <b>Todo despachado</b>
        No queda ningún plato por preparar.
      </div>`;
      $('#uno-lista').innerHTML = '';
      return;
    }

    const deVarias = s.cant > 1 ? `<span><span class="et">Unidad</span><b>${s.unidad + 1}/${s.cant}</b></span>` : '';
    $('#uno-grande').innerHTML = `
      <p class="sig-eyebrow">Va este</p>
      <div class="sig-chapa">${String(s.codigo).padStart(2, '0')}</div>
      <h2 class="sig-nombre">${UI.esc(s.nombre)}${s.tamano === 'F' ? ' · familiar' : ''}</h2>
      <div class="sig-datos">
        <span><span class="et">Mesa</span><b>${UI.esc(s.mesa)}</b></span>
        ${deVarias}
        <span><span class="et">Esperando</span><b class="crono" data-creado="${s.creado}">${UI.transcurrido(s.creado)}</b></span>
        <span><span class="et">Toma unos</span><b>${s.minutos} min</b></span>
        <span><span class="et">Pedido</span><b>N° ${s.num}</b></span>
      </div>
      ${s.detalle ? `<p class="sig-detalle">${UI.esc(s.detalle)}</p>` : ''}
      ${s.notas ? `<div class="sig-nota">${UI.esc(s.notas)}</div>` : ''}
      <div class="sig-acciones">
        <button class="btn jade listo" data-uno="listo">Plato listo</button>
        <button class="btn fantasma" data-uno="imprimir">Imprimir</button>
        <button class="btn fantasma" data-uno="despues">Dejar para después</button>
      </div>
      <p class="sig-atajo">
        <kbd>${mostrarTecla(Store.config().teclaImpresion)}</kbd> pasa al siguiente plato
      </p>`;

    $('#uno-lista').innerHTML = cola.slice(1).map((x, idx) => `
      <button type="button" class="cola-item ${x.prio < 0 ? 'adelantado' : ''}" data-clave="${x.clave}">
        <span class="pos">${idx + 2}</span>
        ${UI.chapa(x.codigo)}
        <span class="cn">${UI.esc(x.nombre)}${x.tamano === 'F' ? ' (Fam.)' : ''}
          <small>Mesa ${UI.esc(x.mesa)}${x.cant > 1 ? ` · ${x.unidad + 1}/${x.cant}` : ''}${x.notas ? ` · ${UI.esc(x.notas)}` : ''}</small></span>
        <span class="cmin">${x.minutos} min <span class="ahora">Hacer ahora</span></span>
      </button>`).join('') || '<div class="vacio-msg">Nada más en cola</div>';

    pintarEntregados();
  }

  /* Lo que ya salió, con la opción de deshacer si se marcó por error. */
  function pintarEntregados() {
    const hechos = Store.platosEntregados(30);
    $('#uno-entregados-n').textContent = hechos.length;
    $('#uno-entregados').innerHTML = hechos.map(x => `
      <div class="entregado-item ${UI.minutos(x.cuando) < 2 ? 'reciente' : ''}">
        ${UI.chapa(x.codigo)}
        <span class="en">${UI.esc(x.nombre)}${x.tamano === 'F' ? ' (Fam.)' : ''}
          <small>Mesa ${UI.esc(x.mesa)}${x.cant > 1 ? ` · ${x.unidad + 1}/${x.cant}` : ''} · ${UI.hora(x.cuando)}</small></span>
        <button type="button" class="deshacer" data-deshacer="${x.pedidoId}|${x.uid}">Deshacer</button>
      </div>`).join('') || '<div class="vacio-msg">Todavía no sale ningún plato</div>';
  }

  $('#uno-entregados').addEventListener('click', e => {
    const b = e.target.closest('[data-deshacer]');
    if (!b) return;
    const [pid, uid] = b.dataset.deshacer.split('|');
    Store.desmarcarUnidad(pid, uid);
    UI.toast('Ese plato vuelve a la cola');
  });

  /* Despacha el plato actual y muestra el siguiente. */
  function pasarDePlato() {
    const s = colaOrdenada()[0];
    if (!s) return UI.toast('No queda ningún plato por despachar');
    Store.marcarUnidad(s.pedidoId, s.uid);
    UI.campana();
    const sigue = colaOrdenada()[0];
    UI.toast(sigue ? `Ahora va el ${sigue.codigo} · ${sigue.nombre}` : 'Todo despachado', 'ok');
  }

  $('#uno-grande').addEventListener('click', e => {
    const b = e.target.closest('[data-uno]');
    if (!b) return;
    const s = colaOrdenada()[0];
    if (!s) return;
    if (b.dataset.uno === 'listo') {
      pasarDePlato();
    } else if (b.dataset.uno === 'despues') {
      if (colaOrdenada().length < 2) return UI.toast('Es el único plato en cola');
      Store.priorizarItem(s.pedidoId, s.uid, true);
      UI.toast('Ese plato pasa al final de la cola');
    } else {
      const p = Store.pedidosCocina().find(x => x.id === s.pedidoId);
      const it = p && p.items.find(y => y.uid === s.uid);
      if (it) { Impresion.imprimirPlato(p, it, s.unidad); Store.marcarImpreso(p.id); }
    }
  });

  $('#uno-lista').addEventListener('click', e => {
    const b = e.target.closest('.cola-item');
    if (!b) return;
    const x = colaOrdenada().find(y => y.clave === b.dataset.clave);
    if (!x) return;
    Store.priorizarItem(x.pedidoId, x.uid);
    UI.toast(`Ahora va el ${x.codigo} · ${x.nombre}`, 'ok');
  });

  function pintar() {
    const enUno = vista() === 'uno';
    $('#vista-uno').hidden = !enUno;
    $('#columnas').hidden = enUno;
    document.querySelectorAll('.orden-solo').forEach(el => { el.hidden = !enUno; });
    if (enUno) pintarUno();

    const pedidos = Store.pedidosCocina();
    ['nuevo', 'preparando', 'listo'].forEach(estado => {
      const lista = pedidos.filter(p => p.estado === estado);
      $(`#col-${estado}`).innerHTML = lista.map(p => tarjeta(p)).join('') ||
        `<div class="vacio-msg">${estado === 'nuevo' ? 'Sin pedidos nuevos' : estado === 'preparando' ? 'Nada en preparación' : 'Nada por salir'}</div>`;
      $(`#c-${estado}`).textContent = lista.length;
    });
    if (foco) {
      const p = pedidos.find(x => x.id === foco);
      if (p) $('#foco-caja').innerHTML = tarjeta(p, true);
      else cerrarFoco();
    }
  }

  function tick() {
    $('#reloj').textContent = UI.horaSeg(Date.now());
    document.querySelectorAll('[data-creado]').forEach(el => {
      const ts = Number(el.dataset.creado);
      el.textContent = UI.transcurrido(ts);
      const card = el.closest('.comanda');
      if (card && !card.classList.contains('est-listo')) {
        card.classList.toggle('tarde', UI.minutos(ts) > 12);
      }
    });
  }

  // ── Impresión ────────────────────────────────────────────────────────────
  const formato = () => Store.config().formatoImpresion || 'comanda';

  function imprimirLote(pedidos, copia = false) {
    const html = pedidos
      .map(p => formato() === 'plato' ? Impresion.comandaPorPlato(p) : Impresion.comanda(p, { copia }))
      .filter(Boolean)
      .join('');
    if (!html) return 0;
    Impresion.imprimir(html);
    pedidos.forEach(p => Store.marcarImpreso(p.id));
    return pedidos.length;
  }

  function imprimirPendientes() {
    const pend = Store.pedidosCocina().filter(p => !p.impreso);
    if (!pend.length) return UI.toast('No hay comandas pendientes de imprimir');
    const n = imprimirLote(pend);
    UI.toast(`${n} comanda${n === 1 ? '' : 's'} a la impresora`, 'ok');
  }

  $('#imprimir-ya').onclick = imprimirPendientes;

  // ── Detectar pedidos nuevos ──────────────────────────────────────────────
  function revisarNuevos() {
    const pedidos = Store.pedidosCocina();
    const nuevos = pedidos.filter(p => !conocidos.has(p.id));
    pedidos.forEach(p => conocidos.add(p.id));
    if (!nuevos.length) return;

    UI.campana(nuevos.length > 1 ? 2 : 1);
    if (Store.config().modoImpresion === 'auto' && Impresion.imprimeComandas()) {
      const sinImprimir = nuevos.filter(p => !p.impreso);
      if (sinImprimir.length) imprimirLote(sinImprimir);
    } else if (vista() === 'tablero') {
      const t = Store.config().teclaImpresion;
      UI.toast(`${nuevos.length} pedido${nuevos.length === 1 ? '' : 's'} nuevo${nuevos.length === 1 ? '' : 's'} · ${mostrarTecla(t)} para imprimir`);
    } else {
      UI.toast(`${nuevos.length} pedido${nuevos.length === 1 ? '' : 's'} más en la cola`);
    }
  }

  // ── Controles de la barra ────────────────────────────────────────────────
  function pintarBarra() {
    const c = Store.config();
    $('#vista').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === vista()));
    $('#orden').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.o === orden()));
    $('#modo').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.m === c.modoImpresion));
    $('#formato').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.f === formato()));
    if (!capturando) {
      $('#tecla').textContent = mostrarTecla(c.teclaImpresion);
      $('#tecla').classList.remove('capturando');
    }
    $('#sonido').textContent = `Sonido: ${c.sonido ? 'sí' : 'no'}`;
    const conTicketera = Impresion.imprimeComandas();
    $('#equipo-imprime').textContent = `La ticketera está acá: ${conTicketera ? 'sí' : 'no'}`;
    $('#equipo-imprime').classList.toggle('on', conTicketera);
    $('#letra-valor').textContent = `${Math.round(c.letraCocina * 100)}%`;
    $('#columnas').style.setProperty('--zoom', c.letraCocina);
    $('#vista-uno').style.setProperty('--zoom', c.letraCocina);

    // La tecla hace una cosa u otra según la vista; que se lea en la barra.
    const enUno = vista() === 'uno';
    $('#tecla-hace').textContent = enUno
      ? 'pasa al siguiente plato'
      : (c.modoImpresion === 'manual' ? 'imprime lo pendiente' : 'la impresión va sola');
    $('#imprimir-ya').hidden = enUno || c.modoImpresion === 'auto';
  }

  $('#vista').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b) Store.setConfig({ vistaCocina: b.dataset.v });
  });

  $('#orden').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    Store.setConfig({ ordenCocina: b.dataset.o });
    UI.toast({
      llegada: 'La cola sigue el orden en que llegaron los pedidos',
      rapido: 'Primero los platos más rápidos de preparar',
      demorado: 'Primero los que más demoran'
    }[b.dataset.o]);
  });

  $('#modo').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    Store.setConfig({ modoImpresion: b.dataset.m });
    UI.toast(b.dataset.m === 'auto'
      ? 'Automático: cada pedido se imprime al llegar'
      : `Manual: presiona ${mostrarTecla(Store.config().teclaImpresion)} o el botón de cada comanda`);
  });

  $('#formato').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b) Store.setConfig({ formatoImpresion: b.dataset.f });
  });

  $('#cambiar-tecla').onclick = () => {
    capturando = true;
    $('#tecla').textContent = '…';
    $('#tecla').classList.add('capturando');
    UI.toast('Presiona la tecla que quieras usar para imprimir');
  };

  /* Preferencia de este equipo, no del chifa entero: por eso no pasa por
     Store.setConfig, que se comparte con las demás pantallas. */
  $('#equipo-imprime').onclick = () => {
    const antes = Impresion.imprimeComandas();
    Impresion.setRolImpresora(antes ? 'no' : 'si');
    UI.toast(antes
      ? 'Este equipo ya no saca comandas'
      : 'Las comandas saldrán por la impresora de este equipo', 'ok');
    pintarBarra();
  };

  $('#sonido').onclick = () => {
    Store.setConfig({ sonido: !Store.config().sonido });
    if (Store.config().sonido) UI.campana();
  };
  $('#letra-mas').onclick = () => Store.setConfig({ letraCocina: Math.min(2.2, +(Store.config().letraCocina + 0.15).toFixed(2)) });
  $('#letra-menos').onclick = () => Store.setConfig({ letraCocina: Math.max(0.8, +(Store.config().letraCocina - 0.15).toFixed(2)) });

  const panel = $('#ajustes-panel');
  $('#ajustes-btn').onclick = e => {
    e.stopPropagation();
    panel.hidden = !panel.hidden;
    $('#ajustes-btn').setAttribute('aria-expanded', String(!panel.hidden));
  };
  document.addEventListener('click', e => {
    if (!panel.hidden && !e.target.closest('.ajustes-caja')) {
      panel.hidden = true;
      $('#ajustes-btn').setAttribute('aria-expanded', 'false');
    }
  });

  $('#pantalla').onclick = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => UI.toast('El navegador no dejó abrir pantalla completa', 'error'));
  };

  // ── Acciones sobre las tarjetas ──────────────────────────────────────────
  function accion(e) {
    const card = e.target.closest('.comanda');
    if (!card) return;
    const id = card.dataset.id;

    const btn = e.target.closest('[data-acc]');
    if (btn) {
      const acc = btn.dataset.acc;
      if (acc === 'imprimir') {
        const p = Store.pedidosCocina().find(x => x.id === id);
        if (p) { imprimirLote([p], !!p.impreso); }
      } else if (acc === 'anular') {
        if (confirm('¿Anular este pedido completo? No se cobrará.')) {
          Store.anularPedido(id, 'Anulado en cocina');
          if (foco === id) cerrarFoco();
        }
      } else {
        Store.estadoPedido(id, acc);
        if (acc === 'listo') UI.campana();
      }
      return;
    }

    const li = e.target.closest('.comanda-items li[data-uid]');
    if (li) {
      const p = Store.pedidosCocina().find(x => x.id === id);
      const it = p && p.items.find(i => i.uid === li.dataset.uid);
      if (it) Store.marcarItem(id, it.uid, !it.listo);
      return;
    }

    if (e.target.closest('.comanda-cab')) abrirFoco(id);
  }
  $('#columnas').addEventListener('click', accion);

  // ── Foco: un pedido a pantalla grande ────────────────────────────────────
  function abrirFoco(id) {
    foco = id;
    let f = $('#foco');
    if (!f) {
      f = document.createElement('div');
      f.id = 'foco';
      f.className = 'foco-fondo';
      f.innerHTML = '<div id="foco-caja" class="foco-caja"></div>';
      f.addEventListener('click', e => {
        if (e.target === f) return cerrarFoco();
        accion(e);
      });
      document.body.appendChild(f);
    }
    f.style.display = 'flex';
    pintar();
  }
  function cerrarFoco() {
    foco = null;
    const f = $('#foco');
    if (f) f.style.display = 'none';
  }

  // ── Agotados ─────────────────────────────────────────────────────────────
  const dlg = $('#dlg-agotados');
  function pintarAgotados() {
    const f = $('#buscar-agotado').value.trim().toLowerCase();
    const lista = Store.carta().filter(p => !f || p.n.toLowerCase().includes(f) || String(p.c) === f);
    // Sin recortes: con 219 líneas, cortar en 60 dejaba media carta inalcanzable.
    $('#lista-agotados').innerHTML = lista.map(p => `
      <button type="button" class="bebida-btn" data-c="${p.c}" style="display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;${p.out ? 'opacity:.55' : ''}">
        ${UI.chapa(p.c)}
        <span style="text-align:left">${UI.esc(p.n)}</span>
        <span class="pill ${p.out ? 'nuevo' : 'listo'}">${p.out ? 'Agotado' : 'Hay'}</span>
      </button>`).join('') || '<div class="vacio-msg">Sin resultados</div>';
  }
  $('#agotados-btn').onclick = () => { pintarAgotados(); dlg.showModal(); };
  $('#cerrar-agotados').onclick = () => dlg.close();
  $('#buscar-agotado').oninput = pintarAgotados;
  $('#lista-agotados').addEventListener('click', e => {
    const b = e.target.closest('[data-c]');
    if (!b) return;
    const c = Number(b.dataset.c);
    const p = Store.plato(c);
    Store.editarPlato(c, { out: !p.out });
    pintarAgotados();
  });

  // ── Teclado ──────────────────────────────────────────────────────────────
  document.addEventListener('keydown', e => {
    if (capturando) {
      e.preventDefault();
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return;
      capturando = false;
      if (e.key === 'Escape') { pintarBarra(); return UI.toast('Se mantiene la tecla anterior'); }
      Store.setConfig({ teclaImpresion: e.key });
      UI.toast(`Listo: ahora imprimes con ${mostrarTecla(e.key)}`, 'ok');
      return;
    }

    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;

    if (e.key === 'Escape' && foco) { cerrarFoco(); return; }

    const c = Store.config();
    const esLaTecla = e.key.toLowerCase() === String(c.teclaImpresion).toLowerCase() &&
                      !e.ctrlKey && !e.altKey && !e.metaKey;
    if (!esLaTecla) return;
    e.preventDefault();
    if (e.repeat) return;                    // mantenerla pulsada no despacha de más

    // La misma tecla hace lo que toca en cada vista.
    if (vista() === 'uno') pasarDePlato();
    else if (c.modoImpresion === 'manual') imprimirPendientes();
  });

  /* Lo que llegó con la pantalla cerrada. El mozo ya mandó el pedido y no
     salió papel; al abrir la cocina se saca lo que quedó sin imprimir. No
     se duplica nada: recargar la pantalla no reimprime, porque lo impreso
     ya viene marcado. */
  function imprimirLoRezagado() {
    if (Store.config().modoImpresion !== 'auto' || !Impresion.imprimeComandas()) return;
    const pend = Store.pedidosCocina().filter(p => !p.impreso);
    if (!pend.length) return;
    imprimirLote(pend);
    UI.toast(`${pend.length} comanda${pend.length === 1 ? '' : 's'} que faltaba${pend.length === 1 ? '' : 'n'} imprimir`, 'ok');
  }

  // ── Arranque ─────────────────────────────────────────────────────────────
  /* El latido le dice al mozo que esta pantalla está prendida y que su
     comanda va a salir. Sin latido, él ve el aviso en vez de creer que el
     papel ya está en la cocina. */
  Store.latirCocina();
  setInterval(Store.latirCocina, 5000);
  window.addEventListener('beforeunload', () => { try { localStorage.removeItem(`chifa:cocina:${Store.sede()}`); } catch (e) {} });

  pintarBarra();
  pintar();
  tick();
  imprimirLoRezagado();
  Store.on(() => { pintarBarra(); pintar(); revisarNuevos(); });
  setInterval(tick, 1000);
})();
