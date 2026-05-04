-- Backfill missing or clearly invalid published_at on blog_posts; ensure published rows get a date.

-- Random datetime in [2024-01-01, 2026-01-01) — i.e. any time in 2024 or 2025
UPDATE blog_posts
SET published_at =
  ('2024-01-01'::timestamptz
   + random() * ('2026-01-01'::timestamptz - '2024-01-01'::timestamptz))
WHERE published_at IS NULL
   OR published_at < timestamptz '2000-01-01';

-- When status is published but published_at is still null, set at insert/update time
CREATE OR REPLACE FUNCTION public.set_blog_published_at_when_published()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blog_posts_set_published_at ON public.blog_posts;
CREATE TRIGGER trg_blog_posts_set_published_at
  BEFORE INSERT OR UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_blog_published_at_when_published();
