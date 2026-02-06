import { useEffect } from "react";
import { useLocation, Navigate } from "react-router-dom";

/**
 * Client-side redirects for legacy URLs. Ensures old links work when:
 * - Testing locally (no Netlify redirects)
 * - SPA is loaded directly with an old path (e.g. from cache)
 * Netlify 301s in netlify.toml handle production; this is a fallback.
 */

const LEGACY_REDIRECTS_INTERNAL: Record<string, string> = {
  "/terms-condition": "/terms",
  "/terms-condition/": "/terms",
  "/blog/": "/blog",
  "/reviews/": "/reviews",
  "/contact/": "/contact",
  "/faq/": "/faq",
  "/about/": "/about",
  "/privacy/": "/privacy",
  "/terms/": "/terms",
  "/short-term-stays": "/short-term",
  "/short-term-stays/": "/short-term",
  "/urban-hub-keyworkers": "/short-term?tab=keyworker",
  "/urban-hub-keyworkers/": "/short-term?tab=keyworker",
};

// Studio 26-27 → portal (format: https://portal.urbanhub.uk/studios/2026-2027/{slug})
const LEGACY_REDIRECTS_STUDIO_2627: Record<string, string> = {
  "/studio-2627/gold-studios": "https://portal.urbanhub.uk/studios/2026-2027/gold",
  "/studio-2627/gold-studios/": "https://portal.urbanhub.uk/studios/2026-2027/gold",
  "/studio-2627/silver-studios": "https://portal.urbanhub.uk/studios/2026-2027/silver",
  "/studio-2627/silver-studios/": "https://portal.urbanhub.uk/studios/2026-2027/silver",
  "/studio-2627/platinum-studios": "https://portal.urbanhub.uk/studios/2026-2027/platinum",
  "/studio-2627/platinum-studios/": "https://portal.urbanhub.uk/studios/2026-2027/platinum",
  "/studio-2627/rhodium-plus-studios": "https://portal.urbanhub.uk/studios/2026-2027/rhodium-plus",
  "/studio-2627/rhodium-plus-studios/": "https://portal.urbanhub.uk/studios/2026-2027/rhodium-plus",
  "/studio-2627/rhodiun-studios": "https://portal.urbanhub.uk/studios/2026-2027/rhodium",
  "/studio-2627/rhodiun-studios/": "https://portal.urbanhub.uk/studios/2026-2027/rhodium",
};

const LEGACY_REDIRECTS_EXTERNAL: Record<string, string> = {
  "/academic-year-booking": "https://portal.urbanhub.uk/studios/2025-2026",
  "/academic-year-booking/": "https://portal.urbanhub.uk/studios/2025-2026",
  "/academic-year-booking-26-27": "https://portal.urbanhub.uk/studios/2026-2027",
  "/academic-year-booking-26-27/": "https://portal.urbanhub.uk/studios/2026-2027",
  ...LEGACY_REDIRECTS_STUDIO_2627,
};

export default function LegacyRedirects() {
  const location = useLocation();
  const pathname = location.pathname;

  const externalUrl = LEGACY_REDIRECTS_EXTERNAL[pathname];
  useEffect(() => {
    if (externalUrl) {
      window.location.replace(externalUrl);
    }
  }, [externalUrl]);

  if (externalUrl) return null;

  const target = LEGACY_REDIRECTS_INTERNAL[pathname];
  if (target) {
    return <Navigate to={target} replace />;
  }

  return null;
}
