-- SEO entry for Pay Urban Hub Now page (rental balance payment).
INSERT INTO seo_pages (
  page_path, page_type, meta_title, meta_description, focus_keyword, canonical_url,
  og_title, og_description, og_image_url, twitter_title, twitter_description, twitter_image_url, robots_meta
)
VALUES (
  '/pay-urban-hub-now', 'page',
  'Pay Your Rental Balance | Urban Hub Student Accommodation Preston',
  'Pay your Urban Hub rental balance securely online. Enter the amount and complete the form. Instant email confirmation on success.',
  'pay rent Urban Hub Preston', NULL,
  'Pay Your Rental Balance | Urban Hub Preston',
  'Pay your rental balance securely. Instant email confirmation.',
  NULL, 'Pay Your Rental Balance | Urban Hub Preston',
  'Pay your rental balance securely. Instant email confirmation.', NULL,
  'index, follow'
)
ON CONFLICT (page_path) DO NOTHING;
