-- Landing hero slides: content alignment, custom CTA URLs, optional second CTA

ALTER TABLE website_landing_hero_slides
  ADD COLUMN IF NOT EXISTS content_alignment TEXT NOT NULL DEFAULT 'center',
  ADD COLUMN IF NOT EXISTS cta_url TEXT,
  ADD COLUMN IF NOT EXISTS cta2_label TEXT,
  ADD COLUMN IF NOT EXISTS cta2_type TEXT,
  ADD COLUMN IF NOT EXISTS cta2_url TEXT,
  ADD COLUMN IF NOT EXISTS cta2_tracking_key TEXT;

ALTER TABLE website_landing_hero_slides
  DROP CONSTRAINT IF EXISTS website_landing_hero_slides_content_alignment_check;

ALTER TABLE website_landing_hero_slides
  ADD CONSTRAINT website_landing_hero_slides_content_alignment_check
  CHECK (content_alignment IN ('left', 'center'));

ALTER TABLE website_landing_hero_slides
  DROP CONSTRAINT IF EXISTS website_landing_hero_slides_cta_type_check;

ALTER TABLE website_landing_hero_slides
  ADD CONSTRAINT website_landing_hero_slides_cta_type_check
  CHECK (
    cta_type IN (
      'viewing',
      'callback',
      'refer_friend',
      'content_creator',
      'secure_booking',
      'custom_link'
    )
  );

ALTER TABLE website_landing_hero_slides
  DROP CONSTRAINT IF EXISTS website_landing_hero_slides_cta2_type_check;

ALTER TABLE website_landing_hero_slides
  ADD CONSTRAINT website_landing_hero_slides_cta2_type_check
  CHECK (
    cta2_type IS NULL
    OR cta2_type IN (
      'viewing',
      'callback',
      'refer_friend',
      'content_creator',
      'secure_booking',
      'custom_link'
    )
  );

-- Keep page-level defaults aligned with CTA types used in admin
ALTER TABLE website_landing_pages
  DROP CONSTRAINT IF EXISTS website_landing_pages_cta_type_check;

ALTER TABLE website_landing_pages
  ADD CONSTRAINT website_landing_pages_cta_type_check
  CHECK (
    default_cta_type IN (
      'viewing',
      'callback',
      'refer_friend',
      'content_creator',
      'secure_booking'
    )
  );
