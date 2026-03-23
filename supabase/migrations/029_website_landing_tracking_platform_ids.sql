-- Adds per-landing-page tracking platform identifiers so each campaign
-- can route conversion events to the correct ad account/pixel in GTM.

ALTER TABLE website_landing_pages
  ADD COLUMN IF NOT EXISTS meta_pixel_id TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_pixel_id TEXT,
  ADD COLUMN IF NOT EXISTS snapchat_pixel_id TEXT,
  ADD COLUMN IF NOT EXISTS google_ads_conversion_id TEXT,
  ADD COLUMN IF NOT EXISTS google_ads_conversion_label_lead TEXT,
  ADD COLUMN IF NOT EXISTS google_ads_conversion_label_purchase TEXT;
