import panoramas from "./vrTourPanoramas.json";

export const VR_TOUR_CATEGORIES = ["Rooms", "Facilities"] as const;

export type VrTourCategory = (typeof VR_TOUR_CATEGORIES)[number];

/** Legacy DB categories still present until migration 051 is applied. */
const LEGACY_CATEGORY_TO_PANEL: Record<string, VrTourCategory> = {
  Rooms: "Rooms",
  Facilities: "Facilities",
  "Silver studio": "Rooms",
  Outside: "Facilities",
  "Streets View": "Facilities",
  "Reception area": "Facilities",
  "Hallways and stairways": "Facilities",
  "Common areas": "Facilities",
  Courtyard: "Facilities",
};

export function resolveTourPanelCategory(category: string, roomId?: string, roomName?: string): VrTourCategory {
  if (category === "Rooms" || category === "Facilities") return category;
  const mapped = LEGACY_CATEGORY_TO_PANEL[category];
  if (mapped) return mapped;
  const hay = `${roomId ?? ""} ${roomName ?? ""}`.toLowerCase();
  if (/(^|-)(silver|bathroom|private-bathroom)/.test(hay) || /silver room|private bathroom/i.test(hay)) {
    return "Rooms";
  }
  return "Facilities";
}

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
    id: "silver-room",
    name: "Silver Room",
    category: "Rooms",
    links: [{ nodeId: "private-bathroom", yaw: "0deg", pitch: "-10deg" }],
  },
  {
    id: "private-bathroom",
    name: "Private Bathroom",
    category: "Rooms",
    links: [{ nodeId: "silver-room", yaw: "91.2deg", pitch: "-12.9deg" }],
  },
  {
    id: "corridor",
    name: "Corridor",
    category: "Facilities",
    links: [{ nodeId: "silver-room", yaw: "95deg", pitch: "-6deg" }],
  },
];

export const VR_TOUR_START_NODE_ID = "silver-room";

export function getVrTourNodes(): VrTourNode[] {
  const manifest = getPanoramaManifest();
  // Only keep nodes that have prepared panoramas so a partial prep still works
  return VR_TOUR_NODES.filter((n) => Boolean(manifest[n.id]));
}

export function getStartNodeId(): string {
  const nodes = getVrTourNodes();
  return getFirstListedNodeId(nodes) || VR_TOUR_START_NODE_ID;
}

export function groupNodesByCategory(nodes: VrTourNode[] = getVrTourNodes()) {
  const known = VR_TOUR_CATEGORIES.map((category) => ({
    category,
    nodes: nodes.filter(
      (n) => resolveTourPanelCategory(n.category, n.id, n.name) === category,
    ),
  })).filter((g) => g.nodes.length > 0);

  return known;
}

/** First room in the rooms-panel list (category order × room order). */
export function getFirstListedNodeId(nodes: VrTourNode[]): string {
  const groups = groupNodesByCategory(nodes);
  return groups[0]?.nodes[0]?.id ?? nodes[0]?.id ?? "";
}

/** Prefer smaller textures on narrow / low-DPR devices. */
export function pickPanoramaUrl(urls: VrPanoramaUrls, force?: "lg" | "sm"): string {
  if (force) return urls[force];
  if (typeof window === "undefined") return urls.lg;
  const narrow = window.matchMedia("(max-width: 767px)").matches;
  const lowDpr = window.devicePixelRatio < 1.5;
  return narrow || lowDpr ? urls.sm : urls.lg;
}
