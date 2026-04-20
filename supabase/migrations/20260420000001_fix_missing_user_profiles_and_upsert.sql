-- ============================================================
-- fix: insertar user_profiles faltantes para usuarios existentes
-- ============================================================
-- Contexto: usuarios creados antes del trigger on_auth_user_created
-- no tienen fila en user_profiles. Esto causa que UPDATE afecte 0 rows
-- y los cambios de perfil se pierdan al recargar (optimistic update falso).
--
-- Solución:
--   1. Insertar filas faltantes para todos los auth.users sin perfil
--   2. Reemplazar la política UPDATE para incluir WITH CHECK explícito
-- ============================================================

-- 1. Reparar datos: crear perfil para cualquier usuario sin fila en user_profiles
INSERT INTO user_profiles (user_id, full_name, is_active)
SELECT
  au.id,
  au.raw_user_meta_data->>'full_name',
  true
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles up WHERE up.user_id = au.id
);

-- 2. Corregir política UPDATE: agregar WITH CHECK explícito
--    Sin WITH CHECK, PostgreSQL usa el USING como check implícito,
--    pero es más robusto y claro tenerlo explícito.
DROP POLICY IF EXISTS "user_profiles_update_own" ON user_profiles;

CREATE POLICY "user_profiles_update_own" ON user_profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR has_permission('users'::text, 'edit'::text))
  WITH CHECK (user_id = auth.uid() OR has_permission('users'::text, 'edit'::text));
