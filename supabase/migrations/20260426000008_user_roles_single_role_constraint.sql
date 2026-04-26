-- UNIQUE constraint: un usuario solo puede tener un rol activo
-- Pre-check: SELECT user_id, count(*) FROM user_roles GROUP BY user_id HAVING count(*) > 1
-- debe retornar vacío antes de ejecutar esta migración.
ALTER TABLE user_roles
  ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);

-- assign_role: SWAP atómico. DELETE existing + INSERT new.
-- Permite cambiar de rol sin intermediate state con 0 roles.
CREATE OR REPLACE FUNCTION assign_role(p_user_id uuid, p_role_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth AS $$
BEGIN
  IF NOT has_permission('users', 'edit') THEN
    RAISE EXCEPTION 'No autorizado' USING errcode = '42501';
  END IF;
  DELETE FROM user_roles WHERE user_id = p_user_id;
  INSERT INTO user_roles (user_id, role_id) VALUES (p_user_id, p_role_id);
END;
$$;
