import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { Maximize2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const VrTourViewer = lazy(() =>
  import("@/components/vr/VrTourViewer").then((m) => ({ default: m.VrTourViewer })),
);

export const VR_TOUR_VIDEO_SLOT_KEY = "intl_students_vr_tour_video";

interface VrTourDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ViewerFallback() {
  return (
    <div className="flex aspect-video min-h-[280px] w-full items-center justify-center rounded-xl bg-zinc-900 text-sm text-white/60 sm:min-h-[360px]">
      Loading VR tour…
    </div>
  );
}

export function VrTourDialog({ open, onOpenChange }: VrTourDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl overflow-hidden border-white/10 bg-black p-0 text-white sm:rounded-2xl">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="font-display text-2xl font-black uppercase tracking-wide">
            Tour the studios in VR
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Walk through Urban Hub in 360°, from anywhere in the world. Drag to look · tap arrows to move.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-4">
          {open ? (
            <Suspense fallback={<ViewerFallback />}>
              <VrTourViewer variant="dialog" className="overflow-hidden rounded-xl" />
            </Suspense>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-6 py-4">
          <p className="text-xs text-white/45">Want the full-screen experience?</p>
          <Button
            asChild
            className="rounded-[16px] bg-primary font-bold uppercase tracking-wide text-white hover:bg-primary/90"
            onClick={() => onOpenChange(false)}
          >
            <Link to="/vr-tour">
              <Maximize2 className="mr-2 h-4 w-4" />
              Open full tour
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
