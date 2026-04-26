-- Tests: protección de roles (is_system, usuarios asignados, sin RPC directo)
BEGIN;
SELECT plan(3);

-- ── Setup ─────────────────────────────────────────────────────
INSERT INTO auth.users (id, email, aud, role)
VALUES ('00000000-0000-0000-0021-000000000001', 'rp-admin@test.local', 'authenticated', 'authenticated');

-- Rol con settings.edit (puede llamar RPCs de gestión de roles)
INSERT INTO roles (id, name, is_system) VALUES
  ('00000000-0000-0000-0022-000000000001', 'RP Admin', false),
  ('00000000-0000-0000-0022-000000000002', 'RP System Test', true),   -- is_system
  ('00000000-0000-0000-0022-000000000003', 'RP Deletable', false);    -- con usuario asignado

INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0022-000000000001', id FROM permissions WHERE module = 'settings' AND action = 'edit';

-- Usuario con roles asignados al rol "deletable"
INSERT INTO auth.users (id, email, aud, role)
VALUES ('00000000-0000-0000-0021-000000000002', 'rp-assigned@test.local', 'authenticated', 'authenticated');

INSERT INTO user_roles (user_id, role_id) VALUES
  ('00000000-0000-0000-0021-000000000001', '00000000-0000-0000-0022-000000000001'),
  ('00000000-0000-0000-0021-000000000002', '00000000-0000-0000-0022-000000000003');

-- ── Test 1: UPDATE directo en roles falla (no hay UPDATE policy) ─
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0021-000000000001';

SELECT throws_ok(
  $$UPDATE roles SET name = 'Hacked' WHERE id = '00000000-0000-0000-0022-000000000002'$$,
  '42501',
  'UPDATE directo en roles falla — no existe policy UPDATE'
);

-- ── Test 2: RPC update_role bloquea roles is_system ──────────
RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0021-000000000001';

SELECT throws_ok(
  $$SELECT update_role('00000000-0000-0000-0022-000000000002'::uuid, 'Hacked', null, ARRAY[]::uuid[])$$,
  'P0001',
  'update_role lanza excepción al intentar modificar rol is_system'
);

-- ── Test 3: RPC delete_role bloquea si hay usuarios asignados ─
RESET ROLE;
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0021-000000000001';

SELECT throws_ok(
  $$SELECT delete_role('00000000-0000-0000-0022-000000000003'::uuid)$$,
  'P0001',
  'delete_role lanza excepción cuando el rol tiene usuarios asignados'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
