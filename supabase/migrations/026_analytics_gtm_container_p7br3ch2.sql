-- Set the correct GTM container ID (GTM-P7BR3CH2) for the site.
-- Run this if you previously had another container and want all environments to use this one.

UPDATE website_analytics_settings
SET
  google_tag_manager_id = 'GTM-P7BR3CH2',
  updated_at = now()
WHERE id = (SELECT id FROM website_analytics_settings ORDER BY updated_at DESC NULLS LAST LIMIT 1);
