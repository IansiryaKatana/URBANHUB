import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useBrandingSettings } from "@/hooks/useBranding";
import { useWebsiteSeoSettings } from "@/hooks/useWebsiteSeoSettings";
import { usePageSeo } from "@/hooks/usePageSeo";

const META_TITLE_MAX_LENGTH = 60; // Google ~600px; ~60 chars recommended for display

const MetaTagsUpdater = () => {
  const location = useLocation();
  const { data: brandingSettings } = useBrandingSettings();
  const { data: seoSettings } = useWebsiteSeoSettings();
  const { data: pageSeo } = usePageSeo(location.pathname);

  useEffect(() => {
    const companyName = seoSettings?.site_name ?? brandingSettings?.company_name ?? "Urban Hub";
    const defaultMetaDesc = seoSettings?.default_meta_description ?? brandingSettings?.meta_description ??
      `Modern student accommodation in Preston. Book your studio apartment for the academic year. Premium amenities and convenient location.`;
    const defaultOgImage = seoSettings?.default_og_image_url || brandingSettings?.favicon_path || "/favicon.png";
    const twitterHandle = seoSettings?.twitter_handle ?? brandingSettings?.twitter_handle ?? "@UrbanHubBooking";
    const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://urbanhub.uk";

    const metaDescription = pageSeo?.meta_description ?? defaultMetaDesc;
    const ogTitle = pageSeo?.og_title ?? `${companyName} | Student Accommodation`;
    const ogDescription = pageSeo?.og_description ?? metaDescription;
    const ogImage = pageSeo?.og_image_url ?? defaultOgImage;
    const twitterTitle = pageSeo?.twitter_title ?? ogTitle;
    const twitterDescription = pageSeo?.twitter_description ?? ogDescription;
    const toAbsoluteUrl = (url: string | null | undefined) => {
      if (!url) return "";
      if (/^https?:\/\//i.test(url)) return url;
      if (url.startsWith("//")) return `https:${url}`;
      const base = siteUrl.replace(/\/+$/, "");
      return `${base}${url.startsWith("/") ? url : `/${url}`}`;
    };

    const ogImageUrl = toAbsoluteUrl(ogImage);
    const twitterImage = toAbsoluteUrl(pageSeo?.twitter_image_url ?? ogImageUrl);

    const updateMetaTagByProperty = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("property", property);
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    const updateMetaTagByName = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", name);
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    // Set document title from seo_pages or fallback; cap at 60 chars for Google display
    const defaultMetaTitle = seoSettings?.default_meta_title ?? `${companyName} Student Accommodation Preston`;
    let pageTitle = pageSeo?.meta_title ?? defaultMetaTitle;
    if (pageTitle && pageTitle.length > META_TITLE_MAX_LENGTH) {
      pageTitle = pageTitle.slice(0, META_TITLE_MAX_LENGTH - 1).trim() + "…";
    }
    if (pageTitle) {
      document.title = pageTitle;
    }

    updateMetaTagByName("description", metaDescription);
    updateMetaTagByName("author", companyName);

    updateMetaTagByProperty("og:title", ogTitle);
    updateMetaTagByProperty("og:description", ogDescription);
    if (ogImageUrl) {
      updateMetaTagByProperty("og:image", ogImageUrl);
    }
    if (pageSeo?.og_image_alt) {
      updateMetaTagByProperty("og:image:alt", pageSeo.og_image_alt);
    }

    updateMetaTagByName("twitter:card", "summary_large_image");
    updateMetaTagByName("twitter:site", twitterHandle);
    updateMetaTagByName("twitter:title", twitterTitle);
    updateMetaTagByName("twitter:description", twitterDescription);
    if (twitterImage) {
      updateMetaTagByName("twitter:image", twitterImage);
    }
    if (pageSeo?.twitter_image_alt) {
      updateMetaTagByName("twitter:image:alt", pageSeo.twitter_image_alt);
    }

    // Always set canonical so Google has a user-selected canonical (fixes "Duplicate without user-selected canonical")
    const canonicalHref = pageSeo?.canonical_url?.trim() || `${siteUrl}${location.pathname.replace(/\/+$/, "") || "/"}`;
    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", canonicalHref);

    if (pageSeo?.robots_meta) {
      updateMetaTagByName("robots", pageSeo.robots_meta);
    }

    updateMetaTagByName("theme-color", "#ff2020");

    // Structured data (JSON-LD): page-specific from seo_pages or default Organization + WebSite
    const existingJsonLd = document.querySelector('script[type="application/ld+json"][data-seo-json]');
    if (existingJsonLd) existingJsonLd.remove();

    const schema = pageSeo?.schema_json ?? {
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
      ],
    };

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-seo-json", "true");
    script.textContent = typeof schema === "string" ? schema : JSON.stringify(schema);
    document.head.appendChild(script);
  }, [brandingSettings, seoSettings, pageSeo, location.pathname]);

  return null;
};

export default MetaTagsUpdater;

