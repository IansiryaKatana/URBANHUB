export const SITE_URL = "https://urbanhub.uk";
export const SITE_NAME = "Urban Hub";

export const META_TITLE_LIMIT = 60;
export const META_DESC_LIMIT = 160;

/** Public routes that always exist (no database lookup required). */
export const PUBLIC_STATIC_PATHS = [
  "/",
  "/studios",
  "/contact",
  "/faq",
  "/blog",
  "/about",
  "/short-term",
  "/pay-urban-hub-now",
  "/privacy",
  "/terms",
  "/complaints-policy",
  "/equality-diversity-policy",
  "/content-creator-terms",
  "/refer-a-friend-terms",
  "/cashback-campaign-terms",
  "/reviews",
  "/vr-tour",
  "/international-students",
  "/university-of-lancashire-clearing-2026",
] as const;

export type SeoPagePayload = {
  page_path: string;
  page_type?: string;
  meta_title?: string | null;
  meta_description?: string | null;
  focus_keyword?: string | null;
  canonical_url?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image_url?: string | null;
  og_image_alt?: string | null;
  twitter_title?: string | null;
  twitter_description?: string | null;
  twitter_image_url?: string | null;
  twitter_image_alt?: string | null;
  robots_meta?: string | null;
  schema_json?: Record<string, unknown> | null;
};

export function normalizePath(path: string): string {
  const trimmed = (path || "/").trim() || "/";
  if (trimmed === "/") return "/";
  return trimmed.replace(/\/+$/, "") || "/";
}

/** /studios/2026-2027 (year catalog), not /studios/:year/:grade. */
export function isStudiosYearPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  if (!path.startsWith("/studios/")) return false;
  const parts = path.split("/").filter(Boolean);
  return parts.length === 2;
}

/**
 * Maps a live URL to the seo_pages.page_path used for lookup.
 * Year URLs keep their exact path so /studios/2026-2027 can have unique meta.
 */
export function seoLookupPath(pathname: string): string {
  return normalizePath(pathname);
}

export function defaultCanonicalUrl(pathname: string, siteUrl = SITE_URL): string {
  const path = normalizePath(pathname);
  const origin = siteUrl.replace(/\/+$/, "");
  return `${origin}${path === "/" ? "/" : path}`;
}

export function isAdminPath(pathname: string): boolean {
  const path = normalizePath(pathname);
  return path === "/admin" || path.startsWith("/admin/");
}

export function containsPhrase(haystack: string, phrase: string): boolean {
  const p = phrase.trim().toLowerCase();
  if (!p) return false;
  return haystack.trim().toLowerCase().includes(p);
}

export type FocusPhraseCheck = {
  id: string;
  label: string;
  ok: boolean;
};

export function getFocusPhraseChecks(input: {
  phrase: string;
  title: string;
  description: string;
  h1?: string;
}): FocusPhraseCheck[] {
  const phrase = input.phrase.trim();
  return [
    {
      id: "title",
      label: "In meta title",
      ok: containsPhrase(input.title, phrase),
    },
    {
      id: "description",
      label: "In meta description",
      ok: containsPhrase(input.description, phrase),
    },
    ...(typeof input.h1 === "string"
      ? [
          {
            id: "h1",
            label: "In page H1 / heading",
            ok: containsPhrase(input.h1, phrase),
          },
        ]
      : []),
  ];
}

type LodgingInput = {
  siteUrl: string;
  companyName: string;
  streetAddress?: string;
  postalCode?: string;
  telephone?: string;
};

export function buildLodgingBusiness(input: LodgingInput) {
  const origin = input.siteUrl.replace(/\/+$/, "") || SITE_URL;
  return {
    "@type": "LodgingBusiness",
    "@id": `${origin}/#lodging`,
    name: input.companyName,
    url: origin,
    address: {
      "@type": "PostalAddress",
      streetAddress: input.streetAddress || "Urban Hub, Preston",
      addressLocality: "Preston",
      postalCode: input.postalCode || "PR1",
      addressCountry: "GB",
    },
    ...(input.telephone ? { telephone: input.telephone } : {}),
  };
}

export function buildBreadcrumbList(pathname: string, pageName: string, siteUrl = SITE_URL) {
  const origin = siteUrl.replace(/\/+$/, "");
  const path = normalizePath(pathname);
  const items: { "@type": string; position: number; name: string; item: string }[] = [
    { "@type": "ListItem", position: 1, name: "Home", item: `${origin}/` },
  ];
  if (path !== "/") {
    items.push({
      "@type": "ListItem",
      position: 2,
      name: pageName,
      item: `${origin}${path}`,
    });
  }
  return {
    "@type": "BreadcrumbList",
    "@id": `${origin}${path === "/" ? "" : path}#breadcrumb`,
    itemListElement: items,
  };
}

export function buildDefaultJsonLd(input: {
  pathname: string;
  pageTitle: string;
  pageDescription: string;
  siteUrl: string;
  companyName: string;
  streetAddress?: string;
  postalCode?: string;
  telephone?: string;
}): Record<string, unknown> {
  const origin = input.siteUrl.replace(/\/+$/, "") || SITE_URL;
  const path = normalizePath(input.pathname);
  const lodgingPaths = new Set(["/", "/studios", "/about", "/reviews", "/short-term", "/vr-tour"]);
  const graph: Record<string, unknown>[] = [
    {
      "@type": "Organization",
      "@id": `${origin}/#organization`,
      name: input.companyName,
      url: origin,
    },
    {
      "@type": "WebSite",
      "@id": `${origin}/#website`,
      url: origin,
      name: input.companyName,
      publisher: { "@id": `${origin}/#organization` },
    },
    {
      "@type": "WebPage",
      "@id": `${origin}${path === "/" ? "/" : path}#webpage`,
      url: defaultCanonicalUrl(path, origin),
      name: input.pageTitle,
      description: input.pageDescription,
      isPartOf: { "@id": `${origin}/#website` },
    },
    buildBreadcrumbList(path, input.pageTitle, origin),
  ];
  if (lodgingPaths.has(normalizePath(path)) || isStudiosYearPath(path)) {
    graph.push(buildLodgingBusiness(input));
  }
  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

export function absoluteUrl(url: string | null | undefined, siteUrl = SITE_URL): string {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return `https:${url}`;
  const base = siteUrl.replace(/\/+$/, "");
  return `${base}${url.startsWith("/") ? url : `/${url}`}`;
}

export function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
