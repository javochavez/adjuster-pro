-- ══════════════════════════════════════════════════════════════════
-- AdjusterPro — Sistema de Roles con Supabase Auth
-- Ejecutar en: Supabase → SQL Editor → New query → Pegar y ejecutar
-- Nombres de tablas reales: siniestros, informes, pagos,
--   bitacora_ajustador. FK en tablas hijas: id_siniestro.
-- ══════════════════════════════════════════════════════════════════


-- ──────────────────────────────────────────────────────────────────
-- BLOQUE 1 — TABLAS DE SOPORTE
-- ──────────────────────────────────────────────────────────────────

-- 1a. Perfiles (extiende auth.users con rol y estado de aprobación)
create table if not exists public.perfiles (
  id            uuid        primary key references auth.users(id) on delete cascade,
  nombre        text,
  rol           text        not null default 'ajustador'
                            check (rol in ('admin', 'ajustador', 'consultor')),
  aprobado      boolean     not null default false,
  aprobado_por  uuid        references auth.users(id),
  aprobado_at   timestamptz,
  created_at    timestamptz default now()
);

-- 1a-fix. Si perfiles ya existía con columnas incompletas, añade las faltantes
alter table public.perfiles add column if not exists nombre       text;
alter table public.perfiles add column if not exists rol          text        not null default 'ajustador';
alter table public.perfiles add column if not exists aprobado     boolean     not null default false;
alter table public.perfiles add column if not exists aprobado_por uuid        references auth.users(id);
alter table public.perfiles add column if not exists aprobado_at  timestamptz;
alter table public.perfiles add column if not exists created_at   timestamptz default now();

-- Asegura el constraint de rol (idempotente: falla silenciosamente si ya existe)
do $$ begin
  alter table public.perfiles
    add constraint perfiles_rol_check check (rol in ('admin', 'ajustador', 'consultor'));
exception when duplicate_object then null;
end $$;

-- 1b. Tokens one-time para aprobación por correo (expiran en 7 días)
create table if not exists public.solicitudes_aprobacion (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  token       uuid        unique not null default gen_random_uuid(),
  usado       boolean     not null default false,
  expires_at  timestamptz not null default (now() + interval '7 days'),
  created_at  timestamptz default now()
);

-- 1b-fix. Si solicitudes_aprobacion ya existía con columnas incompletas
alter table public.solicitudes_aprobacion add column if not exists user_id    uuid        not null references auth.users(id) on delete cascade;
alter table public.solicitudes_aprobacion add column if not exists token      uuid        unique not null default gen_random_uuid();
alter table public.solicitudes_aprobacion add column if not exists usado      boolean     not null default false;
alter table public.solicitudes_aprobacion add column if not exists expires_at timestamptz not null default (now() + interval '7 days');
alter table public.solicitudes_aprobacion add column if not exists created_at timestamptz default now();

-- 1c. Columna de ownership en siniestros (quién es el ajustador responsable)
alter table public.siniestros
  add column if not exists ajustador_id uuid references auth.users(id);

-- 1d. Habilitar RLS en tablas nuevas
alter table public.perfiles               enable row level security;
alter table public.solicitudes_aprobacion enable row level security;


-- ──────────────────────────────────────────────────────────────────
-- BLOQUE 2 — JWT HOOK + HELPERS
-- ──────────────────────────────────────────────────────────────────

-- Hook: inyecta app_role y aprobado en el JWT en cada login/refresh.
-- IMPORTANTE: registrar manualmente en
--   Dashboard → Authentication → Hooks → Custom Access Token Hook
--   Function: public.custom_access_token_hook
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol      text;
  v_aprobado boolean;
  v_claims   jsonb;
begin
  select rol, aprobado
    into v_rol, v_aprobado
    from public.perfiles
   where id = (event ->> 'user_id')::uuid;

  v_claims := event -> 'claims';
  v_claims := jsonb_set(v_claims, '{app_role}', to_jsonb(coalesce(v_rol, 'ajustador')));
  v_claims := jsonb_set(v_claims, '{aprobado}', to_jsonb(coalesce(v_aprobado, false)));

  return jsonb_set(event, '{claims}', v_claims);
end;
$$;

-- Permisos requeridos por Supabase para ejecutar el hook
grant usage   on schema public          to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;

-- Helpers: leen JWT en memoria, sin consultar tablas (usados en RLS)
create or replace function public.rol_actual()
returns text language sql stable security definer set search_path = public as $$
  select coalesce(auth.jwt() ->> 'app_role', '')
$$;

create or replace function public.esta_aprobado()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((auth.jwt() ->> 'aprobado')::boolean, false)
$$;


-- ──────────────────────────────────────────────────────────────────
-- BLOQUE 3 — POLÍTICAS RLS
-- ──────────────────────────────────────────────────────────────────

-- 3a. Eliminar políticas permisivas existentes (si las hay)
drop policy if exists "acceso_total_siniestros"      on public.siniestros;
drop policy if exists "acceso_total_informes"        on public.informes;
drop policy if exists "acceso_total_pagos"           on public.pagos;
drop policy if exists "acceso_total_bitacora_ajustador" on public.bitacora_ajustador;
-- Por si se ejecutó una versión anterior con nombres incorrectos:
drop policy if exists "acceso_total_casos"           on public.siniestros;
drop policy if exists "acceso_total_bitacora"        on public.bitacora_ajustador;

-- 3b. Habilitar RLS en las tablas de negocio (idempotente)
alter table public.siniestros        enable row level security;
alter table public.informes          enable row level security;
alter table public.pagos             enable row level security;
alter table public.bitacora_ajustador enable row level security;


-- ── TABLA: siniestros ─────────────────────────────────────────────

-- SELECT
create policy "siniestros_select_admin"
  on public.siniestros for select
  using ( public.rol_actual() = 'admin' and public.esta_aprobado() );

create policy "siniestros_select_ajustador"
  on public.siniestros for select
  using ( public.rol_actual() = 'ajustador'
          and public.esta_aprobado()
          and ajustador_id = auth.uid() );

create policy "siniestros_select_consultor"
  on public.siniestros for select
  using ( public.rol_actual() = 'consultor' and public.esta_aprobado() );

-- INSERT
create policy "siniestros_insert_admin"
  on public.siniestros for insert
  with check ( public.rol_actual() = 'admin' and public.esta_aprobado() );

create policy "siniestros_insert_ajustador"
  on public.siniestros for insert
  with check ( public.rol_actual() = 'ajustador'
               and public.esta_aprobado()
               and ajustador_id = auth.uid() );

-- UPDATE
create policy "siniestros_update_admin"
  on public.siniestros for update
  using  ( public.rol_actual() = 'admin' and public.esta_aprobado() )
  with check ( public.rol_actual() = 'admin' );

create policy "siniestros_update_ajustador"
  on public.siniestros for update
  using  ( public.rol_actual() = 'ajustador'
           and public.esta_aprobado()
           and ajustador_id = auth.uid() )
  with check ( ajustador_id = auth.uid() );

-- DELETE
create policy "siniestros_delete_admin"
  on public.siniestros for delete
  using ( public.rol_actual() = 'admin' and public.esta_aprobado() );


-- ── TABLA: informes ───────────────────────────────────────────────

-- SELECT
create policy "informes_select_admin"
  on public.informes for select
  using ( public.rol_actual() = 'admin' and public.esta_aprobado() );

create policy "informes_select_ajustador"
  on public.informes for select
  using ( public.rol_actual() = 'ajustador'
          and public.esta_aprobado()
          and exists (
            select 1 from public.siniestros
             where siniestros.id = informes.id_siniestro
               and siniestros.ajustador_id = auth.uid()
          ));

create policy "informes_select_consultor"
  on public.informes for select
  using ( public.rol_actual() = 'consultor' and public.esta_aprobado() );

-- INSERT
create policy "informes_insert_admin"
  on public.informes for insert
  with check ( public.rol_actual() = 'admin' and public.esta_aprobado() );

create policy "informes_insert_ajustador"
  on public.informes for insert
  with check ( public.rol_actual() = 'ajustador'
               and public.esta_aprobado()
               and exists (
                 select 1 from public.siniestros
                  where siniestros.id = informes.id_siniestro
                    and siniestros.ajustador_id = auth.uid()
               ));

-- UPDATE
create policy "informes_update_admin"
  on public.informes for update
  using ( public.rol_actual() = 'admin' and public.esta_aprobado() );

create policy "informes_update_ajustador"
  on public.informes for update
  using ( public.rol_actual() = 'ajustador'
          and public.esta_aprobado()
          and exists (
            select 1 from public.siniestros
             where siniestros.id = informes.id_siniestro
               and siniestros.ajustador_id = auth.uid()
          ));

-- DELETE
create policy "informes_delete_admin"
  on public.informes for delete
  using ( public.rol_actual() = 'admin' and public.esta_aprobado() );


-- ── TABLA: pagos ──────────────────────────────────────────────────

-- SELECT
create policy "pagos_select_admin"
  on public.pagos for select
  using ( public.rol_actual() = 'admin' and public.esta_aprobado() );

create policy "pagos_select_ajustador"
  on public.pagos for select
  using ( public.rol_actual() = 'ajustador'
          and public.esta_aprobado()
          and exists (
            select 1 from public.siniestros
             where siniestros.id = pagos.id_siniestro
               and siniestros.ajustador_id = auth.uid()
          ));

create policy "pagos_select_consultor"
  on public.pagos for select
  using ( public.rol_actual() = 'consultor' and public.esta_aprobado() );

-- INSERT
create policy "pagos_insert_admin"
  on public.pagos for insert
  with check ( public.rol_actual() = 'admin' and public.esta_aprobado() );

create policy "pagos_insert_ajustador"
  on public.pagos for insert
  with check ( public.rol_actual() = 'ajustador'
               and public.esta_aprobado()
               and exists (
                 select 1 from public.siniestros
                  where siniestros.id = pagos.id_siniestro
                    and siniestros.ajustador_id = auth.uid()
               ));

-- UPDATE
create policy "pagos_update_admin"
  on public.pagos for update
  using ( public.rol_actual() = 'admin' and public.esta_aprobado() );

create policy "pagos_update_ajustador"
  on public.pagos for update
  using ( public.rol_actual() = 'ajustador'
          and public.esta_aprobado()
          and exists (
            select 1 from public.siniestros
             where siniestros.id = pagos.id_siniestro
               and siniestros.ajustador_id = auth.uid()
          ));

-- DELETE
create policy "pagos_delete_admin"
  on public.pagos for delete
  using ( public.rol_actual() = 'admin' and public.esta_aprobado() );


-- ── TABLA: bitacora_ajustador ─────────────────────────────────────

-- SELECT
create policy "bitacora_ajustador_select_admin"
  on public.bitacora_ajustador for select
  using ( public.rol_actual() = 'admin' and public.esta_aprobado() );

create policy "bitacora_ajustador_select_ajustador"
  on public.bitacora_ajustador for select
  using ( public.rol_actual() = 'ajustador'
          and public.esta_aprobado()
          and exists (
            select 1 from public.siniestros
             where siniestros.id = bitacora_ajustador.id_siniestro
               and siniestros.ajustador_id = auth.uid()
          ));

create policy "bitacora_ajustador_select_consultor"
  on public.bitacora_ajustador for select
  using ( public.rol_actual() = 'consultor' and public.esta_aprobado() );

-- INSERT
create policy "bitacora_ajustador_insert_admin"
  on public.bitacora_ajustador for insert
  with check ( public.rol_actual() = 'admin' and public.esta_aprobado() );

create policy "bitacora_ajustador_insert_ajustador"
  on public.bitacora_ajustador for insert
  with check ( public.rol_actual() = 'ajustador'
               and public.esta_aprobado()
               and exists (
                 select 1 from public.siniestros
                  where siniestros.id = bitacora_ajustador.id_siniestro
                    and siniestros.ajustador_id = auth.uid()
               ));

-- UPDATE
create policy "bitacora_ajustador_update_admin"
  on public.bitacora_ajustador for update
  using ( public.rol_actual() = 'admin' and public.esta_aprobado() );

-- DELETE
create policy "bitacora_ajustador_delete_admin"
  on public.bitacora_ajustador for delete
  using ( public.rol_actual() = 'admin' and public.esta_aprobado() );


-- ── TABLA: perfiles ───────────────────────────────────────────────

create policy "perfiles_select_propio"
  on public.perfiles for select
  using ( id = auth.uid() );

create policy "perfiles_select_admin"
  on public.perfiles for select
  using ( public.rol_actual() = 'admin' and public.esta_aprobado() );

create policy "perfiles_update_admin"
  on public.perfiles for update
  using ( public.rol_actual() = 'admin' and public.esta_aprobado() );

-- solicitudes_aprobacion: bloqueado al cliente (solo service_role vía Edge Function)
create policy "solicitudes_sin_acceso_cliente"
  on public.solicitudes_aprobacion for all
  using ( false );


-- ──────────────────────────────────────────────────────────────────
-- BLOQUE 4 — TRIGGER: nuevo usuario → perfil + token + notificación
-- ──────────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre  text;
  v_rol     text;
  v_token   uuid := gen_random_uuid();
begin
  -- Lee metadatos opcionales enviados desde el cliente en signUp()
  v_nombre := coalesce(new.raw_user_meta_data ->> 'nombre', new.email);
  v_rol    := coalesce(new.raw_user_meta_data ->> 'rol', 'ajustador');

  -- Normaliza a valores permitidos
  if v_rol not in ('admin', 'ajustador', 'consultor') then
    v_rol := 'ajustador';
  end if;

  -- Crea perfil en estado pendiente de aprobación
  insert into public.perfiles (id, nombre, rol, aprobado)
  values (new.id, v_nombre, v_rol, false);

  -- Crea token one-time (expira en 7 días)
  insert into public.solicitudes_aprobacion (user_id, token)
  values (new.id, v_token);

  -- Notifica al administrador vía Edge Function (requiere pg_net)
  perform net.http_post(
    url     := current_setting('app.edge_url', true)
                 || '/functions/v1/send-approval-email',
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer '
                   || current_setting('app.service_role_key', true)
               ),
    body    := jsonb_build_object(
                 'user_id',    new.id,
                 'email',      new.email,
                 'nombre',     v_nombre,
                 'rol',        v_rol,
                 'token',      v_token::text
               )
  );

  return new;
end;
$$;

-- Eliminar trigger anterior si existe, luego crear
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ──────────────────────────────────────────────────────────────────
-- BLOQUE 5 — BOOTSTRAP: primer administrador sin aprobación
-- ──────────────────────────────────────────────────────────────────
-- Ejecutar UNA SOLA VEZ después de que el admin se registre en la app.
-- Reemplaza 'admin@ejemplo.com' con el correo real del administrador.
-- ──────────────────────────────────────────────────────────────────

do $$
declare
  v_admin_email text := 'javier@chavez.mx';  -- ← CAMBIAR antes de ejecutar
  v_user_id     uuid;
begin
  -- Busca el usuario por correo en auth.users
  select id into v_user_id
    from auth.users
   where email = v_admin_email
   limit 1;

  if v_user_id is null then
    raise notice 'Usuario % no encontrado. Regístrate primero en la app y vuelve a ejecutar.', v_admin_email;
    return;
  end if;

  -- Actualiza o inserta el perfil como admin aprobado
  insert into public.perfiles (id, nombre, rol, aprobado, aprobado_at)
  values (
    v_user_id,
    v_admin_email,
    'admin',
    true,
    now()
  )
  on conflict (id) do update
    set rol        = 'admin',
        aprobado   = true,
        aprobado_at = now();

  -- Marca cualquier solicitud pendiente de ese usuario como usada
  update public.solicitudes_aprobacion
     set usado = true
   where user_id = v_user_id;

  raise notice 'Admin % configurado correctamente (id: %).', v_admin_email, v_user_id;
end;
$$;
