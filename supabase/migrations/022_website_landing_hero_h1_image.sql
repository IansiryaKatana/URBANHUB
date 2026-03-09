-- Extend landing hero slides with optional H1 image and subtitle link support.

ALTER TABLE website_landing_hero_slides
  ADD COLUMN IF NOT EXISTS subtitle_link_url TEXT,
  ADD COLUMN IF NOT EXISTS h1_image_url TEXT,
  ADD COLUMN IF NOT EXISTS h1_image_alt TEXT,
  ADD COLUMN IF NOT EXISTS h1_image_scale NUMERIC(4,2) DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS h1_image_scale_mobile NUMERIC(4,2) DEFAULT 1.00;

