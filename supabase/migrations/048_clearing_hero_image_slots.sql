-- Clearing 2026 landing page hero images (Admin → Media → Image Slots)

INSERT INTO website_image_slots (slot_key, display_name, fallback_url)
VALUES
  (
    'clearing_2026_hero_mobile',
    'Clearing 2026 hero (mobile)',
    'https://pzptocwdaqpczexlbajr.supabase.co/storage/v1/object/public/website/media/18b3d9fc-134f-45a2-99bd-5848a073164c.webp'
  ),
  (
    'clearing_2026_hero_desktop',
    'Clearing 2026 hero (desktop)',
    'https://pzptocwdaqpczexlbajr.supabase.co/storage/v1/object/public/website/media/4a210e79-968c-41df-baa1-f051694b0f74.webp'
  )
ON CONFLICT (slot_key) DO NOTHING;
