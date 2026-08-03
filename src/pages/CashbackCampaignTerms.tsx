import { Link } from "react-router-dom";
import { useSlotUrl } from "@/hooks/useWebsiteImageSlots";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import TypingTitle from "@/components/TypingTitle";
import { ArrowUpRight } from "lucide-react";

const defaultCashbackTermsHero =
  "https://images.pexels.com/photos/3943722/pexels-photo-3943722.jpeg?auto=compress&cs=tinysrgb&w=1920";

const CashbackCampaignTerms = () => {
  const cashbackTermsHeroImage =
    useSlotUrl("hero_cashback_terms", defaultCashbackTermsHero) || defaultCashbackTermsHero;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1">
        <div className="w-full p-[5px] bg-red-50">
          <section
            aria-label="Urban Hub Preston - Cashback campaign terms and conditions hero"
            className="relative flex items-center justify-center rounded-3xl overflow-hidden"
            style={{
              minHeight: "60vh",
              backgroundImage: `linear-gradient(180deg, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.5) 50%, rgba(0, 0, 0, 0.7) 100%), url('${cashbackTermsHeroImage}')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="container mx-auto max-w-4xl px-4 text-center text-white space-y-6 py-24">
              <TypingTitle
                as="h1"
                text="£300 CASHBACK TERMS"
                className="text-4xl md:text-5xl lg:text-6xl font-display font-black uppercase leading-tight"
                typingSpeed={32}
              />
              <p className="text-sm md:text-base text-white/90 max-w-2xl mx-auto">
                Full Terms & Conditions for the Urban Hub £300 Cashback Offer.
              </p>
              <Button size="sm" className="bg-yellow-400 hover:bg-yellow-500 text-black rounded-full w-fit" asChild>
                <Link to="/" className="flex items-center gap-1.5 justify-center mx-auto">
                  Back to home
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </section>
        </div>

        <section className="py-8 md:py-16 bg-red-50 text-gray-900">
          <div className="w-full max-w-[1280px] mx-auto px-4 md:px-6 lg:px-8">
            <article className="prose prose-sm md:prose lg:prose-lg !max-w-none w-full space-y-8 md:space-y-12 text-sm md:text-base">
              <section>
                <h2 className="text-base md:text-xl font-display font-black uppercase tracking-wide text-gray-900">
                  Urban Hub – £300 Cashback Offer
                </h2>
                <h3 className="text-sm md:text-lg font-display font-black uppercase tracking-wide text-gray-900 mt-2">
                  Full Terms &amp; Conditions
                </h3>
                <p className="text-gray-700 mt-3">
                  These Terms &amp; Conditions (&quot;T&amp;Cs&quot;) govern the £300 Cashback Promotion (the
                  &quot;Offer&quot;) provided by Urban Hub Preston (&quot;Urban Hub&quot;, &quot;we&quot;,
                  &quot;our&quot;, &quot;us&quot;). By participating in this Offer, you agree to be bound by these
                  T&amp;Cs.
                </p>
              </section>

              <section>
                <h3 className="text-sm md:text-lg font-display font-black uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-2 mb-3 md:mb-4">
                  1. Eligibility
                </h3>
                <ul className="list-disc pl-5 md:pl-6 space-y-1.5 md:space-y-2 text-gray-700">
                  <li>
                    1.1 The Offer is available exclusively to new residents booking a 45-week or 51-week tenancy at
                    Urban Hub.
                  </li>
                  <li>
                    1.2 The Offer applies to selected room types only and is subject to availability at the time of
                    booking.
                  </li>
                  <li>
                    1.3 The Offer is valid only for bookings made directly via Urban Hub&apos;s official channels
                    (website, on-site team, or authorised booking partners).
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="text-sm md:text-lg font-display font-black uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-2 mb-3 md:mb-4">
                  2. Cashback Details
                </h3>
                <ul className="list-disc pl-5 md:pl-6 space-y-1.5 md:space-y-2 text-gray-700">
                  <li>
                    2.1 Eligible residents will receive £300 cashback upon successful completion of a qualifying
                    booking.
                  </li>
                  <li>
                    2.2 Cashback will be issued as a single payment within 30 days after move-in, subject to all
                    conditions being met.
                  </li>
                  <li>
                    2.3 Cashback is issued post move-in and cannot be deducted from rent or upfront costs at the time
                    of booking.
                  </li>
                  <li>
                    2.4 The cashback is non-transferable, non-exchangeable, and cannot be redeemed for cash
                    alternatives beyond the stated payment.
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="text-sm md:text-lg font-display font-black uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-2 mb-3 md:mb-4">
                  3. Conditions of the Offer
                </h3>
                <ul className="list-none pl-0 space-y-5 text-gray-700">
                  <li>
                    <p className="mb-2.5">
                      <span className="font-medium text-gray-900">3.1</span> To qualify, residents must:
                    </p>
                    <ol className="list-none m-0 pl-3 md:pl-4 border-l-2 border-gray-300 space-y-2.5 text-[0.9375rem] leading-relaxed text-gray-600">
                      <li className="flex gap-2.5">
                        <span className="shrink-0 w-6 font-medium text-gray-500 tabular-nums">(a)</span>
                        <span>Complete the full booking process between 30th July and 10th August.</span>
                      </li>
                      <li className="flex gap-2.5">
                        <span className="shrink-0 w-6 font-medium text-gray-500 tabular-nums">(b)</span>
                        <span>Pay all required deposits and/or booking fees.</span>
                      </li>
                      <li className="flex gap-2.5">
                        <span className="shrink-0 w-6 font-medium text-gray-500 tabular-nums">(c)</span>
                        <span>Enter into and honour the full tenancy agreement (45 or 51 weeks).</span>
                      </li>
                      <li className="flex gap-2.5">
                        <span className="shrink-0 w-6 font-medium text-gray-500 tabular-nums">(d)</span>
                        <span>Move into the accommodation on the agreed tenancy start date.</span>
                      </li>
                    </ol>
                  </li>
                  <li>
                    <span className="font-medium text-gray-900">3.2</span> Cashback will only be processed once the
                    resident has successfully moved in and all initial payments have cleared.
                  </li>
                  <li>
                    <span className="font-medium text-gray-900">3.3</span> If a booking is cancelled before move-in, or
                    if the tenancy is terminated early for any reason, the Offer will be void, and cashback will not be
                    issued.
                  </li>
                  <li>
                    <span className="font-medium text-gray-900">3.4</span> The Offer applies only to the named tenant and
                    cannot be transferred.
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="text-sm md:text-lg font-display font-black uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-2 mb-3 md:mb-4">
                  4. Restrictions
                </h3>
                <ul className="list-disc pl-5 md:pl-6 space-y-1.5 md:space-y-2 text-gray-700">
                  <li>
                    4.1 This Offer cannot be combined with any other promotion, discount, referral scheme, cashback
                    offer, or incentive. Only one promotional offer may be applied per booking.
                  </li>
                  <li>4.2 Only one cashback payment is permitted per resident per booking.</li>
                  <li>4.3 Bookings made through unauthorised third-party platforms will not qualify.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-sm md:text-lg font-display font-black uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-2 mb-3 md:mb-4">
                  5. Offer Validity
                </h3>
                <ul className="list-disc pl-5 md:pl-6 space-y-1.5 md:space-y-2 text-gray-700">
                  <li>
                    5.1 The Offer is valid for bookings made between 30 July 2026 and 10 August 2026 (inclusive).
                  </li>
                  <li>5.2 Bookings made outside this promotional period will not qualify for the Offer.</li>
                  <li>
                    5.3 Urban Hub reserves the right to amend, suspend, or withdraw the Offer at any time without prior
                    notice.
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="text-sm md:text-lg font-display font-black uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-2 mb-3 md:mb-4">
                  6. General Terms
                </h3>
                <ul className="list-disc pl-5 md:pl-6 space-y-1.5 md:space-y-2 text-gray-700">
                  <li>
                    6.1 Urban Hub reserves the right to verify eligibility and booking details before issuing cashback.
                  </li>
                  <li>6.2 Any fraudulent, misleading, or incomplete applications may result in disqualification.</li>
                  <li>
                    6.3 In the event of any dispute regarding eligibility or interpretation of these Terms &amp;
                    Conditions, Urban Hub&apos;s decision shall be final.
                  </li>
                </ul>
              </section>
            </article>

            <div className="mt-12 pt-8 border-t border-gray-200 flex justify-end">
              <Button className="bg-[#ff2020] text-white hover:bg-[#e01b1b]" asChild>
                <Link to="/contact">Contact us</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default CashbackCampaignTerms;
