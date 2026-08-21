/**
 * Shared SEO helpers for Netlify functions and edge functions (plain JS).
 */

const SITE_URL = "https://urbanhub.uk";
const PORTAL_URL = "https://portal.urbanhub.uk";

const PUBLIC_STATIC_PATHS = new Set([
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
]);

function getEnv(name) {
  try {
    if (typeof Netlify !== "undefined" && Netlify.env && typeof Netlify.env.get === "function") {
      const v = Netlify.env.get(name);
      if (v) return v;
    }
  } catch {
    /* ignore */
  }
  try {
    if (typeof Deno !== "undefined" && Deno.env && typeof Deno.env.get === "function") {
      const v = Deno.env.get(name);
      if (v) return v;
    }
  } catch {
    /* ignore */
  }
  try {
    if (typeof process !== "undefined" && process.env) {
      return process.env[name];
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

function getSupabaseConfig() {
  const url = (getEnv("SUPABASE_URL") || getEnv("VITE_SUPABASE_URL") || "").replace(/\/$/, "");
  const key = getEnv("SUPABASE_ANON_KEY") || getEnv("VITE_SUPABASE_ANON_KEY") || "";
  return { url, key };
}

function getSiteUrl() {
  return (getEnv("SITE_URL") || getEnv("URL") || SITE_URL).replace(/\/$/, "");
}

function getPortalUrl() {
  return (getEnv("VITE_PORTAL_URL") || PORTAL_URL).replace(/\/$/, "");
}

function normalizePath(path) {
  const trimmed = (path || "/").split("?")[0].split("#")[0].trim() || "/";
  if (trimmed === "/") return "/";
  return trimmed.replace(/\/+$/, "") || "/";
}

function isStudiosYearPath(pathname) {
  const path = normalizePath(pathname);
  if (!path.startsWith("/studios/")) return false;
  const parts = path.split("/").filter(Boolean);
  return parts.length === 2;
}

function seoLookupPath(pathname) {
  return normalizePath(pathname);
}

function defaultCanonicalUrl(pathname, siteUrl = getSiteUrl()) {
  const path = normalizePath(pathname);
  return `${siteUrl}${path === "/" ? "/" : path}`;
}

function isAdminPath(pathname) {
  const path = normalizePath(pathname);
  return path === "/admin" || path.startsWith("/admin/");
}

function hasFileExtension(pathname) {
  const last = pathname.split("/").pop() || "";
  return last.includes(".");
}

function escapeHtmlAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeXml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function supabaseGet(table, query) {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) return null;
  const res = await fetch(`${url}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchSeoPage(pagePath) {
  const rows = await supabaseGet(
    "seo_pages",
    `page_path=eq.${encodeURIComponent(pagePath)}&select=page_path,page_type,meta_title,meta_description,focus_keyword,canonical_url,og_title,og_description,og_image_url,og_image_alt,twitter_title,twitter_description,twitter_image_url,twitter_image_alt,robots_meta,schema_json&limit=1`,
  );
  const exact = Array.isArray(rows) && rows[0] ? rows[0] : null;
  if (exact) return exact;
  if (isStudiosYearPath(pagePath)) {
    const fallback = await supabaseGet(
      "seo_pages",
      `page_path=eq.${encodeURIComponent("/studios")}&select=page_path,page_type,meta_title,meta_description,focus_keyword,canonical_url,og_title,og_description,og_image_url,og_image_alt,twitter_title,twitter_description,twitter_image_url,twitter_image_alt,robots_meta,schema_json&limit=1`,
    );
    return Array.isArray(fallback) && fallback[0] ? fallback[0] : null;
  }
  return null;
}

async function fetchSeoSettings() {
  const rows = await supabaseGet(
    "website_seo_settings",
    "is_active=eq.true&select=site_name,default_meta_title,default_meta_description,default_og_image_url,twitter_handle,google_search_console_verification&limit=1",
  );
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

async function fetchPublishedPost(slug) {
  const rows = await supabaseGet(
    "blog_posts",
    `slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=slug,title,excerpt,featured_image_url,status&limit=1`,
  );
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

async function fetchActiveLanding(slug) {
  const rows = await supabaseGet(
    "website_landing_pages",
    `slug=eq.${encodeURIComponent(slug)}&is_active=eq.true&select=slug,name,is_active&limit=1`,
  );
  return Array.isArray(rows) && rows[0] ? rows[0] : null;
}

function studioGradeMatch(path) {
  const m = path.match(/^\/studios\/([^/]+)\/([^/]+)$/);
  return m ? { year: m[1], slug: m[2] } : null;
}

async function resolvePublicRoute(pathname) {
  const path = normalizePath(pathname);
  if (isAdminPath(path)) {
    return { kind: "admin", path, seoPath: path, status: 200 };
  }
  const grade = studioGradeMatch(path);
  if (grade) {
    return {
      kind: "redirect",
      status: 301,
      location: `${getPortalUrl()}/studios/${grade.year}/${grade.slug}`,
    };
  }
  if (PUBLIC_STATIC_PATHS.has(path) || /^\/studios\/\d{4}-\d{2,4}$/.test(path)) {
    return { kind: "page", path, seoPath: path, status: 200 };
  }
  if (path.startsWith("/landing/")) {
    const slug = path.slice("/landing/".length);
    if (!slug || slug.includes("/")) return { kind: "notfound", path, status: 404 };
    const landing = await fetchActiveLanding(slug);
    if (!landing) return { kind: "notfound", path, status: 404 };
    return { kind: "page", path, seoPath: path, status: 200 };
  }
  if (path !== "/" && !path.slice(1).includes("/")) {
    const slug = path.slice(1);
    const post = await fetchPublishedPost(slug);
    if (post) return { kind: "page", path, seoPath: path, status: 200, pageType: "post" };
  }
  return { kind: "notfound", path, status: 404 };
}

function replaceOrInsert(html, pattern, tag, beforeHeadClose = true) {
  if (pattern.test(html)) return html.replace(pattern, tag);
  if (beforeHeadClose && html.includes("</head>")) {
    return html.replace("</head>", `    ${tag}\n  </head>`);
  }
  return html;
}

function injectSeoIntoHtml(html, { title, description, canonical, robots, og, twitter, jsonLd, gsc }) {
  let out = html;
  if (title) {
    out = replaceOrInsert(out, /<title>[\s\S]*?<\/title>/i, `<title>${escapeHtmlAttr(title)}</title>`);
  }
  if (description) {
    out = replaceOrInsert(
      out,
      /<meta\s+[^>]*name=["']description["'][^>]*>/i,
      `<meta name="description" content="${escapeHtmlAttr(description)}" />`,
    );
  }
  out = replaceOrInsert(
    out,
    /<meta\s+[^>]*name=["']robots["'][^>]*>/i,
    `<meta name="robots" content="${escapeHtmlAttr(robots || "index, follow")}" />`,
  );
  if (canonical) {
    out = replaceOrInsert(
      out,
      /<link\s+[^>]*rel=["']canonical["'][^>]*>/i,
      `<link rel="canonical" href="${escapeHtmlAttr(canonical)}" />`,
    );
  }
  if (gsc) {
    out = replaceOrInsert(
      out,
      /<meta\s+[^>]*name=["']google-site-verification["'][^>]*>/i,
      `<meta name="google-site-verification" content="${escapeHtmlAttr(gsc)}" />`,
    );
  }
  const ogEntries = og || {};
  for (const [property, content] of Object.entries(ogEntries)) {
    if (!content) continue;
    const re = new RegExp(`<meta\\s+[^>]*property=["']${property}["'][^>]*>`, "i");
    out = replaceOrInsert(out, re, `<meta property="${property}" content="${escapeHtmlAttr(content)}" />`);
  }
  const twitterEntries = twitter || {};
  for (const [name, content] of Object.entries(twitterEntries)) {
    if (!content) continue;
    const re = new RegExp(`<meta\\s+[^>]*name=["']${name}["'][^>]*>`, "i");
    out = replaceOrInsert(out, re, `<meta name="${name}" content="${escapeHtmlAttr(content)}" />`);
  }
  if (jsonLd) {
    out = out.replace(/<script[^>]*data-seo-json="true"[^>]*>[\s\S]*?<\/script>/i, "");
    const json = typeof jsonLd === "string" ? jsonLd : JSON.stringify(jsonLd);
    out = replaceOrInsert(
      out,
      /NEVER_MATCH/,
      `<script type="application/ld+json" data-seo-json="true">${json}</script>`,
    );
  }
  return out;
}

export {
  SITE_URL,
  PUBLIC_STATIC_PATHS,
  getEnv,
  getSupabaseConfig,
  getSiteUrl,
  getPortalUrl,
  normalizePath,
  isStudiosYearPath,
  seoLookupPath,
  defaultCanonicalUrl,
  isAdminPath,
  hasFileExtension,
  escapeHtmlAttr,
  escapeXml,
  supabaseGet,
  fetchSeoPage,
  fetchSeoSettings,
  fetchPublishedPost,
  fetchActiveLanding,
  resolvePublicRoute,
  injectSeoIntoHtml,
};
