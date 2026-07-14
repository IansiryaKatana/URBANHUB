-- International students arrival coverflow steps (image + title + optional description)

CREATE TABLE IF NOT EXISTS website_intl_arrival_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  image_path TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_website_intl_arrival_steps_active_order
  ON website_intl_arrival_steps(is_active, display_order);

ALTER TABLE website_intl_arrival_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "website_intl_arrival_steps public read" ON website_intl_arrival_steps;
CREATE POLICY "website_intl_arrival_steps public read"
  ON website_intl_arrival_steps FOR SELECT USING (true);

DROP POLICY IF EXISTS "website_intl_arrival_steps staff all" ON website_intl_arrival_steps;
CREATE POLICY "website_intl_arrival_steps staff all"
  ON website_intl_arrival_steps FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('staff', 'superadmin', 'admin')
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'website_intl_arrival_steps_updated_at'
  ) THEN
    CREATE TRIGGER website_intl_arrival_steps_updated_at
      BEFORE UPDATE ON website_intl_arrival_steps
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON website_intl_arrival_steps TO anon, authenticated;
GRANT ALL ON website_intl_arrival_steps TO authenticated;

-- Seed default journey titles (images added via admin)
INSERT INTO website_intl_arrival_steps (title, description, display_order, is_active)
SELECT * FROM (VALUES
  ('You book your studio.', NULL::text, 0, true),
  ('You fly to the UK.', NULL::text, 1, true),
  ('You arrive in the UK.', NULL::text, 2, true),
  ('We pick you up from the airport.', NULL::text, 3, true),
  ('You check in at Urban Hub.', NULL::text, 4, true),
  ('You settle in, we''ve got you.', NULL::text, 5, true),
  ('You start your Preston story.', NULL::text, 6, true)
) AS v(title, description, display_order, is_active)
WHERE NOT EXISTS (SELECT 1 FROM website_intl_arrival_steps LIMIT 1);
