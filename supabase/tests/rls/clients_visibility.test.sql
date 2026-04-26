-- Tests: visibilidad de clients según RLS
-- clients.read → ve todos
-- clients.read_own + client_assignments → ve solo los asignados
-- sin permisos → no ve nada
BEGIN;
SELECT plan(4);

-- ── Setup ─────────────────────────────────────────────────────
-- Usuarios
INSERT INTO auth.users (id, email, aud, role)
VALUES
  ('00000000-0000-0000-0001-000000000001', 'admin@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0001-000000000002', 'vendor-ok@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0001-000000000003', 'vendor-no@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0001-000000000004', 'noperms@test.local', 'authenticated', 'authenticated');

-- Roles
INSERT INTO roles (id, name, is_system) VALUES
  ('00000000-0000-0000-0002-000000000001', 'Test Admin', false),
  ('00000000-0000-0000-0002-000000000002', 'Test Vendor', false);

-- Permisos: admin → clients.read, vendor → clients.read_own
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0002-000000000001', id FROM permissions WHERE module = 'clients' AND action = 'read';

INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0002-000000000002', id FROM permissions WHERE module = 'clients' AND action = 'read_own';

-- Asignar roles
INSERT INTO user_roles (user_id, role_id) VALUES
  ('00000000-0000-0000-0001-000000000001', '00000000-0000-0000-0002-000000000001'),
  ('00000000-0000-0000-0001-000000000002', '00000000-0000-0000-0002-000000000002'),
  ('00000000-0000-0000-0001-000000000003', '00000000-0000-0000-0002-000000000002');

-- Clientes
INSERT INTO clients (id, full_name, phone_country_code, created_by)
VALUES
  ('00000000-0000-0000-0003-000000000001', 'Cliente Asignado', '+56', '00000000-0000-0000-0001-000000000001'),
  ('00000000-0000-0000-0003-000000000002', 'Cliente No Asignado', '+56', '00000000-0000-0000-0001-000000000001');

-- Asignar solo cliente-1 al vendor que tiene asignación
INSERT INTO client_assignments (client_id, user_id, assignment_type, assigned_by)
VALUES ('00000000-0000-0000-0003-000000000001', '00000000-0000-0000-0001-000000000002', 'vendedor', '00000000-0000-0000-0001-000000000001');

-- ── Test 1: vendor asignado VE su cliente ────────────────────
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0001-000000000002';

SELECT ok(
  EXISTS(SELECT 1 FROM clients WHERE id = '00000000-0000-0000-0003-000000000001'),
  'vendor con assignment ve su cliente asignado'
);

-- ── Test 2: vendor asignado NO ve cliente sin asignación ─────
SELECT ok(
  NOT EXISTS(SELECT 1 FROM clients WHERE id = '00000000-0000-0000-0003-000000000002'),
  'vendor con read_own NO ve cliente sin asignación'
);

-- ── Test 3: admin ve todos los clientes ──────────────────────
RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0001-000000000001';

SELECT is(
  (SELECT count(*)::int FROM clients WHERE id IN (
    '00000000-0000-0000-0003-000000000001',
    '00000000-0000-0000-0003-000000000002'
  )),
  2,
  'admin con clients.read ve ambos clientes'
);

-- ── Test 4: usuario sin permisos no ve nada ──────────────────
RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0001-000000000004';

SELECT is(
  (SELECT count(*)::int FROM clients WHERE id IN (
    '00000000-0000-0000-0003-000000000001',
    '00000000-0000-0000-0003-000000000002'
  )),
  0,
  'usuario sin permisos no ve ningún cliente'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
