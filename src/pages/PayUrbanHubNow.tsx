import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useBrandingSettings } from "@/hooks/useBranding";
import { useSlotUrl } from "@/hooks/useWebsiteImageSlots";
import { usePayUrbanHub, getPaymentTypeDescription, type PayUrbanHubFormData } from "@/hooks/usePayUrbanHub";
import { SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/client";
import { STRIPE_PUBLISHABLE_KEY, getStripePublishableKeyMode } from "@/config";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { isPossiblePhoneNumber } from "libphonenumber-js";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
} from "@/components/ui/drawer";
import { ChevronLeft } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const payFormSchema = zod.object({
  firstName: zod.string().min(2, "First name must be at least 2 characters"),
  lastName: zod.string().min(2, "Last name must be at least 2 characters"),
  email: zod.string().email("Invalid email address"),
  phone: zod.string().refine(
    (val) => (val ? isPossiblePhoneNumber(val) : false),
    "Invalid phone number for the selected country"
  ),
  amountPounds: zod.coerce.number().min(1, "Minimum amount is £1").max(99999, "Amount too large"),
});

type PayFormValues = zod.infer<typeof payFormSchema>;

const BANK_DETAILS = [
  { label: "Bank Name", value: "Barclays Bank" },
  { label: "Bank Account Name", value: "EDEN ASSET MANAGEMENT LTD" },
  { label: "Sort Code", value: "20-51-08" },
  { label: "Account No", value: "43993167" },
  { label: "SWIFTBIC", value: "BUKBGB22" },
  { label: "IBAN", value: "GB98 BUKB 2051 0843 9931 67" },
];

type PaymentTab = "current_student" | "new_student" | "keyworker_pay";

const TAB_OPTIONS: { value: PaymentTab; label: string }[] = [
  { value: "current_student", label: "Current student" },
  { value: "new_student", label: "New student" },
  { value: "keyworker_pay", label: "Keyworker pay" },
];

// Single Stripe instance for the page (avoids "Stripe() was called many times" warning)
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

function StripePaymentForm({
  clientSecret,
  onSuccess,
  onCancel,
  onLoadError,
  variant = "dark",
}: {
  clientSecret: string;
  onSuccess: () => void;
  onCancel: () => void;
  onLoadError?: () => void;
  variant?: "dark" | "light";
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isConfirming, setIsConfirming] = useState(false);
  const isLight = variant === "light";

  const handleLoadError = () => {
    toast.error(
      "Payment form could not load. Ensure your Stripe keys match (both test or both live). Try again or use bank transfer."
    );
    onLoadError?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setIsConfirming(true);
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/pay-urban-hub-now`,
        },
      });
      if (error) {
        toast.error(error.message || "Payment failed");
        return;
      }
      onSuccess();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} onLoadError={handleLoadError} />
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className={isLight ? "border-gray-300 text-gray-700 hover:bg-gray-100 hover:text-gray-900" : "bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white"}
          onClick={onCancel}
        >
          Back
        </Button>
        <Button
          type="submit"
          disabled={!stripe || isConfirming}
          className="bg-primary text-white hover:bg-primary/90"
        >
          {isConfirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Pay now
        </Button>
      </div>
    </form>
  );
}

function PayUrbanHubFormSection({
  paymentType,
  isCreatingIntent,
  onCreateIntent,
  clientSecret,
  onSuccess,
  onCancelStripe,
  onPaymentElementLoadError,
  createIntentError,
  variant = "dark",
}: {
  paymentType: PaymentTab;
  isCreatingIntent: boolean;
  onCreateIntent: (values: PayFormValues) => Promise<void>;
  clientSecret: string | null;
  onSuccess: () => void;
  onCancelStripe: () => void;
  onPaymentElementLoadError?: () => void;
  createIntentError: string | null;
  variant?: "dark" | "light";
}) {
  const isLight = variant === "light";
  const inputClass = isLight
    ? "h-12 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-500 focus:bg-gray-50 focus-visible:ring-gray-300"
    : "h-12 rounded-xl border-none outline-none ring-0 bg-black/50 text-white placeholder:text-white/55 focus:bg-black/60 focus-visible:ring-0";
  const phoneWrapperClass = isLight
    ? "flex w-full h-12 rounded-xl border border-gray-200 bg-white focus-within:bg-gray-50 focus-within:border-gray-300"
    : "flex w-full h-12 rounded-xl border-none outline-none ring-0 bg-black/50 focus-within:bg-black/60";
  const messageClass = isLight ? "text-red-600 text-xs" : "text-white/90 text-xs";
  const amountSymbolClass = isLight ? "text-gray-500" : "text-white/70";
  const phoneInputClass = isLight
    ? "flex w-full h-full [&_input]:!bg-transparent [&_input]:!text-gray-900 [&_input]:!outline-none [&_.react-international-phone-country-selector-button]:!bg-transparent [&_.react-international-phone-country-selector-button]:!text-gray-700"
    : "flex w-full h-full [&_input]:!bg-transparent [&_input]:!text-white [&_input]:!outline-none [&_input]:placeholder:!text-white/55 [&_.react-international-phone-country-selector-button]:!bg-transparent [&_.react-international-phone-country-selector-button]:!text-white [&_.react-international-phone-country-selector-button]:!border-none";
  const phoneButtonClass = isLight
    ? "!h-full !border-none !rounded-l-xl !bg-transparent !px-3 !text-gray-700 hover:!bg-gray-100"
    : "!h-full !border-none !rounded-l-xl !bg-transparent !px-3 !text-white hover:!bg-white/10";
  const form = useForm<PayFormValues>({
    resolver: zodResolver(payFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      amountPounds: 1,
    },
  });

  if (clientSecret && stripePromise) {
    const options = { clientSecret, appearance: { theme: isLight ? "stripe" as const : "night" as const } };
    return (
      <div className="min-h-[320px] flex flex-col" role="region" aria-label="Card payment form">
        <p className={`text-sm mb-2 ${isLight ? "text-gray-600" : "text-white"}`}>
          Enter your card details below to complete payment.
        </p>
        <Elements stripe={stripePromise} options={options} key={clientSecret}>
          <StripePaymentForm
            clientSecret={clientSecret}
            onSuccess={onSuccess}
            onCancel={onCancelStripe}
            onLoadError={onPaymentElementLoadError}
            variant={variant}
          />
        </Elements>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onCreateIntent)} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="First name" className={inputClass} {...field} />
                </FormControl>
                <FormMessage className={messageClass} />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="Last name" className={inputClass} {...field} />
                </FormControl>
                <FormMessage className={messageClass} />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input placeholder="Email" type="email" className={inputClass} {...field} />
              </FormControl>
              <FormMessage className={messageClass} />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormControl>
                <div className={`${phoneWrapperClass} ${fieldState.error ? "ring-2 ring-destructive" : ""}`}>
                  <PhoneInput
                    defaultCountry="gb"
                    value={typeof field.value === "string" ? field.value : ""}
                    onChange={(phone) => field.onChange(phone)}
                    className={phoneInputClass}
                    inputClassName={`!flex !h-full !w-full !border-none !bg-transparent !px-4 !py-0 focus:!outline-none focus:!ring-0 ${isLight ? "!text-gray-900 placeholder:!text-gray-500" : "!text-white placeholder:!text-white/55"}`}
                    countrySelectorStyleProps={{ buttonClassName: phoneButtonClass }}
                  />
                </div>
              </FormControl>
              <FormMessage className={messageClass} />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amountPounds"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <div className="relative">
                  <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm pointer-events-none ${amountSymbolClass}`}>
                    £
                  </span>
                  <Input
                    type="number"
                    min={1}
                    step={0.01}
                    placeholder="Amount"
                    className={`${inputClass} pl-8`}
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage className={messageClass} />
            </FormItem>
          )}
        />
        {createIntentError && (
          <p className={isLight ? "text-sm text-red-600" : "text-sm text-red-300"}>{createIntentError}</p>
        )}
        <Button
          type="submit"
          disabled={isCreatingIntent}
          className="w-full h-12 rounded-lg bg-primary text-white font-semibold text-sm uppercase tracking-wide hover:bg-primary/90"
        >
          {isCreatingIntent && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
          Pay securely
        </Button>
      </form>
    </Form>
  );
}

type DrawerStep = "choose" | PaymentTab;

const PayUrbanHubNow = () => {
  const { data: brandingSettings } = useBrandingSettings();
  const heroSlotUrl = useSlotUrl("hero_shortterm", brandingSettings?.studio_catalog_hero_image);
  const heroImagePath = heroSlotUrl || "https://urbanhub.uk/wp-content/uploads/2025/05/URBAN-HUB-OUTSIDE-A-3-of-1-scaled-1.webp";
  const { createPaymentIntent, isCreatingIntent, error: createIntentError } = usePayUrbanHub();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentType, setPaymentType] = useState<PaymentTab>("current_student");
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [bankDetailsOpen, setBankDetailsOpen] = useState(false);
  const isMobile = useIsMobile();
  const [payDrawerOpen, setPayDrawerOpen] = useState(false);
  const [drawerStep, setDrawerStep] = useState<DrawerStep>("choose");

  const handleCreateIntent = (paymentTypeValue: PaymentTab) => async (values: PayFormValues) => {
    const formData: PayUrbanHubFormData = {
      ...values,
      amountPounds: values.amountPounds,
      paymentType: paymentTypeValue,
    };
    const result = await createPaymentIntent(formData, SUPABASE_PUBLISHABLE_KEY);
    if (result) {
      setClientSecret(result.clientSecret);
    }
  };

  const handlePaymentSuccess = (closeDrawerFirst?: boolean) => {
    setClientSecret(null);
    if (closeDrawerFirst) {
      setPayDrawerOpen(false);
      // Open success dialog after drawer has closed so focus moves into dialog (avoids aria-hidden focus issue)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setSuccessDialogOpen(true));
      });
    } else {
      setSuccessDialogOpen(true);
    }
  };

  const handleCancelStripe = () => {
    setClientSecret(null);
  };

  const handlePaymentElementLoadError = () => {
    setClientSecret(null);
  };

  // Log Stripe key mode when loading Payment Element (400 = test/live mismatch between frontend key and Supabase secret)
  useEffect(() => {
    if (!clientSecret) return;
    const mode = getStripePublishableKeyMode();
    if (mode === "missing") {
      console.warn("[Stripe] VITE_STRIPE_PUBLISHABLE_KEY is not set. Add it to .env (and to Netlify env for production).");
    } else if (mode !== "unknown" && (import.meta.env.DEV || import.meta.env.PROD)) {
      console.info(
        `[Stripe] Publishable key mode: ${mode}. Supabase Edge Function STRIPE_SECRET_KEY must be the same mode (sk_${mode}_...). If you see 400, frontend and server keys don't match—check .env vs .env.local (Vite uses .env.local over .env) and Netlify env.`
      );
    }
  }, [clientSecret]);

  const handleDrawerOpenChange = (open: boolean) => {
    setPayDrawerOpen(open);
    if (!open) {
      setDrawerStep("choose");
      setClientSecret(null);
    }
  };

  const formSection = (
    <PayUrbanHubFormSection
      paymentType={paymentType}
      isCreatingIntent={isCreatingIntent}
      onCreateIntent={handleCreateIntent(paymentType)}
      clientSecret={clientSecret}
      onSuccess={handlePaymentSuccess}
      onCancelStripe={handleCancelStripe}
      onPaymentElementLoadError={handlePaymentElementLoadError}
      createIntentError={createIntentError}
    />
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main>
        <section
          aria-label="Pay your Urban Hub rental balance securely"
          className="relative flex h-screen max-h-screen flex-col overflow-hidden pt-24 md:h-auto md:min-h-screen md:pt-0"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(5, 6, 9, 0.7) 0%, rgba(5, 6, 9, 0.35) 50%, rgba(5, 6, 9, 0.7) 100%), url('${heroImagePath}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="w-full min-h-0 flex-1 overflow-y-auto px-4 py-8 pb-4 md:overflow-visible md:px-[100px] md:pb-[100px] md:pt-0 md:min-h-screen flex flex-col md:flex-row md:items-end md:justify-between gap-8 md:gap-12 pb-52 md:pb-4">
            {/* Left: title, description, bank transfer details - pb-52 on mobile keeps accordion above fixed button */}
            <div className="flex-1 flex min-h-0 flex-col justify-end text-white max-w-2xl md:justify-end md:min-h-0 pb-2 md:pb-0">
              <h1 className="text-3xl md:text-5xl lg:text-6xl xl:text-7xl font-display font-black uppercase leading-tight text-left">
                Pay your
                <br />
                rental balance
                <br />
                securely
              </h1>
              <p className="text-white/90 text-sm md:text-base max-w-lg mt-2 md:mt-3 text-left">
                Make a secure payment towards your accommodation. Enter the amount you&apos;d like to pay and complete the form to proceed. You&apos;ll receive an instant email confirmation once your payment is successful.
              </p>

              <Collapsible open={bankDetailsOpen} onOpenChange={setBankDetailsOpen} className="mt-4 md:mt-6 w-full max-w-lg">
                <div className="rounded-xl border border-white/20 bg-black/30 backdrop-blur-sm overflow-hidden">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-3 text-left font-bold uppercase tracking-wide text-white hover:bg-white/5 transition-colors"
                    >
                      <span>Bank transfer details</span>
                      {bankDetailsOpen ? (
                        <ChevronUp className="h-5 w-5 shrink-0" aria-hidden />
                      ) : (
                        <ChevronDown className="h-5 w-5 shrink-0" aria-hidden />
                      )}
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 pt-0 space-y-1.5 text-sm text-white/90">
                      {BANK_DETAILS.map(({ label, value }) => (
                        <div key={label} className="flex flex-wrap gap-x-2">
                          <span className="font-medium text-white">{label}</span>
                          <span>{value}</span>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            </div>

            {/* Right: tabs and payment form */}
            <div className="hidden md:flex w-full md:max-w-[420px] lg:max-w-[440px] flex-shrink-0 md:ml-auto md:self-end">
              <div className="rounded-2xl bg-black/35 backdrop-blur-md border border-white/10 shadow-2xl p-6 md:p-8 w-full">
                <Tabs value={paymentType} onValueChange={(v) => setPaymentType(v as PaymentTab)} className="w-full">
                  {!clientSecret && (
                    <TabsList className="grid grid-cols-3 w-full rounded-lg bg-black/40 backdrop-blur-md border border-white/10 p-1 gap-0.5 mb-4 min-w-0">
                      {TAB_OPTIONS.map((tab) => (
                        <TabsTrigger
                          key={tab.value}
                          value={tab.value}
                          className="min-w-0 rounded-md text-[10px] font-semibold uppercase tracking-wide px-1 sm:px-2 py-2 data-[state=active]:bg-white data-[state=active]:text-primary data-[state=inactive]:text-white/90 data-[state=inactive]:hover:bg-white/10 truncate"
                        >
                          {tab.label}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  )}
                  <div className="mt-0">
                    {formSection}
                  </div>
                </Tabs>
              </div>
            </div>
          </div>

          {isMobile && (
            <div className="absolute inset-x-0 bottom-0 px-4 pb-8 pt-4 md:hidden">
              <Button
                onClick={() => setPayDrawerOpen(true)}
                className="w-full h-14 rounded-full bg-primary text-white font-semibold text-base uppercase tracking-wide hover:bg-primary/90"
              >
                Pay your balance
              </Button>
            </div>
          )}
        </section>
      </main>

      {/* Mobile drawer */}
      <Drawer open={payDrawerOpen} onOpenChange={handleDrawerOpenChange}>
        <DrawerContent className="mb-0 rounded-t-2xl rounded-b-none border-t border-x-0 border-b-0 [&>div:first-child]:hidden bg-white">
          {drawerStep === "choose" ? (
            <>
              <DrawerHeader className="text-left px-6 pt-8 pb-4 bg-white">
                <DrawerTitle className="text-xl font-display font-black uppercase tracking-wide text-gray-900">
                  Pay your balance
                </DrawerTitle>
                <p className="text-sm text-gray-600 mt-1">Choose payment type</p>
              </DrawerHeader>
              <div className="px-6 pb-8 flex flex-col gap-3 bg-white">
                {TAB_OPTIONS.map((tab) => (
                  <Button
                    key={tab.value}
                    onClick={() => setDrawerStep(tab.value)}
                    variant="outline"
                    className="w-full h-14 rounded-xl text-base font-semibold"
                  >
                    {tab.label}
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <div className="bg-white min-h-[70vh] rounded-t-2xl flex flex-col">
              <div className="flex items-center gap-2 px-4 pt-4 pb-2 border-b border-gray-200">
                <DrawerClose asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-700 hover:bg-gray-100 shrink-0"
                    onClick={() => setDrawerStep("choose")}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                </DrawerClose>
                <span className="text-gray-900 font-semibold uppercase text-sm">
                  {getPaymentTypeDescription(drawerStep)}
                </span>
              </div>
              <div className="flex-1 overflow-auto px-4 pb-8 pt-2 bg-white">
                <PayUrbanHubFormSection
                  paymentType={drawerStep}
                  isCreatingIntent={isCreatingIntent}
                  onCreateIntent={handleCreateIntent(drawerStep)}
                  clientSecret={clientSecret}
                  onSuccess={() => handlePaymentSuccess(true)}
                  onCancelStripe={handleCancelStripe}
                  onPaymentElementLoadError={handlePaymentElementLoadError}
                  createIntentError={createIntentError}
                  variant="light"
                />
              </div>
            </div>
          )}
        </DrawerContent>
      </Drawer>

      {/* Success confirmation dialog - 2 close buttons */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent
          className="sm:max-w-md p-6 gap-4"
          aria-describedby="payment-success-description"
        >
          <DialogHeader className="space-y-2">
            <div className="flex justify-end order-first">
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="Close dialog">×</Button>
              </DialogClose>
            </div>
            <DialogTitle className="text-xl font-display font-black uppercase tracking-wide text-center flex items-center justify-center gap-2">
              <CheckCircle2 className="h-8 w-8 text-green-600 shrink-0" aria-hidden />
              Payment successful
            </DialogTitle>
            <DialogDescription id="payment-success-description" className="sr-only">
              Your payment has been processed successfully. You will receive an email confirmation shortly.
            </DialogDescription>
          </DialogHeader>
          <p className="text-center text-muted-foreground">
            Thank you. Your payment has been processed successfully. You will receive an email confirmation shortly.
          </p>
          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button>Done</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default PayUrbanHubNow;
