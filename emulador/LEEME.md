# Las dos ticketeras del local, emuladas

El chifa tiene dos impresoras y cada una saca lo suyo:

| | Qué sale | Quién lo manda |
|---|---|---|
| **Cocina** | la comanda: mesa y platos a preparar | el mozo desde su tablet, o la cajera si el pedido es para llevar |
| **Caja** | la boleta al cobrar, la precuenta, el cierre del día | la cajera |

Esto las emula a las dos y hace de **servidor de impresión del local**:
recibe los tickets de todos los equipos y los reparte. Así el mozo manda el
pedido desde el salón y el papel sale en la cocina — que es el punto: la
tablet no imprime, la tablet avisa.

Todo se dibuja en un rollo de papel en pantalla, con su ancho real de 80 mm,
para probar sin gastar papel y sin tener las máquinas delante.

---

## Arrancarlo

En el equipo que va a tener las impresoras (la PC de la cocina, o la de
caja mientras pruebas):

```
python emulador/impresora.py --abrir
```

Al arrancar dice la dirección del local, por ejemplo:

```
  visor y tickets      http://192.168.1.41:8788
  Ticketera de cocina  192.168.1.41:9100   (ESC/POS crudo)
  Ticketera de caja    192.168.1.41:9101   (ESC/POS crudo)
  Las tablets y la caja imprimen acá abriendo el sistema con:
      ?emulador=192.168.1.41
```

Esa IP es la que hay que ponerle a los demás equipos.

Opciones: `--web 8788`, `--cocina 9100`, `--caja 9101` (un `0` apaga ese
puerto), `--solo-este-equipo` (no atiende a la red), `--guardar` (deja los
bytes recibidos en `emulador/capturas/`).

---

## Conectar los equipos del local

**1 · El sistema tiene que salir a la red.** Hasta ahora `servir.py` solo
atendía a la propia máquina; para que la tablet lo abra:

```
python servir.py --red
```

Dice la dirección (`http://192.168.1.41:8787`) y esa es la que se abre en
la tablet.

**2 · Cada equipo aprende dónde imprimir**, una sola vez, agregando
`?emulador=` con la IP del servidor de impresión:

```
tablet del mozo   http://192.168.1.41:8787/mozo.html?emulador=192.168.1.41
caja              http://192.168.1.41:8787/caja.html?emulador=192.168.1.41
cocina            http://192.168.1.41:8787/cocina.html?emulador=192.168.1.41
```

Queda guardado en ese equipo. Se apaga con `?emulador=0`, y si el servidor
está en la misma máquina alcanza con `?emulador=1`.

**3 · Listo.** Desde la tablet: mesa, platos, *enviar*. La comanda aparece
en el rollo de **cocina** con el sello de qué pantalla y qué equipo la
mandó. Desde la caja, al cobrar, la boleta aparece en el rollo de **caja**.

> **Ojo con lo que esto NO arregla.** Los pedidos siguen viviendo en el
> navegador de cada equipo: la comanda que manda la tablet **sale impresa
> en la cocina, pero la cuenta no aparece en la pantalla de la caja**. Para
> eso hace falta el backend que menciona el README. Lo que ya funciona de
> punta a punta, y se puede probar, es el papel.

Si el servidor de impresión no contesta, el ticket se imprime por el
navegador del equipo que lo mandó: una comanda perdida cuesta más que un
susto.

---

## El visor

Dos rollos, uno por impresora. El papel sale de la ranura de arriba con su
ancho real; cada corte separa un papel del siguiente, con el borde dentado.
Al costado de cada papel queda el número de trabajo, la hora, **de qué
pantalla y de qué equipo salió**.

- **Trabajos** (a la derecha) — todo lo que llegó, a cuál impresora, desde
  qué equipo. En los ESC/POS se despliega **ver los bytes** con el
  hexadecimal completo, que es donde se encuentran los problemas de verdad.
  Al hacer clic salta a ese papel.
- **Los chips de cada impresora son botones**: le quitan el papel, le abren
  la tapa o la desconectan — **cada una por separado**. Con eso se prueba
  qué hace el sistema cuando la ticketera falla: el equipo que mandó el
  ticket recibe el rechazo y avisa en pantalla ("La ticketera de cocina no
  imprimió: sin papel"). Es lo que nunca se prueba y siempre pasa un
  viernes a las nueve de la noche.
- **80 mm / 58 mm** cambia el rollo cargado de esa impresora. Si el ticket
  no entra, el visor lo marca: en la máquina de verdad eso se pierde por el
  costado sin avisar.
- **cajón** cuenta los pulsos al cajón de dinero (`ESC p`) de esa máquina.
- **probar** manda un ticket de ejemplo a esa impresora sin tocar el sistema.

---

## Probar ESC/POS (impresión directa)

```
python emulador/probar.py                  manda todos los ejemplos
python emulador/probar.py comanda          la comanda, por cocina
python emulador/probar.py boleta           la boleta, por caja
python emulador/probar.py logo --a cocina  fuerza una ticketera
```

Cada ejemplo sale por la ticketera que le toca, igual que en el local. El
mismo comando apuntando a una impresora de verdad imprime en papel:

```
python emulador/probar.py boleta --host 192.168.1.50
```

Es el mismo protocolo. Por eso lo que pruebes acá vale para el día que
compres las máquinas.

Desde otros lenguajes es igual de simple: abrir un socket al puerto y
escribir los bytes. Con [python-escpos][escpos]:

```python
from escpos.printer import Network
cocina = Network('192.168.1.41', port=9100)
cocina.text('MESA 7\n'); cocina.cut()
```

[escpos]: https://github.com/python-escpos/python-escpos

---

## Qué entiende del ESC/POS

Texto con página de código (`ESC t`, cp437/850/858…), alineación (`ESC a`),
negrita (`ESC E`, `ESC G`), subrayado (`ESC -`), inverso (`GS B`), fuente A
y B (`ESC M`), tamaños de 1× a 8× (`ESC !`, `GS !`), avances (`ESC d`,
`ESC J`), cortes total y parcial (`GS V`, `ESC i`, `ESC m`), cajón
(`ESC p`), imágenes de trama (`GS v 0`) y por columnas (`ESC *`), códigos de
barras (`GS k`) y QR (`GS ( k`), y contesta las consultas de estado
(`DLE EOT`, `GS r`, `GS I`) diciendo la verdad sobre el papel y la tapa que
tenga puestos esa impresora en el visor.

Lo que no reconoce sale en el papel como una marca roja con su hexadecimal.
Eso es a propósito: una impresora muda te deja adivinando.

Tres honestidades:

1. El QR y el código de barras se dibujan como un recuadro con el dato al
   lado, no como el código legible de verdad. Para comprobar que mandas el
   dato correcto alcanza; para probar que SUNAT lo lee, no.
2. Los tickets del sistema web se dibujan como HTML —que es exactamente lo
   que hoy manda el navegador a la impresora—, con las mismas reglas del
   `@media print` de `assets/app.css`, leídas del archivo al vuelo. Si
   cambias esos estilos, el rollo cambia solo.
3. La letra es la de tu pantalla, no la de 12×24 puntos que trae quemada la
   máquina. Las **columnas sí son las reales** (42 en 80 mm, 32 en 58 mm):
   si algo no entra en la línea, acá tampoco entra.

---

## Archivos

```
emulador/
  impresora.py   el servidor de impresión: dos puertos crudos + el visor
  escpos.py      el intérprete de ESC/POS (no imprime: entiende)
  rollo.html     el visor, con un rollo por impresora
  rollo.css      su estilo; el del ticket sale de assets/app.css
  rollo.js       dibuja el papel y habla con el servidor
  probar.py      tickets de ejemplo, acá o a impresoras reales
  capturas/      bytes crudos, solo si arrancas con --guardar
```

Del lado del sistema, el enganche está en `assets/print.js`: cada ticket
sabe a cuál de las dos ticketeras va (`'cocina'` o `'caja'`), y si hay
servidor de impresión se le manda; si no, sale por `window.print()` como
siempre.
