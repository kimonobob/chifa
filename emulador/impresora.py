# -*- coding: utf-8 -*-
"""Servidor de impresión del local, con las dos ticketeras emuladas.

    python emulador/impresora.py

El chifa tiene dos impresoras y cada una saca lo suyo:

    cocina — la comanda: la mesa y los platos a preparar. La manda el mozo
             desde su tablet, o la cajera cuando el pedido es para llevar.
    caja   — la boleta al cobrar, la precuenta y el cierre del día.

Este programa emula las dos y atiende a TODOS los equipos del local por la
red: la tablet del mozo manda su comanda y el papel sale donde está la
impresora, no en la tablet. Es el mismo reparto que con las máquinas de
verdad, y por eso lo que pruebes acá es lo que va a pasar allá.

Cada impresora recibe por dos caminos:

  · http://ESTE-EQUIPO:8788/ticket   el sistema web, que manda HTML
  · TCP 9100 (cocina) y 9101 (caja)  ESC/POS crudo, el protocolo de las
                                     ticketeras de red de verdad

Y el visor —http://ESTE-EQUIPO:8788— muestra los dos rollos saliendo.

Opciones:
    --web 8788            puerto del visor y de la entrada de tickets
    --cocina 9100         puerto ESC/POS de la impresora de cocina (0 lo apaga)
    --caja 9101           puerto ESC/POS de la impresora de caja (0 lo apaga)
    --solo-este-equipo    no atender a la red: solo 127.0.0.1
    --abrir               abre el visor en el navegador
    --guardar             guarda los bytes crudos en emulador/capturas/
"""

import argparse
import json
import mimetypes
import os
import queue
import re
import socket
import socketserver
import sys
import threading
import time
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from escpos import Interprete, respuestas_a          # noqa: E402

try:                       # la consola de Windows no habla utf-8 sola
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except (AttributeError, OSError):
    pass

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(AQUI)                          # la carpeta del sistema
CAPTURAS = os.path.join(AQUI, 'capturas')
MAX_TRABAJOS = 300                                    # lo viejo se cae del rollo

# Las dos ticketeras del local. El nombre corto es el que manda el sistema
# en el campo `destino` de cada ticket.
DESTINOS = {
    'cocina': 'Ticketera de cocina',
    'caja': 'Ticketera de caja',
}
POR_DEFECTO = 'cocina'


def ip_del_local():
    """La IP de este equipo en la red del chifa: la que hay que ponerle a
    las tablets. No manda nada, solo le pregunta al sistema por dónde
    saldría el paquete."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        return s.getsockname()[0]
    except OSError:
        return '127.0.0.1'
    finally:
        s.close()


# ═══ El banco: las dos impresoras y lo que llevan impreso ════════════════
class Banco:
    """Guarda el estado de cada impresora, los trabajos que llegaron y avisa
    a los visores conectados. Es el único estado compartido, así que todo
    lo que lo toca pasa por el candado."""

    def __init__(self, guardar=False):
        self.lock = threading.Lock()
        self.trabajos = []
        self.seq = 0
        self.oyentes = []                             # colas de los visores
        self.guardar = guardar
        # Estado simulado de cada máquina, para probar los caminos feos.
        self.impresoras = {
            d: {'id': d, 'nombre': n, 'papel': True, 'tapa': False,
                'enlinea': True, 'ancho': 80, 'cajon': 0}
            for d, n in DESTINOS.items()
        }

    # ── Visores ──────────────────────────────────────────────────────────
    def suscribir(self):
        q = queue.Queue(maxsize=100)
        with self.lock:
            self.oyentes.append(q)
        return q

    def desuscribir(self, q):
        with self.lock:
            if q in self.oyentes:
                self.oyentes.remove(q)

    def _avisar(self, evento):
        with self.lock:
            oyentes = list(self.oyentes)
        for q in oyentes:
            try:
                q.put_nowait(evento)
            except queue.Full:
                pass                                  # visor dormido: se pierde el aviso

    # ── Entrada de trabajos ──────────────────────────────────────────────
    def _rechazo(self, destino):
        """Por qué esta impresora no puede imprimir ahora. El trabajo queda
        anotado igual en el rollo: para eso se prueba."""
        m = self.impresoras[destino]
        if not m['enlinea']:
            return 'impresora desconectada'
        if m['tapa']:
            return 'tapa abierta'
        if not m['papel']:
            return 'sin papel'
        return None

    def imprimir(self, trabajo):
        destino = trabajo.get('destino') or POR_DEFECTO
        if destino not in self.impresoras:
            destino = POR_DEFECTO
        trabajo['destino'] = destino
        motivo = self._rechazo(destino)
        with self.lock:
            self.seq += 1
            trabajo['id'] = self.seq
            trabajo['hora'] = time.time()
            trabajo['estado'] = 'rechazado' if motivo else 'impreso'
            trabajo['motivo'] = motivo
            self.trabajos.append(trabajo)
            del self.trabajos[:-MAX_TRABAJOS]
        self._avisar({'que': 'trabajo', 'trabajo': trabajo})
        return trabajo

    def escpos(self, datos, destino, equipo):
        """Bytes ESC/POS → papeles. Cada corte arranca un papel nuevo."""
        bloques = Interprete().analizar(datos)
        papeles, actual = [], []
        for b in bloques:
            if b['tipo'] == 'corte':
                papeles.append({'bloques': actual, 'corte': b['modo']})
                actual = []
            else:
                if b['tipo'] == 'cajon':
                    self.abrir_cajon(destino)
                actual.append(b)
        if actual:
            papeles.append({'bloques': actual, 'corte': None})
        if self.guardar:
            self._guardar_bytes(datos, destino)
        return self.imprimir({
            'tipo': 'escpos', 'destino': destino, 'via': 'ESC/POS',
            'equipo': equipo, 'pantalla': '', 'sede': '',
            'papeles': papeles, 'bytes': len(datos),
            'hex': ' '.join('%02X' % b for b in datos[:4096]),
            'recorte': len(datos) > 4096,
        })

    def html(self, html, destino, datos):
        """Un ticket del sistema web. `datos` dice de dónde salió: qué
        pantalla, qué local y qué equipo lo mandó."""
        return self.imprimir({
            'tipo': 'html', 'destino': destino, 'via': 'sistema web',
            'equipo': datos.get('equipo', ''),
            'pantalla': datos.get('pantalla', ''),
            'sede': datos.get('sede', ''),
            'titulo': datos.get('titulo', ''),
            'papeles': [{'html': html, 'corte': 'total'}],
            'bytes': len(html.encode('utf-8')),
        })

    def abrir_cajon(self, destino):
        with self.lock:
            self.impresoras[destino]['cajon'] += 1
        self._avisar({'que': 'cajon', 'destino': destino})

    # ── Estado y limpieza ────────────────────────────────────────────────
    def set_estado(self, destino, campos):
        if destino not in self.impresoras:
            return None
        with self.lock:
            m = self.impresoras[destino]
            for k in ('papel', 'tapa', 'enlinea'):
                if k in campos:
                    m[k] = bool(campos[k])
            if campos.get('ancho') in (58, 80):
                m['ancho'] = campos['ancho']
            estado = dict(m)
        self._avisar({'que': 'estado', 'impresora': estado})
        return estado

    def limpiar(self):
        with self.lock:
            self.trabajos = []
        self._avisar({'que': 'limpiar'})

    def instantanea(self, desde=0):
        with self.lock:
            return {'impresoras': {d: dict(m) for d, m in self.impresoras.items()},
                    'trabajos': [t for t in self.trabajos if t['id'] > desde],
                    'ultimo': self.seq}

    def _guardar_bytes(self, datos, destino):
        try:
            os.makedirs(CAPTURAS, exist_ok=True)
            nombre = '%s-%s-%03d.bin' % (time.strftime('%Y%m%d-%H%M%S'),
                                         destino, self.seq + 1)
            with open(os.path.join(CAPTURAS, nombre), 'wb') as f:
                f.write(datos)
        except OSError as e:
            print('  no se pudo guardar la captura:', e)


BANCO = None                                          # se arma en main()


# ═══ Puertos crudos: una impresora de red por destino ════════════════════
class ManejadorRaw(socketserver.BaseRequestHandler):
    """Una conexión = una sesión de impresión. Los drivers suelen dejar el
    socket abierto y mandar trabajo tras trabajo, así que el trabajo se
    cierra cuando la línea se calla un momento (o cuando cuelgan)."""

    ESPERA = 1.5                                      # silencio que cierra el trabajo
    ABANDONO = 300                                    # conexión muerta: se corta
    destino = POR_DEFECTO                             # lo fija cada servidor

    def handle(self):
        equipo = self.client_address[0]
        print('  [%s] conectó %s:%d' % (self.destino, equipo, self.client_address[1]))
        self.request.settimeout(self.ESPERA)
        buf = bytearray()
        quieto = 0.0
        try:
            while True:
                try:
                    chunk = self.request.recv(8192)
                except socket.timeout:
                    if buf:
                        BANCO.escpos(bytes(buf), self.destino, equipo)
                        buf = bytearray()
                        quieto = 0.0
                    else:
                        quieto += self.ESPERA
                        if quieto >= self.ABANDONO:
                            break
                    continue
                if not chunk:
                    break
                quieto = 0.0
                # Las consultas de estado se contestan en el acto: el que
                # pregunta está esperando el byte antes de seguir.
                with BANCO.lock:
                    m = BANCO.impresoras[self.destino]
                    papel, tapa = m['papel'], m['tapa']
                resp = respuestas_a(chunk, papel, tapa)
                if resp:
                    try:
                        self.request.sendall(resp)
                    except OSError:
                        pass
                buf += chunk
        except OSError:
            pass
        finally:
            if buf:
                BANCO.escpos(bytes(buf), self.destino, equipo)


class ServidorRaw(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def servidor_raw(host, puerto, destino):
    """Levanta un puerto crudo atado a una de las dos impresoras."""
    manejador = type('Raw' + destino.title(), (ManejadorRaw,), {'destino': destino})
    return ServidorRaw((host, puerto), manejador)


# ═══ El visor y la entrada del sistema web ═══════════════════════════════
def reglas_css(css):
    """Parte una hoja de estilos en reglas de primer nivel, contando
    llaves. Es un partidor tonto a propósito: solo tiene que aguantar el
    app.css del sistema."""
    fuera, i, n = [], 0, len(css)
    while i < n:
        llave = css.find('{', i)
        if llave < 0:
            break
        selector = css[i:llave].strip()
        prof, j = 1, llave + 1
        while j < n and prof:
            if css[j] == '{':
                prof += 1
            elif css[j] == '}':
                prof -= 1
            j += 1
        fuera.append((selector, css[llave + 1:j - 1]))
        i = j
    return fuera


def css_del_ticket():
    """Saca el bloque @media print del app.css del sistema y lo devuelve
    para pantalla. Así el rollo virtual no es una imitación: usa las mismas
    reglas con las que sale el papel de verdad, y si mañana cambian, el
    visor cambia solo."""
    ruta = os.path.join(RAIZ, 'assets', 'app.css')
    try:
        with open(ruta, encoding='utf-8') as f:
            css = f.read()
    except OSError:
        return '/* no se encontró assets/app.css */'
    for selector, cuerpo in reglas_css(css):
        if selector.startswith('@media') and 'print' in selector:
            fuera = []
            for sel, reg in reglas_css(cuerpo):
                # Lo que apaga la página (@page, body, la zona oculta) no
                # va: acá el ticket es el contenido, no una excepción.
                if sel.startswith('@page') or 'body' in sel or '#zona-impresion' in sel:
                    continue
                fuera.append('%s {%s}' % (sel, reg))
            return '\n'.join(fuera)
    return '/* el app.css no tiene bloque @media print */'


class ManejadorWeb(BaseHTTPRequestHandler):
    server_version = 'TicketeraFalsa/2.0'
    protocol_version = 'HTTP/1.1'
    puertos = {}                                      # lo llena main(), para el visor

    # ── utilidades ───────────────────────────────────────────────────────
    def _cabeceras(self, tipo, largo=None):
        self.send_response(200)
        self.send_header('Content-Type', tipo)
        if largo is not None:
            self.send_header('Content-Length', str(largo))
        # El sistema corre en el 8787 —y en otro equipo— y el visor en el
        # 8788: sin esto el navegador no deja que uno le mande el ticket.
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()

    def _json(self, obj, codigo=200):
        cuerpo = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(codigo)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(cuerpo)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(cuerpo)

    def _archivo(self, nombre):
        ruta = os.path.join(AQUI, nombre)
        if not os.path.isfile(ruta):
            return self._json({'error': 'no está %s' % nombre}, 404)
        tipo = mimetypes.guess_type(ruta)[0] or 'application/octet-stream'
        with open(ruta, 'rb') as f:
            datos = f.read()
        if 'text' in tipo or 'javascript' in tipo:
            tipo += '; charset=utf-8'
        self._cabeceras(tipo, len(datos))
        self.wfile.write(datos)

    def _cuerpo(self):
        largo = int(self.headers.get('Content-Length') or 0)
        return self.rfile.read(largo) if largo else b''

    def _pedido(self):
        """El cuerpo como diccionario, venga como venga."""
        texto = self._cuerpo().decode('utf-8', 'replace').strip()
        if texto.startswith('{'):
            try:
                return json.loads(texto)
            except ValueError:
                pass
        return {'html': texto}

    def log_message(self, formato, *args):
        pass                                          # el rollo ya es el registro

    # ── rutas ────────────────────────────────────────────────────────────
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-Length', '0')
        self.end_headers()

    def do_GET(self):
        ruta = self.path.split('?')[0]
        if ruta in ('/', '/index.html', '/rollo.html'):
            return self._archivo('rollo.html')
        if ruta in ('/rollo.css', '/rollo.js'):
            return self._archivo(ruta[1:])
        if ruta == '/ticket.css':
            css = css_del_ticket().encode('utf-8')
            self._cabeceras('text/css; charset=utf-8', len(css))
            return self.wfile.write(css)
        if ruta == '/salud':
            # El sistema pregunta esto para saber si el servidor de
            # impresión del local está levantado.
            return self._json({'ok': True, 'destinos': list(DESTINOS),
                               'puertos': self.puertos})
        if ruta == '/trabajos':
            m = re.search(r'desde=(\d+)', self.path)
            return self._json(BANCO.instantanea(int(m.group(1)) if m else 0))
        if ruta == '/eventos':
            return self._eventos()
        return self._json({'error': 'ruta desconocida'}, 404)

    def do_POST(self):
        ruta = self.path.split('?')[0]
        if ruta == '/ticket':
            d = self._pedido()
            html = d.get('html', '')
            if not html:
                return self._json({'error': 'ticket vacío'}, 400)
            # Si el que manda no dice quién es, al menos queda su IP: en el
            # local eso alcanza para saber qué tablet fue.
            d['equipo'] = d.get('equipo') or self.client_address[0]
            t = BANCO.html(html, d.get('destino'), d)
            return self._json({'ok': t['estado'] == 'impreso', 'id': t['id'],
                               'destino': t['destino'], 'motivo': t['motivo']})
        if ruta == '/escpos':
            # Bytes ESC/POS por HTTP, para probar sin abrir un socket.
            destino = re.search(r'destino=(\w+)', self.path)
            t = BANCO.escpos(self._cuerpo(),
                             destino.group(1) if destino else POR_DEFECTO,
                             self.client_address[0])
            return self._json({'ok': t['estado'] == 'impreso', 'id': t['id']})
        if ruta == '/estado':
            d = self._pedido()
            e = BANCO.set_estado(d.get('destino', POR_DEFECTO), d)
            return self._json(e or {'error': 'no existe esa impresora'},
                              200 if e else 400)
        if ruta == '/limpiar':
            BANCO.limpiar()
            return self._json({'ok': True})
        return self._json({'error': 'ruta desconocida'}, 404)

    # ── flujo de eventos hacia el visor ──────────────────────────────────
    def _eventos(self):
        self.send_response(200)
        self.send_header('Content-Type', 'text/event-stream; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Connection', 'keep-alive')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        q = BANCO.suscribir()
        try:
            self.wfile.write(b': conectado\n\n')
            self.wfile.flush()
            while True:
                try:
                    ev = q.get(timeout=15)
                    self.wfile.write(('data: %s\n\n' % json.dumps(ev, ensure_ascii=False))
                                     .encode('utf-8'))
                except queue.Empty:
                    self.wfile.write(b': latido\n\n')   # que no lo corte el navegador
                self.wfile.flush()
        except (OSError, ValueError):
            pass                                       # el visor se fue
        finally:
            BANCO.desuscribir(q)

    def handle_one_request(self):
        try:
            BaseHTTPRequestHandler.handle_one_request(self)
        except OSError:
            self.close_connection = True


# ═══ Arranque ════════════════════════════════════════════════════════════
def main():
    global BANCO
    p = argparse.ArgumentParser(
        description='Servidor de impresión del chifa, con las ticketeras emuladas')
    p.add_argument('--web', type=int, default=8788, help='puerto del visor y de los tickets')
    p.add_argument('--cocina', type=int, default=9100, help='puerto ESC/POS de cocina (0 lo apaga)')
    p.add_argument('--caja', type=int, default=9101, help='puerto ESC/POS de caja (0 lo apaga)')
    p.add_argument('--solo-este-equipo', action='store_true',
                   help='no atender a la red del local, solo a 127.0.0.1')
    p.add_argument('--abrir', action='store_true', help='abre el visor en el navegador')
    p.add_argument('--guardar', action='store_true', help='guarda los bytes en emulador/capturas/')
    args = p.parse_args()

    BANCO = Banco(guardar=args.guardar)
    # Por defecto atiende a todo el local: de eso se trata, que la tablet
    # del mozo pueda mandar su comanda. Con --solo-este-equipo se encierra.
    host = '127.0.0.1' if args.solo_este_equipo else '0.0.0.0'
    ip = '127.0.0.1' if args.solo_este_equipo else ip_del_local()

    puertos, servidores = {}, []
    for destino, puerto in (('cocina', args.cocina), ('caja', args.caja)):
        if not puerto:
            continue
        try:
            servidores.append(servidor_raw(host, puerto, destino))
            puertos[destino] = puerto
        except OSError as e:
            print('  aviso: el puerto %d (%s) no se pudo abrir: %s' % (puerto, destino, e))

    ManejadorWeb.puertos = puertos
    try:
        web = ThreadingHTTPServer((host, args.web), ManejadorWeb)
    except OSError as e:
        # Casi siempre es que ya hay otra ticketera prendida: pasa cuando
        # uno la arranca dos veces sin darse cuenta.
        print('No se pudo abrir el puerto %d: %s' % (args.web, e))
        print('¿Ya hay una ticketera corriendo? Mírala en http://127.0.0.1:%d' % args.web)
        print('Si no, arranca esta en otro puerto:  --web %d' % (args.web + 1))
        return 1
    web.daemon_threads = True
    servidores.append(web)

    for s in servidores:
        threading.Thread(target=s.serve_forever, daemon=True).start()

    print('Ticketeras emuladas · Chifa Cuatro Dragones')
    print('  visor y tickets   http://%s:%d' % (ip, args.web))
    for destino, puerto in puertos.items():
        print('  %-20s %s:%d   (ESC/POS crudo)' % (DESTINOS[destino], ip, puerto))
    if args.solo_este_equipo:
        print('  Solo este equipo: las tablets NO pueden mandar tickets.')
    else:
        print('  Las tablets y la caja imprimen acá abriendo el sistema con:')
        print('      ?emulador=%s' % ip)
    if args.guardar:
        print('  capturas          %s' % CAPTURAS)
    print('  (Ctrl+C para detenerlas)')

    if args.abrir:
        webbrowser.open('http://127.0.0.1:%d' % args.web)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print('\nDetenidas.')


if __name__ == '__main__':
    main()
