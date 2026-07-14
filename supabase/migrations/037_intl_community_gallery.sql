-- International students community band carousel images

CREATE TABLE IF NOT EXISTS website_intl_community_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT NOT NULL,
  image_path TEXT,
  alt_text TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_website_intl_community_images_active_order
  ON website_intl_community_images(is_active, display_order);

ALTER TABLE website_intl_community_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "website_intl_community_images public read" ON website_intl_community_images;
CREATE POLICY "website_intl_community_images public read"
  ON website_intl_community_images FOR SELECT USING (true);

DROP POLICY IF EXISTS "website_intl_community_images staff all" ON website_intl_community_images;
CREATE POLICY "website_intl_community_images staff all"
  ON website_intl_community_images FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('staff', 'superadmin', 'admin')
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'website_intl_community_images_updated_at'
  ) THEN
    CREATE TRIGGER website_intl_community_images_updated_at
      BEFORE UPDATE ON website_intl_community_images
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON website_intl_community_images TO anon, authenticated;
GRANT ALL ON website_intl_community_images TO authenticated;
