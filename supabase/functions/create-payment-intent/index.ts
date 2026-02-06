// Supabase Edge Function: create Stripe PaymentIntent for Urban Hub rental payments.
//
// Required in Supabase Edge Function Secrets (Dashboard > Project Settings > Edge Functions > Secrets):
//   - STRIPE_SECRET_KEY  (sk_test_... or sk_live_...)
// Do NOT share secret values; only the names above are needed.
// The secret key MUST be the same mode as VITE_STRIPE_PUBLISHABLE_KEY (both test or both live).
// A mismatch causes the frontend Payment Element to fail with 400 Bad Request.
//
import Stripe from "https://esm.sh/stripe@17.4.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

    if (!Number.isInteger(amountPence) || amountPence < 100) {
      return new Response(
        JSON.stringify({ error: "Invalid amount (minimum £1.00)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use SDK default API version so it matches what Stripe.js Payment Element expects
    const stripe = new Stripe(stripeSecret);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountPence,
      currency: "gbp",
      description,
      receipt_email: email || undefined,
      metadata: {
        payment_type: description,
        first_name: firstName || "",
        last_name: lastName || "",
        email: email || "",
        phone: phone || "",
      },
      automatic_payment_methods: { enabled: true },
    });

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("create-payment-intent error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || "Payment intent failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
