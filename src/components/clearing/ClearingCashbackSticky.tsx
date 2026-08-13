import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Clock } from "lucide-react";
import { PORTAL_BASE_URL } from "@/config";
import { useSlotUrl } from "@/hooks/useWebsiteImageSlots";
import { isAnyLeadModalOpen, subscribeLeadModalGate } from "@/lib/leadModalGate";
import cashbackStickyFallback from "@/assets/clearing-cashback-sticky.png";

export const CLEARING_CASHBACK_STICKY_SLOT_KEY = "clearing_2026_cashback_sticky";

const MINIMIZED_KEY = "uh_cashback_sticky_minimized";
const REVEALED_KEY = "uh_cashback_sticky_revealed";
const STARTED_KEY = "uh_cashback_sticky_started";
const SHOW_AFTER_MS = 10_000;

type Props = {
  analyticsPrefix?: string;
};

/**
 * Must render outside PageTransition (App-level). Framer Motion's transform
 * on the page wrapper makes position:fixed stick to the page bottom, not the viewport.
 */
export function ClearingCashbackSticky({ analyticsPrefix = "cashback-sticky" }: Props) {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const imageUrl = useSlotUrl(CLEARING_CASHBACK_STICKY_SLOT_KEY, cashbackStickyFallback);
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(REVEALED_KEY) === "1";
  });
  const [minimized, setMinimized] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(MINIMIZED_KEY) === "1";
  });
  const [leadModalOpen, setLeadModalOpen] = useState(() => isAnyLeadModalOpen());

  useEffect(() => {
    return subscribeLeadModalGate(() => {
      setLeadModalOpen(isAnyLeadModalOpen());
    });
  }, []);

  useEffect(() => {
    if (isAdmin || visible) return;

    if (sessionStorage.getItem(REVEALED_KEY) === "1") {
      setVisible(true);
      return;
    }

    const startedAt = Number(sessionStorage.getItem(STARTED_KEY) || 0) || Date.now();
    sessionStorage.setItem(STARTED_KEY, String(startedAt));
    const remaining = Math.max(0, SHOW_AFTER_MS - (Date.now() - startedAt));

    const timer = window.setTimeout(() => {
      sessionStorage.setItem(REVEALED_KEY, "1");
      setVisible(true);
    }, remaining);

    return () => window.clearTimeout(timer);
  }, [isAdmin, visible]);

  if (isAdmin || !visible || !imageUrl || leadModalOpen) return null;

  const minimize = () => {
    setMinimized(true);
    sessionStorage.setItem(MINIMIZED_KEY, "1");
  };

  const expand = () => {
    setMinimized(false);
    sessionStorage.removeItem(MINIMIZED_KEY);
  };

  if (minimized) {
    return (
      <div className="fixed bottom-5 left-5 z-50 md:bottom-6 md:left-6">
        <button
          type="button"
          onClick={expand}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-red-600 shadow-lg ring-2 ring-red-600 transition-transform hover:scale-105"
          aria-label="Show £500 cashback offer"
          data-analytics={`${analyticsPrefix}-expand`}
        >
          <Clock className="h-6 w-6" strokeWidth={2.25} />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 md:bottom-6 md:left-6">
      <div className="relative w-[132px] sm:w-[156px] md:w-[176px]">
        <button
          type="button"
          onClick={minimize}
          className="absolute -right-1 -top-1 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-red-600 shadow-md ring-1 ring-red-600/80 transition-transform hover:scale-110"
          aria-label="Hide cashback offer"
          data-analytics={`${analyticsPrefix}-minimize`}
        >
          <Clock className="h-4 w-4" strokeWidth={2.5} />
        </button>
        <a
          href={PORTAL_BASE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block transition-transform duration-300 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
          data-analytics={`${analyticsPrefix}-portal`}
          aria-label="Get £500 cashback. Open Urban Hub portal to book"
        >
          <img
            src={imageUrl}
            alt="Get £500 cashback. Offer valid 11th August to 5th September 2026"
            className="h-auto w-full drop-shadow-xl"
            width={176}
            height={176}
            decoding="async"
          />
        </a>
      </div>
    </div>
  );
}
