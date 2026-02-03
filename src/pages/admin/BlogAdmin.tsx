import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { FileText, Loader2, Eye, Send, Pencil, Trash2, Archive, PlusCircle, Upload, FileSpreadsheet, ImageIcon, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import WordPressImport from "@/components/admin/WordPressImport";
import CsvBlogImport from "@/components/admin/CsvBlogImport";

type BlogPostRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  published_at: string | null;
  featured_image_url: string | null;
};

const POSTS_PER_PAGE = 12;

export default function BlogAdmin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importOpen, setImportOpen] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch total count
  const { data: totalCount } = useQuery({
    queryKey: ["admin-blog-posts-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("blog_posts")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch paginated posts
  const { data: posts, isLoading } = useQuery({
    queryKey: ["admin-blog-posts", currentPage],
    queryFn: async () => {
      const from = (currentPage - 1) * POSTS_PER_PAGE;
      const to = from + POSTS_PER_PAGE - 1;
      
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, status, published_at, featured_image_url")
        .order("published_at", { ascending: false })
        .range(from, to);
      
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

  const draftCount = posts?.filter((p) => p.status === "draft").length ?? 0;
  const selectedArray = Array.from(selectedIds);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Blog</h1>
          <p className="text-muted-foreground">Import from WordPress or manage blog posts, categories, and tags.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => navigate("/admin/blog/new")} className="w-fit">
            <PlusCircle className="h-4 w-4 mr-2" />
            New post
          </Button>
          <Button variant="outline" className="w-fit" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import WordPress
          </Button>
          <Button variant="outline" className="w-fit" onClick={() => setCsvImportOpen(true)}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Import from CSV
          </Button>
          <Link to="/blog">
            <Button variant="outline" className="w-fit">
              <Eye className="h-4 w-4 mr-2" />
              View blog on site
            </Button>
          </Link>
        </div>
      </div>

      <WordPressImport open={importOpen} onOpenChange={setImportOpen} />
      <CsvBlogImport open={csvImportOpen} onOpenChange={setCsvImportOpen} />

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Blog posts</CardTitle>
            <CardDescription>
              {totalCount ?? 0} total post{(totalCount ?? 0) !== 1 ? "s" : ""} ({posts?.length ?? 0} on this page). Click a row to edit. Only &quot;published&quot; posts appear on the public blog.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {draftCount > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => publishDraftsMutation.mutate()}
                disabled={publishDraftsMutation.isPending}
              >
                {publishDraftsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Publish all drafts ({draftCount})
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (window.confirm("This will download and upload ALL external blog images to Supabase storage. This may take a while. Continue?")) {
                  fixAllBrokenImagesMutation.mutate();
                }
              }}
              disabled={fixAllBrokenImagesMutation.isPending}
              title="Download all external WordPress images and upload to Supabase storage"
            >
              {fixAllBrokenImagesMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ImageIcon className="h-4 w-4 mr-2" />}
              Fix All Images
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {selectedArray.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-lg bg-muted/50 border">
              <span className="text-sm font-medium">{selectedArray.length} selected</span>
              <Button
                variant="secondary"
                size="sm"
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
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !posts?.length ? (
            <p className="py-8 text-center text-muted-foreground">No blog posts yet. Import from WordPress above.</p>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={posts.length > 0 && posts.every((p) => selectedIds.has(p.id))}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all on this page"
                      />
                    </TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Image</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/admin/blog/${row.id}`)}
                    >
                      <TableCell className="w-12" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(row.id)}
                          onCheckedChange={() => toggleSelect(row.id)}
                          aria-label={`Select ${row.title}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium max-w-[240px] truncate">{row.title}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[160px] truncate">{row.slug}</TableCell>
                      <TableCell>
                        {row.featured_image_url ? (
                          row.featured_image_url.includes("supabase.co") || row.featured_image_url.includes("urbanhub.uk") ? (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              <ImageIcon className="h-3 w-3" />
                              OK
                            </span>
                          ) : (
                            <span className="text-xs text-amber-600 flex items-center gap-1" title="External URL - may break">
                              <AlertCircle className="h-3 w-3" />
                              External
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.status === "published" ? "default" : "secondary"}>{row.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {row.published_at ? format(new Date(row.published_at), "MMM d, yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/admin/blog/${row.id}`)}
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Link to={`/${row.slug}`} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" aria-label="View on site">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        {row.status === "draft" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              publishOneMutation.mutate(row.id);
                            }}
                            disabled={publishOneMutation.isPending}
                            aria-label="Publish"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage > 1) setCurrentPage(currentPage - 1);
                      }}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(page);
                            }}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    return null;
                  })}
                  
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                      }}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tables &amp; data</CardTitle>
          <CardDescription>blog_posts, blog_categories, blog_tags, blog_post_tags (migration 001).</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Click a row to edit page content (WYSIWYG). Use &quot;New post&quot; to create a post or import from WordPress above.
          </p>
          <Link to="/blog">
            <Button variant="secondary">
              <FileText className="h-4 w-4 mr-2" />
              View blog on site
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
