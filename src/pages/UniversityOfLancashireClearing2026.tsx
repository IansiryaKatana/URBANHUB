import { useEffect, useState } from "react";
import { FaWhatsapp } from "react-icons/fa";
import {
  ArrowRight,
  ArrowUpRight,
  Dumbbell,
  Glasses,
  Globe2,
  MapPin,
  Plane,
  ShoppingCart,
  Star,
  UserRound,
  Wallet,
  Home,
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
import { useTestimonials } from "@/hooks/useTestimonials";
import { useReviews } from "@/hooks/useReviews";
import { useIntlArrivalSteps } from "@/hooks/useIntlArrivalSteps";
import { useSlotUrl } from "@/hooks/useWebsiteImageSlots";
import { portalStudiosUrl } from "@/config";
import { GetCallbackDialog } from "@/components/leads/GetCallbackDialog";
import { SecureBookingDialog } from "@/components/leads/SecureBookingDialog";
import { ChecklistDownloadDialog } from "@/components/leads/ChecklistDownloadDialog";
import { CountryFlagMarquee } from "@/components/international-students/CountryFlagMarquee";
import { buildWhatsAppUrl } from "@/components/international-students/MorphingStickyCta";
import { VrTourDialog, VR_TOUR_THUMBNAIL_SLOT_KEY } from "@/components/international-students/VrTourDialog";
import { VideoTestimonialCard } from "@/components/international-students/VideoTestimonialCard";
import { ArrivalCoverflow } from "@/components/international-students/ArrivalCoverflow";
import Autoplay from "embla-carousel-autoplay";
import vrThumbnailFallback from "@/assets/international-students/vr.webp";
import ncAccre from "@/assets/nc accre.png";
import ulAccre from "@/assets/UL accree.png";
import anukAccre from "@/assets/anuk accre.png";

const LANDING_SLUG = "/university-of-lancashire-clearing-2026";

const HERO_IMAGE_MOBILE_FALLBACK =
  "https://pzptocwdaqpczexlbajr.supabase.co/storage/v1/object/public/website/media/18b3d9fc-134f-45a2-99bd-5848a073164c.webp";
const HERO_IMAGE_DESKTOP_FALLBACK =
  "https://pzptocwdaqpczexlbajr.supabase.co/storage/v1/object/public/website/media/4a210e79-968c-41df-baa1-f051694b0f74.webp";

const HERO_INTRO =
  "Clearing students book in 24 hours. Private studios from £165/week. All bills included. Just a £99 deposit to secure yours.";

const SILVER_PORTAL_URL = portalStudiosUrl("2026-2027", "silver");

const TRUST_STATS: (
  | { type: "stat"; value: string; label: string }
  | { type: "logo"; src: string; alt: string }
)[] = [
  {
    type: "logo",
    src: anukAccre,
    alt: "Accredited by ANUK Accreditation Network UK",
  },
  { type: "stat", value: "52", label: "Nationalities" },
  { type: "stat", value: "250+", label: "Students booked" },
  {
    type: "logo",
    src: ncAccre,
    alt: "Accredited by National Code assured accommodation",
  },
  {
    type: "logo",
    src: ulAccre,
    alt: "Accredited by University of Lancashire",
  },
];

const WHY_POINTS = [
  {
    q: "Campus distance",
    a: "2 minutes from UCLan",
    body: "Walk to lectures in minutes. No buses, no winter walks across town, you're right on the doorstep of campus.",
    accent: false,
    icon: <MapPin className="h-10 w-10" />,
  },
  {
    q: "Your space",
    a: "Private studios only",
    body: "Your own room, kitchen and bathroom. No flatmates, no shared kitchens, just a home you control from day one.",
    accent: false,
    icon: <Home className="h-10 w-10" />,
  },
  {
    q: "Rent clarity",
    a: "All bills included",
    body: "Electricity, water, heating and Wi-Fi are covered in your rent. No surprise costs landing mid-term.",
    accent: false,
    icon: <Wallet className="h-10 w-10" />,
  },
  {
    q: "On your doorstep",
    a: "Supermarket in your building",
    body: "Grab dinner, snacks or essentials without leaving home. The on-site supermarket stays open until 11 PM.",
    accent: false,
    icon: <ShoppingCart className="h-10 w-10" />,
  },
  {
    q: "Building amenities",
    a: "Gym, cinema, study & rooftop",
    body: "Train in the gym, unwind in the cinema room, focus in study spaces, or take a break on the rooftop terrace, all under one roof.",
    accent: false,
    icon: <Dumbbell className="h-10 w-10" />,
  },
  {
    q: "Ready-made community",
    a: "52 nationalities already here",
    body: "You won't be the only new face. Students from across the world are already living here, community from the moment you arrive.",
    accent: false,
    icon: <Globe2 className="h-10 w-10" />,
  },
  {
    q: "Settling in",
    a: "Welcome Host from day one",
    body: "You'll be assigned a Welcome Host when you arrive, someone for questions, introductions and helping you feel at home fast.",
    accent: false,
    icon: <UserRound className="h-10 w-10" />,
  },
  {
    q: "Getting here",
    a: "Airport pick-up available",
    body: "Flying into Manchester or Liverpool? Arrange pick-up so your first journey to Preston is sorted before you land.",
    accent: true,
    icon: <Plane className="h-10 w-10" />,
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
    q: "What if I don't get my grades?",
    a: "If your Clearing place falls through within 24 hours of booking, we'll refund your £99 deposit in full, no questions asked. You can also transfer your booking to the following academic year.",
  },
  {
    q: "Can I book before my student loan comes through?",
    a: "Yes. We only require a £99 deposit to secure your room. The remaining balance is due before your move-in date, giving you time for your student finance to arrive. We also offer payment plans: pay in 3, 4, or 10 instalments if you need more flexibility.",
  },
  {
    q: "What if I change my mind?",
    a: "You have 72 hours from booking to cancel and receive a full refund. After that, our standard terms apply. Speak to the team for flexibility options.",
  },
  {
    q: "How do I get to Preston from the airport?",
    a: "Manchester Airport to Preston is around 45 minutes by train. Liverpool Airport is roughly 1 hour. We also offer an airport pick-up service. Just let us know your flight details.",
  },
  {
    q: "Can my parents see the room before I book?",
    a: "Absolutely. We offer live virtual tours via WhatsApp or Zoom at short notice on Results Day. Book a slot through our live chat.",
  },
  {
    q: "What do I need to bring?",
    a: "All studios are fully furnished with a bed, desk, chair, wardrobe, and en-suite. You'll need bedding, towels, and personal items. We'll send a full checklist when you book.",
  },
];

const UniversityOfLancashireClearing2026 = () => {
  const { data: testimonialsData, isLoading: testimonialsLoading } =
    useTestimonials("international_students");
  const testimonials = testimonialsData || [];
  const { data: reviewsData, isLoading: reviewsLoading } = useReviews();
  const reviews = reviewsData || [];
  const { data: arrivalStepsData } = useIntlArrivalSteps();
  const arrivalSteps = arrivalStepsData || [];
  const heroImageMobile = useSlotUrl("clearing_2026_hero_mobile", HERO_IMAGE_MOBILE_FALLBACK);
  const heroImageDesktop = useSlotUrl("clearing_2026_hero_desktop", HERO_IMAGE_DESKTOP_FALLBACK);
  const vrThumbnail = useSlotUrl(VR_TOUR_THUMBNAIL_SLOT_KEY, vrThumbnailFallback);

  const [silverSlides, setSilverSlides] = useState<{ id: string; url: string; alt: string }[]>([]);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);

  const [secureOpen, setSecureOpen] = useState(false);
  const [callbackOpen, setCallbackOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [vrOpen, setVrOpen] = useState(false);
  const [showAllWorries, setShowAllWorries] = useState(false);
  const [ctaKey, setCtaKey] = useState<string | undefined>();

  useEffect(() => {
    document.title = "University of Lancashire Clearing 2026 | Urban Hub Preston | Book With Confidence";
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
    const loadSilver = async () => {
      const { data, error } = await supabase
        .from("studio_grades")
        .select(
          `
            id,
            name,
            slug,
            studio_grade_media (
              url,
              position
            )
          `,
        )
        .eq("is_active", true)
        .eq("slug", "silver")
        .maybeSingle();

      if (!mounted) return;
      if (error) {
        console.error("Unable to load Silver studio images:", error);
        setSilverSlides([]);
        return;
      }

      const gallery =
        data?.studio_grade_media
          ?.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
          .map((item, idx) => ({
            id: `${data.id}-${idx}`,
            url: item.url,
            alt: `Silver Studio ${idx + 1}`,
          }))
          .filter((item) => Boolean(item.url)) ?? [];

      setSilverSlides(gallery);
    };
    void loadSilver();
    return () => {
      mounted = false;
    };
  }, []);

  const openSecure = (key?: string) => {
    setCtaKey(key);
    setSecureOpen(true);
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
      <section id="clearing-hero" className="relative min-h-[100dvh] overflow-hidden bg-black text-white">
        <picture>
          <source media="(min-width: 768px)" srcSet={heroImageDesktop} />
          <img
            src={heroImageMobile}
            alt="University of Lancashire Clearing 2026 at Urban Hub"
            className="absolute inset-0 h-full w-full object-cover"
            fetchPriority="high"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/20 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />

        <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-7xl flex-col justify-between px-4 pb-5 pt-24 md:justify-end md:px-8 md:pb-20 md:pt-32">
          <div className="max-w-2xl space-y-3 md:hidden">
            <p className="text-[12px] font-semibold uppercase tracking-[0.28em] text-white/70">
              Just got your Clearing place at UCLan?
            </p>
            <h1 className="font-display text-5xl font-black uppercase leading-[0.92] tracking-wide">
              Your clearing room
              <br />
              is 2 minutes away.
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-white/80">{HERO_INTRO}</p>
          </div>

          <div className="max-w-2xl">
            <div className="hidden md:block">
              <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.28em] text-white/70">
                Just got your Clearing place at UCLan?
              </p>
              <h1 className="font-display text-5xl font-black uppercase leading-[0.92] tracking-wide sm:text-5xl md:text-6xl lg:text-7xl">
                Your clearing room
                <br />
                is 2 minutes away.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-white/80">{HERO_INTRO}</p>
            </div>
            <div className="flex w-full gap-3 md:mt-8 md:w-auto md:flex-wrap">
              <Button
                size="lg"
                className="flex-1 basis-0 rounded-[16px] bg-primary px-4 font-bold uppercase tracking-wide text-white hover:bg-primary/90 md:flex-none md:basis-auto md:px-7"
                onClick={() => openSecure("hero_book")}
              >
                <span className="md:hidden">Secure Studio</span>
                <span className="hidden md:inline">Secure Your Studio (£99)</span>
              </Button>
              <Button
                size="lg"
                className="flex-1 basis-0 rounded-[16px] bg-[#128C7E] px-4 font-bold uppercase tracking-wide text-white hover:bg-[#0E7368] md:flex-none md:basis-auto md:px-7"
                onClick={() =>
                  openWa("Hi Urban Hub, I just got my Clearing place at UCLan and I'd like to message you.")
                }
              >
                <FaWhatsapp className="mr-2 h-5 w-5" />
                Send us a Message
              </Button>
            </div>
          </div>

          {/* VR teaser image, bottom right (desktop only); swap src when image is ready */}
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

      {/* Urgency strip */}
      <section
        className="hidden bg-primary text-white md:block"
        aria-label="Limited Silver studios for Clearing 2026"
      >
        <div className="mx-auto flex max-w-7xl flex-col items-stretch gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-8 md:py-3.5">
          <p className="text-center text-[11px] font-bold uppercase leading-snug tracking-[0.08em] sm:text-left sm:text-xs md:text-sm md:tracking-[0.12em]">
            Limited Silver studios for Clearing 2026, rooms filling fast on Results Day
          </p>
          <Button
            asChild
            size="sm"
            className="shrink-0 rounded-[10px] bg-white px-5 font-bold uppercase tracking-wide text-black hover:bg-zinc-100"
          >
            <a href={SILVER_PORTAL_URL} target="_blank" rel="noopener noreferrer">
              Book Now
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      </section>

      {/* Trust stats */}
      <section className="border-b border-zinc-200 bg-white" aria-label="Urban Hub at a glance">
        <ul className="mx-auto flex max-w-7xl list-none flex-wrap p-0 lg:flex-nowrap">
          {TRUST_STATS.map((item) => (
            <li
              key={item.type === "logo" ? item.alt : item.label}
              className="flex w-1/2 flex-col items-center justify-center px-4 py-6 text-center sm:w-1/3 lg:w-auto lg:flex-1 lg:border-r lg:border-zinc-200 lg:last:border-r-0 md:py-7"
            >
              {item.type === "logo" ? (
                <img
                  src={item.src}
                  alt={item.alt}
                  className="h-12 w-auto max-w-[10rem] object-contain md:h-14 md:max-w-[12rem]"
                />
              ) : (
                <>
                  <p className="font-display text-2xl font-black uppercase leading-none tracking-tight text-primary md:text-3xl">
                    {item.value}
                  </p>
                  <p className="mt-2 max-w-[11rem] text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400 md:text-[11px]">
                    {item.label}
                  </p>
                </>
              )}
            </li>
          ))}
        </ul>
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

      {/* Why / worries, structure matches homepage Why Choose, light bg */}
      <section id="why" className="bg-zinc-50 py-24 md:py-32">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="space-y-8 lg:col-span-5">
              <div className="space-y-4">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">What&apos;s included</p>
                <h2 className="font-display text-4xl font-black uppercase leading-none tracking-tight md:text-6xl">
                  Why Clearing students choose{" "}
                  <span className="text-primary">Urban Hub</span>
                </h2>
                <AnimatedParagraph delay={0.2} className="max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
                  You&apos;ve had enough uncertainty today. Here&apos;s what&apos;s actually guaranteed:
                  the practical reasons Clearing students book with confidence.
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
                    {WHY_POINTS.map((w) => (
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
                  <div className="mt-8 flex items-center justify-center">
                    <div className="inline-flex items-center gap-3 rounded-full border border-zinc-200 bg-white/90 px-3 py-2 shadow-sm backdrop-blur-sm">
                      <CarouselPrevious className="static h-11 w-11 translate-y-0 border-zinc-200 bg-white text-zinc-900 shadow-none hover:bg-zinc-100" />
                      <CarouselNext className="static h-11 w-11 translate-y-0 border-zinc-200 bg-white text-zinc-900 shadow-none hover:bg-zinc-100" />
                    </div>
                  </div>
                </Carousel>
              </div>

              <div className="hidden grid-cols-2 gap-6 lg:grid">
                {(showAllWorries ? WHY_POINTS : WHY_POINTS.slice(0, 4)).map((w, idx) => (
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
          <h2 className="mt-3 max-w-3xl font-display text-4xl font-black uppercase leading-none tracking-tight md:mx-auto md:text-center md:text-6xl [font-weight:900]">
            From your front door at home <span className="text-primary">to your first night in Preston</span>
          </h2>
          <p className="mt-4 max-w-2xl text-sm text-muted-foreground md:mx-auto md:text-center md:text-base">
            The scariest part of moving abroad is the unknown. So we&apos;ve mapped the whole journey: exactly what
            happens, and who&apos;s with you at every step.
          </p>

          {arrivalSteps.length > 0 ? (
            <div className="mt-10">
              <ArrivalCoverflow steps={arrivalSteps} />
            </div>
          ) : null}

          <div className="mt-8 flex flex-col items-start justify-center gap-3 sm:flex-row sm:items-center md:justify-center">
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

      {/* Studio band, Silver images + payment options */}
      <section id="rooms" className="grid lg:h-screen lg:grid-cols-2">
        <div className="relative min-h-[320px] overflow-hidden lg:min-h-0 lg:h-full">
          {silverSlides.length > 0 ? (
            <Carousel
              opts={{ loop: true }}
              plugins={
                silverSlides.length > 1
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
                {silverSlides.map((slide) => (
                  <CarouselItem key={slide.id} className="relative h-full min-h-[320px] flex-[0_0_100%] pl-0 lg:min-h-full">
                    <img
                      src={slide.url}
                      alt={slide.alt}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
              {silverSlides.length > 1 ? (
                <CarouselDots className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2" />
              ) : null}
            </Carousel>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-200 text-sm uppercase tracking-[0.25em] text-muted-foreground">
              Silver Studio
            </div>
          )}
        </div>
        <div className="flex flex-col justify-center bg-zinc-50 px-6 py-16 md:px-12 md:py-20 lg:h-full lg:px-16 lg:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">
            Limited rooms, filling fast
          </p>
          <h2 className="mt-3 font-display text-4xl font-black uppercase leading-none tracking-tight md:text-6xl">
            Silver studios, all bills included
          </h2>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground md:text-base">
            <p>
              The Urban Hub Clearing Promise is a guarantee, not a gamble. If UCLan confirms your place through Clearing,
              we guarantee a studio at Urban Hub, no waiting list, no uncertainty.
            </p>
            <p>
              And if for any reason we can&apos;t fulfil your booking, your £99 deposit is refunded in full within 24 hours.
              No questions asked.
            </p>
            <p>
              Results Day move-ins are available too. If your room is ready, you can collect your keys and be settled
              before the evening.
            </p>
          </div>

          <div className="mt-8">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">Payment options</p>
            <h3 className="mt-2 font-display text-2xl font-black uppercase tracking-wide md:text-3xl">
              Choose how you pay
            </h3>
            <ul className="mt-4 divide-y divide-zinc-200 border-y border-zinc-200">
              {PLANS.map((p) => (
                <li key={p.name} className="flex items-center justify-between gap-3 py-3">
                  <p className="font-display text-base font-black uppercase tracking-wide">{p.name}</p>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                      p.green
                        ? "bg-emerald-500/15 text-emerald-700"
                        : "bg-zinc-200/80 text-zinc-600"
                    }`}
                  >
                    {p.tag}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8">
            <Button
              className="rounded-[16px] bg-primary px-7 font-bold uppercase tracking-wide text-white hover:bg-primary/90"
              onClick={() => openSecure("studio_band_book")}
            >
              Secure Your Studio (£99)
            </Button>
          </div>
        </div>
      </section>

      {/* Nations marquee */}
      <section id="community" className="bg-zinc-50 pt-28 pb-20 md:pt-36 md:pb-24">
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

          {reviewsLoading ? (
            <div className="mt-12 py-8 text-center text-sm text-muted-foreground">Loading reviews…</div>
          ) : reviews.length > 0 ? (
            <Carousel
              opts={{
                align: "start",
                loop: reviews.length > 1,
              }}
              plugins={
                reviews.length > 1
                  ? [
                      Autoplay({
                        delay: 4500,
                        stopOnInteraction: false,
                        stopOnMouseEnter: true,
                      }),
                    ]
                  : undefined
              }
              className="mt-12 w-full"
            >
              <CarouselContent className="-ml-4 md:-ml-5">
                {reviews.map((review) => (
                  <CarouselItem
                    key={review.id}
                    className="pl-4 basis-[85%] sm:basis-1/2 lg:basis-1/3 md:pl-5"
                  >
                    <article className="flex h-full min-h-[280px] flex-col rounded-[24px] bg-zinc-100/90 px-6 py-7 md:px-7 md:py-8">
                      <div className="flex gap-1" aria-label={`${review.rating} out of 5 stars`}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating
                                ? "fill-accent-yellow text-accent-yellow"
                                : "text-zinc-300"
                            }`}
                            aria-hidden
                          />
                        ))}
                      </div>
                      <p className="mt-5 flex-1 text-base leading-relaxed text-zinc-700 line-clamp-6 md:text-[17px]">
                        &ldquo;{review.content}&rdquo;
                      </p>
                      <div className="mt-6 border-t border-zinc-200/90 pt-5">
                        <p className="text-sm font-bold uppercase tracking-wide text-zinc-900">
                          {review.reviewer_name}
                        </p>
                        {review.title ? (
                          <p className="mt-1 text-sm text-muted-foreground">{review.title}</p>
                        ) : null}
                      </div>
                    </article>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {reviews.length > 1 ? (
                <CarouselDots className="mt-8 gap-2 [&_button]:h-1.5" />
              ) : null}
            </Carousel>
          ) : null}
        </div>
      </section>

      {/* Testimonials, dedicated intl-page set, carousel on all breakpoints */}
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
              The questions
              <br />
              you&apos;re afraid to ask,
              <br />
              Answered honestly.
            </h2>
            <p className="mt-4 text-sm text-muted-foreground md:text-base">
              We have heard every question. The ones about money. The ones about safety. The ones about whether you will
              fit in.
            </p>
            <Button
              className="mt-6 rounded-[16px] bg-accent-yellow px-7 font-bold uppercase tracking-wide text-black hover:bg-accent-yellow/90"
              onClick={() => {
                setCtaKey("faq_checklist");
                setChecklistOpen(true);
              }}
            >
              Get My Free Checklist
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
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section id="clearing-final-cta" className="bg-primary py-20 text-white md:py-24">
        <div className="mx-auto max-w-3xl px-4 text-left md:px-8 md:text-center">
          <h2 className="font-display text-4xl font-black uppercase leading-none tracking-tight md:text-6xl">
            Your UCLan place is confirmed.
            <br />
            Your room should be too.
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
        ctaSource="uclan_clearing_2026"
      />
      <GetCallbackDialog
        open={callbackOpen}
        onOpenChange={setCallbackOpen}
        landingPageSlug={LANDING_SLUG}
        openSource="uclan_clearing_2026"
        ctaTrackingKey={ctaKey}
        ctaType="callback"
      />
      <ChecklistDownloadDialog
        open={checklistOpen}
        onOpenChange={setChecklistOpen}
        landingPageSlug={LANDING_SLUG}
        openSource="uclan_clearing_2026"
        ctaTrackingKey={ctaKey}
        ctaType="checklist_download"
      />
      <VrTourDialog open={vrOpen} onOpenChange={setVrOpen} />
    </div>
  );
};

export default UniversityOfLancashireClearing2026;
