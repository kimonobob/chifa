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

  function pintar() {
    const pedidos = Store.pedidosCocina();
    ['nuevo', 'preparando', 'listo'].forEach(estado => {
      const lista = pedidos.filter(p => p.estado === estado);
      $(`#col-${estado}`).innerHTML = lista.map(p => tarjeta(p)).join('') ||
        `<div class="vacio-msg">${estado === 'nuevo' ? 'Sin pedidos nuevos' : estado === 'preparando' ? 'Nada en el wok' : 'Nada por salir'}</div>`;
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
    if (Store.config().modoImpresion === 'auto') {
      const sinImprimir = nuevos.filter(p => !p.impreso);
      if (sinImprimir.length) imprimirLote(sinImprimir);
    } else {
      const t = Store.config().teclaImpresion;
      UI.toast(`${nuevos.length} pedido${nuevos.length === 1 ? '' : 's'} nuevo${nuevos.length === 1 ? '' : 's'} · ${mostrarTecla(t)} para imprimir`);
    }
  }

  // ── Controles de la barra ────────────────────────────────────────────────
  function pintarBarra() {
    const c = Store.config();
    $('#modo').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.m === c.modoImpresion));
    $('#formato').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.f === formato()));
    if (!capturando) {
      $('#tecla').textContent = mostrarTecla(c.teclaImpresion);
      $('#tecla').classList.remove('capturando');
    }
    $('#sonido').textContent = `Sonido: ${c.sonido ? 'sí' : 'no'}`;
    $('#columnas').style.setProperty('--zoom', c.letraCocina);
    $('#imprimir-ya').style.display = c.modoImpresion === 'auto' ? 'none' : '';
  }

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

  $('#sonido').onclick = () => {
    Store.setConfig({ sonido: !Store.config().sonido });
    if (Store.config().sonido) UI.campana();
  };
  $('#letra-mas').onclick = () => Store.setConfig({ letraCocina: Math.min(2.2, +(Store.config().letraCocina + 0.15).toFixed(2)) });
  $('#letra-menos').onclick = () => Store.setConfig({ letraCocina: Math.max(0.8, +(Store.config().letraCocina - 0.15).toFixed(2)) });

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
    $('#lista-agotados').innerHTML = lista.slice(0, 60).map(p => `
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
    if (c.modoImpresion === 'manual' &&
        e.key.toLowerCase() === String(c.teclaImpresion).toLowerCase() &&
        !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      imprimirPendientes();
    }
  });

  // ── Arranque ─────────────────────────────────────────────────────────────
  pintarBarra();
  pintar();
  tick();
  Store.on(() => { pintarBarra(); pintar(); revisarNuevos(); });
  setInterval(tick, 1000);
})();
