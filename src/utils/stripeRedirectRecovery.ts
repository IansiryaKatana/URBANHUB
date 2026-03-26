type PaymentFlow = "secure_booking" | "refer_friend" | "pay_urban_hub";

type PendingPaymentPayload = {
  intentId: string;
  flow: PaymentFlow;
  data: Record<string, unknown>;
  createdAt: number;
};

const PENDING_KEY = "stripe_pending_payments_v1";
const PROCESSED_KEY = "stripe_processed_intents_v1";
const MAX_AGE_MS = 1000 * 60 * 60 * 24;

function readMap<T>(key: string): Record<string, T> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap<T>(key: string, value: Record<string, T>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getIntentIdFromClientSecret(clientSecret: string): string | null {
  const match = clientSecret.trim().match(/^(pi_[^_]+)_secret_/);
  return match ? match[1] : null;
}

export function savePendingPayment(payload: PendingPaymentPayload) {
  const map = readMap<PendingPaymentPayload>(PENDING_KEY);
  map[payload.intentId] = payload;
  writeMap(PENDING_KEY, map);
}

export function getPendingPayment(intentId: string, expectedFlow: PaymentFlow): PendingPaymentPayload | null {
  const map = readMap<PendingPaymentPayload>(PENDING_KEY);
  const pending = map[intentId];
  if (!pending || pending.flow !== expectedFlow) return null;
  if (Date.now() - pending.createdAt > MAX_AGE_MS) {
    delete map[intentId];
    writeMap(PENDING_KEY, map);
    return null;
  }
  return pending;
}

export function clearPendingPayment(intentId: string) {
  const map = readMap<PendingPaymentPayload>(PENDING_KEY);
  delete map[intentId];
  writeMap(PENDING_KEY, map);
}

export function isIntentProcessed(intentId: string): boolean {
  const map = readMap<number>(PROCESSED_KEY);
  const processedAt = map[intentId];
  if (!processedAt) return false;
  if (Date.now() - processedAt > MAX_AGE_MS) {
    delete map[intentId];
    writeMap(PROCESSED_KEY, map);
    return false;
  }
  return true;
}

export function markIntentProcessed(intentId: string) {
  const map = readMap<number>(PROCESSED_KEY);
  map[intentId] = Date.now();
  writeMap(PROCESSED_KEY, map);
}

export function getStripeRedirectResultFromUrl() {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const intentId = url.searchParams.get("payment_intent");
  const redirectStatus = url.searchParams.get("redirect_status");
  if (!intentId || redirectStatus !== "succeeded") return null;
  return { intentId };
}

export function getReturnUrlForFlow(flow: PaymentFlow): string {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  url.searchParams.set("payment_flow", flow);
  return url.toString();
}

export function clearStripeRedirectParamsFromUrl() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  [
    "payment_intent",
    "payment_intent_client_secret",
    "redirect_status",
    "payment_flow",
  ].forEach((k) => url.searchParams.delete(k));
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}
