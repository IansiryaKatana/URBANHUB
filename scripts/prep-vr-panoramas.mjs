/**
 * Resize equirectangular 360 sources and upload web-ready WebP variants.
 *
 * Usage:
 *   node scripts/prep-vr-panoramas.mjs
 *   node scripts/prep-vr-panoramas.mjs --skip-upload   # write public/vr-tour/ + local URLs only
 *
 * Drop originals in vr-source/ named like: 01-outside-front.jpg
 * Outputs: -lg 6144x3072, -sm 4096x2048, -thumb 512x256 WebP under vr-tour/
 * Writes: src/data/vrTourPanoramas.json
 */
import { createClient } from "@supabase/supabase-js";
import { readdir, mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
config({ path: path.join(root, ".env") });

const skipUpload = process.argv.includes("--skip-upload");
const SOURCE_DIR = path.join(root, "vr-source");
const OUT_DIR = path.join(root, "public", "vr-tour");
const MANIFEST_PATH = path.join(root, "src", "data", "vrTourPanoramas.json");
const BUCKET = "website";
const STORAGE_PREFIX = "vr-tour";

const VARIANTS = [
  { suffix: "lg", width: 6144, height: 3072, quality: 80 },
  { suffix: "sm", width: 4096, height: 2048, quality: 75 },
  { suffix: "thumb", width: 512, height: 256, quality: 70 },
];

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

function slugFromFilename(name) {
  return name
    .replace(/\.(jpe?g|png|webp|tiff?)$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function labelFromSlug(slug) {
  // 01-outside-front → Outside Front
  return slug
    .replace(/^\d+-/, "")
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function categoryFromSlug(slug) {
  const body = slug.replace(/^\d+-/, "");
  if (/street/.test(body)) return "Streets View";
  if (/courtyard/.test(body)) return "Courtyard";
  if (/reception/.test(body)) return "Reception area";
  if (/silver/.test(body)) return "Silver studio";
  if (/hallway|stair|corridor|lift|lobby/.test(body)) return "Hallways and stairways";
  if (/outside|exterior|entrance|front|parking/.test(body)) return "Outside";
  if (/common|gym|laundry|kitchen|lounge|cinema|games|study/.test(body)) return "Common areas";
  if (/studio|room|ensuite|classic|premium|deluxe|apartment/.test(body)) return "Silver studio";
  return "Common areas";
}

async function main() {
  const files = (await readdir(SOURCE_DIR))
    .filter((name) => /\.(jpe?g|png|webp|tiff?)$/i.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  if (!files.length) {
    console.error(`No images found in ${SOURCE_DIR}`);
    console.error("Drop equirectangular 360 JPGs named like 01-outside-front.jpg");
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(path.dirname(MANIFEST_PATH), { recursive: true });

  let supabase = null;
  if (!skipUpload) {
    if (!url || !serviceKey) {
      console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_SERVICE_ROLE_KEY in .env");
      console.error("Re-run with --skip-upload to write local public/vr-tour/ only.");
      process.exit(1);
    }
    supabase = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  /** @type {Record<string, { id: string; name: string; category: string; lg: string; sm: string; thumb: string }>} */
  const manifest = {};

  console.log(`Processing ${files.length} panorama(s)${skipUpload ? " (local only)" : ""}…`);

  for (const file of files) {
    const id = slugFromFilename(file);
    const srcPath = path.join(SOURCE_DIR, file);
    const input = sharp(srcPath, { failOn: "none", limitInputPixels: false });
    const meta = await input.metadata();
    console.log(`\n→ ${file} (${meta.width}×${meta.height}) → id "${id}"`);

    const urls = {};

    for (const variant of VARIANTS) {
      const outName = `${id}-${variant.suffix}.webp`;
      const outPath = path.join(OUT_DIR, outName);
      const buffer = await sharp(srcPath, { failOn: "none", limitInputPixels: false })
        .resize(variant.width, variant.height, { fit: "fill" })
        .webp({ quality: variant.quality })
        .toBuffer();

      await writeFile(outPath, buffer);
      console.log(`  wrote public/vr-tour/${outName} (${(buffer.length / 1024).toFixed(0)} KB)`);

      if (supabase) {
        const storagePath = `${STORAGE_PREFIX}/${outName}`;
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
          contentType: "image/webp",
          upsert: true,
          cacheControl: "31536000",
        });
        if (uploadError) {
          console.error(`  Upload failed for ${outName}:`, uploadError.message);
          urls[variant.suffix] = `/vr-tour/${outName}`;
        } else {
          const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
          urls[variant.suffix] = urlData.publicUrl;
          console.log(`  uploaded ${storagePath}`);
        }
      } else {
        urls[variant.suffix] = `/vr-tour/${outName}`;
      }
    }

    manifest[id] = {
      id,
      name: labelFromSlug(id),
      category: categoryFromSlug(id),
      lg: urls.lg,
      sm: urls.sm,
      thumb: urls.thumb,
    };
  }

  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(`\n✓ Wrote ${MANIFEST_PATH} (${Object.keys(manifest).length} rooms)`);
  console.log("Next: edit src/data/vrTour.ts links, then open /vr-tour?calibrate=1 to place hotspots.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
