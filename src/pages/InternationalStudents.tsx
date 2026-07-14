import { useEffect, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import {
  ArrowUpRight,
  CreditCard,
  Eye,
  Glasses,
  HeartHandshake,
  LifeBuoy,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselDots,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { AnimatedCard, AnimatedParagraph } from "@/components/animations/AnimatedText";
import { supabase } from "@/integrations/supabase/client";
import { useBrandingSettings } from "@/hooks/useBranding";
import { useTestimonials } from "@/hooks/useTestimonials";
import { useIntlCommunityImages } from "@/hooks/useIntlCommunityImages";
import { useIntlArrivalSteps } from "@/hooks/useIntlArrivalSteps";
import { useAllStudioAvailability, getAvailabilityTag, isFullyBooked } from "@/hooks/useStudioAvailability";
import { portalStudiosUrl } from "@/config";
import { BookViewingDialog } from "@/components/leads/BookViewingDialog";
import { GetCallbackDialog } from "@/components/leads/GetCallbackDialog";
import { SecureBookingDialog } from "@/components/leads/SecureBookingDialog";
import { CountryFlagMarquee } from "@/components/international-students/CountryFlagMarquee";
import { buildWhatsAppUrl } from "@/components/international-students/MorphingStickyCta";
import { VrTourDialog } from "@/components/international-students/VrTourDialog";
import { VideoTestimonialCard } from "@/components/international-students/VideoTestimonialCard";
import { ArrivalCoverflow } from "@/components/international-students/ArrivalCoverflow";
import type { Database } from "@/integrations/supabase/types";
import Autoplay from "embla-carousel-autoplay";
import heroImage from "@/assets/international-students/hero.png";
import communityImage from "@/assets/international-students/community.jpg";
import vrThumbnail from "@/assets/international-students/vr.webp";

type AcademicYearRow = Database["public"]["Tables"]["academic_years"]["Row"];

type StudioGradeSummary = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  gallery: { url: string }[];
  weeklyPrice: number | null;
};

const LANDING_SLUG = "/international-students";

const WORRIES = [
  {
    q: '"Do I need a UK guarantor?"',
    a: "Only for instalments.",
    body: "Pay your rent in full and you won't need a UK guarantor at all. Prefer to spread the cost across our 3, 4 or 10 instalment plans? A UK guarantor is required, and if you don't have one, just ask us about approved guarantor services.",
    accent: false,
    icon: <UserCheck className="h-10 w-10" />,
  },
  {
    q: '"What if my visa gets refused?"',
    a: "You get your money back.",
    body: "If your student visa or university place is declined, you can cancel your booking and get a full refund. You're never locked into a home you can't move into.",
    accent: false,
    icon: <ShieldCheck className="h-10 w-10" />,
  },
  {
    q: '"What if the room isn\'t what I expected?"',
    a: "See it before you commit.",
    body: "Book a live virtual viewing with our team, or explore the whole building in VR. What you see online is exactly what you'll walk into on move-in day.",
    accent: false,
    icon: <Eye className="h-10 w-10" />,
  },
  {
    q: '"How do I pay from overseas?"',
    a: "Simple, secure, in your currency.",
    body: "Pay from your home country through a secure international payment portal, no confusing bank transfers, no hidden FX surprises. Pay in full or choose a 3, 4 or 10 instalment plan.",
    accent: false,
    icon: <CreditCard className="h-10 w-10" />,
  },
  {
    q: '"What if I arrive and it goes wrong?"',
    a: "Someone is always here.",
    body: "Move in any time, day or night. Our team is on-site during the week with 24/7 emergency support, so you're never alone in a new country.",
    accent: false,
    icon: <LifeBuoy className="h-10 w-10" />,
  },
  {
    q: '"Will I actually make friends?"',
    a: "You'll be welcomed in.",
    body: "Join a community of students from around the world. Welcome events, socials and shared spaces mean you'll have people to lean on from day one.",
    accent: true,
    icon: <HeartHandshake className="h-10 w-10" />,
  },
];

const PLANS = [
  { name: "Pay in full", tag: "No guarantor needed", highlight: true, green: true },
  { name: "3 instalments", tag: "UK guarantor required", highlight: false, green: false },
  { name: "4 instalments", tag: "UK guarantor required", highlight: false, green: false },
  { name: "10 instalments", tag: "UK guarantor required", highlight: false, green: false },
];

const FAQS = [
  {
    q: "Do I need a UK guarantor to book?",
    a: "It depends on how you pay. If you pay your rent in full upfront, you do not need a UK guarantor. If you choose one of our instalment plans (3, 4 or 10 payments), a UK-based guarantor is required. Don't have one? Ask our team about approved guarantor services that can act as your guarantor for a fee.",
  },
  {
    q: "What happens if my visa is refused?",
    a: "If your student visa or your place at university is declined, you can cancel your booking and receive a full refund. Just send us your official refusal documentation and our team will handle it.",
  },
  {
    q: "Which documents do I need for a UK student visa?",
    a: "Typically you'll need: a valid passport, your Confirmation of Acceptance for Studies (CAS) from your university, proof of funds (bank statement), proof of English proficiency (e.g. IELTS), and, for some countries, a tuberculosis test certificate. Start early and check the official",
  },
  {
    q: "How do I pay from my home country?",
    a: "You pay through a secure international payment portal inside your online account. It's designed for overseas payments, so there's no confusing bank transfer or unexpected exchange-rate fees. Our team walks you through it if you get stuck.",
  },
  {
    q: "What payment plans can I choose from?",
    a: "You can pay your full rent in one upfront payment (no guarantor needed), or spread it across one of three instalment plans: 3 payments (per term), 4 payments (quarterly) or 10 payments (monthly). All instalment plans require a UK guarantor.",
  },
  {
    q: "Can I see the room before I book?",
    a: "Yes. Book a free live virtual viewing with our team, or explore the entire building in VR whenever you like. What you see is exactly what you get on move-in day.",
  },
  {
    q: "What's included in the rent?",
    a: "All utility bills (electricity, water, heating) and high-speed Wi-Fi are included, no hidden charges. Each studio is fully furnished with your own bed, ensuite bathroom and kitchenette.",
  },
  {
    q: "What time can I move in?",
    a: "Any time, day or night, once your contract begins. Our team is on-site during the week and there's 24/7 emergency support, so late flights are never a problem.",
  },
  {
    q: "What should I do when I arrive in the UK?",
    a: "Let your family know you've arrived safely, check into Urban Hub and settle in, enrol at UCLan and collect your student ID, register with a local GP, and open a UK bank account. Your Urban Hub licence agreement counts as proof of address for opening a bank account and registering with a doctor.",
  },
];

const InternationalStudents = () => {
  const { data: branding } = useBrandingSettings();
  const { data: testimonialsData, isLoading: testimonialsLoading } =
    useTestimonials("international_students");
  const testimonials = testimonialsData || [];
  const { data: communityImagesData } = useIntlCommunityImages();
  const { data: arrivalStepsData } = useIntlArrivalSteps();
  const arrivalSteps = arrivalStepsData || [];
  const communitySlides =
    communityImagesData && communityImagesData.length > 0
      ? communityImagesData.map((img) => ({
          id: img.id,
          url: img.image_url,
          alt: img.alt_text || "Students and community life at Urban Hub",
        }))
      : [
          {
            id: "fallback",
            url: communityImage,
            alt: "Students relaxing and playing cards together in the Urban Hub communal lounge",
          },
        ];

  const [selectedYear, setSelectedYear] = useState<AcademicYearRow | null>(null);
  const [grades, setGrades] = useState<StudioGradeSummary[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);

  const [secureOpen, setSecureOpen] = useState(false);
  const [viewingOpen, setViewingOpen] = useState(false);
  const [callbackOpen, setCallbackOpen] = useState(false);
  const [vrOpen, setVrOpen] = useState(false);
  const [showAllWorries, setShowAllWorries] = useState(false);
  const [ctaKey, setCtaKey] = useState<string | undefined>();

  const { data: availabilityData, isLoading: availabilityLoading } = useAllStudioAvailability(
    selectedYear?.id || undefined,
  );

  const companyName = branding?.company_name || "Urban Hub";
  const yearSlug = selectedYear?.name.replace(/\//g, "-") || "";

  useEffect(() => {
    document.title = "International Students | Urban Hub Preston | Book With Confidence";
    return () => {
      document.title = "Urban Hub";
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data, error } = await supabase
        .from("social_media_settings")
        .select("url, is_enabled")
        .eq("platform", "whatsapp")
        .eq("is_enabled", true)
        .single();
      if (!mounted || error || !data?.url) return;
      setWhatsappUrl(data.url);
    };
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadYears = async () => {
      const { data, error } = await supabase
        .from("academic_years")
        .select("*")
        .eq("is_active", true)
        .order("start_date", { ascending: false });
      if (!mounted) return;
      if (error) {
        console.error("Unable to load academic years:", error);
        setCatalogLoading(false);
        return;
      }
      const years = (data || []) as AcademicYearRow[];
      const now = new Date();
      const selected =
        years.find((y) => new Date(y.start_date) > now) || years[0] || null;
      setSelectedYear(selected);
      if (!selected) setCatalogLoading(false);
    };
    void loadYears();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedYear) return;
    let mounted = true;
    const loadGrades = async () => {
      setCatalogLoading(true);
      const { data, error } = await supabase
        .from("studio_grades")
        .select(
          `
            id,
            name,
            slug,
            short_description,
            studio_grade_media (
              url,
              is_hero,
              position
            ),
            studio_grade_prices!inner (
              weekly_price,
              academic_year:academic_years!inner (
                id,
                name
              )
            )
          `,
        )
        .eq("is_active", true)
        .eq("studio_grade_prices.academic_year_id", selectedYear.id)
        .eq("studio_grade_prices.is_active", true)
        .order("display_order", { ascending: true });

      if (!mounted) return;
      if (error) {
        console.error("Unable to load studio grades:", error);
        setCatalogError("We couldn't load the studio catalogue just now. Please try again shortly.");
        setGrades([]);
        setCatalogLoading(false);
        return;
      }

      const summaries =
        data?.map((grade) => {
          const gallery =
            grade.studio_grade_media
              ?.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
              .map((item) => ({ url: item.url }))
              .filter((item) => Boolean(item.url)) ?? [];

          const sortedPrices =
            grade.studio_grade_prices
              ?.filter((price) => typeof price.weekly_price === "number")
              .sort(
                (a, b) =>
                  (a.weekly_price ?? Number.POSITIVE_INFINITY) -
                  (b.weekly_price ?? Number.POSITIVE_INFINITY),
              ) ?? [];
          const primaryPrice = sortedPrices[0];

          return {
            id: grade.id,
            name: grade.name,
            slug: grade.slug,
            short_description: grade.short_description,
            gallery,
            weeklyPrice: primaryPrice?.weekly_price ?? null,
          } as StudioGradeSummary;
        }) ?? [];

      setGrades(summaries);
      setCatalogError(null);
      setCatalogLoading(false);
    };
    void loadGrades();
    return () => {
      mounted = false;
    };
  }, [selectedYear]);

  const openSecure = (key?: string) => {
    setCtaKey(key);
    setSecureOpen(true);
  };
  const openViewing = (key?: string) => {
    setCtaKey(key);
    setViewingOpen(true);
  };
  const openCallback = (key?: string) => {
    setCtaKey(key);
    setCallbackOpen(true);
  };
  const openWa = (text?: string) => {
    if (!whatsappUrl) return;
    window.open(buildWhatsAppUrl(whatsappUrl, text), "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero */}
      <section id="intl-hero" className="relative min-h-[100dvh] overflow-hidden bg-black text-white">
        <img
          src={heroImage}
          alt="International students arriving at Urban Hub"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

        <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-7xl flex-col justify-end px-4 pb-28 pt-32 md:px-8 md:pb-20">
          <div className="max-w-2xl">
            <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.28em] text-white/70">
              University of Lancashire
            </p>
            <h1 className="font-display text-5xl font-black uppercase leading-[0.92] tracking-wide sm:text-5xl md:text-6xl lg:text-7xl">
              For international
              <br />
              students
            </h1>
            <p className="mt-5 hidden max-w-xl text-sm leading-relaxed text-white/80 md:block md:text-base">
              Thousands of miles from home, arranging everything online. We get it. Urban Hub is built so international
              students can book, arrive and settle in without the stress: pay in full with no UK guarantor, protected if
              your visa is refused, no surprises.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                size="lg"
                className="rounded-[16px] bg-primary px-7 font-bold uppercase tracking-wide text-white hover:bg-primary/90"
                onClick={() => openSecure("hero_book")}
              >
                <span className="md:hidden">Secure Studio</span>
                <span className="hidden md:inline">Secure Your Studio (£99)</span>
              </Button>
              <Button
                size="lg"
                className="rounded-[16px] bg-white px-7 font-bold uppercase tracking-wide text-black hover:bg-zinc-100"
                onClick={() => openViewing("hero_viewing")}
              >
                Book a Viewing
              </Button>
            </div>
          </div>

          {/* VR teaser image — bottom right (desktop only); swap src when image is ready */}
          <button
            type="button"
            onClick={() => setVrOpen(true)}
            className="absolute bottom-8 right-4 z-20 hidden w-[280px] overflow-hidden rounded-2xl shadow-2xl transition hover:opacity-95 md:bottom-12 md:right-8 md:block md:w-[320px]"
            aria-label="Start VR tour"
          >
            <div className="relative aspect-video w-full bg-zinc-900">
              <img
                src={vrThumbnail}
                alt="Tour the studios in VR"
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          </button>
        </div>
      </section>

      {/* Mobile VR strip */}
      <section className="bg-zinc-900 text-white md:hidden" aria-label="Tour studios in VR">
        <div className="mx-auto flex max-w-7xl flex-col items-stretch gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-white/10 text-white">
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-primary" />
              <Glasses className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">
                See it before you fly
              </p>
              <p className="font-display text-lg font-black uppercase leading-tight tracking-wide text-white">
                Tour the studios in VR
              </p>
            </div>
          </div>
          <Button
            className="w-full rounded-[16px] bg-primary px-6 font-bold uppercase tracking-wide text-white hover:bg-primary/90 sm:w-auto"
            onClick={() => setVrOpen(true)}
          >
            <Glasses className="mr-2 h-4 w-4" />
            Start VR Tour
          </Button>
        </div>
      </section>

      {/* Why / worries — structure matches homepage Why Choose, light bg */}
      <section id="why" className="bg-zinc-50 py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="space-y-8 lg:col-span-5">
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">Every worry, handled</p>
                <h2 className="font-display text-4xl font-black uppercase leading-none tracking-tight md:text-6xl">
                  The five things that keep you up at night,{" "}
                  <span className="text-primary">already sorted</span>
                </h2>
                <AnimatedParagraph delay={0.2} className="max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
                  You&apos;re comparing accommodation from another country and the &quot;what ifs&quot; pile up fast.
                  Here&apos;s exactly how Urban Hub removes each one, so you can book knowing you&apos;re protected.
                </AnimatedParagraph>
              </div>

              <div className="hidden lg:block">
                <Button
                  onClick={() => setShowAllWorries(!showAllWorries)}
                  className="rounded-[16px] border-none bg-zinc-900 px-10 py-6 text-sm font-semibold uppercase tracking-normal text-white ring-0 transition-all hover:bg-zinc-800 focus-visible:ring-0 focus-visible:ring-offset-0"
                >
                  {showAllWorries ? "See Less" : "Load More"} <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="lg:hidden">
                <Carousel className="w-full">
                  <CarouselContent className="-ml-4">
                    {WORRIES.map((w) => (
                      <CarouselItem key={w.q} className="basis-full pl-4 sm:basis-1/2">
                        <div
                          className={`flex h-full flex-col space-y-6 rounded-[32px] p-8 ${
                            w.accent
                              ? "bg-primary text-white"
                              : "bg-white"
                          }`}
                        >
                          <div className={w.accent ? "text-white" : "text-zinc-900"}>{w.icon}</div>
                          <div className="space-y-3">
                            <p className={`text-sm font-medium ${w.accent ? "text-white/70" : "text-muted-foreground"}`}>
                              {w.q}
                            </p>
                            <h3 className="font-display text-xl font-black uppercase leading-tight tracking-wide md:text-2xl">
                              {w.a}
                            </h3>
                            <p className={`text-sm leading-relaxed ${w.accent ? "text-white/85" : "text-muted-foreground"}`}>
                              {w.body}
                            </p>
                          </div>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <div className="mt-8 flex items-center justify-center gap-4">
                    <CarouselPrevious className="static translate-y-0 border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50" />
                    <CarouselNext className="static translate-y-0 border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50" />
                  </div>
                </Carousel>
              </div>

              <div className="hidden grid-cols-2 gap-6 lg:grid">
                {(showAllWorries ? WORRIES : WORRIES.slice(0, 4)).map((w, idx) => (
                  <AnimatedCard
                    key={w.q}
                    delay={0.3 + idx * 0.1}
                    index={idx}
                    className={`group space-y-6 rounded-[32px] p-8 transition-all duration-300 ${
                      w.accent
                        ? "bg-primary text-white hover:bg-primary/95"
                        : "bg-white hover:shadow-[0_16px_40px_rgba(0,0,0,0.06)]"
                    }`}
                  >
                    <div
                      className={`transition-all duration-300 group-hover:scale-110 ${
                        w.accent ? "text-white" : "text-zinc-900 group-hover:text-primary"
                      }`}
                    >
                      {w.icon}
                    </div>
                    <div className="space-y-3">
                      <p className={`text-sm font-medium ${w.accent ? "text-white/70" : "text-muted-foreground"}`}>
                        {w.q}
                      </p>
                      <h3 className="font-display text-xl font-black uppercase leading-tight tracking-wide md:text-2xl">
                        {w.a}
                      </h3>
                      <p className={`text-sm leading-relaxed ${w.accent ? "text-white/85" : "text-muted-foreground"}`}>
                        {w.body}
                      </p>
                    </div>
                  </AnimatedCard>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Arrival */}
      <section id="arrival" className="bg-zinc-100 py-20 text-foreground md:py-28">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500 md:text-center">
            Your first 24 hours, mapped out
          </p>
          <h2 className="mt-3 max-w-3xl font-display text-4xl font-black uppercase leading-none tracking-tight md:mx-auto md:text-center md:text-6xl">
            From your front door at home <span className="text-primary">to your first night in Preston</span>
          </h2>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground md:mx-auto md:text-center md:text-base">
            The scariest part of moving abroad is the unknown. So we&apos;ve mapped the whole journey: exactly what
            happens, and who&apos;s with you at every step.
          </p>
        </div>

        {arrivalSteps.length > 0 ? (
          <div className="mt-10 w-full">
            <ArrivalCoverflow steps={arrivalSteps} />
          </div>
        ) : null}

        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mt-8 flex flex-col items-start justify-center gap-3 sm:flex-row sm:items-center md:justify-center md:mt-4">
            <Button
              size="lg"
              className="rounded-[16px] bg-[#128C7E] px-7 font-bold uppercase tracking-wide text-white hover:bg-[#0E7368]"
              onClick={() =>
                openWa("Hi Urban Hub, I'm arriving from abroad and I'd like help planning my arrival.")
              }
            >
              <FaWhatsapp className="mr-2 h-5 w-5" />
              Plan My Arrival on WhatsApp
            </Button>
          </div>
        </div>
      </section>

      {/* Community band */}
      <section className="grid lg:h-screen lg:grid-cols-2">
        <div className="relative min-h-[320px] overflow-hidden lg:min-h-0 lg:h-full">
          <Carousel
            opts={{ loop: true }}
            plugins={
              communitySlides.length > 1
                ? [
                    Autoplay({
                      delay: 4500,
                      stopOnInteraction: false,
                      stopOnMouseEnter: true,
                    }),
                  ]
                : undefined
            }
            className="absolute inset-0 h-full w-full [&>div]:h-full"
          >
            <CarouselContent className="-ml-0 h-full">
              {communitySlides.map((slide) => (
                <CarouselItem key={slide.id} className="relative h-full min-h-[320px] flex-[0_0_100%] pl-0 lg:min-h-full">
                  <img
                    src={slide.url}
                    alt={slide.alt}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            {communitySlides.length > 1 ? (
              <CarouselDots className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2" />
            ) : null}
          </Carousel>
        </div>
        <div className="flex flex-col justify-center bg-zinc-50 px-6 py-16 md:px-12 md:py-20 lg:h-full lg:px-16 lg:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">A home, not just a room</p>
          <h2 className="mt-3 font-display text-4xl font-black uppercase leading-none tracking-tight md:text-6xl">
            Your Culture Is Not{" "}
            <span className="text-primary">&ldquo;Extra.&rdquo;</span> It Is the Heartbeat of This Building.
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground md:text-base">
            <p>
              At Urban Hub, we do not just tolerate diversity. We celebrate it. We know that moving abroad does not mean
              leaving your traditions behind. It means finding new ways to honour them.
            </p>
            <p>
              Your private kitchen means you can cook Eid biryani, Diwali sweets, or Chinese New Year dumplings, exactly
              how your family makes them. Your own space means you can pray, meditate, or observe your faith without
              explanation.
            </p>
          </div>
          <div className="mt-8">
            <Button
              className="rounded-[16px] bg-primary px-7 font-bold uppercase tracking-wide text-white hover:bg-primary/90"
              onClick={() => openSecure("community_find_room")}
            >
              Secure Your Studio (£99)
            </Button>
          </div>
        </div>
      </section>

      {/* Rooms, live studio cards */}
      <section id="rooms" className="bg-background py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">Your studio</p>
          <h2 className="mt-3 font-display text-4xl font-black uppercase leading-none tracking-tight md:text-6xl">
            Private studios, all bills included
          </h2>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground md:text-base">
            Every Urban Hub studio is a private, self-contained apartment with your own ensuite bathroom and kitchenette,
            no sharing with strangers. All utility bills and super-fast Wi-Fi are included.
          </p>

          {catalogLoading ? (
            <div className="py-16 text-center text-muted-foreground">Loading studios…</div>
          ) : catalogError ? (
            <div className="mt-10 rounded-3xl border border-destructive/40 bg-destructive/10 px-6 py-8 text-center text-destructive">
              {catalogError}
            </div>
          ) : grades.length === 0 ? (
            <div className="mt-10 rounded-3xl border border-dashed px-6 py-8 text-center text-muted-foreground">
              Studios coming soon.
            </div>
          ) : (
            <div className="mt-12 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {grades.map((grade) => {
                const gradeAvailability = availabilityLoading
                  ? null
                  : availabilityData?.find((avail) => avail.studio_grade_id === grade.id) || null;
                const availabilityTag = availabilityLoading ? null : getAvailabilityTag(gradeAvailability);
                const fullyBooked = availabilityLoading ? false : isFullyBooked(gradeAvailability);

                return (
                  <article
                    key={grade.id}
                    className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-border/40 bg-background shadow-[0_18px_40px_rgba(0,0,0,0.08)] transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(0,0,0,0.12)]"
                  >
                    <div className="relative h-48 w-full overflow-hidden bg-muted/30 group/carousel">
                      {grade.gallery.length ? (
                        <Carousel className="h-full w-full" opts={{ loop: true }}>
                          <CarouselContent className="-ml-0">
                            {grade.gallery.map((image, idx) => (
                              <CarouselItem key={`${grade.id}-${idx}`} className="pl-0">
                                <img
                                  src={image.url}
                                  alt={`${grade.name} ${idx + 1}`}
                                  className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  loading="lazy"
                                />
                              </CarouselItem>
                            ))}
                          </CarouselContent>
                          {grade.gallery.length > 1 && (
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 opacity-0 transition-opacity group-hover/carousel:opacity-100">
                              <CarouselDots className="rounded-full bg-black/50 px-2 py-1 backdrop-blur-sm" />
                            </div>
                          )}
                        </Carousel>
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-[0.4em] text-muted-foreground">
                          {companyName}
                        </div>
                      )}
                      {availabilityTag && (
                        <span
                          className={`absolute right-4 top-4 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] ${availabilityTag.className}`}
                        >
                          {availabilityTag.label}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-4 px-5 pb-5 pt-6">
                      <div>
                        <h3 className="font-display text-2xl font-black uppercase tracking-wide text-foreground underline decoration-accent-yellow decoration-[6px] underline-offset-4 md:text-3xl">
                          {grade.name} STUDIO
                        </h3>
                        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                          {grade.short_description ??
                            "Discover this studio grade, explore availability, and compare contract options tailored for you."}
                        </p>
                        {gradeAvailability && selectedYear && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {gradeAvailability.available_count} of {gradeAvailability.total_capacity} studios available
                            for {selectedYear.name}
                          </p>
                        )}
                      </div>
                      <div className="mt-auto flex items-center justify-between gap-4">
                        {fullyBooked ? (
                          <Button
                            disabled
                            className="cursor-not-allowed rounded-[16px] bg-gray-400 px-6 py-2 text-sm font-semibold uppercase tracking-[0.25em] text-white"
                          >
                            Fully Booked
                          </Button>
                        ) : (
                          <Button
                            asChild
                            className="rounded-[16px] bg-accent-yellow px-6 py-2 text-sm font-bold uppercase tracking-normal text-black shadow-[0_12px_24px_rgba(255,204,0,0.35)] transition-colors hover:bg-[#ff2020] hover:text-white"
                          >
                            <a
                              href={portalStudiosUrl(yearSlug, grade.slug)}
                              target="_blank"
                              rel="noopener noreferrer"
                              data-analytics="intl-grade-book-now"
                            >
                              Book Now
                            </a>
                          </Button>
                        )}
                        <div className="text-right">
                          <p className="text-xl font-black uppercase tracking-wide text-foreground">
                            {typeof grade.weeklyPrice === "number"
                              ? `£${grade.weeklyPrice.toLocaleString("en-GB")}`
                              : "£-"}
                          </p>
                          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                            Per wk
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}

              {/* Payment plans as 6th card, this page only */}
              <article className="flex h-full flex-col overflow-hidden rounded-[28px] border border-border/40 bg-zinc-950 text-white shadow-[0_18px_40px_rgba(0,0,0,0.12)]">
                <div className="relative flex h-48 shrink-0 flex-col justify-end overflow-hidden bg-gradient-to-br from-primary via-primary to-[#b01010] px-5 pb-5 pt-6">
                  <div
                    className="pointer-events-none absolute inset-0 opacity-[0.12]"
                    style={{
                      backgroundImage:
                        "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)",
                      backgroundSize: "18px 18px, 22px 22px",
                    }}
                  />
                  <p className="relative text-[10px] font-semibold uppercase tracking-[0.28em] text-white/70">
                    Payment options
                  </p>
                  <h3 className="relative mt-2 font-display text-2xl font-black uppercase leading-tight tracking-wide underline decoration-accent-yellow decoration-[5px] underline-offset-4 md:text-3xl">
                    Choose how you pay
                  </h3>
                </div>
                <div className="flex flex-1 flex-col px-5 pb-5 pt-5">
                  <ul className="flex flex-1 flex-col">
                    {PLANS.map((p, i) => (
                      <li
                        key={p.name}
                        className={`flex items-center justify-between gap-3 py-3 ${
                          i < PLANS.length - 1 ? "border-b border-dotted border-white/25" : ""
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-display text-base font-black uppercase tracking-wide">{p.name}</p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                            p.green
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-white/10 text-white/65"
                          }`}
                        >
                          {p.tag}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="mt-4 w-full rounded-[16px] bg-accent-yellow font-bold uppercase tracking-normal text-black shadow-[0_12px_24px_rgba(255,204,0,0.25)] transition-colors hover:bg-[#ff2020] hover:text-white"
                    onClick={() => openSecure("rooms_payment_plans")}
                  >
                    Secure Your Studio (£99)
                  </Button>
                </div>
              </article>
            </div>
          )}

        </div>
      </section>

      {/* Nations marquee */}
      <section id="community" className="bg-zinc-50 py-20 md:py-24">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">One building, the whole world</p>
          <h2 className="mt-3 max-w-3xl font-display text-4xl font-black uppercase leading-none tracking-tight md:text-6xl">
            Students from <span className="text-primary">50+ countries</span> already call Urban Hub home
          </h2>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground md:text-base">
            Wherever you&apos;re travelling from, you&apos;ll find familiar faces and new friends.
          </p>
          <div className="mt-10">
            <CountryFlagMarquee />
          </div>
        </div>
      </section>

      {/* Testimonials — dedicated intl-page set, carousel on all breakpoints */}
      <section className="bg-zinc-950 py-20 text-white md:py-28">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          {testimonialsLoading ? (
            <div className="py-12 text-center text-white/50">Loading testimonials…</div>
          ) : testimonials.length === 0 ? (
            <>
              <div className="mb-12">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/50">Social Stories</p>
                <h2 className="mt-3 font-display text-4xl font-black uppercase leading-none tracking-tight md:text-6xl">
                  Watch the moments students care about
                </h2>
              </div>
              <div className="py-12 text-center text-white/50">No testimonials available at this time.</div>
            </>
          ) : (
            <Carousel
              opts={{
                align: "start",
                loop: testimonials.length > 1,
              }}
              className="w-full"
            >
              <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/50">Social Stories</p>
                  <h2 className="mt-3 font-display text-4xl font-black uppercase leading-none tracking-tight md:text-6xl">
                    Watch the moments students care about
                  </h2>
                </div>
                {testimonials.length > 1 && (
                  <div className="hidden items-center gap-3 md:flex">
                    <CarouselPrevious className="static h-12 w-12 translate-y-0 border-white/20 bg-white/5 text-white hover:bg-white/10" />
                    <CarouselNext className="static h-12 w-12 translate-y-0 border-white/20 bg-white/5 text-white hover:bg-white/10" />
                  </div>
                )}
              </div>

              <CarouselContent className="-ml-4 md:-ml-6">
                {testimonials.map((t) => (
                  <CarouselItem key={t.id} className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3 md:pl-6">
                    <VideoTestimonialCard testimonial={t} />
                  </CarouselItem>
                ))}
              </CarouselContent>

              {testimonials.length > 1 && (
                <div className="mt-8 flex items-center justify-center gap-4 md:hidden">
                  <CarouselPrevious className="static h-12 w-12 translate-y-0 border-white/20 bg-white/5 text-white hover:bg-white/10" />
                  <CarouselNext className="static h-12 w-12 translate-y-0 border-white/20 bg-white/5 text-white hover:bg-white/10" />
                </div>
              )}
            </Carousel>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-background py-20 md:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 md:px-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">Visa &amp; arrival, explained</p>
            <h2 className="mt-3 font-display text-4xl font-black uppercase leading-none tracking-tight md:text-6xl">
              The Questions You Are Too Nervous to Ask
              <br />
              Answered With Honesty
            </h2>
            <p className="mt-4 text-sm text-muted-foreground md:text-base">
              We have heard every question. The ones about money. The ones about safety. The ones about whether you will
              fit in.
            </p>
            <Button
              className="mt-6 rounded-[16px] bg-[#128C7E] px-7 font-bold uppercase tracking-wide text-white hover:bg-[#0E7368]"
              onClick={() => openWa("Hi Urban Hub, I have a question.")}
            >
              <FaWhatsapp className="mr-2 h-5 w-5" />
              Ask on WhatsApp
            </Button>
          </div>
          <Accordion type="single" collapsible defaultValue="faq-0" className="w-full">
            {FAQS.map((f, i) => (
              <AccordionItem key={f.q} value={`faq-${i}`} className="border-border/60">
                <AccordionTrigger className="text-left font-sans text-base font-semibold leading-snug tracking-normal hover:no-underline md:text-lg">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground md:text-base">
                  {f.a}
                  {f.q.includes("student visa") ? (
                    <>
                      {" "}
                      <a
                        href="https://www.gov.uk/student-visa"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-primary hover:underline"
                      >
                        UK Government student visa guidance
                      </a>{" "}
                      for your situation.
                    </>
                  ) : null}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section id="intl-final-cta" className="bg-primary py-20 text-white md:py-24">
        <div className="mx-auto max-w-3xl px-4 text-left md:px-8 md:text-center">
          <h2 className="font-display text-4xl font-black uppercase leading-none tracking-tight md:text-6xl">
            Start Here.
            <br />
            Belong Here.
          </h2>
          <p className="mt-4 text-sm text-white/85 md:text-base">
            Studios are booking fast. Reserve yours today, protected by free cancellation if your visa is refused.
          </p>
          <div className="mt-8 flex flex-wrap justify-start gap-3 md:justify-center">
            <Button
              size="lg"
              className="rounded-[16px] bg-black px-7 font-bold uppercase tracking-wide text-white hover:bg-zinc-900"
              onClick={() => openSecure("final_book")}
            >
              Secure Your Studio (£99)
            </Button>
            <Button
              size="lg"
              className="rounded-[16px] bg-white px-7 font-bold uppercase tracking-wide text-black hover:bg-zinc-100"
              onClick={() => openCallback("final_callback")}
            >
              Schedule a Callback
            </Button>
          </div>
        </div>
      </section>

      <Footer />

      <SecureBookingDialog
        open={secureOpen}
        onOpenChange={setSecureOpen}
        landingPageSlug={LANDING_SLUG}
        ctaTrackingKey={ctaKey}
        ctaType="secure_booking"
        ctaSource="international_students"
      />
      <BookViewingDialog
        open={viewingOpen}
        onOpenChange={setViewingOpen}
        landingPageSlug={LANDING_SLUG}
        openSource="landing_hero"
        ctaTrackingKey={ctaKey}
        ctaType="viewing"
      />
      <GetCallbackDialog
        open={callbackOpen}
        onOpenChange={setCallbackOpen}
        landingPageSlug={LANDING_SLUG}
        openSource="landing_hero"
        ctaTrackingKey={ctaKey}
        ctaType="callback"
      />
      <VrTourDialog open={vrOpen} onOpenChange={setVrOpen} />
    </div>
  );
};

export default InternationalStudents;
