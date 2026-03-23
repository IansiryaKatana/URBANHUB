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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { isPossiblePhoneNumber } from "libphonenumber-js";
import { useState } from "react";
import { useEffect } from "react";
import { useCreatorForm } from "@/hooks/useCreatorForm";
import { pushDataLayer } from "@/utils/dataLayer";

const contentTypeOptions = [
  "Lifestyle",
  "Student Life",
  "Comedy / Skits",
  "Room Tours / Interiors",
  "Vlogs",
  "Other",
] as const;

const yesNoOptions = ["Yes", "No"] as const;

const collaborationFormatOptions = [
  "Paid collaboration",
  "Experience collaboration",
  "Open to both",
] as const;

const creatorSchema = zod.object({
  full_name: zod.string().min(2, "Name must be at least 2 characters"),
  email: zod.string().email("Invalid email address"),
  phone: zod
    .string()
    .refine(
      (val) => (val ? isPossiblePhoneNumber(val) : false),
      "Invalid phone number for the selected country"
    ),
  city_university: zod.string().min(2, "City / University is required"),
  instagram: zod.string().optional(),
  tiktok: zod.string().optional(),
  snapchat: zod.string().optional(),
  youtube: zod.string().optional(),
  total_followers: zod.string().optional(),
  content_type: zod.enum(contentTypeOptions),
  content_type_other: zod.string().optional(),
  content_style_summary: zod
    .string()
    .min(10, "Please describe your content style in a few words"),
  example_links: zod
    .string()
    .min(10, "Please share 2–3 links to example posts or reels"),
  worked_with_brands: zod.enum(yesNoOptions),
  urbanhub_content_idea: zod
    .string()
    .min(10, "Tell us what you would create for Urban Hub"),
  can_visit_preston: zod.enum(yesNoOptions),
  collaboration_format: zod.enum(collaborationFormatOptions),
  additional_info: zod.string().optional(),
  accept_terms: zod.literal(true, {
    errorMap: () => ({
      message:
        "You must confirm the information is accurate and agree to the content creator terms.",
    }),
  }),
});

type CreatorFormValues = zod.infer<typeof creatorSchema>;

interface CreatorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  landingPageSlug?: string;
  ctaTrackingKey?: string;
  ctaType?: string;
  ctaSource?: string;
}

export const CreatorFormDialog = ({
  open,
  onOpenChange,
  landingPageSlug,
  ctaTrackingKey,
  ctaType,
  ctaSource = "inline",
}: CreatorFormDialogProps) => {
  const isMobile = useIsMobile();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isCompleted, setIsCompleted] = useState(false);
  const { submitCreatorForm, isSubmitting } = useCreatorForm();

  const form = useForm<CreatorFormValues>({
    resolver: zodResolver(creatorSchema),
    defaultValues: {
      full_name: "",
      email: "",
      phone: "",
      city_university: "",
      instagram: "",
      tiktok: "",
      snapchat: "",
      youtube: "",
      total_followers: "",
      content_type: "Lifestyle",
      content_type_other: "",
      content_style_summary: "",
      example_links: "",
      worked_with_brands: "No",
      urbanhub_content_idea: "",
      can_visit_preston: "Yes",
      collaboration_format: "Open to both",
      additional_info: "",
      accept_terms: false,
    },
  });

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    pushDataLayer("lp_form_start", {
      event_action: "lp_form_start",
      form_type: "content_creator",
      page_path: window.location.pathname || "/",
      landing_slug: (landingPageSlug || "").replace(/^\/landing\//, "") || undefined,
      cta_tracking_key: ctaTrackingKey,
      cta_type: ctaType,
      cta_source: ctaSource,
    });
  }, [open, landingPageSlug, ctaTrackingKey, ctaType, ctaSource]);

  const resetState = () => {
    setStep(1);
    setIsCompleted(false);
    form.reset();
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      onOpenChange(false);
      resetState();
    } else {
      onOpenChange(true);
    }
  };

  const onSubmit = async (values: CreatorFormValues) => {
    await submitCreatorForm({
      ...values,
      landing_page: landingPageSlug,
      tracking_key: ctaTrackingKey,
      cta_type: ctaType,
      cta_source: ctaSource,
    });
    setIsCompleted(true);
  };

  const nextStep = async () => {
    if (step === 1) {
      const valid = await form.trigger(
        ["full_name", "email", "phone", "city_university"] as (keyof CreatorFormValues)[]
      );
      if (!valid) return;
      setStep(2);
    } else if (step === 2) {
      const fields: (keyof CreatorFormValues)[] = [
        "content_type",
        "content_style_summary",
        "example_links",
      ];
      if (form.getValues().content_type === "Other") {
        fields.push("content_type_other");
      }
      const valid = await form.trigger(fields);
      if (!valid) return;
      setStep(3);
    }
  };

  const prevStep = () => {
    setStep((prev) => (prev === 1 ? 1 : (prev - 1) as 1 | 2 | 3));
  };

  const steps = [
    { id: 1, label: "Basic & Social" },
    { id: 2, label: "Content style" },
    { id: 3, label: "Collaboration" },
  ];

  const title = "Apply as a Content Creator";
  const description =
    "Tell us more about you, your channels, and how you would collaborate with Urban Hub.";

  const shell = (children: React.ReactNode) => (
    <>
      <DialogHeader>
        <DialogTitle className="text-3xl font-display font-black uppercase tracking-wide">
          {title}
        </DialogTitle>
        <DialogDescription className="text-base text-muted-foreground mt-4">
          {description}
        </DialogDescription>
      </DialogHeader>
      <div className="mt-6 space-y-6">
        <div className="flex items-center gap-2">
          {steps.map((s) => (
            <div key={s.id} className="flex-1 flex items-center gap-2">
              <div
                className={`h-9 px-3 rounded-full text-xs font-semibold uppercase tracking-[0.18em] flex items-center justify-center ${
                  step === s.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {s.label}
              </div>
              {s.id < steps.length && (
                <div className="hidden sm:block flex-1 h-px bg-muted-foreground/30" />
              )}
            </div>
          ))}
        </div>
        {children}
      </div>
    </>
  );

  const successContent = (
    <div className="space-y-4 py-4">
      <h3 className="text-xl font-display font-black uppercase tracking-wide text-center">
        Application received
      </h3>
      <p className="text-sm text-muted-foreground text-center">
        Thanks for applying to collaborate with Urban Hub. Our team will review your profile and be
        in touch if it&apos;s a good fit.
      </p>
      <div className="flex gap-3">
        <Button
          className="w-full rounded-full uppercase text-xs font-semibold"
          variant="outline"
          onClick={() => {
            resetState();
          }}
        >
          Submit another
        </Button>
        <Button
          className="w-full rounded-full uppercase text-xs font-semibold"
          onClick={() => handleOpenChange(false)}
        >
          Close
        </Button>
      </div>
    </div>
  );

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="city_university"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City / University</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Preston / UCLan" {...field} />
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
                    <FormLabel>Email address</FormLabel>
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
                    <FormLabel>Phone number</FormLabel>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="instagram"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instagram profile link</FormLabel>
                    <FormControl>
                      <Input placeholder="https://instagram.com/username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tiktok"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>TikTok profile link</FormLabel>
                    <FormControl>
                      <Input placeholder="https://tiktok.com/@username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="snapchat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Snapchat profile link</FormLabel>
                    <FormControl>
                      <Input placeholder="Snapchat link or username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="youtube"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>YouTube channel link</FormLabel>
                    <FormControl>
                      <Input placeholder="https://youtube.com/@channel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="total_followers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total followers across platforms (approx.)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 12,000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="content_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What type of content do you create?</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      {...field}
                    >
                      {contentTypeOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {form.watch("content_type") === "Other" && (
              <FormField
                control={form.control}
                name="content_type_other"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Other content type (please specify)</FormLabel>
                    <FormControl>
                      <Input placeholder="Describe your content type" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="content_style_summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Describe your content style in a few words</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Short description of your style, themes, and audience."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="example_links"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Links to 2–3 example posts or reels</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Paste 2–3 URLs on separate lines."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="worked_with_brands"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Have you worked with brands before?</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      {...field}
                    >
                      {yesNoOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="urbanhub_content_idea"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What type of content would you create for Urban Hub?</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Share your ideas for showcasing Urban Hub, student life, and our spaces."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="can_visit_preston"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Are you able to visit Urban Hub Preston to create content?</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      {...field}
                    >
                      {yesNoOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="collaboration_format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferred collaboration format</FormLabel>
                  <FormControl>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      {...field}
                    >
                      {collaborationFormatOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="additional_info"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Anything else we should know about you?</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Optional: anything else you'd like to share."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                      I confirm that the information provided is accurate and I agree to Urban Hub&apos;s{" "}
                      <a
                        href="/content-creator-terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        content creator terms
                      </a>
                      .
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center gap-3 pt-2">
          <div className="flex gap-2 md:mr-auto">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={prevStep}
              >
                Back
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full"
              onClick={() => handleOpenChange(false)}
            >
              Close
            </Button>
          </div>
          {step < 3 ? (
            <Button
              type="button"
              className="rounded-full md:ml-auto"
              onClick={nextStep}
            >
              Next step
            </Button>
          ) : (
            <Button
              type="submit"
              className="rounded-full md:ml-auto"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit application"}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
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
            {isCompleted ? successContent : shell(formContent)}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[640px] rounded-[28px] p-8">
        {isCompleted ? successContent : shell(formContent)}
      </DialogContent>
    </Dialog>
  );
};

