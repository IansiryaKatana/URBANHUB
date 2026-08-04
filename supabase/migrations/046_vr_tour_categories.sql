-- Expand VR tour room categories to match source folder set
ALTER TABLE website_vr_tour_rooms
  DROP CONSTRAINT IF EXISTS website_vr_tour_rooms_category_check;

-- Remap legacy category values before applying the new check
UPDATE website_vr_tour_rooms SET category = 'Hallways and stairways' WHERE category = 'Communal';
UPDATE website_vr_tour_rooms SET category = 'Silver studio' WHERE category = 'Studios';

ALTER TABLE website_vr_tour_rooms
  ADD CONSTRAINT website_vr_tour_rooms_category_check
  CHECK (category IN (
    'Common areas',
    'Courtyard',
    'Hallways and stairways',
    'Outside',
    'Reception area',
    'Silver studio',
    'Streets View'
  ));
