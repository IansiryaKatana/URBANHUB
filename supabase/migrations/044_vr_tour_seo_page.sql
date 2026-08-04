-- SEO entry for the Urban Hub 360 VR Tour page.
INSERT INTO seo_pages (
  page_path, page_type, meta_title, meta_description, focus_keyword, canonical_url,
  og_title, og_description, og_image_url, twitter_title, twitter_description, twitter_image_url, robots_meta
)
VALUES (
  '/vr-tour', 'page',
  '360° VR Tour | Urban Hub Student Accommodation Preston',
  'Explore Urban Hub Preston in immersive 360°. Walk through studios, corridors and communal spaces from anywhere in the world.',
  'Urban Hub VR tour Preston', NULL,
  '360° VR Tour | Urban Hub Preston',
  'Walk through Urban Hub in immersive 360° — studios, corridors and communal spaces.',
  NULL, '360° VR Tour | Urban Hub Preston',
  'Walk through Urban Hub in immersive 360° — studios, corridors and communal spaces.', NULL,
  'index, follow'
)
ON CONFLICT (page_path) DO NOTHING;
