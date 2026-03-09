-- Extend website_form_submissions to support refer-a-friend submissions.

ALTER TABLE website_form_submissions
  DROP CONSTRAINT IF EXISTS website_form_type_check;

ALTER TABLE website_form_submissions
  ADD CONSTRAINT website_form_type_check
  CHECK (form_type IN ('contact', 'callback', 'viewing', 'inquiry', 'short_term', 'refer_friend'));

