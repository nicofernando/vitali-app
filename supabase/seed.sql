-- ============================================================
-- vitali-app — Seed de desarrollo local
-- Datos sincronizados desde supabase-dev (QA) el 2026-04-08
-- Se ejecuta automáticamente en cada `supabase db reset`
--
-- DESPUÉS de cada db reset, ejecutar también:
--   bash supabase/scripts/seed-auth.sh
-- Eso crea el usuario nicolas@vitalisuites.com con Super Admin
-- ============================================================

-- ============================================================
-- MONEDAS
-- Reemplazamos las del migration con las UUIDs exactas de QA
-- para mantener consistencia entre entornos
-- ============================================================
truncate currencies cascade;

insert into currencies (id, code, name, symbol, decimal_places) values
  ('39265e1a-8bb0-47cd-83a2-c5d66ddbe65b', 'CLP', 'Peso chileno',                '$',  0),
  ('46c38fb6-5137-406b-885d-e1b40937096e', 'UF',  'Unidad de Fomento (Chile)',   'UF', 4),
  ('4c985b98-303d-4480-ae01-38bfa0473a6d', 'USD', 'Dólar',                       'US$', 2);

-- ============================================================
-- TIPOLOGÍAS
-- ============================================================
insert into typologies (id, name, surface_m2, description) values
  ('7e802d2a-a287-40ab-a799-aa4f69e1f441', 'armonia 30',              30.00, 'asdf'),
  ('9b79b83d-8292-49bd-bdf4-d0232fb61b2a', 'Sinfonia 28',             28.00, 'Habitacion monoambiente pequeña'),
  ('38da6156-b423-4822-be92-532a071a6016', 'Chicureo - Suite Armonía', 36.72, null),
  ('87399012-4d11-430e-94c3-b0edfbdc3c00', 'Chicureo - Suite Escencia 1', 28.80, null),
  ('9eecc46f-ba57-4c6c-bd44-3aab3e49c8a1', 'Chicureo - Suite Escencia 2', 26.38, null);

-- ============================================================
-- PROYECTOS
-- ============================================================
insert into projects (id, name, description, location, currency_id, annual_interest_rate, french_credit_enabled, smart_credit_enabled) values
  (
    '5d8964d0-d297-470d-84af-9548a1cfa34e',
    'VS Chicureo 1',
    'Proyecto de chicureo en terreno de Zilluruelo',
    'Chicureo, Chile',
    '46c38fb6-5137-406b-885d-e1b40937096e',
    0.0000,
    true,
    true
  ),
  (
    'e836d9bf-9bc5-46da-a869-b41ea067dc3a',
    'VS Concepción',
    'testing del proyecto de conce',
    'Concepción, Chile',
    '46c38fb6-5137-406b-885d-e1b40937096e',
    0.1200,
    true,
    true
  );

-- ============================================================
-- TORRES
-- ============================================================
insert into towers (id, project_id, name, description, delivery_date, max_financing_years, min_pie_percentage) values
  (
    '122ad114-6a7e-448e-91e7-777942ee5ef9',
    '5d8964d0-d297-470d-84af-9548a1cfa34e',
    'Tore 1',
    null,
    '2026-12-01',
    5,
    10.00
  ),
  (
    '76b780f0-ad84-4ac9-b530-db4a57313fd8',
    'e836d9bf-9bc5-46da-a869-b41ea067dc3a',
    'Torre 1',
    'primer edificio',
    '2030-12-31',
    10,
    10.00
  );

-- ============================================================
-- DEPARTAMENTOS
-- ============================================================
insert into units (id, tower_id, typology_id, unit_number, floor, list_price) values
  (
    '8c5671af-bf94-4986-b91f-06fb1326fa3e',
    '122ad114-6a7e-448e-91e7-777942ee5ef9',
    '7e802d2a-a287-40ab-a799-aa4f69e1f441',
    'depto 101',
    1,
    2475.00
  ),
  (
    'fa553cfd-bd35-489a-8540-af0d0c97d5ac',
    '76b780f0-ad84-4ac9-b530-db4a57313fd8',
    '9b79b83d-8292-49bd-bdf4-d0232fb61b2a',
    'Depto 101',
    1,
    2457.00
  ),
  (
    '541ef321-7c95-4875-a505-4f6aec70ae97',
    '76b780f0-ad84-4ac9-b530-db4a57313fd8',
    '7e802d2a-a287-40ab-a799-aa4f69e1f441',
    'Depto 202',
    12,
    2758.00
  );
