# -*- coding: utf-8 -*-
"""Servidor local del chifa.

    python servir.py            -> http://127.0.0.1:8787
    python servir.py --red      -> además, para las tablets del local

Igual que `python -m http.server`, pero le dice al navegador que NO guarde
nada en caché. Sin esto, al actualizar el sistema el navegador puede seguir
usando una copia vieja de los archivos y el chifa trabaja con una versión
que ya no existe — cosa que pasa y cuesta mucho de encontrar.
"""
import os
import socket
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

# Con --red atiende a todo el local, no solo a este equipo: es lo que
# necesita la tablet del mozo para abrir el sistema. Sin eso, el navegador
# de la tablet ni siquiera llega a esta dirección.
RED = '--red' in sys.argv
SUELTOS = [a for a in sys.argv[1:] if not a.startswith('-')]
PUERTO = int(SUELTOS[0]) if SUELTOS else 8787
RAIZ = os.path.dirname(os.path.abspath(__file__))

try:                       # la consola de Windows no habla utf-8 sola
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except (AttributeError, OSError):
    pass


def ip_del_local():
    """La IP de este equipo en la red del chifa, que es la que se les pone
    a las tablets. No manda nada: solo pregunta por dónde saldría."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        return s.getsockname()[0]
    except OSError:
        return '127.0.0.1'
    finally:
        s.close()


class SinCache(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=RAIZ, **kw)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, formato, *args):
        # Solo los errores: el registro de cada archivo servido no aporta.
        if args and str(args[1]).startswith(('4', '5')):
            super().log_message(formato, *args)


if __name__ == '__main__':
    anfitrion = '0.0.0.0' if RED else '127.0.0.1'
    ip = ip_del_local() if RED else '127.0.0.1'
    servidor = ThreadingHTTPServer((anfitrion, PUERTO), SinCache)
    print('Chifa Cuatro Dragones')
    print('  http://%s:%d' % (ip, PUERTO))
    if RED:
        print('  Las tablets del local abren esa misma dirección.')
    else:
        print('  Solo este equipo. Para las tablets: python servir.py --red')
    print('  (Ctrl+C para detenerlo)')
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print('\nDetenido.')
