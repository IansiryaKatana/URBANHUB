import { useEffect, useState } from "react";
import { BookOpen, Eye, Home, MessageCircle } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

export type MorphCtaAction = "secure_booking" | "whatsapp" | "vr" | "scroll_rooms";

type CtaConfig = {
  label: string;
  icon: "book" | "chat" | "home" | "vr" | "wa";
  action: MorphCtaAction;
  waText?: string;
};

const CTA_MAP: Record<string, CtaConfig> = {
  why: { label: "Secure Your Studio (£99)", icon: "book", action: "secure_booking" },
  arrival: {
    label: "Plan My Arrival",
    icon: "wa",
    action: "whatsapp",
    waText: "Hi Urban Hub, I'm arriving from abroad and I'd like help planning my arrival.",
  },
  rooms: { label: "See Rooms & Prices", icon: "home", action: "scroll_rooms" },
  community: { label: "Secure Your Studio (£99)", icon: "book", action: "secure_booking" },
  faq: {
    label: "Ask on WhatsApp",
    icon: "wa",
    action: "whatsapp",
    waText: "Hi Urban Hub, I have a question.",
  },
};

const DEFAULT_CTA: CtaConfig = {
  label: "Secure Your Studio (£99)",
  icon: "book",
  action: "secure_booking",
};

const ICON_MAP = {
  book: BookOpen,
  chat: MessageCircle,
  home: Home,
  vr: Eye,
  wa: FaWhatsapp,
};

interface MorphingStickyCtaProps {
  onSecureBooking: () => void;
  onVr: () => void;
  whatsappBaseUrl: string | null;
}

export function MorphingStickyCta({
  onSecureBooking,
  onVr,
  whatsappBaseUrl,
}: MorphingStickyCtaProps) {
  const [visible, setVisible] = useState(false);
  const [cfg, setCfg] = useState<CtaConfig>(DEFAULT_CTA);
  const [labelKey, setLabelKey] = useState("default");

  useEffect(() => {
    const sectionIds = Object.keys(CTA_MAP);

    const update = () => {
      const hero = document.getElementById("intl-hero");
      const finalCta = document.getElementById("intl-final-cta");
      const heroBottom = hero ? hero.getBoundingClientRect().bottom : 0;
      const nearFooter = finalCta
        ? finalCta.getBoundingClientRect().top < window.innerHeight * 0.85
        : false;
      setVisible(heroBottom < 40 && !nearFooter);

      let activeKey: string | null = null;
      let best = Number.POSITIVE_INFINITY;
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const mid = Math.abs(rect.top + rect.height / 2 - window.innerHeight * 0.35);
        if (rect.top < window.innerHeight * 0.55 && rect.bottom > 80 && mid < best) {
          best = mid;
          activeKey = id;
        }
      }
      const next = activeKey ? CTA_MAP[activeKey] : DEFAULT_CTA;
      const nextKey = activeKey || "default";
      setLabelKey((prev) => (prev === nextKey ? prev : nextKey));
      setCfg((prev) =>
        prev.label === next.label && prev.action === next.action ? prev : next,
      );
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const Icon = ICON_MAP[cfg.icon];

  const handleClick = () => {
    if (cfg.action === "secure_booking") {
      onSecureBooking();
      return;
    }
    if (cfg.action === "vr") {
      onVr();
      return;
    }
    if (cfg.action === "scroll_rooms") {
      document.getElementById("rooms")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (cfg.action === "whatsapp" && whatsappBaseUrl) {
      const url = buildWhatsAppUrl(whatsappBaseUrl, cfg.waText);
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const isWa = cfg.action === "whatsapp";

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={`fixed bottom-6 left-6 z-40 flex items-center gap-2.5 rounded-[16px] px-5 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-[0_12px_32px_rgba(0,0,0,0.28)] transition-all duration-300 md:bottom-8 md:left-8 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"
      } ${isWa ? "bg-[#128C7E] hover:bg-[#0E7368]" : "bg-primary hover:bg-primary/90"}`}
    >
      <Icon key={`ico-${labelKey}`} className="h-5 w-5 shrink-0" />
      <span key={`lbl-${labelKey}`}>{cfg.label}</span>
    </button>
  );
}

export function buildWhatsAppUrl(baseUrl: string, text?: string): string {
  try {
    const u = new URL(baseUrl);
    if (text) u.searchParams.set("text", text);
    return u.toString();
  } catch {
    const sep = baseUrl.includes("?") ? "&" : "?";
    return text ? `${baseUrl}${sep}text=${encodeURIComponent(text)}` : baseUrl;
  }
}
