-- Tests: seguridad del audit_log
-- - INSERT directo falla (sin policy INSERT)
-- - audit.read ve todos
-- - audit.read_own ve solo entidades accesibles
-- - sin permisos audit → vacío
BEGIN;
SELECT plan(4);

-- ── Setup ─────────────────────────────────────────────────────
INSERT INTO auth.users (id, email, aud, role)
VALUES
  ('00000000-0000-0000-0031-000000000001', 'als-superaudit@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0031-000000000002', 'als-ownaudit@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0031-000000000003', 'als-noaudit@test.local', 'authenticated', 'authenticated');

INSERT INTO roles (id, name, is_system) VALUES
  ('00000000-0000-0000-0032-000000000001', 'ALS Full Audit', false),
  ('00000000-0000-0000-0032-000000000002', 'ALS Own Audit', false);

-- audit.read para superaudit
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0032-000000000001', id FROM permissions WHERE module = 'audit' AND action = 'read';

-- audit.read_own + clients.read_own para ownaudit
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0032-000000000002', id
FROM permissions
WHERE (module = 'audit' AND action = 'read_own')
   OR (module = 'clients' AND action = 'read_own');

INSERT INTO user_roles (user_id, role_id) VALUES
  ('00000000-0000-0000-0031-000000000001', '00000000-0000-0000-0032-000000000001'),
  ('00000000-0000-0000-0031-000000000002', '00000000-0000-0000-0032-000000000002');

-- Cliente asignado al usuario ownaudit
INSERT INTO clients (id, full_name, phone_country_code, created_by)
VALUES ('00000000-0000-0000-0033-000000000001', 'ALS Cliente', '+56', '00000000-0000-0000-0031-000000000001');

INSERT INTO client_assignments (client_id, user_id, assignment_type, assigned_by)
VALUES ('00000000-0000-0000-0033-000000000001', '00000000-0000-0000-0031-000000000002', 'vendedor', '00000000-0000-0000-0031-000000000001');

-- Insertar audit entries (como postgres, simulando triggers)
INSERT INTO audit_log (id, entity_type, entity_id, action, actor_id, payload)
VALUES
  ('00000000-0000-0000-0034-000000000001', 'clients', '00000000-0000-0000-0033-000000000001', 'create', '00000000-0000-0000-0031-000000000001', '{}'),
  ('00000000-0000-0000-0034-000000000002', 'roles', gen_random_uuid(), 'create', '00000000-0000-0000-0031-000000000001', '{}');

-- ── Test 1: INSERT directo en audit_log falla desde authenticated ─
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0031-000000000001';

SELECT throws_ok(
  $$INSERT INTO audit_log (entity_type, entity_id, action, actor_id, payload)
    VALUES ('clients', gen_random_uuid(), 'create', NULL, '{}')$$,
  '42501',
  'INSERT directo en audit_log falla — sin policy INSERT'
);

-- ── Test 2: audit.read ve todos los entries ───────────────────
RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0031-000000000001';

SELECT is(
  (SELECT count(*)::int FROM audit_log WHERE id IN (
    '00000000-0000-0000-0034-000000000001',
    '00000000-0000-0000-0034-000000000002'
  )),
  2,
  'usuario con audit.read ve todos los entries'
);

-- ── Test 3: audit.read_own ve solo entries de entidades accesibles ─
RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0031-000000000002';

-- Solo ve el entry del cliente asignado, NO el de roles (que no tiene acceso)
SELECT is(
  (SELECT count(*)::int FROM audit_log WHERE id IN (
    '00000000-0000-0000-0034-000000000001',
    '00000000-0000-0000-0034-000000000002'
  )),
  1,
  'usuario con audit.read_own ve solo entries de entidades accesibles'
);

-- ── Test 4: sin permisos audit → tabla vacía ─────────────────
RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0031-000000000003';

SELECT is(
  (SELECT count(*)::int FROM audit_log WHERE id IN (
    '00000000-0000-0000-0034-000000000001',
    '00000000-0000-0000-0034-000000000002'
  )),
  0,
  'usuario sin permisos audit no ve ningún entry'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
