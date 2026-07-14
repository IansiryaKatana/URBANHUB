import { useEffect } from "react";
import { useWebsiteAnalyticsSettings } from "@/hooks/useWebsiteAnalyticsSettings";
import { ensureMetaPixelBase } from "@/utils/adPixels";

export default function GoogleAnalytics() {
  const { data: settings } = useWebsiteAnalyticsSettings();

  useEffect(() => {
    if (!settings?.is_active) return;

    const gaId = settings.google_analytics_id?.trim();
    const gtmId = settings.google_tag_manager_id?.trim();
    if (!gaId && !gtmId) return;

    // Meta stub + fbevents before GTM so Custom HTML tags calling fbq() don't throw
    ensureMetaPixelBase();

    // Defer GTM/gtag until idle to reduce main-thread work (performance)
    const schedule = (cb: () => void, opts?: { timeout?: number }) => {
      if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(cb, { timeout: opts?.timeout ?? 3000 });
      } else {
        setTimeout(cb, 1500);
      }
    };

    const inject = () => {
      // When GTM is set, load ONLY GTM (GA4 should be configured inside GTM).
      if (gtmId) {
        if (window.__UH_GTM_INJECTED__ === gtmId) return;
        if (document.querySelector(`script[src*="googletagmanager.com/gtm.js?id=${gtmId}"]`)) {
          window.__UH_GTM_INJECTED__ = gtmId;
          return;
        }
        window.__UH_GTM_INJECTED__ = gtmId;
        const script = document.createElement("script");
        script.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`;
        document.head.appendChild(script);
        if (!document.querySelector(`noscript iframe[src*="googletagmanager.com/ns.html?id=${gtmId}"]`)) {
          const noscript = document.createElement("noscript");
          noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
          document.body.appendChild(noscript);
        }
        return;
      }

      if (gaId) {
        if (window.__UH_GA_INJECTED__ === gaId) return;
        window.__UH_GA_INJECTED__ = gaId;
        const script = document.createElement("script");
        script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
        script.async = true;
        document.head.appendChild(script);
        const config = document.createElement("script");
        config.innerHTML = `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${gaId}');`;
        document.head.appendChild(config);
      }
    };

    schedule(inject);
  }, [settings]);

  return null;
}
