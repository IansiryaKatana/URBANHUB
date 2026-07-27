-- form_submit must only fire after confirmed success (recordFormSubmitEvent).
-- Remap click-tracked submit button tags so GTM/GA conversions are not inflated.
UPDATE website_analytics_tags
SET
  event_name = 'form_submit_click',
  category = 'engagement',
  updated_at = now()
WHERE event_name = 'form_submit';
