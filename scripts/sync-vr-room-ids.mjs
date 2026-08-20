/**
 * One-off: rename website_vr_tour_rooms ids to slugified display names
 * and remap hotspot links.
 *
 *   node --env-file=.env scripts/sync-vr-room-ids.mjs
 */
import { createClient } from "@supabase/supabase-js";

function slugifyVrRoomId(input) {
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/\.(jpe?g|png|webp|tiff?)$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueRoomIdFromName(name, existingIds) {
  const base = slugifyVrRoomId(name);
  if (!base) return "";
  if (!existingIds.includes(base)) return base;
  let n = 2;
  while (existingIds.includes(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

function buildRoomIdMapFromNames(rooms) {
  const sorted = [...rooms].sort(
    (a, b) => a.display_order - b.display_order || a.id.localeCompare(b.id),
  );
  const used = [];
  const map = {};
  for (const room of sorted) {
    const next = uniqueRoomIdFromName(room.name, used) || room.id;
    used.push(next);
    map[room.id] = next;
  }
  return map;
}

function remapLinks(links, idMap) {
  return (links ?? []).map((link) => ({
    ...link,
    nodeId: idMap[link.nodeId] ?? link.nodeId,
  }));
}

function tempIdFor(oldId) {
  return `tmp-${slugifyVrRoomId(oldId) || "room"}`;
}

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL / service role key");
  process.exit(1);
}

const supabase = createClient(url, key);

const { data: rooms, error } = await supabase
  .from("website_vr_tour_rooms")
  .select("id, name, links, display_order, is_start")
  .order("display_order", { ascending: true });

if (error) {
  console.error(error);
  process.exit(1);
}

const idMap = buildRoomIdMapFromNames(rooms);
const renames = Object.entries(idMap).filter(([from, to]) => from !== to);

console.log("Planned renames:");
for (const [from, to] of renames) {
  console.log(`  ${from} → ${to}`);
}
if (!renames.length) {
  console.log("Nothing to change.");
  process.exit(0);
}

for (const [oldId] of renames) {
  const tmp = tempIdFor(oldId);
  const { error: e1 } = await supabase
    .from("website_vr_tour_rooms")
    .update({ id: tmp })
    .eq("id", oldId);
  if (e1) {
    console.error(`Stage failed ${oldId}:`, e1.message);
    process.exit(1);
  }
}

for (const room of rooms) {
  const oldId = room.id;
  const finalId = idMap[oldId];
  const currentId = renames.some(([from]) => from === oldId) ? tempIdFor(oldId) : oldId;
  const links = remapLinks(room.links, idMap);
  const { error: e2 } = await supabase
    .from("website_vr_tour_rooms")
    .update({ id: finalId, links })
    .eq("id", currentId);
  if (e2) {
    console.error(`Finalize failed ${oldId} → ${finalId}:`, e2.message);
    process.exit(1);
  }
  console.log(`OK ${oldId} → ${finalId}`);
}

console.log(`Done. Updated ${renames.length} room ids.`);
