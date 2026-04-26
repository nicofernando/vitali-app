-- ─── Tabla de assignments de clientes ────────────────────────────────────────
CREATE TABLE client_assignments (
  client_id       uuid        NOT NULL REFERENCES clients(id)       ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  assignment_type text        NOT NULL DEFAULT 'vendedor',
  assigned_at     timestamptz NOT NULL DEFAULT now(),
  assigned_by     uuid        REFERENCES auth.users(id)             ON DELETE SET NULL,
  PRIMARY KEY (client_id, user_id, assignment_type)
);

CREATE INDEX client_assignments_user_idx   ON client_assignments (user_id);
CREATE INDEX client_assignments_client_idx ON client_assignments (client_id);

-- ─── Auto-asignación del creador ─────────────────────────────────────────────
-- Siempre se asigna el creator — sin filtros por rol.
-- Si en el futuro el creator baja a un rol con clients.read_own, conserva acceso.
-- Admins con clients.read ven todos igualmente — la asignación es invisible para ellos.
CREATE OR REPLACE FUNCTION auto_assign_client_creator()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO client_assignments (client_id, user_id, assignment_type, assigned_by)
    VALUES (NEW.id, NEW.created_by, 'vendedor', NEW.created_by)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER clients_auto_assign
  AFTER INSERT ON clients
  FOR EACH ROW EXECUTE FUNCTION auto_assign_client_creator();

-- ─── Backfill: todos los clientes existentes ─────────────────────────────────
INSERT INTO client_assignments (client_id, user_id, assignment_type, assigned_by)
SELECT id, created_by, 'vendedor', created_by
FROM clients
WHERE created_by IS NOT NULL
ON CONFLICT DO NOTHING;

-- ─── RLS: clients SELECT (reemplaza policy anterior) ─────────────────────────
DROP POLICY IF EXISTS "clients_select" ON clients;
CREATE POLICY "clients_select" ON clients
  FOR SELECT TO authenticated USING (
    has_permission('clients', 'read')
    OR (
      has_permission('clients', 'read_own')
      AND EXISTS (
        SELECT 1 FROM client_assignments ca
        WHERE ca.client_id = clients.id AND ca.user_id = auth.uid()
      )
    )
  );

-- ─── RLS en client_assignments ───────────────────────────────────────────────
ALTER TABLE client_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_assignments_select" ON client_assignments
  FOR SELECT TO authenticated USING (
    has_permission('clients', 'read')
    OR (has_permission('clients', 'read_own') AND user_id = auth.uid())
  );

CREATE POLICY "client_assignments_insert" ON client_assignments
  FOR INSERT TO authenticated WITH CHECK (has_permission('clients', 'edit'));

CREATE POLICY "client_assignments_delete" ON client_assignments
  FOR DELETE TO authenticated USING (has_permission('clients', 'edit'));
