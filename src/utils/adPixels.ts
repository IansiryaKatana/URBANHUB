/**
 * Meta Pixel / TikTok helpers for GTM-era race conditions:
 * - Queue fbq early so GTM Custom HTML tags don't throw "fbq is not defined"
 * - Load fbevents.js once so the stub can flush
 * - Ignore duplicate fbq('init', sameId) so Meta doesn't warn
 * - Sanitize event names GTM forwards (gtm.js, scroll, page_view, …)
 */

declare global {
  interface Window {
    fbq?: FbqFn;
    _fbq?: FbqFn;
    ttq?: TikTokQ;
    __UH_FB_EVENTS_LOADING__?: boolean;
    __UH_TTQ_GUARD__?: boolean;
    __UH_GTM_INJECTED__?: string;
    __UH_GA_INJECTED__?: string;
  }
}

type FbqFn = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[][];
  loaded?: boolean;
  version?: string;
  push?: FbqFn;
  __uhWrapped?: boolean;
};

type TikTokTrackFn = ((event: string, params?: Record<string, unknown>) => void) & {
  __uhGuard?: boolean;
};

type TikTokQ = {
  track?: TikTokTrackFn;
  page?: () => void;
  load?: (id: string) => void;
  [key: string]: unknown;
};

const META_INITED = new Set<string>();

const META_STANDARD_EVENTS = new Set([
  "PageView",
  "ViewContent",
  "Search",
  "AddToCart",
  "AddToWishlist",
  "InitiateCheckout",
  "AddPaymentInfo",
  "Purchase",
  "Lead",
  "CompleteRegistration",
  "Contact",
  "CustomizeProduct",
  "Donate",
  "FindLocation",
  "Schedule",
  "StartTrial",
  "SubmitApplication",
  "Subscribe",
]);

/** TikTok standard events we map conversions onto. */
const TIKTOK_STANDARD_EVENTS = new Set([
  "Pageview",
  "ViewContent",
  "ClickButton",
  "Search",
  "AddToWishlist",
  "AddToCart",
  "InitiateCheckout",
  "AddPaymentInfo",
  "CompletePayment",
  "PlaceAnOrder",
  "Contact",
  "Download",
  "SubmitForm",
  "CompleteRegistration",
  "Subscribe",
  "Lead",
  "Purchase",
]);

const TIKTOK_NEEDS_CONTENT_ID = new Set([
  "ViewContent",
  "AddToCart",
  "AddToWishlist",
  "InitiateCheckout",
  "CompletePayment",
  "Purchase",
  "PlaceAnOrder",
]);

/** GTM / GA4 noise that is not a valid ad conversion event. */
const PIXEL_SKIP_EVENTS = new Set([
  "form_submit_click",
  "scroll",
  "click",
  "file_download",
  "video_start",
  "video_progress",
  "video_complete",
  "view_search_results",
  "user_engagement",
  "session_start",
  "first_visit",
  "gtm.js",
  "gtm.dom",
  "gtm.load",
  "gtm.click",
  "gtm.linkClick",
  "gtm.formSubmit",
  "gtm.historyChange",
  "gtm.historyChange-v2",
  "gtm.init",
  "gtm.start",
  "gtm.consent",
  "gtm.consentUpdate",
]);

/** TikTok standard / allowed event mapping for our dataLayer names. */
const TIKTOK_EVENT_MAP: Record<string, string> = {
  lp_view: "ViewContent",
  lp_cta_click: "ClickButton",
  lp_form_start: "Contact",
  lead_form_open: "Contact",
  form_submit: "Lead",
  lp_form_submit: "Lead",
  lp_lead: "Lead",
  lp_purchase: "Purchase",
};

function isPixelNoiseEvent(name: string): boolean {
  if (PIXEL_SKIP_EVENTS.has(name)) return true;
  if (name.startsWith("gtm.") || name.startsWith("gtag.")) return true;
  return false;
}

function normalizeFbqCall(args: unknown[]): unknown[] | null {
  if (args[0] === "init" && typeof args[1] === "string") {
    if (META_INITED.has(args[1])) return null;
    META_INITED.add(args[1]);
    return args;
  }

  if ((args[0] === "track" || args[0] === "trackCustom") && typeof args[1] === "string") {
    const name = args[1];
    if (isPixelNoiseEvent(name)) return null;
    if (args[0] === "track" && !META_STANDARD_EVENTS.has(name)) {
      return ["trackCustom", name, ...args.slice(2)];
    }
  }

  return args;
}

function installFbqStub(): FbqFn {
  const fbq: FbqFn = function (...args: unknown[]) {
    const next = normalizeFbqCall(args);
    if (!next) return;
    if (typeof fbq.callMethod === "function") {
      fbq.callMethod.apply(fbq, next as never);
    } else {
      (fbq.queue = fbq.queue || []).push(next as unknown[]);
    }
  };
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  fbq.__uhWrapped = true;
  return fbq;
}

function wrapExistingFbq(original: FbqFn): FbqFn {
  if (original.__uhWrapped) return original;
  const wrapped: FbqFn = function (...args: unknown[]) {
    const next = normalizeFbqCall(args);
    if (!next) return;
    return original.apply(null, next as never);
  };
  wrapped.callMethod = original.callMethod;
  wrapped.queue = original.queue;
  wrapped.loaded = original.loaded;
  wrapped.version = original.version;
  wrapped.push = wrapped;
  wrapped.__uhWrapped = true;
  return wrapped;
}

/** Install Meta queue stub + load fbevents.js once (safe if GTM also installs Meta). */
export function ensureMetaPixelBase(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  if (!window.fbq) {
    const fbq = installFbqStub();
    window.fbq = fbq;
    if (!window._fbq) window._fbq = fbq;
  } else {
    const wrapped = wrapExistingFbq(window.fbq);
    window.fbq = wrapped;
    window._fbq = wrapped;
  }

  ensureTikTokTrackGuard();

  if (window.__UH_FB_EVENTS_LOADING__) return;
  window.__UH_FB_EVENTS_LOADING__ = true;

  if (!document.querySelector('script[src*="connect.facebook.net"][src*="fbevents"]')) {
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }
}

/** Sanitize a custom TikTok event name to meet format rules. */
export function toTikTokEventName(name: string): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  if (isPixelNoiseEvent(trimmed)) return null;

  // SPA page views use ttq.page() — do not send ViewContent (needs content_id / VSA).
  if (trimmed === "page_view" || trimmed === "PageView" || trimmed === "Pageview") return null;

  const mapped = TIKTOK_EVENT_MAP[trimmed];
  if (mapped) return mapped;
  if (TIKTOK_STANDARD_EVENTS.has(trimmed)) return trimmed;

  // letters, numbers, underscore, dash only; must start with a letter; max 50
  let sanitized = trimmed.replace(/[^A-Za-z0-9_-]/g, "_").replace(/[_-]+/g, "_");
  sanitized = sanitized.replace(/^[^A-Za-z]+/, "").replace(/_+$/g, "");
  if (!sanitized || !/^[A-Za-z][A-Za-z0-9_-]{0,49}$/.test(sanitized)) return null;
  return sanitized.slice(0, 50);
}

function tiktokTrackParams(
  eventName: string,
  params?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const pagePath =
    (typeof params?.page_path === "string" && params.page_path) ||
    (typeof window !== "undefined" ? window.location.pathname : "/") ||
    "/";
  const contentId =
    (typeof params?.content_id === "string" && params.content_id) ||
    (typeof params?.element_id === "string" && params.element_id) ||
    (typeof params?.landing_slug === "string" && params.landing_slug) ||
    pagePath;

  const out: Record<string, unknown> = {};
  if (typeof params?.value === "number") out.value = params.value;
  if (typeof params?.currency === "string") out.currency = params.currency;
  if (typeof params?.content_name === "string") out.content_name = params.content_name;
  else if (typeof params?.event_label === "string") out.content_name = params.event_label;

  if (TIKTOK_NEEDS_CONTENT_ID.has(eventName)) {
    out.content_id = String(contentId);
    out.content_type = typeof params?.content_type === "string" ? params.content_type : "product";
  }

  return Object.keys(out).length ? out : undefined;
}

function wrapTikTokObject(ttq: TikTokQ): TikTokQ {
  if (typeof ttq.track !== "function" || ttq.track.__uhGuard) return ttq;
  const originalTrack = ttq.track.bind(ttq);
  const guarded: TikTokTrackFn = (event, params) => {
    const tiktokName = toTikTokEventName(event);
    if (!tiktokName) return;
    originalTrack(tiktokName, tiktokTrackParams(tiktokName, params));
  };
  guarded.__uhGuard = true;
  ttq.track = guarded;
  return ttq;
}

/** Intercept ttq.track so GTM-forwarded names like gtm.js / scroll never hit TikTok. */
export function ensureTikTokTrackGuard(): void {
  if (typeof window === "undefined") return;

  const wrapIfPresent = () => {
    if (window.ttq) wrapTikTokObject(window.ttq);
  };

  wrapIfPresent();

  if (window.__UH_TTQ_GUARD__) return;
  window.__UH_TTQ_GUARD__ = true;

  try {
    let current = window.ttq;
    Object.defineProperty(window, "ttq", {
      configurable: true,
      enumerable: true,
      get() {
        return current;
      },
      set(value: TikTokQ) {
        current = value ? wrapTikTokObject(value) : value;
      },
    });
    if (current) current = wrapTikTokObject(current);
  } catch {
    // Some browsers / pixels lock ttq; fall back to polling.
  }

  let attempts = 0;
  const timer = window.setInterval(() => {
    wrapIfPresent();
    attempts += 1;
    if (attempts > 40) window.clearInterval(timer);
  }, 250);
}

/** Fire a mapped TikTok event when ttq is available (no-ops otherwise). */
export function trackTikTokFromDataLayer(
  eventName: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  ensureTikTokTrackGuard();

  if (eventName === "page_view") {
    try {
      window.ttq?.page?.();
    } catch {
      // Pixel may not be ready yet
    }
    return;
  }

  if (!window.ttq?.track) return;
  const tiktokName = toTikTokEventName(eventName);
  if (!tiktokName) return;
  try {
    window.ttq.track(tiktokName, tiktokTrackParams(tiktokName, params));
  } catch {
    // Pixel may reject malformed params; never break UX
  }
}
