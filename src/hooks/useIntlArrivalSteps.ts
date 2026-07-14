import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type IntlArrivalStep = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  image_path: string | null;
  display_order: number;
  is_active: boolean;
};

export function useIntlArrivalSteps() {
  return useQuery({
    queryKey: ["website-intl-arrival-steps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("website_intl_arrival_steps")
        .select("id, title, description, image_url, image_path, display_order, is_active")
        .eq("is_active", true)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching intl arrival steps:", error);
        throw error;
      }

      return (data || []) as IntlArrivalStep[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
