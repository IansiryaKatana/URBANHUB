-- VR Tour rooms: admin-managed 360 panoramas + hotspot links for /vr-tour
CREATE TABLE IF NOT EXISTS website_vr_tour_rooms (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL CHECK (category IN (
    'Common areas',
    'Courtyard',
    'Hallways and stairways',
    'Outside',
    'Reception area',
    'Silver studio',
    'Streets View'
  )),
  panorama_lg text,
  panorama_sm text,
  panorama_thumb text,
  links jsonb NOT NULL DEFAULT '[]'::jsonb,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_start boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT website_vr_tour_rooms_id_format CHECK (id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE INDEX IF NOT EXISTS idx_website_vr_tour_rooms_active_order
  ON website_vr_tour_rooms (is_active, display_order);

CREATE UNIQUE INDEX IF NOT EXISTS idx_website_vr_tour_rooms_single_start
  ON website_vr_tour_rooms (is_start)
  WHERE is_start = true;

ALTER TABLE website_vr_tour_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "website_vr_tour_rooms public read" ON website_vr_tour_rooms;
CREATE POLICY "website_vr_tour_rooms public read" ON website_vr_tour_rooms
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "website_vr_tour_rooms staff all" ON website_vr_tour_rooms;
CREATE POLICY "website_vr_tour_rooms staff all" ON website_vr_tour_rooms
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('staff', 'superadmin', 'admin')
    )
  );

DO $$
BEGIN
  CREATE OR REPLACE FUNCTION public.website_vr_tour_rooms_set_updated_at()
  RETURNS trigger AS $fn$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;
  $fn$ LANGUAGE plpgsql;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'website_vr_tour_rooms_updated_at') THEN
    CREATE TRIGGER website_vr_tour_rooms_updated_at
      BEFORE UPDATE ON website_vr_tour_rooms
      FOR EACH ROW EXECUTE FUNCTION public.website_vr_tour_rooms_set_updated_at();
  END IF;
END $$;

GRANT SELECT ON website_vr_tour_rooms TO anon, authenticated;
GRANT ALL ON website_vr_tour_rooms TO authenticated;

-- Seed current live rooms (safe to re-run)
INSERT INTO website_vr_tour_rooms (
  id, name, category, panorama_lg, panorama_sm, panorama_thumb, links, display_order, is_active, is_start
) VALUES
(
  '01-outside-front',
  'Outside Front',
  'Outside',
  'https://pzptocwdaqpczexlbajr.supabase.co/storage/v1/object/public/website/vr-tour/01-outside-front-lg.webp',
  'https://pzptocwdaqpczexlbajr.supabase.co/storage/v1/object/public/website/vr-tour/01-outside-front-sm.webp',
  'https://pzptocwdaqpczexlbajr.supabase.co/storage/v1/object/public/website/vr-tour/01-outside-front-thumb.webp',
  '[{"nodeId":"02-corridor","yaw":"8deg","pitch":"-12deg"}]'::jsonb,
  1,
  true,
  true
),
(
  '02-corridor',
  'Corridor',
  'Hallways and stairways',
  'https://pzptocwdaqpczexlbajr.supabase.co/storage/v1/object/public/website/vr-tour/02-corridor-lg.webp',
  'https://pzptocwdaqpczexlbajr.supabase.co/storage/v1/object/public/website/vr-tour/02-corridor-sm.webp',
  'https://pzptocwdaqpczexlbajr.supabase.co/storage/v1/object/public/website/vr-tour/02-corridor-thumb.webp',
  '[{"nodeId":"01-outside-front","yaw":"95deg","pitch":"-6deg"}]'::jsonb,
  2,
  true,
  false
)
ON CONFLICT (id) DO NOTHING;
