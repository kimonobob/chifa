# Ticketera térmica emulada

Una impresora de tickets de 80 mm que no existe: recibe lo que le mandes y
lo saca en un rollo de papel dibujado en la pantalla. Sirve para probar el
sistema del chifa sin la máquina delante y sin gastar un metro de papel por
cada prueba.

Entiende las dos formas de imprimir:

| Entrada | Puerto | Quién la usa |
|---|---|---|
| **HTML** del sistema web | `8788` (`POST /ticket`) | mozo, cocina y caja, que hoy imprimen por navegador |
| **ESC/POS** crudo | `9100` (TCP) | el protocolo de las ticketeras de verdad: Epson TM-T20, las POS-80 genéricas |

---

## Arrancarlo

```
python emulador/impresora.py --abrir
```

Queda escuchando y abre el visor en **http://127.0.0.1:8788**.

Opciones: `--web 8788` (puerto del visor), `--raw 9100` (puerto crudo, `0`
lo apaga), `--guardar` (deja los bytes recibidos en `emulador/capturas/`
para mirarlos después).

Todo se ata a `127.0.0.1`: es un banco de pruebas, no un servicio para
publicar en la red del local.

---

## Probar el sistema del chifa

El sistema corre aparte, como siempre:

```
python servir.py
```

Y se le dice que imprima en la ticketera emulada agregando `?emulador=1`
una sola vez:

```
http://127.0.0.1:8787/cocina.html?emulador=1
http://127.0.0.1:8787/mozo.html?emulador=1
http://127.0.0.1:8787/caja.html?emulador=1
```

Queda prendido en ese navegador hasta que abras la misma página con
`?emulador=0`. Desde ahí, cada comanda, precuenta, boleta y cierre de caja
sale en el rollo de la pantalla en vez de abrir el diálogo de impresión.

**Si el emulador no está levantado, el ticket se va a la impresora de
verdad.** Es a propósito: perder una comanda cuesta más que un susto.

El rollo dibuja los tickets con las mismas reglas del `@media print` de
`assets/app.css` —el visor las lee del archivo al vuelo—, así que lo que ves
en pantalla es lo que va a salir en papel. Si mañana cambias esos estilos,
el visor cambia solo.

---

## Probar ESC/POS (impresión directa)

```
python emulador/probar.py                 manda todos los ejemplos
python emulador/probar.py comanda boleta  solo esos
python emulador/probar.py logo barras     imagen, código de barras y QR
```

Los ejemplos son los tickets del chifa armados con comandos de impresora:
comanda de cocina, boleta con vuelto, papel por platillo, pulso al cajón,
QR de SUNAT, logo en mapa de bits, y uno con un comando inventado para ver
que el emulador lo marca en rojo en vez de tragárselo.

El mismo comando apuntando a una impresora de verdad imprime en papel:

```
python emulador/probar.py boleta --host 192.168.1.50
```

Es el mismo protocolo. Por eso lo que pruebes acá vale para el día que
compres la máquina.

Desde otros lenguajes es igual de simple: abrir un socket a
`127.0.0.1:9100` y escribir los bytes. Con [python-escpos][escpos]:

```python
from escpos.printer import Network
p = Network('127.0.0.1', port=9100)
p.text('MESA 7\n'); p.cut()
```

[escpos]: https://github.com/python-escpos/python-escpos

---

## El visor

- **El rollo** — el papel sale de la ranura de arriba, con su ancho real en
  milímetros. Cada corte (`GS V`) separa un papel del siguiente, con el
  borde dentado. Al costado de cada uno queda el número de trabajo, la hora
  y por dónde entró.
- **Trabajos** (a la derecha) — todo lo que llegó. En los ESC/POS se puede
  desplegar **ver los bytes** con el hexadecimal completo, que es donde se
  encuentran los problemas de verdad. Al hacer clic salta a ese papel.
- **Los chips de estado** son botones: apagan el papel, abren la tapa o
  desconectan la impresora. Con eso pruebas qué hace el sistema cuando la
  ticketera falla —que es lo que nunca se prueba y siempre pasa un viernes
  a las nueve de la noche. El sistema recibe el rechazo y avisa en pantalla.
- **80 mm / 58 mm** cambia el rollo cargado. Si el ticket no entra en el
  papel, el visor lo marca: en la impresora de verdad eso se pierde por el
  costado sin avisar.
- **cajón** cuenta los pulsos al cajón de dinero (`ESC p`), y da un golpe en
  pantalla cuando llega uno.
- **ticket de prueba** manda un ticket de ejemplo sin salir del visor.

---

## Qué entiende del ESC/POS

Texto con página de código (`ESC t`, cp437/850/858…), alineación (`ESC a`),
negrita (`ESC E`, `ESC G`), subrayado (`ESC -`), inverso (`GS B`), fuente A
y B (`ESC M`), tamaños de 1× a 8× (`ESC !`, `GS !`), avances (`ESC d`,
`ESC J`), cortes total y parcial (`GS V`, `ESC i`, `ESC m`), cajón
(`ESC p`), imágenes de trama (`GS v 0`) y por columnas (`ESC *`), códigos de
barras (`GS k`) y QR (`GS ( k`), y contesta las consultas de estado
(`DLE EOT`, `GS r`, `GS I`) diciendo la verdad sobre el papel y la tapa que
tenga puestos el visor.

Lo que no reconoce sale en el papel como una marca roja con su hexadecimal.
Eso es a propósito: una impresora muda te deja adivinando.

Dos honestidades: el QR y el código de barras se dibujan como un recuadro
con el dato al lado, no como el código legible de verdad —para probar que
mandas el dato correcto alcanza—, y los tickets del sistema web se dibujan
como HTML, que es exactamente lo que hoy manda el navegador a la impresora.

---

## Archivos

```
emulador/
  impresora.py   el servidor: puerto 9100 crudo + web del visor
  escpos.py      el intérprete de ESC/POS (no imprime: entiende)
  rollo.html     el visor
  rollo.css      su estilo; el del ticket sale de assets/app.css
  rollo.js       dibuja el papel y habla con el servidor
  probar.py      manda tickets de ejemplo, acá o a una impresora real
  capturas/      bytes crudos, solo si arrancas con --guardar
```

El enganche del lado del sistema son treinta líneas en
`assets/print.js`: si el emulador está prendido, el ticket va por `fetch`;
si no, `window.print()` como siempre.
