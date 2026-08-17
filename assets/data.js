/* Carta base del chifa.
   c  = código que escribe el mozo (1–100 comida, 101+ barra)
   n  = nombre del platillo
   p  = precio regular
   pf = precio familiar (si el plato se vende en dos tamaños)
   cat= categoría
   bar= true si sale de barra y no de cocina
   Los precios y nombres se pueden editar desde Caja › Ajustes › Carta.        */

const CATEGORIAS = [
  { id: 'sopas',      nombre: 'Sopas',            rango: '1–9' },
  { id: 'entradas',   nombre: 'Entradas',         rango: '10–19' },
  { id: 'tallarines', nombre: 'Tallarines',       rango: '20–29' },
  { id: 'res',        nombre: 'Res',              rango: '30–39' },
  { id: 'aves',       nombre: 'Aves',             rango: '40–49' },
  { id: 'chancho',    nombre: 'Chancho y pato',   rango: '50–59' },
  { id: 'chaufas',    nombre: 'Chaufas',          rango: '60–69' },
  { id: 'mariscos',   nombre: 'Mariscos',         rango: '70–79' },
  { id: 'especiales', nombre: 'Especiales',       rango: '80–89' },
  { id: 'combinados', nombre: 'Combinados',       rango: '90–97' },
  { id: 'postres',    nombre: 'Postres',          rango: '98–100' },
  { id: 'bebidas',    nombre: 'Bebidas',          rango: '101+' }
];

const CARTA_BASE = [
  // ── Sopas ────────────────────────────────────────────────────────────────
  { c: 1,  n: 'Sopa wantán',                  p: 24, pf: 38, cat: 'sopas' },
  { c: 2,  n: 'Sopa fuchifú',                 p: 27, pf: 42, cat: 'sopas' },
  { c: 3,  n: 'Sopa de pollo con choclo',     p: 22, pf: 35, cat: 'sopas' },
  { c: 4,  n: 'Sopa tai pai pai',             p: 29, pf: 46, cat: 'sopas' },
  { c: 5,  n: 'Sopa de aleta',                p: 34, pf: 54, cat: 'sopas' },
  { c: 6,  n: 'Sopa de langostinos',          p: 33, pf: 52, cat: 'sopas' },
  { c: 7,  n: 'Sopa de verduras',             p: 20, pf: 32, cat: 'sopas' },
  { c: 8,  n: 'Sopa de kion con pollo',       p: 24, pf: 38, cat: 'sopas' },
  { c: 9,  n: 'Sopa wantán especial',         p: 30, pf: 48, cat: 'sopas' },

  // ── Entradas y frituras ──────────────────────────────────────────────────
  { c: 10, n: 'Wantán frito (8 u.)',          p: 18,          cat: 'entradas' },
  { c: 11, n: 'Enrolladito primavera (4 u.)', p: 20,          cat: 'entradas' },
  { c: 12, n: 'Siu mai (4 u.)',               p: 19,          cat: 'entradas' },
  { c: 13, n: 'Costilla frita',               p: 28,          cat: 'entradas' },
  { c: 14, n: 'Alitas con miel de kion',      p: 26,          cat: 'entradas' },
  { c: 15, n: 'Char siu (chancho asado)',     p: 29,          cat: 'entradas' },
  { c: 16, n: 'Pan chino al vapor (4 u.)',    p: 12,          cat: 'entradas' },
  { c: 17, n: 'Rollito de langostino (4 u.)', p: 27,          cat: 'entradas' },
  { c: 18, n: 'Wantán de langostino frito',   p: 26,          cat: 'entradas' },
  { c: 19, n: 'Piqueo chifa (para 2)',        p: 45,          cat: 'entradas' },

  // ── Tallarines ───────────────────────────────────────────────────────────
  { c: 20, n: 'Tallarín saltado de pollo',    p: 26, pf: 42, cat: 'tallarines' },
  { c: 21, n: 'Tallarín saltado de carne',    p: 29, pf: 46, cat: 'tallarines' },
  { c: 22, n: 'Tallarín saltado de chancho',  p: 27, pf: 43, cat: 'tallarines' },
  { c: 23, n: 'Tallarín saltado mixto',       p: 31, pf: 49, cat: 'tallarines' },
  { c: 24, n: 'Tallarín saltado especial',    p: 34, pf: 54, cat: 'tallarines' },
  { c: 25, n: 'Tallarín con langostinos',     p: 38, pf: 58, cat: 'tallarines' },
  { c: 26, n: 'Tallarín vegetariano',         p: 24, pf: 38, cat: 'tallarines' },
  { c: 27, n: 'Tallarín kam lu wantán',       p: 36, pf: 56, cat: 'tallarines' },
  { c: 28, n: 'Tallarín crocante',            p: 33, pf: 52, cat: 'tallarines' },
  { c: 29, n: 'Min pao con pollo',            p: 30, pf: 48, cat: 'tallarines' },

  // ── Res ──────────────────────────────────────────────────────────────────
  { c: 30, n: 'Lomo saltado chifa',           p: 34, pf: 54, cat: 'res' },
  { c: 31, n: 'Carne con brócoli',            p: 31, pf: 49, cat: 'res' },
  { c: 32, n: 'Carne con champiñones',        p: 32, pf: 50, cat: 'res' },
  { c: 33, n: 'Carne con pimiento y kion',    p: 31, pf: 49, cat: 'res' },
  { c: 34, n: 'Carne con verduras chinas',    p: 30, pf: 48, cat: 'res' },
  { c: 35, n: 'Carne con cebolla china',      p: 30, pf: 48, cat: 'res' },
  { c: 36, n: 'Carne al sillao',              p: 29, pf: 46, cat: 'res' },
  { c: 37, n: 'Carne con tamarindo',          p: 33, pf: 52, cat: 'res' },
  { c: 38, n: 'Carne con piña',               p: 31, pf: 49, cat: 'res' },
  { c: 39, n: 'Carne kam lu',                 p: 35, pf: 55, cat: 'res' },

  // ── Aves ─────────────────────────────────────────────────────────────────
  { c: 40, n: 'Pollo con verduras',           p: 27, pf: 43, cat: 'aves' },
  { c: 41, n: 'Chi jau kay',                  p: 30, pf: 48, cat: 'aves' },
  { c: 42, n: 'Pollo con champiñones',        p: 29, pf: 46, cat: 'aves' },
  { c: 43, n: 'Pollo con brócoli',            p: 28, pf: 45, cat: 'aves' },
  { c: 44, n: 'Pollo enrollado (4 u.)',       p: 26,          cat: 'aves' },
  { c: 45, n: 'Pollo con piña',               p: 28, pf: 45, cat: 'aves' },
  { c: 46, n: 'Pollo con maní',               p: 29, pf: 46, cat: 'aves' },
  { c: 47, n: 'Pollo al ajo',                 p: 28, pf: 45, cat: 'aves' },
  { c: 48, n: 'Pollo con cebolla china',      p: 27, pf: 43, cat: 'aves' },
  { c: 49, n: 'Pollo crocante con tamarindo', p: 31, pf: 49, cat: 'aves' },

  // ── Chancho y pato ───────────────────────────────────────────────────────
  { c: 50, n: 'Chancho con tamarindo',        p: 31, pf: 49, cat: 'chancho' },
  { c: 51, n: 'Chancho asado con verduras',   p: 32, pf: 50, cat: 'chancho' },
  { c: 52, n: 'Costillas agridulces',         p: 34, pf: 54, cat: 'chancho' },
  { c: 53, n: 'Costillas con miel',           p: 34, pf: 54, cat: 'chancho' },
  { c: 54, n: 'Chancho con piña',             p: 30, pf: 48, cat: 'chancho' },
  { c: 55, n: 'Pato asado (1/4)',             p: 42,          cat: 'chancho' },
  { c: 56, n: 'Pato con champiñones',         p: 45, pf: 68, cat: 'chancho' },
  { c: 57, n: 'Chancho crocante',             p: 33, pf: 52, cat: 'chancho' },
  { c: 58, n: 'Kam lu de chancho',            p: 35, pf: 55, cat: 'chancho' },
  { c: 59, n: 'Chancho con verduras chinas',  p: 30, pf: 48, cat: 'chancho' },

  // ── Chaufas ──────────────────────────────────────────────────────────────
  { c: 60, n: 'Chaufa de pollo',              p: 24, pf: 38, cat: 'chaufas' },
  { c: 61, n: 'Chaufa de carne',              p: 27, pf: 43, cat: 'chaufas' },
  { c: 62, n: 'Chaufa de chancho',            p: 25, pf: 40, cat: 'chaufas' },
  { c: 63, n: 'Chaufa mixto',                 p: 29, pf: 46, cat: 'chaufas' },
  { c: 64, n: 'Chaufa especial',              p: 32, pf: 50, cat: 'chaufas' },
  { c: 65, n: 'Chaufa de langostinos',        p: 36, pf: 56, cat: 'chaufas' },
  { c: 66, n: 'Chaufa vegetariano',           p: 22, pf: 35, cat: 'chaufas' },
  { c: 67, n: 'Chaufa aeropuerto',            p: 31, pf: 49, cat: 'chaufas' },
  { c: 68, n: 'Chaufa de pato',               p: 38, pf: 58, cat: 'chaufas' },
  { c: 69, n: 'Chaufa de mariscos',           p: 37, pf: 57, cat: 'chaufas' },

  // ── Mariscos ─────────────────────────────────────────────────────────────
  { c: 70, n: 'Langostinos con verduras',     p: 39, pf: 60, cat: 'mariscos' },
  { c: 71, n: 'Langostinos al ajo',           p: 40, pf: 62, cat: 'mariscos' },
  { c: 72, n: 'Langostinos empanizados',      p: 41, pf: 63, cat: 'mariscos' },
  { c: 73, n: 'Pescado con tamarindo',        p: 38, pf: 58, cat: 'mariscos' },
  { c: 74, n: 'Pescado al vapor con kion',    p: 40, pf: 62, cat: 'mariscos' },
  { c: 75, n: 'Filete de pescado con verduras', p: 36, pf: 56, cat: 'mariscos' },
  { c: 76, n: 'Conchas al ajo',               p: 42,          cat: 'mariscos' },
  { c: 77, n: 'Calamar crocante',             p: 35, pf: 55, cat: 'mariscos' },
  { c: 78, n: 'Salteado de mariscos',         p: 43, pf: 66, cat: 'mariscos' },
  { c: 79, n: 'Pescado agridulce',            p: 38, pf: 58, cat: 'mariscos' },

  // ── Especiales ───────────────────────────────────────────────────────────
  { c: 80, n: 'Agridulce de pollo',           p: 29, pf: 46, cat: 'especiales' },
  { c: 81, n: 'Tipakay de pollo',             p: 30, pf: 48, cat: 'especiales' },
  { c: 82, n: 'Tipakay de chancho',           p: 31, pf: 49, cat: 'especiales' },
  { c: 83, n: 'Tipakay de langostinos',       p: 39, pf: 60, cat: 'especiales' },
  { c: 84, n: 'Kam lu wantán de pollo',       p: 34, pf: 54, cat: 'especiales' },
  { c: 85, n: 'Pollo con tausi',              p: 29, pf: 46, cat: 'especiales' },
  { c: 86, n: 'Carne con tausi',              p: 32, pf: 50, cat: 'especiales' },
  { c: 87, n: 'Langostinos con tausi',        p: 40, pf: 62, cat: 'especiales' },
  { c: 88, n: 'Tofu con verduras',            p: 25, pf: 40, cat: 'especiales' },
  { c: 89, n: 'Verduras salteadas mixtas',    p: 23, pf: 37, cat: 'especiales' },

  // ── Combinados y guarniciones ────────────────────────────────────────────
  { c: 90, n: 'Aeropuerto de pollo',          p: 30, pf: 48, cat: 'combinados' },
  { c: 91, n: 'Aeropuerto especial',          p: 35, pf: 55, cat: 'combinados' },
  { c: 92, n: 'Combinado (chaufa + tallarín + fondo)', p: 34, cat: 'combinados' },
  { c: 93, n: 'Combinado familiar (para 4)',  p: 95,          cat: 'combinados' },
  { c: 94, n: 'Arroz blanco',                 p: 8,           cat: 'combinados' },
  { c: 95, n: 'Papas fritas',                 p: 12,          cat: 'combinados' },
  { c: 96, n: 'Porción de chaufa',            p: 14,          cat: 'combinados' },
  { c: 97, n: 'Porción de tallarín',          p: 14,          cat: 'combinados' },

  // ── Postres ──────────────────────────────────────────────────────────────
  { c: 98,  n: 'Plátano frito con miel',      p: 14,          cat: 'postres' },
  { c: 99,  n: 'Helado frito',                p: 16,          cat: 'postres' },
  { c: 100, n: 'Wantán dulce con helado',     p: 18,          cat: 'postres' },

  // ── Bebidas (salen de barra, no de cocina) ───────────────────────────────
  { c: 101, n: 'Inca Kola 500 ml',            p: 7,  cat: 'bebidas', bar: true },
  { c: 102, n: 'Inca Kola 1.5 L',             p: 13, cat: 'bebidas', bar: true },
  { c: 103, n: 'Coca Cola 500 ml',            p: 7,  cat: 'bebidas', bar: true },
  { c: 104, n: 'Coca Cola 1.5 L',             p: 13, cat: 'bebidas', bar: true },
  { c: 105, n: 'Sprite 500 ml',               p: 7,  cat: 'bebidas', bar: true },
  { c: 106, n: 'Fanta 500 ml',                p: 7,  cat: 'bebidas', bar: true },
  { c: 107, n: 'Pepsi 500 ml',                p: 6,  cat: 'bebidas', bar: true },
  { c: 108, n: 'Agua sin gas 625 ml',         p: 5,  cat: 'bebidas', bar: true },
  { c: 109, n: 'Agua con gas 625 ml',         p: 5,  cat: 'bebidas', bar: true },
  { c: 110, n: 'Chicha morada (vaso)',        p: 6,  cat: 'bebidas', bar: true },
  { c: 111, n: 'Chicha morada (jarra 1 L)',   p: 16, cat: 'bebidas', bar: true },
  { c: 112, n: 'Limonada (vaso)',             p: 6,  cat: 'bebidas', bar: true },
  { c: 113, n: 'Limonada (jarra 1 L)',        p: 16, cat: 'bebidas', bar: true },
  { c: 114, n: 'Maracuyá (vaso)',             p: 7,  cat: 'bebidas', bar: true },
  { c: 115, n: 'Té de kion',                  p: 5,  cat: 'bebidas', bar: true },
  { c: 116, n: 'Té verde',                    p: 5,  cat: 'bebidas', bar: true },
  { c: 117, n: 'Café pasado',                 p: 6,  cat: 'bebidas', bar: true },
  { c: 118, n: 'Cerveza Pilsen 650 ml',       p: 14, cat: 'bebidas', bar: true },
  { c: 119, n: 'Cerveza Cusqueña 650 ml',     p: 15, cat: 'bebidas', bar: true },
  { c: 120, n: 'Cerveza Cristal 650 ml',      p: 14, cat: 'bebidas', bar: true },
  { c: 121, n: 'Cerveza personal 330 ml',     p: 9,  cat: 'bebidas', bar: true },
  { c: 122, n: 'Vino tinto (copa)',           p: 14, cat: 'bebidas', bar: true },
  { c: 123, n: 'Pisco sour',                  p: 18, cat: 'bebidas', bar: true },
  { c: 124, n: 'Chilcano',                    p: 16, cat: 'bebidas', bar: true },
  { c: 125, n: 'Jugo de naranja',             p: 9,  cat: 'bebidas', bar: true },
  { c: 126, n: 'Frugos 300 ml',               p: 4,  cat: 'bebidas', bar: true },
  { c: 127, n: 'Gaseosa personal 300 ml',     p: 4,  cat: 'bebidas', bar: true },
  { c: 128, n: 'Té helado 500 ml',            p: 6,  cat: 'bebidas', bar: true }
];

/* Minutos aproximados que toma preparar cada categoría. Con esto la cocina
   puede ordenar la cola del plato más rápido al más demorado. Ajústalos al
   ritmo real de tu cocina. */
const MINUTOS_CATEGORIA = {
  sopas: 8, entradas: 6, tallarines: 9, res: 10, aves: 9,
  chancho: 12, chaufas: 7, mariscos: 12, especiales: 10,
  combinados: 14, postres: 4, bebidas: 1
};

/* Notas rápidas que el mozo toca en lugar de escribir. */
const NOTAS_RAPIDAS = [
  'Sin cebolla', 'Sin kion', 'Sin sillao', 'Sin picante', 'Bien picante',
  'Sin culantro', 'Sin verduras', 'Poca sal', 'Bien tostado',
  'Para llevar', 'Primero este', 'Niño', 'Sin ajinomoto', 'Aparte'
];
