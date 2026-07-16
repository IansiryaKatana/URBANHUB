import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getLandingHeroCtaLabel,
  hasSecondaryLandingCta,
  type LandingHeroAlignment,
  type LandingHeroCtaType,
} from "@/lib/landingHeroCta";
import { AnimatedText } from "@/components/animations/AnimatedText";

export type LandingHeroCtaConfig = {
  label: string | null;
  type: LandingHeroCtaType;
  url?: string | null;
  trackingKey?: string | null;
};

type LandingHeroCtaButtonsProps = {
  primary: LandingHeroCtaConfig;
  secondary?: {
    label: string | null;
    type: LandingHeroCtaType | null;
    url?: string | null;
    trackingKey?: string | null;
  } | null;
  alignment?: LandingHeroAlignment;
  onAction: (cta: {
    type: LandingHeroCtaType;
    url?: string | null;
    trackingKey?: string | null;
  }) => void;
  analyticsFallback?: string;
};

function CtaButton({
  cta,
  variant,
  alignment,
  onAction,
  analyticsFallback,
}: {
  cta: LandingHeroCtaConfig;
  variant: "primary" | "secondary";
  alignment: LandingHeroAlignment;
  onAction: LandingHeroCtaButtonsProps["onAction"];
  analyticsFallback: string;
}) {
  const label = getLandingHeroCtaLabel(cta.type, cta.label);
  const isCustom = cta.type === "custom_link";
  const href = cta.url?.trim() || null;

  const className = cn(
    "font-bold uppercase tracking-wide",
    alignment === "left"
      ? "flex-1 basis-0 rounded-[16px] px-4 md:flex-none md:basis-auto md:px-7"
      : "rounded-full px-8 py-3 text-sm tracking-[0.35em]",
    variant === "primary"
      ? "bg-[#ff2020] text-white hover:bg-[#ff4040]"
      : "bg-white text-black hover:bg-zinc-100",
  );

  if (isCustom && href) {
    return (
      <Button asChild size="lg" className={className} data-analytics={cta.trackingKey || analyticsFallback}>
        <a href={href} target="_blank" rel="noopener noreferrer">
          {label}
        </a>
      </Button>
    );
  }

  return (
    <Button
      size="lg"
      className={className}
      data-analytics={cta.trackingKey || analyticsFallback}
      onClick={() =>
        onAction({
          type: cta.type,
          url: cta.url,
          trackingKey: cta.trackingKey,
        })
      }
    >
      {label}
    </Button>
  );
}

export function LandingHeroCtaButtons({
  primary,
  secondary,
  alignment = "center",
  onAction,
  analyticsFallback = "landing-hero-cta",
}: LandingHeroCtaButtonsProps) {
  const showSecondary = hasSecondaryLandingCta({
    label: secondary?.label,
    type: secondary?.type,
  });

  return (
    <AnimatedText delay={0.4}>
      <div
        className={cn(
          "flex gap-3",
          alignment === "left"
            ? "mt-2 w-full md:mt-0 md:w-auto md:flex-wrap"
            : "flex-wrap justify-center",
        )}
      >
        <CtaButton
          cta={primary}
          variant="primary"
          alignment={alignment}
          onAction={onAction}
          analyticsFallback={analyticsFallback}
        />
        {showSecondary && secondary?.type ? (
          <CtaButton
            cta={{
              label: secondary.label,
              type: secondary.type,
              url: secondary.url,
              trackingKey: secondary.trackingKey,
            }}
            variant="secondary"
            alignment={alignment}
            onAction={onAction}
            analyticsFallback={`${analyticsFallback}-secondary`}
          />
        ) : null}
      </div>
    </AnimatedText>
  );
}

export function getLandingHeroLayoutClasses(alignment: LandingHeroAlignment = "center") {
  if (alignment === "left") {
    return {
      shell:
        "relative flex h-full items-end justify-start pt-28 md:pt-0",
      container:
        "container mx-auto flex h-full min-h-0 flex-col items-stretch justify-end overflow-y-auto px-4 pb-24 pt-5 text-white md:px-8 md:pb-20 md:pt-20",
      content: "max-w-2xl space-y-5 text-left md:space-y-6",
      h1Wrap: "flex justify-start",
      subtitle: "max-w-xl text-sm leading-relaxed text-white/80 md:text-base",
      transformOrigin: "left center" as const,
    };
  }

  return {
    shell:
      "relative flex h-full items-start justify-center pt-28 md:items-center md:pt-0",
    container:
      "container mx-auto flex h-full min-h-0 flex-col items-center justify-start overflow-y-auto px-4 py-10 text-white md:justify-center md:py-24",
    content: "max-w-3xl space-y-6 text-center",
    h1Wrap: "flex justify-center",
    subtitle: "mx-auto max-w-2xl text-sm text-white/80 md:text-lg",
    transformOrigin: "center" as const,
  };
}
