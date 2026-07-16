-- Rename UCLan / University of Central Lancashire → University of Lancashire in CMS content.

CREATE OR REPLACE FUNCTION public.website_replace_uclan_name(value text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN value IS NULL THEN NULL
    ELSE regexp_replace(
      regexp_replace(
        regexp_replace(value, 'University of Central Lancashire\s*\(UCLan\)', 'University of Lancashire', 'gi'),
        'University of Central Lancashire', 'University of Lancashire', 'gi'
      ),
      'UCLan', 'University of Lancashire', 'gi'
    )
  END;
$$;

UPDATE website_reviews
SET title = website_replace_uclan_name(title),
    content = website_replace_uclan_name(content)
WHERE title ~* 'uclan|central lancashire'
   OR content ~* 'uclan|central lancashire';

UPDATE seo_pages
SET meta_title = website_replace_uclan_name(meta_title),
    meta_description = website_replace_uclan_name(meta_description),
    focus_keyword = website_replace_uclan_name(focus_keyword),
    og_title = website_replace_uclan_name(og_title),
    og_description = website_replace_uclan_name(og_description),
    twitter_title = website_replace_uclan_name(twitter_title),
    twitter_description = website_replace_uclan_name(twitter_description)
WHERE meta_title ~* 'uclan|central lancashire'
   OR meta_description ~* 'uclan|central lancashire'
   OR focus_keyword ~* 'uclan|central lancashire'
   OR og_title ~* 'uclan|central lancashire'
   OR og_description ~* 'uclan|central lancashire'
   OR twitter_title ~* 'uclan|central lancashire'
   OR twitter_description ~* 'uclan|central lancashire';

UPDATE blog_posts
SET title = website_replace_uclan_name(title),
    excerpt = website_replace_uclan_name(excerpt),
    content = website_replace_uclan_name(content)
WHERE title ~* 'uclan|central lancashire'
   OR excerpt ~* 'uclan|central lancashire'
   OR content ~* 'uclan|central lancashire';

UPDATE blog_categories
SET name = website_replace_uclan_name(name),
    description = website_replace_uclan_name(description)
WHERE name ~* 'uclan|central lancashire'
   OR description ~* 'uclan|central lancashire';

UPDATE website_amenities
SET title = website_replace_uclan_name(title),
    short_description = website_replace_uclan_name(short_description)
WHERE title ~* 'uclan|central lancashire'
   OR short_description ~* 'uclan|central lancashire';

UPDATE website_why_us_cards
SET title = website_replace_uclan_name(title),
    description = website_replace_uclan_name(description)
WHERE title ~* 'uclan|central lancashire'
   OR description ~* 'uclan|central lancashire';

UPDATE website_faqs
SET question = website_replace_uclan_name(question),
    answer = website_replace_uclan_name(answer)
WHERE question ~* 'uclan|central lancashire'
   OR answer ~* 'uclan|central lancashire';

UPDATE website_media
SET title = website_replace_uclan_name(title),
    subtitle = website_replace_uclan_name(subtitle)
WHERE title ~* 'uclan|central lancashire'
   OR subtitle ~* 'uclan|central lancashire';

UPDATE website_testimonials
SET name = website_replace_uclan_name(name),
    result = website_replace_uclan_name(result)
WHERE name ~* 'uclan|central lancashire'
   OR result ~* 'uclan|central lancashire';

UPDATE website_studio_grade_features
SET feature_text = website_replace_uclan_name(feature_text)
WHERE feature_text ~* 'uclan|central lancashire';

UPDATE website_intl_arrival_steps
SET title = website_replace_uclan_name(title),
    description = website_replace_uclan_name(description)
WHERE title ~* 'uclan|central lancashire'
   OR description ~* 'uclan|central lancashire';

UPDATE website_intl_community_images
SET alt_text = website_replace_uclan_name(alt_text)
WHERE alt_text ~* 'uclan|central lancashire';

UPDATE website_landing_pages
SET name = website_replace_uclan_name(name),
    hero_heading = website_replace_uclan_name(hero_heading),
    hero_subheading = website_replace_uclan_name(hero_subheading),
    room_grades_heading = website_replace_uclan_name(room_grades_heading),
    room_grades_description = website_replace_uclan_name(room_grades_description)
WHERE name ~* 'uclan|central lancashire'
   OR hero_heading ~* 'uclan|central lancashire'
   OR hero_subheading ~* 'uclan|central lancashire'
   OR room_grades_heading ~* 'uclan|central lancashire'
   OR room_grades_description ~* 'uclan|central lancashire';

UPDATE website_landing_pages
SET info_stack_items = website_replace_uclan_name(info_stack_items::text)::jsonb
WHERE info_stack_items::text ~* 'uclan|central lancashire';

UPDATE website_landing_pages
SET faq_items = website_replace_uclan_name(faq_items::text)::jsonb
WHERE faq_items::text ~* 'uclan|central lancashire';

UPDATE website_landing_hero_slides
SET title = website_replace_uclan_name(title),
    subtitle = website_replace_uclan_name(subtitle),
    desktop_image_alt = website_replace_uclan_name(desktop_image_alt),
    mobile_image_alt = website_replace_uclan_name(mobile_image_alt)
WHERE title ~* 'uclan|central lancashire'
   OR subtitle ~* 'uclan|central lancashire'
   OR desktop_image_alt ~* 'uclan|central lancashire'
   OR mobile_image_alt ~* 'uclan|central lancashire';

DROP FUNCTION public.website_replace_uclan_name(text);
