/**
 * Reorganize VR room names + display order for Rooms / Facilities panel.
 * Also attempts to apply category migration 051.
 *
 *   node --env-file=.env scripts/reorganize-vr-rooms.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

const PLAN = [
  { id: "silver-studio", name: "Silver Room", category: "Rooms", display_order: 0 },
  { id: "bathroom", name: "Private Bathroom", category: "Rooms", display_order: 1 },
  { id: "courtyard", name: "Courtyard", category: "Facilities", display_order: 2 },
  { id: "courtyard-2", name: "Courtyard", category: "Facilities", display_order: 3 },
  { id: "outer-area", name: "Entrance to reception & Tesco", category: "Facilities", display_order: 4 },
  { id: "reception", name: "Reception", category: "Facilities", display_order: 5 },
  { id: "common-room", name: "Common Room", category: "Facilities", display_order: 6 },
  { id: "common-kitchen", name: "Common Kitchen", category: "Facilities", display_order: 7 },
  { id: "game-room", name: "Game Room", category: "Facilities", display_order: 8 },
  { id: "gym", name: "Gym", category: "Facilities", display_order: 9 },
  { id: "laundry-room", name: "Laundry Room", category: "Facilities", display_order: 10 },
  { id: "cinema-room", name: "Cinema Room", category: "Facilities", display_order: 11 },
  { id: "study-area", name: "Study", category: "Facilities", display_order: 12 },
  { id: "snug-area", name: "Snug", category: "Facilities", display_order: 13 },
  { id: "corridor", name: "Corridor", category: "Facilities", display_order: 14 },
  { id: "stairways", name: "Stairways", category: "Facilities", display_order: 15 },
  { id: "moor-lane", name: "Moor Lane", category: "Facilities", display_order: 16 },
  { id: "castle-st", name: "Castle St", category: "Facilities", display_order: 17 },
  { id: "ashmoor-st", name: "Ashmoor St", category: "Facilities", display_order: 18 },
  { id: "sizer-st", name: "Sizer St", category: "Facilities", display_order: 19 },
  { id: "tesco", name: "Tesco", category: "Facilities", display_order: 20 },
  { id: "common-area", name: "Common Area", category: "Facilities", display_order: 21 },
];

function slugify(input) {
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueId(name, used) {
  const base = slugify(name) || "room";
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

function tempId(oldId) {
  return `tmp-${slugify(oldId) || "room"}`;
}

async function applyCategoryMigration() {
  const sql = readFileSync(
    resolve("supabase/migrations/051_vr_tour_rooms_facilities_categories.sql"),
    "utf8",
  );
  // Prefer PostgREST isn't usable for DDL. Try supabase management via fetch if token exists — skip.
  // Instead: use the SQL editor API is not available. We'll drop constraint by updating
  // through a workaround — run statements individually after installing `postgres` package dynamically.
  try {
    const { default: postgres } = await import("postgres");
    const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("no db url");
    const sqlClient = postgres(dbUrl, { ssl: "require", max: 1 });
    await sqlClient.unsafe(sql);
    await sqlClient.end();
    console.log("Applied migration 051 via DATABASE_URL");
    return true;
  } catch (err) {
    console.log("Could not apply DDL automatically:", err.message || err);
    return false;
  }
}

const ddlOk = await applyCategoryMigration();

const { data: rooms, error } = await supabase
  .from("website_vr_tour_rooms")
  .select("id, name, category, links, display_order");
if (error) {
  console.error(error);
  process.exit(1);
}
const byId = new Map(rooms.map((r) => [r.id, r]));

for (const item of PLAN) {
  if (!byId.has(item.id)) {
    console.warn("Missing:", item.id);
    continue;
  }
  const payload = {
    name: item.name,
    display_order: item.display_order,
  };
  if (ddlOk) payload.category = item.category;
  else {
    // Keep compatible legacy categories until migration is applied
    payload.category = item.category === "Rooms" ? "Silver studio" : "Common areas";
  }
  const { error: uErr } = await supabase
    .from("website_vr_tour_rooms")
    .update(payload)
    .eq("id", item.id);
  if (uErr) console.error(`Update ${item.id}:`, uErr.message);
  else console.log(`OK ${item.id} → ${item.name}`);
}

if (ddlOk) {
  // Force Facilities/Rooms for any leftover rows
  for (const room of rooms) {
    const planned = PLAN.find((p) => p.id === room.id);
    if (planned) continue;
    await supabase
      .from("website_vr_tour_rooms")
      .update({ category: "Facilities" })
      .eq("id", room.id);
  }
}

const { data: after } = await supabase
  .from("website_vr_tour_rooms")
  .select("id, name, links, display_order")
  .order("display_order");

const used = new Set();
const idMap = {};
for (const room of after) {
  const next = uniqueId(room.name, used);
  used.add(next);
  idMap[room.id] = next;
}

const renames = Object.entries(idMap).filter(([a, b]) => a !== b);
if (!renames.length) {
  console.log("No ID renames needed.");
  process.exit(0);
}

for (const [oldId] of renames) {
  const { error: e1 } = await supabase
    .from("website_vr_tour_rooms")
    .update({ id: tempId(oldId) })
    .eq("id", oldId);
  if (e1) {
    console.error("Stage fail", oldId, e1.message);
    process.exit(1);
  }
}

for (const room of after) {
  const finalId = idMap[room.id];
  const currentId = renames.some(([f]) => f === room.id) ? tempId(room.id) : room.id;
  const links = (room.links || []).map((l) => ({
    ...l,
    nodeId: idMap[l.nodeId] ?? l.nodeId,
  }));
  const { error: e2 } = await supabase
    .from("website_vr_tour_rooms")
    .update({ id: finalId, links })
    .eq("id", currentId);
  if (e2) {
    console.error("Finalize fail", room.id, "→", finalId, e2.message);
    process.exit(1);
  }
  console.log(`ID ${room.id} → ${finalId}`);
}

console.log("Done.");
