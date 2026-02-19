-- Allow website admin to create users (SEO editor, etc.) and set profile role/subrole.
-- 1. Ensure profiles has staff_subrole column (website subroles: seo_editor, content_editor, etc.)
-- 2. Allow superadmins to SELECT/UPDATE/INSERT profiles so they can set role after signUp.

-- Add staff_subrole if not present (nullable; portal may already have it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'staff_subrole'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN staff_subrole TEXT;
  END IF;
END $$;

-- Function to check if current user is superadmin (avoids RLS recursion when used in profiles policies)
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'superadmin'
  );
$$;

-- Allow superadmins to select any profile (so they can load user list and update new users)
DROP POLICY IF EXISTS "profiles_superadmin_select_any" ON public.profiles;
CREATE POLICY "profiles_superadmin_select_any"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_superadmin());

-- Allow superadmins to update any profile (so they can set role/staff_subrole after creating a user)
DROP POLICY IF EXISTS "profiles_superadmin_update_any" ON public.profiles;
CREATE POLICY "profiles_superadmin_update_any"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.is_superadmin())
  WITH CHECK (true);

-- Allow superadmins to insert a profile (in case trigger doesn't create one before we upsert)
DROP POLICY IF EXISTS "profiles_superadmin_insert" ON public.profiles;
CREATE POLICY "profiles_superadmin_insert"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_superadmin());
