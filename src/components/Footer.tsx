import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { FaInstagram, FaTiktok, FaLinkedin, FaFacebook, FaWhatsapp } from "react-icons/fa";
import { useBrandingSettings, useNavigationItems } from "@/hooks/useBranding";
import logo from "@/assets/urban-hub-logo.webp";
import ncAccre from "@/assets/nc accre.png";
import ulAccre from "@/assets/UL accree.png";
import anukAccre from "@/assets/anuk accre.png";
import Noise from "@/components/Noise";
import { cn } from "@/lib/utils";

const platformConfig: Record<string, { icon: React.ReactNode }> = {
  instagram: { icon: <FaInstagram className="h-5 w-5" /> },
  tiktok: { icon: <FaTiktok className="h-5 w-5" /> },
  linkedin: { icon: <FaLinkedin className="h-5 w-5" /> },
  facebook: { icon: <FaFacebook className="h-5 w-5" /> },
  whatsapp: { icon: <FaWhatsapp className="h-5 w-5" /> },
};

const ACCREDITATION_LOGOS = [
  { src: ncAccre, alt: "Accredited by National Code assured accommodation" },
  { src: ulAccre, alt: "Accredited by University of Lancashire" },
  { src: anukAccre, alt: "Accredited by ANUK Accreditation Network UK" },
] as const;

function AccreditationLogoMarquee() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % ACCREDITATION_LOGOS.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <>
      {/* Mobile / tablet: one logo at a time */}
      <div
        className="relative mx-auto h-16 w-full max-w-xs overflow-hidden sm:h-[4.5rem] lg:hidden"
        aria-live="polite"
        aria-atomic="true"
      >
        {ACCREDITATION_LOGOS.map((item, i) => (
          <img
            key={item.alt}
            src={item.src}
            alt={i === index ? item.alt : ""}
            aria-hidden={i !== index}
            className={cn(
              "absolute left-1/2 top-1/2 h-14 w-auto max-w-[90%] -translate-x-1/2 -translate-y-1/2 object-contain transition-opacity duration-500 sm:h-16",
              i === index ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          />
        ))}
      </div>

      {/* Desktop: all logos */}
      <div className="hidden min-w-0 flex-1 flex-wrap items-center justify-end gap-8 lg:flex lg:gap-10">
        {ACCREDITATION_LOGOS.map((item) => (
          <img
            key={item.alt}
            src={item.src}
            alt={item.alt}
            className="h-16 w-auto max-w-[16rem] object-contain"
          />
        ))}
      </div>
    </>
  );
}

const Footer = () => {
  const [socials, setSocials] = useState<Array<{ name: string; url: string; icon: React.ReactNode }>>([]);
  const { data: settings } = useBrandingSettings();
  const { data: footerNavItems } = useNavigationItems("footer");
  
  const logoPath = settings?.logo_path;
  const logoUrl = logoPath || logo;
  const footerDescription = settings?.footer_description || "Premium student accommodation designed for modern living and academic success.";
  const contactPhone = settings?.contact_phone || "+44 123 456 7890";
  const contactEmail = settings?.contact_email || "info@urbanhub.uk";
  const contactAddress1 = settings?.contact_address_line1 || "123 Student Street";
  const contactAddress2 = settings?.contact_address_line2 || "City Centre";
  const contactAddress3 = settings?.contact_address_line3 || "Preston, PR1 1AA";

  useEffect(() => {
    const fetchSocials = async () => {
      const { data, error } = await supabase
        .from("social_media_settings")
        .select("platform, url, is_enabled")
        .eq("is_enabled", true)
        .order("display_order", { ascending: true });

      if (error) {
        console.error("Error fetching social media settings:", error);
        return;
      }

      const enabledSocials = (data || [])
        .filter((item) => item.url)
        .map((item) => {
          const config = platformConfig[item.platform];
          if (!config) return null;
          return {
            name: item.platform.charAt(0).toUpperCase() + item.platform.slice(1),
            url: item.url || "#",
            icon: config.icon,
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

      setSocials(enabledSocials);
    };

    fetchSocials();
  }, []);

  return (
    <footer style={{ backgroundColor: "hsl(0 0% 0%)" }} className="relative overflow-hidden text-white">
      <Noise patternAlpha={15} />

      <section
        aria-label="Accreditation"
        className="relative border-b border-white/25"
      >
        <div className="container relative z-10 mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 md:flex-row md:items-center md:gap-10 md:py-10">
          <div className="shrink-0 text-center md:text-left">
            <h2 className="font-display text-2xl font-black uppercase tracking-tight md:text-3xl">
              Accreditation
            </h2>
            <p className="mx-auto mt-2 max-w-xs text-sm font-medium leading-snug text-white/70 md:mx-0">
              The gold standard for student housing in the UK.
            </p>
          </div>
          <AccreditationLogoMarquee />
        </div>
      </section>

      <div className="container relative z-10 mx-auto max-w-7xl px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12 lg:grid-cols-3">
          <div>
            <div className="mb-4">
              <img src={logoUrl} alt={settings?.company_name || "StudentStaySolutions"} className="h-12" />
            </div>
            <p className="text-white/80 mb-4">
              {footerDescription}
            </p>
            <div className="flex gap-3">
              {socials.map((social) => (
                <Button
                  key={social.name}
                  size="icon"
                  variant="outline"
                  className="bg-white/10 border-white/20 hover:bg-primary hover:border-primary"
                  asChild
                >
                  <a href={social.url} target="_blank" rel="noopener noreferrer" aria-label={social.name}>
                    {social.icon}
                  </a>
                </Button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-lg font-display font-black mb-4 uppercase">QUICK LINKS</h4>
            <ul className="space-y-2">
              {footerNavItems?.map((item) => (
                <li key={item.id}>
                  <a
                    href={item.url}
                    target={item.opens_in_new_tab ? "_blank" : undefined}
                    rel={item.opens_in_new_tab ? "noopener noreferrer" : undefined}
                    className="text-white/80 hover:text-white transition-colors"
                  >
                    {item.title}
                  </a>
                </li>
              ))}
              <li>
                <Link to="/pay-urban-hub-now" className="text-white/80 hover:text-white transition-colors">
                  Pay Urban Hub Now
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-display font-black mb-4 uppercase">CONTACT</h4>
            <ul className="space-y-2 text-white/80">
              <li>
                <a href={`tel:${contactPhone.replace(/\s/g, "")}`} className="hover:text-white transition-colors">
                  {contactPhone}
                </a>
              </li>
              <li>
                <a href={`mailto:${contactEmail}`} className="hover:text-white transition-colors">
                  {contactEmail}
                </a>
              </li>
              <li className="pt-2">
                {contactAddress1}<br />
                {contactAddress2}<br />
                {contactAddress3}
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/20 pt-8 text-sm text-white/60 md:flex-row md:items-center md:justify-between md:gap-8">
          <p className="shrink-0 text-left">
            © {new Date().getFullYear()} Urban Hub Student Accommodation Preston. All rights reserved.
          </p>
          <nav
            className="flex flex-wrap items-center gap-x-4 gap-y-2 md:justify-end"
            aria-label="Legal"
          >
            <Link to="/privacy" className="text-white/80 transition-colors hover:text-white">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-white/80 transition-colors hover:text-white">
              Terms & Conditions
            </Link>
            <Link to="/complaints-policy" className="text-white/80 transition-colors hover:text-white">
              Complaints Policy
            </Link>
            <Link to="/equality-diversity-policy" className="text-white/80 transition-colors hover:text-white">
              Equality & Diversity Policy
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
