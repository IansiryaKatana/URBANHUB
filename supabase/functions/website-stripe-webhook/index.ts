// Urban Hub website Stripe webhook: finalize successful payments server-side (CRM + website_form_submissions).
// This is the durable path when the browser closes, redirect fails, or the client never runs finalize.
//
// Deploy with JWT verification OFF (Stripe does not send Supabase JWTs):
//   supabase functions deploy website-stripe-webhook --no-verify-jwt
//
// Secrets (Dashboard → Edge Functions → Secrets):
//   WEBSITE_STRIPE_WEBHOOK_SECRET  (whsec_... from Stripe → Webhooks → endpoint for THIS function URL only)
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   LEADS_CRM_WEBHOOK_URL          (optional; defaults to same CRM URL as the public site)
//
// Stripe Dashboard: add a dedicated endpoint URL (separate from any other Supabase Stripe webhook):
//   https://<project>.supabase.co/functions/v1/website-stripe-webhook
// Events: payment_intent.succeeded
//
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const DEFAULT_CRM =
  "https://btbsslznsexidjnzizre.supabase.co/functions/v1/wordpress-webhook";

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return [...new Uint8Array(sig)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function verifyStripeSignature(payload: string, sigHeader: string | null, secret: string): Promise<boolean> {
  if (!sigHeader) return false;
  const parts = sigHeader.split(",").map((p) => p.trim());
  let timestamp = "";
  const signatures: string[] = [];
  for (const p of parts) {
    const eq = p.indexOf("=");
    if (eq < 0) continue;
    const k = p.slice(0, eq);
    const v = p.slice(eq + 1);
    if (k === "t") timestamp = v;
    if (k === "v1") signatures.push(v);
  }
  if (!timestamp || signatures.length === 0) return false;
  const signedPayload = `${timestamp}.${payload}`;
  const expected = await hmacSha256Hex(secret, signedPayload);
  return signatures.some((s) => timingSafeEqualHex(s, expected));
}

type PiMetadata = Record<string, string>;

async function submissionExistsForIntent(
  supabase: ReturnType<typeof createClient>,
  paymentIntentId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("website_form_submissions")
    .select("id")
    .contains("metadata", { payment_intent_id: paymentIntentId })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("website-stripe-webhook dedupe query error:", error);
    return false;
  }
  return !!data?.id;
}

async function postCrm(url: string, body: Record<string, unknown>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error("website-stripe-webhook CRM error:", res.status, await res.text());
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const whSecret =
    Deno.env.get("WEBSITE_STRIPE_WEBHOOK_SECRET") ?? Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const crmUrl = Deno.env.get("LEADS_CRM_WEBHOOK_URL") || DEFAULT_CRM;

  if (!whSecret || !supabaseUrl || !serviceKey) {
    console.error(
      "website-stripe-webhook: missing WEBSITE_STRIPE_WEBHOOK_SECRET (or STRIPE_WEBHOOK_SECRET), SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY",
    );
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rawBody = await req.text();
  const sig = req.headers.get("stripe-signature");
  const ok = await verifyStripeSignature(rawBody, sig, whSecret);
  if (!ok) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400 });
  }

  let event: { type?: string; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  if (event.type !== "payment_intent.succeeded") {
    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const pi = event.data?.object as {
    id?: string;
    amount?: number;
    currency?: string;
    metadata?: PiMetadata;
  } | undefined;

  const paymentIntentId = pi?.id;
  if (!paymentIntentId) {
    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const md = pi.metadata || {};
  const flow = (md.uh_flow || "").trim();
  const amountPence = typeof pi.amount === "number" ? pi.amount : Number(md.amount_pence || 0);
  const email = (md.email || "").trim();
  const firstName = (md.first_name || "").trim();
  const lastName = (md.last_name || "").trim();
  const phone = (md.phone || "").trim();

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (await submissionExistsForIntent(supabase, paymentIntentId)) {
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (flow === "secure_booking") {
    const fullName = `${firstName} ${lastName}`.trim() || email || "Guest";
    const amountGbp = amountPence / 100;
    const webhookPayload = {
      form_type: "pay_deposit",
      lead_type: "pay_deposit",
      inquiry_type: "pay_deposit",
      submission_type: "secure_booking_payment",
      email_template: "pay_deposit",
      full_name: fullName,
      email: email || "unknown@unknown.invalid",
      phone,
      studio_preference: (md.studio_preference || "").trim(),
      payment_status: "succeeded",
      payment_description: "Secure booking deposit",
      payment_intent_id: paymentIntentId,
      amount_pence: amountPence,
      amount_gbp: amountGbp,
      landing_page: (md.landing_page || "").trim() || null,
    };
    await postCrm(crmUrl, webhookPayload);
    await supabase.from("website_form_submissions").insert({
      form_type: "pay_deposit",
      name: fullName,
      email: email || "unknown@unknown.invalid",
      phone: phone || null,
      message: null,
      metadata: {
        lead_type: "pay_deposit",
        studio_preference: (md.studio_preference || "").trim() || null,
        landing_page: (md.landing_page || "").trim() || null,
        cta_tracking_key: (md.cta_tracking_key || "").trim() || undefined,
        cta_type: (md.cta_type || "").trim() || undefined,
        cta_source: (md.cta_source || "").trim() || undefined,
        payment_status: "succeeded",
        payment_description: "Secure booking deposit",
        payment_intent_id: paymentIntentId,
        amount_pence: amountPence,
        amount_gbp: amountGbp,
        source: "website_stripe_webhook",
      },
    });
  } else if (flow === "refer_friend") {
    const fullName = firstName || email || "Guest";
    const webhookPayload = {
      form_type: "refer_friend",
      full_name: fullName,
      email: email || "unknown@unknown.invalid",
      phone,
      studio_type: (md.studio_type || "").trim() || undefined,
      friend_name: (md.referrer_name || "").trim(),
      friend_studio_number: (md.referrer_studio_number || "").trim(),
      payment_intent_id: paymentIntentId,
      amount_pence: amountPence,
      landing_page: (md.landing_page || "").trim() || null,
    };
    await postCrm(crmUrl, webhookPayload);
    await supabase.from("website_form_submissions").insert({
      form_type: "refer_friend",
      name: fullName,
      email: email || "unknown@unknown.invalid",
      phone: phone || null,
      message: null,
      metadata: {
        studio_type: (md.studio_type || "").trim() || undefined,
        referrer_name: (md.referrer_name || "").trim(),
        referrer_studio_number: (md.referrer_studio_number || "").trim(),
        landing_page: (md.landing_page || "").trim() || null,
        payment_intent_id: paymentIntentId,
        amount_pence: amountPence,
        source: "website_stripe_webhook",
      },
    });
  } else if (flow === "pay_urban_hub") {
    const fullName = `${firstName} ${lastName}`.trim() || email || "Guest";
    const desc = (md.payment_type || "").trim() || "Urban Hub balance payment";
    const webhookPayload = {
      form_type: "urban_hub_payment",
      full_name: fullName,
      email: email || "unknown@unknown.invalid",
      phone,
      payment_type: desc,
      payment_type_key: (md.payment_type_key || "").trim(),
      payment_intent_id: paymentIntentId,
      amount_pence: amountPence,
      currency: (pi.currency || "gbp").toUpperCase(),
    };
    await postCrm(crmUrl, webhookPayload);
    await supabase.from("website_form_submissions").insert({
      form_type: "urban_hub_payment",
      name: fullName,
      email: email || "unknown@unknown.invalid",
      phone: phone || null,
      message: null,
      metadata: {
        payment_type: desc,
        payment_type_key: (md.payment_type_key || "").trim() || undefined,
        payment_intent_id: paymentIntentId,
        amount_pence: amountPence,
        currency: (pi.currency || "gbp").toUpperCase(),
        source: "website_stripe_webhook",
      },
    });
  } else {
    console.warn(
      "website-stripe-webhook: payment_intent.succeeded without known uh_flow:",
      flow,
      paymentIntentId,
    );
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
