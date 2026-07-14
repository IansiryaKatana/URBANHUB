-- Migration: Separate international students testimonials from homepage
-- Adds placement column so Media admin can manage a dedicated intl-page set

ALTER TABLE website_testimonials
  ADD COLUMN IF NOT EXISTS placement TEXT NOT NULL DEFAULT 'homepage';

ALTER TABLE website_testimonials
  DROP CONSTRAINT IF EXISTS website_testimonials_placement_check;

ALTER TABLE website_testimonials
  ADD CONSTRAINT website_testimonials_placement_check
  CHECK (placement IN ('homepage', 'international_students'));

CREATE INDEX IF NOT EXISTS idx_website_testimonials_placement
  ON website_testimonials(placement, is_active, display_order);
