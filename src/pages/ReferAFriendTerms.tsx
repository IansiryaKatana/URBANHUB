import { Link } from "react-router-dom";
import { useSlotUrl } from "@/hooks/useWebsiteImageSlots";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import TypingTitle from "@/components/TypingTitle";
import { ArrowUpRight } from "lucide-react";

const defaultReferTermsHero =
  "https://images.pexels.com/photos/1438084/pexels-photo-1438084.jpeg?auto=compress&cs=tinysrgb&w=1920";

const ReferAFriendTerms = () => {
  const referTermsHeroImage = useSlotUrl("hero_refer_terms", defaultReferTermsHero) || defaultReferTermsHero;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1">
        <div className="w-full p-[5px] bg-red-50">
          <section
            aria-label="Urban Hub Preston - Refer a Friend Programme terms and conditions hero"
            className="relative flex items-center justify-center rounded-3xl overflow-hidden"
            style={{
              minHeight: "60vh",
              backgroundImage: `linear-gradient(180deg, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.5) 50%, rgba(0, 0, 0, 0.7) 100%), url('${referTermsHeroImage}')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="container mx-auto max-w-4xl px-4 text-center text-white space-y-6 py-24">
              <TypingTitle
                as="h1"
                text="REFER A FRIEND OFFER"
                className="text-4xl md:text-5xl lg:text-6xl font-display font-black uppercase leading-tight"
                typingSpeed={32}
              />
              <p className="text-sm md:text-base text-white/90 max-w-2xl mx-auto">
                Full terms and conditions for the Urban Hub Refer a Friend Promotion.
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
              <section className="space-y-4">
                <h2 className="text-lg md:text-2xl font-display font-black uppercase tracking-wide text-gray-900">
                  Urban Hub – Refer a Friend Offer
                </h2>
                <p className="text-base md:text-lg font-semibold text-gray-900">Full Terms &amp; Conditions</p>
                <p className="text-gray-700">
                  These Terms &amp; Conditions (&ldquo;T&amp;Cs&rdquo;) govern the Urban Hub Refer a Friend Promotion
                  (the &ldquo;Offer&rdquo;) provided by Urban Hub Preston (&ldquo;Urban Hub&rdquo;, &ldquo;we&rdquo;,
                  &ldquo;our&rdquo;, &ldquo;us&rdquo;). By participating in this Offer, you agree to be bound by these
                  T&amp;Cs.
                </p>
              </section>

              <section>
                <h2 className="text-base md:text-xl font-display font-black uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-2 mb-3 md:mb-4">
                  1. Eligibility
                </h2>
                <ul className="list-none pl-0 space-y-2 text-gray-700">
                  <li>
                    <span className="font-medium">1.1</span> The Offer is available to current Urban Hub residents who
                    successfully refer a new resident to Urban Hub.
                  </li>
                  <li>
                    <span className="font-medium">1.2</span> The referred resident must complete a valid booking for an
                    eligible room type and tenancy length as specified by Urban Hub at the time of booking.
                  </li>
                  <li>
                    <span className="font-medium">1.3</span> The Offer applies only to bookings made directly through
                    Urban Hub&rsquo;s official channels or authorised booking partners.
                  </li>
                  <li>
                    <span className="font-medium">1.4</span> To qualify, the referred resident must provide the
                    referrer&rsquo;s Full Name and Room Number during the booking process.
                  </li>
                  <li>
                    <span className="font-medium">1.5</span> The referred resident must book an eligible tenancy with a
                    minimum occupation period of 45 weeks for the 2026/27 academic year.
                  </li>
                  <li>
                    <span className="font-medium">1.6</span> The referred resident must not already be registered within
                    Urban Hub&rsquo;s enquiry, applicant, or resident database at the time of referral.
                  </li>
                  <li>
                    <span className="font-medium">1.7</span> There is no limit to the number of students a resident may
                    refer under this promotion, provided all referral conditions are met.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-base md:text-xl font-display font-black uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-2 mb-3 md:mb-4">
                  2. Referral Reward Details
                </h2>
                <ul className="list-none pl-0 space-y-2 text-gray-700">
                  <li>
                    <span className="font-medium">2.1</span> Eligible referrers and referred residents will each receive a
                    £200 referral reward.
                  </li>
                  <li>
                    <span className="font-medium">2.2</span> The £200 reward will be adjusted against the next rental
                    instalment payment for both the referrer and referee.
                  </li>
                  <li>
                    <span className="font-medium">2.3</span> The referral reward will be applied within 30 days after the
                    referred resident has successfully moved in, and all booking conditions have been met.
                  </li>
                  <li>
                    <span className="font-medium">2.4</span> The reward is non-transferable, cannot be exchanged for cash,
                    and cannot be redeemed in any alternative form.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-base md:text-xl font-display font-black uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-2 mb-3 md:mb-4">
                  3. Conditions of the Offer
                </h2>
                <p className="text-gray-700 mb-3">
                  <span className="font-medium">3.1</span> To qualify for the Offer:
                </p>
                <ul className="list-disc pl-5 md:pl-6 space-y-1.5 md:space-y-2 text-gray-700 mb-4">
                  <li>
                    The referred resident must complete the booking process and pay any required deposit or booking fee.
                  </li>
                  <li>The referred resident must move into the accommodation as per the agreed tenancy start date.</li>
                  <li>Both residents must comply with the terms of their tenancy agreements.</li>
                </ul>
                <ul className="list-none pl-0 space-y-2 text-gray-700">
                  <li>
                    <span className="font-medium">3.2</span> If the referred booking is cancelled before move-in,
                    terminated early, or found to be invalid, both referral rewards will be forfeited.
                  </li>
                  <li>
                    <span className="font-medium">3.3</span> The Offer is limited to one referral reward per referred
                    booking.
                  </li>
                  <li>
                    <span className="font-medium">3.4</span> The referral reward can only be applied towards future
                    rental instalments and cannot be deducted from deposits, booking fees, or previous payments.
                  </li>
                  <li>
                    <span className="font-medium">3.5</span> Referral rewards will only be processed once both the
                    referrer and referred resident have successfully moved into their respective rooms and satisfied all
                    eligibility requirements.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-base md:text-xl font-display font-black uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-2 mb-3 md:mb-4">
                  4. Restrictions
                </h2>
                <ul className="list-none pl-0 space-y-2 text-gray-700">
                  <li>
                    <span className="font-medium">4.1</span> This Offer cannot be combined with any other promotions,
                    discounts, or referral schemes unless stated otherwise by Urban Hub.
                  </li>
                  <li>
                    <span className="font-medium">4.2</span> Urban Hub reserves the right to refuse or withdraw the Offer
                    where fraudulent activity, misuse, or breach of these Terms &amp; Conditions is suspected.
                  </li>
                  <li>
                    <span className="font-medium">4.3</span> The Offer is subject to room availability and management
                    approval.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-base md:text-xl font-display font-black uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-2 mb-3 md:mb-4">
                  5. Offer Validity
                </h2>
                <ul className="list-none pl-0 space-y-2 text-gray-700">
                  <li>
                    <span className="font-medium">5.1</span> The Refer a Friend Offer is valid from the launch date until
                    withdrawn by Urban Hub management.
                  </li>
                  <li>
                    <span className="font-medium">5.2</span> Urban Hub reserves the right to amend, suspend, or terminate
                    the Offer at any time without prior notice.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-base md:text-xl font-display font-black uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-2 mb-3 md:mb-4">
                  6. General Terms
                </h2>
                <ul className="list-none pl-0 space-y-2 text-gray-700">
                  <li>
                    <span className="font-medium">6.1</span> In the event of any dispute regarding eligibility or
                    interpretation of these Terms &amp; Conditions, Urban Hub&rsquo;s decision shall be final.
                  </li>
                  <li>
                    <span className="font-medium">6.2</span> By participating in the Offer, all participants agree to these
                    Terms &amp; Conditions in full.
                  </li>
                </ul>
              </section>
            </article>

            <div className="mt-12 pt-8 border-t border-gray-200">
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

export default ReferAFriendTerms;

