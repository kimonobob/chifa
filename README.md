# Chifaa · sistema de salón, cocina y caja

Tres pantallas conectadas para un chifa que canta la carta por número.
Todo funciona en el navegador, sin instalar nada y sin internet.

| Pantalla | Archivo | Para quién |
|---|---|---|
| Mozo | `mozo.html` | Marca el código, elige mesa, manda a cocina |
| Cocina | `cocina.html` | Ve las comandas e imprime |
| Caja | `caja.html` | Cobra, vende bebidas, cierra el día |

`index.html` es la portada con las tres opciones y un resumen en vivo.

## Cómo abrirlo

**Opción rápida:** doble clic en `index.html`.

**Opción recomendada** (un servidor local, para que todo funcione parejo):

```
cd c:\Users\eddy_\OneDrive\Documents\chifaa
python -m http.server 8787
```

Y en el navegador: <http://127.0.0.1:8787/index.html>

Abre cada pantalla en su propia pestaña o ventana. Se sincronizan al instante.

---

## 1 · Mozo

Pensado para tablet. Tiene dos pantallas: el **croquis del salón** y, al tocar
una mesa, la de **pedido**.

### Croquis del salón

Lo primero que se ve, antes de elegir ningún plato: el plano del local con las
15 mesas, cada una con **su número al centro**, más Cocina, Barra y Entrada de
referencia. Llevar y Barra van en una fila aparte.

> **Delivery no aparece en el mozo**: esos pedidos los toma la caja, que puede
> abrir tanto Delivery como Llevar desde su selector de mesa.

Cada mesa muestra de un vistazo cómo está:

| Color | Qué significa |
|---|---|
| Blanca | Libre |
| Borde dorado | Ocupada — muestra su total y desde qué hora |
| Borde rojo + punto | Tiene platos en cocina |
| Borde verde | Tiene platos listos para servir |

Al tocar una mesa se abre su pedido **con todo lo que ya se le sirvió**: cada
ronda con su hora, su estado y su importe.

### Juntar mesas

**Arrastra el dedo de una mesa a otra y se juntan.** Aparece una línea roja
conectándolas y un chip con el nombre de la cuenta (`3 + 4`). A partir de ahí
comparten una sola cuenta y la caja las cobra juntas.

Se pueden encadenar todas las que quieras: arrastra la 5 hacia la 4 y quedan
`3 + 4 + 5`.

Para separarlas: toca la **✕** del chip en el plano, o el botón **Separar
mesas** dentro del pedido. Al cobrar se sueltan solas.

> Cada plato guarda la mesa donde se pidió, así que al separarlas cada una se
> queda con lo suyo. Por eso la comanda de cocina sigue diciendo la mesa
> concreta a la que hay que llevar el plato, con la unión anotada abajo.

### Tomar el pedido

El código manda. El lector grande muestra el número y resuelve el nombre del
plato mientras escribes. Abajo, la pantalla se divide en dos mitades: el
**teclado numérico a la izquierda** y las **notas de cocina a la derecha**, con
sus botones **Listo** (confirma la nota y cierra el teclado de la tablet) y
**Limpiar**.

**Tres formas de elegir un plato:**

1. **Escribir** el número — teclado en pantalla o el teclado físico.
2. **Deslizar** la rueda de códigos: arrástrala con el dedo o el mouse; el que
   queda en el centro es el seleccionado. También sirve la rueda del mouse
   sobre el lector.
3. **Ver la lista**, con el botón debajo del lector.

### La lista de platos

El botón **Ver lista de platos** abre la carta completa, agrupada por
categoría, con chips para saltar a una categoría concreta.

Arriba hay un buscador que **filtra con cada letra que escribes** y resalta lo
que coincidió. No hace falta escribir la palabra completa ni escribirla igual
que la carta:

| Escribes | Encuentra |
|---|---|
| `tip` | los tres Tipakay |
| `tipacay` | Tipakay, aunque la carta lo escriba con **k** |
| `arros` | Arroz blanco |
| `maracuya` | Maracuyá, sin necesidad de la tilde |
| `pollo brocoli` | Pollo con brócoli — busca por palabras sueltas |
| `6` | todos los códigos que empiezan con 6 |

Se toca el plato y queda marcado en el lector, listo para agregar.

**Atajos de teclado:**

| Tecla | Qué hace |
|---|---|
| `0`–`9` | Marca el código |
| `←` `→` | Código anterior / siguiente |
| `↑` `↓` | Sube o baja la cantidad |
| `F` | Cambia entre regular y familiar |
| `Enter` | Agrega al pedido |
| `Ctrl`+`Enter` | Envía la ronda a cocina |
| `Retroceso` | Borra el último dígito |
| `Esc` | Limpia todo |

Los atajos de teclado están listados al final de la pantalla; en tablet, donde
no hay teclado físico, se ocultan solos.

**Detalles que importan en servicio:**

- Cada mesa guarda su propio pedido a medio hacer. Si la mesa 3 te llama
  mientras armas la de la 7, vuelves al salón, entras a la 3 y no pierdes nada
  — ni si se recarga la página.
- Las notas rápidas (*sin cebolla*, *bien picante*, *para llevar*…) se tocan,
  no se escriben. Se pueden combinar y hay un campo libre para lo demás.
- Los platos con dos tamaños muestran **Regular / Familiar** con su precio.
- Lo que cocina marca como **agotado** le aparece bloqueado al mozo al instante.
- Cuando cocina marca un pedido listo, al mozo le suena una campanilla y le
  avisa qué mesa recoger.
- Se puede quitar un plato de una ronda ya enviada mientras cocina no la haya
  empezado.

## 2 · Cocina

Tiene dos vistas, se cambia con un toque en la barra de arriba.

### Uno por uno

Pensada para que el cocinero no tenga que decidir nada: **el plato que va
ahora se muestra enorme** — el código a pantalla casi completa, el nombre, la
mesa y la nota. El costado va partido en dos: arriba **En cola**, con lo que
falta; abajo **Ya entregados**, con lo que salió y a qué hora. Si se marcó un
plato por error, **Deshacer** lo devuelve a la cola.

**La tecla P pasa al siguiente plato.** Es la misma tecla configurable de la
impresión, y hace lo que corresponde según la vista: en el tablero imprime lo
pendiente, y acá despacha el plato actual y muestra el que sigue. La barra de
arriba dice siempre qué hace. Se cambia con *Cambiar*.

Los platos se cuentan de a uno. Si el mozo manda 3 chaufas, son **tres platos
separados** en la cola, y cada vez que tocas *Plato listo* sale uno solo. La
comanda recién se da por terminada cuando salieron los tres.

Puedes decidir qué se hace primero con **Hacer primero**:

| Opción | Qué hace |
|---|---|
| El que llegó antes | Orden de llegada, el normal |
| El más fácil | Primero lo que menos demora — chaufas, entradas |
| El más demorado | Primero lo pesado, para que vaya avanzando |

Y si quieres saltarte el orden, **toca cualquier plato de la cola** y pasa a
ser el siguiente. *Dejar para después* manda el actual al final.

Los tiempos de cada categoría están en
[assets/data.js](assets/data.js) (`MINUTOS_CATEGORIA`); ajústalos al ritmo de
tu cocina.

Con **Imprimir** sale el papel de ese plato solo, con su código enorme.

### Tablero

Tres columnas: **Entran → Preparado → Listo**.

- Cada comanda muestra mesa, número de pedido, mozo y un **cronómetro**. Pasados
  12 minutos la tarjeta se marca en rojo.
- Toca un plato para tacharlo cuando esté hecho. Toca el encabezado de la
  tarjeta para verla **en grande** (útil si la pantalla está lejos).
- **Agotados** abre la lista de la carta para marcar lo que se acabó.
- En **Ajustes** están el formato del papel, el tamaño de letra, el sonido y
  la pantalla completa — lo que no se toca a cada rato.
- Las bebidas no ensucian la comanda: salen aparte, bajo el rótulo *Barra*, y
  **no se imprimen** en el ticket de cocina.

### Impresión

Dos modos, se cambia con un toque:

- **Automático** — cada pedido se imprime solo, en cuanto entra.
- **Manual** — se imprime al presionar **una tecla que tú eliges**, o el botón
  de cada comanda.

Para cambiar la tecla: toca **Cambiar**, y luego presiona la tecla que quieras
(`P`, `F9`, `Espacio`, la que sea). Queda guardada. Por defecto es `P`.

También eliges el **formato**:

- **Una comanda** — un papel por pedido, con todos los platos.
- **Un papel por plato** — un ticket por platillo, con el número enorme, para
  ir pegándolos en la barra de despacho.

El ticket sale formateado para **ticketera térmica de 80 mm**.

> **Para que imprima sin preguntar nada**, abre Chrome así:
>
> ```
> chrome.exe --kiosk-printing --app=http://127.0.0.1:8787/cocina.html
> ```
>
> Sin esa opción, el navegador siempre muestra el diálogo de impresión antes de
> mandar el papel. No es un problema del sistema: es una protección del
> navegador y no se puede desactivar desde la página.

## 3 · Caja

- **Cuentas** — todas las mesas abiertas con su total. Las que todavía tienen
  platos en cocina salen marcadas, para no cobrar algo que no salió. Las mesas
  unidas aparecen como una sola cuenta (`3+4`).
- **Agregar a la cuenta** — grilla de gaseosas, cervezas y jugos de un toque,
  o el código directo. Estas ventas van a la cuenta pero **no** a cocina.
- **Cobro** — descuento en soles o en porcentaje, medio de pago (Efectivo,
  Yape, Plin, Tarjeta, Transferencia, Cortesía), botones de billetes y cálculo
  de vuelto. No deja cerrar si el efectivo recibido no alcanza.
- **Precuenta** para llevarle a la mesa antes de cobrar; **boleta** al cobrar.
- **Ventas del día** — total, ticket promedio, desglose por medio de pago, los
  más vendidos, reimpresión de cualquier boleta, cierre de caja impreso y
  exportación a CSV (se abre en Excel).
- **Ajustes** — nombre y RUC del negocio, cantidad de mesas, y el **editor de
  la carta**: cambia nombres y precios, marca agotados o agrega códigos nuevos.

---

## Editar la carta

La carta vive en [assets/data.js](assets/data.js) y ya trae 128 códigos con
precios de referencia:

| Códigos | Categoría |
|---|---|
| 1–9 | Sopas |
| 10–19 | Entradas y frituras |
| 20–29 | Tallarines |
| 30–39 | Res |
| 40–49 | Aves |
| 50–59 | Chancho y pato |
| **60–69** | **Chaufas** (el 60 es chaufa de pollo) |
| 70–79 | Mariscos |
| **80–89** | **Especiales** (el 81 es tipakay de pollo) |
| 90–97 | Combinados y guarniciones |
| 98–100 | Postres |
| 101–128 | Bebidas |

Para cambios del día a día usa **Caja › Ajustes › Carta** — se guarda en el
navegador y no toca el archivo. Para dejar tu carta real como base definitiva,
edita `assets/data.js`.

## Lo que hay que saber antes de usarlo en el local

**Las tres pantallas comparten datos por el navegador, no por red.** Funcionan
juntas en pestañas y ventanas del mismo navegador y del mismo equipo. Sirve muy
bien para un equipo con dos o tres monitores: caja al frente, cocina atrás.

**Para tablets del mozo o una pantalla de cocina en otro equipo hace falta un
servidor.** Es el siguiente paso natural: un backend chico (Node + WebSocket +
SQLite) reemplazando `assets/store.js`, sin tocar el resto. Toda la lógica de
datos está aislada en ese archivo justamente para eso.

Otras cosas a tener en cuenta:

- Los datos viven en el `localStorage` de ese navegador. Si borras los datos de
  navegación, se van. Exporta el CSV al cerrar el día.
- La impresión automática solo ocurre con la pantalla de cocina abierta: es ella
  la que manda a imprimir.
- Si abres dos pantallas de cocina, las dos van a imprimir la misma comanda.
- La boleta no es un comprobante electrónico válido ante SUNAT. Para facturación
  electrónica hace falta integrar un proveedor autorizado (OSE/PSE).

## Estructura

```
index.html          portada y resumen en vivo
mozo.html           pantalla del mozo
cocina.html         pantalla de cocina
caja.html           pantalla de caja
assets/
  data.js           la carta: códigos, nombres, precios, notas rápidas
  store.js          estado compartido, cuentas, cobros, sincronización
  print.js          armado de comandas, precuentas, boletas y cierre
  mozo.js           lector de códigos, rueda, teclado, borradores
  cocina.js         tablero, cronómetros, impresión manual/automática
  caja.js           cobro, ventas del día, editor de carta
  app.css           diseño de las tres pantallas + formato de ticket 80 mm
```
