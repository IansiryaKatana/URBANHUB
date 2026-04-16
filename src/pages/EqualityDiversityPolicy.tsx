import { Link } from "react-router-dom";
import { useSlotUrl } from "@/hooks/useWebsiteImageSlots";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import TypingTitle from "@/components/TypingTitle";
import { ArrowUpRight } from "lucide-react";

const defaultEqualityHero = "https://images.pexels.com/photos/6593883/pexels-photo-6593883.jpeg?auto=compress&cs=tinysrgb&w=1920";

const EqualityDiversityPolicy = () => {
  const equalityHeroImage = useSlotUrl("hero_equality_diversity_policy", defaultEqualityHero) || defaultEqualityHero;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1">
        <div className="w-full p-[5px] bg-red-50">
          <section
            aria-label="Urban Hub Preston - equality and diversity policy page hero"
            className="relative flex items-center justify-center rounded-3xl overflow-hidden"
            style={{
              minHeight: "60vh",
              backgroundImage: `linear-gradient(180deg, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.5) 50%, rgba(0, 0, 0, 0.7) 100%), url('${equalityHeroImage}')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="container mx-auto max-w-4xl px-4 text-center text-white space-y-6 py-24">
              <TypingTitle
                as="h1"
                text="EQUALITY & DIVERSITY POLICY"
                className="text-4xl md:text-5xl lg:text-6xl font-display font-black uppercase leading-tight"
                typingSpeed={32}
              />
              <p className="text-sm md:text-base text-white/90 max-w-2xl mx-auto">
                Our commitment to inclusion, fairness, and zero tolerance for discrimination.
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
          <div className="container mx-auto px-4 max-w-4xl">
            <article className="prose prose-sm md:prose lg:prose-lg max-w-none space-y-8 md:space-y-12 text-sm md:text-base">
              <section>
                <h2 className="text-base md:text-xl font-display font-black uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-2 mb-3 md:mb-4">
                  1. Policy Statement
                </h2>
                <p className="text-gray-700">
                  Urban Hub - Unity Livin is committed to promoting equality, diversity, and inclusion across all
                  aspects of its operations. We aim to create a safe, respectful, and inclusive environment for all
                  residents, staff, contractors, and visitors. We do not tolerate discrimination, harassment, or
                  victimisation of any kind.
                </p>
              </section>

              <section>
                <h2 className="text-base md:text-xl font-display font-black uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-2 mb-3 md:mb-4">
                  2. Scope
                </h2>
                <p className="text-gray-700">
                  This policy applies to all employees, residents, contractors, and visitors.
                </p>
              </section>

              <section>
                <h2 className="text-base md:text-xl font-display font-black uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-2 mb-3 md:mb-4">
                  3. Our Commitment
                </h2>
                <p className="text-gray-700">
                  We are committed to treating all individuals fairly, promoting equal opportunities, creating an
                  inclusive community, and preventing discrimination in all forms.
                </p>
              </section>

              <section>
                <h2 className="text-base md:text-xl font-display font-black uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-2 mb-3 md:mb-4">
                  4. Protected Characteristics
                </h2>
                <p className="text-gray-700">
                  We are committed to equality regardless of age, disability, gender reassignment, marriage or civil
                  partnership, pregnancy or maternity, race, religion or belief, sex, or sexual orientation.
                </p>
              </section>

              <section>
                <h2 className="text-base md:text-xl font-display font-black uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-2 mb-3 md:mb-4">
                  5. Zero Tolerance Approach
                </h2>
                <p className="text-gray-700">
                  We operate a zero-tolerance approach to discrimination, harassment, bullying, and victimisation.
                  This may result in disciplinary or tenancy action.
                </p>
              </section>

              <section>
                <h2 className="text-base md:text-xl font-display font-black uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-2 mb-3 md:mb-4">
                  6. Responsibilities
                </h2>
                <ul className="list-disc pl-5 md:pl-6 space-y-2 text-gray-700">
                  <li><strong>Management:</strong> Ensure policy implementation and promote inclusion.</li>
                  <li><strong>Staff:</strong> Treat everyone with respect and report concerns.</li>
                  <li><strong>Residents:</strong> Respect others and avoid discriminatory behaviour.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-base md:text-xl font-display font-black uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-2 mb-3 md:mb-4">
                  7. Complaints & Reporting
                </h2>
                <p className="text-gray-700">
                  All concerns should be reported in line with the Unity Livin Complaints Policy and will be handled
                  confidentially and promptly.
                </p>
              </section>

              <section>
                <h2 className="text-base md:text-xl font-display font-black uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-2 mb-3 md:mb-4">
                  8. Accessibility & Inclusion
                </h2>
                <p className="text-gray-700">
                  We will make reasonable adjustments, ensure accessibility, and provide support where needed.
                </p>
              </section>

              <section>
                <h2 className="text-base md:text-xl font-display font-black uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-2 mb-3 md:mb-4">
                  9. Training & Awareness
                </h2>
                <p className="text-gray-700">
                  Staff may receive training to promote inclusive behaviour and handle issues appropriately.
                </p>
              </section>

              <section>
                <h2 className="text-base md:text-xl font-display font-black uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-2 mb-3 md:mb-4">
                  10. Monitoring & Review
                </h2>
                <p className="text-gray-700">
                  This policy will be reviewed regularly to ensure compliance and effectiveness.
                </p>
              </section>

              <section>
                <h2 className="text-base md:text-xl font-display font-black uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-2 mb-3 md:mb-4">
                  11. Legal Compliance
                </h2>
                <p className="text-gray-700">
                  This policy aligns with the Equality Act 2010.
                </p>
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

export default EqualityDiversityPolicy;
