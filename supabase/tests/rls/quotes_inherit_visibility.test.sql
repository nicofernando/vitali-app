-- Tests: visibilidad de quotes heredada de client_assignments
-- Nota: existe quotes_select_own (vía created_by) de sprint anterior.
-- Para los tests de "no visible", el vendor de prueba no es el creador de la quote.
BEGIN;
SELECT plan(4);

-- ── Setup ─────────────────────────────────────────────────────
INSERT INTO auth.users (id, email, aud, role)
VALUES
  ('00000000-0000-0000-0011-000000000001', 'sv-admin@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0011-000000000002', 'sv-vendor-ok@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0011-000000000003', 'sv-vendor-no@test.local', 'authenticated', 'authenticated');

INSERT INTO roles (id, name, is_system) VALUES
  ('00000000-0000-0000-0012-000000000001', 'SV Admin Role', false),
  ('00000000-0000-0000-0012-000000000002', 'SV Vendor Role', false);

-- Admin: quotes.read_all
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0012-000000000001', id FROM permissions WHERE module = 'quotes' AND action = 'read_all';

-- Vendor: quotes.read + quotes.create + clients.read_own
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0012-000000000002', id FROM permissions WHERE module = 'quotes' AND action IN ('read', 'create');

INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0012-000000000002', id FROM permissions WHERE module = 'clients' AND action = 'read_own';

INSERT INTO user_roles (user_id, role_id) VALUES
  ('00000000-0000-0000-0011-000000000001', '00000000-0000-0000-0012-000000000001'),
  ('00000000-0000-0000-0011-000000000002', '00000000-0000-0000-0012-000000000002'),
  ('00000000-0000-0000-0011-000000000003', '00000000-0000-0000-0012-000000000002');

-- Proyecto, torre, unidad necesarios para la FK de quotes
INSERT INTO currencies (id, code, name, symbol, decimal_places)
VALUES ('00000000-0000-0000-0015-000000000001', 'CLP', 'Peso CL', '$', 0);

INSERT INTO projects (id, name, currency_id, annual_interest_rate, french_credit_enabled, smart_credit_enabled)
VALUES ('00000000-0000-0000-0013-000000000001', 'Test Project', '00000000-0000-0000-0015-000000000001', 6.0, true, false);

INSERT INTO towers (id, project_id, name, max_financing_years, min_pie_percentage)
VALUES ('00000000-0000-0000-0013-000000000002', '00000000-0000-0000-0013-000000000001', 'Torre Test', 20, 20);

INSERT INTO typologies (id, name, surface_m2)
VALUES ('00000000-0000-0000-0013-000000000003', 'Tipo Test', 50);

INSERT INTO units (id, tower_id, typology_id, unit_number, list_price)
VALUES ('00000000-0000-0000-0013-000000000004', '00000000-0000-0000-0013-000000000002', '00000000-0000-0000-0013-000000000003', '101', 100000);

-- Cliente y quote creados por admin (no por los vendors de prueba)
INSERT INTO clients (id, full_name, phone_country_code, created_by)
VALUES ('00000000-0000-0000-0014-000000000001', 'Cliente SV', '+56', '00000000-0000-0000-0011-000000000001');

INSERT INTO quotes (id, client_id, unit_id, pie_percentage, pie_amount, financing_amount,
                    credit_type, term_years, monthly_rate, quote_data_snapshot, created_by)
VALUES ('00000000-0000-0000-0014-000000000002',
        '00000000-0000-0000-0014-000000000001',
        '00000000-0000-0000-0013-000000000004',
        20, 20000, 80000, 'french', 20, 0.005, '{}',
        '00000000-0000-0000-0011-000000000001');

-- Asignar cliente solo al vendor-ok
INSERT INTO client_assignments (client_id, user_id, assignment_type, assigned_by)
VALUES ('00000000-0000-0000-0014-000000000001', '00000000-0000-0000-0011-000000000002', 'vendedor', '00000000-0000-0000-0011-000000000001');

-- ── Test 1: vendor CON assignment ve la quote ────────────────
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0011-000000000002';

SELECT ok(
  EXISTS(SELECT 1 FROM quotes WHERE id = '00000000-0000-0000-0014-000000000002'),
  'vendor con assignment al cliente ve la quote'
);

-- ── Test 2: vendor SIN assignment NO ve la quote ─────────────
-- vendor-no no es el creator ni tiene assignment
RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0011-000000000003';

SELECT ok(
  NOT EXISTS(SELECT 1 FROM quotes WHERE id = '00000000-0000-0000-0014-000000000002'),
  'vendor sin assignment al cliente NO ve la quote'
);

-- ── Test 3: INSERT falla si vendor no tiene assignment al cliente ─
SELECT throws_ok(
  $$INSERT INTO quotes (client_id, unit_id, pie_percentage, pie_amount, financing_amount,
                        credit_type, term_years, monthly_rate, quote_data_snapshot)
    VALUES ('00000000-0000-0000-0014-000000000001',
            '00000000-0000-0000-0013-000000000004',
            20, 20000, 80000, 'french', 20, 0.005, '{}')$$,
  '42501',
  'INSERT de quote falla si vendor no tiene assignment al cliente'
);

-- ── Test 4: INSERT OK si vendor tiene assignment al cliente ───
RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0011-000000000002';

SELECT lives_ok(
  $$INSERT INTO quotes (client_id, unit_id, pie_percentage, pie_amount, financing_amount,
                        credit_type, term_years, monthly_rate, quote_data_snapshot)
    VALUES ('00000000-0000-0000-0014-000000000001',
            '00000000-0000-0000-0013-000000000004',
            20, 20000, 80000, 'french', 20, 0.005, '{}')$$,
  'INSERT de quote OK cuando vendor tiene assignment al cliente'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
