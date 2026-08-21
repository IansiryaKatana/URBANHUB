import { useEffect } from "react";
import { Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useBrandingSettings } from "@/hooks/useBranding";
import { useSlotUrl } from "@/hooks/useWebsiteImageSlots";
import { useReviews } from "@/hooks/useReviews";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { AnimatedText, AnimatedParagraph } from "@/components/animations/AnimatedText";
import TypingTitle from "@/components/TypingTitle";
import { Star, Loader2, BadgeCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const Reviews = () => {
  const { data: brandingSettings } = useBrandingSettings();
  const companyName = brandingSettings?.company_name || "Urban Hub";
  const siteUrl = typeof window !== "undefined" ? window.location.origin : "";

  const { data: reviews, isLoading } = useReviews();

  useEffect(() => {
    const businessId = `${siteUrl || "https://urbanhub.uk"}/#lodging`;
    const businessName = companyName;
    const streetAddress = [
      brandingSettings?.contact_address_line1,
      brandingSettings?.contact_address_line2,
    ]
      .filter(Boolean)
      .join(", ") || "Urban Hub, Preston";
    const addressLocality = "Preston";
    const postalCode =
      brandingSettings?.contact_address_line3?.match(/\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i)?.[0] ||
      "PR1 1AA";

    const itemReviewed = {
      "@type": "LodgingBusiness" as const,
      "@id": businessId,
      name: businessName,
      url: siteUrl || "https://urbanhub.uk",
      address: {
        "@type": "PostalAddress" as const,
        streetAddress,
        addressLocality,
        postalCode,
        addressCountry: "GB",
      },
    };

    const aggregateRating =
      reviews && reviews.length > 0
        ? {
            "@type": "AggregateRating" as const,
            ratingValue: Number(
              (reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1),
            ),
            bestRating: 5,
            worstRating: 1,
            ratingCount: reviews.length,
            reviewCount: reviews.length,
          }
        : null;

    const reviewItems =
      reviews?.slice(0, 10).map((r) => ({
        "@type": "Review" as const,
        itemReviewed: {
          "@type": "LodgingBusiness" as const,
          "@id": businessId,
          name: businessName,
        },
        author: { "@type": "Person" as const, name: r.reviewer_name },
        datePublished: r.created_at,
        reviewRating: {
          "@type": "Rating" as const,
          ratingValue: r.rating,
          bestRating: 5,
          worstRating: 1,
        },
        ...(r.title?.trim() ? { name: r.title.trim() } : {}),
        reviewBody: r.content,
      })) ?? [];

    const structuredData = {
      "@context": "https://schema.org",
      ...itemReviewed,
      ...(aggregateRating ? { aggregateRating } : {}),
      ...(reviewItems.length > 0 ? { review: reviewItems } : {}),
    };

    const scriptId = "reviews-page-structured-data";
    const existing = document.getElementById(scriptId);
    if (existing) existing.remove();
    const script = document.createElement("script");
    script.id = scriptId;
    script.type = "application/ld+json";
    script.setAttribute("data-reviews-json", "true");
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);

    const keywordsTag = document.querySelector('meta[name="keywords"]');
    if (keywordsTag) keywordsTag.remove();

    return () => {
      const toRemove = document.getElementById(scriptId);
      if (toRemove) toRemove.remove();
    };
  }, [companyName, siteUrl, brandingSettings, reviews]);

  const heroSlotUrl = useSlotUrl("hero_reviews", brandingSettings?.studio_catalog_hero_image);
  const heroImagePath = heroSlotUrl || "https://urbanhub.uk/wp-content/uploads/2025/05/URBAN-HUB-OUTSIDE-A-3-of-1-scaled-1.webp";

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero */}
      <div className="w-full p-[5px] bg-red-50">
        <section
          aria-label="Urban Hub Preston student accommodation building - Reviews page hero"
          className="relative flex items-center justify-center rounded-3xl overflow-hidden"
          style={{
            minHeight: "50vh",
            backgroundImage: `linear-gradient(180deg, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.5) 50%, rgba(0, 0, 0, 0.7) 100%), url('${heroImagePath}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="container mx-auto max-w-4xl px-4 text-center text-white space-y-6 py-24">
            <TypingTitle
              as="h1"
              text="REVIEWS"
              className="text-5xl md:text-6xl lg:text-7xl font-display font-black uppercase leading-tight"
              typingSpeed={32}
            />
            <AnimatedParagraph delay={0.2} className="text-sm md:text-base text-white/90 max-w-2xl mx-auto">
              See what our residents say about living at{" "}
              <Link to="/about" className="underline hover:text-accent-yellow transition-colors">{companyName}</Link>
              . Explore our{" "}
              <Link to="/studios" className="underline hover:text-accent-yellow transition-colors">studios</Link>
              {" "}or{" "}
              <Link to="/contact" className="underline hover:text-accent-yellow transition-colors">contact us</Link>
              . Share your experience too.
            </AnimatedParagraph>
          </div>
        </section>
      </div>

      <main className="bg-red-50 py-16 md:py-24" role="main" id="main-content">
        <div className="container mx-auto px-4 max-w-5xl space-y-16">
          {/* Add review form */}
          <section aria-labelledby="add-review-heading">
            <AnimatedText delay={0.1}>
              <h2 id="add-review-heading" className="text-2xl md:text-3xl font-display font-black uppercase tracking-wide text-center mb-8">
                Add your review
              </h2>
            </AnimatedText>
            <ReviewForm />
          </section>

          {/* Reviews list */}
          <section aria-labelledby="reviews-heading">
            <AnimatedText delay={0.2}>
              <h2 id="reviews-heading" className="text-2xl md:text-3xl font-display font-black uppercase tracking-wide text-center mb-8">
                What our residents say
              </h2>
            </AnimatedText>

            {isLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : !reviews?.length ? (
              <div className="rounded-2xl border border-dashed bg-card/50 p-12 text-center">
                <p className="text-muted-foreground">No reviews yet. Be the first to share your experience!</p>
              </div>
            ) : (
              <div className="grid gap-6 md:gap-8" role="list">
                {reviews.map((review) => (
                  <Card
                    key={review.id}
                    className={`overflow-hidden transition-shadow hover:shadow-md ${review.featured ? "ring-2 ring-primary/30" : ""}`}
                  >
                    <CardContent className="p-6 md:p-8">
                    <article role="listitem">
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex" aria-label={`${review.rating} out of 5 stars`}>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={`h-5 w-5 ${
                                    star <= review.rating ? "fill-primary text-primary" : "text-muted-foreground/30"
                                  }`}
                                />
                              ))}
                            </div>
                            {review.verified_purchase && (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <BadgeCheck className="h-4 w-4 text-green-600" />
                                Verified resident
                              </span>
                            )}
                            {review.featured && (
                              <span className="text-xs font-semibold uppercase tracking-wide text-primary">Featured</span>
                            )}
                          </div>
                          <time className="text-sm text-muted-foreground" dateTime={review.created_at}>
                            {new Date(review.created_at).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </time>
                        </div>
                        {review.title && (
                          <h3 className="text-lg font-semibold">{review.title}</h3>
                        )}
                        <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{review.content}</p>
                        <p className="text-sm font-medium">— {review.reviewer_name}</p>
                      </div>
                    </article>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Reviews;
