-- Landing pages and hero slides for marketing one-page variants.
-- Mirrors homepage sections without altering existing homepage implementation.

-- ============================================
-- 1. WEBSITE LANDING PAGES
-- ============================================
CREATE TABLE IF NOT EXISTS website_landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Hero defaults (can be overridden per-slide)
  hero_heading TEXT,
  hero_subheading TEXT,
  default_cta_label TEXT DEFAULT 'Book a viewing',
  default_cta_type TEXT NOT NULL DEFAULT 'viewing',
  default_cta_tracking_key TEXT,

  -- Room grades section copy (keeps functionality, custom messaging per landing page)
  room_grades_heading TEXT DEFAULT '5 Room Grades to Choose From',
  room_grades_description TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT website_landing_pages_cta_type_check CHECK (default_cta_type IN ('viewing', 'callback'))
);

CREATE INDEX IF NOT EXISTS idx_website_landing_pages_slug ON website_landing_pages(slug);
CREATE INDEX IF NOT EXISTS idx_website_landing_pages_active ON website_landing_pages(is_active);

-- ============================================
-- 2. WEBSITE LANDING HERO SLIDES
-- ============================================
CREATE TABLE IF NOT EXISTS website_landing_hero_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_page_id UUID NOT NULL REFERENCES website_landing_pages(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  subtitle TEXT,

  cta_label TEXT,
  cta_type TEXT NOT NULL DEFAULT 'viewing',
  cta_tracking_key TEXT,

  desktop_image_url TEXT,
  desktop_image_alt TEXT,
  mobile_image_url TEXT,
  mobile_image_alt TEXT,

  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT website_landing_hero_slides_cta_type_check CHECK (cta_type IN ('viewing', 'callback'))
);

CREATE INDEX IF NOT EXISTS idx_website_landing_hero_slides_landing_page ON website_landing_hero_slides(landing_page_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_website_landing_hero_slides_active ON website_landing_hero_slides(is_active);

-- ============================================
-- 3. UPDATED_AT TRIGGERS
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'website_landing_pages_updated_at') THEN
    CREATE TRIGGER website_landing_pages_updated_at
      BEFORE UPDATE ON website_landing_pages
      FOR EACH ROW EXECUTE FUNCTION website_update_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'website_landing_hero_slides_updated_at') THEN
    CREATE TRIGGER website_landing_hero_slides_updated_at
      BEFORE UPDATE ON website_landing_hero_slides
      FOR EACH ROW EXECUTE FUNCTION website_update_updated_at();
  END IF;
END $$;

-- ============================================
-- 4. ROW LEVEL SECURITY & POLICIES
-- ============================================
ALTER TABLE website_landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_landing_hero_slides ENABLE ROW LEVEL SECURITY;

-- Public can read active landing pages and slides
CREATE POLICY "website_landing_pages public read" ON website_landing_pages
  FOR SELECT USING (is_active = true);

CREATE POLICY "website_landing_hero_slides public read" ON website_landing_hero_slides
  FOR SELECT USING (is_active = true);

-- Staff / superadmin / admin can manage landing pages and slides
CREATE POLICY "website_landing_pages staff all" ON website_landing_pages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('staff', 'superadmin', 'admin')
    )
  );

CREATE POLICY "website_landing_hero_slides staff all" ON website_landing_hero_slides
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('staff', 'superadmin', 'admin')
    )
  );

-- ============================================
-- 5. GRANTS
-- ============================================
GRANT SELECT ON website_landing_pages TO anon, authenticated;
GRANT SELECT ON website_landing_hero_slides TO anon, authenticated;

GRANT ALL ON website_landing_pages TO authenticated;
GRANT ALL ON website_landing_hero_slides TO authenticated;

