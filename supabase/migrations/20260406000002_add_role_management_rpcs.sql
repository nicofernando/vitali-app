-- assign_role: asigna un rol a un usuario (idempotente)
create or replace function assign_role(p_user_id uuid, p_role_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into user_roles (user_id, role_id)
  values (p_user_id, p_role_id)
  on conflict (user_id, role_id) do nothing;
end;
$$;

-- remove_role: quita un rol de un usuario
create or replace function remove_role(p_user_id uuid, p_role_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from user_roles
  where user_id = p_user_id
    and role_id = p_role_id;
end;
$$;
