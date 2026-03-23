/**
 * Google Tag Manager / GA4 dataLayer push utility.
 * Use consistent event names and parameters so GTM can fire tags and GA4 can track conversions.
 */

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export type DataLayerEventParams = {
  /** GA4 event category (legacy; GA4 prefers custom params) */
  event_category?: string;
  /** GA4 event action */
  event_action?: string;
  /** GA4 event label (e.g. button id or CTA name) */
  event_label?: string;
  /** Page where the event occurred */
  page_path?: string;
  /** Form type: callback | viewing | contact | short_term | refer_friend etc. */
  form_type?: string;
  /** Where the form/CTA was opened: nav | landing_hero | studios_hero | landing_grade | inline */
  cta_source?: string;
  /** Element identifier (e.g. data-analytics value) for which page/context converted */
  element_id?: string;
  /** Tag name from website_analytics_tags (internal) */
  tag_name?: string;
  /** Extra key-value for GTM/GA */
  landing_slug?: string;
  cta_tracking_key?: string;
  cta_type?: string;
  event_id?: string;
  value?: number;
  currency?: string;
  payment_intent_id?: string;
  [key: string]: string | number | boolean | undefined;
};

/**
 * Push an event to window.dataLayer for GTM/GA4.
 * GTM can use Custom Event trigger with Event name = eventName,
 * and pass parameters to GA4 as event parameters.
 */
export function pushDataLayer(eventName: string, params?: DataLayerEventParams): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  const payload: Record<string, unknown> = {
    event: eventName,
    ...(params && Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))),
  };
  window.dataLayer.push(payload);
}

export function createTrackingEventId(prefix = "evt"): string {
  const base = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${base}`;
}
