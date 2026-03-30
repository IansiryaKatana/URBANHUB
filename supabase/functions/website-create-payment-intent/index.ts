// Supabase Edge Function: create Stripe PaymentIntent for Urban Hub website rental payments.
// Uses Stripe REST API (fetch) to avoid Deno/Node compatibility issues (runMicrotasks) with the Stripe SDK.
//
// Required in Supabase Edge Function Secrets (Dashboard > Project Settings > Edge Functions > Secrets):
//   - STRIPE_SECRET_KEY  (sk_test_... or sk_live_...)
// The secret key MUST be the same mode as VITE_STRIPE_PUBLISHABLE_KEY (both test or both live).
//
const STRIPE_API = "https://api.stripe.com/v1";
const STRIPE_API_VERSION = "2025-09-30.clover";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function formBody(obj: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== "") params.set(k, String(v));
  }
  return params.toString();
}

/** Stripe metadata values max 500 chars; keep headroom. */
function metaVal(v: unknown): string {
  if (v === undefined || v === null) return "";
  const s = String(v).trim();
  return s.length > 450 ? s.slice(0, 450) : s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeSecret) {
    return new Response(
      JSON.stringify({ error: "Stripe is not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const amountPence = Number(body?.amountPence);
    const description = typeof body?.description === "string" ? body.description : "Rental balance payment";
    const email = typeof body?.email === "string" ? body.email : undefined;
    const firstName = typeof body?.firstName === "string" ? body.firstName : undefined;
    const lastName = typeof body?.lastName === "string" ? body.lastName : undefined;
    const phone = typeof body?.phone === "string" ? body.phone : undefined;
    const flow = typeof body?.flow === "string" ? body.flow : undefined;
    const studioPreference = typeof body?.studio_preference === "string" ? body.studio_preference : undefined;
    const landingPage = typeof body?.landing_page === "string" ? body.landing_page : undefined;
    const ctaTrackingKey = typeof body?.cta_tracking_key === "string" ? body.cta_tracking_key : undefined;
    const ctaType = typeof body?.cta_type === "string" ? body.cta_type : undefined;
    const ctaSource = typeof body?.cta_source === "string" ? body.cta_source : undefined;
    const referrerName = typeof body?.referrer_name === "string" ? body.referrer_name : undefined;
    const referrerStudioNumber = typeof body?.referrer_studio_number === "string"
      ? body.referrer_studio_number
      : undefined;
    const referStudioType = typeof body?.studio_type === "string" ? body.studio_type : undefined;
    const paymentTypeKey = typeof body?.payment_type_key === "string" ? body.payment_type_key : undefined;

    if (!Number.isInteger(amountPence) || amountPence < 100) {
      return new Response(
        JSON.stringify({ error: "Invalid amount (minimum £1.00)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const form = formBody({
      amount: amountPence,
      currency: "gbp",
      description,
      ...(email ? { receipt_email: email } : {}),
      "metadata[payment_type]": metaVal(description),
      "metadata[first_name]": metaVal(firstName),
      "metadata[last_name]": metaVal(lastName),
      "metadata[email]": metaVal(email),
      "metadata[phone]": metaVal(phone),
      "metadata[amount_pence]": String(amountPence),
      "metadata[uh_flow]": metaVal(flow),
      "metadata[studio_preference]": metaVal(studioPreference),
      "metadata[landing_page]": metaVal(landingPage),
      "metadata[cta_tracking_key]": metaVal(ctaTrackingKey),
      "metadata[cta_type]": metaVal(ctaType),
      "metadata[cta_source]": metaVal(ctaSource),
      "metadata[referrer_name]": metaVal(referrerName),
      "metadata[referrer_studio_number]": metaVal(referrerStudioNumber),
      "metadata[studio_type]": metaVal(referStudioType),
      "metadata[payment_type_key]": metaVal(paymentTypeKey),
      "automatic_payment_methods[enabled]": "true",
    });

    const stripeRes = await fetch(`${STRIPE_API}/payment_intents`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecret}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Stripe-Version": STRIPE_API_VERSION,
      },
      body: form,
    });

    const data = await stripeRes.json();

    if (!stripeRes.ok) {
      console.error("website-create-payment-intent Stripe error:", data);
      return new Response(
        JSON.stringify({ error: data?.error?.message || "Payment intent failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientSecret = data.client_secret;
    if (!clientSecret) {
      return new Response(
        JSON.stringify({ error: "Invalid response from Stripe" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ clientSecret }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("website-create-payment-intent error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Payment intent failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
