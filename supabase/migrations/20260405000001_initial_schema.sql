-- ============================================================
-- vitali-app — Esquema inicial
-- Sprint 0: estructura base de datos completa
-- ============================================================

-- Extensiones
create extension if not exists "uuid-ossp";

-- ============================================================
-- MONEDAS
-- ============================================================
create table currencies (
  id    uuid primary key default uuid_generate_v4(),
  code   text not null unique,   -- CLP, MXN, COP, USD
  name   text not null,
  symbol text not null
);

insert into currencies (code, name, symbol) values
  ('CLP', 'Peso chileno',    '$'),
  ('MXN', 'Peso mexicano',   '$'),
  ('COP', 'Peso colombiano', '$'),
  ('USD', 'Dólar',           'US$');

-- ============================================================
-- PROYECTOS INMOBILIARIOS
-- ============================================================
create table projects (
  id                     uuid primary key default uuid_generate_v4(),
  name                   text not null,
  description            text,
  location               text,
  currency_id            uuid not null references currencies(id),
  annual_interest_rate   numeric(5,4) not null default 0.08,
  french_credit_enabled  boolean not null default true,
  smart_credit_enabled   boolean not null default true,
  created_at             timestamptz not null default now()
);

-- ============================================================
-- TORRES / BLOQUES
-- ============================================================
create table towers (
  id                    uuid primary key default uuid_generate_v4(),
  project_id            uuid not null references projects(id) on delete cascade,
  name                  text not null,
  description           text,
  delivery_date         date,
  max_financing_years   integer not null default 20,
  min_pie_percentage    numeric(5,2) not null default 20,
  created_at            timestamptz not null default now()
);

-- ============================================================
-- TIPOLOGÍAS DE DEPARTAMENTOS
-- ============================================================
create table typologies (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  surface_m2  numeric(8,2) not null,
  description text,
  created_at  timestamptz not null default now()
);

-- Asignación de tipologías a proyectos
create table project_typologies (
  project_id  uuid not null references projects(id) on delete cascade,
  typology_id uuid not null references typologies(id) on delete cascade,
  primary key (project_id, typology_id)
);

-- ============================================================
-- DEPARTAMENTOS
-- ============================================================
create table units (
  id           uuid primary key default uuid_generate_v4(),
  tower_id     uuid not null references towers(id) on delete cascade,
  typology_id  uuid not null references typologies(id),
  unit_number  text not null,
  floor        integer,
  list_price   numeric(14,2) not null,
  created_at   timestamptz not null default now(),
  unique (tower_id, unit_number)
);

-- ============================================================
-- PERMISOS Y ROLES
-- ============================================================
create table permissions (
  id          uuid primary key default uuid_generate_v4(),
  module      text not null,
  action      text not null,
  description text,
  unique (module, action)
);

-- Permisos base del sistema
insert into permissions (module, action, description) values
  ('projects',   'read',     'Ver listado de proyectos'),
  ('projects',   'create',   'Crear proyectos'),
  ('projects',   'edit',     'Editar proyectos'),
  ('projects',   'delete',   'Eliminar proyectos'),
  ('towers',     'read',     'Ver torres'),
  ('towers',     'create',   'Crear torres'),
  ('towers',     'edit',     'Editar torres'),
  ('towers',     'delete',   'Eliminar torres'),
  ('typologies', 'read',     'Ver tipologías'),
  ('typologies', 'create',   'Crear tipologías'),
  ('typologies', 'edit',     'Editar tipologías'),
  ('typologies', 'delete',   'Eliminar tipologías'),
  ('units',      'read',     'Ver departamentos'),
  ('units',      'create',   'Crear departamentos'),
  ('units',      'edit',     'Editar departamentos'),
  ('units',      'delete',   'Eliminar departamentos'),
  ('simulator',  'use',      'Usar el cotizador'),
  ('quotes',     'create',   'Emitir cotizaciones'),
  ('quotes',     'read',     'Ver cotizaciones propias'),
  ('quotes',     'read_all', 'Ver todas las cotizaciones'),
  ('clients',    'read',     'Ver clientes'),
  ('clients',    'create',   'Crear clientes'),
  ('clients',    'edit',     'Editar clientes'),
  ('clients',    'delete',   'Eliminar clientes'),
  ('users',      'read',     'Ver usuarios'),
  ('users',      'create',   'Crear usuarios'),
  ('users',      'edit',     'Editar usuarios'),
  ('users',      'delete',   'Eliminar usuarios'),
  ('settings',   'read',     'Ver configuración'),
  ('settings',   'edit',     'Editar configuración');

create table roles (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,
  description text,
  created_at  timestamptz not null default now()
);

create table role_permissions (
  role_id       uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- Roles base del sistema
insert into roles (name, description) values
  ('Super Admin',          'Acceso total al sistema'),
  ('Admin Inmobiliario',   'Gestiona proyectos, torres, tipologías y departamentos'),
  ('Vendedor',             'Accede al cotizador y emite cotizaciones');

-- Asignar permisos al Super Admin (todos)
insert into role_permissions (role_id, permission_id)
select
  (select id from roles where name = 'Super Admin'),
  id
from permissions;

-- Asignar permisos al Admin Inmobiliario
insert into role_permissions (role_id, permission_id)
select
  (select id from roles where name = 'Admin Inmobiliario'),
  id
from permissions
where (module, action) in (
  ('projects',   'read'),   ('projects',   'create'), ('projects',   'edit'), ('projects',   'delete'),
  ('towers',     'read'),   ('towers',     'create'), ('towers',     'edit'), ('towers',     'delete'),
  ('typologies', 'read'),   ('typologies', 'create'), ('typologies', 'edit'), ('typologies', 'delete'),
  ('units',      'read'),   ('units',      'create'), ('units',      'edit'), ('units',      'delete'),
  ('simulator',  'use'),
  ('quotes',     'read_all')
);

-- Asignar permisos al Vendedor
insert into role_permissions (role_id, permission_id)
select
  (select id from roles where name = 'Vendedor'),
  id
from permissions
where (module, action) in (
  ('simulator', 'use'),
  ('projects',  'read'),
  ('towers',    'read'),
  ('units',     'read'),
  ('quotes',    'create'),
  ('quotes',    'read'),
  ('clients',   'read'),
  ('clients',   'create'),
  ('clients',   'edit')
);

-- ============================================================
-- PERFILES DE USUARIO
-- ============================================================
create table user_profiles (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null unique references auth.users(id) on delete cascade,
  full_name  text,
  smtp_host  text,
  smtp_port  integer,
  smtp_user  text,
  created_at timestamptz not null default now()
);

create table user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  primary key (user_id, role_id)
);

-- ============================================================
-- CLIENTES
-- ============================================================
create table clients (
  id         uuid primary key default uuid_generate_v4(),
  full_name  text not null,
  rut        text,
  address    text,
  commune    text,
  phone      text,
  email      text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- COTIZACIONES
-- ============================================================
create table quotes (
  id                  uuid primary key default uuid_generate_v4(),
  client_id           uuid not null references clients(id),
  unit_id             uuid not null references units(id),
  pie_percentage      numeric(5,2) not null,
  pie_amount          numeric(14,2) not null,
  financing_amount    numeric(14,2) not null,
  credit_type         text not null check (credit_type in ('french', 'smart', 'both')),
  term_years          integer not null,
  monthly_rate        numeric(8,6) not null,
  monthly_payment     numeric(14,2),
  balloon_payment     numeric(14,2),
  quote_data_snapshot jsonb not null,
  pdf_path            text,
  created_by          uuid references auth.users(id),
  created_at          timestamptz not null default now()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
create index on towers (project_id);
create index on units (tower_id);
create index on units (typology_id);
create index on project_typologies (project_id);
create index on project_typologies (typology_id);
create index on role_permissions (role_id);
create index on user_roles (user_id);
create index on user_roles (role_id);
create index on clients (rut);
create index on clients (email);
create index on quotes (client_id);
create index on quotes (unit_id);
create index on quotes (created_by);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table currencies        enable row level security;
alter table projects          enable row level security;
alter table towers            enable row level security;
alter table typologies        enable row level security;
alter table project_typologies enable row level security;
alter table units             enable row level security;
alter table permissions       enable row level security;
alter table roles             enable row level security;
alter table role_permissions  enable row level security;
alter table user_profiles     enable row level security;
alter table user_roles        enable row level security;
alter table clients           enable row level security;
alter table quotes            enable row level security;

-- Función auxiliar: verifica si el usuario autenticado tiene un permiso
create or replace function has_permission(p_module text, p_action text)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from user_roles ur
    join role_permissions rp on rp.role_id = ur.role_id
    join permissions p on p.id = rp.permission_id
    where ur.user_id = auth.uid()
      and p.module = p_module
      and p.action = p_action
  );
$$;

-- Monedas: solo lectura para autenticados
create policy "currencies_select" on currencies
  for select to authenticated using (true);

-- Proyectos
create policy "projects_select" on projects
  for select to authenticated using (has_permission('projects', 'read'));
create policy "projects_insert" on projects
  for insert to authenticated with check (has_permission('projects', 'create'));
create policy "projects_update" on projects
  for update to authenticated using (has_permission('projects', 'edit'));
create policy "projects_delete" on projects
  for delete to authenticated using (has_permission('projects', 'delete'));

-- Torres
create policy "towers_select" on towers
  for select to authenticated using (has_permission('towers', 'read'));
create policy "towers_insert" on towers
  for insert to authenticated with check (has_permission('towers', 'create'));
create policy "towers_update" on towers
  for update to authenticated using (has_permission('towers', 'edit'));
create policy "towers_delete" on towers
  for delete to authenticated using (has_permission('towers', 'delete'));

-- Tipologías
create policy "typologies_select" on typologies
  for select to authenticated using (has_permission('typologies', 'read'));
create policy "typologies_insert" on typologies
  for insert to authenticated with check (has_permission('typologies', 'create'));
create policy "typologies_update" on typologies
  for update to authenticated using (has_permission('typologies', 'edit'));
create policy "typologies_delete" on typologies
  for delete to authenticated using (has_permission('typologies', 'delete'));

-- project_typologies: mismo permiso que tipologías
create policy "project_typologies_select" on project_typologies
  for select to authenticated using (has_permission('typologies', 'read'));
create policy "project_typologies_insert" on project_typologies
  for insert to authenticated with check (has_permission('typologies', 'edit'));
create policy "project_typologies_delete" on project_typologies
  for delete to authenticated using (has_permission('typologies', 'edit'));

-- Departamentos
create policy "units_select" on units
  for select to authenticated using (has_permission('units', 'read'));
create policy "units_insert" on units
  for insert to authenticated with check (has_permission('units', 'create'));
create policy "units_update" on units
  for update to authenticated using (has_permission('units', 'edit'));
create policy "units_delete" on units
  for delete to authenticated using (has_permission('units', 'delete'));

-- Permisos y roles: solo lectura para autenticados (gestión vía service_role)
create policy "permissions_select" on permissions
  for select to authenticated using (true);
create policy "roles_select" on roles
  for select to authenticated using (true);
create policy "role_permissions_select" on role_permissions
  for select to authenticated using (true);

-- Perfiles de usuario
create policy "user_profiles_select_own" on user_profiles
  for select to authenticated using (user_id = auth.uid() or has_permission('users', 'read'));
create policy "user_profiles_insert_own" on user_profiles
  for insert to authenticated with check (user_id = auth.uid());
create policy "user_profiles_update_own" on user_profiles
  for update to authenticated using (user_id = auth.uid() or has_permission('users', 'edit'));

-- Roles de usuario: solo lectura para sí mismo, gestión para admins
create policy "user_roles_select" on user_roles
  for select to authenticated using (user_id = auth.uid() or has_permission('users', 'read'));
create policy "user_roles_insert" on user_roles
  for insert to authenticated with check (has_permission('users', 'edit'));
create policy "user_roles_delete" on user_roles
  for delete to authenticated using (has_permission('users', 'edit'));

-- Clientes
create policy "clients_select" on clients
  for select to authenticated using (has_permission('clients', 'read'));
create policy "clients_insert" on clients
  for insert to authenticated with check (has_permission('clients', 'create'));
create policy "clients_update" on clients
  for update to authenticated using (has_permission('clients', 'edit'));
create policy "clients_delete" on clients
  for delete to authenticated using (has_permission('clients', 'delete'));

-- Cotizaciones: los vendedores ven las suyas, los admins ven todas
create policy "quotes_select_own" on quotes
  for select to authenticated
  using (
    (created_by = auth.uid() and has_permission('quotes', 'read'))
    or has_permission('quotes', 'read_all')
  );
create policy "quotes_insert" on quotes
  for insert to authenticated with check (has_permission('quotes', 'create'));

-- Trigger: crear perfil automáticamente al registrar usuario
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into user_profiles (user_id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
