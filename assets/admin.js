/* Panel del dueño: cuánto entró, qué se pide y quién entra al sistema.

   Los gráficos van con barras de CSS, sin librerías. Además de funcionar sin
   internet, se leen igual en la tablet del chifa que en la computadora de la
   caja, y no hay nada que actualizar el día que la librería cambie.        */

(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  let hoja = 'dia';
  let diasSemana = 7;
  let diasPlatos = 7;

  // ── Piezas que se repiten ────────────────────────────────────────────────
  const tarjeta = (etq, valor, pie = '') => `
    <div class="tarjeta">
      <span class="t-etq">${UI.esc(etq)}</span>
      <span class="t-val">${valor}</span>
      ${pie ? `<span class="t-pie">${pie}</span>` : ''}
    </div>`;

  /* Una fila del gráfico. `parte` va de 0 a 1 y es lo que mide la barra:
     siempre contra el máximo de la tanda, que es lo que deja comparar. */
  const barra = (etq, valor, parte, extra = '') => `
    <div class="barra-fila">
      <span class="b-etq" title="${UI.esc(etq)}">${UI.esc(etq)}</span>
      <span class="b-riel"><span class="b-relleno" style="width:${Math.max(parte * 100, valor > 0 ? 2 : 0)}%"></span></span>
      <span class="b-val">${valor}${extra}</span>
    </div>`;

  const nombreDia = clave => {
    const [a, m, d] = clave.split('-').map(Number);
    const f = new Date(a, m - 1, d);
    return f.toLocaleDateString('es-PE', { weekday: 'short', day: '2-digit', month: '2-digit' });
  };

  // ══ HOY ═══════════════════════════════════════════════════════════════════
  function pintarDia() {
    const r = Store.resumenDia();
    $('#fecha-hoy').textContent = new Date().toLocaleDateString('es-PE', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    const platos = r.top.reduce((t, p) => t + p.cant, 0);
    $('#tarjetas-dia').innerHTML =
      tarjeta('Entró hoy', UI.soles(r.total), `${r.ventas} cuenta${r.ventas === 1 ? '' : 's'} cobrada${r.ventas === 1 ? '' : 's'}`) +
      tarjeta('Ticket promedio', UI.soles(r.promedio), 'por cuenta') +
      tarjeta('Platos servidos', platos, `${r.top.length} distintos`) +
      tarjeta('Descuentos', UI.soles(r.descuentos), r.descuentos ? 'revisar' : 'ninguno');

    const metodos = Object.entries(r.metodos).sort((a, b) => b[1] - a[1]);
    const maxM = Math.max(1, ...metodos.map(m => m[1]));
    $('#metodos-dia').innerHTML = metodos.length
      ? `<div class="barras">${metodos.map(([m, t]) =>
          barra(m, UI.soles(t), t / maxM)).join('')}</div>`
      : '<p class="vacio-msg">Todavía no se cobró nada hoy.</p>';

    const mozos = Store.porMozo();
    const maxZ = Math.max(1, ...mozos.map(m => m.total));
    $('#mozos-dia').innerHTML = mozos.length
      ? `<div class="barras">${mozos.map(m =>
          barra(m.mozo, UI.soles(m.total), m.total / maxZ, ` · ${m.cuentas}`)).join('')}</div>`
      : '<p class="vacio-msg">Sin cuentas cobradas todavía.</p>';

    const ventas = Store.ventasDia().slice().sort((a, b) => b.cerrado - a.cerrado);
    $('#ventas-dia').innerHTML = ventas.length ? `
      <table class="tabla">
        <thead><tr><th>N°</th><th>Mesa</th><th>Hora</th><th>Mozo</th><th>Pago</th><th class="n">Total</th></tr></thead>
        <tbody>${ventas.map(v => `
          <tr>
            <td>${String(v.num).padStart(4, '0')}</td>
            <td>${UI.esc(v.nombreMesa || v.mesa)}</td>
            <td>${UI.hora(v.cerrado)}</td>
            <td>${UI.esc((v.mozos || []).join(', ') || '—')}</td>
            <td>${UI.esc(v.metodo)}</td>
            <td class="n dinero">${UI.soles(v.total)}</td>
          </tr>`).join('')}
        </tbody>
      </table>` : '<p class="vacio-msg">Ninguna cuenta cobrada hoy.</p>';
  }

  // ══ LA SEMANA ═════════════════════════════════════════════════════════════
  function pintarSemana() {
    const dias = Store.resumenDias(diasSemana);
    const total = dias.reduce((t, d) => t + d.total, 0);
    const cuentas = dias.reduce((t, d) => t + d.ventas, 0);
    const conVentas = dias.filter(d => d.ventas > 0);
    const mejor = dias.slice().sort((a, b) => b.total - a.total)[0];

    $('#tarjetas-semana').innerHTML =
      tarjeta(`Entró en ${diasSemana} días`, UI.soles(total), `${cuentas} cuenta${cuentas === 1 ? '' : 's'}`) +
      tarjeta('Por día abierto', UI.soles(conVentas.length ? total / conVentas.length : 0),
              `${conVentas.length} día${conVentas.length === 1 ? '' : 's'} con ventas`) +
      tarjeta('Ticket promedio', UI.soles(cuentas ? total / cuentas : 0), 'por cuenta') +
      tarjeta('El mejor día', mejor && mejor.total ? UI.soles(mejor.total) : '—',
              mejor && mejor.total ? nombreDia(mejor.dia) : 'sin ventas todavía');

    const max = Math.max(1, ...dias.map(d => d.total));
    /* Columnas y no filas: así se ve la forma de la semana de un vistazo —
       qué días levanta el chifa y cuáles se caen. */
    $('#grafico-dias').innerHTML = dias.map(d => `
      <div class="col-dia ${d.dia === Store.hoy() ? 'hoy' : ''}" title="${nombreDia(d.dia)}: ${UI.soles(d.total)}">
        <span class="cd-val">${d.total ? UI.soles(d.total).replace(/^S\/\s*/, '') : ''}</span>
        <span class="cd-barra" style="height:${(d.total / max) * 100}%"></span>
        <span class="cd-etq">${nombreDia(d.dia)}</span>
      </div>`).join('');
  }

  // ══ PLATOS ════════════════════════════════════════════════════════════════
  function pintarPlatos() {
    const r = Store.ranking(diasPlatos);
    const mas = r.mas.slice(0, 12);
    const max = Math.max(1, ...mas.map(p => p.cant));

    $('#mas-pedidos').innerHTML = mas.length
      ? mas.map(p => barra(
          `${String(p.codigo).padStart(2, '0')} · ${p.nombre}`, p.cant, p.cant / max, ' ud')).join('')
      : '<p class="vacio-msg">Todavía no hay ventas en este tiempo.</p>';

    /* De los que no salen se muestran solo los de comida: que nadie pida un
       vino en particular no dice gran cosa, que no salga un plato sí.

       Se ordenan por lo que vendieron y, a igualdad, por número de carta.
       Antes salían los de código más alto por casualidad del desempate, que
       no le dice nada a nadie: así al menos se leen en el orden de la carta,
       y los que algo vendieron van primero, que son los que se pueden
       levantar recomendándolos. */
    const comida = r.todos.filter(p => !p.bar);
    const flojos = comida.slice()
      .sort((a, b) => a.cant - b.cant || a.codigo - b.codigo)
      .slice(0, 12);
    const enCero = comida.filter(p => p.cant === 0).length;

    $('#menos-pedidos').innerHTML = (flojos.length
      ? flojos.map(p => barra(
          `${String(p.codigo).padStart(2, '0')} · ${p.nombre}`, p.cant, p.cant / max, ' ud')).join('')
      : '<p class="vacio-msg">Nada que mostrar.</p>') +
      (enCero ? `<p class="bloque-pie">${enCero} de los ${comida.length} platos de la carta
         no salieron ni una vez en estos ${r.dias} días.</p>` : '');
  }

  // ══ EL EQUIPO ═════════════════════════════════════════════════════════════
  function pintarGente() {
    const gente = Store.usuarios();
    const yo = Store.sesion();
    $('#gente').innerHTML = gente.map(u => `
      <div class="persona ${u.activo ? '' : 'baja'}">
        <span class="p-ini">${UI.esc(u.nombre.slice(0, 1).toUpperCase())}</span>
        <span class="p-datos">
          <b>${UI.esc(u.nombre)}${yo && yo.id === u.id ? ' <span class="p-tu">tú</span>' : ''}</b>
          <small>${UI.esc(Store.NOMBRE_ROL[u.rol] || u.rol)}${u.activo ? '' : ' · dado de baja'}</small>
        </span>
        <span class="p-acciones">
          <button class="btn chico fantasma" data-editar="${u.id}">Editar</button>
          <button class="btn chico fantasma" data-baja="${u.id}">${u.activo ? 'Dar de baja' : 'Reactivar'}</button>
          <button class="btn chico fantasma peligro" data-borrar="${u.id}">Borrar</button>
        </span>
      </div>`).join('') || '<p class="vacio-msg">No hay nadie dado de alta.</p>';

    const partes = ['mozo', 'cocina', 'caja', 'admin', 'dinero'];
    const rotulo = { mozo: 'Salón', cocina: 'Cocina', caja: 'Caja', admin: 'Admin', dinero: 'Ve el dinero' };
    $('#tabla-permisos').innerHTML = `
      <table class="tabla">
        <thead><tr><th>Puesto</th>${partes.map(p => `<th class="n">${rotulo[p]}</th>`).join('')}</tr></thead>
        <tbody>${Object.entries(Store.PERMISOS).map(([rol, p]) => `
          <tr>
            <td><b>${UI.esc(Store.NOMBRE_ROL[rol] || rol)}</b></td>
            ${partes.map(k => `<td class="n">${p[k] ? '<span class="si">sí</span>' : '<span class="no">—</span>'}</td>`).join('')}
          </tr>`).join('')}
        </tbody>
      </table>`;
  }

  // ── Alta y edición ───────────────────────────────────────────────────────
  let editando = null;

  function abrirUsuario(id) {
    editando = id || null;
    const u = id ? Store.usuario(id) : null;
    $('#usuario-titulo').textContent = u ? `Editar a ${u.nombre}` : 'Dar de alta';
    $('#u-nombre').value = u ? u.nombre : '';
    $('#u-rol').value = u ? u.rol : 'mozo';
    $('#u-pin').value = '';
    $('#u-pin-etq').textContent = u
      ? 'PIN nuevo (déjalo vacío para no cambiarlo)'
      : 'PIN (4 a 8 números)';
    $('#u-msg').hidden = true;
    $('#dlg-usuario').hidden = false;
    $('#u-nombre').focus();
  }

  const cerrarUsuario = () => { $('#dlg-usuario').hidden = true; editando = null; };

  function avisoUsuario(t, tipo = 'error') {
    $('#u-msg').textContent = t;
    $('#u-msg').className = `nube-msg ${tipo}`;
    $('#u-msg').hidden = false;
  }

  $('#nuevo-usuario').onclick = () => abrirUsuario(null);
  $('#u-cancelar').onclick = cerrarUsuario;

  $('#form-usuario').addEventListener('submit', e => {
    e.preventDefault();
    const nombre = $('#u-nombre').value.trim();
    const rol = $('#u-rol').value;
    const pin = $('#u-pin').value.trim();

    if (editando) {
      const cambios = { nombre, rol };
      if (pin) cambios.pin = pin;
      const r = Store.editarUsuario(editando, cambios);
      if (!r.ok) return avisoUsuario(r.motivo);
      UI.toast('Guardado', 'ok');
    } else {
      const r = Store.crearUsuario({ nombre, rol, pin });
      if (!r.ok) return avisoUsuario(r.motivo);
      UI.toast(`${nombre} ya puede entrar`, 'ok');
    }
    cerrarUsuario();
    pintarGente();
  });

  $('#gente').addEventListener('click', e => {
    const ed = e.target.closest('[data-editar]');
    if (ed) return abrirUsuario(ed.dataset.editar);

    const ba = e.target.closest('[data-baja]');
    if (ba) {
      const u = Store.usuario(ba.dataset.baja);
      if (!u) return;
      const r = Store.editarUsuario(u.id, { activo: !u.activo });
      if (!r.ok) UI.toast(r.motivo, 'error');
      else UI.toast(u.activo ? `${u.nombre} ya no puede entrar` : `${u.nombre} puede entrar otra vez`, 'ok');
      pintarGente();
      return;
    }

    const bo = e.target.closest('[data-borrar]');
    if (bo) {
      const u = Store.usuario(bo.dataset.borrar);
      if (!u || !confirm(`¿Borrar a ${u.nombre}? Sus cuentas cobradas se quedan como están.`)) return;
      const r = Store.borrarUsuario(u.id);
      if (!r.ok) UI.toast(r.motivo, 'error');
      pintarGente();
    }
  });

  // ── Pestañas ─────────────────────────────────────────────────────────────
  $('#tabs').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    hoja = b.dataset.t;
    $$('#tabs button').forEach(x => x.classList.toggle('on', x === b));
    ['dia', 'semana', 'platos', 'gente'].forEach(h => {
      document.getElementById(`hoja-${h}`).hidden = h !== hoja;
    });
    pintarTodo();
  });

  $('#rango-semana').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    diasSemana = Number(b.dataset.d);
    $$('#rango-semana button').forEach(x => x.classList.toggle('on', x === b));
    pintarSemana();
  });

  $('#rango-platos').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    diasPlatos = Number(b.dataset.d);
    $$('#rango-platos button').forEach(x => x.classList.toggle('on', x === b));
    pintarPlatos();
  });

  // ── Arranque ─────────────────────────────────────────────────────────────
  function pintarTodo() {
    const yo = Store.sesion();
    $('#quien-top').textContent = yo ? `${yo.nombre} · ${Store.NOMBRE_ROL[yo.rol]}` : '';
    if (hoja === 'dia') pintarDia();
    else if (hoja === 'semana') pintarSemana();
    else if (hoja === 'platos') pintarPlatos();
    else pintarGente();
  }

  function reloj() { $('#reloj').textContent = UI.horaSeg(Date.now()); }

  pintarTodo();
  reloj();
  Store.on(() => {
    /* Si el dueño se quitó a sí mismo el puesto desde otro equipo, esta
       pantalla deja de ser suya. */
    if (!Store.puede('admin')) return location.replace('index.html');
    pintarTodo();
  });
  setInterval(reloj, 1000);
  setInterval(pintarTodo, 20000);
  Store.arrancar().then(pintarTodo);
})();
