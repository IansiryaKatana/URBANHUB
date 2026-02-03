-- About page hero: mobile and desktop placeholders shown while video loads.
-- Admin can edit these in Website Image Slots (Media list).

INSERT INTO website_image_slots (slot_key, display_name, fallback_url)
VALUES
  ('about_hero_desktop', 'About hero placeholder (desktop)', 'https://urbanhub.uk/wp-content/uploads/2025/05/URBAN-HUB-OUTSIDE-A-3-of-1-scaled-1.webp'),
  ('about_hero_mobile', 'About hero placeholder (mobile)', 'https://urbanhub.uk/wp-content/uploads/2025/05/URBAN-HUB-OUTSIDE-A-3-of-1-scaled-1.webp')
ON CONFLICT (slot_key) DO NOTHING;
