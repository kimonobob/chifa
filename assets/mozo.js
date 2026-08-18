/* Módulo del mozo.
   Vista 1 · Salón: croquis de mesas. Se toca una para tomarle el pedido y se
              arrastra de una a otra para juntarlas.
   Vista 2 · Pedido: lector de códigos, teclado a la izquierda y notas de
              cocina a la derecha.                                          */

(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const BORRADORES = `chifa:borradores:${Store.sede()}`;   // uno por local

  const st = {
    vista: 'salon',
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
  const borrador = () => (st.mesa ? (st.borradores[st.mesa] || (st.borradores[st.mesa] = [])) : []);
  const platoActual = () => (st.buf ? Store.plato(Number(st.buf)) : null);

  // ═══ VISTA 1 · CROQUIS DEL SALÓN ═════════════════════════════════════════
  const planoEl = $('#plano');

  function estadoDeCuenta(c) {
    if (!c) return {};
    return {
      enCocina: c.pedidos.some(p => p.estado === 'nuevo' || p.estado === 'preparando'),
      lista: c.pedidos.some(p => p.estado === 'listo')
    };
  }

  function pintarSalon() {
    if (unir) return;                 // no rearmar el plano a media unión
    const cuentas = Store.cuentas();
    const todas = Store.mesasMozo();        // sin Delivery: eso lo toma la caja
    const numeradas = todas.filter(m => !isNaN(Number(m)));
    const zonas = todas.filter(m => isNaN(Number(m)));

    /* Cada mesa va donde está en el salón de verdad (PLANO_MESAS). Si se
       agregan mesas nuevas por Ajustes, se acomodan solas al final. */
    const sitios = new Map(PLANO_MESAS.map(x => [x.m, x]));
    const filaLibre = PLANO_MESAS.reduce((n, x) => Math.max(n, x.fil), 0) + 1;
    let sueltas = 0;

    $('#mesas-plano').innerHTML = numeradas.map(m => {
      const c = cuentas.find(x => x.mesas.includes(m));
      const g = Store.grupoDe(m);
      const esPrincipal = !g || g.principal === m;
      const { enCocina, lista } = estadoDeCuenta(c);

      const clases = ['mesa-plano'];
      if (c) clases.push('ocupada');
      if (enCocina) clases.push('cocina');
      else if (lista) clases.push('lista');
      if (g) clases.push('unida');

      let info = '', tiempo = '';
      if (g && !esPrincipal) {
        info = `<span class="mp-info">con ${UI.esc(g.principal)}</span>`;
      } else if (c) {
        info = `<span class="mp-info dinero">${c.total.toFixed(2)}</span>`;
        tiempo = `<span class="mp-tiempo" data-desde="${c.desde}">${UI.transcurrido(c.desde)}</span>`;
      }

      let sitio = sitios.get(m);
      if (!sitio) {
        const orden = sueltas++;
        sitio = { col: [1, 2, 4][orden % 3], fil: filaLibre + Math.floor(orden / 3) };
      }

      return `<button type="button" class="${clases.join(' ')}" data-mesa="${UI.esc(m)}"
        style="grid-column:${sitio.col};grid-row:${sitio.fil}"
        aria-label="Mesa ${UI.esc(m)}${c ? `, ocupada, ${UI.soles(c.total)}` : ', libre'}">
        ${(enCocina || lista) ? '<span class="mp-punto"></span>' : ''}
        <span class="mp-num">${UI.esc(m)}</span>${info}${tiempo}
      </button>`;
    }).join('');

    $('#zonas').innerHTML = zonas.map(m => {
      const c = cuentas.find(x => x.mesas.includes(m));
      return `<button type="button" class="zona-btn ${c ? 'ocupada' : ''}" data-mesa="${UI.esc(m)}">
        <span>${UI.esc(m)}</span>
        <span class="zt">${c ? UI.soles(c.total) : 'libre'}</span>
      </button>`;
    }).join('');

    requestAnimationFrame(dibujarUniones);
  }

  /* Dibuja las líneas que conectan las mesas unidas, más el chip para
     separarlas. Se recalcula con cada pintado y al cambiar el tamaño. */
  function dibujarUniones() {
    const svg = $('#uniones'), chips = $('#chips-grupo');
    if (!svg || !planoEl || $('#vista-salon').hidden) return;
    const base = planoEl.getBoundingClientRect();
    if (!base.width) return;

    svg.setAttribute('viewBox', `0 0 ${base.width} ${base.height}`);
    svg.setAttribute('width', base.width);
    svg.setAttribute('height', base.height);

    let lineas = '', marcas = '';
    Store.grupos().forEach(g => {
      const centros = g.mesas.map(m => {
        const el = planoEl.querySelector(`.mesa-plano[data-mesa="${m}"]`);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { x: r.left - base.left + r.width / 2, y: r.top - base.top + r.height / 2 };
      }).filter(Boolean);
      if (centros.length < 2) return;

      for (let i = 1; i < centros.length; i++) {
        lineas += `<line x1="${centros[i - 1].x}" y1="${centros[i - 1].y}" x2="${centros[i].x}" y2="${centros[i].y}"/>`;
      }
      const cx = centros.reduce((t, p) => t + p.x, 0) / centros.length;
      const cy = centros.reduce((t, p) => t + p.y, 0) / centros.length;
      marcas += `<span class="chip-grupo" style="left:${cx}px;top:${cy}px">
        ${UI.esc(g.mesas.join(' + '))}
        <button type="button" data-separar="${UI.esc(g.principal)}" aria-label="Separar mesas">✕</button>
      </span>`;
    });
    svg.innerHTML = lineas;
    chips.innerHTML = marcas;
  }

  // ── Arrastrar de una mesa a otra para juntarlas ──────────────────────────
  let unir = null, suprimirClick = false;

  function lineaFantasma(x, y) {
    const svg = $('#uniones');
    const base = planoEl.getBoundingClientRect();
    const r = unir.el.getBoundingClientRect();
    let l = svg.querySelector('line.fantasma');
    if (!l) {
      l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      l.setAttribute('class', 'fantasma');
      svg.appendChild(l);
    }
    l.setAttribute('x1', r.left - base.left + r.width / 2);
    l.setAttribute('y1', r.top - base.top + r.height / 2);
    l.setAttribute('x2', x - base.left);
    l.setAttribute('y2', y - base.top);
  }
  function quitarFantasma() {
    const l = $('#uniones') && $('#uniones').querySelector('line.fantasma');
    if (l) l.remove();
  }

  planoEl.addEventListener('pointerdown', e => {
    const t = e.target.closest('.mesa-plano');
    if (!t) return;
    unir = { origen: t.dataset.mesa, el: t, x0: e.clientX, y0: e.clientY, movido: 0, destino: null };
  });

  document.addEventListener('pointermove', e => {
    if (!unir) return;
    unir.movido = Math.max(unir.movido, Math.hypot(e.clientX - unir.x0, e.clientY - unir.y0));
    if (unir.movido < 10) return;
    e.preventDefault();
    unir.el.classList.add('origen');

    const bajo = document.elementFromPoint(e.clientX, e.clientY);
    const t = bajo && bajo.closest ? bajo.closest('.mesa-plano') : null;
    const destino = (t && t.dataset.mesa !== unir.origen) ? t.dataset.mesa : null;
    if (destino !== unir.destino) {
      $$('.mesa-plano.destino').forEach(x => x.classList.remove('destino'));
      if (t && destino) t.classList.add('destino');
      unir.destino = destino;
    }
    lineaFantasma(e.clientX, e.clientY);
  }, { passive: false });

  function soltarUnion() {
    if (!unir) return;
    const u = unir;
    unir = null;
    $$('.mesa-plano.origen, .mesa-plano.destino').forEach(x => x.classList.remove('origen', 'destino'));
    quitarFantasma();
    if (u.movido < 10) return;              // fue un toque, no un arrastre

    suprimirClick = true;                   // que el toque no abra la mesa
    setTimeout(() => { suprimirClick = false; }, 350);
    if (u.destino) {
      Store.unirMesas(u.origen, u.destino);
      UI.toast(`${Store.nombreCuenta(u.origen)} — cuenta compartida`, 'ok');
    }
  }
  document.addEventListener('pointerup', soltarUnion);
  document.addEventListener('pointercancel', soltarUnion);

  planoEl.addEventListener('click', e => {
    const sep = e.target.closest('[data-separar]');
    if (sep) {
      Store.separarMesas(sep.dataset.separar);
      UI.toast('Mesas separadas');
      return;
    }
    if (suprimirClick) return;
    const t = e.target.closest('.mesa-plano');
    if (t) abrirMesa(t.dataset.mesa);
  });

  $('#zonas').addEventListener('click', e => {
    const b = e.target.closest('.zona-btn');
    if (b) abrirMesa(b.dataset.mesa);
  });

  window.addEventListener('resize', () => requestAnimationFrame(dibujarUniones));

  // ── Cambio de vista ──────────────────────────────────────────────────────
  function irASalon() {
    st.vista = 'salon';
    $('#vista-salon').hidden = false;
    $('#vista-pedido').hidden = true;
    pintarSalon();
  }

  function abrirMesa(mesa) {
    st.mesa = mesa;
    st.vista = 'pedido';
    $('#vista-salon').hidden = true;
    $('#vista-pedido').hidden = false;
    limpiarCodigo();
    setCant(1);
    limpiarNotas();
    pintarCabecera();
    pintarPedido();
    pintarLector();
  }

  $('#volver').onclick = irASalon;
  $('#separar').onclick = () => {
    if (!st.mesa) return;
    Store.separarMesas(st.mesa);
    UI.toast('Mesas separadas');
    pintarCabecera();
    pintarPedido();
  };

  function pintarCabecera() {
    if (!st.mesa) return;
    $('#titulo-mesa').textContent = Store.nombreCuenta(st.mesa);
    $('#separar').hidden = !Store.grupoDe(st.mesa);
    const c = Store.cuentaDe(st.mesa);
    $('#resumen-mesa').textContent = c
      ? `${c.pedidos.length} ronda${c.pedidos.length === 1 ? '' : 's'} · ${UI.soles(c.total)} · desde ${UI.hora(c.desde)}`
      : 'Mesa sin consumo';
  }

  // ═══ VISTA 2 · LECTOR DE CÓDIGOS ═════════════════════════════════════════
  function pintarLector() {
    const p = platoActual();
    const d = st.buf.padStart(3, ' ').split('');
    $('#slots').innerHTML = d.map((ch, i) => {
      const vacio = ch === ' ';
      const cursor = i === st.buf.length - 1;
      return `<span class="slot ${vacio ? 'vacio' : ''} ${cursor && st.buf ? 'cursor' : ''}">${vacio ? '·' : ch}</span>`;
    }).join('');

    const nom = $('#nombre'), pre = $('#precio'), cat = $('#cat');
    if (!st.buf) {
      nom.textContent = 'Marca un código';
      nom.classList.add('libre');
      pre.textContent = '';
      cat.textContent = 'Del 1 al 154 · bebidas 201+';
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

    // Qué trae el plato (los combos lo necesitan)
    $('#detalle-plato').textContent = (p && !p.out && p.d) ? p.d : '';

    /* El selector de tamaño solo aparece si el plato de verdad tiene dos. */
    const puedeF = !!(p && p.pf);
    $('#tamanos').hidden = !puedeF;
    if (!puedeF) st.tamano = 'R';
    $('#tamanos').querySelectorAll('button').forEach(b => {
      b.classList.toggle('on', b.dataset.t === st.tamano);
    });
    $('#cant').textContent = st.cant;
    $('#keypad .agregar').disabled = !p || p.out || !st.mesa;
  }

  // ── Rueda de códigos ─────────────────────────────────────────────────────
  const rueda = $('#rueda');
  let bloqueoScroll = false, tScroll = null;

  function pintarRueda() {
    const lista = Store.carta();
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

  /* La rueda solo impone su código cuando la está moviendo el mozo.
     Al centrar un código, el navegador anima el desplazamiento y sigue
     lanzando eventos de scroll un rato después; sin esta marca, esa animación
     podía volver a escribir el código justo después de que se limpió al
     agregar el plato. */
  let ruedaUsuario = false, tUsuario = null;
  function laMueveElMozo() {
    ruedaUsuario = true;
    clearTimeout(tUsuario);
    tUsuario = setTimeout(() => { ruedaUsuario = false; }, 1000);
  }
  ['pointerdown', 'touchstart', 'wheel', 'keydown'].forEach(ev =>
    rueda.addEventListener(ev, laMueveElMozo, { passive: true }));

  rueda.addEventListener('scroll', () => {
    if (bloqueoScroll || !ruedaUsuario) return;
    clearTimeout(tScroll);
    tScroll = setTimeout(() => {
      const c = codigoEnCentro();
      if (c != null && String(c) !== st.buf) {
        st.buf = String(c);
        const p = platoActual();
        if (!p || !p.pf) st.tamano = 'R';
        pintarLector();
        marcarCentro();
      }
    }, 110);
  });

  /* Deja el lector en blanco de forma definitiva: corta la animación de
     centrado y el scroll pendiente, para que nada reescriba el código. */
  function limpiarCodigo() {
    clearTimeout(tScroll);
    clearTimeout(centrar._t);
    clearTimeout(tUsuario);
    bloqueoScroll = false;
    ruedaUsuario = false;
    st.buf = '';
    st.tamano = 'R';
    pintarLector();
    marcarCentro();
  }

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
  const soltarRueda = () => {
    if (!arrastre) return;
    const movido = arrastre.movido;
    arrastre = null;
    rueda.classList.remove('arrastrando');
    if (movido > 6) {
      const c = codigoEnCentro();
      if (c != null) { st.buf = String(c); pintarLector(); centrar(c); marcarCentro(); }
    }
  };
  rueda.addEventListener('pointerup', soltarRueda);
  rueda.addEventListener('pointercancel', soltarRueda);
  rueda.addEventListener('pointerleave', soltarRueda);

  rueda.addEventListener('click', e => {
    const it = e.target.closest('.rueda-item');
    if (it) setBuf(it.dataset.c);
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
    if (k === 'C') limpiarCodigo();
    else if (k === '⌫') setBuf(st.buf.slice(0, -1));
    else if (k === 'add') agregar();
    else digito(k);
  });

  // ── Notas de cocina ──────────────────────────────────────────────────────
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

  /* "Listo" cierra el teclado de la tablet y confirma la nota que quedará
     pegada al próximo plato que se agregue. */
  $('#nota-listo').onclick = () => {
    $('#nota-libre').blur();
    const t = notasTexto();
    UI.toast(t ? `Nota lista: ${t}` : 'Sin nota para este plato');
  };
  $('#nota-limpiar').onclick = () => {
    limpiarNotas();
    $('#nota-libre').blur();
    UI.toast('Notas limpias');
  };

  // ── Acciones sobre el código ─────────────────────────────────────────────
  function setBuf(v, conCentro = true) {
    clearTimeout(tScroll);          // que un scroll pendiente no pise esto
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

  // ── Lista completa de la carta ───────────────────────────────────────────
  /* Se abre desde "Ver lista de platos". El buscador filtra con cada tecla:
     escribir "tip" ya deja a la vista los tipakay. Sin consulta, la carta se
     muestra agrupada por categoría. */
  let catActiva = 'todas';

  function abrirLista() {
    $('#lista-fondo').hidden = false;
    $('#lista-buscar').value = '';
    catActiva = 'todas';
    pintarCategorias();
    pintarLista();
    // En tablet conviene ver la lista antes de que suba el teclado.
    if (!matchMedia('(pointer: coarse)').matches) $('#lista-buscar').focus();
  }
  function cerrarLista() { $('#lista-fondo').hidden = true; }

  function pintarCategorias() {
    $('#lista-cats').innerHTML =
      `<button type="button" class="cat-chip ${catActiva === 'todas' ? 'on' : ''}" data-cat="todas">Todas</button>` +
      CATEGORIAS.map(c => `<button type="button" class="cat-chip ${catActiva === c.id ? 'on' : ''}" data-cat="${c.id}">
        ${UI.esc(c.nombre)} <span style="opacity:.55">${UI.esc(c.rango)}</span>
      </button>`).join('');
  }

  function pintarLista() {
    const q = $('#lista-buscar').value;
    let lista = Store.carta();
    if (catActiva !== 'todas') lista = lista.filter(p => p.cat === catActiva);
    lista = Texto.filtrarCarta(lista, q);

    if (!lista.length) {
      $('#lista-cuerpo').innerHTML = `<div class="lista-nada">
        <b>Nada con “${UI.esc(q)}”</b>
        Prueba con menos letras o toca otra categoría.
      </div>`;
      return;
    }

    const fila = p => `<button type="button" class="lista-item ${p.out ? 'agotado' : ''}" data-c="${p.c}">
      ${UI.chapa(p.c, p.bar ? 'bar' : '')}
      <span class="li-nom">${Texto.resaltar(p.n, q)}${p.d ? `<em>${UI.esc(p.d)}</em>` : ''}</span>
      <span class="li-pre">${p.out ? 'Agotado' : UI.soles(p.p)}
        ${!p.out && p.pf ? `<small>familiar ${p.pf.toFixed(2)}</small>` : ''}</span>
    </button>`;

    // Con búsqueda: lista corrida. Sin búsqueda: agrupada por categoría.
    if (q.trim()) {
      $('#lista-cuerpo').innerHTML =
        `<div class="lista-grupo">${lista.length} plato${lista.length === 1 ? '' : 's'}</div>` +
        lista.map(fila).join('');
      return;
    }
    let html = '';
    CATEGORIAS.forEach(c => {
      const dela = lista.filter(p => p.cat === c.id);
      if (!dela.length) return;
      html += `<div class="lista-grupo">${UI.esc(c.nombre)} · ${UI.esc(c.rango)}</div>` + dela.map(fila).join('');
    });
    $('#lista-cuerpo').innerHTML = html;
  }

  $('#ver-lista').onclick = abrirLista;
  $('#lista-cerrar').onclick = cerrarLista;
  $('#lista-buscar').addEventListener('input', pintarLista);
  $('#lista-fondo').addEventListener('click', e => { if (e.target.id === 'lista-fondo') cerrarLista(); });

  $('#lista-cats').addEventListener('click', e => {
    const b = e.target.closest('.cat-chip');
    if (!b) return;
    catActiva = b.dataset.cat;
    pintarCategorias();
    pintarLista();
  });

  $('#lista-cuerpo').addEventListener('click', e => {
    const b = e.target.closest('.lista-item');
    if (!b) return;
    setBuf(b.dataset.c);
    cerrarLista();
  });

  /* Enter con un solo resultado lo elige directo. */
  $('#lista-buscar').addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.stopPropagation(); cerrarLista(); return; }
    if (e.key !== 'Enter') return;
    const items = $('#lista-cuerpo').querySelectorAll('.lista-item');
    if (items.length === 1) items[0].click();
  });

  // ── Borrador del pedido ──────────────────────────────────────────────────
  function agregar() {
    if (!st.buf) return;            // nada marcado: sin ruido
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
      cant: st.cant, tamano: st.tamano, notas, bar: !!p.bar,
      detalle: p.d || ''
    });

    guardarBorradores();
    UI.toast(`${st.cant} × ${p.n}${st.tamano === 'F' ? ' familiar' : ''}`, 'ok');
    limpiarCodigo();                // el lector queda en blanco para el siguiente
    setCant(1);
    limpiarNotas();
    pintarPedido();
  }

  function enviar() {
    const items = borrador();
    if (!st.mesa || !items.length) return;
    /* Los platos van a cocina; las bebidas se suman a la cuenta y las lleva
       el mozo, sin comanda: no hay nada que preparar. */
    const { comida, barra } = Store.enviarRonda({
      mesa: st.mesa, mozo: Store.config().mozo, items
    });
    st.borradores[st.mesa] = [];
    guardarBorradores();

    /* La cocina del chifa trabaja con papel, no con pantalla: la comanda
       sale acá mismo, al mandar el pedido. Queda marcada como impresa, así
       que si además hay pantalla de cocina abierta, no la duplica. */
    let impresa = false;
    if (comida && Store.config().imprimirAlEnviar) {
      impresa = Impresion.imprimirComanda(comida);
    }

    const partes = [];
    if (comida) partes.push(`Pedido N° ${comida.num}${impresa ? ' · comanda impresa' : ' a cocina'}`);
    if (barra) {
      const n = barra.items.reduce((t, i) => t + i.cant, 0);
      partes.push(`${n} bebida${n === 1 ? '' : 's'} a la cuenta`);
    }
    UI.toast(partes.join(' · '), 'ok');

    pintarPedido();
    pintarCabecera();
  }
  $('#enviar').onclick = enviar;
  $('#enviar-pad').onclick = enviar;

  $('#vaciar').onclick = () => {
    if (!st.mesa || !borrador().length) return;
    st.borradores[st.mesa] = [];
    guardarBorradores();
    pintarPedido();
  };

  $('#lineas').addEventListener('click', e => {
    const q = e.target.closest('[data-quitar]');
    if (q) {
      borrador().splice(Number(q.dataset.quitar), 1);
      guardarBorradores();
      pintarPedido();
      return;
    }
    const a = e.target.closest('[data-anular]');
    if (a) {
      const [pid, uid] = a.dataset.anular.split('|');
      if (confirm('¿Quitar este plato del pedido ya enviado?')) {
        Store.quitarItem(pid, uid);
        pintarPedido();
        pintarCabecera();
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
    const cuenta = st.mesa ? Store.cuentaDe(st.mesa) : null;
    const grupo = st.mesa ? Store.grupoDe(st.mesa) : null;
    const items = borrador();
    let html = '';

    // Rondas ya enviadas
    if (cuenta) {
      cuenta.pedidos.slice().sort((a, b) => a.creado - b.creado).forEach(p => {
        html += `<div class="ronda-previa">
          <div class="rot">
            <span>${p.origen === 'barra' ? 'Bebidas' : `Pedido N° ${p.num}`}${grupo ? ` · mesa ${UI.esc(p.mesa)}` : ''} · ${UI.hora(p.creado)}</span>
            <span>
              ${p.origen === 'barra'
                ? '<span class="pill bar">la lleva el mozo</span>'
                : `<span class="pill ${p.estado}">${p.estado}</span>
                   <button class="btn chico fantasma" data-reimprimir="${p.id}" style="margin-left:6px">Copia</button>`}
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
      html += `<div class="ronda-previa"><div class="rot">
        <span>Por enviar${grupo ? ` · mesa ${UI.esc(st.mesa)}` : ''}</span>
        <span>${items.length} línea${items.length === 1 ? '' : 's'}</span>
      </div></div>`;
      html += items.map((i, idx) => `
        <div class="linea">
          ${UI.chapa(i.codigo, i.bar ? 'bar' : '')}
          <span class="txt"><b>${UI.esc(i.nombre)}${i.tamano === 'F' ? ' (Fam.)' : ''}</b>
            ${i.notas ? `<small>${UI.esc(i.notas)}</small>` : ''}</span>
          <span class="cant">${i.cant}</span>
          <button class="quitar" data-quitar="${idx}" title="Quitar">×</button>
        </div>`).join('');
    }

    if (!html) html = '<div class="vacio-msg">Marca un código y toca <b>Agregar al pedido</b>.</div>';
    $('#lineas').innerHTML = html;

    const totalBorrador = items.reduce((t, i) =>
      t + (i.tamano === 'F' && i.precioF ? i.precioF : i.precio) * i.cant, 0);
    $('#total-borrador').textContent = UI.soles(totalBorrador);
    $('#total-mesa').textContent = UI.soles(cuenta ? cuenta.total : 0);

    // Los dos botones de enviar (el del panel y el de abajo del teclado)
    const platos = items.reduce((t, i) => t + i.cant, 0);
    const sinNada = !st.mesa || !items.length;
    $('#enviar').disabled = sinNada;
    $('#enviar-pad').disabled = sinNada;
    const etq = Store.config().imprimirAlEnviar ? 'Enviar e imprimir' : 'Enviar a cocina';
    $('#enviar').textContent = etq;
    $('#enviar-pad').textContent = sinNada
      ? etq
      : `${etq} · ${platos} plato${platos === 1 ? '' : 's'} · ${UI.soles(totalBorrador)}`;
  }

  // ── Atajos de teclado ────────────────────────────────────────────────────
  document.addEventListener('keydown', e => {
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) {
      if (e.key === 'Escape') e.target.blur();
      return;
    }
    // Con la lista abierta, las teclas son para la lista
    if (!$('#lista-fondo').hidden) {
      if (e.key === 'Escape') cerrarLista();
      return;
    }
    if (st.vista !== 'pedido') return;

    if (e.key >= '0' && e.key <= '9') { digito(e.key); e.preventDefault(); return; }
    switch (e.key) {
      case 'Backspace': setBuf(st.buf.slice(0, -1)); e.preventDefault(); break;
      case 'Escape':    limpiarCodigo(); limpiarNotas(); setCant(1); break;
      case 'Enter':
        e.preventDefault();
        if (e.repeat) break;        // tecla mantenida: no repetir el plato
        e.ctrlKey ? enviar() : agregar();
        break;
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

  // ── Avisos de cocina ─────────────────────────────────────────────────────
  let listosVistos = new Set(Store.pedidosActivos().filter(p => p.estado === 'listo').map(p => p.id));
  function revisarListos() {
    const listos = Store.pedidosActivos().filter(p => p.estado === 'listo');
    listos.forEach(p => {
      if (!listosVistos.has(p.id)) {
        listosVistos.add(p.id);
        UI.toast(`Listo para recoger: ${Store.nombreCuenta(p.mesa)} · pedido N° ${p.num}`, 'ok');
        UI.campana();
      }
    });
    listosVistos = new Set([...listosVistos].filter(id => listos.some(p => p.id === id)));
  }

  // ── Arranque ─────────────────────────────────────────────────────────────
  const selMozo = $('#sel-mozo');
  selMozo.value = Store.config().mozo;
  selMozo.onchange = () => Store.setConfig({ mozo: selMozo.value });

  pintarRueda();
  irASalon();

  /* La rueda solo se rearma si la carta cambió (agotados, precios): rearmarla
     en cada pedido nuevo le movería el scroll al mozo mientras marca. */
  let firmaCarta = JSON.stringify(Store.estado().cartaEdits);

  Store.on(() => {
    revisarListos();
    if (st.vista === 'salon') pintarSalon();
    else { pintarCabecera(); pintarPedido(); }

    const firma = JSON.stringify(Store.estado().cartaEdits);
    if (firma !== firmaCarta) {
      firmaCarta = firma;
      pintarRueda();
      pintarLector();
      if (st.buf) centrar(Number(st.buf), false);
    }
  });

  /* Solo el texto del cronómetro: repintar el plano entero cada segundo
     cortaría un arrastre en curso. */
  function tickSalon() {
    $$('#mesas-plano .mp-tiempo').forEach(el => {
      el.textContent = UI.transcurrido(Number(el.dataset.desde));
    });
  }

  setInterval(() => {
    $('#reloj').textContent = UI.horaSeg(Date.now());
    if (st.vista === 'salon') tickSalon();
  }, 1000);
  $('#reloj').textContent = UI.horaSeg(Date.now());
})();
