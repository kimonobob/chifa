/* Visor de las dos ticketeras del local.

   Recibe los trabajos del servidor de impresión (por SSE, o preguntando
   cada cinco segundos si el flujo se corta) y los dibuja como papel
   saliendo de cada ranura: la comanda en el rollo de cocina, la boleta en
   el de caja — el mismo reparto que hacen las máquinas de verdad.

   Dos clases de trabajo llegan acá:
     · html   — lo que manda el sistema del chifa, que imprime por navegador.
                Se pinta con las mismas reglas del @media print de app.css.
     · escpos — lo que entra por los puertos crudos, ya interpretado por el
                servidor: líneas con sus atributos, cortes, imágenes.        */

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const lista = $('#lista');

/* Un rollo por impresora. El estado lo manda el servidor; acá solo se
   guarda para pintarlo. */
const ROLLOS = {};
$$('.impresora').forEach(sec => {
  ROLLOS[sec.dataset.dest] = {
    sec,
    tira: sec.querySelector('.tira'),
    vista: sec.querySelector('.rollo'),
    vacio: sec.querySelector('.vacio'),
    estado: { papel: true, tapa: false, enlinea: true, ancho: 80, cajon: 0 }
  };
});

let ultimo = 0;                        // último id de trabajo dibujado
let seguir = true;
let sonido = true;

const hora = ms => new Date(ms * 1000).toLocaleTimeString('es-PE', { hour12: false });

/* ── Dibujar ESC/POS ───────────────────────────────────────────────────── */

/* Un run es un trozo de línea con los mismos atributos. Va en dos capas:
   la caja reserva el ancho real que ocuparía en el papel (ancho de carácter
   por letras por multiplicador) y el texto de adentro se estira para
   llegar a ese ancho. Es lo que hace la impresora al duplicar el ancho. */
function dibujarRun(r) {
  const fb = r.fuente === 'B' ? 0.75 : 1;   // la fuente B es más angosta y baja
  const largo = [...r.t].length;
  const caja = document.createElement('span');
  caja.className = 'caja';
  caja.style.width = `calc(var(--cw) * ${(largo * r.an * fb).toFixed(3)})`;

  const txt = document.createElement('span');
  txt.className = 'run' + (r.neg ? ' neg' : '') + (r.sub ? ' sub' : '') + (r.inv ? ' inv' : '');
  txt.style.fontSize = `calc(var(--fs) * ${(r.al * fb).toFixed(3)})`;
  txt.style.transform = `scaleX(${(r.an / r.al).toFixed(3)})`;
  txt.textContent = r.t;

  caja.appendChild(txt);
  return caja;
}

function dibujarBloque(b) {
  if (b.tipo === 'linea') {
    const div = document.createElement('div');
    div.className = 'l';
    div.dataset.a = b.align;
    const alto = b.runs.reduce((m, r) => Math.max(m, r.al), 1);
    div.style.lineHeight = `calc(var(--fs) * ${(1.22 * alto).toFixed(2)})`;
    b.runs.forEach(r => div.appendChild(dibujarRun(r)));
    return div;
  }
  if (b.tipo === 'avance') {
    const div = document.createElement('div');
    div.className = 'avance';
    div.style.height = `calc(var(--fs) * ${(1.22 * b.lineas).toFixed(2)})`;
    return div;
  }
  if (b.tipo === 'imagen') {
    const img = document.createElement('img');
    img.className = 'img';
    img.src = b.png;
    img.alt = `imagen ${b.an}×${b.al} puntos`;
    // 576 puntos es el ancho útil de una cabeza de 80 mm: la imagen se
    // dibuja a la escala que tendría en el papel.
    img.style.width = `calc(var(--util) * ${(b.an / 576).toFixed(4)})`;
    return img;
  }
  if (b.tipo === 'codigo') {
    const div = document.createElement('div');
    div.className = 'codigo';
    div.innerHTML = b.clase === 'qr' ? '<div class="qr"></div>' : '<div class="barras"></div>';
    const et = document.createElement('b');
    et.textContent = b.dato || '(sin datos)';
    div.appendChild(et);
    const sis = document.createElement('span');
    sis.textContent = b.sistema;
    div.appendChild(sis);
    return div;
  }
  if (b.tipo === 'cajon') {
    const div = document.createElement('div');
    div.className = 'cajon';
    div.textContent = '· pulso al cajón de dinero ·';
    return div;
  }
  if (b.tipo === 'crudo') {
    const div = document.createElement('div');
    div.className = 'crudo';
    div.textContent = `${b.nota}: ${b.hex}`;
    return div;
  }
  return document.createTextNode('');
}

/* ── Un papel: lo que sale entre dos cortes ─────────────────────────────── */
function dibujarPapel(t, papel, indice, total) {
  const hoja = document.createElement('article');
  hoja.className = 'papel' + (papel.corte === 'parcial' ? ' parcial' : '')
                 + (t.estado === 'rechazado' ? ' rechazado' : '');
  hoja.dataset.trabajo = t.id;

  if (t.tipo === 'html' || t.tipo === 'html-uno') {
    const caja = document.createElement('div');
    caja.innerHTML = papel.html;
    // El sistema manda varios .ticket de un saque (por ejemplo una comanda
    // por plato). Cada uno es un papel distinto, igual que en la ticketera.
    const tickets = t.tipo === 'html' ? caja.querySelectorAll('.ticket') : [];
    if (tickets.length > 1) {
      return [...tickets].flatMap((tk, i) =>
        dibujarPapel({ ...t, tipo: 'html-uno' },
                     { html: tk.outerHTML, corte: 'total' }, i, tickets.length));
    }
    hoja.appendChild(caja);
  } else {
    const caja = document.createElement('div');
    caja.className = 'escpos';
    papel.bloques.forEach(b => caja.appendChild(dibujarBloque(b)));
    hoja.appendChild(caja);
  }

  const et = document.createElement('div');
  et.className = 'marbete';
  et.innerHTML = `<b>N° ${t.id}</b> · ${hora(t.hora)}${quien(t)}`
    + (total > 1 ? ` · papel ${indice + 1}/${total}` : '')
    + (t.motivo ? ` · <span class="falla">${t.motivo}</span>` : '');
  hoja.appendChild(et);

  return [hoja];
}

/* De dónde salió el ticket: la pantalla y el equipo. En el local eso es lo
   que uno quiere saber — si la comanda la mandó la tablet del mozo o la
   caja, y desde qué aparato. */
function quien(t) {
  const partes = [t.pantalla, t.equipo].filter(Boolean);
  return partes.length ? ' · ' + partes.join(' @ ') : ` · ${t.via}`;
}

/* ── Registro ──────────────────────────────────────────────────────────── */
function dibujarRegistro(t) {
  const li = document.createElement('li');
  li.className = (t.estado === 'rechazado' ? 'rechazado ' : '') + 'd-' + t.destino;
  const papeles = t.papeles.length > 1 ? ` · ${t.papeles.length} papeles` : '';
  li.innerHTML = `
    <div class="cab">
      <span class="dest">${t.destino}</span>
      <span class="n">N° ${t.id}</span>
      <span>${hora(t.hora)}</span>
    </div>
    <div class="via">${[t.pantalla, t.sede].filter(Boolean).join(' · ') || t.via}</div>
    <div class="via">${t.equipo || ''} · ${t.bytes} bytes${papeles}</div>
    ${t.motivo ? `<div class="falla">rechazado: ${t.motivo}</div>` : ''}`;

  if (t.hex) {
    const det = document.createElement('details');
    det.innerHTML = `<summary>ver los bytes</summary><pre>${t.hex}${t.recorte ? '\n… (recortado)' : ''}</pre>`;
    li.appendChild(det);
  }
  li.onclick = e => {
    if (e.target.closest('details')) return;
    const h = ROLLOS[t.destino].tira.querySelector(`.papel[data-trabajo="${t.id}"]`);
    if (!h) return;
    h.scrollIntoView({ behavior: 'smooth', block: 'center' });
    h.classList.add('marcado');
    setTimeout(() => h.classList.remove('marcado'), 1400);
  };
  lista.appendChild(li);
}

/* ── Entrada de trabajos ───────────────────────────────────────────────── */
function recibir(t) {
  if (t.id <= ultimo) return;
  ultimo = t.id;
  const r = ROLLOS[t.destino] || ROLLOS.cocina;
  const hojas = t.papeles.flatMap((p, i) => dibujarPapel(t, p, i, t.papeles.length));
  hojas.forEach(h => r.tira.appendChild(h));
  dibujarRegistro(t);
  r.vacio.hidden = true;
  avisarRebalse(hojas);
  if (t.estado === 'impreso') ruido();
  if (seguir) requestAnimationFrame(() =>
    r.vista.scrollTo({ top: r.vista.scrollHeight, behavior: 'smooth' }));
}

/* Si el ticket es más ancho que el rollo cargado, en el papel de verdad se
   pierde por el costado. Acá se avisa en vez de dejarlo pasar. */
function avisarRebalse(hojas) {
  hojas.forEach(h => {
    const hijo = h.firstElementChild;
    if (hijo && hijo.scrollWidth > h.clientWidth + 2) {
      const m = document.createElement('span');
      m.className = 'rebalse';
      m.textContent = 'no entra en el rollo';
      h.appendChild(m);
    }
  });
}

/* ── Estado de cada máquina ────────────────────────────────────────────── */
function pintarEstado(dest) {
  const r = ROLLOS[dest];
  if (!r) return;
  const e = r.estado;
  const chip = campo => r.sec.querySelector(`.chip[data-campo="${campo}"]`);
  const marcar = (campo, bien, textoBien, textoMal) => {
    const el = chip(campo);
    el.textContent = bien ? textoBien : textoMal;
    el.classList.toggle('ok', bien);
    el.classList.toggle('mal', !bien);
  };
  marcar('enlinea', e.enlinea, 'en línea', 'desconectada');
  marcar('papel', e.papel, 'con papel', 'SIN PAPEL');
  marcar('tapa', !e.tapa, 'tapa cerrada', 'TAPA ABIERTA');
  chip('ancho').textContent = e.ancho + ' mm';
  r.sec.querySelector('[data-cajon]').textContent = 'cajón ' + (e.cajon || 0);
  // El ancho del papel y las columnas son de esta impresora, no del visor.
  r.sec.style.setProperty('--papel', e.ancho + 'mm');
  r.sec.style.setProperty('--cols', e.ancho === 58 ? 32 : 42);
}

async function mandarEstado(dest, campos) {
  const r = await fetch('/estado', {
    method: 'POST', headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ destino: dest, ...campos })
  });
  ROLLOS[dest].estado = { ...ROLLOS[dest].estado, ...(await r.json()) };
  pintarEstado(dest);
}

/* ── Conexión ──────────────────────────────────────────────────────────── */
function enlace(ok, texto) {
  const el = $('#c-enlace');
  el.textContent = texto;
  el.classList.toggle('enlace-ok', ok);
  el.classList.toggle('enlace-mal', !ok);
}

function aplicarImpresoras(imps) {
  Object.entries(imps || {}).forEach(([d, e]) => {
    if (!ROLLOS[d]) return;
    ROLLOS[d].estado = { ...ROLLOS[d].estado, ...e };
    pintarEstado(d);
  });
}

async function cargar() {
  try {
    const r = await fetch(`/trabajos?desde=${ultimo}`);
    const d = await r.json();
    aplicarImpresoras(d.impresoras);
    d.trabajos.forEach(recibir);
    enlace(true, 'conectado');
  } catch (e) {
    enlace(false, 'sin servidor');
  }
}

function escuchar() {
  const es = new EventSource('/eventos');
  es.onopen = () => enlace(true, 'conectado');
  es.onerror = () => enlace(false, 'reconectando…');
  es.onmessage = ev => {
    const d = JSON.parse(ev.data);
    if (d.que === 'trabajo') recibir(d.trabajo);
    else if (d.que === 'estado') aplicarImpresoras({ [d.impresora.id]: d.impresora });
    else if (d.que === 'cajon') {
      const r = ROLLOS[d.destino];
      if (r) { r.estado.cajon = (r.estado.cajon || 0) + 1; pintarEstado(d.destino); }
      cajon(d.destino);
    } else if (d.que === 'limpiar') {
      Object.values(ROLLOS).forEach(r => { r.tira.innerHTML = ''; r.vacio.hidden = false; });
      lista.innerHTML = '';
      ultimo = 0;
    }
  };
}

/* Los puertos crudos de cada impresora, para tenerlos a la vista cuando se
   configure un programa que imprima directo. */
async function saludo() {
  try {
    const d = await (await fetch('/salud')).json();
    Object.entries(d.puertos || {}).forEach(([dest, puerto]) => {
      const el = ROLLOS[dest] && ROLLOS[dest].sec.querySelector('[data-puerto]');
      if (el) el.textContent = `${location.hostname}:${puerto}`;
    });
    $('#linea-red').textContent =
      `tickets en ${location.host} · las tablets abren el sistema con ?emulador=${location.hostname}`;
  } catch (e) {
    $('#linea-red').textContent = 'sin servidor de impresión';
  }
}

/* ── Efectos: el ruido del cabezal y el golpe del cajón ────────────────── */
let audio;
function ruido() {
  if (!sonido) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const dur = 0.35, n = Math.floor(audio.sampleRate * dur);
    const buf = audio.createBuffer(1, n, audio.sampleRate);
    const d = buf.getChannelData(0);
    // Ruido con un pulso rápido encima: así suena el papel avanzando.
    for (let i = 0; i < n; i++) {
      const env = Math.min(1, i / 400) * (1 - i / n);
      d[i] = (Math.random() * 2 - 1) * env * 0.16 * (0.6 + 0.4 * Math.sin(i / 12));
    }
    const src = audio.createBufferSource();
    const filtro = audio.createBiquadFilter();
    filtro.type = 'bandpass'; filtro.frequency.value = 1600; filtro.Q.value = 0.7;
    src.buffer = buf;
    src.connect(filtro).connect(audio.destination);
    src.start();
  } catch (e) { /* sin audio: no pasa nada */ }
}

let tCajon;
function cajon(dest) {
  const el = $('#aviso-cajon');
  el.textContent = dest === 'caja' ? 'CAJÓN ABIERTO · CAJA' : 'CAJÓN ABIERTO · COCINA';
  el.hidden = false;
  clearTimeout(tCajon);
  tCajon = setTimeout(() => { el.hidden = true; }, 1600);
}

/* ── Ticket de prueba: ESC/POS armado acá mismo ────────────────────────── */
/* Sirve para ver el visor funcionando sin tocar el sistema, y de paso para
   comprobar que el intérprete entiende lo que le mandan las librerías:
   tamaños, negrita, alineación, corte y cajón. */
function ticketPrueba(dest) {
  const b = [];
  const txt = s => {
    // cp850: lo que mandan casi todas las librerías cuando hay que escribir
    // ñ y tildes en una ticketera.
    const mapa = { 'ñ': 0xA4, 'Ñ': 0xA5, 'á': 0xA0, 'é': 0x82, 'í': 0xA1,
                   'ó': 0xA2, 'ú': 0xA3, '°': 0xF8, 'º': 0xA7, '¡': 0xAD };
    for (const c of s) b.push(mapa[c] ?? (c.charCodeAt(0) & 0xFF));
  };
  const cmd = (...xs) => b.push(...xs);

  cmd(0x1B, 0x40);                       // ESC @   inicializar
  cmd(0x1B, 0x74, 0x02);                 // ESC t 2 página cp850
  cmd(0x1B, 0x61, 0x01);                 // ESC a 1 centrar

  if (dest === 'cocina') {
    cmd(0x1D, 0x21, 0x11);               // GS ! 11 doble alto y ancho
    txt('COMANDA'); cmd(0x0A);
    cmd(0x1D, 0x21, 0x00);
    txt('Pedido N° 148 · 20:41'); cmd(0x0A);
    cmd(0x1D, 0x21, 0x12);
    txt('MESA 7'); cmd(0x0A);
    cmd(0x1D, 0x21, 0x00);
    txt('Mozo: Luis'); cmd(0x0A);
    cmd(0x1B, 0x61, 0x00);
    txt('------------------------------------------'); cmd(0x0A);
    cmd(0x1D, 0x21, 0x11); txt('02  2x');
    cmd(0x1D, 0x21, 0x01); txt(' ARROZ CHAUFA'); cmd(0x0A);
    cmd(0x1D, 0x21, 0x00); txt('        >> sin cebolla china'); cmd(0x0A);
    cmd(0x1D, 0x21, 0x11); txt('15  1x');
    cmd(0x1D, 0x21, 0x01); txt(' WANTAN FRITO'); cmd(0x0A);
    cmd(0x1D, 0x21, 0x00);
    txt('------------------------------------------'); cmd(0x0A);
    cmd(0x1B, 0x61, 0x01); txt('3 platos · impreso 20:41:09'); cmd(0x0A);
    cmd(0x1B, 0x64, 0x03);               // ESC d 3  avanzar papel
  } else {
    cmd(0x1D, 0x21, 0x11);
    txt('CUATRO DRAGONES'); cmd(0x0A);
    cmd(0x1D, 0x21, 0x00);
    txt('Jr. Lima · RUC 20512345678'); cmd(0x0A, 0x0A);
    cmd(0x1B, 0x45, 0x01); txt('BOLETA DE VENTA'); cmd(0x1B, 0x45, 0x00); cmd(0x0A);
    txt('N° 00214 · Mesa 7 · Caja 1'); cmd(0x0A);
    cmd(0x1B, 0x61, 0x00);
    txt('------------------------------------------'); cmd(0x0A);
    txt('2x 02 Arroz chaufa                   24.00'); cmd(0x0A);
    txt('1x 15 Wantan frito                   12.00'); cmd(0x0A);
    txt('------------------------------------------'); cmd(0x0A);
    cmd(0x1B, 0x45, 0x01); cmd(0x1D, 0x21, 0x01);
    txt('TOTAL                            S/ 36.00'); cmd(0x0A);
    cmd(0x1D, 0x21, 0x00); cmd(0x1B, 0x45, 0x00);
    txt('Efectivo                             50.00'); cmd(0x0A);
    txt('VUELTO                               14.00'); cmd(0x0A, 0x0A);
    cmd(0x1B, 0x61, 0x01); txt('¡Gracias por su visita!'); cmd(0x0A);
    cmd(0x1B, 0x64, 0x03);
    cmd(0x1B, 0x70, 0x00, 0x19, 0xFA);   // ESC p  abrir el cajón: es la caja
  }
  cmd(0x1D, 0x56, 0x00);                 // GS V 0  corte total
  return new Uint8Array(b);
}

/* ── Botones ───────────────────────────────────────────────────────────── */
$$('.impresora').forEach(sec => {
  const dest = sec.dataset.dest;
  sec.querySelectorAll('.chip[data-campo]').forEach(chip => {
    chip.onclick = () => {
      const campo = chip.dataset.campo;
      const e = ROLLOS[dest].estado;
      if (campo === 'ancho') return mandarEstado(dest, { ancho: e.ancho === 80 ? 58 : 80 });
      mandarEstado(dest, { [campo]: !e[campo] });
    };
  });
  sec.querySelector('[data-prueba]').onclick = () => fetch(`/escpos?destino=${dest}`, {
    method: 'POST', headers: { 'Content-Type': 'application/octet-stream' },
    body: ticketPrueba(dest)
  });
});

$('#b-limpiar').onclick = () => fetch('/limpiar', { method: 'POST' });
$('#b-seguir').onclick = e => {
  seguir = !seguir;
  e.currentTarget.setAttribute('aria-pressed', String(seguir));
};
$('#b-sonido').onclick = e => {
  sonido = !sonido;
  e.currentTarget.setAttribute('aria-pressed', String(sonido));
};

/* La cuenta de columnas (42 en 80 mm) solo sale bien si sabemos cuánto mide
   de ancho un carácter en la monoespaciada que tenga este equipo: JetBrains
   Mono avanza .6 del alto, Consolas .55. En vez de suponerlo, se mide. */
function calibrarFuente() {
  const s = document.createElement('span');
  s.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;font:100px var(--mono)';
  s.textContent = 'M'.repeat(50);
  document.body.appendChild(s);
  const avance = s.getBoundingClientRect().width / 50 / 100;
  s.remove();
  if (avance > 0.3 && avance < 1)
    document.documentElement.style.setProperty('--avance', avance.toFixed(4));
}

calibrarFuente();
Object.keys(ROLLOS).forEach(pintarEstado);
saludo();
cargar();
escuchar();
// Si el flujo de eventos se cae (se reinició el servidor), el repaso cada
// cinco segundos recupera lo que se haya perdido.
setInterval(cargar, 5000);
