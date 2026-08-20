import { slugifyVrRoomId } from "@/lib/vrPanoramaResize";
import { supabase } from "@/integrations/supabase/client";
import type { VrTourLink } from "@/data/vrTour";
import type { VrTourRoomRow } from "@/hooks/useVrTourRooms";

/** Slugify display name; append -2, -3… if the id is already taken. */
export function uniqueRoomIdFromName(
  name: string,
  existingIds: string[],
  keepId?: string | null,
): string {
  const base = slugifyVrRoomId(name);
  if (!base) return "";
  if (keepId && keepId === base) return keepId;
  if (!existingIds.includes(base) || base === keepId) return base;
  let n = 2;
  while (existingIds.includes(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

/** Build oldId → newId map from room names (stable by display_order). */
export function buildRoomIdMapFromNames(
  rooms: Array<{ id: string; name: string; display_order: number }>,
): Record<string, string> {
  const sorted = [...rooms].sort((a, b) => a.display_order - b.display_order || a.id.localeCompare(b.id));
  const used: string[] = [];
  const map: Record<string, string> = {};
  for (const room of sorted) {
    const next = uniqueRoomIdFromName(room.name, used);
    const id = next || room.id;
    used.push(id);
    map[room.id] = id;
  }
  return map;
}

export function remapVrLinks(links: VrTourLink[] | null | undefined, idMap: Record<string, string>): VrTourLink[] {
  return (links ?? []).map((link) => ({
    ...link,
    nodeId: idMap[link.nodeId] ?? link.nodeId,
  }));
}

function tempIdFor(oldId: string): string {
  // Must match website_vr_tour_rooms_id_format: lowercase slug
  return `tmp-${slugifyVrRoomId(oldId) || "room"}`;
}

/**
 * Rename VR room primary keys to match slugified display names,
 * and rewrite hotspot nodeId references to match.
 */
export async function syncVrRoomIdsFromNames(rooms: VrTourRoomRow[]): Promise<{
  changed: number;
  map: Record<string, string>;
}> {
  const idMap = buildRoomIdMapFromNames(rooms);
  const renames = Object.entries(idMap).filter(([from, to]) => from !== to);
  if (renames.length === 0) {
    return { changed: 0, map: idMap };
  }

  // Phase 1: move changing rooms onto temporary ids to avoid PK collisions
  for (const [oldId] of renames) {
    const tmp = tempIdFor(oldId);
    if (tmp === oldId) throw new Error(`Could not build a temporary id for "${oldId}".`);
    const { error } = await supabase
      .from("website_vr_tour_rooms" as never)
      .update({ id: tmp } as never)
      .eq("id", oldId);
    if (error) throw new Error(`Failed to stage rename for ${oldId}: ${error.message}`);
  }

  // Phase 2: write final ids + remapped links for every room
  for (const room of rooms) {
    const oldId = room.id;
    const finalId = idMap[oldId];
    const currentId = renames.some(([from]) => from === oldId) ? tempIdFor(oldId) : oldId;
    const links = remapVrLinks(room.links, idMap);

    const { error } = await supabase
      .from("website_vr_tour_rooms" as never)
      .update({ id: finalId, links } as never)
      .eq("id", currentId);
    if (error) throw new Error(`Failed to finalize ${oldId} → ${finalId}: ${error.message}`);
  }

  return { changed: renames.length, map: idMap };
}
