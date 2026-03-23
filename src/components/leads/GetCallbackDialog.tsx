import { useEffect } from "react";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { LeadForm } from "./LeadForm";
import { pushDataLayer } from "@/utils/dataLayer";

/** Source that opened the form (for conversion attribution in GTM/GA). */
export type LeadFormOpenSource = "nav" | "landing_hero" | "studios_hero" | "landing_grade" | "inline";

interface GetCallbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional landing page slug or label for tracking source. */
  landingPageSlug?: string;
  /** Where the form was opened from (e.g. nav = nav menu). Used for GTM/GA. */
  openSource?: LeadFormOpenSource;
  ctaTrackingKey?: string;
  ctaType?: string;
}

export const GetCallbackDialog = ({
  open,
  onOpenChange,
  landingPageSlug,
  openSource = "inline",
  ctaTrackingKey,
  ctaType,
}: GetCallbackDialogProps) => {
  const isMobile = useIsMobile();

  useEffect(() => {
    if (open && typeof window !== "undefined") {
      pushDataLayer("lead_form_open", {
        event_action: "lead_form_open",
        event_label: "callback",
        form_type: "callback",
        cta_source: openSource,
        page_path: window.location.pathname || "/",
      });
      pushDataLayer("lp_form_start", {
        event_action: "lp_form_start",
        form_type: "callback",
        page_path: window.location.pathname || "/",
        landing_slug: (landingPageSlug || "").replace(/^\/landing\//, "") || undefined,
        cta_tracking_key: ctaTrackingKey,
        cta_type: ctaType,
        cta_source: openSource,
      });
    }
  }, [open, openSource, landingPageSlug, ctaTrackingKey, ctaType]);

  const title = "Get a Callback";
  const description = "Fill in your details and our team will give you a call at your preferred time.";

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="mb-0 rounded-t-[28px]">
          <DrawerHeader className="text-left px-6 pt-8">
            <DrawerTitle className="text-2xl font-display font-black uppercase tracking-wide">
              {title}
            </DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground mt-2">
              {description}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-2 pb-8">
            <LeadForm 
              formType="callback" 
              onSuccess={() => onOpenChange(false)} 
              onCancel={() => onOpenChange(false)}
              landingPage={landingPageSlug}
              ctaTrackingKey={ctaTrackingKey}
              ctaType={ctaType}
              ctaSource={openSource}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] rounded-[28px] p-8">
        <DialogHeader>
          <DialogTitle className="text-3xl font-display font-black uppercase tracking-wide">
            {title}
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground mt-4">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6">
          <LeadForm 
            formType="callback" 
            onSuccess={() => onOpenChange(false)} 
            onCancel={() => onOpenChange(false)}
            landingPage={landingPageSlug}
            ctaTrackingKey={ctaTrackingKey}
            ctaType={ctaType}
            ctaSource={openSource}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
