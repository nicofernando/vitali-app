-- ─── Tabla de auditoría polimórfica ──────────────────────────────────────────
CREATE TABLE audit_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text        NOT NULL,
  entity_id   uuid        NOT NULL,
  action      text        NOT NULL,
  actor_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  payload     jsonb       NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_log_entity_idx  ON audit_log (entity_type, entity_id, created_at DESC);
CREATE INDEX audit_log_actor_idx   ON audit_log (actor_id, created_at DESC);
CREATE INDEX audit_log_created_idx ON audit_log (created_at DESC);
CREATE INDEX audit_log_action_idx  ON audit_log (action, created_at DESC);

-- ─── resolve_audit_actor: auth.uid() con fallback a session config ────────────
-- Edge Functions con service role pierden auth.uid(). Las funciones admin
-- llaman set_audit_actor(user.id) para que el trigger lo capture igualmente.
CREATE OR REPLACE FUNCTION resolve_audit_actor()
RETURNS uuid LANGUAGE plpgsql STABLE
SET search_path = public, auth AS $$
DECLARE
  v_actor uuid;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NOT NULL THEN
    RETURN v_actor;
  END IF;
  BEGIN
    v_actor := nullif(current_setting('app.audit_actor_id', true), '')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_actor := NULL;
  END;
  RETURN v_actor;
END;
$$;

-- RPC para Edge Functions con service role
CREATE OR REPLACE FUNCTION set_audit_actor(p_user_id uuid)
RETURNS void LANGUAGE sql AS $$
  SELECT set_config('app.audit_actor_id', p_user_id::text, true);
$$;

-- ─── Trigger genérico: tablas con `id uuid` ──────────────────────────────────
CREATE OR REPLACE FUNCTION audit_log_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth AS $$
DECLARE
  v_old     jsonb;
  v_new     jsonb;
  v_changed text[];
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (entity_type, entity_id, action, actor_id, payload)
    VALUES (TG_TABLE_NAME, NEW.id, 'create', resolve_audit_actor(),
            jsonb_build_object('after', to_jsonb(NEW)));
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    SELECT array_agg(key) INTO v_changed
    FROM jsonb_each(v_new)
    WHERE v_new -> key IS DISTINCT FROM v_old -> key;

    IF v_changed IS NOT NULL THEN
      INSERT INTO audit_log (entity_type, entity_id, action, actor_id, payload)
      VALUES (TG_TABLE_NAME, NEW.id, 'update', resolve_audit_actor(),
              jsonb_build_object('before', v_old, 'after', v_new, 'changed_fields', v_changed));
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (entity_type, entity_id, action, actor_id, payload)
    VALUES (TG_TABLE_NAME, OLD.id, 'delete', resolve_audit_actor(),
            jsonb_build_object('before', to_jsonb(OLD)));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- ─── Trigger especializado: user_roles → entity 'users' ──────────────────────
CREATE OR REPLACE FUNCTION audit_user_roles_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (entity_type, entity_id, action, actor_id, payload)
    VALUES ('users', NEW.user_id, 'role_assigned', resolve_audit_actor(),
            jsonb_build_object('role_id', NEW.role_id));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (entity_type, entity_id, action, actor_id, payload)
    VALUES ('users', OLD.user_id, 'role_removed', resolve_audit_actor(),
            jsonb_build_object('role_id', OLD.role_id));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- ─── Trigger especializado: role_permissions → entity 'roles' ────────────────
CREATE OR REPLACE FUNCTION audit_role_permissions_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (entity_type, entity_id, action, actor_id, payload)
    VALUES ('roles', NEW.role_id, 'permission_added', resolve_audit_actor(),
            jsonb_build_object('permission_id', NEW.permission_id));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (entity_type, entity_id, action, actor_id, payload)
    VALUES ('roles', OLD.role_id, 'permission_removed', resolve_audit_actor(),
            jsonb_build_object('permission_id', OLD.permission_id));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- ─── Trigger especializado: client_assignments → entity 'clients' ────────────
CREATE OR REPLACE FUNCTION audit_client_assignments_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (entity_type, entity_id, action, actor_id, payload)
    VALUES ('clients', NEW.client_id, 'assignment_added', resolve_audit_actor(),
            jsonb_build_object('user_id', NEW.user_id, 'assignment_type', NEW.assignment_type));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (entity_type, entity_id, action, actor_id, payload)
    VALUES ('clients', OLD.client_id, 'assignment_removed', resolve_audit_actor(),
            jsonb_build_object('user_id', OLD.user_id, 'assignment_type', OLD.assignment_type));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- ─── can_view_audit_entry: row-filter para RLS ───────────────────────────────
-- audit.read ve todo. audit.read_own filtra por acceso real a la entidad.
-- Sin esta función, audit.read_own sería una fuga de información.
CREATE OR REPLACE FUNCTION can_view_audit_entry(p_entity_type text, p_entity_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public, auth AS $$
BEGIN
  IF has_permission('audit', 'read') THEN RETURN true; END IF;
  IF NOT has_permission('audit', 'read_own') THEN RETURN false; END IF;

  CASE p_entity_type
    WHEN 'clients' THEN
      RETURN has_permission('clients', 'read') OR EXISTS (
        SELECT 1 FROM client_assignments
        WHERE client_id = p_entity_id AND user_id = auth.uid()
      );
    WHEN 'quotes' THEN
      RETURN has_permission('quotes', 'read_all') OR EXISTS (
        SELECT 1 FROM quotes q
        JOIN client_assignments ca ON ca.client_id = q.client_id
        WHERE q.id = p_entity_id AND ca.user_id = auth.uid()
      );
    WHEN 'users' THEN
      RETURN p_entity_id = auth.uid() OR has_permission('users', 'read');
    WHEN 'user_profiles' THEN
      RETURN p_entity_id = auth.uid() OR has_permission('users', 'read');
    WHEN 'roles' THEN
      RETURN has_permission('roles', 'read') OR has_permission('settings', 'read');
    WHEN 'projects', 'towers', 'typologies', 'units' THEN
      RETURN has_permission(p_entity_type, 'read');
    WHEN 'currencies', 'document_templates' THEN
      RETURN has_permission('settings', 'read');
    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- ─── RLS en audit_log ────────────────────────────────────────────────────────
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Solo SELECT vía can_view_audit_entry. INSERT/UPDATE/DELETE solo por triggers SECURITY DEFINER.
CREATE POLICY "audit_log_select" ON audit_log
  FOR SELECT TO authenticated
  USING (can_view_audit_entry(entity_type, entity_id));
