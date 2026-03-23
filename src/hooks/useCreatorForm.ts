import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { recordFormSubmitEvent } from "@/utils/recordAnalyticsEvent";
import { createTrackingEventId, pushDataLayer } from "@/utils/dataLayer";
import { CONTACT_WEBHOOK_URL } from "./useContactForm";

export type CreatorFormData = {
  full_name: string;
  email: string;
  phone: string;
  city_university: string;
  instagram?: string;
  tiktok?: string;
  snapchat?: string;
  youtube?: string;
  total_followers?: string;
  content_type: string;
  content_type_other?: string;
  content_style_summary: string;
  example_links: string;
  worked_with_brands: string;
  urbanhub_content_idea: string;
  can_visit_preston: string;
  collaboration_format: string;
  additional_info?: string;
  landing_page?: string;
  tracking_key?: string;
  cta_type?: string;
  cta_source?: string;
};

async function saveCreatorToDb(formData: CreatorFormData) {
  await supabase.from("website_form_submissions").insert({
    form_type: "content_creator",
    name: formData.full_name,
    email: formData.email,
    phone: formData.phone || null,
    message: null,
    metadata: {
      city_university: formData.city_university,
      instagram: formData.instagram,
      tiktok: formData.tiktok,
      snapchat: formData.snapchat,
      youtube: formData.youtube,
      total_followers: formData.total_followers,
      content_type: formData.content_type,
      content_type_other: formData.content_type_other,
      content_style_summary: formData.content_style_summary,
      example_links: formData.example_links,
      worked_with_brands: formData.worked_with_brands,
      urbanhub_content_idea: formData.urbanhub_content_idea,
      can_visit_preston: formData.can_visit_preston,
      collaboration_format: formData.collaboration_format,
      additional_info: formData.additional_info,
      landing_page: formData.landing_page,
    },
  });
}

export const useCreatorForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitCreatorForm = async (formData: CreatorFormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        form_type: "content_creator",
        landing_page: formData.landing_page,
      };

      const response = await fetch(CONTACT_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to send content creator form");
      }

      const result = await response.json();
      await saveCreatorToDb(formData).catch((err) => console.warn("Creator form save:", err));
      recordFormSubmitEvent(
        "content_creator",
        typeof window !== "undefined" ? window.location.pathname : "/"
      );
      const eventId = createTrackingEventId("lp-lead");
      const landingSlug = (formData.landing_page || "").replace(/^\/landing\//, "");
      pushDataLayer("lp_form_submit", {
        event_action: "lp_form_submit",
        form_type: "content_creator",
        page_path: typeof window !== "undefined" ? window.location.pathname : "/",
        landing_slug: landingSlug || undefined,
        cta_tracking_key: formData.tracking_key,
        cta_type: formData.cta_type,
        cta_source: formData.cta_source,
        event_id: eventId,
      });
      pushDataLayer("lp_lead", {
        event_action: "lp_lead",
        form_type: "content_creator",
        page_path: typeof window !== "undefined" ? window.location.pathname : "/",
        landing_slug: landingSlug || undefined,
        cta_tracking_key: formData.tracking_key,
        cta_type: formData.cta_type,
        cta_source: formData.cta_source,
        event_id: eventId,
      });
      toast.success("Thank you! Your creator application has been submitted.");
      return result;
    } catch (error) {
      console.error("Creator Form Webhook Error:", error);
      toast.error("Something went wrong. Please try again later.");
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitCreatorForm,
    isSubmitting,
  };
};

