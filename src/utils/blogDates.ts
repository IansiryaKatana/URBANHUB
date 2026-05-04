import { format, parseISO } from "date-fns";

/** Dates before this are treated as bad data (epoch, corrupt imports). */
const MIN_PLAUSIBLE_YEAR = 2000;

export function isPlausibleBlogDate(iso: string | null | undefined): boolean {
  if (iso == null || iso === "") return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const y = d.getFullYear();
  return y >= MIN_PLAUSIBLE_YEAR;
}

/**
 * Display format for blog listings and article headers.
 * Returns empty string only when there is no usable date (caller may substitute a label).
 */
export function formatBlogPostDate(
  iso: string | null | undefined,
  emptyLabel = ""
): string {
  if (!isPlausibleBlogDate(iso)) return emptyLabel;
  try {
    return format(parseISO(iso as string), "MMMM dd, yyyy");
  } catch {
    return emptyLabel;
  }
}

/** Shorter label for admin tables. */
export function formatBlogPostDateShort(
  iso: string | null | undefined,
  emptyLabel = "—"
): string {
  if (!isPlausibleBlogDate(iso)) return emptyLabel;
  try {
    return format(parseISO(iso as string), "MMM d, yyyy");
  } catch {
    return emptyLabel;
  }
}

/** Value for native datetime-local inputs (local wall time, no seconds). */
export function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!isPlausibleBlogDate(iso)) return "";
  try {
    const d = parseISO(iso as string);
    return format(d, "yyyy-MM-dd'T'HH:mm");
  } catch {
    return "";
  }
}

export function fromDatetimeLocalToIso(local: string): string | null {
  const t = local.trim();
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/** Saves ISO from datetime-local, or now when publishing with an empty field, or null for drafts. */
export function resolvePublishedAtForSave(status: string, datetimeLocal: string): string | null {
  const fromInput = fromDatetimeLocalToIso(datetimeLocal);
  if (fromInput) return fromInput;
  if (status === "published") return new Date().toISOString();
  return null;
}
