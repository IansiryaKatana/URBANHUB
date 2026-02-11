import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PageSeo = {
  meta_title: string | null;
  meta_description: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  og_image_alt: string | null;
  twitter_title: string | null;
  twitter_description: string | null;
  twitter_image_url: string | null;
  twitter_image_alt: string | null;
  canonical_url: string | null;
  robots_meta: string | null;
  schema_json: Record<string, unknown> | null;
};

/**
 * Normalizes paths for SEO lookup so dynamic routes use their base path.
 * e.g. /studios/2025-26 → /studios. Home "/" is not normalized here; usePageSeo tries "/" first, then "/studios".
 */
function normalizeSeoPath(path: string): string {
  if (path.startsWith("/studios/")) return "/studios";
  return path;
}

const SEO_SELECT =
  "meta_title, meta_description, og_title, og_description, og_image_url, og_image_alt, twitter_title, twitter_description, twitter_image_url, twitter_image_alt, canonical_url, robots_meta, schema_json";

export function usePageSeo(pagePath: string) {
  const path = (pagePath || "/").replace(/^\s+|\s+$/g, "") || "/";

  return useQuery({
    queryKey: ["seo-page", path],
    queryFn: async () => {
      // Homepage: use the "/" row if it exists, otherwise fall back to "/studios" so admin edits to either take effect.
      if (path === "/") {
        const { data: homeData, error: homeError } = await supabase
          .from("seo_pages")
          .select(SEO_SELECT)
          .eq("page_path", "/")
          .limit(1)
          .maybeSingle();
        if (homeError) throw homeError;
        if (homeData) return homeData as PageSeo | null;
        const { data: studiosData, error: studiosError } = await supabase
          .from("seo_pages")
          .select(SEO_SELECT)
          .eq("page_path", "/studios")
          .limit(1)
          .maybeSingle();
        if (studiosError) throw studiosError;
        return studiosData as PageSeo | null;
      }
      const lookupPath = normalizeSeoPath(path);
      const { data, error } = await supabase
        .from("seo_pages")
        .select(SEO_SELECT)
        .eq("page_path", lookupPath)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as PageSeo | null;
    },
    enabled: !!path,
    staleTime: 5 * 60 * 1000,
  });
}
