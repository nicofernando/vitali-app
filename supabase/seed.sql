-- Seed de desarrollo local
-- Se ejecuta automáticamente en cada `supabase db reset`
-- El usuario se crea via auth admin API (ver comentario abajo)
--
-- IMPORTANTE: después de cada db reset, ejecutar:
--   supabase/scripts/seed-auth.sh
-- Eso crea el usuario nicolas@vitalisuites.com / dev1234 con Super Admin

-- Rol Super Admin para el usuario del seed (UUID fijo para dev)
-- Este INSERT se activa una vez que seed-auth.sh crea el usuario
