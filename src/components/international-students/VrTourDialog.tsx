import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Set this path when the VR tour video is uploaded (e.g. from CDN or /assets). */
export const VR_TOUR_VIDEO_SRC: string | null = null;

interface VrTourDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VrTourDialog({ open, onOpenChange }: VrTourDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black border-white/10 text-white sm:rounded-2xl">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="font-display text-2xl font-black uppercase tracking-wide">
            Tour the studios in VR
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Walk through Urban Hub in 360°, from anywhere in the world.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-6">
          {VR_TOUR_VIDEO_SRC ? (
            <video
              src={VR_TOUR_VIDEO_SRC}
              controls
              playsInline
              className="w-full aspect-video rounded-xl bg-zinc-900"
            />
          ) : (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl bg-zinc-900 px-6 text-center">
              <p className="font-display text-xl font-black uppercase tracking-wide text-white">
                VR tour video coming soon
              </p>
              <p className="max-w-md text-sm text-white/55">
                We&apos;re uploading the immersive walkthrough. Check back shortly, or ask our team on WhatsApp for a live virtual viewing in the meantime.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
