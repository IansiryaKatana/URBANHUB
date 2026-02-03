-- Migration: Add Google Search Console verification to SEO settings
-- Description: Add field to store Google Search Console verification code

-- Add google_search_console_verification column to website_seo_settings
ALTER TABLE website_seo_settings 
ADD COLUMN IF NOT EXISTS google_search_console_verification TEXT;

-- Add comment for documentation
COMMENT ON COLUMN website_seo_settings.google_search_console_verification IS 'Google Search Console verification meta tag content value';
