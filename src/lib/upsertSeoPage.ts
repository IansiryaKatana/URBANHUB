import { supabase } from "@/integrations/supabase/client";
import type { SeoPagePayload } from "@/lib/seo";
import { normalizePath } from "@/lib/seo";

export async function upsertSeoPage(
  payload: SeoPagePayload & { previous_path?: string | null },
): Promise<string> {
  const page_path = normalizePath(payload.page_path);
  const previous_path = payload.previous_path ? normalizePath(payload.previous_path) : null;
  const lookupPath = previous_path && previous_path !== page_path ? previous_path : page_path;

  const { data: existing, error: lookupError } = await supabase
    .from("seo_pages")
    .select("id")
    .eq("page_path", lookupPath)
    .maybeSingle();
  if (lookupError) throw lookupError;

  const row = {
    page_path,
    page_type: payload.page_type || "page",
    meta_title: payload.meta_title ?? null,
    meta_description: payload.meta_description ?? null,
    focus_keyword: payload.focus_keyword ?? null,
    canonical_url: payload.canonical_url ?? null,
    og_title: payload.og_title ?? payload.meta_title ?? null,
    og_description: payload.og_description ?? payload.meta_description ?? null,
    og_image_url: payload.og_image_url ?? null,
    og_image_alt: payload.og_image_alt ?? null,
    twitter_title: payload.twitter_title ?? payload.og_title ?? payload.meta_title ?? null,
    twitter_description:
      payload.twitter_description ?? payload.og_description ?? payload.meta_description ?? null,
    twitter_image_url: payload.twitter_image_url ?? payload.og_image_url ?? null,
    twitter_image_alt: payload.twitter_image_alt ?? payload.og_image_alt ?? null,
    robots_meta: payload.robots_meta ?? "index, follow",
    ...(payload.schema_json !== undefined ? { schema_json: payload.schema_json } : {}),
  };

  if (existing?.id) {
    const { error } = await supabase.from("seo_pages").update(row).eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await supabase.from("seo_pages").insert(row).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteSeoPageByPath(pagePath: string): Promise<void> {
  const path = normalizePath(pagePath);
  const { error } = await supabase.from("seo_pages").delete().eq("page_path", path);
  if (error) throw error;
}
