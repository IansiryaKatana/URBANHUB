import { createClient } from "@supabase/supabase-js";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
config({ path: path.join(root, ".env") });

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const folder = path.join(root, "New folder");
const BUCKET = "website";

if (!url || !serviceKey) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

async function ensureTable() {
  // Prefer applying via SQL editor if this fails; upload still attempts insert.
  const { error } = await supabase.from("website_intl_community_images").select("id").limit(1);
  if (error) {
    console.warn("Table check failed (run migration 037 first if needed):", error.message);
  }
}

async function main() {
  await ensureTable();

  const allFiles = (await readdir(folder)).filter((name) => /\.(jpe?g|png|webp)$/i.test(name));

  // Prefer one file per base name (e.g. "not extra (1)") — keep the larger variant
  const byBase = new Map();
  for (const name of allFiles) {
    const base = name.replace(/\.(jpe?g|png|webp)$/i, "").toLowerCase();
    const full = path.join(folder, name);
    const size = (await stat(full)).size;
    const prev = byBase.get(base);
    if (!prev || size > prev.size) byBase.set(base, { name, size });
  }
  const files = [...byBase.values()]
    .map((v) => v.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (!files.length) {
    console.error("No images found in New folder/");
    process.exit(1);
  }

  console.log(`Uploading ${files.length} unique images (from ${allFiles.length} files)…`);

  // Clear existing gallery rows for a clean replace of this set
  const { data: existing } = await supabase.from("website_intl_community_images").select("id, image_path");
  if (existing?.length) {
    const paths = existing.map((r) => r.image_path).filter(Boolean);
    if (paths.length) {
      await supabase.storage.from(BUCKET).remove(paths);
    }
    await supabase.from("website_intl_community_images").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  }

  let order = 0;
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const contentType = MIME[ext] || "image/jpeg";
    const buffer = await readFile(path.join(folder, file));
    const storagePath = `intl-community/${Date.now()}-${order}${ext}`;

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
      contentType,
      upsert: true,
      cacheControl: "3600",
    });
    if (uploadError) {
      console.error(`Upload failed for ${file}:`, uploadError.message);
      continue;
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    const { error: insertError } = await supabase.from("website_intl_community_images").insert({
      image_url: urlData.publicUrl,
      image_path: storagePath,
      alt_text: "Students and community life at Urban Hub",
      display_order: order,
      is_active: true,
    });
    if (insertError) {
      console.error(`Insert failed for ${file}:`, insertError.message);
      continue;
    }

    console.log(`✓ ${file} → ${storagePath}`);
    order += 1;
  }

  console.log(`Done. Inserted ${order} images.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
