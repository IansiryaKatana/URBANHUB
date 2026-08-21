/**
 * Full sitemap: static pages, indexable seo_pages, active landing pages, published posts.
 * CommonJS to match sitemap-blog.js (Netlify Node functions).
 */

const SITE_URL = "https://urbanhub.uk";

const PUBLIC_STATIC_PATHS = [
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
];

function getSupabaseConfig() {
  const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  return { url, key };
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

function toSitemapDate(dateStr) {
  if (!dateStr) return new Date().toISOString().slice(0, 10);
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
}

function urlEntry(loc, lastmod, changefreq, priority) {
  return [
    "  <url>",
    `    <loc>${escapeXml(loc)}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ].join("\n");
}

async function fetchJson(pathAndQuery) {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) return [];
  const res = await fetch(`${url}/rest/v1/${pathAndQuery}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

exports.handler = async function () {
  const siteUrl = (process.env.URL || SITE_URL).replace(/\/$/, "");
  const today = new Date().toISOString().slice(0, 10);
  const seen = new Set();
  const entries = [];

  const add = (path, lastmod, changefreq, priority) => {
    const loc = `${siteUrl}${path === "/" ? "/" : path}`;
    if (seen.has(loc)) return;
    seen.add(loc);
    entries.push(urlEntry(loc, lastmod || today, changefreq, priority));
  };

  for (const path of PUBLIC_STATIC_PATHS) {
    const priority = path === "/" ? "1.0" : path === "/studios" ? "0.9" : "0.8";
    const freq = path === "/" || path === "/studios" || path === "/blog" ? "weekly" : "monthly";
    add(path, today, freq, priority);
  }

  const seoPages = await fetchJson("seo_pages?select=page_path,robots_meta,updated_at&order=page_path");
  for (const row of seoPages) {
    const path = row.page_path;
    if (!path || path.startsWith("/admin")) continue;
    const robots = String(row.robots_meta || "index, follow").toLowerCase();
    if (robots.includes("noindex")) continue;
    add(path, toSitemapDate(row.updated_at), "weekly", path.startsWith("/landing/") ? "0.7" : "0.6");
  }

  const landings = await fetchJson("website_landing_pages?is_active=eq.true&select=slug,updated_at");
  for (const row of landings) {
    if (!row.slug) continue;
    add(`/landing/${row.slug}`, toSitemapDate(row.updated_at), "weekly", "0.7");
  }

  const posts = await fetchJson(
    "blog_posts?status=eq.published&select=slug,published_at,updated_at&order=published_at.desc",
  );
  for (const post of posts) {
    if (!post.slug) continue;
    add(`/${post.slug}`, toSitemapDate(post.updated_at || post.published_at), "weekly", "0.7");
  }

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
  ].join("\n");

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
    body,
  };
};
