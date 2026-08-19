# -*- coding: utf-8 -*-
"""Emulador de ticketera térmica de 80 mm — Chifa Cuatro Dragones.

    python emulador/impresora.py

Levanta dos cosas a la vez:

  · Puerto 9100 (TCP crudo)  — el mismo que usan las ticketeras de red
    (Epson TM-T20, las genéricas POS-80). Recibe ESC/POS, lo interpreta y
    lo dibuja. Sirve para probar impresión directa, sin navegador.

  · http://127.0.0.1:8788     — el visor: el rollo de papel saliendo en
    pantalla. Ahí también entran los tickets del sistema web, que manda
    HTML en vez de ESC/POS.

Todo se queda en 127.0.0.1: esto es una herramienta de banco de pruebas,
no un servicio para exponer en la red del local.

Opciones:
    --web 8788        puerto del visor
    --raw 9100        puerto crudo (0 lo apaga)
    --abrir           abre el visor en el navegador al arrancar
    --guardar         guarda los bytes crudos en emulador/capturas/
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
MAX_TRABAJOS = 200                                    # lo viejo se cae del rollo


# ═══ El rollo: lo que la impresora lleva impreso ═════════════════════════
class Rollo:
    """Guarda los trabajos y avisa a los visores conectados. Es el único
    estado compartido, así que todo lo que toca la lista pasa por el
    candado."""

    def __init__(self, guardar=False):
        self.lock = threading.Lock()
        self.trabajos = []
        self.seq = 0
        self.oyentes = []                             # colas de los visores
        self.guardar = guardar
        # Estado simulado de la máquina, para probar los caminos feos.
        self.estado = {'papel': True, 'tapa': False, 'enlinea': True,
                       'ancho': 80, 'cajon': 0}

    # ── Visores ──────────────────────────────────────────────────────────
    def suscribir(self):
        q = queue.Queue(maxsize=50)
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
    def _rechazo(self):
        """La impresora no puede imprimir: dice por qué. Igual queda
        anotado en el rollo, que para eso se prueba."""
        if not self.estado['enlinea']:
            return 'impresora desconectada'
        if self.estado['tapa']:
            return 'tapa abierta'
        if not self.estado['papel']:
            return 'sin papel'
        return None

    def imprimir(self, trabajo):
        motivo = self._rechazo()
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

    def escpos(self, datos, origen):
        """Bytes ESC/POS → papeles. Cada corte arranca un papel nuevo."""
        bloques = Interprete().analizar(datos)
        papeles, actual = [], []
        for b in bloques:
            if b['tipo'] == 'corte':
                papeles.append({'bloques': actual, 'corte': b['modo']})
                actual = []
            else:
                if b['tipo'] == 'cajon':
                    self.abrir_cajon()
                actual.append(b)
        if actual:
            papeles.append({'bloques': actual, 'corte': None})
        if self.guardar:
            self._guardar_bytes(datos)
        return self.imprimir({
            'tipo': 'escpos', 'via': 'puerto 9100', 'origen': origen,
            'papeles': papeles, 'bytes': len(datos),
            'hex': ' '.join('%02X' % b for b in datos[:4096]),
            'recorte': len(datos) > 4096,
        })

    def html(self, html, titulo, via='navegador'):
        return self.imprimir({
            'tipo': 'html', 'via': via, 'origen': titulo or 'sistema web',
            'papeles': [{'html': html, 'corte': 'total'}],
            'bytes': len(html.encode('utf-8')),
        })

    def abrir_cajon(self):
        with self.lock:
            self.estado['cajon'] += 1
        self._avisar({'que': 'cajon'})

    # ── Estado y limpieza ────────────────────────────────────────────────
    def set_estado(self, campos):
        with self.lock:
            for k in ('papel', 'tapa', 'enlinea'):
                if k in campos:
                    self.estado[k] = bool(campos[k])
            if 'ancho' in campos and campos['ancho'] in (58, 80):
                self.estado['ancho'] = campos['ancho']
            estado = dict(self.estado)
        self._avisar({'que': 'estado', 'estado': estado})
        return estado

    def limpiar(self):
        with self.lock:
            self.trabajos = []
        self._avisar({'que': 'limpiar'})

    def instantanea(self, desde=0):
        with self.lock:
            return {'estado': dict(self.estado),
                    'trabajos': [t for t in self.trabajos if t['id'] > desde],
                    'ultimo': self.seq}

    def _guardar_bytes(self, datos):
        try:
            os.makedirs(CAPTURAS, exist_ok=True)
            nombre = time.strftime('%Y%m%d-%H%M%S') + '-%03d.bin' % (self.seq + 1)
            with open(os.path.join(CAPTURAS, nombre), 'wb') as f:
                f.write(datos)
        except OSError as e:
            print('  no se pudo guardar la captura:', e)


ROLLO = None                                          # se arma en main()


# ═══ Puerto 9100: la impresora de red ════════════════════════════════════
class ManejadorRaw(socketserver.BaseRequestHandler):
    """Una conexión = una sesión de impresión. Los drivers suelen dejar el
    socket abierto y mandar trabajo tras trabajo, así que cerramos el
    trabajo cuando se calla la línea por un momento (o cuando cuelga)."""

    ESPERA = 1.5                                      # silencio que cierra el trabajo
    ABANDONO = 300                                    # conexión muerta: se corta

    def handle(self):
        origen = '%s:%d' % self.client_address
        print('  [9100] conectó %s' % origen)
        self.request.settimeout(self.ESPERA)
        buf = bytearray()
        quieto = 0.0
        try:
            while True:
                try:
                    chunk = self.request.recv(8192)
                except socket.timeout:
                    if buf:
                        ROLLO.escpos(bytes(buf), origen)
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
                # Contestar las consultas de estado en el acto: el que
                # pregunta está esperando el byte antes de seguir.
                with ROLLO.lock:
                    papel, tapa = ROLLO.estado['papel'], ROLLO.estado['tapa']
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
                ROLLO.escpos(bytes(buf), origen)
            print('  [9100] cerró %s' % origen)


class ServidorRaw(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


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
    server_version = 'TicketeraFalsa/1.0'
    protocol_version = 'HTTP/1.1'

    # ── utilidades ───────────────────────────────────────────────────────
    def _cabeceras(self, tipo, largo=None, extra=None):
        self.send_response(200)
        self.send_header('Content-Type', tipo)
        if largo is not None:
            self.send_header('Content-Length', str(largo))
        # El sistema corre en el 8787 y el visor en el 8788: sin esto el
        # navegador no deja que uno le mande el ticket al otro.
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-store')
        for k, v in (extra or {}).items():
            self.send_header(k, v)
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
        self._cabeceras(tipo + ('; charset=utf-8' if 'text' in tipo or 'javascript' in tipo else ''),
                        len(datos))
        self.wfile.write(datos)

    def _cuerpo(self):
        largo = int(self.headers.get('Content-Length') or 0)
        return self.rfile.read(largo) if largo else b''

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
            return self._json({'ok': True, 'emulador': 'ticketera 80 mm'})
        if ruta == '/trabajos':
            desde = 0
            if '?' in self.path:
                m = re.search(r'desde=(\d+)', self.path)
                desde = int(m.group(1)) if m else 0
            return self._json(ROLLO.instantanea(desde))
        if ruta == '/eventos':
            return self._eventos()
        return self._json({'error': 'ruta desconocida'}, 404)

    def do_POST(self):
        ruta = self.path.split('?')[0]
        cuerpo = self._cuerpo()
        if ruta == '/ticket':
            texto = cuerpo.decode('utf-8', 'replace').strip()
            titulo = ''
            html = texto
            if texto.startswith('{'):
                try:
                    obj = json.loads(texto)
                    html = obj.get('html', '')
                    titulo = obj.get('titulo', '')
                except ValueError:
                    pass
            if not html:
                return self._json({'error': 'ticket vacío'}, 400)
            t = ROLLO.html(html, titulo)
            return self._json({'ok': t['estado'] == 'impreso', 'id': t['id'],
                               'motivo': t['motivo']})
        if ruta == '/escpos':
            # Bytes ESC/POS por HTTP, para probar sin abrir un socket.
            t = ROLLO.escpos(cuerpo, 'HTTP')
            return self._json({'ok': t['estado'] == 'impreso', 'id': t['id']})
        if ruta == '/estado':
            try:
                campos = json.loads(cuerpo.decode('utf-8') or '{}')
            except ValueError:
                campos = {}
            return self._json(ROLLO.set_estado(campos))
        if ruta == '/limpiar':
            ROLLO.limpiar()
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
        q = ROLLO.suscribir()
        try:
            self.wfile.write(b': conectado\n\n')
            self.wfile.flush()
            while True:
                try:
                    ev = q.get(timeout=15)
                    dato = json.dumps(ev, ensure_ascii=False)
                    self.wfile.write(('data: %s\n\n' % dato).encode('utf-8'))
                except queue.Empty:
                    self.wfile.write(b': latido\n\n')   # que no lo corte el navegador
                self.wfile.flush()
        except (OSError, ValueError):
            pass                                       # el visor se fue
        finally:
            ROLLO.desuscribir(q)

    def handle_one_request(self):
        try:
            BaseHTTPRequestHandler.handle_one_request(self)
        except OSError:
            self.close_connection = True


# ═══ Arranque ════════════════════════════════════════════════════════════
def main():
    global ROLLO
    p = argparse.ArgumentParser(description='Emulador de ticketera térmica')
    p.add_argument('--web', type=int, default=8788, help='puerto del visor')
    p.add_argument('--raw', type=int, default=9100, help='puerto ESC/POS crudo (0 = apagado)')
    p.add_argument('--abrir', action='store_true', help='abre el visor en el navegador')
    p.add_argument('--guardar', action='store_true', help='guarda los bytes en emulador/capturas/')
    args = p.parse_args()

    ROLLO = Rollo(guardar=args.guardar)

    web = ThreadingHTTPServer(('127.0.0.1', args.web), ManejadorWeb)
    web.daemon_threads = True
    hilos = [threading.Thread(target=web.serve_forever, daemon=True)]

    raw = None
    if args.raw:
        try:
            raw = ServidorRaw(('127.0.0.1', args.raw), ManejadorRaw)
            hilos.append(threading.Thread(target=raw.serve_forever, daemon=True))
        except OSError as e:
            print('  aviso: el puerto %d no se pudo abrir (%s).' % (args.raw, e))
            print('  El visor igual funciona; solo queda sin entrada ESC/POS.')

    for h in hilos:
        h.start()

    print('Ticketera térmica emulada · Chifa Cuatro Dragones')
    print('  visor    http://127.0.0.1:%d' % args.web)
    if raw:
        print('  ESC/POS  127.0.0.1:%d  (puerto crudo, como una impresora de red)' % args.raw)
    if args.guardar:
        print('  capturas %s' % CAPTURAS)
    print('  (Ctrl+C para detenerla)')

    if args.abrir:
        webbrowser.open('http://127.0.0.1:%d' % args.web)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print('\nDetenida.')


if __name__ == '__main__':
    main()
