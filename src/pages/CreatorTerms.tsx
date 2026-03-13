import { Link } from "react-router-dom";
import { useSlotUrl } from "@/hooks/useWebsiteImageSlots";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import TypingTitle from "@/components/TypingTitle";
import { ArrowUpRight } from "lucide-react";

const defaultCreatorTermsHero =
  "https://images.pexels.com/photos/6898859/pexels-photo-6898859.jpeg?auto=compress&cs=tinysrgb&w=1920";

const CreatorTerms = () => {
  const creatorTermsHeroImage =
    useSlotUrl("hero_creator_terms", defaultCreatorTermsHero) || defaultCreatorTermsHero;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1">
        <div className="w-full p-[5px] bg-red-50">
          <section
            aria-label="Urban Hub Preston - Content Creator Terms and Conditions page hero"
            className="relative flex items-center justify-center rounded-3xl overflow-hidden"
            style={{
              minHeight: "60vh",
              backgroundImage: `linear-gradient(180deg, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.5) 50%, rgba(0, 0, 0, 0.7) 100%), url('${creatorTermsHeroImage}')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="container mx-auto max-w-4xl px-4 text-white space-y-6 py-24">
              <div className="flex flex-col gap-4">
                <div className="text-center md:text-left space-y-4">
                  <TypingTitle
                    as="h1"
                    text="TERMS & CONDITIONS"
                    className="text-4xl md:text-5xl lg:text-6xl font-display font-black uppercase leading-tight"
                    typingSpeed={32}
                  />
                  <p className="text-xs md:text-sm tracking-[0.2em] uppercase text-white/70">
                    Content Creator Collaboration
                  </p>
                  <p className="text-sm md:text-base text-white/90 max-w-2xl">
                    Terms for creators collaborating with Urban Hub to showcase our facilities, community, and
                    student life.
                  </p>
                </div>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="bg-yellow-400 hover:bg-yellow-500 text-black rounded-full"
                    asChild
                  >
                    <Link to="/" className="flex items-center gap-1.5">
                      Back to home
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="py-8 md:py-16 bg-red-50 text-gray-900">
          <div className="w-full max-w-[1280px] mx-auto px-4 md:px-6 lg:px-8">
            <article className="prose prose-sm md:prose lg:prose-lg !max-w-none w-full space-y-8 md:space-y-10 text-sm md:text-base">
              <section>
                <h2 className="text-base md:text-xl font-display font-black uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-2 mb-3 md:mb-4">
                  Urban Hub Content Creator Terms
                </h2>
                <p className="text-gray-700">
                  These Terms &amp; Conditions govern collaborations between Urban Hub (&quot;Urban Hub&quot;) and
                  individual content creators (&quot;Creators&quot;) who apply to or participate in the Urban Hub Content
                  Creator Programme. By submitting an application or participating in a collaboration, you agree to be
                  bound by these Terms &amp; Conditions.
                </p>
              </section>

              <section>
                <h3 className="text-sm md:text-lg font-display font-black uppercase tracking-wide text-gray-900 mb-2">
                  1. Eligibility
                </h3>
                <ul className="list-disc pl-5 md:pl-6 space-y-1.5 text-gray-700">
                  <li>Applicants must be 18 years or older.</li>
                  <li>
                    Both experienced creators and individuals interested in trying content creation are welcome to apply.
                  </li>
                  <li>Submission of an application does not guarantee selection for collaboration.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-sm md:text-lg font-display font-black uppercase tracking-wide text-gray-900 mb-2">
                  2. Selection
                </h3>
                <p className="text-gray-700 mb-2">
                  Urban Hub will review applications at its sole discretion. Decisions will be based on factors
                  including, but not limited to:
                </p>
                <ul className="list-disc pl-5 md:pl-6 space-y-1.5 text-gray-700">
                  <li>Content quality and creativity</li>
                  <li>Audience relevance and engagement</li>
                  <li>Alignment with Urban Hub&apos;s brand values and positioning</li>
                </ul>
                <p className="text-gray-700 mt-2">
                  Urban Hub reserves the right to accept or decline any application without obligation to provide
                  feedback or justification.
                </p>
              </section>

              <section>
                <h3 className="text-sm md:text-lg font-display font-black uppercase tracking-wide text-gray-900 mb-2">
                  3. Content Requirements
                </h3>
                <p className="text-gray-700 mb-2">
                  Selected Creators may be required to produce content showcasing Urban Hub facilities and student life
                  in formats such as, but not limited to:
                </p>
                <ul className="list-disc pl-5 md:pl-6 space-y-1.5 text-gray-700">
                  <li>Short-form videos (e.g., reels, TikToks)</li>
                  <li>Long-form videos or vlogs</li>
                  <li>Photos or carousels</li>
                  <li>Stories or other social media formats</li>
                </ul>
                <p className="text-gray-700 mt-2">
                  All content must be created in accordance with the agreed creative brief, brand guidelines, and
                  timelines communicated by Urban Hub.
                </p>
              </section>

              <section>
                <h3 className="text-sm md:text-lg font-display font-black uppercase tracking-wide text-gray-900 mb-2">
                  4. On-Site Filming
                </h3>
                <p className="text-gray-700 mb-2">
                  Some collaborations may require Creators to visit Urban Hub Preston or other designated Urban Hub
                  locations to capture content.
                </p>
                <ul className="list-disc pl-5 md:pl-6 space-y-1.5 text-gray-700">
                  <li>Creators must follow all on-site property rules and safety instructions.</li>
                  <li>
                    Creators must respect the privacy, comfort, and safety of residents, staff, and visitors at all
                    times.
                  </li>
                  <li>
                    Filming in certain areas may be restricted; Urban Hub reserves the right to limit or supervise
                    filming locations.
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="text-sm md:text-lg font-display font-black uppercase tracking-wide text-gray-900 mb-2">
                  5. Content Approval
                </h3>
                <p className="text-gray-700">
                  Urban Hub may review and request reasonable edits or adjustments to content before publication to
                  ensure alignment with brand guidelines, legal requirements, and community standards. Creators agree to
                  cooperate in making such reasonable changes in a timely manner.
                </p>
              </section>

              <section>
                <h3 className="text-sm md:text-lg font-display font-black uppercase tracking-wide text-gray-900 mb-2">
                  6. Usage Rights
                </h3>
                <ul className="list-disc pl-5 md:pl-6 space-y-1.5 text-gray-700">
                  <li>
                    By participating in a collaboration, Creators grant Urban Hub a full, unrestricted, worldwide,
                    royalty-free, transferable and sub-licensable licence to use, edit, adapt, reproduce, publish,
                    distribute, and display all content produced during the collaboration, including both final content
                    and raw footage, for marketing and promotional purposes.
                  </li>
                  <li>
                    Urban Hub may use the content across any channels including, without limitation, social media,
                    websites, email marketing, paid advertising, presentations, and print materials, for an unlimited
                    time period.
                  </li>
                  <li>Creators must provide all raw files and footage upon submission of final deliverables.</li>
                  <li>
                    Where third-party individuals appear prominently in content, Creators are responsible for ensuring
                    appropriate consent has been obtained, where required.
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="text-sm md:text-lg font-display font-black uppercase tracking-wide text-gray-900 mb-2">
                  7. Compensation
                </h3>
                <p className="text-gray-700 mb-2">
                  Any compensation, whether monetary or in-kind (such as complimentary stays, experiences, or other
                  benefits), will be agreed in writing before the collaboration begins.
                </p>
                <ul className="list-disc pl-5 md:pl-6 space-y-1.5 text-gray-700">
                  <li>
                    Where compensation has been agreed, payment will only be made once all agreed deliverables
                    (including raw files) have been submitted, reviewed, and approved by Urban Hub.
                  </li>
                  <li>
                    Urban Hub reserves the right to withhold or adjust compensation if deliverables are incomplete,
                    late, or do not meet the agreed brief or quality standards.
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="text-sm md:text-lg font-display font-black uppercase tracking-wide text-gray-900 mb-2">
                  8. Brand Representation
                </h3>
                <ul className="list-disc pl-5 md:pl-6 space-y-1.5 text-gray-700">
                  <li>
                    All content must represent Urban Hub positively, respectfully, and in line with its brand values and
                    community standards.
                  </li>
                  <li>
                    Content must comply with the terms, rules, and guidelines of any platforms on which it is published
                    (e.g., Instagram, TikTok, YouTube).
                  </li>
                  <li>
                    Creators must not include defamatory, discriminatory, hateful, explicit, or illegal material in any
                    collaboration content.
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="text-sm md:text-lg font-display font-black uppercase tracking-wide text-gray-900 mb-2">
                  9. Termination
                </h3>
                <ul className="list-disc pl-5 md:pl-6 space-y-1.5 text-gray-700">
                  <li>
                    Urban Hub may suspend or terminate a collaboration at any time if these Terms &amp; Conditions are
                    violated, if deliverables are not provided, or if content is deemed unsuitable or harmful to the
                    brand.
                  </li>
                  <li>
                    In the event of termination due to a breach by the Creator, any unpaid compensation may be reduced
                    or cancelled at Urban Hub&apos;s discretion.
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="text-sm md:text-lg font-display font-black uppercase tracking-wide text-gray-900 mb-2">
                  10. Privacy
                </h3>
                <p className="text-gray-700 mb-2">
                  Information submitted by Creators in application forms or during the collaboration will be used only
                  to manage and administer the Urban Hub Content Creator Programme and related communications.
                </p>
                <p className="text-gray-700">
                  For further details on how Urban Hub collects, uses, and protects personal data, please refer to our{" "}
                  <Link to="/privacy" className="text-[#ff2020] hover:underline">
                    Privacy Policy
                  </Link>
                  .
                </p>
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

export default CreatorTerms;

