-- Seed footer navigation with policy links (idempotent).
-- Safe to run multiple times; inserts only when each URL is missing.

DO $$
BEGIN
  IF to_regclass('public.navigation_items') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.navigation_items
      WHERE location = 'footer' AND url = '/complaints-policy'
    ) THEN
      INSERT INTO public.navigation_items (title, url, location, display_order, is_active, opens_in_new_tab)
      VALUES (
        'Complaints Policy',
        '/complaints-policy',
        'footer',
        COALESCE((SELECT MAX(display_order) + 1 FROM public.navigation_items WHERE location = 'footer'), 0),
        true,
        false
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.navigation_items
      WHERE location = 'footer' AND url = '/equality-diversity-policy'
    ) THEN
      INSERT INTO public.navigation_items (title, url, location, display_order, is_active, opens_in_new_tab)
      VALUES (
        'Equality & Diversity Policy',
        '/equality-diversity-policy',
        'footer',
        COALESCE((SELECT MAX(display_order) + 1 FROM public.navigation_items WHERE location = 'footer'), 0),
        true,
        false
      );
    END IF;
  END IF;
END $$;
