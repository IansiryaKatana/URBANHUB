import panoramas from "./vrTourPanoramas.json";

export const VR_TOUR_CATEGORIES = [
  "Common areas",
  "Courtyard",
  "Hallways and stairways",
  "Outside",
  "Reception area",
  "Silver studio",
  "Streets View",
] as const;

export type VrTourCategory = (typeof VR_TOUR_CATEGORIES)[number];

export type VrTourLink = {
  nodeId: string;
  /** Spherical yaw — degrees string ("45deg") or radians number */
  yaw: number | string;
  /** Spherical pitch — degrees string or radians number */
  pitch: number | string;
};

export type VrTourNode = {
  id: string;
  name: string;
  category: VrTourCategory;
  links: VrTourLink[];
};

export type VrPanoramaUrls = {
  id: string;
  name: string;
  category: string;
  lg: string;
  sm: string;
  thumb: string;
};

function isPanoramaEntry(value: unknown): value is VrPanoramaUrls {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.lg === "string" &&
    typeof v.sm === "string" &&
    typeof v.thumb === "string"
  );
}

/** Manifest produced by prep-vr-panoramas.mjs (room id → web-ready URLs). */
export function getPanoramaManifest(): Record<string, VrPanoramaUrls> {
  const out: Record<string, VrPanoramaUrls> = {};
  for (const [key, value] of Object.entries(panoramas as Record<string, unknown>)) {
    if (key.startsWith("_")) continue;
    if (isPanoramaEntry(value)) out[key] = value;
  }
  return out;
}

/**
 * Scene graph: rooms + hotspot links.
 * Place hotspots with /vr-tour?calibrate=1 (click copies { yaw, pitch }).
 *
 * When you add a new room via the prep script, add a matching node here
 * (and bidirectional links) so VirtualTourPlugin can navigate between them.
 */
export const VR_TOUR_NODES: VrTourNode[] = [
  {
    id: "01-outside-front",
    name: "Outside Front",
    category: "Outside",
    links: [
      // Path toward the curved brick building entrance (centre of panorama)
      { nodeId: "02-corridor", yaw: "8deg", pitch: "-12deg" },
    ],
  },
  {
    id: "02-corridor",
    name: "Corridor",
    category: "Hallways and stairways",
    links: [
      // Toward the exit / lift lobby (right of door 186 in the capture)
      { nodeId: "01-outside-front", yaw: "95deg", pitch: "-6deg" },
    ],
  },
];

export const VR_TOUR_START_NODE_ID = "01-outside-front";

export function getVrTourNodes(): VrTourNode[] {
  const manifest = getPanoramaManifest();
  // Only keep nodes that have prepared panoramas so a partial prep still works
  return VR_TOUR_NODES.filter((n) => Boolean(manifest[n.id]));
}

export function getStartNodeId(): string {
  const nodes = getVrTourNodes();
  if (nodes.some((n) => n.id === VR_TOUR_START_NODE_ID)) return VR_TOUR_START_NODE_ID;
  return nodes[0]?.id ?? VR_TOUR_START_NODE_ID;
}

export function groupNodesByCategory(nodes: VrTourNode[] = getVrTourNodes()) {
  const known = VR_TOUR_CATEGORIES.map((category) => ({
    category,
    nodes: nodes.filter((n) => n.category === category),
  })).filter((g) => g.nodes.length > 0);

  const knownSet = new Set<string>(VR_TOUR_CATEGORIES);
  const extras = [...new Set(nodes.map((n) => n.category).filter((c) => !knownSet.has(c)))].map(
    (category) => ({
      category,
      nodes: nodes.filter((n) => n.category === category),
    }),
  );

  return [...known, ...extras];
}

/** Prefer smaller textures on narrow / low-DPR devices. */
export function pickPanoramaUrl(urls: VrPanoramaUrls, force?: "lg" | "sm"): string {
  if (force) return urls[force];
  if (typeof window === "undefined") return urls.lg;
  const narrow = window.matchMedia("(max-width: 767px)").matches;
  const lowDpr = window.devicePixelRatio < 1.5;
  return narrow || lowDpr ? urls.sm : urls.lg;
}
