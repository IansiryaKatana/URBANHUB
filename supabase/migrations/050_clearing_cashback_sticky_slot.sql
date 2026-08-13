-- Sitewide floating cashback sticky (Admin → Media → Image Slots)
-- Appears on public pages after 10 seconds.

INSERT INTO website_image_slots (slot_key, display_name, fallback_url, alt_text)
VALUES
  (
    'clearing_2026_cashback_sticky',
    'Cashback sticky (floating, sitewide)',
    NULL,
    'Get £500 cashback. 11th August to 5th September 2026. Book on the Urban Hub portal.'
  )
ON CONFLICT (slot_key) DO NOTHING;
