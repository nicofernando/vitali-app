-- Cambiar search_clients a SECURITY INVOKER para que RLS filtre automáticamente.
-- Con SECURITY DEFINER, bypassaba RLS y devolvía todos los clientes independientemente
-- del rol del usuario. Con SECURITY INVOKER, el usuario solo ve los que le corresponden.
CREATE OR REPLACE FUNCTION search_clients(p_query text)
RETURNS SETOF clients
LANGUAGE sql STABLE
SET search_path = public AS $$
  SELECT * FROM clients
  WHERE full_name ILIKE '%' || p_query || '%'
     OR rut ILIKE '%' || p_query || '%'
     OR similarity(full_name, p_query) > 0.2
  ORDER BY similarity(full_name, p_query) DESC, full_name
  LIMIT 20;
$$;
