# -*- coding: utf-8 -*-
"""Servidor local del chifa.

    python servir.py            -> http://127.0.0.1:8787

Igual que `python -m http.server`, pero le dice al navegador que NO guarde
nada en caché. Sin esto, al actualizar el sistema el navegador puede seguir
usando una copia vieja de los archivos y el chifa trabaja con una versión
que ya no existe — cosa que pasa y cuesta mucho de encontrar.
"""
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PUERTO = int(sys.argv[1]) if len(sys.argv) > 1 else 8787
RAIZ = os.path.dirname(os.path.abspath(__file__))


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
    servidor = ThreadingHTTPServer(('127.0.0.1', PUERTO), SinCache)
    print('Chifa Cuatro Dragones')
    print('  http://127.0.0.1:%d' % PUERTO)
    print('  (Ctrl+C para detenerlo)')
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        print('\nDetenido.')
