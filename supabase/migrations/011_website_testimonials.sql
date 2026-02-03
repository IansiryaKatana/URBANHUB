-- Migration: Create Website Testimonials Table
-- Description: Table for managing "Real People, Real Results" video testimonials with cover images

-- ============================================
-- 1. WEBSITE TESTIMONIALS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS website_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  result TEXT NOT NULL,
  video_url TEXT NOT NULL, -- Can be YouTube, Vimeo, or direct video URL
  cover_image_url TEXT, -- Cover/thumbnail image URL
  cover_image_path TEXT, -- Supabase Storage path for cover image
  video_path TEXT, -- Supabase Storage path for direct video uploads (optional)
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_website_testimonials_active ON website_testimonials(is_active);
CREATE INDEX IF NOT EXISTS idx_website_testimonials_order ON website_testimonials(display_order, created_at DESC);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE website_testimonials ENABLE ROW LEVEL SECURITY;

-- Public can read active testimonials
CREATE POLICY "website_testimonials public read" ON website_testimonials 
  FOR SELECT USING (is_active = true);

-- Staff can manage all testimonials
CREATE POLICY "website_testimonials staff all" ON website_testimonials 
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('staff', 'superadmin', 'admin')
    )
  );

-- Grants
GRANT SELECT ON website_testimonials TO anon, authenticated;
GRANT ALL ON website_testimonials TO authenticated;

-- ============================================
-- TRIGGERS
-- ============================================
-- Ensure updated_at trigger exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'website_testimonials_updated_at') THEN
    CREATE TRIGGER website_testimonials_updated_at BEFORE UPDATE ON website_testimonials
      FOR EACH ROW EXECUTE FUNCTION website_update_updated_at();
  END IF;
END $$;
