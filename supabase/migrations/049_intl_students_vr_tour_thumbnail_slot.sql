-- International Students / Clearing: VR tour teaser thumbnail (Admin → Media → Image Slots)

INSERT INTO website_image_slots (slot_key, display_name, fallback_url)
VALUES
  (
    'intl_students_vr_tour_thumbnail',
    'International Students VR tour thumbnail',
    NULL
  )
ON CONFLICT (slot_key) DO NOTHING;
