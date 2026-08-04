import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  getFirstListedNodeId,
  getPanoramaManifest,
  getStartNodeId as getStaticStartNodeId,
  getVrTourNodes as getStaticVrTourNodes,
  type VrPanoramaUrls,
  type VrTourCategory,
  type VrTourLink,
  type VrTourNode,
} from "@/data/vrTour";

export type VrTourRoomRow = {
  id: string;
  name: string;
  category: VrTourCategory;
  panorama_lg: string | null;
  panorama_sm: string | null;
  panorama_thumb: string | null;
  links: VrTourLink[] | null;
  display_order: number;
  is_active: boolean;
  is_start: boolean;
};

function parseLinks(raw: unknown): VrTourLink[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const link = item as Record<string, unknown>;
      if (typeof link.nodeId !== "string") return null;
      if (typeof link.yaw !== "string" && typeof link.yaw !== "number") return null;
      if (typeof link.pitch !== "string" && typeof link.pitch !== "number") return null;
      return { nodeId: link.nodeId, yaw: link.yaw, pitch: link.pitch } as VrTourLink;
    })
    .filter(Boolean) as VrTourLink[];
}

function rowToManifest(row: VrTourRoomRow): VrPanoramaUrls | null {
  if (!row.panorama_lg || !row.panorama_sm || !row.panorama_thumb) return null;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    lg: row.panorama_lg,
    sm: row.panorama_sm,
    thumb: row.panorama_thumb,
  };
}

export async function fetchVrTourRooms(includeInactive = false): Promise<VrTourRoomRow[]> {
  let query = supabase
    .from("website_vr_tour_rooms" as never)
    .select(
      "id, name, category, panorama_lg, panorama_sm, panorama_thumb, links, display_order, is_active, is_start",
    )
    .order("display_order", { ascending: true });

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) {
    // Table not migrated yet — fall back quietly to static JSON tour
    const missing =
      error.code === "42P01" ||
      /does not exist|could not find the table/i.test(error.message ?? "");
    if (missing) return [];
    throw error;
  }

  return ((data ?? []) as unknown as VrTourRoomRow[]).map((row) => ({
    ...row,
    links: parseLinks(row.links),
  }));
}

export function roomsToTourConfig(rows: VrTourRoomRow[]) {
  const withPanorama = rows.filter((r) => r.panorama_lg && r.panorama_sm && r.panorama_thumb);
  const manifest: Record<string, VrPanoramaUrls> = {};
  const nodes: VrTourNode[] = [];

  for (const row of withPanorama) {
    const urls = rowToManifest(row);
    if (!urls) continue;
    manifest[row.id] = urls;
    nodes.push({
      id: row.id,
      name: row.name,
      category: row.category,
      links: parseLinks(row.links),
    });
  }

  const startNodeId = getFirstListedNodeId(nodes);

  return { manifest, nodes, startNodeId, source: "database" as const };
}

export function useVrTourConfig() {
  const query = useQuery({
    queryKey: ["vr-tour-rooms-public"],
    queryFn: () => fetchVrTourRooms(false),
    staleTime: 60_000,
    retry: 1,
  });

  const config = useMemo(() => {
    if (query.data && query.data.length > 0) {
      const fromDb = roomsToTourConfig(query.data);
      if (fromDb.nodes.length > 0) return fromDb;
    }

    return {
      manifest: getPanoramaManifest(),
      nodes: getStaticVrTourNodes(),
      startNodeId: getStaticStartNodeId(),
      source: "static" as const,
    };
  }, [query.data]);

  return {
    ...config,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
