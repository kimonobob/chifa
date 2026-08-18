/* ══════════════════════════════════════════════════════════════════════════
   CARTA · CHIFA CUATRO DRAGONES
   Los códigos 1–154 son los mismos que están impresos en la carta.
   Las bebidas no van numeradas en la carta impresa, así que se les asignó
   códigos del 200 en adelante para que el mozo también pueda marcarlas.

   c  = código        n = nombre         p = precio
   d  = qué trae (se le muestra a la cocina; útil en combos)
   cat= categoría     bar = sale de barra, no de cocina
   pf = precio de la versión familiar, si el plato tuviera dos tamaños

   Todo esto se puede editar sin tocar el archivo desde
   Caja › Ajustes › Carta.
   ═══════════════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════════════════
   LOCALES
   Cada local trabaja en su propio espacio: sus mesas, sus pedidos y su caja
   van por separado, aunque compartan la misma carta. Para entrar se marca
   el código del local.

   Para abrir un local nuevo: ponle nombre y código, y cámbiale `abierta` a
   true. Los códigos se editan acá, en este archivo.

   Ojo: el código sirve para no entrar al local equivocado, no es una
   contraseña de seguridad — cualquiera que abra este archivo lo ve.
   ═══════════════════════════════════════════════════════════════════════ */
const SEDES = [
  { id: 'lima',   nombre: 'Jr. Lima',  direccion: '', codigo: '1111', abierta: true  },
  { id: 'local2', nombre: 'Local 2',   direccion: '', codigo: '2222', abierta: false },
  { id: 'local3', nombre: 'Local 3',   direccion: '', codigo: '3333', abierta: false }
];

const CATEGORIAS = [
  { id: 'empezar',      nombre: 'Para empezar',       rango: '1–11' },
  { id: 'sopas',        nombre: 'Sopas',              rango: '12–24' },
  { id: 'tallarines',   nombre: 'Tallarines',         rango: '25–35' },
  { id: 'especiales',   nombre: 'Especiales',         rango: '36–54' },
  { id: 'chaufafusion', nombre: 'Chaufas fusión',     rango: '55–60' },
  { id: 'chaufas',      nombre: 'Chaufas clásicos',   rango: '61–73' },
  { id: 'fusion',       nombre: 'Sabores orientales', rango: '74–127' },
  { id: 'plancha',      nombre: 'A la plancha',       rango: '128–143' },
  { id: 'combos',       nombre: 'Combos',             rango: '144–148' },
  { id: 'guarniciones', nombre: 'Guarniciones',       rango: '149–154' },
  { id: 'infusiones',   nombre: 'Infusiones',         rango: '201+' },
  { id: 'jarras',       nombre: 'Jarras y limonadas', rango: '210+' },
  { id: 'gaseosas',     nombre: 'Gaseosas y aguas',   rango: '240+' },
  { id: 'cervezas',     nombre: 'Cervezas',           rango: '270+' },
  { id: 'cocteles',     nombre: 'Cócteles y vinos',   rango: '290+' }
];

const CARTA_BASE = [
  // ── Para empezar ─────────────────────────────────────────────────────────
  { c: 1,  n: 'Alitas al sillao',                            p: 16,   cat: 'empezar' },
  { c: 2,  n: 'Sumai (3 unidades)',                          p: 8,    cat: 'empezar' },
  { c: 3,  n: 'Siu kau frito (6 unidades)',                  p: 14,   cat: 'empezar' },
  { c: 4,  n: 'Chancho asado 1/4',                           p: 17,   cat: 'empezar' },
  { c: 5,  n: 'Gallina pac chi kay 1/4',                     p: 18,   cat: 'empezar' },
  { c: 6,  n: 'Costillas de cerdo en aromas orientales 1/4', p: 20,   cat: 'empezar' },
  { c: 7,  n: 'Min pao (1 unidad)',                          p: 4.5,  cat: 'empezar' },
  { c: 8,  n: 'Sumai 1/2 docena',                            p: 16,   cat: 'empezar' },
  { c: 9,  n: 'Docena de wantanes rellenos especial',        p: 14,   cat: 'empezar' },
  { c: 10, n: '1/2 docena de wantanes rellenos especial',    p: 7,    cat: 'empezar' },
  { c: 11, n: 'Alitas rellenas al estilo oriental',          p: 20,   cat: 'empezar' },

  // ── Sopas ────────────────────────────────────────────────────────────────
  { c: 12, n: 'Sopa sahofan picante de chancho',   p: 24, cat: 'sopas' },
  { c: 13, n: 'Sopa sahofan picante de pollo',     p: 23, cat: 'sopas' },
  { c: 14, n: 'Sopa sui kau (pollo)',              p: 20, cat: 'sopas' },
  { c: 15, n: 'Sopa sui kau especial',             p: 22, cat: 'sopas' },
  { c: 16, n: 'Sopa de arroz con filete de pollo', p: 20, cat: 'sopas' },
  { c: 17, n: 'Sopa de arroz con chancho asado',   p: 21, cat: 'sopas' },
  { c: 18, n: 'Sopa wantán',                       p: 14, cat: 'sopas' },
  { c: 19, n: 'Sopa fuchifú',                      p: 14, cat: 'sopas' },
  { c: 20, n: 'Sopa womin',                        p: 14, cat: 'sopas' },
  { c: 21, n: 'Sopa pac pow',                      p: 16, cat: 'sopas' },
  { c: 22, n: 'Sopa ramen',                        p: 21, cat: 'sopas' },
  { c: 23, n: 'Sopa wantán especial',              p: 21, cat: 'sopas' },
  { c: 24, n: 'Sopa de los 8 tesoros',             p: 23, cat: 'sopas' },

  // ── Tallarines ───────────────────────────────────────────────────────────
  { c: 25, n: 'Tallarín con chancho asado al horno', p: 23, cat: 'tallarines' },
  { c: 26, n: 'Tallarín con 7 esferas',              p: 23, cat: 'tallarines' },
  { c: 27, n: 'Tallarín con carne',                  p: 23, cat: 'tallarines' },
  { c: 28, n: 'Tallarín con langostino',             p: 26, cat: 'tallarines' },
  { c: 29, n: 'Tallarín especial',                   p: 29, cat: 'tallarines',
    d: 'Chancho, pollo y langostinos' },
  { c: 30, n: 'Tallarín taypa',                      p: 33, cat: 'tallarines',
    d: 'Chancho, pollo, langostinos y huevo de codorniz' },
  { c: 31, n: 'Tallarín con cordero (oriental)',     p: 25, cat: 'tallarines' },
  { c: 32, n: 'Tallarín especial de la casa',        p: 33, cat: 'tallarines',
    d: 'Chancho, pollo, langostino y cordero' },
  { c: 33, n: 'Tallarín con pollo y chaufa de pollo',   p: 19, cat: 'tallarines' },
  { c: 34, n: 'Tallarín con carne y chaufa de pollo',   p: 21, cat: 'tallarines' },
  { c: 35, n: 'Tallarín con chancho y chaufa de pollo', p: 21, cat: 'tallarines' },

  // ── Especiales Cuatro Dragones ───────────────────────────────────────────
  { c: 36, n: 'Lou min con chancho asado al horno',    p: 25, cat: 'especiales' },
  { c: 37, n: 'Lou min con hongos salteados',          p: 26, cat: 'especiales' },
  { c: 38, n: 'Sahofan con carne de res',              p: 30, cat: 'especiales' },
  { c: 39, n: 'Sahofan al curry con pollo',            p: 32, cat: 'especiales' },
  { c: 40, n: 'Sahofan salteado con chancho al horno', p: 32, cat: 'especiales' },
  { c: 41, n: 'Taufu salteado con verduras y dos hongos', p: 26, cat: 'especiales' },
  { c: 42, n: 'Fansi salteado con chancho',            p: 28, cat: 'especiales', d: 'Fideo de arroz' },
  { c: 43, n: 'Fansi salteado con pollo',              p: 26, cat: 'especiales', d: 'Fideo de arroz' },
  { c: 44, n: 'Fansi especial',                        p: 30, cat: 'especiales',
    d: 'Fideo de arroz · chancho, pollo y langostino' },
  { c: 45, n: 'Cordero al curry',                      p: 34, cat: 'especiales',
    d: 'Huevo de codorniz y champiñones' },
  { c: 46, n: 'Chancho al ajo',                        p: 24, cat: 'especiales' },
  { c: 47, n: 'Pollo en trozos con dos hongos',        p: 23, cat: 'especiales' },
  { c: 48, n: 'Vainita salteada con chancho asado al horno', p: 24, cat: 'especiales' },
  { c: 49, n: 'Vainita salteada con carne',            p: 24, cat: 'especiales' },
  { c: 50, n: 'Vainita salteada con cordero',          p: 30, cat: 'especiales' },
  { c: 51, n: 'Vainita salteada con pollo',            p: 23, cat: 'especiales' },
  { c: 52, n: 'Alitas BBQ',                            p: 23, cat: 'especiales' },
  { c: 53, n: 'Trucha con verduras y champiñones',     p: 25, cat: 'especiales' },
  { c: 54, n: 'Trucha en salsa blanca',                p: 23, cat: 'especiales' },

  // ── Chaufas fusión ───────────────────────────────────────────────────────
  { c: 55, n: 'Chaufa siete esferas',              p: 20, cat: 'chaufafusion' },
  { c: 56, n: 'Chaufa tropical',                   p: 20, cat: 'chaufafusion' },
  { c: 57, n: 'Chaufa con cordero',                p: 24, cat: 'chaufafusion' },
  { c: 58, n: 'Chaufa con alpaca',                 p: 24, cat: 'chaufafusion' },
  { c: 59, n: 'Chaufa Cuatro Dragones',            p: 21, cat: 'chaufafusion' },
  { c: 60, n: 'Chaufa con chancho asado al horno', p: 17, cat: 'chaufafusion' },

  // ── Chaufas clásicos y aeropuertos ───────────────────────────────────────
  { c: 61, n: 'Chaufa de pollo',                       p: 14, cat: 'chaufas' },
  { c: 62, n: 'Chaufa de carne',                       p: 16, cat: 'chaufas' },
  { c: 63, n: 'Chaufa de langostinos',                 p: 20, cat: 'chaufas' },
  { c: 64, n: 'Chaufa vegetariano',                    p: 18, cat: 'chaufas' },
  { c: 65, n: 'Chaufa de mariscos',                    p: 26, cat: 'chaufas' },
  { c: 66, n: 'Chaufa especial',                       p: 21, cat: 'chaufas' },
  { c: 67, n: 'Aeropuerto de pollo',                   p: 16, cat: 'chaufas' },
  { c: 68, n: 'Aeropuerto de chancho asado al horno',  p: 20, cat: 'chaufas' },
  { c: 69, n: 'Aeropuerto de carne',                   p: 20, cat: 'chaufas' },
  { c: 70, n: 'Aeropuerto de langostinos',             p: 22, cat: 'chaufas' },
  { c: 71, n: 'Aeropuerto vegetariano',                p: 20, cat: 'chaufas' },
  { c: 72, n: 'Aeropuerto Cuatro Dragones',            p: 22, cat: 'chaufas' },
  { c: 73, n: 'Aeropuerto especial',                   p: 22, cat: 'chaufas' },

  // ── Fusión de sabores orientales ─────────────────────────────────────────
  { c: 74,  n: 'Costillas de cerdo en salsa agridulce',   p: 24, cat: 'fusion' },
  { c: 75,  n: 'Costillas de cerdo en salsa de maracuyá', p: 24, cat: 'fusion' },
  { c: 76,  n: 'Costillas de cerdo en salsa limón',       p: 24, cat: 'fusion' },
  { c: 77,  n: 'Costillas de cerdo en salsa de naranja',  p: 24, cat: 'fusion' },
  { c: 78,  n: 'Costillas de cerdo en salsa oriental',    p: 24, cat: 'fusion' },
  { c: 79,  n: 'Pollo 5 sabores',                         p: 24, cat: 'fusion' },
  { c: 80,  n: 'Pollo ti pa kay',                         p: 24, cat: 'fusion' },
  { c: 81,  n: 'Kam lu wantán',                           p: 24, cat: 'fusion' },
  { c: 82,  n: 'Pollo chi jau kay especial',              p: 24, cat: 'fusion' },
  { c: 83,  n: 'Pollo en salsa de naranja',               p: 24, cat: 'fusion' },
  { c: 84,  n: 'Pollo enrollado en salsa blanca',         p: 24, cat: 'fusion' },
  { c: 85,  n: 'Pollo enrollado en salsa agridulce',      p: 24, cat: 'fusion' },
  { c: 86,  n: 'Pollo enrollado en salsa oriental',       p: 24, cat: 'fusion' },
  { c: 87,  n: 'Pollo en trozos con piña',                p: 24, cat: 'fusion' },
  { c: 88,  n: 'Pollo en trozos con durazno',             p: 24, cat: 'fusion' },
  { c: 89,  n: 'Pollo limón kay',                         p: 24, cat: 'fusion' },
  { c: 90,  n: 'Chaufa de pollo con verduras y pollo',    p: 18, cat: 'fusion' },
  { c: 91,  n: 'Chaufa de pollo con verduras y carne',    p: 20, cat: 'fusion' },
  { c: 92,  n: 'Chaufa de pollo con verduras y chancho',  p: 20, cat: 'fusion' },
  { c: 93,  n: 'Chaufa de pollo con tortilla de pollo',       p: 20, cat: 'fusion' },
  { c: 94,  n: 'Chaufa de chancho con tortilla de pollo',     p: 20, cat: 'fusion' },
  { c: 95,  n: 'Chaufa de carne con tortilla de pollo',       p: 20, cat: 'fusion' },
  { c: 96,  n: 'Chaufa de langostinos con tortilla de pollo', p: 24, cat: 'fusion' },
  { c: 97,  n: 'Chancho asado al horno con piña',         p: 24, cat: 'fusion' },
  { c: 98,  n: 'Chancho asado al horno con durazno',      p: 24, cat: 'fusion' },
  { c: 99,  n: 'Chancho asado al horno con tamarindo',    p: 24, cat: 'fusion' },
  { c: 100, n: 'Chancho asado al horno con maracuyá',     p: 24, cat: 'fusion' },
  { c: 101, n: 'Pollo en trozos con verduras y champiñones', p: 24, cat: 'fusion' },
  { c: 102, n: 'Pollo en trozos con hongos fungí',        p: 24, cat: 'fusion' },
  { c: 103, n: 'Pollo con verdura al curry',              p: 23, cat: 'fusion' },
  { c: 104, n: 'Chicharrón de pollo en salsa de limón y canela china', p: 24, cat: 'fusion' },
  { c: 105, n: 'Chancho asado al horno con verduras y champiñones',    p: 24, cat: 'fusion' },
  { c: 106, n: 'Chancho asado al horno con verduras al curry',         p: 24, cat: 'fusion' },
  { c: 107, n: 'Carne con verduras y champiñones',        p: 24, cat: 'fusion' },
  { c: 108, n: 'Alitas broster de pollo con arroz chaufa de pollo',  p: 23, cat: 'fusion' },
  { c: 109, n: 'Alitas picantes de pollo con arroz chaufa de pollo', p: 24, cat: 'fusion' },
  { c: 110, n: 'Alitas de pollo en salsa blanca',         p: 23, cat: 'fusion' },
  { c: 111, n: 'Alitas de pollo en salsa agridulce',      p: 23, cat: 'fusion' },
  { c: 112, n: 'Alitas de pollo con tausí',               p: 23, cat: 'fusion' },
  { c: 113, n: 'Alitas de pollo en salsa oriental',       p: 23, cat: 'fusion' },
  { c: 114, n: 'Alitas de pollo en salsa de naranja',     p: 23, cat: 'fusion' },
  { c: 115, n: 'Pierna crocante de pollo con chaufa de pollo',    p: 23, cat: 'fusion' },
  { c: 116, n: 'Pierna crocante de pollo en salsa blanca',        p: 23, cat: 'fusion' },
  { c: 117, n: 'Pierna crocante de pollo en salsa agridulce',     p: 24, cat: 'fusion' },
  { c: 118, n: 'Pierna crocante de pollo en salsa oriental',      p: 24, cat: 'fusion' },
  { c: 119, n: 'Pierna crocante de pollo en salsa de maracuyá',   p: 24, cat: 'fusion' },
  { c: 120, n: 'Pierna crocante de pollo en salsa de naranja',    p: 24, cat: 'fusion' },
  { c: 121, n: 'Pollo saltado',                           p: 25, cat: 'fusion' },
  { c: 122, n: 'Chancho saltado',                         p: 27, cat: 'fusion' },
  { c: 123, n: 'Lomo saltado',                            p: 27, cat: 'fusion' },
  { c: 124, n: 'Pollo en trozos con champiñones',         p: 23, cat: 'fusion' },
  { c: 125, n: 'Chancho asado al horno con frutas de temporada', p: 23, cat: 'fusion' },
  { c: 126, n: 'Chicharrón de langostinos',               p: 27, cat: 'fusion' },
  { c: 127, n: 'Chancho asado al horno con almendras',    p: 30, cat: 'fusion' },

  // ── Platos a la plancha ──────────────────────────────────────────────────
  { c: 128, n: 'Plancha taipá especial',              p: 38, cat: 'plancha' },
  { c: 129, n: 'Pollo en trozos con fungí (hongos)',  p: 33, cat: 'plancha' },
  { c: 130, n: 'Carne con verduras',                  p: 33, cat: 'plancha' },
  { c: 131, n: 'Carne con fungí',                     p: 33, cat: 'plancha' },
  { c: 132, n: 'Trucha con verduras',                 p: 33, cat: 'plancha' },
  { c: 133, n: 'Trucha con fungí (hongos)',           p: 33, cat: 'plancha' },
  { c: 134, n: 'Trucha con verduras al vapor',        p: 33, cat: 'plancha' },
  { c: 135, n: 'Chancho asado con fungí',             p: 33, cat: 'plancha' },
  { c: 136, n: 'Pollo en trozos al vapor',            p: 33, cat: 'plancha' },
  { c: 137, n: 'Carne con verduras al vapor',         p: 35, cat: 'plancha' },
  { c: 138, n: 'Taipá especial',                      p: 35, cat: 'plancha' },
  { c: 139, n: 'Tallarín samsi especial',             p: 36, cat: 'plancha' },
  { c: 140, n: 'Canasta de fideos con taipá',         p: 35, cat: 'plancha' },
  { c: 141, n: 'Canasta de fideos con costillas agridulce',       p: 37, cat: 'plancha' },
  { c: 142, n: 'Canasta de fideos con costillas en salsa oriental', p: 37, cat: 'plancha' },
  { c: 143, n: 'Canasta de fideos con trucha',        p: 33, cat: 'plancha' },

  // ── Combos Cuatro Dragones ───────────────────────────────────────────────
  { c: 144, n: 'Para 2 Dragones', p: 55, cat: 'combos',
    d: 'Sopa wantán + tallarín con pollo + chaufa de pollo + 1/2 jarra de limonada' },
  { c: 145, n: 'Para 3 Dragones', p: 90, cat: 'combos',
    d: 'Sopa wantán + 1/2 docena de wantán + chaufa de pollo + plancha de pollo en trozos + jarra de limonada' },
  { c: 146, n: 'Para 4 Dragones', p: 110, cat: 'combos',
    d: 'Sopa wantán + aeropuerto de pollo + kam lu wantán + tallarín con verduras y pollo + jarra de limonada' },
  { c: 147, n: 'Para 6 Dragones', p: 200, cat: 'combos',
    d: 'Sopa wantán o 1 docena de wantanes + chaufa especial + tallarín taipá + tipakay + costillas de cerdo oriental + jarra de limonada' },
  { c: 148, n: 'Para 8 Dragones', p: 300, cat: 'combos',
    d: 'Sopa siu kay + aeropuerto especial + plancha taipá + costillas agridulce u oriental + tallarines en trozos con verduras + pollo 5 sabores + 2 jarras de limonada' },

  // ── Guarniciones ─────────────────────────────────────────────────────────
  { c: 149, n: 'Porción chaufa adicional',           p: 8,  cat: 'guarniciones' },
  { c: 150, n: 'Porción aeropuerto adicional',       p: 10, cat: 'guarniciones' },
  { c: 151, n: 'Porción de arroz blanco adicional',  p: 7,  cat: 'guarniciones' },
  { c: 152, n: 'Porción de papas fritas',            p: 8,  cat: 'guarniciones' },
  { c: 153, n: 'Sopa wantán (tipo cortesía) adicional', p: 5, cat: 'guarniciones' },
  { c: 154, n: 'Tortilla de pollo adicional',        p: 8,  cat: 'guarniciones' },

  // ══ BARRA ══ (no van numeradas en la carta impresa)
  // ── Infusiones ───────────────────────────────────────────────────────────
  { c: 201, n: 'Infusión (anís, manzanilla, coca, té)', p: 3,   cat: 'infusiones', bar: true },
  { c: 202, n: 'Té verde',                              p: 3.5, cat: 'infusiones', bar: true },
  { c: 203, n: 'Té jazmín',                             p: 3.5, cat: 'infusiones', bar: true },
  { c: 204, n: 'Té piteado',                            p: 10,  cat: 'infusiones', bar: true },
  { c: 205, n: 'Jarra de té o infusión',                p: 12,  cat: 'infusiones', bar: true },

  // ── Jarras y limonadas (jarra entera y media jarra) ──────────────────────
  { c: 210, n: 'Jarra de piña',                     p: 14, cat: 'jarras', bar: true },
  { c: 211, n: 'Media jarra de piña',               p: 7,  cat: 'jarras', bar: true },
  { c: 212, n: 'Jarra limonada natural',            p: 13, cat: 'jarras', bar: true },
  { c: 213, n: 'Media jarra limonada natural',      p: 7,  cat: 'jarras', bar: true },
  { c: 214, n: 'Jarra limonada hierba buena',       p: 14, cat: 'jarras', bar: true },
  { c: 215, n: 'Media jarra limonada hierba buena', p: 7,  cat: 'jarras', bar: true },
  { c: 216, n: 'Jarra maracuyá',                    p: 14, cat: 'jarras', bar: true },
  { c: 217, n: 'Media jarra maracuyá',              p: 7,  cat: 'jarras', bar: true },
  { c: 218, n: 'Jarra chicha morada',               p: 14, cat: 'jarras', bar: true },
  { c: 219, n: 'Media jarra chicha morada',         p: 7,  cat: 'jarras', bar: true },
  { c: 220, n: 'Jarra emoliente',                   p: 14, cat: 'jarras', bar: true },
  { c: 221, n: 'Media jarra emoliente',             p: 7,  cat: 'jarras', bar: true },
  { c: 222, n: 'Jarra limonada frozen',             p: 15, cat: 'jarras', bar: true },
  { c: 223, n: 'Media jarra limonada frozen',       p: 8,  cat: 'jarras', bar: true },
  { c: 224, n: 'Jarra limonada hierbabuena frozen', p: 16, cat: 'jarras', bar: true },
  { c: 225, n: 'Media jarra limonada hierbabuena frozen', p: 8, cat: 'jarras', bar: true },
  { c: 226, n: 'Jarra maracuyá frozen',             p: 15, cat: 'jarras', bar: true },
  { c: 227, n: 'Media jarra maracuyá frozen',       p: 8,  cat: 'jarras', bar: true },
  { c: 228, n: 'Jarra chicha morada frozen',        p: 15, cat: 'jarras', bar: true },
  { c: 229, n: 'Media jarra chicha morada frozen',  p: 8,  cat: 'jarras', bar: true },

  // ── Gaseosas y aguas ─────────────────────────────────────────────────────
  { c: 240, n: 'Coca Cola 2.5 L',        p: 13, cat: 'gaseosas', bar: true },
  { c: 241, n: 'Inca Kola 2.5 L',        p: 13, cat: 'gaseosas', bar: true },
  { c: 242, n: 'Coca Cola 1.5 L',        p: 10, cat: 'gaseosas', bar: true },
  { c: 243, n: 'Inca Kola 1.5 L',        p: 10, cat: 'gaseosas', bar: true },
  { c: 244, n: 'Coca Cola 1 L',          p: 8,  cat: 'gaseosas', bar: true },
  { c: 245, n: 'Inca Kola 1 L',          p: 8,  cat: 'gaseosas', bar: true },
  { c: 246, n: 'Coca Cola 600 ml',       p: 5,  cat: 'gaseosas', bar: true },
  { c: 247, n: 'Inca Kola 600 ml',       p: 5,  cat: 'gaseosas', bar: true },
  { c: 248, n: 'Coca Cola personal',     p: 3,  cat: 'gaseosas', bar: true },
  { c: 249, n: 'Inca Kola personal',     p: 3,  cat: 'gaseosas', bar: true },
  { c: 250, n: 'Fanta personal',         p: 3,  cat: 'gaseosas', bar: true },
  { c: 251, n: 'Fanta 500 ml',           p: 5,  cat: 'gaseosas', bar: true },
  { c: 252, n: 'Kola Escocesa 600 ml',   p: 5,  cat: 'gaseosas', bar: true },
  { c: 253, n: 'Kola Escocesa 1.5 L',    p: 10, cat: 'gaseosas', bar: true },
  { c: 254, n: 'Kola Escocesa 2 L',      p: 14, cat: 'gaseosas', bar: true },
  { c: 255, n: 'Agua mineral',           p: 3,  cat: 'gaseosas', bar: true },
  { c: 256, n: 'Bio Aloe Vera',          p: 9,  cat: 'gaseosas', bar: true },
  { c: 257, n: 'Free Tea',               p: 7,  cat: 'gaseosas', bar: true },

  // ── Cervezas ─────────────────────────────────────────────────────────────
  { c: 270, n: 'Heineken',                     p: 10, cat: 'cervezas', bar: true },
  { c: 271, n: 'Coronita 210 ml',              p: 8,  cat: 'cervezas', bar: true },
  { c: 272, n: 'Corona Extra 330 ml',          p: 10, cat: 'cervezas', bar: true },
  { c: 273, n: 'Stella Artois 330 ml',         p: 10, cat: 'cervezas', bar: true },
  { c: 274, n: 'Cusqueña Dorada 310 ml',       p: 10, cat: 'cervezas', bar: true },
  { c: 275, n: 'Cusqueña Negra 310 ml',        p: 10, cat: 'cervezas', bar: true },
  { c: 276, n: 'Cusqueña Doble Malta 310 ml',  p: 10, cat: 'cervezas', bar: true },
  { c: 277, n: 'Cusqueña Trigo 310 ml',        p: 10, cat: 'cervezas', bar: true },
  { c: 278, n: 'Pilsen Callao 305 ml',         p: 10, cat: 'cervezas', bar: true },
  { c: 279, n: 'Cusqueña Dorada 620 ml',       p: 14, cat: 'cervezas', bar: true },
  { c: 280, n: 'Cusqueña Negra 620 ml',        p: 14, cat: 'cervezas', bar: true },
  { c: 281, n: 'Cusqueña Doble Malta 620 ml',  p: 14, cat: 'cervezas', bar: true },
  { c: 282, n: 'Cusqueña Trigo 620 ml',        p: 14, cat: 'cervezas', bar: true },
  { c: 283, n: 'Pilsen Callao 630 ml',         p: 14, cat: 'cervezas', bar: true },

  // ── Cócteles y vinos ─────────────────────────────────────────────────────
  { c: 290, n: 'Pisco sour',                          p: 14, cat: 'cocteles', bar: true },
  { c: 291, n: 'Pisco sour maracuyá',                 p: 14, cat: 'cocteles', bar: true },
  { c: 292, n: 'Chilcano de pisco',                   p: 12, cat: 'cocteles', bar: true },
  { c: 293, n: 'Algarrobina',                         p: 14, cat: 'cocteles', bar: true },
  { c: 294, n: 'Copa de vino semi seco',              p: 10, cat: 'cocteles', bar: true },
  { c: 295, n: 'Vino Santiago Queirolo Borgoña 750 ml', p: 30, cat: 'cocteles', bar: true },
  { c: 296, n: 'Vino Intipalka Malbec 750 ml',        p: 59, cat: 'cocteles', bar: true },
  { c: 297, n: 'Vino Casillero del Diablo 750 ml',    p: 59, cat: 'cocteles', bar: true }
];

/* ══════════════════════════════════════════════════════════════════════════
   PLANO DEL SALÓN
   Reproduce la disposición real: dos hileras con el pasillo al medio.
   col = columna del plano (la 3 es el pasillo), fil = fila.

        col1   col2   ·pasillo·   col4
   fil1          8                  7
   fil2          9                  6
   fil3   10                        5
   fil4                             4
   fil5                             3
   fil6    1                        2

   Para mover una mesa, cambia su col/fil. Para agregar una, añádela acá y
   sube la cantidad en Caja › Ajustes.
   ═══════════════════════════════════════════════════════════════════════ */
const PLANO_MESAS = [
  { m: '8',  col: 2, fil: 1 },
  { m: '9',  col: 2, fil: 2 },
  { m: '10', col: 1, fil: 3 },
  { m: '1',  col: 1, fil: 6 },
  { m: '7',  col: 4, fil: 1 },
  { m: '6',  col: 4, fil: 2 },
  { m: '5',  col: 4, fil: 3 },
  { m: '4',  col: 4, fil: 4 },
  { m: '3',  col: 4, fil: 5 },
  { m: '2',  col: 4, fil: 6 }
];

/* Minutos aproximados que toma preparar cada categoría. Con esto la cocina
   puede ordenar la cola del plato más rápido al más demorado. */
const MINUTOS_CATEGORIA = {
  empezar: 7, sopas: 8, tallarines: 10, especiales: 12,
  chaufafusion: 9, chaufas: 8, fusion: 11, plancha: 14,
  combos: 20, guarniciones: 4,
  infusiones: 2, jarras: 3, gaseosas: 1, cervezas: 1, cocteles: 4
};

/* Notas rápidas que el mozo toca en lugar de escribir. */
const NOTAS_RAPIDAS = [
  'Sin cebolla', 'Sin kion', 'Sin sillao', 'Sin picante', 'Bien picante',
  'Sin culantro', 'Sin verduras', 'Poca sal', 'Bien tostado',
  'Para llevar', 'Primero este', 'Niño', 'Sin ajinomoto', 'Aparte'
];
