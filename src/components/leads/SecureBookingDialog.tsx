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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { isPossiblePhoneNumber } from "libphonenumber-js";
import { useState } from "react";
import { useEffect } from "react";
import { SUPABASE_PUBLISHABLE_KEY, supabase, SUPABASE_URL } from "@/integrations/supabase/client";
import { STRIPE_PUBLISHABLE_KEY } from "@/config";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { toast } from "sonner";
import { ArrowUpRight } from "lucide-react";
import { CONTACT_WEBHOOK_URL } from "@/hooks/useContactForm";
import { createTrackingEventId, pushDataLayer } from "@/utils/dataLayer";

const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY || "");

const secureBookingSchema = zod.object({
  first_name: zod.string().min(2, "First name must be at least 2 characters"),
  last_name: zod.string().min(2, "Last name must be at least 2 characters"),
  email: zod.string().email("Invalid email address"),
  phone: zod
    .string()
    .refine((val) => (val ? isPossiblePhoneNumber(val) : false), "Invalid phone number for the selected country"),
  studio_preference: zod.string().min(1, "Please select a studio preference"),
});

type SecureBookingValues = zod.infer<typeof secureBookingSchema>;

interface SecureBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  landingPageSlug?: string;
  ctaTrackingKey?: string;
  ctaType?: string;
  ctaSource?: string;
}

const CREATE_PAYMENT_INTENT_URL = `${SUPABASE_URL}/functions/v1/website-create-payment-intent`;
const SECURE_BOOKING_AMOUNT_PENCE = 9900; // £99.00
const SECURE_BOOKING_AMOUNT_GBP = SECURE_BOOKING_AMOUNT_PENCE / 100;

function SecureBookingPaymentStep({
  clientSecret,
  onSuccess,
}: {
  clientSecret: string;
  onSuccess: (paymentIntentId: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });
      if (error) {
        toast.error(error.message || "Payment failed. Please try again.");
        setSubmitting(false);
        return;
      }
      if (paymentIntent && paymentIntent.status === "succeeded") {
        onSuccess(paymentIntent.id);
      } else {
        toast.error("Payment was not completed. Please try again.");
        setSubmitting(false);
      }
    } catch (_err) {
      toast.error("Payment failed. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <PaymentElement />
      <Button
        type="submit"
        disabled={submitting || !stripe}
        className="w-full rounded-full uppercase text-xs font-semibold"
      >
        {submitting ? "Processing..." : "Pay £99 to secure booking"}
      </Button>
    </form>
  );
}

export const SecureBookingDialog = ({
  open,
  onOpenChange,
  landingPageSlug,
  ctaTrackingKey,
  ctaType,
  ctaSource = "inline",
}: SecureBookingDialogProps) => {
  const isMobile = useIsMobile();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [phase, setPhase] = useState<"details" | "payment">("details");

  const form = useForm<SecureBookingValues>({
    resolver: zodResolver(secureBookingSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      studio_preference: "",
    },
  });

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    pushDataLayer("lp_form_start", {
      event_action: "lp_form_start",
      form_type: "pay_deposit",
      page_path: window.location.pathname || "/",
      landing_slug: (landingPageSlug || "").replace(/^\/landing\//, "") || undefined,
      cta_tracking_key: ctaTrackingKey,
      cta_type: ctaType,
      cta_source: ctaSource,
    });
  }, [open, landingPageSlug, ctaTrackingKey, ctaType, ctaSource]);

  const createPaymentIntent = async (values: SecureBookingValues) => {
    setIsCreatingIntent(true);
    try {
      const response = await fetch(CREATE_PAYMENT_INTENT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          amountPence: SECURE_BOOKING_AMOUNT_PENCE,
          description: "Secure your booking fee",
          email: values.email,
          firstName: values.first_name,
          lastName: values.last_name,
          phone: values.phone,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data?.clientSecret) {
        throw new Error(data?.error || "Failed to start payment");
      }
      setClientSecret(String(data.clientSecret).trim());
      setPhase("payment");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    } finally {
      setIsCreatingIntent(false);
    }
  };

  const handleSubmit = async (values: SecureBookingValues) => {
    if (!clientSecret) {
      await createPaymentIntent(values);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    try {
      const values = form.getValues();
      const leadType = "pay_deposit";
      // Send to external Leads CRM webhook
      const webhookPayload = {
        form_type: leadType,
        lead_type: leadType,
        inquiry_type: leadType,
        submission_type: "secure_booking_payment",
        email_template: "pay_deposit",
        full_name: `${values.first_name} ${values.last_name}`.trim(),
        email: values.email,
        phone: values.phone,
        studio_preference: values.studio_preference,
        payment_status: "succeeded",
        payment_description: "Secure booking deposit",
        payment_intent_id: paymentIntentId,
        amount_pence: SECURE_BOOKING_AMOUNT_PENCE,
        amount_gbp: SECURE_BOOKING_AMOUNT_GBP,
        landing_page: landingPageSlug || null,
      };
      try {
        const response = await fetch(CONTACT_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(webhookPayload),
        });
        if (!response.ok) {
          // Don't block the user if CRM is down; log and continue
          // eslint-disable-next-line no-console
          console.error("Secure booking CRM webhook error", await response.text());
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Secure booking CRM webhook network error", err);
      }

      // Save to website_form_submissions for internal admin
      await supabase.from("website_form_submissions").insert({
        form_type: leadType,
        name: `${values.first_name} ${values.last_name}`.trim(),
        email: values.email,
        phone: values.phone,
        message: null,
        metadata: {
          lead_type: leadType,
          studio_preference: values.studio_preference,
          landing_page: landingPageSlug || null,
          payment_status: "succeeded",
          payment_description: "Secure booking deposit",
          payment_intent_id: paymentIntentId,
          amount_pence: SECURE_BOOKING_AMOUNT_PENCE,
          amount_gbp: SECURE_BOOKING_AMOUNT_GBP,
        },
      });
      const eventId = createTrackingEventId("lp-purchase");
      pushDataLayer("lp_form_submit", {
        event_action: "lp_form_submit",
        form_type: "pay_deposit",
        page_path: typeof window !== "undefined" ? window.location.pathname : "/",
        landing_slug: (landingPageSlug || "").replace(/^\/landing\//, "") || undefined,
        cta_tracking_key: ctaTrackingKey,
        cta_type: ctaType,
        cta_source: ctaSource,
        event_id: eventId,
      });
      pushDataLayer("lp_lead", {
        event_action: "lp_lead",
        form_type: "pay_deposit",
        page_path: typeof window !== "undefined" ? window.location.pathname : "/",
        landing_slug: (landingPageSlug || "").replace(/^\/landing\//, "") || undefined,
        cta_tracking_key: ctaTrackingKey,
        cta_type: ctaType,
        cta_source: ctaSource,
        event_id: eventId,
      });
      pushDataLayer("lp_purchase", {
        event_action: "lp_purchase",
        form_type: "pay_deposit",
        page_path: typeof window !== "undefined" ? window.location.pathname : "/",
        landing_slug: (landingPageSlug || "").replace(/^\/landing\//, "") || undefined,
        cta_tracking_key: ctaTrackingKey,
        cta_type: ctaType,
        cta_source: ctaSource,
        event_id: eventId,
        value: SECURE_BOOKING_AMOUNT_GBP,
        currency: "GBP",
        payment_intent_id: paymentIntentId,
      });
      setIsCompleted(true);
      toast.success("Your booking has been secured!");
    } catch (_err) {
      toast.error("Payment completed, but we could not save your details. Our team will check manually.");
      setIsCompleted(true);
    }
  };

  const title = "Secure your student accommodation";
  const description = "";

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
        {phase === "details" && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="First name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Last name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input type="email" placeholder="Email address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormControl>
                      <div
                        className={`flex w-full rounded-md border bg-transparent ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${
                          fieldState.error ? "border-destructive" : "border-input"
                        }`}
                      >
                        <PhoneInput
                          defaultCountry="gb"
                          value={field.value}
                          onChange={(phone) => field.onChange(phone)}
                          className="flex w-full"
                          inputProps={{ placeholder: "Phone number" }}
                          inputClassName="!flex !h-10 !w-full !border-none !bg-transparent !px-3 !py-2 !text-sm !placeholder:text-muted-foreground focus:!outline-none disabled:!cursor-not-allowed disabled:!opacity-50 !shadow-none"
                          countrySelectorStyleProps={{
                            buttonClassName:
                              "!h-10 !border-none !rounded-l-md !bg-transparent !px-3 hover:!bg-accent",
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="studio_preference"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Studio preference" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="silver">Silver Studio</SelectItem>
                        <SelectItem value="gold">Gold Studio</SelectItem>
                        <SelectItem value="platinum">Platinum Studio</SelectItem>
                        <SelectItem value="rhodium">Rhodium Studio</SelectItem>
                        <SelectItem value="rhodium-plus">Rhodium Plus Studio</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={isCreatingIntent}
              className="w-full rounded-full uppercase text-xs font-semibold justify-between"
            >
              <span className="text-left">
                {isCreatingIntent ? "Securing your place…" : "Secure your place with £99"}
              </span>
              <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            </Button>
          </>
        )}
      </form>
    </Form>
  );

  const successContent = (
    <div className="space-y-4 py-4">
      <h3 className="text-xl font-display font-black uppercase tracking-wide text-center">
        Booking secured
      </h3>
      <p className="text-sm text-muted-foreground text-center">
        Thank you. Your £99 payment has been received and your booking has been secured. Our team will
        be in touch with next steps.
      </p>
      <Button
        className="w-full rounded-full uppercase text-xs font-semibold"
        onClick={() => {
          setClientSecret(null);
          setIsCompleted(false);
          form.reset();
          onOpenChange(false);
        }}
      >
        Close
      </Button>
    </div>
  );

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
          <div className="px-4 pb-8">
            {isCompleted ? (
              successContent
            ) : phase === "payment" && clientSecret && stripePromise ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <SecureBookingPaymentStep clientSecret={clientSecret} onSuccess={handlePaymentSuccess} />
              </Elements>
            ) : (
              formContent
            )}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] rounded-[28px] p-8">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-3xl font-display font-black uppercase tracking-wide">
            {title}
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground mt-4">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-6">
          {isCompleted ? (
            successContent
          ) : phase === "payment" && clientSecret && stripePromise ? (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <SecureBookingPaymentStep clientSecret={clientSecret} onSuccess={handlePaymentSuccess} />
            </Elements>
          ) : (
            formContent
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

