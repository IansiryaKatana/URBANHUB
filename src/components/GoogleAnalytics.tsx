import { useEffect, useRef } from "react";
import { useWebsiteAnalyticsSettings } from "@/hooks/useWebsiteAnalyticsSettings";

export default function GoogleAnalytics() {
  const { data: settings } = useWebsiteAnalyticsSettings();
  const injected = useRef<{ ga?: boolean; gtm?: boolean }>({});

  useEffect(() => {
    if (!settings?.is_active) return;

    const gaId = settings.google_analytics_id?.trim();
    const gtmId = settings.google_tag_manager_id?.trim();
    if (!gaId && !gtmId) return;

    // Defer analytics until browser idle to reduce main-thread work and TBT (performance)
    const schedule = (cb: () => void, opts?: { timeout?: number }) => {
      if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(cb, { timeout: opts?.timeout ?? 3000 });
      } else {
        setTimeout(cb, 1500);
      }
    };

    const inject = () => {
      // When GTM is set, load ONLY GTM (GA4 should be configured inside GTM). Avoids double-loading
      // and ensures the correct container is used. When only GA is set, load gtag direct.
      if (gtmId && !injected.current.gtm) {
        const script = document.createElement("script");
        script.innerHTML = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start': new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`;
        document.head.appendChild(script);
        const noscript = document.createElement("noscript");
        noscript.innerHTML = `<iframe src="https://www.googletagmanager.com/ns.html?id=${gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`;
        document.body.appendChild(noscript);
        injected.current.gtm = true;
      } else if (gaId && !injected.current.ga) {
        // No GTM: load GA4 via gtag
        const script = document.createElement("script");
        script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
        script.async = true;
        document.head.appendChild(script);
        const config = document.createElement("script");
        config.innerHTML = `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${gaId}');`;
        document.head.appendChild(config);
        injected.current.ga = true;
      }
    };

    schedule(inject);
  }, [settings]);

  return null;
}
