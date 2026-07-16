import { supabase } from "@/integrations/supabase/client";
import type { LandingHeroAlignment, LandingHeroCtaType } from "@/lib/landingHeroCta";

export const LANDING_HERO_SLIDE_SELECT_FULL =
  "id, title, subtitle, subtitle_link_url, content_alignment, cta_label, cta_type, cta_url, cta_tracking_key, cta2_label, cta2_type, cta2_url, cta2_tracking_key, desktop_image_url, desktop_image_alt, mobile_image_url, mobile_image_alt, h1_image_url, h1_image_alt, h1_image_scale, h1_image_scale_mobile, sort_order, is_active, show_on_homepage, homepage_order, landing_page_id";

export const LANDING_HERO_SLIDE_SELECT_LEGACY =
  "id, title, subtitle, subtitle_link_url, cta_label, cta_type, cta_tracking_key, desktop_image_url, desktop_image_alt, mobile_image_url, mobile_image_alt, h1_image_url, h1_image_alt, h1_image_scale, h1_image_scale_mobile, sort_order, is_active, show_on_homepage, homepage_order, landing_page_id";

export type LandingHeroSlideRow = {
  id: string;
  title: string;
  subtitle: string | null;
  subtitle_link_url: string | null;
  content_alignment?: LandingHeroAlignment | null;
  cta_label: string | null;
  cta_type: LandingHeroCtaType | null;
  cta_url?: string | null;
  cta_tracking_key: string | null;
  cta2_label?: string | null;
  cta2_type?: LandingHeroCtaType | null;
  cta2_url?: string | null;
  cta2_tracking_key?: string | null;
  desktop_image_url: string | null;
  desktop_image_alt?: string | null;
  mobile_image_url: string | null;
  mobile_image_alt?: string | null;
  h1_image_url: string | null;
  h1_image_alt: string | null;
  h1_image_scale: number | null;
  h1_image_scale_mobile: number | null;
  sort_order?: number;
  is_active?: boolean;
  show_on_homepage?: boolean;
  homepage_order?: number | null;
  landing_page_id?: string;
};

function isMissingColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "42703" ||
    Boolean(error.message?.includes("does not exist")) ||
    Boolean(error.message?.includes("content_alignment"))
  );
}

/**
 * Selects landing hero slides, falling back to legacy columns when
 * migration 041 has not been applied yet.
 */
export async function fetchLandingHeroSlides(opts: {
  select?: string;
  legacySelect?: string;
  applyFilters: (query: any) => any;
}): Promise<{ data: LandingHeroSlideRow[]; error: { code?: string; message?: string } | null }> {
  const fullSelect = opts.select || LANDING_HERO_SLIDE_SELECT_FULL;
  const legacySelect = opts.legacySelect || LANDING_HERO_SLIDE_SELECT_LEGACY;

  const fullQuery = opts.applyFilters(supabase.from("website_landing_hero_slides").select(fullSelect));
  const { data, error } = await fullQuery;

  if (!error) {
    return { data: (data || []) as LandingHeroSlideRow[], error: null };
  }

  if (!isMissingColumnError(error)) {
    return { data: [], error };
  }

  console.warn(
    "Landing hero layout columns missing — using legacy select. Apply migration 041_landing_hero_slide_layout_and_secondary_cta.sql.",
  );

  const legacyQuery = opts.applyFilters(
    supabase.from("website_landing_hero_slides").select(legacySelect),
  );
  const legacy = await legacyQuery;
  if (legacy.error) {
    return { data: [], error: legacy.error };
  }

  return {
    data: ((legacy.data || []) as LandingHeroSlideRow[]).map((row) => ({
      ...row,
      content_alignment: row.content_alignment ?? "center",
      cta_url: row.cta_url ?? null,
      cta2_label: row.cta2_label ?? null,
      cta2_type: row.cta2_type ?? null,
      cta2_url: row.cta2_url ?? null,
      cta2_tracking_key: row.cta2_tracking_key ?? null,
    })),
    error: null,
  };
}
