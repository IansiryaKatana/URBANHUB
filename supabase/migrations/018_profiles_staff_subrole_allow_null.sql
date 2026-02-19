-- Fix: allow NULL for staff_subrole so creating Staff without subrole or updating other fields doesn't fail.
-- The existing profiles_staff_subrole_check only allowed specific values and rejected NULL.

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_staff_subrole_check;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_staff_subrole_check CHECK (
  staff_subrole IS NULL
  OR staff_subrole IN (
    -- Portal subroles
    'operations_manager',
    'reservationist',
    'accountant',
    'front_desk',
    'maintenance_officer',
    'housekeeper',
    -- Website subroles
    'seo_editor',
    'content_editor',
    'marketing_manager',
    'customer_support'
  )
);
