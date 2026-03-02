// Supabase Edge Function: create Stripe Checkout Session for Urban Hub website.
// User is redirected to Stripe Checkout (payment form on Stripe's domain), avoiding 401
// from embedded Payment Element on our domain. Uses REST API (fetch) for Deno compatibility.
//
// Required secret: STRIPE_SECRET_KEY (sk_live_... or sk_test_...)
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
    const successUrl = typeof body?.successUrl === "string" ? body.successUrl : "";
    const cancelUrl = typeof body?.cancelUrl === "string" ? body.cancelUrl : "";

    if (!Number.isInteger(amountPence) || amountPence < 100) {
      return new Response(
        JSON.stringify({ error: "Invalid amount (minimum £1.00)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!successUrl || !cancelUrl) {
      return new Response(
        JSON.stringify({ error: "successUrl and cancelUrl are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const form = formBody({
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      "line_items[0][price_data][currency]": "gbp",
      "line_items[0][price_data][unit_amount]": amountPence,
      "line_items[0][price_data][product_data][name]": description,
      "line_items[0][quantity]": 1,
      ...(email ? { customer_email: email } : {}),
      "metadata[payment_type]": description,
      "metadata[first_name]": firstName ?? "",
      "metadata[last_name]": lastName ?? "",
      "metadata[email]": email ?? "",
      "metadata[phone]": phone ?? "",
    });

    const stripeRes = await fetch(`${STRIPE_API}/checkout/sessions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecret}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Stripe-Version": STRIPE_API_VERSION,
      },
      body: form,
    });

    const data = await stripeRes.json();

    if (!stripeRes.ok) {
      console.error("website-create-checkout-session Stripe error:", data);
      return new Response(
        JSON.stringify({ error: data?.error?.message || "Checkout session failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const url = data.url;
    if (!url) {
      return new Response(
        JSON.stringify({ error: "Invalid response from Stripe" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("website-create-checkout-session error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Checkout session failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
