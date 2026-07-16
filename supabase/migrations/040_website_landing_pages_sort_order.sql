-- Page-level sort order for landing pages admin list ordering.

ALTER TABLE website_landing_pages
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_website_landing_pages_sort_order
  ON website_landing_pages(sort_order);
