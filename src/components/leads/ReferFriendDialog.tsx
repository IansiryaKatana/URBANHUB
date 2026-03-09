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
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { isPossiblePhoneNumber } from "libphonenumber-js";
import { useState } from "react";
import { SUPABASE_PUBLISHABLE_KEY, supabase, SUPABASE_URL } from "@/integrations/supabase/client";
import { STRIPE_PUBLISHABLE_KEY } from "@/config";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { toast } from "sonner";

const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY || "");

const referFriendSchema = zod.object({
  full_name: zod.string().min(2, "Name must be at least 2 characters"),
  email: zod.string().email("Invalid email address"),
  phone: zod
    .string()
    .refine((val) => (val ? isPossiblePhoneNumber(val) : false), "Invalid phone number for the selected country"),
  studio_type: zod.string().optional(),
  referrer_name: zod.string().min(2, "Referrer name must be at least 2 characters"),
  referrer_studio_number: zod.string().min(1, "Studio number is required"),
  accept_terms: zod.literal(true, {
    errorMap: () => ({ message: "You must agree to the Refer-a-Friend Terms & Conditions" }),
  }),
});

type ReferFriendValues = zod.infer<typeof referFriendSchema>;

interface ReferFriendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  landingPageSlug?: string;
}

const CREATE_PAYMENT_INTENT_URL = `${SUPABASE_URL}/functions/v1/website-create-payment-intent`;
const REFER_FRIEND_AMOUNT_PENCE = 9900; // £99.00

function ReferFriendPaymentStep({
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
    } catch (err) {
      toast.error("Payment failed. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
      <PaymentElement />
      <Button type="submit" disabled={submitting || !stripe} className="w-full rounded-full uppercase text-xs font-semibold">
        {submitting ? "Processing..." : "Pay £99 Deposit"}
      </Button>
    </form>
  );
}

export const ReferFriendDialog = ({ open, onOpenChange, landingPageSlug }: ReferFriendDialogProps) => {
  const isMobile = useIsMobile();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [isCreatingIntent, setIsCreatingIntent] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const form = useForm<ReferFriendValues>({
    resolver: zodResolver(referFriendSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      studio_type: undefined,
      referrer_name: "",
      referrer_studio_number: "",
      accept_terms: false,
    },
  });

  const createPaymentIntent = async (values: ReferFriendValues) => {
    setIsCreatingIntent(true);
    try {
      const response = await fetch(CREATE_PAYMENT_INTENT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          amountPence: REFER_FRIEND_AMOUNT_PENCE,
          description: "Refer-a-Friend Deposit",
          email: values.email,
          firstName: values.full_name,
          lastName: "",
          phone: values.phone,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data?.clientSecret) {
        throw new Error(data?.error || "Failed to start payment");
      }
      setClientSecret(String(data.clientSecret).trim());
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
    } finally {
      setIsCreatingIntent(false);
    }
  };

  const handleSubmit = async (values: ReferFriendValues) => {
    if (!clientSecret) {
      await createPaymentIntent(values);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    try {
      const values = form.getValues();
      await supabase.from("website_form_submissions").insert({
        form_type: "refer_friend",
        name: values.full_name,
        email: values.email,
        phone: values.phone,
        message: null,
        metadata: {
          studio_type: values.studio_type,
          referrer_name: values.referrer_name,
          referrer_studio_number: values.referrer_studio_number,
          landing_page: landingPageSlug || null,
          payment_intent_id: paymentIntentId,
          amount_pence: REFER_FRIEND_AMOUNT_PENCE,
        },
      });
      setIsCompleted(true);
      toast.success("Refer-a-Friend submitted successfully!");
    } catch (err) {
      toast.error("Submission saved with payment, but admin may need to check records.");
      setIsCompleted(true);
    }
  };

  const title = "Refer a Friend";
  const description = "Fill in your details and your friend's details below. A £99 deposit is required to complete the referral.";
  const termsUrl = "/terms"; // Adjust to dedicated Refer-a-Friend T&Cs URL if needed

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your full name</FormLabel>
                <FormControl>
                  <Input placeholder="Your name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="studio_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Studio preference (optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Gold Studio" {...field} />
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
                <FormLabel>Your email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="you@example.com" {...field} />
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
                <FormLabel>Your phone</FormLabel>
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
                      inputProps={{ placeholder: "Enter your phone number" }}
                      inputClassName="!flex !h-10 !w-full !border-none !bg-transparent !px-3 !py-2 !text-sm !placeholder:text-muted-foreground focus:!outline-none disabled:!cursor-not-allowed disabled:!opacity-50 !shadow-none"
                      countrySelectorStyleProps={{
                        buttonClassName: "!h-10 !border-none !rounded-l-md !bg-transparent !px-3 hover:!bg-accent",
                      }}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="referrer_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Friend's name</FormLabel>
                <FormControl>
                  <Input placeholder="Friend's full name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="referrer_studio_number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Friend's studio number</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Studio 305" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="accept_terms"
          render={({ field }) => (
            <FormItem className="flex items-start space-x-2 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(!!checked)}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel className="text-xs md:text-sm font-normal">
                  I agree to the{" "}
                  <a
                    href={termsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Refer-a-Friend Terms &amp; Conditions
                  </a>
                  .
                </FormLabel>
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
        {!clientSecret && (
          <Button
            type="submit"
            disabled={isCreatingIntent}
            className="w-full rounded-full uppercase text-xs font-semibold"
          >
            {isCreatingIntent ? "Starting payment..." : "Continue to £99 deposit"}
          </Button>
        )}
      </form>
    </Form>
  );

  const successContent = (
    <div className="space-y-4 py-4">
      <h3 className="text-xl font-display font-black uppercase tracking-wide text-center">
        Referral submitted
      </h3>
      <p className="text-sm text-muted-foreground text-center">
        Thank you. Your Refer-a-Friend request and deposit have been received. Our team will review and
        be in touch.
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
            ) : (
              <>
                {formContent}
                {clientSecret && stripePromise && (
                  <Elements stripe={stripePromise} options={{ clientSecret }}>
                    <ReferFriendPaymentStep clientSecret={clientSecret} onSuccess={handlePaymentSuccess} />
                  </Elements>
                )}
              </>
            )}
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
          {isCompleted ? (
            successContent
          ) : (
            <>
              {formContent}
              {clientSecret && stripePromise && (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <ReferFriendPaymentStep clientSecret={clientSecret} onSuccess={handlePaymentSuccess} />
                </Elements>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

