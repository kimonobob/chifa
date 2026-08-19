# Chifa Cuatro Dragones · sistema de salón, cocina y caja

Tres pantallas conectadas para un chifa que canta la carta por número.
Trae cargada la carta real —los 154 códigos impresos más las bebidas— y el
plano del salón. Todo funciona en el navegador, sin instalar nada y sin
internet.

| Pantalla | Archivo | Para quién |
|---|---|---|
| Mozo | `mozo.html` | Marca el código, elige mesa, manda a cocina |
| Cocina | `cocina.html` | Ve las comandas e imprime |
| Caja | `caja.html` | Cobra, vende bebidas, cierra el día |
| Admin | `admin.html` | Reportes del dueño y alta de gente (se entra por la puerta del local) |

`index.html` es la portada con las tres opciones y un resumen en vivo. Entra
completa **en una sola pantalla, sin scroll**, tanto en monitor como en celular.

Las cuatro pantallas llevan la misma identidad —laca roja, oro y crema, sobre
el diseño hecho en Claude Design—. Lo que no cambió es la **disposición** de
las pantallas de trabajo: los tamaños y las distancias están medidos para una
tablet en la mano y para un monitor de cocina que se lee a dos metros.

## El dragón

Va en `assets/dragon.png`, y ocupa el 40 % derecho de la portada. Esa franja
está reservada: el texto nunca se mete ahí. En celular pasa al fondo, atenuado,
para no estorbar la lectura.

Si lo cambias por otro dibujo, **déjalo liviano**. El original venía a 2000×2000
y pesaba 1,7 MB; recortado, reducido a 1100 px y con paleta de 256 colores
quedó en 103 KB —94 % menos— sin diferencia apreciable a simple vista. Una
portada que tarda en abrir en la tablet es una portada que estorba.

Si no está el archivo, en su lugar sale un sello 龍 y el resto se ve igual.

## Los locales

El sistema trabaja por local. Al abrirlo pregunta **en cuál se va a trabajar** y
pide su código; a partir de ahí, las mesas, los pedidos y la caja de ese local
van por separado de los demás.

Vienen tres espacios: **Jr. Lima** ya configurado (código `1111`) y dos libres.
Para abrir otro local, edita `SEDES` en [assets/data.js](assets/data.js) — ponle
nombre y código, y cámbiale `abierta` a `true`.

> El código sirve para no entrar al local equivocado, **no es una contraseña de
> seguridad**: está en un archivo que cualquiera puede abrir. Si hace falta
> seguridad de verdad, tiene que vivir en un servidor.

Para cambiar de local está **Cambiar de local**, arriba a la derecha en la
portada.

### Qué está pendiente

El pie de la portada dice, en vivo, **qué mesas están esperando y desde hace
cuántos minutos**, y cuáles ya tienen platos listos para servir. Sirve para ver
de un vistazo, desde cualquier equipo del local, si hay que mandar otro mozo al
salón.

## Quién entra: cuentas y puestos

Elegido el local, el sistema pregunta **quién entra**. Cada persona tiene su
nombre y su PIN, y ve solo lo suyo: el mozo entra a atender mesas y no le
aparecen la caja, los reportes ni cuánto factura el chifa.

| Puesto | Salón | Cocina | Caja | Admin | Ve el dinero |
|---|---|---|---|---|---|
| **Dueño** | sí | sí | sí | sí | sí |
| **Caja** | sí | sí | sí | — | sí |
| **Cocina** | — | sí | — | — | — |
| **Mozo** | sí | — | — | — | — |

Escribir la dirección a mano tampoco sirve: quien abra `caja.html` sin el
puesto que toca sale rebotado a la portada.

### La primera vez

El chifa recién instalado **no pide nada**: se sigue trabajando igual, para no
dejar a nadie fuera por una cuenta que todavía no existe. Para empezar a
separar oficios, en el panel de locales está el botón **Admin · soy el dueño**:
la primera vez crea la cuenta del dueño, y a partir de ahí ya se puede dar de
alta al resto desde el panel.

### Si se pierde el PIN del dueño

El PIN está cifrado y **no hay forma de recuperarlo**. Para esos casos, en la
puerta de *¿Quién entra?* hay abajo un **¿Perdiste el PIN del dueño?**: pide el
**código del local** (el mismo que ya hizo falta para llegar ahí) y borra
**todas las cuentas**, dejando el local como recién instalado para volver a
crear la del dueño.

**No toca los pedidos, las ventas ni la carta** — solo las cuentas. El código
del local no protege gran cosa, y no pretende hacerlo; pero evita que se borre
el equipo entero de un toque por curiosidad.

### Qué es esto y qué no

**Separa oficios, no guarda secretos.** El PIN va cifrado (SHA-256 con sal, así
que no se lee de pasada ni delata a quien use el mismo número), pero un PIN de
cuatro cifras se adivina probando, y los datos viven donde cualquier equipo del
chifa pueda leerlos. Sirve para que cada uno haga lo suyo y para saber quién
tomó cada mesa — no para proteger nada de alguien decidido.

## El panel del dueño

`admin.html`. **No aparece entre las pantallas de la portada**: esa zona es
para los tres oficios del salón y nada más. Al panel se entra por el botón
**Admin · soy el dueño**, en la puerta donde se elige el local — se marca el
PIN y lleva derecho ahí.

Sigue el diseño **Panel Admin v2** hecho en Claude Design: lateral fijo con la
navegación y el estado del servicio, y el cuerpo con las cifras. Es la única
pantalla con esa forma, y a propósito — no se usa de pie y con prisa como el
salón, sino sentado y con tiempo.

**Hoy** y **Semana** comparten la misma hoja:

- **Cuatro cifras grandes** con su variación contra el periodo anterior. El
  día se compara con *lo que ayer llevaba a esta misma hora*, no con el día
  entero de ayer: si no, a las 13:00 siempre parecería que el chifa se hunde.
- **La curva** del ingreso, por hora en el día y por día en la semana, con el
  periodo anterior detrás en línea de puntos.
- **Avisos**, todos calculados de datos reales: cocina pasada de tiempo, mesas
  abiertas sin pedir nada, cuentas dormidas o bloqueadas, días que concentran
  la semana, carta demasiado larga. Si no hay nada que revisar, lo dice.
- **Mezcla de carta**: los que más salen y los que no salen, con unidades y
  soles.
- **Rendimiento del salón**: cuánto trajo cada mozo y su ticket promedio.

**Mozos y accesos** trae las cuentas del personal —con su último acceso—, el
alta con PIN de cuatro casillas, y qué ve cada puesto.

Dar de baja a alguien le corta el paso **al instante**, aunque tenga la sesión
abierta en otra tablet y sin que nadie recargue nada.

> El PIN **no se muestra**: está cifrado y no hay forma de leerlo, ni siquiera
> desde acá. Si alguien lo olvida, se le pone uno nuevo desde Editar.

Los gráficos son SVG y barras de CSS, sin librerías: funcionan sin internet y
se leen igual en la tablet que en el monitor de la caja.

## Cómo abrirlo

**Opción rápida:** doble clic en `index.html`.

**Opción recomendada** (un servidor local, para que todo funcione parejo):

```
cd c:\Users\eddy_\OneDrive\Documents\chifaa
python servir.py
```

Y en el navegador: <http://127.0.0.1:8787>

> Usa `servir.py` y no `python -m http.server`. El nuestro le dice al
> navegador que **no guarde nada en caché**. Sin eso, al actualizar el sistema
> el navegador puede seguir usando archivos viejos y el chifa termina
> trabajando con una versión que ya no existe — pasa, y cuesta mucho darse
> cuenta.
>
> Los archivos además llevan un número de versión (`assets/store.js?v=14`). Si
> algún día tocas los archivos a mano, sube ese número en los cuatro `.html`
> para que los navegadores recojan la versión nueva. Y si algo se ve raro tras
> una actualización, recarga con **Ctrl+F5**.

Abre cada pantalla en su propia pestaña o ventana.

## Que todos los equipos vean lo mismo

Sin esto, cada navegador guarda **sus propios datos**: el mozo ve las mesas que
él abrió y la caja las suyas, cada uno en su mundo. Para que la tablet del
salón, la cocina y la caja trabajen sobre las mismas mesas, todos los equipos
tienen que apuntar al mismo sitio. Ese sitio es un proyecto de
[Supabase](https://supabase.com) — gratis de sobra para el volumen de un chifa.

**Una sola vez, en el proyecto de Supabase:**

1. Entra a **SQL Editor › New query**.
2. Pega entero el archivo [supabase.sql](supabase.sql) y dale a **Run**. Crea
   las dos tablas que hacen falta. Se puede volver a correr sin miedo.

**En el sistema ya está puesto.** Las claves del proyecto viven en `FIJO`,
arriba de [assets/nube.js](assets/nube.js). Como todos los equipos abren el
sistema desde el mismo sitio, con eso quedan conectados todos de una vez: no
hay que tocar la tablet.

```js
const FIJO = {
  url:   'https://xxxxxxxx.supabase.co',   // Project URL
  clave: 'sb_publishable_…'                // la clave pública
};
```

Si algún día cambia el proyecto, se edita ahí. Y en la portada hay un botón
**Sincronizar** para apuntar **un** equipo a otro sitio, o desconectarlo, sin
tocar lo que usan los demás.

El chip de la barra de la portada dice cómo está:

| Chip | Qué significa |
|---|---|
| **Sincronizado** (verde) | Este equipo ve y comparte las mesas del local |
| **Sin internet** (ámbar) | Se sigue trabajando acá; lo hecho sube al volver |
| **Sin sincronizar** (apagado) | Este equipo guarda solo lo suyo |

### Si se cae el internet

**El chifa no deja de atender.** Cada equipo sigue tomando pedidos y cobrando
contra su copia local, anota que tiene cosas sin subir y las manda apenas
vuelve la conexión — aunque la tablet se haya reiniciado mientras tanto. Al
reconectar, lo de un equipo y lo del otro **se juntan**: no se pisan.

Lo que sí pasa mientras no hay internet es que los equipos no se ven entre
ellos, así que conviene que en ese rato una sola persona tome los pedidos de
una misma mesa.

### Sobre la clave

La clave `anon` viaja dentro de la página, así que **cualquiera que abra el
sistema puede verla**: es pública por diseño, no es una contraseña. Quien tenga
la URL y esa clave puede leer y escribir los pedidos del chifa. Para el salón
de un restaurante alcanza; si algún día hace falta seguridad de verdad, se pone
Supabase Auth con un usuario por local y se cambian las reglas del `.sql` por
`to authenticated`.

---

## 1 · Mozo

Pensado para tablet. Tiene dos pantallas: el **croquis del salón** y, al tocar
una mesa, la de **pedido**.

### Croquis del salón

Lo primero que se ve, antes de elegir ningún plato: el plano del local con las
10 mesas en su sitio real, cada una con **su número al centro**, más Cocina,
Barra y Entrada de referencia. Llevar y Barra van en una fila aparte.

```
        ┌─────────────────────────┐
        │  COCINA                 │
        │        ┌──┐   │   ┌──┐  │
        │        │ 8│   │   │ 7│  │
        │        ├──┤   │   ├──┤  │
        │        │ 9│   │   │ 6│  │  B
        │        └──┘   │   ├──┤  │  A
        │  ┌──┐         │   │ 5│  │  R
        │  │10│         │   ├──┤  │  R
        │  └──┘         │   │ 4│  │  A
        │               │   ├──┤  │
        │               │   │ 3│  │
        │  ┌──┐         │   ├──┤  │
        │  │ 1│         │   │ 2│  │
        │  └──┘         │   └──┘  │
        │  ENTRADA   pasillo      │
        └─────────────────────────┘
```

Si mueves una mesa en el local, cambia su `col`/`fil` en `PLANO_MESAS`, dentro
de [assets/data.js](assets/data.js).

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

### Cómo trabaja hoy el chifa: con papel

La cocina no mira pantalla, mira comandas impresas. Por eso **la comanda sale
por la impresora en cuanto se manda el pedido**, sin que nadie tenga que
apretar nada.

### El papel sale en la cocina, no en la tablet del mozo

La ticketera está enchufada a **un solo equipo**: el de la cocina. Así que es
ese el que saca las comandas. Al mozo no se le abre ningún diálogo de impresión
en la tablet: él manda el pedido y sigue atendiendo.

Qué equipo tiene la ticketera se elige en **Cocina › Ajustes › Este equipo**, y
es una preferencia **de ese equipo**, no del chifa entero: no se contagia a las
demás pantallas. De fábrica viene prendida solo en la pantalla de cocina.

Si el chifa trabaja todo en una sola computadora y quieres que el papel salga
desde el panel del mozo, ábrelo una vez con `mozo.html?impresora=si` y queda
así. Con `?impresora=no` se apaga.

**Si la pantalla de cocina está cerrada**, el mozo ve el aviso *«la comanda no
se imprimió todavía»* en vez de creer que el papel ya está en la cocina. El
pedido no se pierde: queda marcado como pendiente y **sale apenas se abra la
pantalla de cocina**. Recargarla no reimprime nada que ya haya salido.

> Hoy las pantallas se hablan por el navegador del mismo equipo. Para que la
> tablet del mozo llegue a la computadora de la cocina hace falta el servidor
> compartido (ver *Lo que este sistema todavía no hace*).

### Las bebidas no van a cocina

Infusiones, jarras y limonadas, gaseosas y aguas, cervezas, cócteles y vinos
**no se mandan a cocina ni se imprimen**: no hay nada que preparar. Se suman a
la cuenta y las sirve el mozo.

Da igual cómo se pidan. Si el mozo manda una ronda con dos platos y dos
gaseosas, el sistema la parte solo: los platos salen en la comanda, las
gaseosas se van derecho a la cuenta. Y una ronda de puras bebidas no gasta
papel. En el panel del pedido esas líneas se ven marcadas como
*la lleva el mozo*.

En el ticket, la **mesa y el plato van en letra grande** — la mesa a 46 px y
enmarcada, el código a 30 px, el nombre a 20 px — para leerlos de un vistazo
con el papel sobre la barra y las manos ocupadas.

La impresión automática se apaga o se enciende en *Caja › Ajustes › Comandas de
cocina*.

La pantalla de cocina sigue acá por si algún día la instalan, y no duplica
nada: la comanda impresa ya viene marcada como tal.

### La pantalla, si algún día se usa

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

### Probar sin impresoras: las dos ticketeras emuladas

El chifa imprime en dos máquinas: la **comanda** sale por la ticketera de
la cocina y la **boleta** por la de caja. En `emulador/` están las dos
emuladas, dibujando su rollo de papel en pantalla, y de paso hacen de
**servidor de impresión del local**: reciben los tickets de todos los
equipos y los reparten.

Eso es lo que permite que el mozo mande el pedido desde su tablet y el
papel salga en la cocina — la tablet no imprime, la tablet avisa.

```
python emulador/impresora.py --abrir     en el equipo de las impresoras
python servir.py --red                   el sistema, visible para las tablets
```

Después, en cada equipo, una sola vez, se le dice dónde imprimir con la IP
que muestra el emulador al arrancar:

```
http://192.168.1.41:8787/mozo.html?emulador=192.168.1.41
```

Queda guardado en ese equipo (`?emulador=0` lo apaga; `?emulador=1` si el
servidor está en la misma máquina). Cada papel aparece en su rollo con el
sello de qué pantalla y qué equipo lo mandó.

Los chips del visor apagan el papel, abren la tapa o desconectan **cada
impresora por separado**: así se ve qué hace el sistema cuando la ticketera
falla, que es lo que nunca se prueba. Si el servidor no contesta, el ticket
sale por el navegador del equipo que lo mandó.

> Esto reparte **el papel**, no los datos: la comanda que manda la tablet se
> imprime en la cocina, pero la cuenta sigue viviendo en el navegador de esa
> tablet y no aparece en la pantalla de caja. Para eso hace falta el backend
> que se menciona más abajo.

Las impresoras emuladas escuchan además en los **puertos 9100 y 9101** con
ESC/POS, el protocolo de las ticketeras de red de verdad, por si algún día
el chifa pasa a imprimir directo. Todo está explicado en
[emulador/LEEME.md](emulador/LEEME.md).

## 3 · Caja

- **Cuentas** — todas las mesas abiertas con su total. Las que todavía tienen
  platos en cocina salen marcadas, para no cobrar algo que no salió. Las mesas
  unidas aparecen como una sola cuenta (`3+4`).
- **Pedido para llevar** — se arma igual que en el mozo: **el código manda**
  (se escribe el número, resuelve el plato y su precio, y se agrega con Enter),
  y al lado están el buscador por nombre y la lista completa por categorías,
  para cuando no se acuerdan del número. Con cantidades y notas para cocina.
  Al enviarlo, los platos **van a cocina** y se imprime su comanda; las bebidas
  se suman a la cuenta sin imprimirse. Cada pedido toma su propio número
  (`Llevar 1`, `Llevar 2`…) para que dos que salen a la vez no se mezclen, y
  queda abierto en caja listo para cobrar.
- **Agregar a la cuenta** — grilla de gaseosas, cervezas y jugos de un toque,
  o el código directo. Estas ventas van a la cuenta pero **no** a cocina,
  porque no hay nada que cocinar.
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

La carta vive en [assets/data.js](assets/data.js). Los códigos **1 al 154 son
los mismos que están impresos en la carta**. Las bebidas no van numeradas en la
carta, así que se les asignó códigos del 200 en adelante para que el mozo y la
caja también puedan marcarlas.

| Códigos | Categoría | |
|---|---|---|
| 1–11 | Para empezar | |
| 12–24 | Sopas | |
| 25–35 | Tallarines | |
| 36–54 | Especiales Cuatro Dragones | |
| 55–60 | Chaufas fusión | |
| 61–73 | Chaufas clásicos y aeropuertos | el **61** es chaufa de pollo |
| 74–127 | Fusión de sabores orientales | el **80** es pollo ti pa kay |
| 128–143 | Platos a la plancha | |
| 144–148 | Combos Cuatro Dragones | traen anotado qué incluyen |
| 149–154 | Guarniciones | |
| 201–205 | Infusiones | barra |
| 210–229 | Jarras y limonadas | barra · jarra y media jarra por separado |
| 240–257 | Gaseosas y aguas | barra |
| 270–283 | Cervezas | barra |
| 290–297 | Cócteles y vinos | barra |

Los combos guardan **qué traen**, y eso aparece en la lista del mozo, en la
pantalla de cocina y en la comanda impresa — que es donde de verdad hace falta.

Para cambios del día a día usa **Caja › Ajustes › Carta** — se guarda en el
navegador y no toca el archivo. Para dejar tu carta real como base definitiva,
edita `assets/data.js`.

## Lo que hay que saber antes de usarlo en el local

**Sin sincronizar, cada equipo guarda lo suyo.** Las pantallas se hablan por el
navegador: funcionan juntas en pestañas y ventanas del mismo equipo, pero la
tablet del mozo y la computadora de la caja no se ven entre ellas. Para que
todos vean las mismas mesas hay que conectarlas — ver *Que todos los equipos
vean lo mismo*.

Otras cosas a tener en cuenta:

- Sin sincronizar, los datos viven en el `localStorage` de ese navegador. Si
  borras los datos de navegación, se van. Exporta el CSV al cerrar el día.
- La sincronización necesita internet. Si se cae, cada equipo sigue trabajando
  con lo suyo y sube lo hecho cuando vuelve; pero mientras tanto **no se ven
  entre ellos**, y dos equipos podrían abrir la misma mesa por separado.
- La impresión automática ocurre en el equipo que tiene la ticketera —la
  pantalla de cocina—, así que esa pantalla tiene que estar abierta. Si está
  cerrada, el mozo recibe el aviso y la comanda sale apenas se abra.
- Si abres dos pantallas de cocina con la ticketera prendida en ambas, las dos
  van a imprimir la misma comanda. Apaga *Este equipo* en la que sobre.
- La boleta no es un comprobante electrónico válido ante SUNAT. Para facturación
  electrónica hace falta integrar un proveedor autorizado (OSE/PSE).

## Estructura

```
index.html          portada y resumen en vivo
  assets/portada.css  su identidad (solo la portada)
  assets/dragon.png   la ilustración del dragón — cópiala aquí
mozo.html           pantalla del mozo
cocina.html         pantalla de cocina
caja.html           pantalla de caja
admin.html          panel del dueño: reportes y equipo
supabase.sql        las tablas para sincronizar los equipos — correr una vez
assets/
  data.js           la carta: códigos, nombres, precios, notas rápidas
  nube.js           conexión con Supabase — acá van la URL y la clave
  store.js          estado compartido, cuentas, cobros, sincronización
  print.js          armado de comandas, precuentas, boletas y cierre
  mozo.js           lector de códigos, rueda, teclado, borradores
  cocina.js         tablero, cronómetros, impresión manual/automática
  caja.js           cobro, ventas del día, editor de carta
  admin.js          reportes del dueño y alta de gente
  admin.css         el panel del dueño (no usa app.css: es otra pantalla)
  app.css           diseño de las tres pantallas + formato de ticket 80 mm
servir.py           servidor local, sin caché (--red para las tablets)
emulador/           las dos ticketeras de mentira, para probar
  impresora.py      servidor de impresión del local + visor de los rollos
  escpos.py         intérprete de ESC/POS
  rollo.html/css/js el papel saliendo en pantalla
  probar.py         tickets de ejemplo, acá o a una impresora real
```
