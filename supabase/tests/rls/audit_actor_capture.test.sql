-- Tests: captura del actor en audit_log
-- - Trigger captura auth.uid() cuando hay JWT (usuario autenticado)
-- - Trigger captura app.audit_actor_id cuando auth.uid() IS NULL (Edge Function service role)
BEGIN;
SELECT plan(2);

-- ── Setup ─────────────────────────────────────────────────────
INSERT INTO auth.users (id, email, aud, role)
VALUES ('00000000-0000-0000-0041-000000000001', 'aac-user@test.local', 'authenticated', 'authenticated');

INSERT INTO roles (id, name, is_system) VALUES
  ('00000000-0000-0000-0042-000000000001', 'AAC Role', false);

-- ── Test 1: trigger captura auth.uid() cuando hay JWT ────────
-- Simular usuario autenticado insertando en una tabla con trigger de audit
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0041-000000000001';

-- Insertar en roles directamente (como postgres tenemos permisos)
-- Para probar el trigger, necesitamos hacer la operación como postgres pero con JWT set
RESET ROLE;
SET LOCAL "request.jwt.claim.sub" = '00000000-0000-0000-0041-000000000001';

INSERT INTO roles (id, name, is_system)
VALUES ('00000000-0000-0000-0042-000000000002', 'AAC Trigger Test Role', false);

SELECT is(
  (SELECT actor_id::text FROM audit_log
   WHERE entity_type = 'roles'
     AND entity_id = '00000000-0000-0000-0042-000000000002'
     AND action = 'create'),
  '00000000-0000-0000-0041-000000000001',
  'trigger captura auth.uid() cuando el JWT está presente'
);

-- ── Test 2: trigger captura app.audit_actor_id cuando auth.uid() IS NULL ─
-- Simular Edge Function: sin JWT, con session config
SET LOCAL "request.jwt.claim.sub" = '';
SET LOCAL "app.audit_actor_id" = '00000000-0000-0000-0041-000000000001';

INSERT INTO roles (id, name, is_system)
VALUES ('00000000-0000-0000-0042-000000000003', 'AAC Service Role Test', false);

SELECT is(
  (SELECT actor_id::text FROM audit_log
   WHERE entity_type = 'roles'
     AND entity_id = '00000000-0000-0000-0042-000000000003'
     AND action = 'create'),
  '00000000-0000-0000-0041-000000000001',
  'trigger captura app.audit_actor_id cuando auth.uid() es NULL (service role)'
);

SELECT * FROM finish();
ROLLBACK;
