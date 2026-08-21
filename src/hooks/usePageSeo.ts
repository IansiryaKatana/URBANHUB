import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isStudiosYearPath, seoLookupPath } from "@/lib/seo";

export type PageSeo = {
  page_type: string | null;
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

const SEO_SELECT =
  "page_type, meta_title, meta_description, og_title, og_description, og_image_url, og_image_alt, twitter_title, twitter_description, twitter_image_url, twitter_image_alt, canonical_url, robots_meta, schema_json";

async function fetchSeoByPath(pagePath: string) {
  const { data, error } = await supabase
    .from("seo_pages")
    .select(SEO_SELECT)
    .eq("page_path", pagePath)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as PageSeo | null;
}

export function usePageSeo(pagePath: string) {
  const path = (pagePath || "/").replace(/^\s+|\s+$/g, "") || "/";

  return useQuery({
    queryKey: ["seo-page", path],
    queryFn: async () => {
      if (path === "/") {
        const homeData = await fetchSeoByPath("/");
        if (homeData) return homeData;
        return fetchSeoByPath("/studios");
      }
      const lookupPath = seoLookupPath(path);
      const exact = await fetchSeoByPath(lookupPath);
      if (exact) return exact;
      if (isStudiosYearPath(path)) {
        return fetchSeoByPath("/studios");
      }
      return null;
    },
    enabled: !!path,
    staleTime: 5 * 60 * 1000,
  });
}
