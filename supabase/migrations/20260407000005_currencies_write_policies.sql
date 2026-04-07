-- Fix: currencies solo tenía policy SELECT, las escrituras eran bloqueadas por RLS
-- Se usa settings.edit porque currencies es configuración del sistema

create policy "currencies_insert" on currencies
  for insert to authenticated with check (has_permission('settings', 'edit'));

create policy "currencies_update" on currencies
  for update to authenticated using (has_permission('settings', 'edit'));

create policy "currencies_delete" on currencies
  for delete to authenticated using (has_permission('settings', 'edit'));
