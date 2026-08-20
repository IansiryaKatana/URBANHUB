-- Collapse VR tour categories to Rooms + Facilities
ALTER TABLE website_vr_tour_rooms
  DROP CONSTRAINT IF EXISTS website_vr_tour_rooms_category_check;

UPDATE website_vr_tour_rooms
SET category = 'Rooms'
WHERE category IN ('Silver studio');

UPDATE website_vr_tour_rooms
SET category = 'Facilities'
WHERE category IS DISTINCT FROM 'Rooms';

ALTER TABLE website_vr_tour_rooms
  ADD CONSTRAINT website_vr_tour_rooms_category_check
  CHECK (category IN ('Rooms', 'Facilities'));
