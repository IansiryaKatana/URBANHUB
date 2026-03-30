-- Website: allow recording balance payments from website Stripe webhook (Pay Urban Hub page).
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
      'urban_hub_payment'
    )
  );
