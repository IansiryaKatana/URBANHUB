import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useWebsiteAnalyticsTags } from "@/hooks/useWebsiteAnalyticsTags";
import { pushDataLayer } from "@/utils/dataLayer";

const SESSION_KEY = "website_session_id";

function getSessionId(): string {
  let s = sessionStorage.getItem(SESSION_KEY);
  if (!s) {
    s = crypto.randomUUID?.() ?? `s${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(SESSION_KEY, s);
  }
  return s;
}

function recordPageView(page_path: string, retryCount = 0) {
  const payload = {
    page_path,
    session_id: getSessionId(),
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
  };
  supabase.from("website_analytics_page_views").insert(payload).then(({ error }) => {
    if (error) {
      console.warn("[Analytics] Page view insert failed:", error.message, error.code || "");
      if (retryCount < 1) {
        setTimeout(() => recordPageView(page_path, retryCount + 1), 1500);
      } else if (import.meta.env.PROD) {
        console.warn("[Analytics] If data stopped after a deploy, check Netlify env: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.");
      }
    }
  });
}

function recordEvent(event_name: string, page_path: string, element_id: string | null, element_text: string | null, metadata?: Record<string, unknown>) {
  supabase.from("website_analytics_events").insert({
    event_name,
    element_id,
    element_text,
    page_path,
    session_id: getSessionId(),
    metadata: metadata ?? null,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
  }).then(({ error }) => {
    if (error) console.warn("[Analytics] Event insert failed:", error.message);
  });
}

export default function WebsiteAnalyticsTracker() {
  const location = useLocation();
  const { data: tags } = useWebsiteAnalyticsTags();
  const clickHandlerAttached = useRef(false);

  // Record page view on route change (Supabase + dataLayer for GTM/GA4 SPA)
  useEffect(() => {
    const path = location.pathname || "/";
    recordPageView(path);
    pushDataLayer("page_view", { page_path: path, event_action: "page_view" });
  }, [location.pathname]);

  // Attach delegated click listener for tracked elements
  useEffect(() => {
    if (!tags?.length || clickHandlerAttached.current) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target || !document.body.contains(target)) return;

      for (const tag of tags) {
        try {
          if (target.matches?.(tag.element_selector) || target.closest?.(tag.element_selector)) {
            const el = target.matches?.(tag.element_selector) ? target : target.closest(tag.element_selector) as HTMLElement | null;
            const element_id = el?.id ?? el?.getAttribute?.("data-analytics") ?? null;
            const element_text = (el?.textContent ?? "").trim().slice(0, 200) || null;
            const page_path = window.location.pathname || "/";
            recordEvent(
              tag.event_name,
              page_path,
              element_id,
              element_text,
              { tag_name: tag.tag_name, category: tag.category ?? undefined }
            );
            pushDataLayer(tag.event_name, {
              event_category: tag.category ?? undefined,
              event_action: tag.event_name,
              event_label: element_id ?? tag.tag_name,
              page_path,
              element_id: element_id ?? undefined,
              tag_name: tag.tag_name,
            });
            break;
          }
        } catch {
          // Invalid selector, skip
        }
      }
    };

    document.body.addEventListener("click", handleClick, true);
    clickHandlerAttached.current = true;
    return () => {
      document.body.removeEventListener("click", handleClick, true);
      clickHandlerAttached.current = false;
    };
  }, [tags]);

  return null;
}
