-- ============================================================
-- Vendedor: agregar permiso quotes.read_all
-- ============================================================
-- Por ahora todos los vendedores ven TODAS las cotizaciones (no solo las propias).
-- Cuando se implemente cartera por vendedor (CRM), se puede revertir o atomizar.
insert into role_permissions (role_id, permission_id)
select
  (select id from roles where name = 'Vendedor'),
  (select id from permissions where module = 'quotes' and action = 'read_all')
on conflict do nothing;
