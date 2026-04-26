-- Tests: triggers especializados de audit para tablas relacionales
-- user_roles → entity_type='users', action='role_assigned'/'role_removed'
-- role_permissions → entity_type='roles', action='permission_added'
-- client_assignments → entity_type='clients', action='assignment_added'
BEGIN;
SELECT plan(4);

-- ── Setup ─────────────────────────────────────────────────────
INSERT INTO auth.users (id, email, aud, role)
VALUES
  ('00000000-0000-0000-0051-000000000001', 'ast-admin@test.local', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0051-000000000002', 'ast-user@test.local', 'authenticated', 'authenticated');

INSERT INTO roles (id, name, is_system)
VALUES ('00000000-0000-0000-0052-000000000001', 'AST Test Role', false);

INSERT INTO clients (id, full_name, phone_country_code, created_by)
VALUES ('00000000-0000-0000-0053-000000000001', 'AST Cliente', '+56', '00000000-0000-0000-0051-000000000001');

-- ── Test 1: INSERT en user_roles → entry entity_type='users', action='role_assigned' ─
INSERT INTO user_roles (user_id, role_id)
VALUES ('00000000-0000-0000-0051-000000000002', '00000000-0000-0000-0052-000000000001');

SELECT ok(
  EXISTS(
    SELECT 1 FROM audit_log
    WHERE entity_type = 'users'
      AND entity_id = '00000000-0000-0000-0051-000000000002'
      AND action = 'role_assigned'
      AND payload->>'role_id' = '00000000-0000-0000-0052-000000000001'
  ),
  'INSERT en user_roles produce audit entry con entity_type=users y action=role_assigned'
);

-- ── Test 2: DELETE en user_roles → entry action='role_removed' ─
DELETE FROM user_roles
WHERE user_id = '00000000-0000-0000-0051-000000000002'
  AND role_id = '00000000-0000-0000-0052-000000000001';

SELECT ok(
  EXISTS(
    SELECT 1 FROM audit_log
    WHERE entity_type = 'users'
      AND entity_id = '00000000-0000-0000-0051-000000000002'
      AND action = 'role_removed'
  ),
  'DELETE en user_roles produce audit entry con action=role_removed'
);

-- ── Test 3: INSERT en role_permissions → entry entity_type='roles', action='permission_added' ─
INSERT INTO role_permissions (role_id, permission_id)
SELECT '00000000-0000-0000-0052-000000000001', id
FROM permissions WHERE module = 'clients' AND action = 'read'
LIMIT 1;

SELECT ok(
  EXISTS(
    SELECT 1 FROM audit_log
    WHERE entity_type = 'roles'
      AND entity_id = '00000000-0000-0000-0052-000000000001'
      AND action = 'permission_added'
  ),
  'INSERT en role_permissions produce audit entry con entity_type=roles y action=permission_added'
);

-- ── Test 4: INSERT en client_assignments → entry entity_type='clients', action='assignment_added' ─
INSERT INTO client_assignments (client_id, user_id, assignment_type, assigned_by)
VALUES ('00000000-0000-0000-0053-000000000001', '00000000-0000-0000-0051-000000000002', 'vendedor', '00000000-0000-0000-0051-000000000001');

SELECT ok(
  EXISTS(
    SELECT 1 FROM audit_log
    WHERE entity_type = 'clients'
      AND entity_id = '00000000-0000-0000-0053-000000000001'
      AND action = 'assignment_added'
      AND payload->>'user_id' = '00000000-0000-0000-0051-000000000002'
  ),
  'INSERT en client_assignments produce audit entry con entity_type=clients y action=assignment_added'
);

SELECT * FROM finish();
ROLLBACK;
