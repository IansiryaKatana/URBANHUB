import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useBrandingSettings } from "@/hooks/useBranding";
import { useWebsiteSeoSettings } from "@/hooks/useWebsiteSeoSettings";
import { usePageSeo } from "@/hooks/usePageSeo";
import { useSeoFlags } from "@/contexts/SeoFlagsContext";
import {
  absoluteUrl,
  buildDefaultJsonLd,
  defaultCanonicalUrl,
  isAdminPath,
} from "@/lib/seo";

const MetaTagsUpdater = () => {
  const location = useLocation();
  const { isNotFound } = useSeoFlags();
  const { data: brandingSettings } = useBrandingSettings();
  const { data: seoSettings } = useWebsiteSeoSettings();
  const { data: pageSeo } = usePageSeo(location.pathname);

  useEffect(() => {
    const companyName = seoSettings?.site_name ?? brandingSettings?.company_name ?? "Urban Hub";
    const defaultMetaDesc =
      seoSettings?.default_meta_description ??
      brandingSettings?.meta_description ??
      `Modern student accommodation in Preston. Book your studio apartment for the academic year. Premium amenities and convenient location.`;
    const defaultOgImage = seoSettings?.default_og_image_url || brandingSettings?.favicon_path || "/favicon.png";
    const twitterHandle = seoSettings?.twitter_handle ?? brandingSettings?.twitter_handle ?? "@UrbanHubBooking";
    const siteUrl = typeof window !== "undefined" ? window.location.origin : "https://urbanhub.uk";
    const admin = isAdminPath(location.pathname);

    const pageTitle = isNotFound
      ? `Page Not Found | ${companyName} Student Accommodation Preston`
      : pageSeo?.meta_title ??
        seoSettings?.default_meta_title ??
        `${companyName} Student Accommodation Preston`;
    const metaDescription = isNotFound
      ? `The page you're looking for doesn't exist or has been moved. Return to ${companyName} student accommodation in Preston.`
      : pageSeo?.meta_description ?? defaultMetaDesc;
    const canonicalHref =
      pageSeo?.canonical_url?.trim() || defaultCanonicalUrl(location.pathname, siteUrl);
    const ogTitle = pageSeo?.og_title ?? pageTitle;
    const ogDescription = pageSeo?.og_description ?? metaDescription;
    const ogImageUrl = absoluteUrl(pageSeo?.og_image_url ?? defaultOgImage, siteUrl);
    const twitterTitle = pageSeo?.twitter_title ?? ogTitle;
    const twitterDescription = pageSeo?.twitter_description ?? ogDescription;
    const twitterImage = absoluteUrl(pageSeo?.twitter_image_url ?? ogImageUrl, siteUrl);
    const ogType = pageSeo?.page_type === "post" ? "article" : "website";
    const robots =
      isNotFound || admin ? "noindex, follow" : pageSeo?.robots_meta?.trim() || "index, follow";

    const updateMetaTagByProperty = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("property", property);
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    const updateMetaTagByName = (name: string, content: string) => {
      let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", name);
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    if (pageTitle) {
      document.title = pageTitle;
    }

    updateMetaTagByName("description", metaDescription);
    updateMetaTagByName("author", companyName);
    updateMetaTagByName("robots", robots);

    updateMetaTagByProperty("og:title", ogTitle);
    updateMetaTagByProperty("og:description", ogDescription);
    updateMetaTagByProperty("og:url", canonicalHref);
    updateMetaTagByProperty("og:type", ogType);
    updateMetaTagByProperty("og:site_name", companyName);
    updateMetaTagByProperty("og:locale", "en_GB");
    if (ogImageUrl) {
      updateMetaTagByProperty("og:image", ogImageUrl);
    }
    if (pageSeo?.og_image_alt) {
      updateMetaTagByProperty("og:image:alt", pageSeo.og_image_alt);
    } else {
      const existingAlt = document.querySelector('meta[property="og:image:alt"]');
      if (existingAlt) existingAlt.remove();
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

    let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.setAttribute("rel", "canonical");
      document.head.appendChild(link);
    }
    link.setAttribute("href", canonicalHref);

    updateMetaTagByName("theme-color", "#ff2020");

    const existingJsonLd = document.querySelector('script[type="application/ld+json"][data-seo-json]');
    if (existingJsonLd) existingJsonLd.remove();

    const streetAddress = [
      brandingSettings?.contact_address_line1,
      brandingSettings?.contact_address_line2,
    ]
      .filter(Boolean)
      .join(", ");
    const postalCode =
      brandingSettings?.contact_address_line3?.match(/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i)?.[0] ||
      undefined;

    const schema =
      pageSeo?.schema_json ??
      buildDefaultJsonLd({
        pathname: location.pathname,
        pageTitle,
        pageDescription: metaDescription,
        siteUrl,
        companyName,
        streetAddress: streetAddress || undefined,
        postalCode,
        telephone: brandingSettings?.contact_phone || undefined,
      });

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-seo-json", "true");
    script.textContent = typeof schema === "string" ? schema : JSON.stringify(schema);
    document.head.appendChild(script);
  }, [brandingSettings, seoSettings, pageSeo, location.pathname, isNotFound]);

  return null;
};

export default MetaTagsUpdater;
