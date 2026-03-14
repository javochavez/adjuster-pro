-- AdjusterPro — Schema Supabase
-- Ejecutar en: Supabase → SQL Editor → New query → Pegar y ejecutar

-- Tabla: casos
create table if not exists casos (
  id bigint generated always as identity primary key,
  exp text not null,
  asegurado text,
  aseguradora text,
  contacto text,
  tipo text,
  moneda text default 'MXN',
  reclamado numeric default 0,
  reserva numeric default 0,
  honorarios numeric default 0,
  estatus text default 'asignado',
  fasig date,
  finsp date,
  finf date,
  ubic text,
  notas text,
  created_at timestamptz default now()
);

-- Tabla: informes
create table if not exists informes (
  id bigint generated always as identity primary key,
  caso_id bigint references casos(id) on delete cascade,
  num text,
  tipo text,
  dest text,
  fecha date,
  estatus text default 'borrador',
  resumen text,
  created_at timestamptz default now()
);

-- Tabla: pagos (honorarios)
create table if not exists pagos (
  id bigint generated always as identity primary key,
  caso_id bigint references casos(id) on delete cascade,
  moneda text default 'MXN',
  monto numeric default 0,
  pagado numeric default 0,
  fecha_pago date,
  created_at timestamptz default now()
);

-- Tabla: bitacora
create table if not exists bitacora (
  id bigint generated always as identity primary key,
  caso_id bigint references casos(id) on delete cascade,
  fecha date default current_date,
  nota text,
  created_at timestamptz default now()
);

-- Habilitar acceso público (RLS desactivado para uso personal)
alter table casos enable row level security;
alter table informes enable row level security;
alter table pagos enable row level security;
alter table bitacora enable row level security;

create policy "acceso_total_casos" on casos for all using (true) with check (true);
create policy "acceso_total_informes" on informes for all using (true) with check (true);
create policy "acceso_total_pagos" on pagos for all using (true) with check (true);
create policy "acceso_total_bitacora" on bitacora for all using (true) with check (true);
