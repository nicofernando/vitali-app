-- ============================================================
-- vitali-app — Security fixes
-- Fix C1: decimal_places en currencies
-- Fix C3: assign_role y remove_role con chequeo de permisos
-- Fix C4: users_with_roles protegida con has_permission
-- ============================================================

-- ============================================================
-- [C1] currencies: agregar decimal_places
-- ============================================================
alter table currencies add column if not exists decimal_places integer not null default 2;

update currencies set decimal_places = 0 where code = 'CLP';

-- ============================================================
-- [C3] assign_role: agregar chequeo de permisos
-- ============================================================
create or replace function assign_role(p_user_id uuid, p_role_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not has_permission('users', 'edit') then
    raise exception 'No autorizado para gestionar roles' using errcode = '42501';
  end if;

  insert into user_roles (user_id, role_id)
  values (p_user_id, p_role_id)
  on conflict (user_id, role_id) do nothing;
end;
$$;

-- ============================================================
-- [C3] remove_role: agregar chequeo de permisos
-- ============================================================
create or replace function remove_role(p_user_id uuid, p_role_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not has_permission('users', 'edit') then
    raise exception 'No autorizado para gestionar roles' using errcode = '42501';
  end if;

  delete from user_roles
  where user_id = p_user_id
    and role_id = p_role_id;
end;
$$;

-- ============================================================
-- [C4] users_with_roles: reemplazar vista con función protegida
-- ============================================================

-- Eliminar la vista desprotegida
drop view if exists users_with_roles;

-- Función SECURITY DEFINER que verifica permisos antes de retornar datos
create or replace function get_users_with_roles()
returns table (
  id        uuid,
  email     text,
  full_name text,
  phone     text
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
    up.phone
  from auth.users au
  left join user_profiles up on up.user_id = au.id;
end;
$$;
