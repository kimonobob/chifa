-- ════════════════════════════════════════════════════════════════════════
--  Chifa Cuatro Dragones · base de datos para sincronizar los equipos
--
--  Se pega entero en Supabase › SQL Editor › New query › Run.
--  Se puede volver a correr sin miedo: no borra nada de lo que ya haya.
-- ════════════════════════════════════════════════════════════════════════

-- ── El estado de cada local ─────────────────────────────────────────────
--  Una fila por local. Adentro va todo: mesas, pedidos, ventas y ajustes.
--  `rev` sube en cada cambio y es lo que evita que dos equipos que
--  escriben a la vez se pisen el trabajo: quien llega con una revisión
--  vieja no entra, relee y vuelve a intentar.
create table if not exists public.estado (
  sede        text primary key,
  rev         bigint      not null default 0,
  datos       jsonb       not null default '{}'::jsonb,
  actualizado timestamptz not null default now()
);

-- ── Qué pantallas están abiertas ────────────────────────────────────────
--  Cada equipo deja su marca cada pocos segundos. Con esto el mozo sabe si
--  la cocina está abierta antes de dar una comanda por impresa.
create table if not exists public.presencia (
  id        text primary key,          -- local + equipo
  sede      text        not null,
  pantalla  text        not null,      -- mozo · cocina · caja
  ticketera boolean     not null default false,
  visto     timestamptz not null default now()
);

create index if not exists presencia_sede_idx on public.presencia (sede);

-- ── Permisos ────────────────────────────────────────────────────────────
--  El sistema entra con la clave `anon`, que viaja dentro de la página y
--  por lo tanto es pública. Estas reglas le dan acceso a las dos tablas.
--
--  ⚠ Esto NO es seguridad: quien tenga la URL y la clave puede leer y
--    escribir los pedidos del chifa. Para el salón de un restaurante
--    alcanza. Si algún día hace falta de verdad, se pone Supabase Auth con
--    un usuario por local y estas reglas se cambian por `to authenticated`.
alter table public.estado    enable row level security;
alter table public.presencia enable row level security;

drop policy if exists "chifa estado lee"     on public.estado;
drop policy if exists "chifa estado crea"    on public.estado;
drop policy if exists "chifa estado escribe" on public.estado;

create policy "chifa estado lee"     on public.estado for select to anon using (true);
create policy "chifa estado crea"    on public.estado for insert to anon with check (true);
create policy "chifa estado escribe" on public.estado for update to anon using (true) with check (true);

drop policy if exists "chifa presencia lee"     on public.presencia;
drop policy if exists "chifa presencia crea"    on public.presencia;
drop policy if exists "chifa presencia escribe" on public.presencia;

create policy "chifa presencia lee"     on public.presencia for select to anon using (true);
create policy "chifa presencia crea"    on public.presencia for insert to anon with check (true);
create policy "chifa presencia escribe" on public.presencia for update to anon using (true) with check (true);

-- ── Limpieza de presencias viejas ───────────────────────────────────────
--  Las marcas de equipos que ya se fueron no molestan, pero tampoco hacen
--  falta. Esto borra las de más de un día.
delete from public.presencia where visto < now() - interval '1 day';
