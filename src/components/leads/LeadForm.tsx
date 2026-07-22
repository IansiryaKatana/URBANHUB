import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as zod from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLeadsCRM, LeadFormData } from "@/hooks/useLeadsCRM";
import { Loader2, CheckCircle2, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { isPossiblePhoneNumber } from "libphonenumber-js";

const leadFormSchema = zod.object({
  full_name: zod.string().min(2, "Name must be at least 2 characters"),
  email: zod.string().email("Invalid email address"),
  phone: zod.string().refine((val) => {
    if (!val) return false;
    return isPossiblePhoneNumber(val);
  }, "Invalid phone number for the selected country"),
  preferred_date: zod.string().min(1, "Please select a date"),
  preferred_time: zod.enum(["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"], {
    errorMap: () => ({ message: "Please select a valid time slot" }),
  }),
  studio_type: zod.string().optional(),
  message: zod.string().optional(),
  landing_page: zod.string().default("Urbanhub Portal"),
});

type LeadFormValues = zod.infer<typeof leadFormSchema>;

interface LeadFormProps {
  formType: "booking" | "callback";
  onSuccess: () => void;
  onCancel: () => void;
  showCancel?: boolean;
  submitLabel?: string;
  compact?: boolean;
  className?: string;
  /** Optional label used to tag submissions with the originating landing page or context. */
  landingPage?: string;
  /** Hide the optional message field when not needed (e.g. compact hero forms). */
  hideMessageField?: boolean;
  ctaTrackingKey?: string;
  ctaType?: string;
  ctaSource?: string;
}

export const LeadForm = ({
  formType,
  onSuccess,
  onCancel,
  showCancel = true,
  submitLabel,
  compact = false,
  className,
  landingPage,
  hideMessageField = false,
  ctaTrackingKey,
  ctaType,
  ctaSource,
}: LeadFormProps) => {
  const { user, profile } = useAuth();
  const { submitToLeadsCRM, isSubmitting } = useLeadsCRM();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const timeSlots = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      preferred_date: "",
      preferred_time: "" as any,
      studio_type: formType === "booking" ? "silver" : undefined,
      message: "",
      landing_page: landingPage || "Urbanhub Portal",
    },
  });

  // Pre-fill form if user is logged in
  useEffect(() => {
    if (user) {
      form.reset({
        full_name: profile?.first_name ? `${profile.first_name} ${profile.last_name || ""}`.trim() : "",
        email: user.email || "",
        phone: profile?.phone || "",
        preferred_date: "",
        preferred_time: "" as any,
        studio_type: formType === "booking" ? "silver" : undefined,
        message: "",
        landing_page: landingPage || "Urbanhub Portal",
      });
    }
  }, [user, profile, form, formType, landingPage]);

  const onSubmit = async (values: LeadFormValues) => {
    const payload: LeadFormData = {
      ...values,
      form_type: formType,
      tracking_key: ctaTrackingKey,
      cta_type: ctaType,
      cta_source: ctaSource,
    };
    
    try {
      await submitToLeadsCRM(payload);
      setIsSubmitted(true);
    } catch (error) {
      // Error handled in hook
    }
  };

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-6">
        <div className="bg-green-100 p-4 rounded-full">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-display font-black uppercase tracking-wide">Request Received!</h3>
          <p className="text-muted-foreground">
            {formType === "booking" 
              ? "Your viewing request has been sent. We'll contact you shortly to confirm the appointment."
              : "Thank you! Our team will give you a call at your preferred time."}
          </p>
        </div>
        <Button 
          onClick={onSuccess}
          className="bg-accent-yellow text-black hover:bg-accent-yellow/90 rounded-full px-8 uppercase tracking-wider text-xs font-semibold"
        >
          Close
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={`space-y-6 ${compact ? "" : "px-4 pb-4 pt-0 md:p-0"} ${className ?? ""}`}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                <FormLabel className="sr-only">Email Address</FormLabel>
                <FormControl>
                  <Input placeholder="Email Address" type="email" {...field} />
                </FormControl>
                <FormMessage className="mt-1.5" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field, fieldState }) => (
              <FormItem className="space-y-0">
                <FormLabel className="sr-only">Phone Number</FormLabel>
                <FormControl>
                  <div
                    className={`flex h-10 w-full rounded-md border bg-transparent transition-colors focus-within:outline-none focus-within:ring-0 ${
                      fieldState.error ? "border-destructive" : "border-input focus-within:border-ring"
                    }`}
                  >
                    <PhoneInput
                      defaultCountry="gb"
                      value={field.value}
                      onChange={(phone) => field.onChange(phone)}
                      className="flex w-full"
                      inputProps={{
                        placeholder: "Phone Number",
                      }}
                      inputClassName="!flex !h-10 !w-full !border-none !bg-transparent !px-3 !py-2 !text-base md:!text-sm !placeholder:text-muted-foreground focus:!outline-none disabled:!cursor-not-allowed disabled:!opacity-50 !shadow-none"
                      countrySelectorStyleProps={{
                        buttonClassName: "!h-10 !border-none !rounded-l-md !bg-transparent !px-3 hover:!bg-accent",
                      }}
                    />
                  </div>
                </FormControl>
                <FormMessage className="mt-1.5" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="studio_type"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="sr-only">Studio Preference</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Studio Preference" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="silver">Silver Studio</SelectItem>
                    <SelectItem value="gold">Gold Studio</SelectItem>
                    <SelectItem value="platinum">Platinum Studio</SelectItem>
                    <SelectItem value="rhodium">Rhodium Studio</SelectItem>
                    <SelectItem value="rhodium-plus">Rhodium Plus Studio</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage className="mt-1.5" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="preferred_date"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="sr-only">Preferred Date</FormLabel>
                <FormControl>
                  {compact ? (
                    <div className="relative h-12 overflow-hidden rounded-xl border border-white/35">
                      <Input
                        type="date"
                        min={new Date().toISOString().split("T")[0]}
                        style={!field.value ? { color: "transparent" } : undefined}
                        className={`h-full w-full cursor-pointer rounded-xl border border-transparent bg-black/50 outline-none ring-0 focus:bg-black/60 focus-visible:ring-0 pr-10 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 ${field.value ? "text-white" : ""}`}
                        {...field}
                      />
                      {!field.value && (
                        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-white/55">
                          Preferred Date
                        </span>
                      )}
                      <Calendar
                        className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-white"
                        aria-hidden
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      <Input
                        type="date"
                        min={new Date().toISOString().split("T")[0]}
                        style={!field.value ? { color: "transparent" } : undefined}
                        className="cursor-pointer [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
                        {...field}
                      />
                      {!field.value && (
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                          Preferred Date
                        </span>
                      )}
                    </div>
                  )}
                </FormControl>
                <FormMessage className="mt-1.5" />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="preferred_time"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormLabel className="sr-only">Preferred Time</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Preferred Time" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {timeSlots.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {slot}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage className="mt-1.5" />
              </FormItem>
            )}
          />
          {!hideMessageField && (
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem className="space-y-0 md:col-span-2">
                  <FormLabel className="sr-only">Additional Message (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional Message (Optional)"
                      className={`min-h-[100px] resize-none ${compact ? "border-white/35 bg-white/0 text-white placeholder:text-white/55" : ""}`}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="mt-1.5" />
                </FormItem>
              )}
            />
          )}
        </div>

        <div className={`flex gap-4 ${showCancel ? "flex-row" : "flex-col"}`}>
          {showCancel && (
            <Button
              type="button"
              onClick={onCancel}
              className="w-1/2 rounded-md bg-zinc-900 text-xs font-semibold uppercase tracking-wider text-white hover:bg-zinc-800 hover:text-white"
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            disabled={isSubmitting}
            data-analytics={formType === "booking" ? "form-viewing-submit" : "form-callback-submit"}
            className={
              compact
                ? "w-full rounded-2xl bg-primary py-6 text-xs font-bold uppercase tracking-normal text-white hover:bg-primary/90"
                : `${showCancel ? "w-1/2" : "w-full"} rounded-md bg-accent-yellow text-xs font-semibold uppercase tracking-wider text-black hover:bg-accent-yellow/90`
            }
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel ?? (formType === "booking" ? "Confirm Booking" : "Request Callback")}
          </Button>
        </div>
      </form>
    </Form>
  );
};
