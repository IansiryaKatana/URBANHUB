import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselDots,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { AnimatedHeading, AnimatedParagraph, AnimatedText, AnimatedCard } from "@/components/animations/AnimatedText";
import TypingTitle from "@/components/TypingTitle";
import { useWebsiteAmenities } from "@/hooks/useWebsiteAmenities";
import { useWhyUsCards } from "@/hooks/useWhyUsCards";
import { useTestimonials } from "@/hooks/useTestimonials";
import FindUsMap from "@/components/FindUsMap";
import Noise from "@/components/Noise";
import { BookViewingDialog } from "@/components/leads/BookViewingDialog";
import { GetCallbackDialog } from "@/components/leads/GetCallbackDialog";
import { CreatorFormDialog } from "@/components/leads/CreatorFormDialog";
import { ReferFriendDialog } from "@/components/leads/ReferFriendDialog";
import { SecureBookingDialog } from "@/components/leads/SecureBookingDialog";
import { useAllStudioAvailability, getAvailabilityTag, isFullyBooked } from "@/hooks/useStudioAvailability";
import { portalStudiosUrl } from "@/config";
import type { Database } from "@/integrations/supabase/types";
import { Play, Volume2, VolumeX, ArrowUpRight } from "lucide-react";

type AcademicYearRow = Database["public"]["Tables"]["academic_years"]["Row"];

type LandingPageRecord = {
  id: string;
  name: string;
  slug: string;
  hero_heading: string | null;
  hero_subheading: string | null;
  default_cta_label: string | null;
  default_cta_type: "viewing" | "callback" | "refer_friend" | "content_creator" | "secure_booking";
  default_cta_tracking_key: string | null;
  room_grades_heading: string | null;
  room_grades_description: string | null;
};

type HeroSlideRecord = {
  id: string;
  title: string;
  subtitle: string | null;
  subtitle_link_url: string | null;
  cta_label: string | null;
  cta_type: "viewing" | "callback" | "refer_friend" | "content_creator" | "secure_booking";
  cta_tracking_key: string | null;
  desktop_image_url: string | null;
  desktop_image_alt: string | null;
  mobile_image_url: string | null;
  mobile_image_alt: string | null;
  h1_image_url: string | null;
  h1_image_alt: string | null;
  h1_image_scale: number | null;
  h1_image_scale_mobile: number | null;
  sort_order: number;
};

type StudioGradeSummary = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  gallery: { url: string }[];
  weeklyPrice: number | null;
};

type GradePricesBySlug = Record<string, { price45: number; price51: number }>;

const TestimonialCard = ({ testimonial }: { testimonial: any }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isMobile = useIsMobile();

  const videoUrl = testimonial.video_url || testimonial.videoUrl;
  const isYouTube = videoUrl?.includes("youtube.com") || videoUrl?.includes("youtu.be");
  const isVimeo = videoUrl?.includes("vimeo.com");

  const getEmbedUrl = () => {
    if (isYouTube) {
      const youtubeId = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
      if (youtubeId) {
        return `https://www.youtube.com/embed/${youtubeId}?autoplay=${isPlaying ? 1 : 0}&mute=${
          isMuted ? 1 : 0
        }&loop=1&playlist=${youtubeId}&controls=0&modestbranding=1&rel=0`;
      }
    }
    if (isVimeo) {
      const vimeoId = videoUrl.match(/vimeo\.com\/(\d+)/)?.[1];
      if (vimeoId) {
        return `https://player.vimeo.com/video/${vimeoId}?autoplay=${isPlaying ? 1 : 0}&muted=${
          isMuted ? 1 : 0
        }&loop=1&controls=0&background=1`;
      }
    }
    return null;
  };

  const embedUrl = getEmbedUrl();

  const handlePlay = () => {
    if (embedUrl) {
      setIsPlaying(true);
    } else if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handlePause = () => {
    if (embedUrl) {
      setIsPlaying(false);
    } else if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying) handlePause();
    else handlePlay();
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (embedUrl) {
      setIsMuted(!isMuted);
      setIsPlaying(false);
      setTimeout(() => setIsPlaying(true), 100);
    } else if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  return (
    <div
      className="relative overflow-hidden rounded-[32px] h-[550px] group bg-black shadow-2xl"
      onMouseEnter={() => !isMobile && handlePlay()}
      onMouseLeave={() => !isMobile && handlePause()}
      onClick={() => isMobile && togglePlay({ stopPropagation: () => {} } as any)}
    >
      {embedUrl ? (
        <div className="absolute inset-0 w-full h-full overflow-hidden">
          <iframe
            src={embedUrl}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            allow="autoplay; encrypted-media"
            allowFullScreen
            style={{
              pointerEvents: "none",
              width: "177.77777778vh",
              height: "56.25vw",
              minWidth: "100%",
              minHeight: "100%",
              border: "none",
            }}
          />
        </div>
      ) : (
        <video
          ref={videoRef}
          src={videoUrl}
          poster={testimonial.cover_image_url || testimonial.thumbnail}
          loop
          muted={isMuted}
          playsInline
          className={`h-full w-full object-cover transition-all duration-700 ${
            isPlaying ? "grayscale-0" : "grayscale"
          }`}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />

      <div
        className={`absolute inset-0 flex items-center justify-center z-20 transition-opacity duration-300 ${
          isPlaying ? "opacity-0" : "opacity-100"
        }`}
      >
        <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
          <Play className="h-6 w-6 text-white fill-white" />
        </div>
      </div>

      {isPlaying && (
        <button
          onClick={toggleMute}
          className="absolute top-6 right-6 z-30 h-10 w-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/10 hover:bg-black/60 transition-all"
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      )}

      <div className="absolute bottom-10 left-10 right-10 z-20 space-y-1">
        <p className="text-white font-display text-2xl font-black uppercase tracking-wide">
          {testimonial.name}
        </p>
        <p className="text-white/70 text-sm font-medium">{testimonial.result}</p>
      </div>
    </div>
  );
};

const LandingPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const isMobile = useIsMobile();
  const [landing, setLanding] = useState<LandingPageRecord | null>(null);
  const [slides, setSlides] = useState<HeroSlideRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [viewingDialogOpen, setViewingDialogOpen] = useState(false);
  const [callbackDialogOpen, setCallbackDialogOpen] = useState(false);
  const [referFriendDialogOpen, setReferFriendDialogOpen] = useState(false);
  const [creatorDialogOpen, setCreatorDialogOpen] = useState(false);
  const [secureBookingDialogOpen, setSecureBookingDialogOpen] = useState(false);

  const [academicYears, setAcademicYears] = useState<AcademicYearRow[]>([]);
  const [selectedYear, setSelectedYear] = useState<AcademicYearRow | null>(null);
  const [grades, setGrades] = useState<StudioGradeSummary[]>([]);
  const [gradePricesBySlug, setGradePricesBySlug] = useState<GradePricesBySlug>({});
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const { data: amenitiesData } = useWebsiteAmenities();
  const { data: whyUsData } = useWhyUsCards();
  const { data: testimonialsData, isLoading: testimonialsLoading } = useTestimonials();

  const { data: availabilityData, isLoading: availabilityLoading } = useAllStudioAvailability(
    selectedYear?.id || undefined,
  );

  useEffect(() => {
    const loadLanding = async () => {
      if (!slug) return;
      setLoading(true);
      setNotFound(false);
      const { data, error } = await supabase
        .from("website_landing_pages")
        .select(
          "id, name, slug, hero_heading, hero_subheading, default_cta_label, default_cta_type, default_cta_tracking_key, room_grades_heading, room_grades_description",
        )
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setLanding({
        id: data.id,
        name: data.name,
        slug: data.slug,
        hero_heading: data.hero_heading,
        hero_subheading: data.hero_subheading,
        default_cta_label: data.default_cta_label,
        default_cta_type: data.default_cta_type,
        default_cta_tracking_key: data.default_cta_tracking_key,
        room_grades_heading: data.room_grades_heading,
        room_grades_description: data.room_grades_description,
      });

      const { data: slideRows, error: slidesError } = await supabase
        .from("website_landing_hero_slides")
        .select(
          "id, title, subtitle, subtitle_link_url, cta_label, cta_type, cta_tracking_key, desktop_image_url, desktop_image_alt, mobile_image_url, mobile_image_alt, h1_image_url, h1_image_alt, h1_image_scale, h1_image_scale_mobile, sort_order",
        )
        .eq("landing_page_id", data.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (!slidesError && slideRows) {
        setSlides(slideRows as HeroSlideRecord[]);
      } else {
        setSlides([]);
      }
      setLoading(false);
    };

    void loadLanding();
  }, [slug]);

  useEffect(() => {
    // Load academic years for room grades section
    const loadAcademicYears = async () => {
      const { data, error } = await supabase
        .from("academic_years")
        .select("*")
        .eq("is_active", true)
        .order("start_date", { ascending: false });
      if (error) {
        console.error("Unable to load academic years for landing:", error);
        return;
      }
      const years = (data || []) as AcademicYearRow[];
      setAcademicYears(years);
      if (years.length > 0) {
        setSelectedYear(years[0]);
      }
    };

    void loadAcademicYears();
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
        console.error("Unable to load studio grades for landing:", error);
        setCatalogError("We couldn't load the studio catalogue just now. Please try again shortly.");
        setGrades([]);
        setCatalogLoading(false);
        return;
      }

      const priceMap: GradePricesBySlug = {};
      const summaries =
        data?.map((grade: any) => {
          const gallery =
            grade.studio_grade_media
              ?.sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
              .map((item: any) => ({ url: item.url }))
              .filter((item: any) => Boolean(item.url)) ?? [];

          const sortedPrices =
            grade.studio_grade_prices
              ?.filter((price: any) => typeof price.weekly_price === "number")
              .sort(
                (a: any, b: any) =>
                  (a.weekly_price ?? Number.POSITIVE_INFINITY) -
                  (b.weekly_price ?? Number.POSITIVE_INFINITY),
              ) ?? [];
          const primaryPrice = sortedPrices[0];
          const price51 = primaryPrice?.weekly_price ?? 0;
          const price45 = sortedPrices[1]?.weekly_price ?? price51;
          if (grade.slug && (price45 > 0 || price51 > 0)) {
            priceMap[grade.slug] = { price45, price51 };
          }

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
      setGradePricesBySlug(priceMap);
      setCatalogError(null);
      setCatalogLoading(false);
    };

    void loadGrades();

    return () => {
      mounted = false;
    };
  }, [selectedYear]);

  const companyName = "Urban Hub";
  const testimonials = testimonialsData || [];
  const [showAllFeatures, setShowAllFeatures] = useState(false);

  const heroSlides = useMemo(() => {
    if (!slides.length && landing) {
      return [
        {
          id: landing.id,
          title: landing.hero_heading || landing.name,
          subtitle: landing.hero_subheading,
          cta_label:
            landing.default_cta_label ||
            (landing.default_cta_type === "callback" ? "Get a callback" : "Book a viewing"),
          cta_type: landing.default_cta_type,
          cta_tracking_key: landing.default_cta_tracking_key,
          desktop_image_url: null,
          desktop_image_alt: null,
          mobile_image_url: null,
          mobile_image_alt: null,
          sort_order: 0,
        } as HeroSlideRecord,
      ];
    }
    return slides;
  }, [slides, landing]);

  const handleHeroCta = (
    ctaType: "viewing" | "callback" | "refer_friend" | "content_creator" | "secure_booking"
  ) => {
    if (ctaType === "callback") {
      setCallbackDialogOpen(true);
    } else if (ctaType === "refer_friend") {
      setReferFriendDialogOpen(true);
    } else if (ctaType === "content_creator") {
      setCreatorDialogOpen(true);
    } else if (ctaType === "secure_booking") {
      setSecureBookingDialogOpen(true);
    } else {
      setViewingDialogOpen(true);
    }
  };

  const formatYearForDisplay = (yearName: string) => yearName;

  const formatYearForHero = (yearName: string) => {
    return yearName.replace(/\d{2}(\d{2})\/\d{2}(\d{2})/, "$1/$2");
  };

  const pricingPlansWithAvailability = useMemo(() => {
    return grades.map((grade) => {
      const avail = availabilityData?.find((a) => a.studio_grade_slug === grade.slug) ?? null;
      const isBookable = avail ? avail.available_count > 0 : true;
      const prices = gradePricesBySlug[grade.slug];
      return {
        ...grade,
        price45: prices ? prices.price45 : grade.weeklyPrice ?? 0,
        price51: prices ? prices.price51 : grade.weeklyPrice ?? 0,
        isBookable,
        availability: avail
          ? { available_count: avail.available_count, total_capacity: avail.total_capacity }
          : null,
      };
    });
  }, [grades, availabilityData, gradePricesBySlug]);

  if (loading) {
    return null;
  }

  if (notFound || !landing) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 pt-32 pb-16 max-w-4xl">
          <h1 className="text-3xl md:text-4xl font-display font-black uppercase tracking-wide mb-4">
            Landing page not found
          </h1>
          <p className="text-muted-foreground">
            This campaign landing page is no longer available.
          </p>
        </main>
        <footer className="bg-black text-white py-6 mt-8">
          <div className="container mx-auto px-4 text-center text-sm">
            © 2026 Urban Hub Student Accommodation Preston. All rights reserved.
            <span className="mx-2">|</span>
            <a href="/privacy" className="text-white/80 hover:text-white transition-colors">
              Privacy Policy
            </a>
            <span className="mx-2">|</span>
            <a href="/terms" className="text-white/80 hover:text-white transition-colors">
              Terms &amp; Conditions
            </a>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero */}
      <section
        id="hero"
        aria-label="Landing page hero carousel"
        className="studios-hero-section relative overflow-hidden h-[100dvh] min-h-[280px] md:h-[100vh]"
      >
        <Carousel
          opts={{ loop: true }}
          className="w-full h-full"
          plugins={[
            Autoplay({
              delay: 5000,
              stopOnInteraction: false,
              stopOnMouseEnter: true,
            }),
          ]}
        >
          <CarouselContent className="-ml-0 h-full">
            {heroSlides.map((slide) => {
              const bg =
                (isMobile ? slide.mobile_image_url : slide.desktop_image_url) ||
                slide.desktop_image_url ||
                slide.mobile_image_url ||
                "";
              return (
                <CarouselItem key={slide.id} className="pl-0 h-full flex-[0_0_100%]">
                  <div
                    className="relative flex items-start md:items-center justify-center h-full pt-28 md:pt-0"
                    style={{
                      height: "100%",
                      backgroundImage: bg
                        ? `linear-gradient(180deg, rgba(5, 6, 9, 0.7) 0%, rgba(5, 6, 9, 0.35) 65%, rgba(5, 6, 9, 0.7) 100%), url('${bg}')`
                        : "linear-gradient(180deg, rgba(5, 6, 9, 0.9) 0%, rgba(5, 6, 9, 0.9) 100%)",
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  >
                    <div className="container mx-auto px-4 text-white py-10 md:py-24 h-full overflow-y-auto min-h-0 flex flex-col items-center justify-start md:justify-center">
                      <div className="max-w-3xl text-center space-y-6">
                        <AnimatedText delay={0.1}>
                          <p className="text-[11px] uppercase tracking-[0.5em] text-white/70 font-normal">
                            URBAN HUB STUDENT
                            <br className="md:hidden" />
                            <span className="hidden md:inline"> </span>
                            ACCOMMODATION PRESTON
                          </p>
                        </AnimatedText>
                        <AnimatedHeading
                          delay={0.2}
                          className="text-4xl md:text-5xl lg:text-6xl font-display font-black uppercase leading-tight"
                        >
                          <span className={slide.h1_image_url ? "sr-only" : ""}>
                            {slide === heroSlides[0] && landing.hero_heading
                              ? landing.hero_heading
                              : slide.title}
                          </span>
                        </AnimatedHeading>
                        {slide.h1_image_url && (
                          <div className="flex justify-center">
                            <img
                              src={slide.h1_image_url}
                              alt={slide.h1_image_alt || slide.title}
                              className="max-w-full h-auto"
                              style={{
                                transform: `scale(${
                                  isMobile
                                    ? slide.h1_image_scale_mobile ?? slide.h1_image_scale ?? 1
                                    : slide.h1_image_scale ?? 1
                                })`,
                                transformOrigin: "center",
                              }}
                            />
                          </div>
                        )}
                        {slide.subtitle && (
                          <AnimatedParagraph
                            delay={0.3}
                            className="text-sm md:text-lg text-white/80 max-w-2xl mx-auto"
                          >
                            {slide.subtitle_link_url ? (
                              <a
                                href={slide.subtitle_link_url}
                                className="underline hover:text-white"
                              >
                                {slide.subtitle}
                              </a>
                            ) : (
                              slide.subtitle
                            )}
                          </AnimatedParagraph>
                        )}
                        <AnimatedText delay={0.4}>
                          <Button
                            onClick={() => handleHeroCta(slide.cta_type || landing.default_cta_type)}
                            className="rounded-full bg-[#ff2020] hover:bg-[#ff4040] px-8 py-3 text-sm font-semibold uppercase tracking-[0.35em]"
                            data-analytics={slide.cta_tracking_key || landing.default_cta_tracking_key || "landing-hero-cta"}
                          >
                            {slide.cta_label ||
                              landing.default_cta_label ||
                              (slide.cta_type === "callback"
                                ? "Get a callback"
                                : slide.cta_type === "refer_friend"
                                ? "Refer a friend"
                                : slide.cta_type === "content_creator"
                                ? "Apply as content creator"
                                : slide.cta_type === "secure_booking"
                                ? "Secure your booking"
                                : "Book a viewing")}
                          </Button>
                        </AnimatedText>
                      </div>
                    </div>
                    <div className="absolute inset-x-0 bottom-6 z-10 flex justify-center px-4">
                      <div className="pointer-events-auto rounded-full bg-black/35 backdrop-blur-md px-4 py-2">
                        <CarouselDots />
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>
      </section>

      {/* Room grades section */}
      <main className="container mx-auto px-4 pt-8 pb-12 md:pt-16 md:pb-20 max-w-6xl space-y-12">
        {academicYears.length > 0 && selectedYear && (
          <div className="flex justify-center mb-6">
            <div className="w-auto">
              <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground text-center mb-3">
                Academic year
              </p>
              <div className="inline-flex h-12 items-center justify-center rounded-full bg-primary/60 p-1.5 gap-1.5 md:gap-2 shadow-sm">
                {academicYears.map((ay) => (
                  <button
                    key={ay.id}
                    type="button"
                    onClick={() => setSelectedYear(ay)}
                    className={`rounded-full uppercase tracking-wide text-xs md:text-sm font-semibold px-4 md:px-6 py-2 md:py-2.5 flex-shrink-0 transition-all ${
                      selectedYear.id === ay.id
                        ? "bg-primary text-white shadow-md"
                        : "bg-transparent text-white/90 hover:bg-primary/40"
                    }`}
                  >
                    {formatYearForDisplay(ay.name)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <header id="grades" className="space-y-3 md:space-y-4 text-center">
          <AnimatedText delay={0.1}>
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">
              Discover {companyName}
            </p>
          </AnimatedText>
          <TypingTitle
            as="h2"
            text={landing.room_grades_heading || "5 Room Grades to Choose From"}
            className="text-4xl md:text-5xl font-display font-black uppercase tracking-wide"
            typingSpeed={32}
          />
          <AnimatedParagraph
            delay={0.3}
            className="max-w-3xl mx-auto text-muted-foreground text-sm md:text-base"
          >
            {landing.room_grades_description ||
              `Explore our available studio grades and jump straight into the space that suits you. Each option links to a detailed overview with galleries, contracts, and amenities.`}
          </AnimatedParagraph>
        </header>

        {catalogError ? (
          <div className="rounded-3xl border border-destructive/40 bg-destructive/10 px-6 py-8 text-center text-destructive">
            <p className="text-lg font-semibold uppercase tracking-wide">Studio catalogue unavailable</p>
            <p className="mt-3">{catalogError}</p>
          </div>
        ) : catalogLoading || !selectedYear ? (
          <div className="rounded-3xl border border-dashed px-6 py-8 text-center">
            <p className="text-lg font-semibold uppercase tracking-wide">Loading studio catalogue…</p>
          </div>
        ) : grades.length === 0 ? (
          <div className="rounded-3xl border border-dashed px-6 py-8 text-center">
            <p className="text-lg font-semibold uppercase tracking-wide">Studios coming soon</p>
            <p className="mt-3 text-muted-foreground">
              We're preparing the new catalogue for {selectedYear.name}. Check back shortly for the latest availability.
            </p>
          </div>
        ) : (
          <section className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {pricingPlansWithAvailability.map((plan, idx) => {
              const availabilityTag = availabilityLoading
                ? null
                : getAvailabilityTag(
                    availabilityData?.find((avail) => avail.studio_grade_id === plan.id) || null,
                  );
              const fullyBooked = availabilityLoading
                ? false
                : isFullyBooked(availabilityData?.find((avail) => avail.studio_grade_id === plan.id) || null);

              return (
                <AnimatedCard key={plan.id} delay={0.1} index={idx}>
                  <article className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-border/40 bg-background shadow-[0_18px_40px_rgba(0,0,0,0.08)] transition-transform duration-200 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(0,0,0,0.12)]">
                    <div className="relative h-48 w-full overflow-hidden bg-muted/30 group/carousel">
                      {plan.gallery.length ? (
                        <Carousel className="h-full w-full">
                          <CarouselContent className="-ml-0">
                            {plan.gallery.map((image, gIdx) => (
                              <CarouselItem key={`${plan.id}-${gIdx}`} className="pl-0">
                                <img
                                  src={image.url}
                                  alt={`${plan.name} ${gIdx + 1}`}
                                  className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  loading="lazy"
                                />
                              </CarouselItem>
                            ))}
                          </CarouselContent>
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
                        <h2 className="text-2xl md:text-3xl font-display font-black uppercase tracking-wide text-foreground underline decoration-[6px] decoration-accent-yellow underline-offset-4">
                          {plan.name} STUDIO
                        </h2>
                        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                          {plan.short_description ??
                            "Discover this studio grade, explore availability, and compare contract options tailored for you."}
                        </p>
                        {plan.availability && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {plan.availability.available_count} of {plan.availability.total_capacity} studios
                            available for {formatYearForDisplay(selectedYear.name)}
                          </p>
                        )}
                      </div>
                      <div className="mt-auto flex items-center justify-between gap-4">
                        {fullyBooked ? (
                          <Button
                            disabled
                            className="rounded-full bg-gray-400 px-6 py-2 text-sm font-semibold uppercase tracking-[0.25em] text-white cursor-not-allowed"
                          >
                            Fully Booked
                          </Button>
                        ) : (
                          <Button
                            asChild
                            className="rounded-[16px] bg-accent-yellow px-6 py-2 text-sm font-bold uppercase tracking-normal text-black shadow-[0_12px_24px_rgba(255,204,0,0.35)] hover:bg-[#ff2020] hover:text-white transition-colors"
                          >
                            <a
                              href={portalStudiosUrl(
                                selectedYear.name.replace(/\//g, "-"),
                                plan.slug,
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              data-analytics="landing-grade-book-now"
                            >
                              Book Now
                            </a>
                          </Button>
                        )}
                        <div className="text-right">
                          <p className="text-xl font-black uppercase tracking-wide text-foreground">
                            {typeof plan.weeklyPrice === "number"
                              ? `£${plan.weeklyPrice.toLocaleString("en-GB")}`
                              : "£—"}
                          </p>
                          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-muted-foreground">
                            Per wk
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                </AnimatedCard>
              );
            })}
          </section>
        )}
      </main>

      {/* Why Choose section */}
      <section id="why" className="bg-black py-24 md:py-32">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
            <div className="lg:col-span-5 space-y-8">
              <div className="space-y-4">
                <h2 className="text-4xl md:text-6xl font-display font-black uppercase text-white leading-none tracking-tight">
                  <TypingTitle
                    as="span"
                    text="Why Choose"
                    className="text-4xl md:text-6xl font-display font-black uppercase text-white leading-none tracking-tight"
                    typingSpeed={30}
                  />
                  <br />
                  <span className="text-[#ff2020]">{companyName}?</span>
                </h2>
                <AnimatedParagraph
                  delay={0.2}
                  className="text-white/60 text-base md:text-lg max-w-md leading-relaxed"
                >
                  More than just a place to stay. Discover the unique features and premium amenities that make Urban Hub the
                  ultimate student living experience in Preston.
                </AnimatedParagraph>
              </div>

              <div className="hidden lg:block">
                <Button
                  onClick={() => setShowAllFeatures(!showAllFeatures)}
                  className="rounded-full bg-white/10 hover:bg-white/20 text-white px-10 py-6 text-sm font-semibold uppercase tracking-normal border-none ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all"
                >
                  {showAllFeatures ? "See Less" : "Load More"} <ArrowUpRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="lg:col-span-7">
              {/* Mobile Carousel */}
              <div className="lg:hidden">
                <Carousel className="w-full">
                  <CarouselContent className="-ml-4">
                    {(whyUsData || []).map((feature, idx) => (
                      <CarouselItem key={idx} className="pl-4 basis-full sm:basis-1/2">
                        <div className="bg-[#111] border border-white/5 p-8 rounded-[32px] space-y-6 h-full">
                          <div className="text-white">
                            {feature.icon_url ? (
                              <img
                                src={feature.icon_url}
                                alt={`${feature.title} icon`}
                                className="h-10 w-10 object-contain"
                              />
                            ) : null}
                          </div>
                          <div className="space-y-3">
                            <h3 className="text-xl md:text-2xl font-display font-black uppercase text-white leading-tight">
                              {feature.title}
                            </h3>
                            <p className="text-white/50 text-sm leading-relaxed">{feature.description}</p>
                          </div>
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              </div>

              {/* Desktop Grid */}
              <div className="hidden lg:grid grid-cols-2 gap-6">
                {(showAllFeatures ? whyUsData || [] : (whyUsData || []).slice(0, 4)).map((feature, idx) => (
                  <AnimatedCard
                    key={feature.id}
                    delay={0.3 + idx * 0.1}
                    index={idx}
                    className="bg-[#111] border border-white/5 p-8 rounded-[32px] space-y-6 group hover:bg-[#1a1a1a] transition-all duration-300"
                  >
                    <div className="text-white group-hover:scale-110 group-hover:text-[#ff2020] transition-all duration-300">
                      {feature.icon_url ? (
                        <img
                          src={feature.icon_url}
                          alt={`${feature.title} icon`}
                          className="h-10 w-10 object-contain"
                        />
                      ) : null}
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-xl md:text-2xl font-display font-black uppercase text-white leading-tight">
                        {feature.title}
                      </h3>
                      <p className="text-white/50 text-sm leading-relaxed">{feature.description}</p>
                    </div>
                  </AnimatedCard>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="results" className="bg-white py-24 md:py-32">
        <div className="container mx-auto px-4">
          <header className="text-center max-w-3xl mx-auto mb-20 space-y-6">
            <h2 className="text-4xl md:text-6xl font-display font-black uppercase tracking-tight leading-none text-black">
              <TypingTitle
                as="span"
                text="Real People,"
                className="text-4xl md:text-6xl font-display font-black uppercase tracking-tight leading-none text-black"
                typingSpeed={30}
              />{" "}
              <span className="font-display font-normal text-[#ff2020]">Real Results.</span>
            </h2>
            <AnimatedParagraph
              delay={0.2}
              className="text-black/60 text-base md:text-lg leading-relaxed"
            >
              Join thousands of students who have upgraded their lifestyle <br />
              and found their perfect home at {companyName}.
            </AnimatedParagraph>
          </header>

          {testimonialsLoading ? (
            <div className="flex justify-center py-12">
              <div className="text-muted-foreground">Loading testimonials...</div>
            </div>
          ) : testimonials.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No testimonials available at this time.
            </div>
          ) : (
            <>
              <div className="md:hidden">
                <Carousel className="w-full max-w-sm mx-auto">
                  <CarouselContent>
                    {testimonials.map((t) => (
                      <CarouselItem key={t.id}>
                        <TestimonialCard testimonial={t} />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              </div>

              <div className="hidden md:grid grid-cols-3 gap-8">
                {testimonials.map((t, index) => (
                  <AnimatedCard key={t.id} delay={0.3} index={index}>
                    <TestimonialCard testimonial={t} />
                  </AnimatedCard>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Find us */}
      <section id="find-us">
        <FindUsMap />
      </section>

      {/* Simple footer for landing pages */}
      <footer className="bg-black text-white py-6">
        <Noise patternAlpha={10} />
        <div className="container mx-auto px-4 text-center text-sm relative z-10">
          © 2026 Urban Hub Student Accommodation Preston. All rights reserved.
          <span className="mx-2">|</span>
          <a href="/privacy" className="text-white/80 hover:text-white transition-colors">
            Privacy Policy
          </a>
          <span className="mx-2">|</span>
          <a href="/terms" className="text-white/80 hover:text-white transition-colors">
            Terms &amp; Conditions
          </a>
        </div>
      </footer>

      {/* CTA dialogs with landing-page-aware tracking */}
      <GetCallbackDialog
        open={callbackDialogOpen}
        onOpenChange={setCallbackDialogOpen}
        landingPageSlug={`/landing/${landing.slug}`}
        openSource="landing_hero"
      />
      <BookViewingDialog
        open={viewingDialogOpen}
        onOpenChange={setViewingDialogOpen}
        landingPageSlug={`/landing/${landing.slug}`}
        openSource="landing_hero"
      />
      <ReferFriendDialog
        open={referFriendDialogOpen}
        onOpenChange={setReferFriendDialogOpen}
        landingPageSlug={`/landing/${landing.slug}`}
      />
      <CreatorFormDialog
        open={creatorDialogOpen}
        onOpenChange={setCreatorDialogOpen}
        landingPageSlug={`/landing/${landing.slug}`}
      />
      <SecureBookingDialog
        open={secureBookingDialogOpen}
        onOpenChange={setSecureBookingDialogOpen}
        landingPageSlug={`/landing/${landing.slug}`}
      />
    </div>
  );
};

export default LandingPage;

