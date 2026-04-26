-- ─── get_roles_with_permissions ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_roles_with_permissions()
RETURNS TABLE (
  id             uuid,
  name           text,
  description    text,
  is_system      boolean,
  created_at     timestamptz,
  permission_ids uuid[],
  user_count     bigint
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
    COUNT(DISTINCT ur.user_id) AS user_count
  FROM roles r
  LEFT JOIN role_permissions rp ON rp.role_id = r.id
  LEFT JOIN user_roles ur ON ur.role_id = r.id
  GROUP BY r.id, r.name, r.description, r.is_system, r.created_at
  ORDER BY r.created_at;
END;
$$;

-- ─── create_role ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_role(
  p_name           text,
  p_description    text,
  p_permission_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_role_id uuid;
BEGIN
  IF NOT has_permission('settings', 'edit') THEN
    RAISE EXCEPTION 'No autorizado' USING errcode = '42501';
  END IF;
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'El nombre del rol es requerido';
  END IF;

  INSERT INTO roles (name, description, is_system)
  VALUES (trim(p_name), p_description, false)
  RETURNING id INTO v_role_id;

  IF p_permission_ids IS NOT NULL AND array_length(p_permission_ids, 1) > 0 THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_role_id, unnest(p_permission_ids)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN v_role_id;
END;
$$;

-- ─── update_role ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_role(
  p_role_id        uuid,
  p_name           text,
  p_description    text,
  p_permission_ids uuid[]
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_is_system boolean;
BEGIN
  IF NOT has_permission('settings', 'edit') THEN
    RAISE EXCEPTION 'No autorizado' USING errcode = '42501';
  END IF;

  SELECT is_system INTO v_is_system FROM roles WHERE id = p_role_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rol no encontrado';
  END IF;
  IF v_is_system THEN
    RAISE EXCEPTION 'Los roles del sistema no se pueden modificar';
  END IF;
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'El nombre del rol es requerido';
  END IF;

  UPDATE roles SET name = trim(p_name), description = p_description WHERE id = p_role_id;

  -- Reemplazar permisos atómicamente
  DELETE FROM role_permissions WHERE role_id = p_role_id;
  IF p_permission_ids IS NOT NULL AND array_length(p_permission_ids, 1) > 0 THEN
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT p_role_id, unnest(p_permission_ids)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- ─── delete_role ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION delete_role(p_role_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_is_system boolean;
  v_user_count bigint;
BEGIN
  IF NOT has_permission('settings', 'edit') THEN
    RAISE EXCEPTION 'No autorizado' USING errcode = '42501';
  END IF;

  SELECT is_system INTO v_is_system FROM roles WHERE id = p_role_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rol no encontrado';
  END IF;
  IF v_is_system THEN
    RAISE EXCEPTION 'Los roles del sistema no se pueden eliminar';
  END IF;

  SELECT COUNT(*) INTO v_user_count FROM user_roles WHERE role_id = p_role_id;
  IF v_user_count > 0 THEN
    RAISE EXCEPTION 'No se puede eliminar: % usuario(s) tienen este rol asignado', v_user_count;
  END IF;

  DELETE FROM role_permissions WHERE role_id = p_role_id;
  DELETE FROM roles WHERE id = p_role_id;
END;
$$;
