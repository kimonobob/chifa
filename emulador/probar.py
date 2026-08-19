# -*- coding: utf-8 -*-
"""Manda tickets ESC/POS al emulador, como lo haría un programa de verdad.

    python emulador/probar.py                 los manda todos
    python emulador/probar.py comanda         solo la comanda
    python emulador/probar.py boleta cajon    los que quieras
    python emulador/probar.py --host 192.168.1.50 --puerto 9100

Sin argumentos de host apunta a 127.0.0.1:9100, que es el emulador. Si
mañana compras la ticketera de verdad, el mismo comando con su IP imprime
en papel: es el mismo protocolo. Así se comprueba que lo que probaste en
pantalla es lo que va a salir.
"""

import argparse
import socket
import sys

try:                       # la consola de Windows no habla utf-8 sola
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except (AttributeError, OSError):
    pass

ANCHO = 42                       # columnas de la fuente A en papel de 80 mm

ESC, GS = 0x1B, 0x1D
INIT = bytes([ESC, 0x40])
CP850 = bytes([ESC, 0x74, 0x02])
IZQ, CENTRO, DER = (bytes([ESC, 0x61, n]) for n in (0, 1, 2))
NEG_SI, NEG_NO = bytes([ESC, 0x45, 1]), bytes([ESC, 0x45, 0])
CORTE = bytes([GS, 0x56, 0x00])
CAJON = bytes([ESC, 0x70, 0x00, 0x19, 0xFA])


def tam(ancho=1, alto=1):
    """GS ! n — el ancho va en el nibble alto y el alto en el bajo."""
    return bytes([GS, 0x21, ((ancho - 1) << 4) | (alto - 1)])


def t(texto):
    """Texto en cp850, que es lo que entienden estas máquinas. Lo que no
    esté en la página se reemplaza en vez de reventar."""
    return texto.encode('cp850', 'replace')


def fila(izq, der_):
    """Una línea con el nombre a la izquierda y el monto pegado al borde."""
    hueco = max(1, ANCHO - len(izq) - len(der_))
    return t(izq + ' ' * hueco + der_) + b'\n'


def raya(c='-'):
    return t(c * ANCHO) + b'\n'


# ── Los tickets ───────────────────────────────────────────────────────────
def comanda():
    """Lo que sale en cocina cuando el mozo manda el pedido."""
    return (INIT + CP850 + CENTRO
            + tam(2, 2) + t('COMANDA') + b'\n'
            + tam(1, 1) + t('Pedido N° 148 · 20:41:07') + b'\n'
            + tam(2, 3) + t('MESA 7') + b'\n'
            + tam(1, 1) + t('Mozo: Luis') + b'\n'
            + IZQ + raya()
            + tam(2, 2) + t('02  2x') + tam(1, 2) + t(' ARROZ CHAUFA') + b'\n'
            + tam(1, 1) + t('        >> sin cebolla china') + b'\n'
            + tam(2, 2) + t('15  1x') + tam(1, 2) + t(' WANTAN FRITO') + b'\n'
            + tam(2, 2) + t('41  1x') + tam(1, 2) + t(' TALLARIN [FAM]') + b'\n'
            + tam(1, 1) + raya()
            + CENTRO + t('4 platos · impreso 20:41:09') + b'\n'
            + bytes([ESC, 0x64, 0x03]) + CORTE)


def boleta():
    """El comprobante de caja, con su total y su vuelto."""
    return (INIT + CP850 + CENTRO
            + tam(2, 2) + t('CUATRO DRAGONES') + b'\n'
            + tam(1, 1) + t('Av. Los Chifas 421 - Lima') + b'\n'
            + t('RUC 20512345678') + b'\n\n'
            + NEG_SI + t('BOLETA DE VENTA') + NEG_NO + b'\n'
            + t('N° 00214 · Mesa 7') + b'\n'
            + t('18/08/2026 21:03 · Caja 1') + b'\n'
            + IZQ + raya()
            + fila('2x 02 Arroz chaufa', '24.00')
            + fila('1x 15 Wantan frito', '12.00')
            + fila('1x 41 Tallarin saltado [FAM]', '32.00')
            + raya()
            + fila('Subtotal', '68.00')
            + fila('Descuento', '-3.00')
            + NEG_SI + tam(1, 2) + fila('TOTAL', 'S/ 65.00') + tam(1, 1) + NEG_NO
            + fila('Efectivo', '100.00')
            + fila('VUELTO', '35.00')
            + raya()
            + CENTRO + t('¡Gracias por su visita!') + b'\n'
            + t('Vuelva pronto') + b'\n'
            + bytes([ESC, 0x64, 0x03]) + CAJON + CORTE)


def plato():
    """Un papel por platillo, con el código enorme para la barra."""
    return (INIT + CP850 + CENTRO
            + tam(2, 2) + t('MESA 7') + b'\n'
            + tam(1, 1) + t('Pedido N° 148') + b'\n' + raya()
            + tam(4, 4) + t('02') + b'\n'
            + tam(1, 2) + t('ARROZ CHAUFA') + b'\n'
            + tam(1, 1) + t('1 de 2') + b'\n'
            + t('>> sin cebolla china') + b'\n'
            + raya() + t('Mozo: Luis') + b'\n'
            + bytes([ESC, 0x64, 0x02]) + CORTE)


def cajon():
    """Solo el pulso al cajón de dinero, sin imprimir nada."""
    return INIT + CAJON


def barras():
    """Códigos: el de barras y el QR que pide SUNAT en las boletas."""
    dato = b'20512345678|03|B001|214|11.75|65.00|18/08/2026'
    qr = (bytes([GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00])   # modelo
          + bytes([GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x06])       # tamaño
          + bytes([GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31])       # corrección
          + bytes([GS, 0x28, 0x6B, (len(dato) + 3) & 0xFF, (len(dato) + 3) >> 8,
                   0x31, 0x50, 0x30]) + dato                            # datos
          + bytes([GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]))      # imprimir
    return (INIT + CENTRO + t('Representación impresa') + b'\n' + qr
            + bytes([GS, 0x6B, 0x49, 12]) + b'775012345678'             # CODE128
            + b'\n' + bytes([ESC, 0x64, 0x02]) + CORTE)


def logo():
    """Una imagen de mapa de bits, como el logo del local: un dragón muy
    cuadrado, pero sirve para ver que la trama se dibuja."""
    ancho_bytes, alto = 6, 48                    # 48 x 48 puntos
    filas = bytearray()
    for y in range(alto):
        for bx in range(ancho_bytes):
            val = 0
            for bit in range(8):
                x = bx * 8 + bit
                dentro = (abs(x - 24) + abs(y - 24) < 20) and ((x + y) % 4 < 2)
                if dentro:
                    val |= 0x80 >> bit
            filas.append(val)
    return (INIT + CENTRO
            + bytes([GS, 0x76, 0x30, 0x00, ancho_bytes, 0x00, alto, 0x00])
            + bytes(filas)
            + t('CUATRO DRAGONES') + b'\n'
            + bytes([ESC, 0x64, 0x02]) + CORTE)


def raro():
    """Comandos que el intérprete no conoce: tienen que salir marcados en
    rojo con su hexadecimal, no desaparecer sin dejar rastro."""
    return (INIT + t('antes del comando raro') + b'\n'
            + bytes([ESC, 0x7A, 0x04])
            + t('después') + b'\n' + CORTE)


TICKETS = {'comanda': comanda, 'boleta': boleta, 'plato': plato,
           'cajon': cajon, 'barras': barras, 'logo': logo, 'raro': raro}


def main():
    p = argparse.ArgumentParser(description='Manda tickets ESC/POS de prueba')
    p.add_argument('cuales', nargs='*', default=[], help='comanda boleta plato cajon barras logo raro')
    p.add_argument('--host', default='127.0.0.1')
    p.add_argument('--puerto', type=int, default=9100)
    p.add_argument('--veces', type=int, default=1, help='repetir el envío')
    args = p.parse_args()

    cuales = args.cuales or list(TICKETS)
    malos = [c for c in cuales if c not in TICKETS]
    if malos:
        print('No conozco: %s' % ', '.join(malos))
        print('Hay: %s' % ', '.join(TICKETS))
        return 1

    datos = b''.join(TICKETS[c]() for c in cuales) * args.veces
    try:
        with socket.create_connection((args.host, args.puerto), timeout=5) as s:
            s.sendall(datos)
            # Preguntamos cómo está la impresora: una ticketera contesta un
            # byte de estado, y el emulador también.
            s.sendall(bytes([0x10, 0x04, 0x04]))
            s.settimeout(2)
            try:
                r = s.recv(8)
                if r:
                    hay_papel = not (r[0] & 0x60)
                    print('  estado: %s (0x%02X)' %
                          ('con papel' if hay_papel else 'SIN PAPEL', r[0]))
            except socket.timeout:
                print('  la impresora no contestó el estado')
    except OSError as e:
        print('No se pudo conectar a %s:%d — %s' % (args.host, args.puerto, e))
        print('¿Está corriendo `python emulador/impresora.py`?')
        return 1

    print('Enviados %d bytes: %s' % (len(datos), ', '.join(cuales)))
    print('Míralos en http://127.0.0.1:8788')
    return 0


if __name__ == '__main__':
    sys.exit(main())
