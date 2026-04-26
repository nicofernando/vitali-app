-- ─── Quitar is_system a roles no-bootstrap ──────────────────────────────────
-- Solo Super Admin necesita protección de schema: es el bootstrap del sistema
-- (referenciado por nombre en supabase/scripts/seed-auth.sh y único capaz de
-- crear/editar roles). "Admin Inmobiliario" y "Vendedor" son roles de negocio
-- que el cliente debe poder renombrar, editar permisos o eliminar libremente
-- desde la UI de Roles. Las protecciones existentes (delete_role rechaza si
-- hay usuarios asignados; UPDATE/DELETE directos bloqueados por RLS) siguen
-- aplicando para cualquier rol no-system.

UPDATE roles
SET is_system = false
WHERE name IN ('Admin Inmobiliario', 'Vendedor');
