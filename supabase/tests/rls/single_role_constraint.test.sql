-- Tests: restricción de un único rol por usuario
-- - INSERT segundo rol para mismo user_id falla con UNIQUE violation
-- - assign_role hace SWAP correctamente
BEGIN;
SELECT plan(4);

-- ── Setup ─────────────────────────────────────────────────────
INSERT INTO auth.users (id, email, aud, role)
VALUES
  ('00000000-0000-0000-0061-000000000001', 'src-admin@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0061-000000000002', 'src-user@test.local', 'authenticated', 'authenticated');

INSERT INTO roles (id, name, is_system) VALUES
  ('00000000-0000-0000-0062-000000000001', 'SRC Role A', false),
  ('00000000-0000-0000-0062-000000000002', 'SRC Role B', false),
  ('00000000-0000-0000-0062-000000000003', 'SRC Admin', false);

-- Admin necesita users.edit para llamar assign_role
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0062-000000000003', id FROM permissions WHERE module = 'users' AND action = 'edit';

INSERT INTO user_roles (user_id, role_id) VALUES
  ('00000000-0000-0000-0061-000000000001', '00000000-0000-0000-0062-000000000003'),
  ('00000000-0000-0000-0061-000000000002', '00000000-0000-0000-0062-000000000001');

-- ── Test 1: INSERT segundo rol para mismo user_id falla ───────
SELECT throws_ok(
  $$INSERT INTO user_roles (user_id, role_id)
    VALUES ('00000000-0000-0000-0061-000000000002', '00000000-0000-0000-0062-000000000002')$$,
  '23505',
  'INSERT segundo rol para mismo user_id falla con unique violation'
);

-- ── Test 2: assign_role hace SWAP — usuario termina con exactamente 1 rol ─
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0061-000000000001';

SELECT lives_ok(
  $$SELECT assign_role('00000000-0000-0000-0061-000000000002'::uuid, '00000000-0000-0000-0062-000000000002'::uuid)$$,
  'assign_role ejecuta sin error aunque el usuario ya tenía un rol'
);

-- ── Test 3: después del SWAP el usuario tiene exactamente 1 rol ─
RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM user_roles WHERE user_id = '00000000-0000-0000-0061-000000000002'),
  1,
  'después del assign_role el usuario tiene exactamente 1 rol (SWAP)'
);

SELECT is(
  (SELECT role_id::text FROM user_roles WHERE user_id = '00000000-0000-0000-0061-000000000002'),
  '00000000-0000-0000-0062-000000000002',
  'el nuevo rol asignado es el correcto'
);

SELECT * FROM finish();
ROLLBACK;
