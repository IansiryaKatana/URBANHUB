import { Fragment } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselDots,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import type { IntlArrivalStep } from "@/hooks/useIntlArrivalSteps";

type ArrivalCoverflowProps = {
  steps: IntlArrivalStep[];
  className?: string;
};

/** Prefer admin newlines; otherwise break long titles near the middle. */
function titleLines(title: string): string[] {
  const normalized = title.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  if (normalized.includes("\n")) {
    return normalized.split("\n").map((l) => l.trim()).filter(Boolean);
  }

  const words = normalized.split(/\s+/);
  if (words.length <= 3) return [normalized];

  if (words.length >= 7) {
    const a = Math.ceil(words.length / 3);
    const b = Math.ceil((2 * words.length) / 3);
    return [
      words.slice(0, a).join(" "),
      words.slice(a, b).join(" "),
      words.slice(b).join(" "),
    ];
  }

  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

function TitleWithBreaks({ title }: { title: string }) {
  const lines = titleLines(title);
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={`${i}-${line}`}>
          {i > 0 ? <br /> : null}
          {line}
        </Fragment>
      ))}
    </>
  );
}

/** Flat portrait card strip — no 3D coverflow, no icons. */
export function ArrivalCoverflow({ steps, className }: ArrivalCoverflowProps) {
  if (!steps.length) return null;

  return (
    <div className={cn("relative w-full py-4 md:py-6", className)}>
      <Carousel
        opts={{
          align: "start",
          loop: false,
          dragFree: false,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-3 md:-ml-4">
          {steps.map((step, index) => (
            <CarouselItem
              key={step.id}
              className="basis-[85%] pl-3 sm:basis-1/2 md:basis-1/3 md:pl-4"
            >
              <article className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-zinc-800">
                {step.image_url ? (
                  <img
                    src={step.image_url}
                    alt={step.title.replace(/\n/g, " ")}
                    className="absolute inset-0 h-full w-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-700 to-zinc-900" />
                )}

                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 z-10 space-y-1 p-5 md:p-6">
                  <p className="font-display text-[11px] font-black uppercase tracking-[0.22em] text-white/70">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="font-display text-xl font-black uppercase leading-[1.05] tracking-wide text-white md:text-2xl [font-weight:900]">
                    <TitleWithBreaks title={step.title} />
                  </h3>
                  {step.description ? (
                    <p className="max-w-[92%] text-xs leading-relaxed text-white/75 md:text-sm">
                      {step.description}
                    </p>
                  ) : null}
                </div>
              </article>
            </CarouselItem>
          ))}
        </CarouselContent>

        <CarouselDots className="mt-6" />
      </Carousel>
    </div>
  );
}
