import { useEffect } from "react";
import { useBrandingSetting } from "@/hooks/useBranding";

const FaviconUpdater = () => {
  const faviconPath = useBrandingSetting("favicon_path");

  useEffect(() => {
    if (faviconPath) {
      // Remove existing favicon links
      const existingLinks = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
      existingLinks.forEach((link) => link.remove());

      // Add new favicon link
      const link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/png";
      link.href = faviconPath;
      document.head.appendChild(link);

      const ensureMetaTag = (selector: string, attr: "property" | "name", key: string, content: string) => {
        let meta = document.querySelector(selector) as HTMLMetaElement | null;
        if (!meta) {
          meta = document.createElement("meta");
          meta.setAttribute(attr, key);
          meta.setAttribute("content", content);
          document.head.appendChild(meta);
        }
      };

      ensureMetaTag('meta[property="og:image"]', "property", "og:image", faviconPath);
      ensureMetaTag('meta[name="twitter:image"]', "name", "twitter:image", faviconPath);
    }
  }, [faviconPath]);

  return null;
};

export default FaviconUpdater;

