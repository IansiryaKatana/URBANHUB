/**
 * Website config. Portal base URL for "Book Now" and account links.
 * Set VITE_PORTAL_URL in .env (e.g. https://portal.urbanhub.uk for production).
 */
export const PORTAL_BASE_URL =
  import.meta.env.VITE_PORTAL_URL?.replace(/\/$/, "") || "https://portal.urbanhub.uk";

/**
 * Stripe publishable key for Pay Urban Hub Now page.
 * Set VITE_STRIPE_PUBLISHABLE_KEY in .env (or in Netlify env vars for production build).
 * Secret key goes in Supabase Edge Function secrets (STRIPE_SECRET_KEY).
 * Important: Publishable and secret MUST be the same mode (both test or both live).
 * A mismatch causes Stripe's API to return 400 when loading the Payment Element.
 * Note: Vite loads .env then .env.local; .env.local overrides .env. So if you have
 * pk_live_ in .env but pk_test_ in .env.local, the app gets pk_test_. For production
 * use live in the file that wins (e.g. remove VITE_STRIPE_PUBLISHABLE_KEY from .env.local
 * or set it to pk_live_ there too). For Netlify, set VITE_STRIPE_PUBLISHABLE_KEY in the
 * dashboard so the deployed site uses your live key.
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
