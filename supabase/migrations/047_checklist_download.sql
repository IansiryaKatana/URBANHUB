-- Checklist download lead form + admin-uploadable PDF for Clearing (and future) pages.

ALTER TABLE website_form_submissions
  DROP CONSTRAINT IF EXISTS website_form_type_check;

ALTER TABLE website_form_submissions
  ADD CONSTRAINT website_form_type_check
  CHECK (
    form_type IN (
      'contact',
      'callback',
      'viewing',
      'inquiry',
      'resident_support',
      'short_term',
      'tourist_inquiry',
      'keyworker_inquiry',
      'refer_friend',
      'content_creator',
      'secure_booking',
      'pay_deposit',
      'urban_hub_payment',
      'checklist_download'
    )
  );

UPDATE storage.buckets
SET
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime',
    'application/pdf'
  ]
WHERE id = 'website';

INSERT INTO website_image_slots (slot_key, display_name, fallback_url)
VALUES
  ('clearing_checklist_pdf', 'Clearing free checklist PDF', NULL)
ON CONFLICT (slot_key) DO NOTHING;
