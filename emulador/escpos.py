# -*- coding: utf-8 -*-
"""Intérprete de ESC/POS.

Traduce el chorro de bytes que un programa le manda a una ticketera térmica
a una lista de bloques que el visor sabe dibujar. No imprime nada: solo
entiende. Lo que no reconoce lo guarda como bloque `crudo` con el
hexadecimal, que para depurar vale más que tragárselo en silencio.

Bloques que produce:
    {'tipo':'linea',  'align':0|1|2, 'runs':[{'t':..,'neg':..,'an':..,'al':..}]}
    {'tipo':'corte',  'modo':'total'|'parcial'}
    {'tipo':'avance', 'lineas':n}
    {'tipo':'cajon',  'pin':0|1}
    {'tipo':'imagen', 'png':'data:image/png;base64,..', 'an':w, 'al':h}
    {'tipo':'codigo', 'clase':'qr'|'barras', 'sistema':str, 'dato':str}
    {'tipo':'crudo',  'hex':'1B 7A 04', 'nota':'comando desconocido'}
"""

import base64
import struct
import zlib

# ── Páginas de código ─────────────────────────────────────────────────────
# ESC t n. La 0 (cp437) es la de fábrica en casi toda ticketera china; las
# librerías serias mandan la 2 (cp850) o la 19 (cp858, con el símbolo del
# euro) cuando hay que escribir ñ y tildes.
PAGINAS = {
    0: 'cp437', 1: 'cp437', 2: 'cp850', 3: 'cp860', 4: 'cp863', 5: 'cp865',
    6: 'cp437', 7: 'cp437', 8: 'cp437', 11: 'cp851', 12: 'cp853',
    13: 'cp857', 14: 'cp737', 15: 'cp1252', 16: 'cp1252', 17: 'cp866',
    18: 'cp852', 19: 'cp858', 20: 'cp1251', 21: 'cp862', 22: 'cp864',
    23: 'cp1253', 24: 'cp1254', 25: 'cp1255', 26: 'cp1256', 27: 'cp1257',
    28: 'cp1258', 29: 'cp864', 30: 'cp862', 31: 'cp1250',
    255: 'cp437',
}

SISTEMAS_BARRAS = {
    0: 'UPC-A', 1: 'UPC-E', 2: 'EAN13', 3: 'EAN8', 4: 'CODE39',
    5: 'ITF', 6: 'CODABAR', 7: 'CODE93', 8: 'CODE128',
    65: 'UPC-A', 66: 'UPC-E', 67: 'EAN13', 68: 'EAN8', 69: 'CODE39',
    70: 'ITF', 71: 'CODABAR', 72: 'CODE93', 73: 'CODE128',
}

CONTROL = {0x1B, 0x1D, 0x1C, 0x10, 0x0A, 0x0D, 0x09, 0x00, 0x0C, 0x18}


def png_gris(pixeles, ancho, alto):
    """Arma un PNG en gris de 8 bits sin librerías externas.

    `pixeles` es un bytearray de ancho*alto con 0 = negro, 255 = blanco.
    Sirve para las imágenes de mapa de bits: logos, o los QR que la librería
    del cliente ya mandó rasterizados."""
    if not ancho or not alto:
        return ''
    crudo = b''.join(b'\x00' + bytes(pixeles[y * ancho:(y + 1) * ancho])
                     for y in range(alto))

    def trozo(tipo, datos):
        return (struct.pack('>I', len(datos)) + tipo + datos +
                struct.pack('>I', zlib.crc32(tipo + datos) & 0xffffffff))

    png = (b'\x89PNG\r\n\x1a\n'
           + trozo(b'IHDR', struct.pack('>IIBBBBB', ancho, alto, 8, 0, 0, 0, 0))
           + trozo(b'IDAT', zlib.compress(crudo, 9))
           + trozo(b'IEND', b''))
    return 'data:image/png;base64,' + base64.b64encode(png).decode('ascii')


class Interprete:
    """Un intérprete por conexión: el estado (negrita, tamaño...) se arrastra
    entre bloques igual que en la impresora de verdad, hasta que llega un
    ESC @ que la reinicia."""

    def __init__(self):
        self.qr = ''
        self.reiniciar()

    def reiniciar(self):
        self.align = 0          # 0 izquierda · 1 centro · 2 derecha
        self.neg = False        # negrita
        self.sub = False        # subrayado
        self.inv = False        # blanco sobre negro
        self.an = 1             # multiplicador de ancho 1..8
        self.al = 1             # multiplicador de alto 1..8
        self.fuente = 'A'       # A (12x24) o B (9x17, más chica)
        self.pagina = 'cp437'
        self.bloques = []
        self.runs = []
        self.texto = ''

    # ── Acumulación de texto ─────────────────────────────────────────────
    def _attrs(self):
        return {'neg': self.neg, 'sub': self.sub, 'inv': self.inv,
                'an': self.an, 'al': self.al, 'fuente': self.fuente}

    def _cerrar_run(self):
        """Antes de tocar un atributo hay que cerrar lo ya escrito con el
        anterior: dentro de una línea puede ir 'TOTAL' en negrita y el monto
        en letra normal."""
        if self.texto:
            self.runs.append(dict(t=self.texto, **self._attrs()))
            self.texto = ''

    def _fin_linea(self, final=False):
        self._cerrar_run()
        if self.runs:
            self.bloques.append({'tipo': 'linea', 'align': self.align,
                                 'runs': self.runs})
            self.runs = []
        elif not final:
            self.bloques.append({'tipo': 'linea', 'align': self.align,
                                 'runs': []})

    def _agregar(self, bloque):
        self._fin_linea(final=True)     # lo pendiente sale antes del bloque
        self.bloques.append(bloque)

    def _crudo(self, datos, nota=''):
        self._agregar({'tipo': 'crudo',
                       'hex': ' '.join('%02X' % b for b in datos),
                       'nota': nota})

    # ── Entrada ──────────────────────────────────────────────────────────
    def analizar(self, datos):
        """Devuelve los bloques de este chorro de bytes."""
        self.bloques = []
        i, n = 0, len(datos)
        while i < n:
            b = datos[i]
            if b == 0x1B:
                i = self._esc(datos, i)
            elif b == 0x1D:
                i = self._gs(datos, i)
            elif b == 0x1C:
                i = self._fs(datos, i)
            elif b == 0x10:
                i = self._dle(datos, i)
            elif b == 0x0A:
                self._fin_linea()
                i += 1
            elif b in (0x0D, 0x00, 0x0C, 0x18):
                i += 1                      # CR, NUL, FF y CAN: nada que dibujar
            elif b == 0x09:
                self.texto += '    '        # tabulación aproximada
                i += 1
            else:
                j = i
                while j < n and datos[j] not in CONTROL:
                    j += 1
                self.texto += datos[i:j].decode(self.pagina, 'replace')
                i = j
        self._fin_linea(final=True)
        return self.bloques

    # ── ESC ... ──────────────────────────────────────────────────────────
    def _esc(self, d, i):
        n = len(d)
        if i + 1 >= n:
            return n
        c = d[i + 1]
        arg = d[i + 2] if i + 2 < n else 0

        if c == 0x40:                                   # ESC @  inicializar
            pendientes = self.bloques
            self.reiniciar()
            self.bloques = pendientes
            return i + 2
        if c == 0x61:                                   # ESC a n  alineación
            self._cerrar_run()
            self.align = arg if arg <= 2 else (arg - 48 if 48 <= arg <= 50 else 0)
            return i + 3
        if c == 0x21:                                   # ESC ! n  modo de impresión
            self._cerrar_run()
            self.fuente = 'B' if arg & 0x01 else 'A'
            self.neg = bool(arg & 0x08)
            self.al = 2 if arg & 0x10 else 1
            self.an = 2 if arg & 0x20 else 1
            self.sub = bool(arg & 0x80)
            return i + 3
        if c in (0x45, 0x47):                           # ESC E / ESC G  negrita
            self._cerrar_run()
            self.neg = arg not in (0, 48)
            return i + 3
        if c == 0x2D:                                   # ESC -  subrayado
            self._cerrar_run()
            self.sub = arg in (1, 2, 49, 50)
            return i + 3
        if c == 0x4D:                                   # ESC M n  fuente
            self._cerrar_run()
            self.fuente = 'B' if arg in (1, 49) else 'A'
            return i + 3
        if c == 0x7B:                                   # ESC { n  cabeza abajo
            return i + 3
        if c == 0x64:                                   # ESC d n  avanzar líneas
            self._agregar({'tipo': 'avance', 'lineas': max(1, arg)})
            return i + 3
        if c == 0x4A:                                   # ESC J n  avanzar puntos
            self._agregar({'tipo': 'avance', 'lineas': max(1, round(arg / 24))})
            return i + 3
        if c in (0x69, 0x6D):                           # ESC i / ESC m  corte antiguo
            self._agregar({'tipo': 'corte',
                           'modo': 'total' if c == 0x69 else 'parcial'})
            return i + 2
        if c == 0x74:                                   # ESC t n  página de código
            self.pagina = PAGINAS.get(arg, 'cp437')
            return i + 3
        if c == 0x63:                                   # ESC c 5 n / ESC c 4 n
            return i + 4
        if c in (0x53, 0x76, 0x32):                     # modo estándar, papel, interlineado
            return i + 2
        if c in (0x52, 0x33, 0x55, 0x75, 0x72, 0x54, 0x4B, 0x65):
            return i + 3                                # juego internacional, interlineado, avisos
        if c == 0x44:                                   # ESC D ... NUL  tabuladores
            j = i + 2
            while j < n and d[j] != 0x00:
                j += 1
            return j + 1
        if c in (0x24, 0x5C):                           # ESC $ / ESC \  posición
            return i + 4
        if c == 0x70:                                   # ESC p m t1 t2  cajón
            self._agregar({'tipo': 'cajon', 'pin': 1 if arg in (1, 49) else 0})
            return i + 5
        if c == 0x2A:                                   # ESC * m nL nH  imagen por columnas
            return self._imagen_columnas(d, i)
        if c == 0x57:                                   # ESC W  área en modo página
            return i + 10
        if c == 0x4C:                                   # ESC L  modo página
            return i + 2

        self._crudo(d[i:i + 3], 'ESC desconocido')
        return i + 3

    # ── GS ... ───────────────────────────────────────────────────────────
    def _gs(self, d, i):
        n = len(d)
        if i + 1 >= n:
            return n
        c = d[i + 1]
        arg = d[i + 2] if i + 2 < n else 0

        if c == 0x21:                                   # GS ! n  tamaño
            self._cerrar_run()
            self.an = ((arg >> 4) & 0x0F) + 1
            self.al = (arg & 0x0F) + 1
            return i + 3
        if c == 0x42:                                   # GS B n  inverso
            self._cerrar_run()
            self.inv = arg not in (0, 48)
            return i + 3
        if c == 0x56:                                   # GS V  corte
            modo = 'total' if arg in (0, 48, 65, 97) else 'parcial'
            self._agregar({'tipo': 'corte', 'modo': modo})
            return i + 4 if arg in (65, 66, 97, 98) else i + 3
        if c == 0x76 and arg == 0x30:                   # GS v 0  imagen de trama
            return self._imagen_trama(d, i)
        if c == 0x6B:                                   # GS k  código de barras
            return self._barras(d, i)
        if c == 0x28:                                   # GS ( fn pL pH ...
            return self._gs_parentesis(d, i)
        if c in (0x48, 0x66, 0x68, 0x77, 0x45, 0x61, 0x72, 0x49, 0x67, 0x54, 0x62):
            return i + 3                                # ajustes de barras y consultas
        if c in (0x4C, 0x57, 0x50, 0x24, 0x5C):         # márgenes y posiciones
            return i + 4
        if c == 0x2F:                                   # GS /  imprimir imagen guardada
            return i + 3
        if c == 0x2A:                                   # GS * x y d...  definir imagen
            x = arg
            y = d[i + 3] if i + 3 < n else 0
            return i + 4 + x * y * 8
        if c == 0x7A:
            return i + 4

        self._crudo(d[i:i + 3], 'GS desconocido')
        return i + 3

    def _gs_parentesis(self, d, i):
        """GS ( fn pL pH ... — bloque con el largo declarado adelante. El
        único que nos interesa dibujar es el QR (fn = 'k')."""
        n = len(d)
        if i + 4 >= n:
            return n
        fn = d[i + 2]
        largo = d[i + 3] + (d[i + 4] << 8)
        cuerpo = d[i + 5:i + 5 + largo]
        fin = i + 5 + largo
        if fn == 0x6B and len(cuerpo) >= 2:             # GS ( k  códigos 2D
            cn, sub = cuerpo[0], cuerpo[1]
            if sub == 0x50:                             # 80: guardar los datos
                self.qr = cuerpo[3:].decode('utf-8', 'replace')
            elif sub == 0x51:                           # 81: imprimirlos
                self._agregar({'tipo': 'codigo', 'clase': 'qr',
                               'sistema': 'PDF417' if cn == 48 else 'QR',
                               'dato': self.qr})
        return fin

    # ── Imágenes ─────────────────────────────────────────────────────────
    def _imagen_trama(self, d, i):
        """GS v 0 m xL xH yL yH d... — un bit por punto, 1 = negro."""
        n = len(d)
        if i + 7 >= n:
            return n
        bytes_x = d[i + 4] + (d[i + 5] << 8)
        alto = d[i + 6] + (d[i + 7] << 8)
        datos = d[i + 8:i + 8 + bytes_x * alto]
        ancho = bytes_x * 8
        px = bytearray(b'\xff' * (ancho * alto))
        for y in range(alto):
            fila = datos[y * bytes_x:(y + 1) * bytes_x]
            for bx, val in enumerate(fila):
                for bit in range(8):
                    if val & (0x80 >> bit):
                        px[y * ancho + bx * 8 + bit] = 0
        self._agregar({'tipo': 'imagen', 'png': png_gris(px, ancho, alto),
                       'an': ancho, 'al': alto})
        return i + 8 + bytes_x * alto

    def _imagen_columnas(self, d, i):
        """ESC * m nL nH d... — el formato viejo, por columnas de 8 o 24 puntos."""
        n = len(d)
        if i + 4 >= n:
            return n
        m = d[i + 2]
        cols = d[i + 3] + (d[i + 4] << 8)
        por_col = 3 if m in (32, 33) else 1
        alto = 24 if por_col == 3 else 8
        datos = d[i + 5:i + 5 + cols * por_col]
        px = bytearray(b'\xff' * (cols * alto))
        for x in range(cols):
            for k in range(por_col):
                pos = x * por_col + k
                val = datos[pos] if pos < len(datos) else 0
                for bit in range(8):
                    if val & (0x80 >> bit):
                        px[(k * 8 + bit) * cols + x] = 0
        self._agregar({'tipo': 'imagen', 'png': png_gris(px, cols, alto),
                       'an': cols, 'al': alto})
        return i + 5 + cols * por_col

    def _barras(self, d, i):
        """GS k m ... — dos formatos: terminado en NUL (m <= 6) o con el
        largo por delante (m >= 65)."""
        n = len(d)
        if i + 2 >= n:
            return n
        m = d[i + 2]
        if m >= 65:
            largo = d[i + 3] if i + 3 < n else 0
            dato = d[i + 4:i + 4 + largo]
            fin = i + 4 + largo
        else:
            j = i + 3
            while j < n and d[j] != 0x00:
                j += 1
            dato = d[i + 3:j]
            fin = j + 1
        self._agregar({'tipo': 'codigo', 'clase': 'barras',
                       'sistema': SISTEMAS_BARRAS.get(m, 'código %d' % m),
                       'dato': dato.decode('ascii', 'replace')})
        return fin

    # ── FS ... (kanji) y DLE ... (consultas) ─────────────────────────────
    def _fs(self, d, i):
        c = d[i + 1] if i + 1 < len(d) else 0
        if c in (0x21, 0x2D, 0x43, 0x53, 0x57, 0x70, 0x71):
            return i + 3
        return i + 2

    def _dle(self, d, i):
        # DLE EOT n -> consulta de estado; DLE DC4 -> cajón / cancelar.
        c = d[i + 1] if i + 1 < len(d) else 0
        if c == 0x04:
            return i + 3
        if c == 0x14:
            return i + 5
        return i + 2


# ── Respuestas al que pregunta ────────────────────────────────────────────
# Varias librerías (python-escpos con `check_status`, algunos drivers de
# Windows) preguntan cómo está la impresora y se quedan esperando. Sin
# respuesta parece que el emulador se colgó, así que contestamos como una
# ticketera sana —o enferma, si el visor la puso sin papel o con la tapa
# abierta, que es justo lo que se quiere probar.
def respuestas_a(chunk, hay_papel=True, tapa_abierta=False):
    salida = bytearray()
    i, n = 0, len(chunk)
    while i < n - 1:
        a, b = chunk[i], chunk[i + 1]
        if a == 0x10 and b == 0x04:                     # DLE EOT n
            cual = chunk[i + 2] if i + 2 < n else 1
            if cual == 4:                               # sensor de papel
                salida.append(0x12 if hay_papel else 0x72)
            elif cual == 2:                             # fuera de línea
                salida.append(0x1E if tapa_abierta else 0x16)
            else:
                salida.append(0x16)
            i += 3
            continue
        if a == 0x1D and b == 0x72:                     # GS r n
            cual = chunk[i + 2] if i + 2 < n else 1
            salida.append(0x00 if (hay_papel or cual != 1) else 0x0C)
            i += 3
            continue
        if a == 0x1D and b == 0x49:                     # GS I n  identidad
            salida.append(0x02)
            i += 3
            continue
        if a == 0x1B and b == 0x76:                     # ESC v  papel
            salida.append(0x00 if hay_papel else 0x0C)
            i += 2
            continue
        i += 1
    return bytes(salida)
