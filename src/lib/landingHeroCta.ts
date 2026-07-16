export type LandingHeroCtaType =
  | "viewing"
  | "callback"
  | "refer_friend"
  | "content_creator"
  | "secure_booking"
  | "custom_link";

export type LandingHeroAlignment = "left" | "center";

export const LANDING_HERO_CTA_OPTIONS: { value: LandingHeroCtaType; label: string }[] = [
  { value: "viewing", label: "Book a viewing" },
  { value: "callback", label: "Get a callback" },
  { value: "refer_friend", label: "Refer a friend" },
  { value: "content_creator", label: "Content creator form" },
  { value: "secure_booking", label: "Secure booking payment" },
  { value: "custom_link", label: "Custom link" },
];

export function getLandingHeroCtaLabel(
  type: LandingHeroCtaType | null | undefined,
  label?: string | null,
): string {
  const trimmed = label?.trim();
  if (trimmed) return trimmed;
  switch (type) {
    case "callback":
      return "Get a callback";
    case "refer_friend":
      return "Refer a friend";
    case "content_creator":
      return "Apply as content creator";
    case "secure_booking":
      return "Secure your booking";
    case "custom_link":
      return "Learn more";
    default:
      return "Book a viewing";
  }
}

export function hasSecondaryLandingCta(opts: {
  label?: string | null;
  type?: LandingHeroCtaType | null;
}): boolean {
  return Boolean(opts.label?.trim() && opts.type);
}
