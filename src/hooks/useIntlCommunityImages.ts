import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type IntlCommunityImage = {
  id: string;
  image_url: string;
  image_path: string | null;
  alt_text: string | null;
  display_order: number;
  is_active: boolean;
};

export function useIntlCommunityImages() {
  return useQuery({
    queryKey: ["website-intl-community-images"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("website_intl_community_images")
        .select("id, image_url, image_path, alt_text, display_order, is_active")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching intl community images:", error);
        throw error;
      }

      return (data || []) as IntlCommunityImage[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
