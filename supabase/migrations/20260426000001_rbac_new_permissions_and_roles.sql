-- ─── Nuevos permisos atómicos ────────────────────────────────────────────────
INSERT INTO permissions (module, action, description) VALUES
  ('users',   'disable',  'Deshabilitar o habilitar usuarios'),
  ('clients', 'read_own', 'Ver solo los clientes asignados'),
  ('roles',   'read',     'Ver listado de roles'),
  ('roles',   'create',   'Crear nuevos roles'),
  ('roles',   'edit',     'Editar roles y sus permisos'),
  ('roles',   'delete',   'Eliminar roles'),
  ('audit',   'read',     'Ver log de auditoría del sistema'),
  ('audit',   'read_own', 'Ver log de auditoría de entidades visibles para el usuario')
ON CONFLICT (module, action) DO NOTHING;

-- ─── Protección de roles seed (is_system) ────────────────────────────────────
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;
UPDATE roles SET is_system = true WHERE name IN ('Super Admin', 'Admin Inmobiliario', 'Vendedor');

-- ─── Nuevos roles para producción ────────────────────────────────────────────
DO $$
DECLARE
  v_asistente_id uuid;
  v_supervisor_id uuid;
BEGIN
  -- Asistente Comercial
  INSERT INTO roles (name, description, is_system)
  VALUES ('Asistente Comercial', 'Asistente del equipo comercial — ve y gestiona sus propios clientes y cotizaciones', false)
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO v_asistente_id FROM roles WHERE name = 'Asistente Comercial';

  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_asistente_id, p.id FROM permissions p
  WHERE (p.module, p.action) IN (
    ('simulator', 'use'),
    ('projects',  'read'),
    ('towers',    'read'),
    ('typologies','read'),
    ('units',     'read'),
    ('quotes',    'create'),
    ('quotes',    'read'),
    ('clients',   'read_own'),
    ('clients',   'create'),
    ('clients',   'edit'),
    ('audit',     'read_own')
  )
  ON CONFLICT DO NOTHING;

  -- Supervisor Comercial
  INSERT INTO roles (name, description, is_system)
  VALUES ('Supervisor Comercial', 'Supervisor del equipo comercial — ve todos los clientes y cotizaciones', false)
  ON CONFLICT (name) DO NOTHING;

  SELECT id INTO v_supervisor_id FROM roles WHERE name = 'Supervisor Comercial';

  INSERT INTO role_permissions (role_id, permission_id)
  SELECT v_supervisor_id, p.id FROM permissions p
  WHERE (p.module, p.action) IN (
    ('simulator', 'use'),
    ('projects',  'read'),
    ('towers',    'read'),
    ('typologies','read'),
    ('units',     'read'),
    ('quotes',    'create'),
    ('quotes',    'read'),
    ('quotes',    'read_all'),
    ('clients',   'read'),
    ('clients',   'create'),
    ('clients',   'edit'),
    ('audit',     'read_own')
  )
  ON CONFLICT DO NOTHING;
END;
$$;

-- ─── Updates a roles existentes ──────────────────────────────────────────────
-- Super Admin → todos los nuevos permisos
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Super Admin'
  AND (p.module, p.action) IN (
    ('users',  'disable'),
    ('roles',  'read'),
    ('roles',  'create'),
    ('roles',  'edit'),
    ('roles',  'delete'),
    ('audit',  'read'),
    ('audit',  'read_own'),
    ('clients','read_own')
  )
ON CONFLICT DO NOTHING;

-- Admin Inmobiliario → disable, roles.read, audit.read_own
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'Admin Inmobiliario'
  AND (p.module, p.action) IN (
    ('users',  'disable'),
    ('roles',  'read'),
    ('audit',  'read_own'),
    ('clients','read_own')
  )
ON CONFLICT DO NOTHING;
