-- ============================================================
-- vitali-app — S2: Cotización en PDF
-- Columnas adicionales, triggers, extensiones y RPCs
-- ============================================================

-- ============================================================
-- EXTENSIONES
-- ============================================================
create extension if not exists pg_trgm;

-- ============================================================
-- QUOTES — columnas adicionales
-- ============================================================
alter table quotes
  add column if not exists status text not null default 'draft'
    check (status in ('draft', 'sent', 'expired'));

alter table quotes
  add column if not exists smart_cuotas_percentage numeric(5,2);

-- ============================================================
-- TRIGGERS — set_created_by automático
-- ============================================================
create or replace function set_created_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

create trigger quotes_set_created_by
  before insert on quotes
  for each row execute function set_created_by();

create trigger clients_set_created_by
  before insert on clients
  for each row execute function set_created_by();

-- ============================================================
-- ÍNDICE — búsqueda difusa de clientes
-- ============================================================
create index if not exists clients_full_name_trgm_idx
  on clients using gin (full_name gin_trgm_ops);

-- ============================================================
-- RPC — search_clients
-- ============================================================
create or replace function search_clients(p_query text)
returns setof clients
language sql
security definer
stable
set search_path = public
as $$
  select *
  from clients
  where
    has_permission('clients', 'read')
    and (
      full_name ilike '%' || p_query || '%'
      or rut ilike '%' || p_query || '%'
      or similarity(full_name, p_query) > 0.2
    )
  order by similarity(full_name, p_query) desc, full_name
  limit 20;
$$;

-- ============================================================
-- RPC — get_quotes_with_details
-- ============================================================
create or replace function get_quotes_with_details()
returns table (
  id             uuid,
  status         text,
  credit_type    text,
  pie_percentage numeric,
  pie_amount     numeric,
  financing_amount numeric,
  term_years     integer,
  monthly_payment numeric,
  balloon_payment numeric,
  smart_cuotas_percentage numeric,
  pdf_path       text,
  created_at     timestamptz,
  created_by     uuid,
  client_id      uuid,
  client_name    text,
  client_rut     text,
  unit_id        uuid,
  unit_number    text,
  floor          integer,
  list_price     numeric,
  tower_id       uuid,
  tower_name     text,
  project_id     uuid,
  project_name   text,
  currency_symbol text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    q.id,
    q.status,
    q.credit_type,
    q.pie_percentage,
    q.pie_amount,
    q.financing_amount,
    q.term_years,
    q.monthly_payment,
    q.balloon_payment,
    q.smart_cuotas_percentage,
    q.pdf_path,
    q.created_at,
    q.created_by,
    q.client_id,
    c.full_name  as client_name,
    c.rut        as client_rut,
    u.id         as unit_id,
    u.unit_number,
    u.floor,
    u.list_price,
    t.id         as tower_id,
    t.name       as tower_name,
    p.id         as project_id,
    p.name       as project_name,
    cur.symbol   as currency_symbol
  from quotes q
  join clients c  on c.id = q.client_id
  join units u    on u.id = q.unit_id
  join towers t   on t.id = u.tower_id
  join projects p on p.id = t.project_id
  join currencies cur on cur.id = p.currency_id
  where
    (q.created_by = auth.uid() and has_permission('quotes', 'read'))
    or has_permission('quotes', 'read_all')
  order by q.created_at desc;
$$;

-- ============================================================
-- STORAGE — políticas para buckets templates y quotes
-- Nota: los buckets se crean desde el dashboard o script aparte
-- ============================================================

-- templates: lectura para usuarios con settings.read
create policy "templates_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'templates'
    and has_permission('settings', 'read')
  );

create policy "templates_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'templates'
    and has_permission('settings', 'edit')
  );

create policy "templates_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'templates'
    and has_permission('settings', 'edit')
  );

create policy "templates_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'templates'
    and has_permission('settings', 'edit')
  );

-- quotes: el owner ve su PDF, admins ven todos
create policy "quotes_objects_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'quotes'
    and (
      (auth.uid()::text = (storage.foldername(name))[1] and has_permission('quotes', 'read'))
      or has_permission('quotes', 'read_all')
    )
  );

create policy "quotes_objects_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'quotes'
    and has_permission('quotes', 'create')
  );
