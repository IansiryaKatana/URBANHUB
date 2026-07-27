-- International Students landing page: VR tour video slot (upload via Admin → Image Slots)
INSERT INTO website_image_slots (slot_key, display_name, fallback_url)
VALUES
  ('intl_students_vr_tour_video', 'International Students VR tour video', NULL)
ON CONFLICT (slot_key) DO NOTHING;
