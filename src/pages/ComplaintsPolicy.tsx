import { Link } from "react-router-dom";
import { useSlotUrl } from "@/hooks/useWebsiteImageSlots";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import TypingTitle from "@/components/TypingTitle";
import { ArrowUpRight } from "lucide-react";

const defaultComplaintsHero = "https://images.pexels.com/photos/6593883/pexels-photo-6593883.jpeg?auto=compress&cs=tinysrgb&w=1920";

const ComplaintsPolicy = () => {
  const complaintsHeroImage = useSlotUrl("hero_complaints_policy", defaultComplaintsHero) || defaultComplaintsHero;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1">
        <div className="w-full p-[5px] bg-red-50">
          <section
            aria-label="Urban Hub Preston - complaints policy page hero"
            className="relative flex items-center justify-center rounded-3xl overflow-hidden"
            style={{
              minHeight: "60vh",
              backgroundImage: `linear-gradient(180deg, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.5) 50%, rgba(0, 0, 0, 0.7) 100%), url('${complaintsHeroImage}')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="container mx-auto max-w-4xl px-4 text-center text-white space-y-6 py-24">
              <TypingTitle
                as="h1"
                text="COMPLAINTS POLICY"
                className="text-5xl md:text-6xl lg:text-7xl font-display font-black uppercase leading-tight"
                typingSpeed={32}
              />
              <p className="text-sm md:text-base text-white/90 max-w-2xl mx-auto">
                How Unity Livin handles complaints fairly, efficiently, and transparently.
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
                  1. Purpose
                </h2>
                <p className="text-gray-700">
                  Unity Livin is committed to providing a high standard of accommodation and service to all tenants.
                  We take complaints seriously and aim to resolve issues fairly, efficiently, and transparently.
                </p>
              </section>

              <section>
                <h2 className="text-base md:text-xl font-display font-black uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-2 mb-3 md:mb-4">
                  2. How to Make a Complaint
                </h2>
                <p className="text-gray-700">
                  All complaints must be submitted in writing via email to{" "}
                  <a href="mailto:operations@urbanhub.uk" className="text-[#ff2020] hover:underline">operations@urbanhub.uk</a>.
                </p>
                <p className="text-gray-700 mt-3">
                  Please include your full name, property address and room number, a clear description of the issue,
                  and any relevant supporting information or evidence.
                </p>
              </section>

              <section>
                <h2 className="text-base md:text-xl font-display font-black uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-2 mb-3 md:mb-4">
                  3. Stage 1 - Initial Review
                </h2>
                <p className="text-gray-700">
                  Once your complaint has been received, our team will investigate and provide a full response within
                  7 days.
                </p>
              </section>

              <section>
                <h2 className="text-base md:text-xl font-display font-black uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-2 mb-3 md:mb-4">
                  4. Stage 2 - Escalation to Operations Manager
                </h2>
                <p className="text-gray-700">
                  If you are not satisfied with the outcome, your complaint can be escalated to the Operations
                  Manager, who will provide a final response within 14 days.
                </p>
              </section>

              <section>
                <h2 className="text-base md:text-xl font-display font-black uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-2 mb-3 md:mb-4">
                  5. Stage 3 - Independent Redress
                </h2>
                <p className="text-gray-700">
                  If you remain dissatisfied, you may contact the Property Redress Scheme (PRS) via{" "}
                  <a href="https://www.theprs.co.uk" target="_blank" rel="noopener noreferrer" className="text-[#ff2020] hover:underline">
                    www.theprs.co.uk
                  </a>.
                </p>
              </section>

              <section>
                <h2 className="text-base md:text-xl font-display font-black uppercase tracking-wide text-gray-900 border-b border-gray-300 pb-2 mb-3 md:mb-4">
                  6. General Information
                </h2>
                <p className="text-gray-700">
                  All complaints will be handled confidentially. We aim to resolve issues promptly and will keep you
                  informed if delays occur.
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

export default ComplaintsPolicy;
