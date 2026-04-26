-- ─── Enriquecimiento de triggers relacionales ────────────────────────────────
-- Los triggers de user_roles, role_permissions y client_assignments solo
-- guardaban UUIDs en el payload. Esta migración hace lookup en las tablas
-- relacionadas DENTRO del trigger (mismo SECURITY DEFINER) para persistir
-- el nombre legible junto al UUID.
-- COALESCE a NULL si no se encuentra — nunca abortar la operación auditada.

-- ─── Trigger especializado: user_roles → entity 'users' ──────────────────────
CREATE OR REPLACE FUNCTION audit_user_roles_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth AS $$
DECLARE
  v_role_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT name INTO v_role_name FROM roles WHERE id = NEW.role_id LIMIT 1;
    INSERT INTO audit_log (entity_type, entity_id, action, actor_id, payload)
    VALUES ('users', NEW.user_id, 'role_assigned', resolve_audit_actor(),
            jsonb_build_object('role_id', NEW.role_id, 'role_name', v_role_name));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT name INTO v_role_name FROM roles WHERE id = OLD.role_id LIMIT 1;
    INSERT INTO audit_log (entity_type, entity_id, action, actor_id, payload)
    VALUES ('users', OLD.user_id, 'role_removed', resolve_audit_actor(),
            jsonb_build_object('role_id', OLD.role_id, 'role_name', v_role_name));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- ─── Trigger especializado: role_permissions → entity 'roles' ────────────────
CREATE OR REPLACE FUNCTION audit_role_permissions_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth AS $$
DECLARE
  v_module text;
  v_action text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT module, action INTO v_module, v_action
      FROM permissions WHERE id = NEW.permission_id LIMIT 1;
    INSERT INTO audit_log (entity_type, entity_id, action, actor_id, payload)
    VALUES ('roles', NEW.role_id, 'permission_added', resolve_audit_actor(),
            jsonb_build_object('permission_id', NEW.permission_id,
                               'module', v_module,
                               'permission_action', v_action));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT module, action INTO v_module, v_action
      FROM permissions WHERE id = OLD.permission_id LIMIT 1;
    INSERT INTO audit_log (entity_type, entity_id, action, actor_id, payload)
    VALUES ('roles', OLD.role_id, 'permission_removed', resolve_audit_actor(),
            jsonb_build_object('permission_id', OLD.permission_id,
                               'module', v_module,
                               'permission_action', v_action));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- ─── Trigger especializado: client_assignments → entity 'clients' ────────────
CREATE OR REPLACE FUNCTION audit_client_assignments_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth AS $$
DECLARE
  v_user_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT full_name INTO v_user_name
      FROM user_profiles WHERE user_id = NEW.user_id
      LIMIT 1;
    INSERT INTO audit_log (entity_type, entity_id, action, actor_id, payload)
    VALUES ('clients', NEW.client_id, 'assignment_added', resolve_audit_actor(),
            jsonb_build_object('user_id', NEW.user_id,
                               'user_name', v_user_name,
                               'assignment_type', NEW.assignment_type));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT full_name INTO v_user_name
      FROM user_profiles WHERE user_id = OLD.user_id
      LIMIT 1;
    INSERT INTO audit_log (entity_type, entity_id, action, actor_id, payload)
    VALUES ('clients', OLD.client_id, 'assignment_removed', resolve_audit_actor(),
            jsonb_build_object('user_id', OLD.user_id,
                               'user_name', v_user_name,
                               'assignment_type', OLD.assignment_type));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
