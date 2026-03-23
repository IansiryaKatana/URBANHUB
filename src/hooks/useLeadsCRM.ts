import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { recordFormSubmitEvent } from "@/utils/recordAnalyticsEvent";
import { createTrackingEventId, pushDataLayer } from "@/utils/dataLayer";
import { format, parseISO } from "date-fns";

export const WEBHOOK_URL = 'https://btbsslznsexidjnzizre.supabase.co/functions/v1/wordpress-webhook';

export type LeadFormData = {
  full_name: string;
  email: string;
  phone: string;
  form_type: "booking" | "callback";
  preferred_date: string;
  preferred_time: string;
  studio_type?: string;
  message?: string;
  landing_page?: string;
  tracking_key?: string;
  cta_type?: string;
  cta_source?: string;
};

async function saveLeadToDb(formData: LeadFormData) {
  const formType = formData.form_type === "booking" ? "viewing" : "callback";
  const message =
    formData.form_type === "booking"
      ? (() => {
          const parts: string[] = [];
          if (formData.preferred_date) {
            try {
              const humanDate = format(parseISO(formData.preferred_date), "do MMMM yyyy");
              parts.push(humanDate);
            } catch {
              parts.push(formData.preferred_date);
            }
          }
          if (formData.preferred_time) {
            parts.push(formData.preferred_time);
          }
          if (formData.studio_type) {
            parts.push(formData.studio_type);
          }
          return parts.join(" · ") || null;
        })()
      : formData.message ?? null;
  await supabase.from("website_form_submissions").insert({
    form_type: formType,
    name: formData.full_name,
    email: formData.email,
    phone: formData.phone || null,
    message,
    metadata: {
      preferred_date: formData.preferred_date,
      preferred_time: formData.preferred_time,
      studio_type: formData.studio_type,
      landing_page: formData.landing_page,
    },
  });
}

export const useLeadsCRM = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitToLeadsCRM = async (formData: LeadFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to send lead to CRM');
      }

      const result = await response.json();
      await saveLeadToDb(formData).catch((err) => console.warn("Website form save:", err));
      const dbFormType = formData.form_type === "booking" ? "viewing" : "callback";
      recordFormSubmitEvent(dbFormType, typeof window !== "undefined" ? window.location.pathname : "/");
      const landingSlug = (formData.landing_page || "").replace(/^\/landing\//, "");
      const eventId = createTrackingEventId("lp-lead");
      pushDataLayer("lp_form_submit", {
        event_action: "lp_form_submit",
        form_type: dbFormType,
        page_path: typeof window !== "undefined" ? window.location.pathname : "/",
        landing_slug: landingSlug || undefined,
        cta_tracking_key: formData.tracking_key,
        cta_type: formData.cta_type,
        cta_source: formData.cta_source,
        event_id: eventId,
      });
      pushDataLayer("lp_lead", {
        event_action: "lp_lead",
        form_type: dbFormType,
        page_path: typeof window !== "undefined" ? window.location.pathname : "/",
        landing_slug: landingSlug || undefined,
        cta_tracking_key: formData.tracking_key,
        cta_type: formData.cta_type,
        cta_source: formData.cta_source,
        event_id: eventId,
      });
      toast.success(formData.form_type === "booking" ? "Viewing booked successfully!" : "Callback requested successfully!");
      return result;
    } catch (error) {
      console.error('CRM Webhook Error:', error);
      toast.error("Something went wrong. Please try again later.");
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitToLeadsCRM,
    isSubmitting,
  };
};
