-- Agregar columna phone a user_profiles
alter table user_profiles add column if not exists phone text;

-- Actualizar vista para exponer phone
create or replace view users_with_roles as
select
  au.id,
  au.email,
  up.full_name,
  up.phone
from auth.users au
left join user_profiles up on up.user_id = au.id;
