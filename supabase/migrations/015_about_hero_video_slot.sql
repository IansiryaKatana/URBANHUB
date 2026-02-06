-- About page hero video URL slot - configurable in admin Image Slots
-- The video URL can be set in Admin → Media → Website Image Slots

INSERT INTO website_image_slots (slot_key, display_name, fallback_url)
VALUES
  ('about_hero_video', 'About hero video URL', 'https://old.urbanhub.uk/wp-content/uploads/2025/04/URBAN-HUB-home-trial.mp4')
ON CONFLICT (slot_key) DO UPDATE
SET fallback_url = EXCLUDED.fallback_url;
