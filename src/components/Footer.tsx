import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { FaInstagram, FaTiktok, FaLinkedin, FaFacebook, FaWhatsapp } from "react-icons/fa";
import { useBrandingSettings, useNavigationItems } from "@/hooks/useBranding";
import logo from "@/assets/urban-hub-logo.webp";
import Noise from "@/components/Noise";

const platformConfig: Record<string, { icon: React.ReactNode }> = {
  instagram: { icon: <FaInstagram className="h-5 w-5" /> },
  tiktok: { icon: <FaTiktok className="h-5 w-5" /> },
  linkedin: { icon: <FaLinkedin className="h-5 w-5" /> },
  facebook: { icon: <FaFacebook className="h-5 w-5" /> },
  whatsapp: { icon: <FaWhatsapp className="h-5 w-5" /> },
};

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
    <footer style={{ backgroundColor: 'hsl(0 0% 0%)' }} className="relative text-white py-12 md:py-16 overflow-hidden">
      <Noise patternAlpha={15} />
      <div className="container mx-auto px-4 max-w-7xl relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
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

          <div>
            <h4 className="text-lg font-display font-black mb-4 uppercase">Accreditation</h4>
            <div>
              <div className="flex flex-wrap items-center gap-4">
                <img
                  src="/anuk-logo.png"
                  alt="ANUK Accreditation Network UK"
                  className="h-12 w-auto object-contain brightness-0 invert"
                />
                <img
                  src="/unipol-code-logo.webp"
                  alt="Unipol National Code"
                  className="h-10 w-auto object-contain brightness-0 invert"
                />
              </div>
              <p className="mt-3 text-left text-xs font-medium leading-snug text-white/70">
                The gold standard for student housing in the UK.
              </p>
            </div>
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
