-- GTM/GA: floating buttons now use page-specific data-analytics (e.g. float-whatsapp-home, float-whatsapp-studios)
-- so we know which page converted. Update selectors to prefix match. Align landing "Book Now" with code.

UPDATE website_analytics_tags
SET element_selector = '[data-analytics^="float-back-to-top-"]', updated_at = now()
WHERE tag_name = 'Back to Top';

UPDATE website_analytics_tags
SET element_selector = '[data-analytics^="float-vr-"]', updated_at = now()
WHERE tag_name = 'VR Explore';

UPDATE website_analytics_tags
SET element_selector = '[data-analytics^="float-whatsapp-"]', updated_at = now()
WHERE tag_name = 'WhatsApp';

-- Landing page uses data-analytics="landing-grade-book-now" (code), seed had "grade-book-now"
UPDATE website_analytics_tags
SET element_selector = '[data-analytics="landing-grade-book-now"]', updated_at = now()
WHERE tag_name = 'Grade Book Now';
