import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TestimonialPlacement = "homepage" | "international_students";

export type Testimonial = {
  id: string;
  name: string;
  result: string;
  video_url: string;
  cover_image_url: string | null;
  cover_image_path: string | null;
  video_path: string | null;
  display_order: number;
  is_active: boolean;
  placement?: TestimonialPlacement;
  created_at: string;
  updated_at: string;
};

export function useTestimonials(placement: TestimonialPlacement = "homepage") {
  return useQuery({
    queryKey: ["website-testimonials", placement],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("website_testimonials")
        .select("*")
        .eq("is_active", true)
        .eq("placement", placement)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching testimonials:", error);
        throw error;
      }

      return (data || []) as Testimonial[];
    },
  });
}
