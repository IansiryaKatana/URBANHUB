/**
 * Injects per-URL meta into the SPA HTML and returns HTTP 404 for unknown routes.
 * Runs on every document request so crawlers and social bots see unique tags
 * without waiting for client-side JavaScript.
 */
import {
  defaultCanonicalUrl,
  fetchSeoPage,
  fetchSeoSettings,
  getSiteUrl,
  hasFileExtension,
  injectSeoIntoHtml,
  isAdminPath,
  normalizePath,
  resolvePublicRoute,
} from "./lib/seo-shared.js";

const SKIP_PREFIXES = ["/.netlify/", "/assets/", "/sitemap", "/robots.txt"];

function shouldSkip(pathname) {
  if (hasFileExtension(pathname) && !pathname.endsWith(".html")) return true;
  return SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix) || pathname === prefix.replace(/\/$/, ""));
}

function absoluteUrl(url, siteUrl) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return `https:${url}`;
  return `${siteUrl}${url.startsWith("/") ? url : `/${url}`}`;
}

export default async (request, context) => {
  const url = new URL(request.url);
  const pathname = normalizePath(url.pathname);

  if (request.method !== "GET" && request.method !== "HEAD") {
    return context.next();
  }
  if (shouldSkip(pathname)) {
    return context.next();
  }

  const route = await resolvePublicRoute(pathname);
  if (route.kind === "redirect" && route.location) {
    return Response.redirect(route.location, route.status || 301);
  }

  const originResponse = await context.next();
  const contentType = originResponse.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) {
    return originResponse;
  }

  const html = await originResponse.text();
  const siteUrl = getSiteUrl();
  const settings = await fetchSeoSettings();
  const companyName = settings?.site_name || "Urban Hub";
  const defaultTitle = settings?.default_meta_title || `${companyName} Student Accommodation Preston`;
  const defaultDesc =
    settings?.default_meta_description ||
    "Modern student accommodation in Preston. Book your studio apartment for the academic year.";
  const defaultOg = absoluteUrl(settings?.default_og_image_url || "/favicon.png", siteUrl);
  const twitterHandle = settings?.twitter_handle || "@UrbanHubBooking";

  const notFound = route.kind === "notfound";
  const admin = route.kind === "admin" || isAdminPath(pathname);
  const seo = notFound || admin ? null : await fetchSeoPage(route.seoPath || pathname);

  const title = notFound
    ? `Page Not Found | ${companyName} Student Accommodation Preston`
    : seo?.meta_title || defaultTitle;
  const description = notFound
    ? `The page you're looking for doesn't exist or has been moved. Return to ${companyName} student accommodation in Preston.`
    : seo?.meta_description || defaultDesc;
  const canonical = notFound
    ? `${siteUrl}${pathname}`
    : seo?.canonical_url?.trim() || defaultCanonicalUrl(pathname, siteUrl);
  const robots = notFound || admin ? "noindex, follow" : seo?.robots_meta || "index, follow";
  const ogImage = absoluteUrl(seo?.og_image_url || defaultOg, siteUrl);
  const ogType = seo?.page_type === "post" || route.pageType === "post" ? "article" : "website";

  const jsonLd = seo?.schema_json || {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: companyName,
        url: siteUrl,
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: companyName,
        publisher: { "@id": `${siteUrl}/#organization` },
      },
      {
        "@type": "WebPage",
        url: canonical,
        name: title,
        description,
        isPartOf: { "@id": `${siteUrl}/#website` },
      },
    ],
  };

  const injected = injectSeoIntoHtml(html, {
    title,
    description,
    canonical,
    robots,
    gsc: settings?.google_search_console_verification || "",
    og: {
      "og:title": seo?.og_title || title,
      "og:description": seo?.og_description || description,
      "og:url": canonical,
      "og:type": ogType,
      "og:site_name": companyName,
      "og:locale": "en_GB",
      "og:image": ogImage,
      "og:image:alt": seo?.og_image_alt || title,
    },
    twitter: {
      "twitter:card": "summary_large_image",
      "twitter:site": twitterHandle,
      "twitter:title": seo?.twitter_title || seo?.og_title || title,
      "twitter:description": seo?.twitter_description || seo?.og_description || description,
      "twitter:image": absoluteUrl(seo?.twitter_image_url || ogImage, siteUrl),
    },
    jsonLd,
  });

  const headers = new Headers(originResponse.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.delete("content-length");

  return new Response(injected, {
    status: route.status || originResponse.status,
    headers,
  });
};
