/**
 * Netlify Function: Blog sitemap (dynamic).
 * Returns sitemap XML for all published blog posts. Updates automatically when posts are added/updated.
 * Requires env: VITE_SUPABASE_URL (or SUPABASE_URL), VITE_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY).
 */

const SITE_URL = "https://urbanhub.uk";

async function fetchPublishedPosts() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.warn("sitemap-blog: Set SUPABASE_URL and SUPABASE_ANON_KEY in Netlify → Site settings → Environment variables (for Functions).");
    return [];
  }
  const base = url.replace(/\/$/, "");
  const apiUrl = `${base}/rest/v1/blog_posts?status=eq.published&select=slug,published_at,updated_at&order=published_at.desc`;
  const res = await fetch(apiUrl, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      "Accept-Profile": "public",
    },
  });
  if (!res.ok) {
    console.warn("sitemap-blog: Supabase returned", res.status, await res.text());
    return [];
  }
  return res.json();
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
  return isNaN(d.getTime()) ? new Date().toISOString().slice(0, 10) : d.toISOString().slice(0, 10);
}

exports.handler = async function (event, context) {
  const posts = await fetchPublishedPosts();
  const urlset = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!-- Blog sitemap: list of published post URLs. Empty = no published posts yet, or check Netlify env vars (SUPABASE_URL, SUPABASE_ANON_KEY) for Functions. -->',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];
  for (const post of posts) {
    const loc = `${SITE_URL}/${encodeURIComponent(post.slug)}`;
    const lastmod = toSitemapDate(post.updated_at || post.published_at);
    urlset.push("  <url>");
    urlset.push(`    <loc>${escapeXml(loc)}</loc>`);
    urlset.push(`    <lastmod>${lastmod}</lastmod>`);
    urlset.push("    <changefreq>weekly</changefreq>");
    urlset.push("    <priority>0.7</priority>");
    urlset.push("  </url>");
  }
  urlset.push("</urlset>");
  const body = urlset.join("\n");

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300", // 5 min cache so new posts appear soon
    },
    body,
  };
};
