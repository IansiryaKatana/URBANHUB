-- Website: one website_form_submissions row per Stripe PaymentIntent (client finalize + webhook race-safe).
CREATE UNIQUE INDEX IF NOT EXISTS idx_website_form_submissions_metadata_payment_intent_id
ON website_form_submissions ((metadata ->> 'payment_intent_id'))
WHERE (metadata ->> 'payment_intent_id') IS NOT NULL
  AND (metadata ->> 'payment_intent_id') <> '';
