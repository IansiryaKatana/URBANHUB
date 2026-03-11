import { supabase } from "@/integrations/supabase/client";
import { pushDataLayer } from "@/utils/dataLayer";

const SESSION_KEY = "website_session_id";

function getSessionId(): string {
  if (typeof sessionStorage === "undefined") return "";
  let s = sessionStorage.getItem(SESSION_KEY);
  if (!s) {
    s = crypto.randomUUID?.() ?? `s${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(SESSION_KEY, s);
  }
  return s;
}

export function recordFormSubmitEvent(form_type: string, page_path: string) {
  const path = page_path || "/";
  supabase
    .from("website_analytics_events")
    .insert({
      event_name: "form_submit",
      page_path: path,
      metadata: { form_type },
      session_id: getSessionId(),
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    })
    .then(({ error }) => {
      if (error) console.warn("[Analytics] Form submit event failed:", error.message);
    });
  pushDataLayer("form_submit", {
    event_action: "form_submit",
    event_label: form_type,
    page_path: path,
    form_type,
  });
}
