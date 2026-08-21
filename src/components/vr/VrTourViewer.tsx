import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Viewer } from "@photo-sphere-viewer/core";
import { VirtualTourPlugin } from "@photo-sphere-viewer/virtual-tour-plugin";
import { MarkersPlugin } from "@photo-sphere-viewer/markers-plugin";
import { GalleryPlugin } from "@photo-sphere-viewer/gallery-plugin";
import { GyroscopePlugin } from "@photo-sphere-viewer/gyroscope-plugin";
import { StereoPlugin } from "@photo-sphere-viewer/stereo-plugin";
import "@photo-sphere-viewer/core/index.css";
import "@photo-sphere-viewer/markers-plugin/index.css";
import "@photo-sphere-viewer/gallery-plugin/index.css";
import "@photo-sphere-viewer/virtual-tour-plugin/index.css";
import logoUrl from "@/assets/urban-hub-logo.webp";
import { VrTourPreloader } from "@/components/vr/VrTourPreloader";
import { pickPanoramaUrl, type VrPanoramaUrls, type VrTourNode } from "@/data/vrTour";
import { useVrTourConfig } from "@/hooks/useVrTourRooms";
import { pushDataLayer } from "@/utils/dataLayer";
import { cn } from "@/lib/utils";

type VrTourViewerProps = {
  variant?: "page" | "dialog";
  className?: string;
  /** Called whenever the active room changes */
  onNodeChange?: (nodeId: string, name: string) => void;
  /** Imperative room jump from parent room list */
  activeNodeId?: string | null;
};

/** PSV only listens for mousedown on look-around arrows and hides them on touch. */
const MOVE_HOLD_MS = 200;

type MoveRoll = { yaw?: boolean; pitch?: boolean };

function rollForMoveButton(btn: HTMLElement, index: number): MoveRoll | null {
  const rotate = btn.querySelector("g")?.getAttribute("transform") ?? "";
  const match = /rotate\((-?\d+)/.exec(rotate);
  const angle = match ? Number(match[1]) : null;
  if (angle === 0) return { yaw: true };
  if (angle === 180) return { yaw: false };
  if (angle === 90) return { pitch: false };
  if (angle === -90) return { pitch: true };
  return ([{ yaw: true }, { yaw: false }, { pitch: false }, { pitch: true }] as MoveRoll[])[index] ?? null;
}

function bindNavbarMoveButtons(viewer: Viewer, root: HTMLElement) {
  const moveViewer = viewer as Viewer & {
    dynamics?: { position?: { roll: (axes: MoveRoll) => void; stop: () => void } };
    resetIdleTimer?: () => void;
  };
  const dynamics = moveViewer.dynamics?.position;
  if (!dynamics) return () => undefined;

  const cleanups: Array<() => void> = [];

  root.querySelectorAll<HTMLElement>(".psv-move-button").forEach((btn, index) => {
    const roll = rollForMoveButton(btn, index);
    if (!roll) return;

    btn.style.removeProperty("display");
    btn.style.touchAction = "none";

    let holding = false;
    let pressedAt = 0;
    let stopTimer: ReturnType<typeof setTimeout> | undefined;

    const start = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      if (holding) return;
      holding = true;
      if (stopTimer) {
        clearTimeout(stopTimer);
        stopTimer = undefined;
      }
      pressedAt = Date.now();
      try {
        viewer.stopAll();
      } catch {
        /* viewer may already be idle */
      }
      dynamics.roll(roll);
      try {
        btn.setPointerCapture(event.pointerId);
      } catch {
        /* capture is best-effort on older WebViews */
      }
    };

    const stop = () => {
      if (!holding) return;
      holding = false;
      const finish = () => {
        dynamics.stop();
        moveViewer.resetIdleTimer?.();
      };
      const elapsed = Date.now() - pressedAt;
      if (elapsed < MOVE_HOLD_MS) {
        stopTimer = setTimeout(finish, MOVE_HOLD_MS - elapsed);
      } else {
        finish();
      }
    };

    const preventCallout = (event: Event) => event.preventDefault();

    btn.addEventListener("pointerdown", start, { passive: false });
    btn.addEventListener("pointerup", stop);
    btn.addEventListener("pointercancel", stop);
    btn.addEventListener("lostpointercapture", stop);
    btn.addEventListener("contextmenu", preventCallout);

    cleanups.push(() => {
      if (stopTimer) clearTimeout(stopTimer);
      if (holding) dynamics.stop();
      btn.removeEventListener("pointerdown", start);
      btn.removeEventListener("pointerup", stop);
      btn.removeEventListener("pointercancel", stop);
      btn.removeEventListener("lostpointercapture", stop);
      btn.removeEventListener("contextmenu", preventCallout);
    });
  });

  return () => cleanups.forEach((fn) => fn());
}

function buildTourNodes(
  graph: VrTourNode[],
  manifest: Record<string, VrPanoramaUrls>,
  preferSmall: boolean,
) {
  const known = new Set(graph.map((n) => n.id));

  return graph
    .filter((n) => manifest[n.id])
    .map((node: VrTourNode) => {
      const urls = manifest[node.id];
      const panorama = preferSmall ? urls.sm : pickPanoramaUrl(urls);
      return {
        id: node.id,
        name: node.name,
        caption: node.name,
        thumbnail: urls.thumb,
        panorama,
        links: node.links
          .filter((l) => known.has(l.nodeId) && manifest[l.nodeId])
          .map((l) => ({
            nodeId: l.nodeId,
            position: { yaw: l.yaw, pitch: l.pitch },
          })),
        markers: [
          {
            id: `nadir-${node.id}`,
            imageLayer: logoUrl,
            position: { yaw: 0, pitch: -Math.PI / 2 },
            size: { width: 220, height: 220 },
            opacity: 0.92,
            tooltip: "Urban Hub",
            data: { nadir: true },
          },
        ],
      };
    });
}

export function VrTourViewer({
  variant = "page",
  className,
  onNodeChange,
  activeNodeId,
}: VrTourViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const tourRef = useRef<VirtualTourPlugin | null>(null);
  const markersRef = useRef<MarkersPlugin | null>(null);
  const [searchParams] = useSearchParams();
  const calibrate = searchParams.get("calibrate") === "1";
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [calibrateHint, setCalibrateHint] = useState<string | null>(null);
  const openedRef = useRef(false);
  const onNodeChangeRef = useRef(onNodeChange);
  onNodeChangeRef.current = onNodeChange;

  const { nodes: graph, manifest, startNodeId, isLoading } = useVrTourConfig();
  const nodesAvailable = graph.length > 0;

  const destroyViewer = useCallback(() => {
    if (viewerRef.current) {
      viewerRef.current.destroy();
      viewerRef.current = null;
      tourRef.current = null;
      markersRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || isLoading) return;
    if (!nodesAvailable) {
      setReady(false);
      setError(null);
      return;
    }

    setReady(false);
    setError(null);

    const preferSmall =
      typeof window !== "undefined" &&
      (window.matchMedia("(max-width: 767px)").matches || window.devicePixelRatio < 1.5);

    const nodes = buildTourNodes(graph, manifest, preferSmall);
    if (!nodes.length) {
      setError("No VR panoramas are ready yet. Upload rooms in Admin → VR Tour.");
      return;
    }

    const resolvedStart =
      startNodeId && nodes.some((n) => n.id === startNodeId) ? startNodeId : nodes[0].id;
    let cancelled = false;
    let unbindMoveButtons = () => {};

    try {
      const viewer = new Viewer({
        container: containerRef.current,
        navbar: ["zoom", "move", "gallery", "gyroscope", "stereo", "fullscreen"],
        // 0 = maxFov (widest); keep FOV wide so rooms open zoomed out
        defaultZoomLvl: 0,
        maxFov: 110,
        minFov: 30,
        mousewheelCtrlKey: false,
        touchmoveTwoFingers: false,
        loadingTxt: "",
        lang: {
          fullscreen: "Fullscreen",
          gyroscope: "Look around (gyro)",
          stereo: "Cardboard VR",
          gallery: "Rooms",
          ctrlZoom: "Scroll to zoom · drag to look around",
        },
        plugins: [
          MarkersPlugin.withConfig({}),
          GalleryPlugin.withConfig({
            hideOnClick: true,
            navigationArrows: true,
          }),
          GyroscopePlugin,
          StereoPlugin,
          VirtualTourPlugin.withConfig({
            dataMode: "client",
            positionMode: "manual",
            renderMode: "3d",
            preload: true,
            startNodeId: resolvedStart,
            nodes,
            transitionOptions: {
              showLoader: false,
              speed: "20rpm",
              effect: "fade",
              rotation: true,
            },
          }),
        ],
      });

      if (cancelled) {
        viewer.destroy();
        return;
      }

      viewerRef.current = viewer;
      unbindMoveButtons = bindNavbarMoveButtons(viewer, containerRef.current);
      const tour = viewer.getPlugin(VirtualTourPlugin) as VirtualTourPlugin;
      const markers = viewer.getPlugin(MarkersPlugin) as MarkersPlugin;
      tourRef.current = tour;
      markersRef.current = markers;

      tour.addEventListener("node-changed", ({ node }) => {
        setCurrentNodeId(node.id);
        onNodeChangeRef.current?.(node.id, node.name || node.id);
        pushDataLayer("vr_tour_room", {
          event_action: "room_change",
          event_label: node.id,
          page_path: typeof window !== "undefined" ? window.location.pathname : "/vr-tour",
          element_id: node.id,
        });
      });

      viewer.addEventListener("ready", () => {
        setReady(true);
        if (!openedRef.current) {
          openedRef.current = true;
          pushDataLayer("vr_tour_open", {
            event_action: "open",
            event_label: variant,
            page_path: typeof window !== "undefined" ? window.location.pathname : "/vr-tour",
          });
        }
      });

      if (calibrate) {
        viewer.addEventListener("click", ({ data }) => {
          if (!data?.rightclick && data?.yaw != null && data?.pitch != null) {
            const yawDeg = `${((data.yaw * 180) / Math.PI).toFixed(1)}deg`;
            const pitchDeg = `${((data.pitch * 180) / Math.PI).toFixed(1)}deg`;
            const snippet = `{ nodeId: "TARGET_ID", yaw: "${yawDeg}", pitch: "${pitchDeg}" }`;
            setCalibrateHint(snippet);
            void navigator.clipboard?.writeText(snippet).catch(() => undefined);
            markers.clearMarkers();
            markers.addMarker({
              id: "calibrate-pin",
              position: { yaw: data.yaw, pitch: data.pitch },
              circle: 12,
              svgStyle: {
                fill: "rgba(236, 72, 153, 0.85)",
                stroke: "#fff",
                strokeWidth: "2px",
              },
              tooltip: snippet,
            });
          }
        });
      }
    } catch (err) {
      console.error("[VrTourViewer]", err);
      setError(err instanceof Error ? err.message : "Failed to start VR viewer");
    }

    return () => {
      cancelled = true;
      unbindMoveButtons();
      destroyViewer();
    };
  }, [
    variant,
    nodesAvailable,
    isLoading,
    calibrate,
    destroyViewer,
    graph,
    manifest,
    startNodeId,
  ]);

  useEffect(() => {
    if (!ready || !activeNodeId || !tourRef.current || activeNodeId === currentNodeId) return;
    try {
      tourRef.current.setCurrentNode(activeNodeId);
    } catch (err) {
      console.warn("[VrTourViewer] setCurrentNode failed:", err);
    }
  }, [ready, activeNodeId, currentNodeId]);

  if (isLoading) {
    return (
      <VrTourPreloader
        className={cn(
          variant === "dialog" ? "aspect-video min-h-[280px]" : "min-h-[60vh]",
          className,
        )}
      />
    );
  }

  if (!nodesAvailable) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-zinc-950 text-center text-white/70",
          variant === "dialog" ? "aspect-video min-h-[240px]" : "min-h-[60vh]",
          className,
        )}
      >
        <div className="max-w-md space-y-2 px-6">
          <p className="font-display text-xl font-black uppercase tracking-wide text-white">
            VR tour coming soon
          </p>
          <p className="text-sm text-white/55">
            Panoramas are being prepared. Ask our team on WhatsApp for a live virtual viewing in the
            meantime.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("vr-tour-viewer relative overflow-hidden bg-black", className)}>
      <div
        ref={containerRef}
        className={cn(
          "h-full w-full",
          variant === "dialog" ? "aspect-video min-h-[280px] sm:min-h-[360px]" : "min-h-0",
        )}
        aria-label="Urban Hub 360 virtual tour"
      />
      {!ready && !error && (
        <VrTourPreloader className="pointer-events-none absolute inset-0 z-10" />
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950 px-6 text-center text-sm text-red-300">
          {error}
        </div>
      )}
      {calibrate && (
        <div
          className={cn(
            "absolute z-20 max-w-sm rounded-xl bg-black/80 px-3 py-2 text-xs text-white shadow-lg backdrop-blur",
            // Page tour keeps room picker top-left — put calibrate on the opposite corner
            variant === "page" ? "right-3 top-3 sm:right-4" : "left-3 top-3",
          )}
        >
          <p className="font-semibold text-pink-400">Calibrate mode</p>
          <p className="mt-1 text-white/70">Click the panorama to copy a hotspot snippet.</p>
          {calibrateHint && (
            <code className="mt-2 block break-all rounded bg-white/10 p-2 text-[10px] text-emerald-300">
              {calibrateHint}
            </code>
          )}
        </div>
      )}
    </div>
  );
}

export default VrTourViewer;
