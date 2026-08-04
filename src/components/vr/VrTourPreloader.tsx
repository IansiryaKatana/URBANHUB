import logoUrl from "@/assets/urban-hub-logo.webp";
import { cn } from "@/lib/utils";

type VrTourPreloaderProps = {
  className?: string;
  label?: string;
};

export function VrTourPreloader({
  className,
  label = "Loading tour",
}: VrTourPreloaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-5 bg-black px-6",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="relative flex h-20 w-20 items-center justify-center">
        <span
          className="absolute inset-0 rounded-full border border-white/10"
          aria-hidden
        />
        <span
          className="absolute inset-0 animate-[vr-loader-spin_1.1s_linear_infinite] rounded-full border-2 border-transparent border-t-accent-yellow border-r-accent-yellow/40"
          aria-hidden
        />
        <img
          src={logoUrl}
          alt=""
          className="h-9 w-auto object-contain opacity-95"
        />
      </div>
      <div className="text-center">
        <p className="font-display text-sm font-bold uppercase tracking-[0.22em] text-white">
          Urban Hub
        </p>
        <p className="mt-1.5 text-xs font-medium tracking-wide text-white/50">
          {label}
        </p>
      </div>
    </div>
  );
}

export default VrTourPreloader;
