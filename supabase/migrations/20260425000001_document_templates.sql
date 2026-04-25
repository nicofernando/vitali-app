-- ============================================================
-- vitali-app — Motor de Documentos
-- Tabla document_templates + RLS
-- ============================================================

create table if not exists document_templates (
  id            uuid default gen_random_uuid() primary key,
  name          text not null,
  description   text,
  storage_path  text not null,
  context_needs text[] not null default '{}',
  -- Valores válidos: 'cliente','proyecto','torre','unidad',
  --                  'cotizacion','credito_frances','credito_inteligente'
  is_active     boolean not null default true,
  version       integer not null default 1,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz default now() not null,
  updated_at    timestamptz default now() not null
);

alter table document_templates enable row level security;

create trigger document_templates_set_created_by
  before insert on document_templates
  for each row execute function set_created_by();

-- Usuarios con settings.read pueden ver las plantillas
create policy "document_templates_select" on document_templates
  for select to authenticated using (has_permission('settings', 'read'));

-- Usuarios con settings.edit pueden gestionar las plantillas
create policy "document_templates_insert" on document_templates
  for insert to authenticated with check (has_permission('settings', 'edit'));

create policy "document_templates_update" on document_templates
  for update to authenticated using (has_permission('settings', 'edit'));

create policy "document_templates_delete" on document_templates
  for delete to authenticated using (has_permission('settings', 'edit'));
