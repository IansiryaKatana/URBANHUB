-- Allow role 'admin' to read/write analytics tables (same as staff/superadmin).
-- 002 only allowed ('staff', 'superadmin'); 005 allowed 'admin' for page_views only.
-- This aligns events, tags, and settings so admin users see live data on /admin/analytics.

DROP POLICY IF EXISTS "website_analytics_events staff all" ON public.website_analytics_events;
CREATE POLICY "website_analytics_events staff all" ON public.website_analytics_events
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('staff', 'superadmin', 'admin'))
  );

DROP POLICY IF EXISTS "website_analytics_tags staff all" ON public.website_analytics_tags;
CREATE POLICY "website_analytics_tags staff all" ON public.website_analytics_tags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('staff', 'superadmin', 'admin'))
  );

DROP POLICY IF EXISTS "website_analytics_settings staff all" ON public.website_analytics_settings;
CREATE POLICY "website_analytics_settings staff all" ON public.website_analytics_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('staff', 'superadmin', 'admin'))
  );
