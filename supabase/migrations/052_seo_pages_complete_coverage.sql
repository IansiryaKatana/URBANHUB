-- Seed SEO for every public URL that was missing a seo_pages row.
-- Also backfill published blog posts and landing pages.
-- ON CONFLICT DO NOTHING so existing edited rows are kept.

INSERT INTO seo_pages (
  page_path, page_type, meta_title, meta_description, focus_keyword, canonical_url,
  og_title, og_description, twitter_title, twitter_description, robots_meta
)
VALUES
  ('/international-students', 'page',
   'International Students | Urban Hub Preston',
   'Student accommodation in Preston for international students. Studios near University of Lancashire with arrival support and 360° tours.',
   'international student accommodation Preston',
   'https://urbanhub.uk/international-students',
   'International Students | Urban Hub Preston',
   'Studios near University of Lancashire with arrival support and 360° tours.',
   'International Students | Urban Hub Preston',
   'Studios near University of Lancashire with arrival support and 360° tours.',
   'index, follow'),
  ('/university-of-lancashire-clearing-2026', 'page',
   'University of Lancashire Clearing 2026 | Urban Hub',
   'Clearing 2026 student rooms in Preston, two minutes from University of Lancashire. Secure an Urban Hub studio from £99.',
   'University of Lancashire clearing accommodation',
   'https://urbanhub.uk/university-of-lancashire-clearing-2026',
   'University of Lancashire Clearing 2026 | Urban Hub',
   'Clearing 2026 rooms in Preston, two minutes from campus. Secure a studio from £99.',
   'University of Lancashire Clearing 2026 | Urban Hub',
   'Clearing 2026 rooms in Preston, two minutes from campus. Secure a studio from £99.',
   'index, follow'),
  ('/complaints-policy', 'page',
   'Complaints Policy | Urban Hub Student Accommodation',
   'How Urban Hub handles complaints fairly and transparently. Read our complaints policy for residents and applicants.',
   'Urban Hub complaints policy',
   'https://urbanhub.uk/complaints-policy',
   'Complaints Policy | Urban Hub Preston',
   'How Urban Hub handles complaints fairly and transparently.',
   'Complaints Policy | Urban Hub Preston',
   'How Urban Hub handles complaints fairly and transparently.',
   'index, follow'),
  ('/equality-diversity-policy', 'page',
   'Equality & Diversity Policy | Urban Hub Preston',
   'Urban Hub’s equality and diversity policy for student accommodation in Preston. Inclusive studios and community standards.',
   'Urban Hub equality and diversity',
   'https://urbanhub.uk/equality-diversity-policy',
   'Equality & Diversity Policy | Urban Hub Preston',
   'Inclusive student accommodation in Preston. Read our equality and diversity policy.',
   'Equality & Diversity Policy | Urban Hub Preston',
   'Inclusive student accommodation in Preston. Read our equality and diversity policy.',
   'index, follow'),
  ('/content-creator-terms', 'page',
   'Content Creator Terms | Urban Hub Preston',
   'Terms for Urban Hub content creators and ambassadors. How the creator programme works for student accommodation in Preston.',
   'Urban Hub content creator terms',
   'https://urbanhub.uk/content-creator-terms',
   'Content Creator Terms | Urban Hub Preston',
   'Terms for Urban Hub content creators and ambassadors.',
   'Content Creator Terms | Urban Hub Preston',
   'Terms for Urban Hub content creators and ambassadors.',
   'index, follow'),
  ('/refer-a-friend-terms', 'page',
   'Refer a Friend Terms | Urban Hub Preston',
   'Terms and conditions for the Urban Hub refer-a-friend scheme. How rewards work for student accommodation in Preston.',
   'Urban Hub refer a friend',
   'https://urbanhub.uk/refer-a-friend-terms',
   'Refer a Friend Terms | Urban Hub Preston',
   'Terms for the Urban Hub refer-a-friend scheme.',
   'Refer a Friend Terms | Urban Hub Preston',
   'Terms for the Urban Hub refer-a-friend scheme.',
   'index, follow'),
  ('/cashback-campaign-terms', 'page',
   'Cashback Campaign Terms | Urban Hub Preston',
   'Terms for Urban Hub cashback campaigns. Eligibility, dates and how cashback is paid for student bookings in Preston.',
   'Urban Hub cashback terms',
   'https://urbanhub.uk/cashback-campaign-terms',
   'Cashback Campaign Terms | Urban Hub Preston',
   'Eligibility, dates and how Urban Hub cashback is paid.',
   'Cashback Campaign Terms | Urban Hub Preston',
   'Eligibility, dates and how Urban Hub cashback is paid.',
   'index, follow')
ON CONFLICT (page_path) DO NOTHING;

-- Canonical for the studios catalog so year URLs can consolidate.
UPDATE seo_pages
SET canonical_url = COALESCE(canonical_url, 'https://urbanhub.uk/studios')
WHERE page_path = '/studios';

-- Backfill landing pages that do not yet have a seo_pages row.
INSERT INTO seo_pages (
  page_path, page_type, meta_title, meta_description, focus_keyword, canonical_url,
  og_title, og_description, twitter_title, twitter_description, robots_meta
)
SELECT
  '/landing/' || slug,
  'page',
  LEFT(COALESCE(NULLIF(hero_heading, ''), name) || ' | Urban Hub Preston', 60),
  LEFT(
    COALESCE(
      NULLIF(hero_subheading, ''),
      'Student accommodation in Preston at Urban Hub. View studios, prices and book a viewing.'
    ),
    160
  ),
  COALESCE(NULLIF(name, ''), 'student accommodation Preston'),
  'https://urbanhub.uk/landing/' || slug,
  LEFT(COALESCE(NULLIF(hero_heading, ''), name) || ' | Urban Hub Preston', 60),
  LEFT(
    COALESCE(
      NULLIF(hero_subheading, ''),
      'Student accommodation in Preston at Urban Hub.'
    ),
    160
  ),
  LEFT(COALESCE(NULLIF(hero_heading, ''), name) || ' | Urban Hub Preston', 60),
  LEFT(
    COALESCE(
      NULLIF(hero_subheading, ''),
      'Student accommodation in Preston at Urban Hub.'
    ),
    160
  ),
  CASE WHEN is_active THEN 'index, follow' ELSE 'noindex, follow' END
FROM website_landing_pages
ON CONFLICT (page_path) DO NOTHING;

-- Backfill published blog posts that do not yet have a seo_pages row.
INSERT INTO seo_pages (
  page_path, page_type, meta_title, meta_description, focus_keyword, canonical_url,
  og_title, og_description, twitter_title, twitter_description, robots_meta, og_image_url, twitter_image_url
)
SELECT
  '/' || slug,
  'post',
  LEFT(title, 60),
  LEFT(COALESCE(NULLIF(excerpt, ''), title || ' — Urban Hub student accommodation Preston.'), 160),
  LEFT(title, 80),
  'https://urbanhub.uk/' || slug,
  LEFT(title, 60),
  LEFT(COALESCE(NULLIF(excerpt, ''), title), 160),
  LEFT(title, 60),
  LEFT(COALESCE(NULLIF(excerpt, ''), title), 160),
  'index, follow',
  featured_image_url,
  featured_image_url
FROM blog_posts
WHERE status = 'published'
  AND slug IS NOT NULL
  AND slug <> ''
ON CONFLICT (page_path) DO NOTHING;
