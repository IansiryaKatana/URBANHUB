/**
 * Website config. Portal base URL for "Book Now" and account links.
 * Set VITE_PORTAL_URL in .env (e.g. https://portal.urbanhub.uk for production).
 */
export const PORTAL_BASE_URL =
  import.meta.env.VITE_PORTAL_URL?.replace(/\/$/, "") || "https://portal.urbanhub.uk";

/**
 * Stripe publishable key for Pay Urban Hub Now page.
 * Set VITE_STRIPE_PUBLISHABLE_KEY in .env. Secret key goes in Supabase Edge Function secrets (STRIPE_SECRET_KEY).
 * Important: Use the same mode for both keys (both pk_test_/sk_test_ or both pk_live_/sk_live_).
 * A mismatch causes the Payment Element to fail with a 400 error.
 */
export const STRIPE_PUBLISHABLE_KEY = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "").trim();

/** Dev-only: "test" | "live" | "unknown" | "missing" for debugging 400 errors */
export function getStripePublishableKeyMode(): "test" | "live" | "unknown" | "missing" {
  const key = STRIPE_PUBLISHABLE_KEY;
  if (!key) return "missing";
  if (key.startsWith("pk_test_")) return "test";
  if (key.startsWith("pk_live_")) return "live";
  return "unknown";
}

export function portalStudiosUrl(year: string, slug: string): string {
  const y = year.replace(/\//g, "-");
  return `${PORTAL_BASE_URL}/studios/${y}/${slug}`;
}

export function portalLoginUrl(): string {
  return `${PORTAL_BASE_URL}/portal/login`;
}

export function portalRegisterUrl(): string {
  return `${PORTAL_BASE_URL}/portal/login?mode=register`;
}

export function portalDashboardUrl(): string {
  return `${PORTAL_BASE_URL}/portal`;
}

export function portalAdminUrl(): string {
  return `${PORTAL_BASE_URL}/admin`;
}
