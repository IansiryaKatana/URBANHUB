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
              className="basis-[78%] pl-3 sm:basis-[48%] md:basis-[36%] lg:basis-[22%] md:pl-4"
            >
              <article className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-zinc-800">
                {step.image_url ? (
                  <img
                    src={step.image_url}
                    alt={step.title}
                    className="absolute inset-0 h-full w-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-700 to-zinc-900" />
                )}

                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />

                <div className="absolute inset-x-0 bottom-0 z-10 space-y-1 p-5 md:p-6">
                  <p className="font-display text-[11px] font-bold uppercase tracking-[0.22em] text-white/70">
                    {String(index + 1).padStart(2, "0")}
                  </p>
                  <h3 className="font-display text-xl font-black uppercase leading-[1.05] tracking-wide text-white md:text-2xl">
                    {step.title}
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
