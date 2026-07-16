import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Eye, Send, Pencil, Trash2, Archive, PlusCircle, Upload, FileSpreadsheet, ImageIcon, AlertCircle, ArrowUpRight } from "lucide-react";
import {
  AdminListPagination,
  AdminListToolbar,
  adminIconButtonClass,
  adminIconClass,
  adminTableCellClass,
  adminTableHeadClass,
} from "@/components/admin/AdminRecordList";
import { toast } from "sonner";
import { format } from "date-fns";
import WordPressImport from "@/components/admin/WordPressImport";
import CsvBlogImport from "@/components/admin/CsvBlogImport";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type BlogPostRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  published_at: string | null;
  featured_image_url: string | null;
};

const POSTS_PER_PAGE = 12;

/** Temporarily hide WordPress/CSV import and image-fix tooling in the blog admin UI. */
const SHOW_BLOG_IMPORT_AND_IMAGE_FIX = false;

/** Escape characters that break PostgREST `or` / `ilike` filters. */
function escapeIlikePattern(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_").replace(/,/g, "");
}

function applyBlogSearch<T extends { or: (filter: string) => T }>(query: T, search: string): T {
  const term = search.trim();
  if (!term) return query;
  const pattern = `%${escapeIlikePattern(term)}%`;
  return query.or(`title.ilike.${pattern},slug.ilike.${pattern}`);
}

export default function BlogAdmin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importOpen, setImportOpen] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const isSuperAdmin = role === "superadmin";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  // Fetch total count
  const { data: totalCount } = useQuery({
    queryKey: ["admin-blog-posts-count", statusFilter, debouncedSearch],
    queryFn: async () => {
      let query = supabase
        .from("blog_posts")
        .select("*", { count: "exact", head: true });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      query = applyBlogSearch(query, debouncedSearch);

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch total draft count (for "Publish all drafts" button)
  const { data: draftCount = 0 } = useQuery({
    queryKey: ["admin-blog-draft-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("blog_posts")
        .select("*", { count: "exact", head: true })
        .eq("status", "draft");
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch paginated posts
  const { data: posts, isLoading } = useQuery({
    queryKey: ["admin-blog-posts", currentPage, statusFilter, debouncedSearch],
    queryFn: async () => {
      const from = (currentPage - 1) * POSTS_PER_PAGE;
      const to = from + POSTS_PER_PAGE - 1;
      
      let query = supabase
        .from("blog_posts")
        .select("id, title, slug, status, published_at, featured_image_url")
        .order("published_at", { ascending: false })
        .range(from, to);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      query = applyBlogSearch(query, debouncedSearch);

      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []) as BlogPostRow[];
    },
  });

  const totalPages = totalCount ? Math.ceil(totalCount / POSTS_PER_PAGE) : 0;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!posts?.length) return;
    const currentPageIds = posts.map((p) => p.id);
    const allCurrentPageSelected = currentPageIds.every((id) => selectedIds.has(id));
    if (allCurrentPageSelected) {
      // Deselect all on current page
      setSelectedIds((prev) => {
        const next = new Set(prev);
        currentPageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      // Select all on current page
      setSelectedIds((prev) => {
        const next = new Set(prev);
        currentPageIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const publishDraftsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("blog_posts")
        .update({ status: "published" })
        .eq("status", "draft");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-blog-draft-count"] });
      toast.success("All drafts published.");
    },
    onError: () => toast.error("Failed to publish drafts."),
  });

  const publishOneMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").update({ status: "published" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-blog-draft-count"] });
      toast.success("Post published.");
    },
    onError: () => toast.error("Failed to publish."),
  });

  const bulkPublishMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase.from("blog_posts").update({ status: "published" }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-blog-draft-count"] });
      setSelectedIds(new Set());
      toast.success("Selected posts published.");
    },
    onError: () => toast.error("Failed to publish."),
  });

  const bulkUnpublishMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase.from("blog_posts").update({ status: "draft" }).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-blog-draft-count"] });
      setSelectedIds(new Set());
      toast.success("Selected posts set to draft.");
    },
    onError: () => toast.error("Failed to update."),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      await supabase.from("blog_post_tags").delete().in("post_id", ids);
      const { error } = await supabase.from("blog_posts").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-blog-draft-count"] });
      setSelectedIds(new Set());
      // Reset to page 1 if current page becomes empty
      if (posts && posts.length <= selectedArray.length && currentPage > 1) {
        setCurrentPage(1);
      }
      toast.success("Selected posts deleted.");
    },
    onError: () => toast.error("Failed to delete."),
  });

  const fixBrokenImagesMutation = useMutation({
    mutationFn: async (postIds: string[]) => {
      if (postIds.length === 0) return;
      
      // Fetch posts with their image URLs
      const { data: postsToFix, error: fetchError } = await supabase
        .from("blog_posts")
        .select("id, slug, featured_image_url")
        .in("id", postIds)
        .not("featured_image_url", "is", null);
      
      if (fetchError) throw fetchError;
      if (!postsToFix?.length) {
        toast.info("No posts with images found to fix.");
        return;
      }

      let fixed = 0;
      let failed = 0;
      const failedPosts: string[] = [];

      for (const post of postsToFix) {
        if (!post.featured_image_url || !post.featured_image_url.startsWith("http")) continue;
        
        // Check if image is already hosted on Supabase
        if (post.featured_image_url.includes("supabase.co") || 
            (post.featured_image_url.includes("urbanhub.uk") && !post.featured_image_url.includes("old.urbanhub.uk"))) {
          continue; // Already hosted, skip
        }

        let imageUrl = post.featured_image_url;
        
        // Try to update URL from old domain to new domain if needed
        if (imageUrl.includes("old.urbanhub.uk")) {
          // Keep the old.urbanhub.uk URL as is - we'll try to download from it
        } else if (imageUrl.match(/https?:\/\/(www\.)?urbanhub\.uk/)) {
          // If it's the new domain but broken, try old domain
          imageUrl = imageUrl.replace(/https?:\/\/(www\.)?urbanhub\.uk/, "https://old.urbanhub.uk");
        }

        const ext = imageUrl.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)?.[1]?.toLowerCase() || "jpg";
        const path = `blog/${post.slug}-featured-${Date.now()}.${ext}`;

        try {
          // Try to fetch the image (may fail due to CORS)
          const imageRes = await fetch(imageUrl, { 
            mode: "cors",
            cache: "no-cache"
          });
          
          if (!imageRes.ok) {
            failed++;
            failedPosts.push(post.slug);
            continue;
          }
          
          const blob = await imageRes.blob();
          if (!blob.type.startsWith("image/")) {
            failed++;
            failedPosts.push(post.slug);
            continue;
          }

          const { error: uploadError } = await supabase.storage.from("website").upload(path, blob, {
            contentType: blob.type || `image/${ext}`,
            upsert: true,
          });

          if (uploadError) {
            failed++;
            failedPosts.push(post.slug);
            continue;
          }

          const { data: urlData } = supabase.storage.from("website").getPublicUrl(path);
          const { error: updateError } = await supabase
            .from("blog_posts")
            .update({ featured_image_url: urlData.publicUrl })
            .eq("id", post.id);

          if (updateError) {
            failed++;
            failedPosts.push(post.slug);
          } else {
            fixed++;
          }
        } catch (error) {
          failed++;
          failedPosts.push(post.slug);
        }
      }

      return { fixed, failed, failedPosts };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts-count"] });
      if (result) {
        if (result.fixed > 0) {
          toast.success(`Fixed ${result.fixed} image(s). ${result.failed > 0 ? `${result.failed} failed (likely CORS blocked).` : ""}`);
          if (result.failed > 0 && result.failedPosts.length > 0) {
            console.warn("Failed to fix images for:", result.failedPosts);
          }
        } else {
          toast.warning("Could not fix images. They may be blocked by CORS. Use the Node script instead (see console for details).");
        }
      }
    },
    onError: (error: Error) => {
      console.error("Fix images error:", error);
      toast.error(`Failed to fix images: ${error.message}`);
    },
  });

  // New mutation to fix ALL broken images (not just selected)
  const fixAllBrokenImagesMutation = useMutation({
    mutationFn: async () => {
      // Fetch ALL posts with external image URLs
      const { data: allPosts, error: fetchError } = await supabase
        .from("blog_posts")
        .select("id, slug, featured_image_url")
        .not("featured_image_url", "is", null);
      
      if (fetchError) throw fetchError;
      if (!allPosts?.length) {
        toast.info("No posts with images found.");
        return;
      }

      // Filter to only external URLs (not Supabase hosted)
      const postsToFix = allPosts.filter((post) => {
        if (!post.featured_image_url || !post.featured_image_url.startsWith("http")) return false;
        return !post.featured_image_url.includes("supabase.co") && 
               !(post.featured_image_url.includes("urbanhub.uk") && !post.featured_image_url.includes("old.urbanhub.uk"));
      });

      if (postsToFix.length === 0) {
        toast.info("All images are already hosted on Supabase.");
        return;
      }

      let fixed = 0;
      let failed = 0;
      const failedPosts: string[] = [];

      for (const post of postsToFix) {
        let imageUrl = post.featured_image_url!;
        
        // Try to update URL from old domain to new domain if needed
        if (imageUrl.includes("old.urbanhub.uk")) {
          // Keep the old.urbanhub.uk URL as is
        } else if (imageUrl.match(/https?:\/\/(www\.)?urbanhub\.uk/)) {
          // If it's the new domain but broken, try old domain
          imageUrl = imageUrl.replace(/https?:\/\/(www\.)?urbanhub\.uk/, "https://old.urbanhub.uk");
        }

        const ext = imageUrl.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)?.[1]?.toLowerCase() || "jpg";
        const path = `blog/${post.slug}-featured-${Date.now()}.${ext}`;

        try {
          const imageRes = await fetch(imageUrl, { 
            mode: "cors",
            cache: "no-cache"
          });
          
          if (!imageRes.ok) {
            failed++;
            failedPosts.push(post.slug);
            continue;
          }
          
          const blob = await imageRes.blob();
          if (!blob.type.startsWith("image/")) {
            failed++;
            failedPosts.push(post.slug);
            continue;
          }

          const { error: uploadError } = await supabase.storage.from("website").upload(path, blob, {
            contentType: blob.type || `image/${ext}`,
            upsert: true,
          });

          if (uploadError) {
            failed++;
            failedPosts.push(post.slug);
            continue;
          }

          const { data: urlData } = supabase.storage.from("website").getPublicUrl(path);
          const { error: updateError } = await supabase
            .from("blog_posts")
            .update({ featured_image_url: urlData.publicUrl })
            .eq("id", post.id);

          if (updateError) {
            failed++;
            failedPosts.push(post.slug);
          } else {
            fixed++;
          }
        } catch (error) {
          failed++;
          failedPosts.push(post.slug);
        }
      }

      return { fixed, failed, failedPosts, total: postsToFix.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts-count"] });
      queryClient.invalidateQueries({ queryKey: ["admin-blog-draft-count"] });
      if (result) {
        if (result.fixed > 0) {
          toast.success(`Fixed ${result.fixed} of ${result.total} image(s). ${result.failed > 0 ? `${result.failed} failed (likely CORS blocked). Use Node script for those.` : ""}`);
          if (result.failed > 0 && result.failedPosts.length > 0) {
            console.warn("Failed to fix images for:", result.failedPosts);
            console.info("To fix CORS-blocked images, use the Node script: node scripts/fix-blog-images.mjs");
          }
        } else {
          toast.warning("Could not fix images. They may be blocked by CORS. Use the Node script instead: node scripts/fix-blog-images.mjs");
        }
      }
    },
    onError: (error: Error) => {
      console.error("Fix all images error:", error);
      toast.error(`Failed to fix images: ${error.message}. Try the Node script instead.`);
    },
  });

  const selectedArray = Array.from(selectedIds);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Blog</h1>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => navigate("/admin/blog/new")} className="w-fit">
            <PlusCircle className="h-4 w-4 mr-2" />
            New post
          </Button>
          {SHOW_BLOG_IMPORT_AND_IMAGE_FIX && isSuperAdmin && (
            <>
              <Button variant="outline" className="w-fit" onClick={() => setImportOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import WordPress
              </Button>
              <Button variant="outline" className="w-fit" onClick={() => setCsvImportOpen(true)}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Import from CSV
              </Button>
            </>
          )}
          <Link to="/blog" target="_blank" rel="noopener noreferrer">
            <Button
              variant="default"
              size="icon"
              className="w-9 h-9 rounded-full bg-black text-white hover:bg-black/90"
              aria-label="View blog on site"
            >
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {SHOW_BLOG_IMPORT_AND_IMAGE_FIX && isSuperAdmin && (
        <>
          <WordPressImport open={importOpen} onOpenChange={setImportOpen} />
          <CsvBlogImport open={csvImportOpen} onOpenChange={setCsvImportOpen} />
        </>
      )}

      <div className="space-y-4">
        <AdminListToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search by title or slug..."
          searchAriaLabel="Search blog posts"
          filters={
            <div className="flex flex-wrap items-center gap-2">
              <Tabs
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as "all" | "draft" | "published");
                  setCurrentPage(1);
                }}
              >
                <TabsList className="h-8">
                  <TabsTrigger value="all" className="px-2.5 text-xs">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="published" className="px-2.5 text-xs">
                    Published
                  </TabsTrigger>
                  <TabsTrigger value="draft" className="px-2.5 text-xs">
                    Drafts
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              {draftCount > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => publishDraftsMutation.mutate()}
                  disabled={publishDraftsMutation.isPending}
                >
                  {publishDraftsMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
                  Publish drafts ({draftCount})
                </Button>
              )}
              {SHOW_BLOG_IMPORT_AND_IMAGE_FIX && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    if (window.confirm("This will download and upload ALL external blog images to Supabase storage. This may take a while. Continue?")) {
                      fixAllBrokenImagesMutation.mutate();
                    }
                  }}
                  disabled={fixAllBrokenImagesMutation.isPending}
                  title="Download all external WordPress images and upload to Supabase storage"
                >
                  {fixAllBrokenImagesMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <ImageIcon className="h-3.5 w-3.5 mr-1.5" />}
                  Fix images
                </Button>
              )}
            </div>
          }
        />

        {selectedArray.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 rounded-md border bg-muted/40 px-2.5 py-1.5">
              <span className="text-xs font-medium">{selectedArray.length} selected</span>
              <Button
                variant="secondary"
                size="sm"
                className="h-7 text-xs"
                onClick={() => bulkPublishMutation.mutate(selectedArray)}
                disabled={bulkPublishMutation.isPending}
              >
                {bulkPublishMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Publish selected
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => bulkUnpublishMutation.mutate(selectedArray)}
                disabled={bulkUnpublishMutation.isPending}
              >
                {bulkUnpublishMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
                Unpublish selected
              </Button>
              {SHOW_BLOG_IMPORT_AND_IMAGE_FIX && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fixBrokenImagesMutation.mutate(selectedArray)}
                  disabled={fixBrokenImagesMutation.isPending}
                  title="Download and re-upload external images to Supabase storage"
                >
                  {fixBrokenImagesMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ImageIcon className="h-4 w-4 mr-2" />}
                  Fix Images
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (window.confirm(`Delete ${selectedArray.length} post(s)? This cannot be undone.`)) {
                    bulkDeleteMutation.mutate(selectedArray);
                  }
                }}
                disabled={bulkDeleteMutation.isPending}
              >
                {bulkDeleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                Delete selected
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                Clear selection
              </Button>
            </div>
          )}
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !posts?.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {debouncedSearch
                ? `No posts found matching "${debouncedSearch}".`
                : "No blog posts yet. Import from WordPress above."}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={`${adminTableHeadClass} w-10`}>
                      <Checkbox
                        checked={posts.length > 0 && posts.every((p) => selectedIds.has(p.id))}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all on this page"
                      />
                    </TableHead>
                    <TableHead className={`${adminTableHeadClass} w-20`}>Image</TableHead>
                    <TableHead className={adminTableHeadClass}>Title</TableHead>
                    <TableHead className={adminTableHeadClass}>Slug</TableHead>
                    <TableHead className={`${adminTableHeadClass} w-24`}>Status</TableHead>
                    <TableHead className={`${adminTableHeadClass} w-28`}>Published</TableHead>
                    <TableHead className={`${adminTableHeadClass} w-28 text-right`}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => navigate(`/admin/blog/${row.id}`)}
                    >
                      <TableCell className={adminTableCellClass} onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(row.id)}
                          onCheckedChange={() => toggleSelect(row.id)}
                          aria-label={`Select ${row.title}`}
                        />
                      </TableCell>
                      <TableCell className={adminTableCellClass}>
                        {row.featured_image_url ? (
                          <div className="relative h-12 w-12 overflow-hidden rounded bg-muted">
                            <img
                              src={row.featured_image_url}
                              alt={row.title}
                              className="h-full w-full object-cover"
                            />
                            {!(row.featured_image_url.includes("supabase.co") || row.featured_image_url.includes("urbanhub.uk")) ? (
                              <span
                                className="absolute bottom-1 right-1 rounded bg-amber-600/90 px-1 py-0.5 text-[9px] font-medium text-white"
                                title="External URL - may break"
                              >
                                Ext
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className={`${adminTableCellClass} max-w-[220px] truncate text-sm font-medium`}>
                        {row.title}
                      </TableCell>
                      <TableCell className={`${adminTableCellClass} max-w-[140px] truncate font-mono text-[10px] text-muted-foreground`}>
                        {row.slug}
                      </TableCell>
                      <TableCell className={adminTableCellClass}>
                        <Badge
                          variant={row.status === "published" ? "default" : "secondary"}
                          className="h-5 px-1.5 text-[10px] font-medium"
                        >
                          {row.status}
                        </Badge>
                      </TableCell>
                      <TableCell className={`${adminTableCellClass} text-xs text-muted-foreground`}>
                        {row.published_at ? format(new Date(row.published_at), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell className={adminTableCellClass} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={adminIconButtonClass}
                            onClick={() => navigate(`/admin/blog/${row.id}`)}
                            aria-label="Edit"
                          >
                            <Pencil className={adminIconClass} />
                          </Button>
                          <Link to={`/${row.slug}`} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className={adminIconButtonClass} aria-label="View on site">
                              <Eye className={adminIconClass} />
                            </Button>
                          </Link>
                          {row.status === "draft" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className={adminIconButtonClass}
                              onClick={(e) => {
                                e.stopPropagation();
                                publishOneMutation.mutate(row.id);
                              }}
                              disabled={publishOneMutation.isPending}
                              aria-label="Publish"
                            >
                              <Send className={adminIconClass} />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <AdminListPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={totalCount ?? 0}
                pageSize={POSTS_PER_PAGE}
              />
            </>
          )}
      </div>
    </div>
  );
}
