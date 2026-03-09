-- Allow refer_friend CTA type for landing pages and hero slides.

-- website_landing_pages.default_cta_type
ALTER TABLE website_landing_pages
  DROP CONSTRAINT IF EXISTS website_landing_pages_cta_type_check;

ALTER TABLE website_landing_pages
  ADD CONSTRAINT website_landing_pages_cta_type_check
  CHECK (default_cta_type IN ('viewing', 'callback', 'refer_friend'));

-- website_landing_hero_slides.cta_type
ALTER TABLE website_landing_hero_slides
  DROP CONSTRAINT IF EXISTS website_landing_hero_slides_cta_type_check;

ALTER TABLE website_landing_hero_slides
  ADD CONSTRAINT website_landing_hero_slides_cta_type_check
  CHECK (cta_type IN ('viewing', 'callback', 'refer_friend'));

