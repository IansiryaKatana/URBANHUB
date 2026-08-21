import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { CharCounter, FocusPhraseGuide } from "@/components/admin/FocusPhraseGuide";
import { upsertSeoPage } from "@/lib/upsertSeoPage";
import { META_DESC_LIMIT, META_TITLE_LIMIT, SITE_URL } from "@/lib/seo";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import {
  resolvePublishedAtForSave,
  toDatetimeLocalValue,
} from "@/utils/blogDates";

type BlogPostEditRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  featured_image_url: string | null;
  status: string;
  published_at: string | null;
  category_id: string | null;
  seo_page_id?: string | null;
};

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
};

export default function BlogPostEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isNew = id === "new";

  const { data: post, isLoading: postLoading } = useQuery({
    queryKey: ["admin-blog-post", id],
    queryFn: async () => {
      if (!id || id === "new") return null;
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, excerpt, content, featured_image_url, status, published_at, category_id, seo_page_id")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as BlogPostEditRow;
    },
    enabled: !!id && !isNew,
  });

  const { data: categories } = useQuery({
    queryKey: ["admin-blog-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_categories")
        .select("id, name, slug")
        .order("name");
      if (error) throw error;
      return (data || []) as CategoryRow[];
    },
  });

  const { data: postSeo } = useQuery({
    queryKey: ["admin-blog-post-seo", post?.slug],
    queryFn: async () => {
      if (!post?.slug) return null;
      const { data, error } = await supabase
        .from("seo_pages")
        .select("id, meta_title, meta_description, focus_keyword")
        .eq("page_path", `/${post.slug}`)
        .maybeSingle();
      if (error) throw error;
      return data as {
        id: string;
        meta_title: string | null;
        meta_description: string | null;
        focus_keyword: string | null;
      } | null;
    },
    enabled: !!post?.slug && !isNew,
  });

  const [pendingAction, setPendingAction] = useState<"save" | "publish" | null>(null);
  const saveIntentRef = useRef<"save" | "publish">("save");

  const updateMutation = useMutation({
    mutationFn: async (
      payload: Partial<BlogPostEditRow> & {
        seo?: { meta_title: string; meta_description: string; focus_keyword: string; previous_slug?: string };
      },
    ) => {
      if (!id || id === "new") throw new Error("No post id");
      const { seo, ...postPayload } = payload;
      let seoPageId = post?.seo_page_id ?? null;
      if (seo && postPayload.slug) {
        seoPageId = await upsertSeoPage({
          page_path: `/${postPayload.slug}`,
          previous_path: seo.previous_slug ? `/${seo.previous_slug}` : undefined,
          page_type: "post",
          meta_title: seo.meta_title || postPayload.title || null,
          meta_description: seo.meta_description || postPayload.excerpt || null,
          focus_keyword: seo.focus_keyword || null,
          canonical_url: `${SITE_URL}/${postPayload.slug}`,
          og_image_url: postPayload.featured_image_url || null,
          robots_meta: postPayload.status === "published" ? "index, follow" : "noindex, follow",
        });
      }
      const { error } = await supabase
        .from("blog_posts")
        .update({ ...postPayload, seo_page_id: seoPageId })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-post", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-blog-post-seo"] });
      if (saveIntentRef.current === "publish") {
        setStatus("published");
        toast.success("Post saved and published.");
      } else {
        toast.success("Post saved.");
      }
      setPendingAction(null);
    },
    onError: () => {
      toast.error("Failed to save.");
      setPendingAction(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (
      payload: Omit<BlogPostEditRow, "id"> & {
        published_at?: string | null;
        seo?: { meta_title: string; meta_description: string; focus_keyword: string };
      },
    ) => {
      const { seo, ...postPayload } = payload;
      let seoPageId: string | null = null;
      if (seo && postPayload.slug) {
        seoPageId = await upsertSeoPage({
          page_path: `/${postPayload.slug}`,
          page_type: "post",
          meta_title: seo.meta_title || postPayload.title || null,
          meta_description: seo.meta_description || postPayload.excerpt || null,
          focus_keyword: seo.focus_keyword || null,
          canonical_url: `${SITE_URL}/${postPayload.slug}`,
          og_image_url: postPayload.featured_image_url || null,
          robots_meta: postPayload.status === "published" ? "index, follow" : "noindex, follow",
        });
      }
      const { data, error } = await supabase
        .from("blog_posts")
        .insert({
          title: postPayload.title,
          slug: postPayload.slug,
          excerpt: postPayload.excerpt ?? null,
          content: postPayload.content ?? "",
          featured_image_url: postPayload.featured_image_url ?? null,
          status: postPayload.status ?? "draft",
          published_at: postPayload.published_at ?? null,
          category_id: postPayload.category_id ?? null,
          seo_page_id: seoPageId,
        })
        .select("id")
        .single();
      if (error) throw error;
      return { id: data.id as string, published: postPayload.status === "published" };
    },
    onSuccess: ({ id: newId, published }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast.success(published ? "Post created and published." : "Post created.");
      navigate(`/admin/blog/${newId}`, { replace: true });
      setPendingAction(null);
    },
    onError: () => {
      toast.error("Failed to create post.");
      setPendingAction(null);
    },
  });

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [content, setContent] = useState("");
  const [featured_image_url, setFeatured_image_url] = useState("");
  const [status, setStatus] = useState("draft");
  const [category_id, setCategory_id] = useState<string>("");
  const [publishedAtLocal, setPublishedAtLocal] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [focusKeyword, setFocusKeyword] = useState("");

  useEffect(() => {
    if (post && !isNew) {
      setTitle(post.title);
      setSlug(post.slug);
      setExcerpt(post.excerpt ?? "");
      setContent(post.content ?? "");
      setFeatured_image_url(post.featured_image_url ?? "");
      setStatus(post.status);
      setCategory_id(post.category_id ?? "");
      setPublishedAtLocal(toDatetimeLocalValue(post.published_at));
    }
  }, [post, isNew]);

  useEffect(() => {
    if (postSeo) {
      setMetaTitle(postSeo.meta_title ?? "");
      setMetaDescription(postSeo.meta_description ?? "");
      setFocusKeyword(postSeo.focus_keyword ?? "");
    }
  }, [postSeo]);

  const isSaving = updateMutation.isPending || createMutation.isPending;

  const handleSubmit = (e: React.FormEvent, publishAfterSave = false) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }
    const slugVal = slug.trim() || title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const effectiveStatus = publishAfterSave ? "published" : status;
    const published_at = resolvePublishedAtForSave(effectiveStatus, publishedAtLocal);
    const payload = {
      title: title.trim(),
      slug: slugVal,
      excerpt: excerpt.trim() || null,
      content: content.trim() || "",
      featured_image_url: featured_image_url.trim() || null,
      status: effectiveStatus as "draft" | "published" | "archived",
      category_id: category_id || null,
      published_at,
      seo: {
        meta_title: metaTitle.trim() || title.trim(),
        meta_description: metaDescription.trim() || excerpt.trim(),
        focus_keyword: focusKeyword.trim(),
        previous_slug: post?.slug,
      },
    };
    setPendingAction(publishAfterSave ? "publish" : "save");
    saveIntentRef.current = publishAfterSave ? "publish" : "save";
    if (isNew) {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate(payload);
    }
  };

  if (!id) {
    navigate("/admin/blog", { replace: true });
    return null;
  }

  if (!isNew && (postLoading || !post)) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Edit post</h1>
          <p className="text-muted-foreground">Edit page content and metadata.</p>
        </div>
        <Link to="/admin/blog">
          <Button variant="outline" className="w-fit">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to blog
          </Button>
        </Link>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Post details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="post-title">Title</Label>
              <Input
                id="post-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Post title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="post-slug">Slug (URL)</Label>
              <Input
                id="post-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="url-slug"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="post-excerpt">Excerpt</Label>
              <Textarea
                id="post-excerpt"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={3}
                className="resize-y"
                placeholder="Short summary for listings"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="post-published-at">Published date &amp; time</Label>
              <Input
                id="post-published-at"
                type="datetime-local"
                value={publishedAtLocal}
                onChange={(e) => setPublishedAtLocal(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Shown on the blog listing and article. For published posts, if you clear this field and save, the current time is used.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category_id || "__none__"} onValueChange={(v) => setCategory_id(v === "__none__" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {(categories || []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ImageUpload
              label="Featured image"
              value={featured_image_url}
              onChange={setFeatured_image_url}
              folder="blog"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">SEO</CardTitle>
            <p className="text-sm text-muted-foreground">
              Title, description and focus keyphrase for this post URL (`/{slug || "slug"}`).
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="post-meta-title">Meta title</Label>
                <CharCounter value={metaTitle} limit={META_TITLE_LIMIT} />
              </div>
              <Input
                id="post-meta-title"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder={title || "50–60 characters"}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="post-meta-desc">Meta description</Label>
                <CharCounter value={metaDescription} limit={META_DESC_LIMIT} />
              </div>
              <Textarea
                id="post-meta-desc"
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                rows={3}
                className="resize-y"
                placeholder={excerpt || "155–160 characters"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="post-focus">Focus keyphrase</Label>
              <Input
                id="post-focus"
                value={focusKeyword}
                onChange={(e) => setFocusKeyword(e.target.value)}
                placeholder="e.g. student accommodation Preston"
              />
            </div>
            <FocusPhraseGuide
              phrase={focusKeyword}
              title={metaTitle || title}
              description={metaDescription || excerpt}
              h1={title}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Page content</CardTitle>
            <p className="text-sm text-muted-foreground">Main body content (WYSIWYG).</p>
          </CardHeader>
          <CardContent>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Write your post content..."
              minHeight="320px"
            />
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2 justify-end">
          <Link to="/admin/blog">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-accent-yellow text-black hover:bg-accent-yellow/90 border-accent-yellow"
          >
            {isSaving && pendingAction === "save" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {isNew ? "Create draft" : "Save draft"}
          </Button>
          <Button
            type="button"
            disabled={isSaving}
            onClick={(e) => handleSubmit(e, true)}
          >
            {isSaving && pendingAction === "publish" ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {isNew ? "Create and publish" : "Save and publish"}
          </Button>
        </div>
      </form>
    </div>
  );
}
