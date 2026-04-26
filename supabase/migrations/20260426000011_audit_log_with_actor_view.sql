-- ─── Vista audit_log_with_actor ──────────────────────────────────────────────
-- Agrega full_name del actor (desde user_profiles) al audit_log.
-- security_invoker = true: la vista hereda las políticas RLS del llamador,
-- por lo que la policy "audit_log_select" (can_view_audit_entry) sigue activa.
CREATE OR REPLACE VIEW audit_log_with_actor
WITH (security_invoker = true) AS
SELECT
  al.id,
  al.entity_type,
  al.entity_id,
  al.action,
  al.actor_id,
  up.full_name AS actor_name,
  al.payload,
  al.created_at
FROM audit_log al
LEFT JOIN user_profiles up ON up.user_id = al.actor_id;
