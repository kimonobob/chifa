/* Panel del dueño: cuánto entró, qué se pide y quién entra al sistema.
   Implementa el diseño "Panel Admin v2" hecho en Claude Design.

   Los gráficos van con SVG y barras de CSS, sin librerías. Además de
   funcionar sin internet, se leen igual en la tablet del chifa que en la
   computadora de la caja, y no hay nada que actualizar el día que la
   librería cambie.                                                        */

(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  let vista = 'hoy';          // 'hoy' | 'semana' | 'equipo'
  let mezcla = 'top';         // 'top' | 'low'
  let rolAlta = 'mozo';
  let editando = null;

  const NOMBRE_DIA = clave => {
    const [a, m, d] = clave.split('-').map(Number);
    return new Date(a, m - 1, d).toLocaleDateString('es-PE', { weekday: 'short' }).toUpperCase().slice(0, 3);
  };
  const iniciales = n => n.trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase();
  const soles = n => UI.soles(n);

  /* Hace cuánto, en palabras. "hoy 13:42" dice más que una fecha completa
     cuando lo que se quiere saber es si alguien entró esta mañana. */
  function cuando(ts) {
    if (!ts) return 'nunca entró';
    const dias = Math.floor((Date.now() - ts) / 86400000);
    /* En 24 horas y sin "p. m.": esto va en una fila estrecha y con el
       formato largo se parte en dos líneas. */
    const hora = new Date(ts).toLocaleTimeString('es-PE',
      { hour: '2-digit', minute: '2-digit', hour12: false });
    if (Store.diaDe(ts) === Store.hoy()) return `hoy ${hora}`;
    if (dias <= 1) return `ayer ${hora}`;
    if (dias < 30) return `hace ${dias} días`;
    return UI.fecha(ts);
  }

  // ── El día de ayer, para poder comparar ──────────────────────────────────
  const diaAtras = n => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return Store.diaDe(d.getTime());
  };

  /* Un porcentaje de cambio solo tiene sentido si había algo con qué
     comparar. Sin datos de ayer se dice "sin comparar" en vez de inventar
     un +100% que no significa nada. */
  function variacion(hoy, antes) {
    if (!antes) return { txt: 'sin comparar', sube: null };
    const p = ((hoy - antes) / antes) * 100;
    return {
      txt: `${p >= 0 ? '+' : '−'}${Math.abs(p).toFixed(1)}%`,
      sube: p >= 0
    };
  }

  // ── Piezas ───────────────────────────────────────────────────────────────
  function kpi({ etq, cifra, delta, sube, nota, serie }) {
    const max = Math.max(1, ...serie);
    const clase = sube === null ? 'sin' : (sube ? '' : 'baja');
    return `
      <div class="kpi">
        <div class="fila">
          <span class="etq">${UI.esc(etq)}</span>
          <span class="delta ${clase}">${UI.esc(delta)}</span>
        </div>
        <div class="cifra">${UI.esc(cifra)}</div>
        <div class="chispa ${sube === false ? 'baja' : ''}">
          ${serie.map(v => `<span style="height:${Math.max(12, Math.round((v / max) * 100))}%"></span>`).join('')}
        </div>
        <div class="nota">${UI.esc(nota)}</div>
      </div>`;
  }

  /* El camino de la curva. `cerrar` la baja hasta el suelo para poder
     pintarla rellena. */
  function camino(vals, max, cerrar) {
    const W = 640, H = 198, aire = 8;
    const pts = vals.map((v, i) => [
      Math.round(((i / Math.max(1, vals.length - 1)) * W) * 10) / 10,
      Math.round((H - (v / max) * (H - aire)) * 10) / 10
    ]);
    const linea = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ');
    return { d: cerrar ? `${linea} L${W} ${H} L0 ${H} Z` : linea, pts };
  }

  function pintarCurva(vals, previos, etiquetas) {
    const max = Math.max(1, ...vals, ...previos) * 1.08;
    const actual = camino(vals, max, false);
    const area = camino(vals, max, true);
    const antes = camino(previos, max, false);
    $('#linea').setAttribute('d', actual.d);
    $('#area').setAttribute('d', area.d);
    $('#linea-previa').setAttribute('d', antes.d);
    $('#puntos').innerHTML = actual.pts.map(p =>
      `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#fffdf9" stroke="#c01018"
               stroke-width="2.5" vector-effect="non-scaling-stroke"></circle>`).join('');
    $('#eje').innerHTML = etiquetas.map(e => `<span>${UI.esc(e)}</span>`).join('');
  }

  // ══ HOY ═══════════════════════════════════════════════════════════════════
  function pintarHoy() {
    const r = Store.resumenDia();
    const ayer = Store.resumenDia(diaAtras(1));
    const horas = Store.ventasPorHora();
    const horasAyer = Store.ventasPorHora(diaAtras(1));

    /* Comparar el día entero de ayer con medio día de hoy no dice nada: se
       compara contra lo que ayer llevaba a esta misma hora. */
    const ahora = new Date().getHours();
    const ayerAEstaHora = horasAyer.filter(h => h.hora <= ahora).reduce((t, h) => t + h.total, 0);

    const min = Store.minutosCocina();
    const minAyer = Store.minutosCocina(diaAtras(1));
    const platos = r.top.reduce((t, p) => t + p.cant, 0);

    const vIngreso = variacion(r.total, ayerAEstaHora);
    const vTicket = variacion(r.promedio, ayer.promedio);

    $('#kpis').innerHTML =
      kpi({
        etq: 'Ingreso del día', cifra: soles(r.total),
        delta: vIngreso.txt, sube: vIngreso.sube,
        nota: ayerAEstaHora ? `Ayer ${soles(ayerAEstaHora)} a esta hora` : 'Ayer no hubo ventas',
        serie: horas.map(h => h.total)
      }) +
      kpi({
        etq: 'Cuentas cerradas', cifra: String(r.ventas),
        delta: r.ventas - ayer.ventas >= 0 ? `+${r.ventas - ayer.ventas}` : String(r.ventas - ayer.ventas),
        sube: r.ventas >= ayer.ventas,
        nota: `${platos} plato${platos === 1 ? '' : 's'} servido${platos === 1 ? '' : 's'}`,
        serie: horas.map(h => h.ventas)
      }) +
      kpi({
        etq: 'Ticket promedio', cifra: soles(r.promedio),
        delta: vTicket.txt, sube: vTicket.sube,
        nota: ayer.promedio ? `Ayer ${soles(ayer.promedio)}` : 'Sin ayer con qué comparar',
        serie: horas.map(h => (h.ventas ? h.total / h.ventas : 0))
      }) +
      (min === null
        ? kpi({
            etq: 'Minutos en cocina', cifra: '—', delta: 'sin datos', sube: null,
            nota: 'Nadie marcó pedidos como listos en la pantalla de cocina',
            serie: [0, 0, 0, 0, 0, 0]
          })
        : kpi({
            etq: 'Minutos en cocina', cifra: min.toFixed(1),
            delta: minAyer ? `${min - minAyer >= 0 ? '+' : '−'}${Math.abs(min - minAyer).toFixed(1)}` : 'sin comparar',
            sube: minAyer ? min <= minAyer : null,
            nota: min > 12 ? 'Sobre el límite de 12 min' : 'Dentro del límite de 12 min',
            serie: horas.map(h => h.ventas)
          }));

    $('#curva-titulo').textContent = 'Ingreso por hora';
    $('#curva-sub').textContent = `Total ${soles(r.total)} · comparado con ayer`;
    $('#leyenda-a').textContent = 'Hoy';
    $('#leyenda-b').textContent = 'Ayer';
    pintarCurva(
      horas.map(h => h.total),
      horasAyer.map(h => h.total),
      horas.map(h => `${h.hora}h`)
    );
  }

  // ══ SEMANA ════════════════════════════════════════════════════════════════
  function pintarSemana() {
    const dias = Store.resumenDias(7);
    const previos = Store.resumenDias(14).slice(0, 7);

    const total = dias.reduce((t, d) => t + d.total, 0);
    const totalPrev = previos.reduce((t, d) => t + d.total, 0);
    const cuentas = dias.reduce((t, d) => t + d.ventas, 0);
    const cuentasPrev = previos.reduce((t, d) => t + d.ventas, 0);
    const abiertos = dias.filter(d => d.ventas > 0);
    const mejor = dias.slice().sort((a, b) => b.total - a.total)[0];
    const ticket = cuentas ? total / cuentas : 0;
    const ticketPrev = cuentasPrev ? totalPrev / cuentasPrev : 0;

    const vTotal = variacion(total, totalPrev);
    const vTicket = variacion(ticket, ticketPrev);

    $('#kpis').innerHTML =
      kpi({
        etq: 'Ingreso semanal', cifra: soles(total),
        delta: vTotal.txt, sube: vTotal.sube,
        nota: totalPrev ? `Semana previa ${soles(totalPrev)}` : 'Sin semana previa con qué comparar',
        serie: dias.map(d => d.total)
      }) +
      kpi({
        etq: 'Cuentas cerradas', cifra: String(cuentas),
        delta: cuentas - cuentasPrev >= 0 ? `+${cuentas - cuentasPrev}` : String(cuentas - cuentasPrev),
        sube: cuentas >= cuentasPrev,
        nota: abiertos.length
          ? `${Math.round(cuentas / abiertos.length)} por día en promedio`
          : 'Ninguna cuenta esta semana',
        serie: dias.map(d => d.ventas)
      }) +
      kpi({
        etq: 'Ticket promedio', cifra: soles(ticket),
        delta: vTicket.txt, sube: vTicket.sube,
        nota: mejor && mejor.total ? `El mejor día: ${NOMBRE_DIA(mejor.dia)}` : 'Sin ventas todavía',
        serie: dias.map(d => (d.ventas ? d.total / d.ventas : 0))
      }) +
      kpi({
        etq: 'Mejor día', cifra: mejor && mejor.total ? NOMBRE_DIA(mejor.dia) : '—',
        delta: mejor && mejor.total ? soles(mejor.total) : 'sin datos',
        sube: mejor && mejor.total ? true : null,
        nota: total && mejor
          ? `${Math.round((mejor.total / total) * 100)}% del ingreso de la semana`
          : 'Sin ventas todavía',
        serie: dias.map(d => d.total)
      });

    $('#curva-titulo').textContent = 'Ingreso por día';
    $('#curva-sub').textContent = `Total ${soles(total)} · comparado con la semana previa`;
    $('#leyenda-a').textContent = 'Esta semana';
    $('#leyenda-b').textContent = 'Semana previa';
    pintarCurva(
      dias.map(d => d.total),
      previos.map(d => d.total),
      dias.map(d => NOMBRE_DIA(d.dia))
    );
  }

  // ══ AVISOS ════════════════════════════════════════════════════════════════
  /* Todos salen de datos de verdad. Si no hay nada que avisar, se dice: un
     panel que siempre tiene alertas deja de mirarse. */
  function avisos() {
    const lista = [];
    const semana = vista === 'semana';

    const min = Store.minutosCocina();
    if (min !== null && min > 12) {
      lista.push({
        titulo: 'Cocina lenta', valor: `${min.toFixed(1)} min`, malo: true,
        cuerpo: 'El promedio de hoy pasó el límite de 12 minutos entre que entra el pedido y se marca listo.'
      });
    }

    Store.mesasOlvidadas(90).slice(0, 2).forEach(c => {
      lista.push({
        titulo: `${c.nombre} abierta`, valor: UI.transcurrido(c.desdeUltimo).replace(':', 'h '), malo: true,
        cuerpo: `Sin pedir nada nuevo desde ${UI.hora(c.desdeUltimo)}. Confirma si ya se van o si falta atenderla.`
      });
    });

    const dormidos = Store.usuarios().filter(u =>
      !u.activo || (u.ultimoAcceso && Date.now() - u.ultimoAcceso > 9 * 86400000));
    dormidos.slice(0, 1).forEach(u => {
      lista.push({
        titulo: u.nombre, valor: u.activo ? cuando(u.ultimoAcceso) : 'bloqueada', malo: false,
        cuerpo: u.activo
          ? 'Su cuenta lleva más de nueve días sin usarse. Si ya no trabaja acá, conviene darle de baja.'
          : 'Cuenta bloqueada. Puedes reactivarla o borrarla en Mozos y accesos.'
      });
    });

    if (semana) {
      const dias = Store.resumenDias(7);
      const total = dias.reduce((t, d) => t + d.total, 0);
      const fuertes = dias.slice().sort((a, b) => b.total - a.total).slice(0, 2);
      const parte = fuertes.reduce((t, d) => t + d.total, 0);
      if (total && parte / total > 0.35) {
        lista.push({
          titulo: `${NOMBRE_DIA(fuertes[0].dia)} y ${NOMBRE_DIA(fuertes[1].dia)}`,
          valor: `${Math.round((parte / total) * 100)}% del total`, malo: false,
          cuerpo: 'Dos días concentran buena parte de la semana. Vale reforzar mozos en esos turnos.'
        });
      }
    }

    const r = Store.ranking(semana ? 7 : 1);
    const comida = r.todos.filter(p => !p.bar);
    const enCero = comida.filter(p => p.cant === 0).length;
    if (semana && enCero > comida.length * 0.5) {
      lista.push({
        titulo: 'Carta muy larga', valor: `${enCero} platos`, malo: false,
        cuerpo: `De ${comida.length} platos, ${enCero} no salieron ni una vez esta semana. Sacar los que menos rotan libera compra y cocina.`
      });
    }

    $('#cuenta-avisos').textContent = lista.length
      ? `${lista.length} activo${lista.length === 1 ? '' : 's'}` : 'todo en orden';
    $('#avisos').innerHTML = lista.length
      ? lista.map(a => `
        <div class="aviso ${a.malo ? 'malo' : ''}">
          <div class="arriba">
            <span class="titulo">${UI.esc(a.titulo)}</span>
            <span class="valor">${UI.esc(a.valor)}</span>
          </div>
          <div class="cuerpo">${UI.esc(a.cuerpo)}</div>
        </div>`).join('')
      : '<p class="vacio-admin">Nada que revisar por ahora.</p>';
  }

  // ══ MEZCLA DE CARTA ═══════════════════════════════════════════════════════
  function pintarMezcla() {
    const dias = vista === 'semana' ? 7 : 1;
    const r = Store.ranking(dias);
    const comida = r.todos.filter(p => !p.bar);
    const arriba = mezcla === 'top';

    const lista = arriba
      ? r.mas.slice(0, 6)
      : comida.slice().sort((a, b) => a.cant - b.cant || a.codigo - b.codigo).slice(0, 6);
    const escala = Math.max(1, ...(arriba ? lista : comida).map(p => p.cant));

    $('#mezcla-sub').textContent = dias === 1 ? 'Hoy · unidades y venta' : 'Últimos 7 días · unidades y venta';
    $('#platos').innerHTML = lista.length
      ? lista.map((p, i) => `
        <div class="plato-fila ${arriba ? '' : 'flojo'}">
          <span class="puesto">${String(i + 1).padStart(2, '0')}</span>
          <div style="min-width:0">
            <div class="nom" title="${UI.esc(p.nombre)}">${UI.esc(p.nombre)}</div>
            <div class="riel ${arriba ? '' : 'apagado'}">
              <i style="width:${Math.max(p.cant ? 6 : 2, Math.round((p.cant / escala) * 100))}%"></i>
            </div>
          </div>
          <span class="uds">${p.cant} u.</span>
          <span class="soles">${soles(p.importe)}</span>
        </div>`).join('')
      : '<p class="vacio-admin">Todavía no hay ventas en este tiempo.</p>';

    const enCero = comida.filter(p => p.cant === 0).length;
    const masCaro = r.mas.slice(0, 6).slice().sort((a, b) => b.importe - a.importe)[0];
    $('#mezcla-nota').textContent = arriba
      ? (masCaro && r.mas[0] && masCaro.codigo !== r.mas[0].codigo
          ? `${masCaro.nombre} vende menos unidades que ${r.mas[0].nombre} pero deja más soles: conviene ofrecerlo primero.`
          : 'Con pocos días de datos, mira la semana antes de decidir nada sobre la carta.')
      : (dias === 1
          ? 'Con un solo día de datos conviene mirar la semana antes de sacar algo de la carta.'
          : `${enCero} de los ${comida.length} platos de la carta no salieron ni una vez en estos 7 días.`);
  }

  // ══ RENDIMIENTO DEL SALÓN ═════════════════════════════════════════════════
  function pintarMozos() {
    let gente;
    if (vista === 'semana') {
      const suma = {};
      Store.resumenDias(7).forEach(d => {
        Store.porMozo(d.dia).forEach(m => {
          suma[m.mozo] = suma[m.mozo] || { mozo: m.mozo, total: 0, cuentas: 0 };
          suma[m.mozo].total += m.total;
          suma[m.mozo].cuentas += m.cuentas;
        });
      });
      gente = Object.values(suma).sort((a, b) => b.total - a.total);
    } else {
      gente = Store.porMozo();
    }

    const max = Math.max(1, ...gente.map(m => m.total));
    $('#mozos').innerHTML = gente.length
      ? gente.map(m => `
        <div class="mozo-fila">
          <div class="arriba">
            <span class="ini">${UI.esc(iniciales(m.mozo))}</span>
            <span class="nom">${UI.esc(m.mozo)}</span>
            <span class="tot">${soles(m.total)}</span>
          </div>
          <div class="riel"><i style="width:${Math.round((m.total / max) * 100)}%"></i></div>
          <div class="abajo">
            <span>${m.cuentas} cuenta${m.cuentas === 1 ? '' : 's'}</span>
            <span>ticket prom. ${soles(m.cuentas ? m.total / m.cuentas : 0)}</span>
          </div>
        </div>`).join('')
      : '<p class="vacio-admin">Ninguna cuenta cobrada todavía.</p>';
  }

  // ══ EL EQUIPO ═════════════════════════════════════════════════════════════
  function pintarEquipo() {
    const gente = Store.usuarios();
    const yo = Store.sesion();
    const activos = gente.filter(u => u.activo).length;

    $('#cuenta-activos').textContent = `${activos} habilitado${activos === 1 ? '' : 's'}`;
    $('#gente').innerHTML = gente.map(u => `
      <div class="persona-fila ${u.activo ? '' : 'baja'}">
        <div class="quien">
          <span class="ini">${UI.esc(iniciales(u.nombre))}</span>
          <div style="min-width:0">
            <div class="nom">${UI.esc(u.nombre)}${yo && yo.id === u.id ? ' <span class="p-tu">tú</span>' : ''}</div>
            <div class="mano">PIN •••• · ${UI.esc(cuando(u.ultimoAcceso))}</div>
          </div>
        </div>
        <div style="min-width:0">
          <div class="puesto ${u.rol === 'admin' ? 'dueno' : (u.rol === 'caja' ? 'caja' : '')}">
            ${UI.esc(Store.NOMBRE_ROL[u.rol] || u.rol)}
          </div>
          <div class="visto">${u.activo ? 'con acceso' : 'sin acceso'}</div>
        </div>
        <div class="acciones">
          <button type="button" class="pastilla ${u.activo ? '' : 'no'}" data-baja="${u.id}">
            ${u.activo ? 'Habilitado' : 'Bloqueado'}
          </button>
          <button type="button" class="icono" data-editar="${u.id}" title="Editar" aria-label="Editar">✎</button>
          <button type="button" class="icono" data-borrar="${u.id}" title="Borrar" aria-label="Borrar">✕</button>
        </div>
      </div>`).join('') || '<p class="vacio-admin">No hay nadie dado de alta.</p>';

    /* Escrito a mano y no armado con una lista de permisos: lo que el dueño
       necesita leer es qué NO ve cada uno, y eso una enumeración no lo dice. */
    const QUE_VE = {
      admin: 'Todo: el salón, la cocina, la caja, estos reportes y quién entra al sistema.',
      caja: 'Cobra, imprime y cierra el día. Ve el dinero, pero no estos reportes ni los accesos.',
      cocina: 'Solo las comandas de cocina. No ve ingresos ni cierres.',
      mozo: 'Toma pedidos en el salón. No ve la caja ni cuánto factura el chifa.'
    };
    $('#permisos').innerHTML = Object.keys(Store.PERMISOS).map(rol => `
      <div>
        <span class="tag ${rol === 'admin' ? 'dueno' : ''}">${UI.esc(Store.NOMBRE_ROL[rol])}</span>
        <p>${UI.esc(QUE_VE[rol] || '')}</p>
      </div>`).join('');
  }

  // ── Alta y edición ───────────────────────────────────────────────────────
  const pinCajas = () => $$('#cajas-pin input');
  const pinValor = () => pinCajas().map(i => i.value).join('');

  function limpiarAlta() {
    editando = null;
    rolAlta = 'mozo';
    $('#alta-nombre').value = '';
    pinCajas().forEach(i => { i.value = ''; });
    $('#alta-titulo').textContent = 'Nuevo acceso';
    $('#alta-pin-etq').textContent = 'PIN de 4 dígitos';
    $('#alta-enviar').textContent = 'Crear acceso';
    $('#alta-cancelar').hidden = true;
    $('#alta-msg').hidden = true;
    $$('#alta-roles button').forEach(b => b.classList.toggle('on', b.dataset.r === 'mozo'));
  }

  function editar(id) {
    const u = Store.usuario(id);
    if (!u) return;
    editando = id;
    rolAlta = u.rol;
    $('#alta-nombre').value = u.nombre;
    pinCajas().forEach(i => { i.value = ''; });
    $('#alta-titulo').textContent = `Editar a ${u.nombre}`;
    $('#alta-pin-etq').textContent = 'PIN nuevo (déjalo vacío para no cambiarlo)';
    $('#alta-enviar').textContent = 'Guardar cambios';
    $('#alta-cancelar').hidden = false;
    $('#alta-msg').hidden = true;
    $$('#alta-roles button').forEach(b => b.classList.toggle('on', b.dataset.r === u.rol));
    $('#alta-nombre').focus();
  }

  function avisoAlta(t, tipo = 'error') {
    $('#alta-msg').textContent = t;
    $('#alta-msg').className = `nube-msg ${tipo}`;
    $('#alta-msg').hidden = false;
  }

  /* Las cuatro casillas se comportan como una sola: escribir salta a la
     siguiente y borrar vuelve a la anterior. */
  $('#cajas-pin').addEventListener('input', e => {
    const i = e.target;
    i.value = i.value.replace(/\D/g, '').slice(0, 1);
    if (i.value && i.nextElementSibling) i.nextElementSibling.focus();
  });
  $('#cajas-pin').addEventListener('keydown', e => {
    if (e.key === 'Backspace' && !e.target.value && e.target.previousElementSibling) {
      e.target.previousElementSibling.focus();
    }
  });

  $('#alta-roles').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    rolAlta = b.dataset.r;
    $$('#alta-roles button').forEach(x => x.classList.toggle('on', x === b));
  });

  $('#alta-cancelar').onclick = limpiarAlta;

  $('#form-alta').addEventListener('submit', e => {
    e.preventDefault();
    const nombre = $('#alta-nombre').value.trim();
    const pin = pinValor();

    if (editando) {
      const cambios = { nombre, rol: rolAlta };
      if (pin) cambios.pin = pin;
      const r = Store.editarUsuario(editando, cambios);
      if (!r.ok) return avisoAlta(r.motivo);
      UI.toast('Guardado', 'ok');
    } else {
      const r = Store.crearUsuario({ nombre, rol: rolAlta, pin });
      if (!r.ok) return avisoAlta(r.motivo);
      UI.toast(`${nombre} ya puede entrar`, 'ok');
    }
    limpiarAlta();
    pintarEquipo();
  });

  $('#gente').addEventListener('click', e => {
    const ed = e.target.closest('[data-editar]');
    if (ed) return editar(ed.dataset.editar);

    const ba = e.target.closest('[data-baja]');
    if (ba) {
      const u = Store.usuario(ba.dataset.baja);
      if (!u) return;
      const r = Store.editarUsuario(u.id, { activo: !u.activo });
      if (!r.ok) UI.toast(r.motivo, 'error');
      else UI.toast(u.activo ? `${u.nombre} ya no puede entrar` : `${u.nombre} puede entrar otra vez`, 'ok');
      pintarEquipo();
      return;
    }

    const bo = e.target.closest('[data-borrar]');
    if (bo) {
      const u = Store.usuario(bo.dataset.borrar);
      if (!u || !confirm(`¿Borrar a ${u.nombre}? Sus cuentas cobradas se quedan como están.`)) return;
      const r = Store.borrarUsuario(u.id);
      if (!r.ok) UI.toast(r.motivo, 'error');
      if (editando === u.id) limpiarAlta();
      pintarEquipo();
    }
  });

  // ── Lateral ──────────────────────────────────────────────────────────────
  function pintarLateral() {
    const yo = Store.sesion();
    if (yo) {
      $('#yo-ini').textContent = iniciales(yo.nombre);
      $('#yo-nombre').textContent = yo.nombre;
      $('#yo-rol').textContent = Store.NOMBRE_ROL[yo.rol] || yo.rol;
    }

    const cuentas = Store.cuentas();
    const servicio = $('#estado-servicio');
    servicio.classList.toggle('quieto', cuentas.length === 0);
    $('#rotulo-servicio').textContent = cuentas.length ? 'SERVICIO ABIERTO' : 'SALÓN LIBRE';
    $('#servicio-mesas').textContent = cuentas.length
      ? `${cuentas.length} mesa${cuentas.length === 1 ? '' : 's'} ocupada${cuentas.length === 1 ? '' : 's'}`
      : 'Ninguna mesa abierta';

    const vieja = cuentas.slice().sort((a, b) => a.desde - b.desde)[0];
    $('#servicio-nota').textContent = vieja
      ? `La más antigua: ${vieja.nombre}, ${UI.transcurrido(vieja.desde)}`
      : 'Nada pendiente de cobrar';

    /* La marca del lateral cuenta lo que hay que mirar: cuentas bloqueadas
       o dormidas. Sin nada que revisar, no hay marca. */
    const pendientes = Store.usuarios().filter(u =>
      !u.activo || (u.ultimoAcceso && Date.now() - u.ultimoAcceso > 9 * 86400000)).length;
    const marca = $('#marca-equipo');
    marca.textContent = pendientes;
    marca.hidden = !pendientes;

    const estado = Store.estadoConexion();
    const chip = $('#chip-nube');
    chip.className = `chip-estado ${estado === 'nube' ? '' : (estado === 'sin-conexion' ? 'tibio' : 'frio')}`;
    $('#chip-nube-txt').textContent = {
      nube: 'Equipos sincronizados',
      'sin-conexion': 'Sin internet · se sube al volver',
      local: 'Este equipo trabaja solo'
    }[estado];
  }

  // ── Navegación ───────────────────────────────────────────────────────────
  function irA(v) {
    vista = v;
    $$('#nav .nav-item').forEach(b => b.classList.toggle('on', b.dataset.v === v));
    $$('#rango button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
    $('#rango').hidden = v === 'equipo';
    $('#hoja-reporte').hidden = v === 'equipo';
    $('#hoja-equipo').hidden = v !== 'equipo';
    pintarTodo();
  }

  $('#nav').addEventListener('click', e => {
    const b = e.target.closest('.nav-item');
    if (b) irA(b.dataset.v);
  });
  $('#rango').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (b) irA(b.dataset.v);
  });
  $('#mezcla-tabs').addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    mezcla = b.dataset.m;
    $$('#mezcla-tabs button').forEach(x => x.classList.toggle('on', x === b));
    pintarMezcla();
  });

  $('#salir').onclick = () => {
    Store.salir();
    location.href = 'index.html';
  };

  // ── Arranque ─────────────────────────────────────────────────────────────
  function pintarTodo() {
    pintarLateral();

    if (vista === 'equipo') {
      $('#cab-titulo').textContent = 'Mozos y accesos';
      $('#cab-sub').textContent = 'Cada uno entra con su PIN';
      pintarEquipo();
      return;
    }

    const hoy = vista === 'hoy';
    $('#cab-titulo').textContent = hoy ? 'Resumen del día' : 'Resumen semanal';
    $('#cab-sub').textContent = hoy
      ? `${new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })} · ${UI.hora(Date.now())}`
      : 'Los últimos 7 días';

    if (hoy) pintarHoy(); else pintarSemana();
    avisos();
    pintarMezcla();
    pintarMozos();
  }

  limpiarAlta();
  pintarTodo();
  Store.on(() => {
    /* Si el dueño se quitó a sí mismo el puesto desde otro equipo, esta
       pantalla deja de ser suya. */
    if (!Store.puede('admin')) return location.replace('index.html');
    pintarTodo();
  });
  setInterval(pintarTodo, 20000);
  Store.arrancar().then(pintarTodo);
})();
