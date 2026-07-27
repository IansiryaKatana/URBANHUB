/**
 * Meta Pixel / TikTok helpers for GTM-era race conditions:
 * - Queue fbq early so GTM Custom HTML tags don't throw "fbq is not defined"
 * - Load fbevents.js once so the stub can flush
 * - Ignore duplicate fbq('init', sameId) so Meta doesn't warn
 */

declare global {
  interface Window {
    fbq?: FbqFn;
    _fbq?: FbqFn;
    ttq?: {
      track: (event: string, params?: Record<string, unknown>) => void;
      page?: () => void;
      load?: (id: string) => void;
    };
    __UH_FB_EVENTS_LOADING__?: boolean;
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
};

const META_INITED = new Set<string>();

/** Install Meta queue stub + load fbevents.js once (safe if GTM also installs Meta). */
export function ensureMetaPixelBase(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  if (!window.fbq) {
    const fbq: FbqFn = function (...args: unknown[]) {
      if (args[0] === "init" && typeof args[1] === "string") {
        if (META_INITED.has(args[1])) return;
        META_INITED.add(args[1]);
      }
      if (typeof fbq.callMethod === "function") {
        fbq.callMethod.apply(fbq, args as never);
      } else {
        (fbq.queue = fbq.queue || []).push(args as unknown[]);
      }
    };
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    window.fbq = fbq;
    if (!window._fbq) window._fbq = fbq;
  } else {
    // Wrap existing fbq to suppress duplicate init of same pixel ID
    const original = window.fbq;
    if (!(original as FbqFn & { __uhWrapped?: boolean }).__uhWrapped) {
      const wrapped: FbqFn = function (...args: unknown[]) {
        if (args[0] === "init" && typeof args[1] === "string") {
          if (META_INITED.has(args[1])) return;
          META_INITED.add(args[1]);
        }
        return original.apply(null, args as never);
      };
      wrapped.callMethod = original.callMethod;
      wrapped.queue = original.queue;
      wrapped.loaded = original.loaded;
      wrapped.version = original.version;
      wrapped.push = wrapped;
      (wrapped as FbqFn & { __uhWrapped?: boolean }).__uhWrapped = true;
      window.fbq = wrapped;
      window._fbq = wrapped;
    }
  }

  if (window.__UH_FB_EVENTS_LOADING__) return;
  window.__UH_FB_EVENTS_LOADING__ = true;

  if (!document.querySelector('script[src*="connect.facebook.net"][src*="fbevents"]')) {
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    document.head.appendChild(script);
  }
}

/** TikTok standard / allowed event mapping for our dataLayer names. */
const TIKTOK_EVENT_MAP: Record<string, string> = {
  page_view: "ViewContent",
  lp_view: "ViewContent",
  lp_cta_click: "ClickButton",
  lp_form_start: "Contact",
  lead_form_open: "Contact",
  form_submit: "SubmitForm",
  lp_form_submit: "SubmitForm",
  lp_lead: "SubmitForm",
  lp_purchase: "CompletePayment",
};

/** Click attempts must not fire ad conversion pixels. */
const TIKTOK_SKIP_EVENTS = new Set(["form_submit_click"]);

/** Sanitize a custom TikTok event name to meet format rules. */
export function toTikTokEventName(name: string): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  if (TIKTOK_SKIP_EVENTS.has(trimmed)) return null;

  const mapped = TIKTOK_EVENT_MAP[trimmed];
  if (mapped) return mapped;

  // letters, numbers, underscore, dash only; must start with a letter; max 50
  let sanitized = trimmed.replace(/[^A-Za-z0-9_-]/g, "_").replace(/_+/g, "_");
  sanitized = sanitized.replace(/^[^A-Za-z]+/, "");
  if (!sanitized || !/^[A-Za-z]/.test(sanitized)) return null;
  return sanitized.slice(0, 50);
}

/** Fire a mapped TikTok event when ttq is available (no-ops otherwise). */
export function trackTikTokFromDataLayer(
  eventName: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === "undefined" || !window.ttq?.track) return;
  const tiktokName = toTikTokEventName(eventName);
  if (!tiktokName) return;
  try {
    window.ttq.track(tiktokName, params);
  } catch {
    // Pixel may reject malformed params; never break UX
  }
}
