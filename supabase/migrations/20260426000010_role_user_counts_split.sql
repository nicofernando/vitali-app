-- ─── get_roles_with_permissions — split user_count en active + inactive ───────
-- Reemplaza user_count (bigint) por active_user_count e inactive_user_count
-- para que RolesView pueda mostrar dos badges y filtrar navegación a Users.
-- DROP explícito necesario porque cambia la firma del RETURNS TABLE.
DROP FUNCTION IF EXISTS get_roles_with_permissions();

CREATE OR REPLACE FUNCTION get_roles_with_permissions()
RETURNS TABLE (
  id                  uuid,
  name                text,
  description         text,
  is_system           boolean,
  created_at          timestamptz,
  permission_ids      uuid[],
  active_user_count   bigint,
  inactive_user_count bigint
)
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public AS $$
BEGIN
  IF NOT (has_permission('roles', 'read') OR has_permission('settings', 'edit')) THEN
    RAISE EXCEPTION 'No autorizado' USING errcode = '42501';
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.name,
    r.description,
    r.is_system,
    r.created_at,
    COALESCE(array_agg(rp.permission_id) FILTER (WHERE rp.permission_id IS NOT NULL), '{}') AS permission_ids,
    COUNT(DISTINCT ur.user_id) FILTER (WHERE up.is_active IS TRUE)  AS active_user_count,
    COUNT(DISTINCT ur.user_id) FILTER (WHERE up.is_active IS FALSE) AS inactive_user_count
  FROM roles r
  LEFT JOIN role_permissions rp ON rp.role_id = r.id
  LEFT JOIN user_roles ur ON ur.role_id = r.id
  LEFT JOIN user_profiles up ON up.user_id = ur.user_id
  GROUP BY r.id, r.name, r.description, r.is_system, r.created_at
  ORDER BY r.created_at;
END;
$$;
