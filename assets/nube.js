/* Sincronización entre equipos, con Supabase.

   El problema que resuelve: cada navegador guardaba sus propios datos, así
   que el mozo veía sus mesas y la caja las suyas, cada uno en su mundo. Acá
   hay un solo lugar común: todos los equipos del local leen y escriben el
   mismo estado.

   No se usa la librería de Supabase: alcanza con su API REST y `fetch`. Un
   archivo menos que descargar, y una cosa menos que se puede romper.

   ── Cómo se conecta ────────────────────────────────────────────────────
   Se pegan la URL del proyecto y la clave `anon` acá abajo, y con eso queda
   configurado cualquier equipo que abra el sistema. También se pueden pegar
   desde la portada, en «Sincronizar equipos», si se quiere probar sin tocar
   archivos.

   ── Sobre la clave `anon` ──────────────────────────────────────────────
   Va dentro de la página, así que cualquiera que abra el sistema puede
   verla: es pública por diseño. No es una contraseña. Quien tenga la URL y
   esa clave puede leer y escribir los pedidos del chifa. Para el salón de
   un restaurante alcanza; si algún día hace falta seguridad de verdad, se
   pone Supabase Auth con un usuario por local.                            */

const Nube = (() => {

  /* ↓↓↓ PEGA ACÁ LAS DOS COSAS DEL PROYECTO DE SUPABASE ↓↓↓
     Están en el panel de Supabase, en Project Settings › API.
       url   → Project URL          (https://xxxxxxxx.supabase.co)
       clave → anon / public key    (una cadena larga que empieza con ey…) */
  const FIJO = {
    url: '',
    clave: ''
  };

  const K = 'chifa.nube';

  function config() {
    if (FIJO.url && FIJO.clave) return FIJO;
    try {
      const g = JSON.parse(localStorage.getItem(K));
      return (g && g.url && g.clave) ? g : null;
    } catch (e) { return null; }
  }

  function guardarConfig(c) {
    try {
      if (!c || !c.url) localStorage.removeItem(K);
      else localStorage.setItem(K, JSON.stringify({
        url: String(c.url).trim().replace(/\/+$/, ''),
        clave: String(c.clave).trim()
      }));
    } catch (e) { /* sin persistencia */ }
  }

  const activa = () => !!config();

  /* Los equipos se distinguen por un identificador propio, para saber quién
     está conectado sin pedirle nada a nadie. */
  function equipo() {
    try {
      let id = localStorage.getItem('chifa.equipo');
      if (!id) {
        id = 'eq-' + Math.random().toString(36).slice(2, 10);
        localStorage.setItem('chifa.equipo', id);
      }
      return id;
    } catch (e) { return 'eq-suelto'; }
  }

  function pedir(ruta, opciones = {}) {
    const c = config();
    if (!c) return Promise.reject(new Error('sin nube'));
    return fetch(`${c.url}/rest/v1/${ruta}`, {
      ...opciones,
      headers: {
        apikey: c.clave,
        Authorization: `Bearer ${c.clave}`,
        'Content-Type': 'application/json',
        ...(opciones.headers || {})
      }
    }).then(async r => {
      if (!r.ok) {
        const t = await r.text().catch(() => '');
        throw new Error(`${r.status} ${t.slice(0, 200)}`);
      }
      return r.status === 204 ? null : r.json();
    });
  }

  // ── El estado del local ──────────────────────────────────────────────────

  /* Solo el número de revisión: es lo que se consulta a cada rato para saber
     si alguien cambió algo. Pesa unos pocos bytes. */
  function revision(sede) {
    return pedir(`estado?sede=eq.${encodeURIComponent(sede)}&select=rev`)
      .then(f => (f && f.length ? Number(f[0].rev) : null));
  }

  function traer(sede) {
    return pedir(`estado?sede=eq.${encodeURIComponent(sede)}&select=rev,datos`)
      .then(f => (f && f.length ? { rev: Number(f[0].rev), datos: f[0].datos } : null));
  }

  function crear(sede, datos) {
    return pedir('estado', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ sede, rev: 1, datos })
    }).then(f => ({ ok: true, rev: Number(f[0].rev) }));
  }

  /* Guarda solo si nadie escribió desde que leímos (`revBase`). Si otro
     equipo se adelantó, la fila no coincide, vuelve vacía y avisamos del
     choque en vez de pisarle el trabajo. */
  function guardar(sede, datos, revBase) {
    return pedir(
      `estado?sede=eq.${encodeURIComponent(sede)}&rev=eq.${revBase}`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ rev: revBase + 1, datos, actualizado: new Date().toISOString() })
      }
    ).then(f => (f && f.length
      ? { ok: true, rev: Number(f[0].rev) }
      : { ok: false, conflicto: true }));
  }

  // ── Quién está conectado ─────────────────────────────────────────────────

  /* Cada pantalla deja su marca cada pocos segundos. Sirve para dos cosas:
     que el mozo sepa si la cocina está abierta antes de dar por impresa una
     comanda, y para ver desde la portada cuántos equipos hay en el salón. */
  function latir(sede, pantalla, ticketera) {
    return pedir('presencia?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        id: `${sede}|${equipo()}`,
        sede, pantalla,
        ticketera: !!ticketera,
        visto: new Date().toISOString()
      })
    });
  }

  function presentes(sede) {
    return pedir(`presencia?sede=eq.${encodeURIComponent(sede)}&select=pantalla,ticketera,visto`)
      .then(f => f || []);
  }

  /* Una consulta cualquiera, para decir en la portada si la conexión anda.
     Devuelve el motivo en texto si falla, que es lo que hace falta ver. */
  function probar() {
    if (!config()) return Promise.resolve({ ok: false, motivo: 'Faltan la URL y la clave' });
    return pedir('estado?select=sede&limit=1')
      .then(() => ({ ok: true }))
      .catch(e => ({ ok: false, motivo: e.message }));
  }

  return {
    config, guardarConfig, activa, equipo, probar,
    revision, traer, crear, guardar,
    latir, presentes
  };
})();
