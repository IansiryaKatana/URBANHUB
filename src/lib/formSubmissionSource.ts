/** Read a non-empty string from submission metadata under any of the given keys. */
export function getMetaString(
  metadata: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string | null {
  if (!metadata) return null;
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export function getSubmissionLandingPage(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  return getMetaString(metadata, "landing_page");
}

export function getSubmissionCampaign(
  metadata: Record<string, unknown> | null | undefined,
): string | null {
  return getMetaString(metadata, "tracking_key", "cta_tracking_key");
}

/** Human-friendly label for a stored landing_page value. */
export function formatLandingPageLabel(landingPage: string): string {
  const raw = landingPage.trim();
  if (!raw) return "—";

  const known: Record<string, string> = {
    "/international-students": "International Students",
    "/university-of-lancashire-clearing-2026": "University of Lancashire Clearing 2026",
    "/contact": "Contact",
    "/short-term": "Short Term",
    "/pay-urban-hub-now": "Pay Urban Hub Now",
    "Contact Page": "Contact",
    "Short Term": "Short Term",
    "Urbanhub Portal": "Portal / default",
  };
  if (known[raw]) return known[raw];

  if (raw.startsWith("/landing/")) {
    const slug = raw.replace(/^\/landing\//, "").replace(/\/$/, "");
    return slug
      ? slug
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ")
      : "Landing page";
  }

  if (raw.startsWith("/")) {
    const slug = raw.replace(/^\//, "").replace(/\/$/, "") || "Home";
    return slug
      .split("/")
      .map((segment) =>
        segment
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" "),
      )
      .join(" / ");
  }

  return raw;
}

export function buildAttributionMetadata(input: {
  landing_page?: string | null;
  tracking_key?: string | null;
  cta_type?: string | null;
  cta_source?: string | null;
}): Record<string, string> {
  const out: Record<string, string> = {};
  const landing = input.landing_page?.trim();
  const tracking = input.tracking_key?.trim();
  const ctaType = input.cta_type?.trim();
  const ctaSource = input.cta_source?.trim();
  if (landing) out.landing_page = landing;
  if (tracking) {
    out.tracking_key = tracking;
    out.cta_tracking_key = tracking;
  }
  if (ctaType) out.cta_type = ctaType;
  if (ctaSource) out.cta_source = ctaSource;
  return out;
}
