-- Quotes heredan visibilidad del cliente vía client_assignments.
-- SELECT, INSERT y UPDATE quedan encadenados al assignment del cliente.

-- ─── SELECT ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "quotes_select" ON quotes;
CREATE POLICY "quotes_select" ON quotes
  FOR SELECT TO authenticated USING (
    has_permission('quotes', 'read_all')
    OR (
      has_permission('quotes', 'read')
      AND EXISTS (
        SELECT 1 FROM client_assignments ca
        WHERE ca.client_id = quotes.client_id AND ca.user_id = auth.uid()
      )
    )
  );

-- ─── INSERT ───────────────────────────────────────────────────────────────────
-- Cierra el hueco: vendedor no puede cotizar para cliente que no tiene asignado.
DROP POLICY IF EXISTS "quotes_insert" ON quotes;
CREATE POLICY "quotes_insert" ON quotes
  FOR INSERT TO authenticated WITH CHECK (
    has_permission('quotes', 'create')
    AND (
      has_permission('quotes', 'read_all')
      OR EXISTS (
        SELECT 1 FROM client_assignments ca
        WHERE ca.client_id = quotes.client_id AND ca.user_id = auth.uid()
      )
    )
  );

-- ─── UPDATE ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "quotes_update" ON quotes;
CREATE POLICY "quotes_update" ON quotes
  FOR UPDATE TO authenticated USING (
    has_permission('quotes', 'read_all')
    OR EXISTS (
      SELECT 1 FROM client_assignments ca
      WHERE ca.client_id = quotes.client_id AND ca.user_id = auth.uid()
    )
  );
