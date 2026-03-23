-- Adds dynamic info stack + FAQs payloads for landing pages.
-- Rendering logic in app:
-- - both present => split layout (40% info stack / 60% FAQs on desktop)
-- - one side present => single full-width section

ALTER TABLE website_landing_pages
  ADD COLUMN IF NOT EXISTS info_stack_items JSONB,
  ADD COLUMN IF NOT EXISTS faq_items JSONB;

-- Keep JSON shape predictable for frontend rendering.
ALTER TABLE website_landing_pages
  ADD CONSTRAINT website_landing_pages_info_stack_items_array_check
  CHECK (info_stack_items IS NULL OR jsonb_typeof(info_stack_items) = 'array');

ALTER TABLE website_landing_pages
  ADD CONSTRAINT website_landing_pages_faq_items_array_check
  CHECK (faq_items IS NULL OR jsonb_typeof(faq_items) = 'array');

-- If FAQ content exists, require at least 6 items.
ALTER TABLE website_landing_pages
  ADD CONSTRAINT website_landing_pages_faq_items_min_six_check
  CHECK (faq_items IS NULL OR jsonb_array_length(faq_items) = 0 OR jsonb_array_length(faq_items) >= 6);
