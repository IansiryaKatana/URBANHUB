import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { isPossiblePhoneNumber } from "libphonenumber-js";
import { CheckCircle2, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLeadModalGate } from "@/hooks/useLeadModalGate";
import { useSlotUrl } from "@/hooks/useWebsiteImageSlots";
import { supabase } from "@/integrations/supabase/client";
import { buildAttributionMetadata } from "@/lib/formSubmissionSource";
import { recordFormSubmitEvent } from "@/utils/recordAnalyticsEvent";
import { createTrackingEventId, pushDataLayer } from "@/utils/dataLayer";
import { CONTACT_WEBHOOK_URL } from "@/hooks/useContactForm";
import type { LeadFormOpenSource } from "./GetCallbackDialog";

const CHECKLIST_PDF_SLOT = "clearing_checklist_pdf";
const FORM_TYPE = "checklist_download";

const schema = zod.object({
  full_name: zod.string().min(2, "Name must be at least 2 characters"),
  email: zod.string().email("Invalid email address"),
  phone: zod.string().refine((val) => {
    if (!val) return false;
    return isPossiblePhoneNumber(val);
  }, "Invalid phone number for the selected country"),
});

type FormValues = zod.infer<typeof schema>;

interface ChecklistDownloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  landingPageSlug?: string;
  openSource?: LeadFormOpenSource;
  ctaTrackingKey?: string;
  ctaType?: string;
}

export const ChecklistDownloadDialog = ({
  open,
  onOpenChange,
  landingPageSlug,
  openSource = "inline",
  ctaTrackingKey,
  ctaType = "checklist_download",
}: ChecklistDownloadDialogProps) => {
  const isMobile = useIsMobile();
  useLeadModalGate(open);
  const pdfUrl = useSlotUrl(CHECKLIST_PDF_SLOT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
    },
  });

  useEffect(() => {
    if (!open) {
      setIsSubmitted(false);
      setIsSubmitting(false);
      form.reset();
      return;
    }
    if (typeof window === "undefined") return;
    pushDataLayer("lead_form_open", {
      event_action: "lead_form_open",
      event_label: FORM_TYPE,
      form_type: FORM_TYPE,
      cta_source: openSource,
      page_path: window.location.pathname || "/",
    });
    pushDataLayer("lp_form_start", {
      event_action: "lp_form_start",
      form_type: FORM_TYPE,
      page_path: window.location.pathname || "/",
      landing_slug:
        (landingPageSlug || "").replace(/^\/landing\//, "").replace(/^\//, "") || undefined,
      cta_tracking_key: ctaTrackingKey,
      cta_type: ctaType,
      cta_source: openSource,
    });
  }, [open, openSource, landingPageSlug, ctaTrackingKey, ctaType, form]);

  const openPdf = () => {
    if (!pdfUrl) {
      toast.error("Checklist PDF is not available yet. Please try again shortly.");
      return;
    }
    window.open(pdfUrl, "_blank", "noopener,noreferrer");
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const landingSlug =
        (landingPageSlug || "").replace(/^\/landing\//, "").replace(/^\//, "") || undefined;
      const attribution = buildAttributionMetadata({
        landing_page: landingPageSlug,
        tracking_key: ctaTrackingKey,
        cta_type: ctaType,
        cta_source: openSource,
      });

      const webhookBody = {
        full_name: values.full_name,
        email: values.email,
        phone: values.phone,
        form_type: FORM_TYPE,
        message: "Requested free Clearing checklist PDF",
        landing_page: landingPageSlug || "Clearing Checklist",
        tracking_key: ctaTrackingKey,
        cta_type: ctaType,
        cta_source: openSource,
      };

      const response = await fetch(CONTACT_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(webhookBody),
      });
      if (!response.ok) {
        throw new Error("Failed to send checklist request");
      }

      await supabase
        .from("website_form_submissions")
        .insert({
          form_type: FORM_TYPE,
          name: values.full_name,
          email: values.email,
          phone: values.phone || null,
          message: "Requested free Clearing checklist PDF",
          metadata: attribution,
        })
        .then(({ error }) => {
          if (error) console.warn("Website form save:", error);
        });

      recordFormSubmitEvent(
        FORM_TYPE,
        typeof window !== "undefined" ? window.location.pathname : "/",
      );
      const eventId = createTrackingEventId("lp-lead");
      pushDataLayer("lp_form_submit", {
        event_action: "lp_form_submit",
        form_type: FORM_TYPE,
        page_path: typeof window !== "undefined" ? window.location.pathname : "/",
        landing_slug: landingSlug,
        cta_tracking_key: ctaTrackingKey,
        cta_type: ctaType,
        cta_source: openSource,
        event_id: eventId,
      });
      pushDataLayer("lp_lead", {
        event_action: "lp_lead",
        form_type: FORM_TYPE,
        page_path: typeof window !== "undefined" ? window.location.pathname : "/",
        landing_slug: landingSlug,
        cta_tracking_key: ctaTrackingKey,
        cta_type: ctaType,
        cta_source: openSource,
        event_id: eventId,
      });

      setIsSubmitted(true);
      if (pdfUrl) {
        window.open(pdfUrl, "_blank", "noopener,noreferrer");
        toast.success("Checklist unlocked. Your PDF should open now.");
      } else {
        toast.success("Thanks! We'll send your checklist shortly.");
      }
    } catch (error) {
      console.error("Checklist download error:", error);
      toast.error("Something went wrong. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = "Get My Free Checklist";
  const description =
    "Tell us where to reach you and we’ll unlock your free Clearing move-in checklist PDF.";

  const body = isSubmitted ? (
    <div className="flex flex-col items-center justify-center space-y-6 px-4 py-10 text-center">
      <div className="rounded-full bg-green-100 p-4">
        <CheckCircle2 className="h-12 w-12 text-green-600" />
      </div>
      <div className="space-y-2">
        <h3 className="font-display text-2xl font-black uppercase tracking-wide">You&apos;re in!</h3>
        <p className="text-muted-foreground">
          {pdfUrl
            ? "Your free checklist is ready. Download it below if it didn’t open automatically."
            : "Thanks. Our team will send your checklist shortly."}
        </p>
      </div>
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        {pdfUrl ? (
          <Button
            onClick={openPdf}
            className="rounded-full bg-accent-yellow px-8 text-xs font-semibold uppercase tracking-wider text-black hover:bg-accent-yellow/90"
          >
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
        ) : null}
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="rounded-full px-8 text-xs font-semibold uppercase tracking-wider"
        >
          Close
        </Button>
      </div>
    </div>
  ) : (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 px-4 pb-4 pt-0 md:p-0"
      >
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FormLabel className="sr-only">Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Full Name" {...field} />
              </FormControl>
              <FormMessage className="mt-1.5" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FormLabel className="sr-only">Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="Email" {...field} />
              </FormControl>
              <FormMessage className="mt-1.5" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem className="space-y-0">
              <FormLabel className="sr-only">Phone</FormLabel>
              <FormControl>
                <PhoneInput
                  defaultCountry="gb"
                  value={field.value}
                  onChange={(phone) => field.onChange(phone)}
                  className="w-full [&_.react-international-phone-input-container]:h-10 [&_.react-international-phone-input-container]:w-full [&_.react-international-phone-input-container]:rounded-md [&_.react-international-phone-input-container]:border [&_.react-international-phone-input-container]:border-input [&_.react-international-phone-input]:h-10 [&_.react-international-phone-input]:w-full"
                />
              </FormControl>
              <FormMessage className="mt-1.5" />
            </FormItem>
          )}
        />
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="rounded-full px-6 text-xs font-semibold uppercase tracking-wider"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-accent-yellow px-6 text-xs font-semibold uppercase tracking-wider text-black hover:bg-accent-yellow/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting…
              </>
            ) : (
              "Get My Free Checklist"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} handleOnly>
        <DrawerContent className="mb-0 rounded-t-[28px]">
          <DrawerHeader className="gap-0 px-6 pb-3 pt-8 text-center">
            <DrawerTitle className="font-display text-2xl font-black uppercase tracking-wide">
              {title}
            </DrawerTitle>
            <DrawerDescription className="sr-only">{description}</DrawerDescription>
          </DrawerHeader>
          <div className="px-2 pb-8">{body}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[28px] p-8 sm:max-w-[520px]">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="font-display text-3xl font-black uppercase tracking-wide">
            {title}
          </DialogTitle>
          <DialogDescription className="text-[10px] leading-relaxed text-muted-foreground md:text-xs">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-3">{body}</div>
      </DialogContent>
    </Dialog>
  );
};
