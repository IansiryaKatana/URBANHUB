-- Image slot for admin login page background (e.g. UCLAN / students happy).
-- Admins can replace via Website Admin → Image Slots.
INSERT INTO website_image_slots (slot_key, display_name, fallback_url)
VALUES (
  'hero_admin_login',
  'Admin login background (e.g. students / campus)',
  'https://images.pexels.com/photos/7683887/pexels-photo-7683887.jpeg?auto=compress&cs=tinysrgb&w=1920'
)
ON CONFLICT (slot_key) DO NOTHING;
