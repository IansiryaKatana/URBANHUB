/**
 * Script to download blog post featured images from WordPress URLs and upload to Supabase storage.
 * This script works directly with the database - no CSV needed.
 * 
 * Run from website directory with:
 *   node scripts/fix-blog-images.mjs
 * 
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env (or env).
 * 
 * The script will:
 * 1. Fetch all blog posts with external image URLs
 * 2. Download images from old.urbanhub.uk (or original domain)
 * 3. Upload to Supabase storage
 * 4. Update blog_posts.featured_image_url with new Supabase URLs
 */

import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Load .env and then .env.local (local overrides)
dotenv.config({ path: join(root, ".env") });
if (existsSync(join(root, ".env.local"))) {
  dotenv.config({ path: join(root, ".env.local") });
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_ variants) in .env or .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function downloadAndUpload(imageUrl, slug, postId) {
  if (!imageUrl || !imageUrl.startsWith("http")) return null;
  
  try {
    // Try to update URL from old domain to new domain if needed
    let finalUrl = imageUrl;
    
    // If URL contains urbanhub.uk but not old.urbanhub.uk, try old domain
    if (finalUrl.match(/https?:\/\/(www\.)?urbanhub\.uk/) && !finalUrl.includes("old.urbanhub.uk")) {
      finalUrl = finalUrl.replace(/https?:\/\/(www\.)?urbanhub\.uk/, "https://old.urbanhub.uk");
      console.log(`  [${slug}] Trying old domain: ${finalUrl}`);
    }
    
    // If it's already old.urbanhub.uk, use it as is
    if (finalUrl.includes("old.urbanhub.uk")) {
      // Keep as is
    }

    console.log(`  [${slug}] Downloading from: ${finalUrl}`);
    
    const res = await fetch(finalUrl, { 
      redirect: "follow",
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ImageDownloader/1.0)'
      }
    });
    
    if (!res.ok) {
      console.warn(`  [${slug}] ❌ Fetch failed ${res.status}: ${finalUrl}`);
      return null;
    }
    
    const blob = await res.blob();
    const buf = Buffer.from(await blob.arrayBuffer());
    const contentType = blob.type || "image/jpeg";
    
    // Determine file extension
    const ext = contentType.includes("png") ? "png" 
              : contentType.includes("webp") ? "webp" 
              : contentType.includes("gif") ? "gif" 
              : contentType.includes("jpeg") ? "jpg"
              : imageUrl.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)?.[1]?.toLowerCase() || "jpg";
    
    const path = `blog/${slug}-featured-${Date.now()}.${ext}`;
    
    console.log(`  [${slug}] Uploading to: ${path}`);
    
    const { error: uploadError } = await supabase.storage.from("website").upload(path, buf, {
      contentType: contentType || `image/${ext}`,
      upsert: true,
    });
    
    if (uploadError) {
      console.warn(`  [${slug}] ❌ Upload failed:`, uploadError.message);
      return null;
    }
    
    const { data: urlData } = supabase.storage.from("website").getPublicUrl(path);
    return urlData.publicUrl;
  } catch (e) {
    console.warn(`  [${slug}] ❌ Error:`, e.message);
    return null;
  }
}

async function main() {
  console.log("🔍 Fetching blog posts with external image URLs...\n");
  
  // Fetch all blog posts with image URLs
  const { data: allPosts, error: fetchError } = await supabase
    .from("blog_posts")
    .select("id, slug, featured_image_url")
    .not("featured_image_url", "is", null);
  
  if (fetchError) {
    console.error("❌ Failed to fetch posts:", fetchError.message);
    process.exit(1);
  }
  
  if (!allPosts || allPosts.length === 0) {
    console.log("✅ No posts with images found.");
    return;
  }
  
  console.log(`📊 Found ${allPosts.length} posts with images.\n`);
  
  // Filter to only external URLs (not Supabase hosted)
  const postsToFix = allPosts.filter((post) => {
    if (!post.featured_image_url || !post.featured_image_url.startsWith("http")) return false;
    // Skip if already hosted on Supabase
    if (post.featured_image_url.includes("supabase.co")) return false;
    // Skip if hosted on new domain (not old.urbanhub.uk)
    if (post.featured_image_url.includes("urbanhub.uk") && !post.featured_image_url.includes("old.urbanhub.uk")) {
      return false;
    }
    return true;
  });
  
  if (postsToFix.length === 0) {
    console.log("✅ All images are already hosted on Supabase.");
    return;
  }
  
  console.log(`🖼️  Found ${postsToFix.length} posts with external images to fix.\n`);
  console.log("Starting download and upload process...\n");
  
  let updated = 0;
  let failed = 0;
  const failedPosts = [];
  
  for (let i = 0; i < postsToFix.length; i++) {
    const post = postsToFix[i];
    console.log(`[${i + 1}/${postsToFix.length}] Processing: ${post.slug}`);
    
    const publicUrl = await downloadAndUpload(post.featured_image_url, post.slug, post.id);
    
    if (!publicUrl) {
      failed++;
      failedPosts.push(post.slug);
      continue;
    }
    
    // Update database with new Supabase URL
    const { error: updateError } = await supabase
      .from("blog_posts")
      .update({ featured_image_url: publicUrl })
      .eq("id", post.id);
    
    if (updateError) {
      console.warn(`  [${post.slug}] ❌ DB update failed:`, updateError.message);
      failed++;
      failedPosts.push(post.slug);
    } else {
      updated++;
      console.log(`  [${post.slug}] ✅ Updated -> ${publicUrl}\n`);
    }
    
    // Small delay to avoid rate limiting
    if (i < postsToFix.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log("\n" + "=".repeat(60));
  console.log(`✅ Done! Updated: ${updated}, Failed: ${failed}`);
  console.log("=".repeat(60));
  
  if (failed > 0 && failedPosts.length > 0) {
    console.log("\n❌ Failed posts:");
    failedPosts.forEach(slug => console.log(`  - ${slug}`));
    console.log("\n💡 Tip: Check if the old WordPress site is accessible and images exist.");
  }
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
