-- Allow admin role to manage website users (view list, create, update).

CREATE OR REPLACE FUNCTION public.is_website_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('superadmin', 'admin')
  );
$$;

DROP POLICY IF EXISTS "profiles_superadmin_select_any" ON public.profiles;
CREATE POLICY "profiles_superadmin_select_any"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_website_admin());

DROP POLICY IF EXISTS "profiles_superadmin_update_any" ON public.profiles;
CREATE POLICY "profiles_superadmin_update_any"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_website_admin())
  WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_superadmin_insert" ON public.profiles;
CREATE POLICY "profiles_superadmin_insert"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_website_admin());

DROP POLICY IF EXISTS "profiles_superadmin_delete_any" ON public.profiles;
CREATE POLICY "profiles_superadmin_delete_any"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_website_admin());

CREATE OR REPLACE FUNCTION public.get_website_admin_users()
RETURNS TABLE (
  id uuid,
  email text,
  first_name text,
  last_name text,
  role text,
  staff_subrole text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  IF NOT public.is_website_admin() THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    COALESCE(NULLIF(p.email, ''), u.email::text) AS email,
    p.first_name,
    p.last_name,
    p.role::text,
    p.staff_subrole,
    p.created_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  ORDER BY p.created_at DESC NULLS LAST;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_website_admin_users() TO authenticated;
