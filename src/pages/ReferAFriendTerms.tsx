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
                text="REFER A FRIEND PROGRAMME"
                className="text-4xl md:text-5xl lg:text-6xl font-display font-black uppercase leading-tight"
                typingSpeed={32}
              />
              <p className="text-sm md:text-base text-white/90 max-w-2xl mx-auto">
                Terms and conditions for the Urban Hub Refer a Friend Programme for the 2026/27 academic year.
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
                <h2 className="text-base md:text-xl font-display font-black uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-2 mb-3 md:mb-4">
                  1. Overview
                </h2>
                <p className="text-gray-700">
                  Urban Hub is offering a monetary reward to thank you for referring another student who successfully
                  books a room with us for the 2026/27 academic year.
                </p>
                <ul className="list-disc pl-5 md:pl-6 space-y-1.5 md:space-y-2 text-gray-700 mt-3">
                  <li>The standard reward under this promotion is £200 for you and £200 for the student you refer.</li>
                  <li>The value of the reward may change during specific promotional periods.</li>
                  <li>This promotion will run until October 2026.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-base md:text-xl font-display font-black uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-2 mb-3 md:mb-4">
                  2. Eligibility – Referrer
                </h2>
                <p className="text-gray-700 mb-3">To be eligible to participate, you must:</p>
                <ul className="list-disc pl-5 md:pl-6 space-y-1.5 md:space-y-2 text-gray-700">
                  <li>
                    Be a current 2025/26 resident at Urban Hub, or have booked a room for the 2026/27 academic year.
                  </li>
                  <li>Not be in breach of your Occupancy Agreement with Urban Hub.</li>
                  <li>
                    Refer a person who will be a full-time student during the 2025/26 academic year and who wishes to
                    book a room at Urban Hub.
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="text-base md:text-xl font-display font-black uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-2 mb-3 md:mb-4">
                  3. Eligibility – Referee (the student you refer)
                </h2>
                <p className="text-gray-700 mb-3">For your referred friend to be eligible, they must:</p>
                <ul className="list-disc pl-5 md:pl-6 space-y-1.5 md:space-y-2 text-gray-700">
                  <li>Book for an occupation period of no less than 45 weeks during the 2026/27 academic year.</li>
                  <li>Not already be registered in Urban Hub’s database at the time of referral.</li>
                </ul>
                <p className="text-gray-700 mt-3">
                  There is no limit to the number of students you can refer under this promotion.
                </p>
              </section>

              <section>
                <h2 className="text-base md:text-xl font-display font-black uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-2 mb-3 md:mb-4">
                  4. Eligibility to claim the reward
                </h2>
                <p className="text-gray-700 mb-3">
                  You and your referred student will both be eligible to claim the monetary reward when the following
                  conditions are met:
                </p>
                <ol className="list-decimal pl-5 md:pl-6 space-y-1.5 md:space-y-2 text-gray-700">
                  <li>The eligibility terms above are satisfied.</li>
                  <li>
                    Both you and your referred friend have taken occupation of your respective rooms at Urban Hub within
                    45 days of booking.
                  </li>
                  <li>All payments due to date under your respective Occupancy Agreements have been made.</li>
                </ol>
              </section>

              <section>
                <h2 className="text-base md:text-xl font-display font-black uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-2 mb-3 md:mb-4">
                  5. How to claim your reward
                </h2>
                <ul className="list-disc pl-5 md:pl-6 space-y-1.5 md:space-y-2 text-gray-700">
                  <li>
                    If your referral is successful and all conditions are met, Urban Hub will contact you by email
                    within 30 days, inviting you to claim your reward.
                  </li>
                  <li>
                    Rewards must be claimed within 15 days of receiving the invitation email. After this period, the
                    reward will no longer be available, and the right to claim will be forfeited.
                  </li>
                  <li>
                    The reward is not a discount on rent or fees owed to Urban Hub. It will be issued as a separate
                    monetary payment made by Urban Hub using a method of our choosing.
                  </li>
                  <li>
                    To receive the payment, you may be required to agree to the terms and conditions of a third-party
                    payment provider appointed by Urban Hub.
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

