import { useEffect } from "react";
import { useWebsiteSeoSettings } from "@/hooks/useWebsiteSeoSettings";

/**
 * Google Search Console Verification Component
 * Adds verification meta tag if configured in database
 */
export default function GoogleSearchConsole() {
  const { data: seoSettings } = useWebsiteSeoSettings();

  useEffect(() => {
    const verificationCode = seoSettings?.google_search_console_verification?.trim();
    
    if (!verificationCode) return;

    // Check if meta tag already exists
    let meta = document.querySelector('meta[name="google-site-verification"]') as HTMLMetaElement;
    
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "google-site-verification");
      document.head.appendChild(meta);
    }
    
    meta.setAttribute("content", verificationCode);
  }, [seoSettings]);

  return null;
}
