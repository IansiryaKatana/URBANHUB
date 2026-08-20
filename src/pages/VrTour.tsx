import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import Navigation from "@/components/Navigation";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { VrTourPreloader } from "@/components/vr/VrTourPreloader";
import { groupNodesByCategory } from "@/data/vrTour";
import { useVrTourConfig } from "@/hooks/useVrTourRooms";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const VrTourViewer = lazy(() =>
  import("@/components/vr/VrTourViewer").then((m) => ({ default: m.VrTourViewer })),
);

type RoomGroups = ReturnType<typeof groupNodesByCategory>;

function RoomsContent({
  groups,
  activeNodeId,
  onSelect,
}: {
  groups: RoomGroups;
  activeNodeId: string | null;
  onSelect: (nodeId: string) => void;
}) {
  return (
    <>
      {groups.length === 0 ? (
        <p className="text-sm text-white/50">No rooms prepared yet.</p>
      ) : (
        <div className="space-y-4">
          {groups.map(({ category, nodes: roomNodes }) => (
            <div key={category}>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-accent-yellow">
                {category}
              </p>
              <ul className="grid grid-cols-1 gap-1.5">
                {roomNodes.map((node) => (
                  <li key={node.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(node.id)}
                      className={cn(
                        "w-full rounded-xl px-3 py-2.5 text-left text-sm leading-snug transition",
                        "whitespace-normal break-words",
                        activeNodeId === node.id
                          ? "bg-primary text-white"
                          : "bg-white/5 text-white/80 hover:bg-white/10",
                      )}
                    >
                      {node.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

const cancelBtnClass =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-semibold text-black transition hover:bg-white/90";

const roomNavArrowClass =
  "pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-zinc-950/85 text-white shadow-lg backdrop-blur-md transition hover:bg-zinc-900";

const VrTour = () => {
  const { nodes, startNodeId } = useVrTourConfig();
  const groups = useMemo(() => groupNodesByCategory(nodes), [nodes]);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [currentName, setCurrentName] = useState("VR Tour");
  const [roomsOpen, setRoomsOpen] = useState(true);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!nodes.length) return;
    const start = nodes.find((n) => n.id === startNodeId) ?? nodes[0];
    setActiveNodeId((prev) => prev ?? start.id);
    setCurrentName((prev) => (prev === "VR Tour" ? start.name : prev));
  }, [nodes, startNodeId]);

  const orderedNodes = useMemo(() => groups.flatMap((group) => group.nodes), [groups]);

  const selectRoom = (nodeId: string) => {
    setActiveNodeId(nodeId);
    // Keep the list open on desktop; close the sheet after picking on mobile.
    if (isMobile) setRoomsOpen(false);
  };

  const goSiblingRoom = (delta: number) => {
    if (orderedNodes.length < 2) return;
    const currentIndex = orderedNodes.findIndex((node) => node.id === activeNodeId);
    const fromIndex = currentIndex >= 0 ? currentIndex : 0;
    const next = orderedNodes[(fromIndex + delta + orderedNodes.length) % orderedNodes.length];
    if (next) selectRoom(next.id);
  };

  const roomsButton = (
    <button
      type="button"
      className="flex w-full items-center gap-3 rounded-xl border border-white/20 bg-zinc-950/85 px-4 py-2.5 text-sm font-semibold text-white shadow-lg backdrop-blur-md transition hover:bg-zinc-900"
      aria-label={`Choose a room. Currently viewing ${currentName}`}
      aria-expanded={roomsOpen}
    >
      <span className="min-w-0 flex-1 truncate text-left">
        {roomsOpen ? `Now viewing: ${currentName}` : currentName}
      </span>
      <ChevronDown
        className={cn("h-4 w-4 shrink-0 transition-transform", roomsOpen && "rotate-180")}
      />
    </button>
  );

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-black text-white">
      <Navigation />
      {/* Offset matches Navigation VR header height (py-2/py-3 + sm controls ≈ 52px / 60px). */}
      <main className="relative flex min-h-0 flex-1 flex-col pt-[3.25rem] md:pt-[3.75rem]">
        <Suspense fallback={<VrTourPreloader className="h-full min-h-0" />}>
          <VrTourViewer
            variant="page"
            className="h-full min-h-0"
            activeNodeId={activeNodeId}
            onNodeChange={(id, name) => {
              setActiveNodeId(id);
              setCurrentName(name);
            }}
          />
        </Suspense>

        {orderedNodes.length > 1 && !(isMobile && roomsOpen) && (
          <div className="pointer-events-none absolute inset-x-0 bottom-12 top-[3.25rem] z-20 md:bottom-0 md:top-[3.75rem]">
            <button
              type="button"
              className={cn(roomNavArrowClass, "absolute left-2 top-1/2 -translate-y-1/2 md:left-[21.5rem]")}
              onClick={() => goSiblingRoom(-1)}
              aria-label="Previous room"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              type="button"
              className={cn(roomNavArrowClass, "absolute right-2 top-1/2 -translate-y-1/2")}
              onClick={() => goSiblingRoom(1)}
              aria-label="Next room"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 p-3 pb-[calc(3.5rem+env(safe-area-inset-bottom))] sm:p-4 sm:pb-[calc(3.75rem+env(safe-area-inset-bottom))] md:inset-x-auto md:bottom-4 md:left-4 md:top-16 md:w-80 md:p-0 md:pb-0">
          <div className="pointer-events-auto mx-auto flex max-w-lg flex-col items-stretch gap-2 md:mx-0 md:h-full md:w-full">
            {isMobile ? (
              <Drawer open={roomsOpen} onOpenChange={setRoomsOpen}>
                <DrawerTrigger asChild>{roomsButton}</DrawerTrigger>
                <DrawerContent className="max-h-[80dvh] rounded-t-3xl border-white/15 bg-zinc-950 text-white">
                  <DrawerTitle className="sr-only">Choose a room</DrawerTitle>
                  <DrawerDescription className="sr-only">
                    Select another room in the Urban Hub virtual tour.
                  </DrawerDescription>
                  <div className="relative overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-12">
                    <DrawerClose asChild>
                      <button type="button" className={cn(cancelBtnClass, "absolute right-3 top-3")}>
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </button>
                    </DrawerClose>
                    <RoomsContent
                      groups={groups}
                      activeNodeId={activeNodeId}
                      onSelect={selectRoom}
                    />
                  </div>
                </DrawerContent>
              </Drawer>
            ) : (
              <>
                {roomsOpen && (
                  <div
                    id="vr-rooms-panel"
                    className="relative min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/15 bg-zinc-950/90 p-4 pt-12 shadow-2xl backdrop-blur-md"
                    role="dialog"
                    aria-label="Jump to a room"
                  >
                    <button
                      type="button"
                      onClick={() => setRoomsOpen(false)}
                      className={cn(cancelBtnClass, "absolute right-3 top-3")}
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </button>
                    <RoomsContent
                      groups={groups}
                      activeNodeId={activeNodeId}
                      onSelect={selectRoom}
                    />
                  </div>
                )}
                <div className="shrink-0" onClick={() => setRoomsOpen((open) => !open)} role="presentation">
                  {roomsButton}
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default VrTour;
