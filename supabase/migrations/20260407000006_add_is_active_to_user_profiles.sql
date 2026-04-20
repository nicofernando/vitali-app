-- Agregar is_active a user_profiles para deshabilitar usuarios sin borrarlos
alter table user_profiles add column if not exists is_active boolean not null default true;

-- Actualizar get_users_with_roles para exponer is_active
drop function if exists get_users_with_roles();

create function get_users_with_roles()
returns table (
  id        uuid,
  email     text,
  full_name text,
  phone     text,
  is_active boolean
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not has_permission('users', 'read') then
    return;
  end if;

  return query
  select
    au.id,
    au.email::text,
    up.full_name,
    up.phone,
    coalesce(up.is_active, true)
  from auth.users au
  left join user_profiles up on up.user_id = au.id;
end;
$$;
