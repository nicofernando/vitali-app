-- ─── Tablas con `id uuid` → trigger genérico ─────────────────────────────────
CREATE TRIGGER audit_roles
  AFTER INSERT OR UPDATE OR DELETE ON roles
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER audit_user_profiles
  AFTER INSERT OR UPDATE OR DELETE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER audit_clients
  AFTER INSERT OR UPDATE OR DELETE ON clients
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER audit_quotes
  AFTER INSERT OR UPDATE OR DELETE ON quotes
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER audit_projects
  AFTER INSERT OR UPDATE OR DELETE ON projects
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER audit_towers
  AFTER INSERT OR UPDATE OR DELETE ON towers
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER audit_typologies
  AFTER INSERT OR UPDATE OR DELETE ON typologies
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER audit_units
  AFTER INSERT OR UPDATE OR DELETE ON units
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER audit_currencies
  AFTER INSERT OR UPDATE OR DELETE ON currencies
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

CREATE TRIGGER audit_document_templates
  AFTER INSERT OR UPDATE OR DELETE ON document_templates
  FOR EACH ROW EXECUTE FUNCTION audit_log_trigger();

-- ─── Tablas relacionales (PK compuesta) → triggers especializados ────────────
-- Mapean al entity padre y producen audit entries más legibles.
-- user_roles, role_permissions y client_assignments no tienen `id uuid`,
-- por lo que el trigger genérico fallaría con NEW.id undefined.

CREATE TRIGGER audit_user_roles
  AFTER INSERT OR DELETE ON user_roles
  FOR EACH ROW EXECUTE FUNCTION audit_user_roles_trigger();

CREATE TRIGGER audit_role_permissions
  AFTER INSERT OR DELETE ON role_permissions
  FOR EACH ROW EXECUTE FUNCTION audit_role_permissions_trigger();

CREATE TRIGGER audit_client_assignments
  AFTER INSERT OR DELETE ON client_assignments
  FOR EACH ROW EXECUTE FUNCTION audit_client_assignments_trigger();
