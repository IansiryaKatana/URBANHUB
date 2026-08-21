import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminListPagination } from "@/components/admin/AdminRecordList";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { CharCounter, FocusPhraseGuide } from "@/components/admin/FocusPhraseGuide";
import { fetchAllSupabaseRows } from "@/utils/fetchAllSupabaseRows";
import { upsertSeoPage, deleteSeoPageByPath } from "@/lib/upsertSeoPage";
import { META_DESC_LIMIT, META_TITLE_LIMIT, SITE_URL } from "@/lib/seo";
import { Loader2, Pencil, Plus, Trash2, Copy, Eye, Search, ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  getLandingHeroCtaLabel,
  LANDING_HERO_CTA_OPTIONS,
  type LandingHeroAlignment,
  type LandingHeroCtaType,
} from "@/lib/landingHeroCta";
import { fetchLandingHeroSlides } from "@/lib/fetchLandingHeroSlides";

const PAGES_PER_PAGE = 10;

type LandingPageRow = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  sort_order: number;
  hero_heading: string | null;
  hero_subheading: string | null;
  default_cta_label: string | null;
  default_cta_type: "viewing" | "callback" | "refer_friend" | "content_creator" | "secure_booking";
  default_cta_tracking_key: string | null;
  room_grades_heading: string | null;
  room_grades_description: string | null;
  info_stack_items: { title: string; description: string }[] | null;
  faq_items: { question: string; answer: string }[] | null;
  meta_pixel_id: string | null;
  tiktok_pixel_id: string | null;
  snapchat_pixel_id: string | null;
  google_ads_conversion_id: string | null;
  google_ads_conversion_label_lead: string | null;
  google_ads_conversion_label_purchase: string | null;
};

const CTA_TYPE_LABELS: Record<LandingPageRow["default_cta_type"], string> = {
  viewing: "Book a viewing",
  callback: "Get a callback",
  refer_friend: "Refer a friend",
  content_creator: "Content creator",
  secure_booking: "Secure booking",
};

function getDefaultCtaLabel(page: LandingPageRow) {
  return page.default_cta_label?.trim() || CTA_TYPE_LABELS[page.default_cta_type] || page.default_cta_type;
}

type LandingSeoInput = {
  meta_title: string;
  meta_description: string;
  focus_keyword: string;
};

async function saveLandingSeo(
  slug: string,
  previousSlug: string | undefined,
  isActive: boolean,
  seo: LandingSeoInput,
  fallbacks: { name: string; heading: string | null; subheading: string | null },
) {
  const title =
    seo.meta_title.trim() || `${fallbacks.heading || fallbacks.name} | Urban Hub Preston`;
  const description =
    seo.meta_description.trim() ||
    fallbacks.subheading ||
    "Student accommodation in Preston at Urban Hub. View studios, prices and book a viewing.";
  await upsertSeoPage({
    page_path: `/landing/${slug}`,
    previous_path: previousSlug && previousSlug !== slug ? `/landing/${previousSlug}` : undefined,
    page_type: "page",
    meta_title: title,
    meta_description: description,
    focus_keyword: seo.focus_keyword.trim() || fallbacks.name,
    canonical_url: `${SITE_URL}/landing/${slug}`,
    robots_meta: isActive ? "index, follow" : "noindex, follow",
  });
}

type HeroSlideRow = {
  id: string;
  landing_page_id: string;
  title: string;
  subtitle: string | null;
  subtitle_link_url: string | null;
  content_alignment: LandingHeroAlignment;
  cta_label: string | null;
  cta_type: LandingHeroCtaType;
  cta_url: string | null;
  cta_tracking_key: string | null;
  cta2_label: string | null;
  cta2_type: LandingHeroCtaType | null;
  cta2_url: string | null;
  cta2_tracking_key: string | null;
  desktop_image_url: string | null;
  desktop_image_alt: string | null;
  mobile_image_url: string | null;
  mobile_image_alt: string | null;
  h1_image_url: string | null;
  h1_image_alt: string | null;
  h1_image_scale: number | null;
  h1_image_scale_mobile: number | null;
  sort_order: number;
  is_active: boolean;
  show_on_homepage: boolean;
  homepage_order: number | null;
};

export default function LandingPages() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [ctaFilter, setCtaFilter] = useState<"all" | LandingPageRow["default_cta_type"]>("all");
  const [mainTab, setMainTab] = useState<"pages" | "homepage">("pages");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setCurrentPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const { data: pages, isLoading } = useQuery({
    queryKey: ["admin-website-landing-pages"],
    queryFn: async () =>
      fetchAllSupabaseRows<LandingPageRow>((from, to) =>
        supabase
          .from("website_landing_pages")
          .select(
            "id, name, slug, is_active, sort_order, hero_heading, hero_subheading, default_cta_label, default_cta_type, default_cta_tracking_key, room_grades_heading, room_grades_description, info_stack_items, faq_items, meta_pixel_id, tiktok_pixel_id, snapchat_pixel_id, google_ads_conversion_id, google_ads_conversion_label_lead, google_ads_conversion_label_purchase",
          )
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false })
          .range(from, to)
      ),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
      seo,
      previousSlug,
    }: {
      id: string;
      payload: Partial<LandingPageRow>;
      seo: LandingSeoInput;
      previousSlug?: string;
    }) => {
      const { error } = await supabase.from("website_landing_pages").update(payload).eq("id", id);
      if (error) throw error;
      if (payload.slug) {
        await saveLandingSeo(
          payload.slug,
          previousSlug,
          payload.is_active ?? true,
          seo,
          {
            name: payload.name || "",
            heading: payload.hero_heading ?? null,
            subheading: payload.hero_subheading ?? null,
          },
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-website-landing-pages"] });
      queryClient.invalidateQueries({ queryKey: ["admin-landing-seo"] });
      toast.success("Landing page updated.");
      setEditingId(null);
    },
    onError: () => toast.error("Failed to update landing page."),
  });

  const createMutation = useMutation({
    mutationFn: async ({
      payload,
      seo,
    }: {
      payload: Omit<LandingPageRow, "id">;
      seo: LandingSeoInput;
    }) => {
      const { error } = await supabase.from("website_landing_pages").insert(payload);
      if (error) throw error;
      await saveLandingSeo(payload.slug, undefined, payload.is_active, seo, {
        name: payload.name,
        heading: payload.hero_heading,
        subheading: payload.hero_subheading,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-website-landing-pages"] });
      toast.success("Landing page created.");
      setCreateOpen(false);
    },
    onError: () => toast.error("Failed to create landing page."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const page = pages?.find((p) => p.id === id);
      const { error } = await supabase.from("website_landing_pages").delete().eq("id", id);
      if (error) throw error;
      if (page?.slug) {
        await deleteSeoPageByPath(`/landing/${page.slug}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-website-landing-pages"] });
      toast.success("Landing page deleted.");
      setEditingId(null);
      setDeleteConfirmId(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (deleteConfirmId) next.delete(deleteConfirmId);
        return next;
      });
    },
    onError: () => toast.error("Failed to delete landing page."),
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, isActive }: { ids: string[]; isActive: boolean }) => {
      if (!ids.length) return;
      const { error } = await supabase
        .from("website_landing_pages")
        .update({ is_active: isActive })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-website-landing-pages"] });
      setSelectedIds(new Set());
      toast.success(vars.isActive ? "Selected landing pages activated." : "Selected landing pages deactivated.");
    },
    onError: () => toast.error("Failed to update selected landing pages."),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!ids.length) return;
      const slugs = (pages || []).filter((p) => ids.includes(p.id)).map((p) => p.slug);
      const { error } = await supabase.from("website_landing_pages").delete().in("id", ids);
      if (error) throw error;
      await Promise.all(slugs.map((slug) => deleteSeoPageByPath(`/landing/${slug}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-website-landing-pages"] });
      setSelectedIds(new Set());
      setBulkDeleteConfirm(false);
      toast.success("Selected landing pages deleted.");
    },
    onError: () => toast.error("Failed to delete selected landing pages."),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (page: LandingPageRow) => {
      const baseSlug = page.slug.endsWith("-copy") ? page.slug : `${page.slug}-copy`;
      const newSlug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;
      const insertPayload = {
        name: `${page.name} (Copy)`,
        slug: newSlug,
        is_active: false,
        sort_order: (pages?.length ?? 0),
        hero_heading: page.hero_heading,
        hero_subheading: page.hero_subheading,
        default_cta_label: page.default_cta_label,
        default_cta_type: page.default_cta_type,
        default_cta_tracking_key: page.default_cta_tracking_key,
        room_grades_heading: page.room_grades_heading,
        room_grades_description: page.room_grades_description,
        info_stack_items: page.info_stack_items,
        faq_items: page.faq_items,
        meta_pixel_id: page.meta_pixel_id,
        tiktok_pixel_id: page.tiktok_pixel_id,
        snapchat_pixel_id: page.snapchat_pixel_id,
        google_ads_conversion_id: page.google_ads_conversion_id,
        google_ads_conversion_label_lead: page.google_ads_conversion_label_lead,
        google_ads_conversion_label_purchase: page.google_ads_conversion_label_purchase,
      };
      const { data, error } = await supabase
        .from("website_landing_pages")
        .insert(insertPayload)
        .select("id")
        .single();
      if (error) throw error;

      // Duplicate hero slides
      const { data: slides, error: slidesError } = await supabase
        .from("website_landing_hero_slides")
        .select(
          "title, subtitle, subtitle_link_url, content_alignment, cta_label, cta_type, cta_url, cta_tracking_key, cta2_label, cta2_type, cta2_url, cta2_tracking_key, desktop_image_url, desktop_image_alt, mobile_image_url, mobile_image_alt, h1_image_url, h1_image_alt, h1_image_scale, h1_image_scale_mobile, sort_order, is_active, show_on_homepage, homepage_order",
        )
        .eq("landing_page_id", page.id);
      if (slidesError) throw slidesError;
      if (slides && slides.length > 0) {
        const slidesInsert = slides.map((s) => ({
          ...s,
          landing_page_id: data.id,
        }));
        const { error: insertSlidesError } = await supabase
          .from("website_landing_hero_slides")
          .insert(slidesInsert);
        if (insertSlidesError) throw insertSlidesError;
      }
      await saveLandingSeo(
        newSlug,
        undefined,
        false,
        { meta_title: "", meta_description: "", focus_keyword: page.name },
        {
          name: `${page.name} (Copy)`,
          heading: page.hero_heading,
          subheading: page.hero_subheading,
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-website-landing-pages"] });
      toast.success("Landing page duplicated.");
    },
    onError: () => toast.error("Failed to duplicate landing page."),
  });

  const filteredPages = useMemo(() => {
    if (!pages?.length) return [];
    const q = debouncedSearch.toLowerCase();
    return pages.filter((page) => {
      if (statusFilter === "active" && !page.is_active) return false;
      if (statusFilter === "inactive" && page.is_active) return false;
      if (ctaFilter !== "all" && page.default_cta_type !== ctaFilter) return false;
      if (!q) return true;
      const ctaLabel = getDefaultCtaLabel(page);
      return (
        page.name.toLowerCase().includes(q) ||
        page.slug.toLowerCase().includes(q) ||
        ctaLabel.toLowerCase().includes(q)
      );
    });
  }, [pages, debouncedSearch, statusFilter, ctaFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPages.length / PAGES_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedPages = filteredPages.slice(
    (safeCurrentPage - 1) * PAGES_PER_PAGE,
    safeCurrentPage * PAGES_PER_PAGE,
  );

  const toggleSelectAll = () => {
    if (!paginatedPages.length) return;
    const pageIds = paginatedPages.map((p) => p.id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const editing = pages?.find((p) => p.id === editingId) ?? null;
  const { data: editingSeo } = useQuery({
    queryKey: ["admin-landing-seo", editing?.slug],
    enabled: !!editing?.slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_pages")
        .select("meta_title, meta_description, focus_keyword")
        .eq("page_path", `/landing/${editing!.slug}`)
        .maybeSingle();
      if (error) throw error;
      return data as LandingSeoInput | null;
    },
  });
  const selectedArray = Array.from(selectedIds);
  const isPending =
    updateMutation.isPending ||
    createMutation.isPending ||
    deleteMutation.isPending ||
    duplicateMutation.isPending ||
    bulkUpdateMutation.isPending ||
    bulkDeleteMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Landing Pages</h1>
          <p className="text-sm text-muted-foreground">
            Manage campaign pages and the homepage hero carousel order.
          </p>
        </div>
        {mainTab === "pages" ? (
          <Button onClick={() => setCreateOpen(true)} className="w-fit">
            <Plus className="h-4 w-4 mr-2" />
            Add landing page
          </Button>
        ) : null}
      </div>

      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "pages" | "homepage")}>
        <TabsList>
          <TabsTrigger value="pages">Landing pages</TabsTrigger>
          <TabsTrigger value="homepage">Homepage hero order</TabsTrigger>
        </TabsList>

        <TabsContent value="homepage" className="mt-4">
          <HomepageHeroOrderPanel onEditLandingPage={(id) => setEditingId(id)} />
        </TabsContent>

        <TabsContent value="pages" className="mt-4 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-md flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search name, slug, or CTA..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-sm"
              aria-label="Search landing pages"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Tabs
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as "all" | "active" | "inactive");
                setCurrentPage(1);
              }}
            >
              <TabsList className="h-8">
                <TabsTrigger value="all" className="px-2.5 text-xs">
                  All
                </TabsTrigger>
                <TabsTrigger value="active" className="px-2.5 text-xs">
                  Active
                </TabsTrigger>
                <TabsTrigger value="inactive" className="px-2.5 text-xs">
                  Inactive
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Select
              value={ctaFilter}
              onValueChange={(value) => {
                setCtaFilter(value as "all" | LandingPageRow["default_cta_type"]);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[170px] text-xs">
                <SelectValue placeholder="CTA type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All CTA types</SelectItem>
                <SelectItem value="viewing">Book a viewing</SelectItem>
                <SelectItem value="callback">Get a callback</SelectItem>
                <SelectItem value="refer_friend">Refer a friend</SelectItem>
                <SelectItem value="content_creator">Content creator</SelectItem>
                <SelectItem value="secure_booking">Secure booking</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {selectedArray.length > 0 ? (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
              <span className="text-xs font-medium text-muted-foreground">{selectedArray.length} selected</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={isPending}
                onClick={() => bulkUpdateMutation.mutate({ ids: selectedArray, isActive: true })}
              >
                Activate
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                disabled={isPending}
                onClick={() => bulkUpdateMutation.mutate({ ids: selectedArray, isActive: false })}
              >
                Deactivate
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="h-7 text-xs"
                disabled={isPending}
                onClick={() => setBulkDeleteConfirm(true)}
              >
                Delete selected
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </Button>
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !pages?.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No landing pages yet. Create one to get started.
            </p>
          ) : !filteredPages.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {debouncedSearch
                ? `No landing pages found matching "${debouncedSearch}".`
                : "No landing pages match the current filters."}
            </p>
          ) : (
            <>
              <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="h-9 w-10 px-2">
                        <Checkbox
                          aria-label="Select all on this page"
                          checked={
                            paginatedPages.length > 0 &&
                            paginatedPages.every((p) => selectedIds.has(p.id))
                          }
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead className="h-9 w-14 px-3 text-xs">Order</TableHead>
                      <TableHead className="h-9 px-3 text-xs">Name</TableHead>
                      <TableHead className="h-9 px-3 text-xs">Slug</TableHead>
                      <TableHead className="h-9 px-3 text-xs">Default CTA</TableHead>
                      <TableHead className="h-9 w-20 px-3 text-xs">Status</TableHead>
                      <TableHead className="h-9 w-[148px] px-2 text-right text-xs">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedPages.map((page) => (
                      <TableRow key={page.id} className="hover:bg-muted/40">
                        <TableCell className="px-2 py-1.5">
                          <Checkbox
                            aria-label={`Select ${page.name}`}
                            checked={selectedIds.has(page.id)}
                            onCheckedChange={() => toggleSelect(page.id)}
                          />
                        </TableCell>
                        <TableCell className="px-3 py-1.5 text-sm text-muted-foreground">
                          {page.sort_order}
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate px-3 py-1.5 text-sm font-medium">
                          {page.name}
                        </TableCell>
                        <TableCell className="px-3 py-1.5">
                          <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                            {page.slug}
                          </code>
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate px-3 py-1.5 text-xs text-muted-foreground">
                          {getDefaultCtaLabel(page)}
                        </TableCell>
                        <TableCell className="px-3 py-1.5">
                          <Badge
                            variant={page.is_active ? "default" : "secondary"}
                            className="h-5 px-1.5 text-[10px] font-medium"
                          >
                            {page.is_active ? "Active" : "Off"}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-2 py-1.5">
                          <div className="flex items-center justify-end gap-0.5">
                            <Button asChild variant="ghost" size="icon" className="h-7 w-7" aria-label="Preview">
                              <a
                                href={`/landing/${page.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setEditingId(page.id)}
                              aria-label="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => duplicateMutation.mutate(page)}
                              disabled={duplicateMutation.isPending}
                              aria-label="Duplicate"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirmId(page.id)}
                              disabled={isPending}
                              aria-label="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>

              <AdminListPagination
                currentPage={safeCurrentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalItems={filteredPages.length}
                pageSize={PAGES_PER_PAGE}
              />
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit sheet */}
      <Sheet open={!!editingId} onOpenChange={(open) => !open && setEditingId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto" aria-describedby="edit-landing-desc">
          <SheetHeader>
            <SheetTitle>Edit landing page</SheetTitle>
            <SheetDescription id="edit-landing-desc">
              Update landing page details and manage hero slides for this campaign.
            </SheetDescription>
          </SheetHeader>
          {editing && (
            <LandingPageForm
              initial={editing}
              initialSeo={editingSeo}
              onSubmit={(payload, seo) =>
                updateMutation.mutate({
                  id: editing.id,
                  payload,
                  seo,
                  previousSlug: editing.slug,
                })
              }
              onCancel={() => setEditingId(null)}
              isLoading={updateMutation.isPending}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Create sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto" aria-describedby="create-landing-desc">
          <SheetHeader>
            <SheetTitle>Add landing page</SheetTitle>
            <SheetDescription id="create-landing-desc">
              Create a new landing page with SEO-friendly name, slug, room grades copy, and CTA defaults.
            </SheetDescription>
          </SheetHeader>
          <LandingPageForm
            initial={null}
            onSubmit={(payload, seo) =>
              createMutation.mutate({
                payload: {
                  ...payload,
                  sort_order: payload.sort_order ?? pages?.length ?? 0,
                  is_active: false,
                } as Omit<LandingPageRow, "id">,
                seo,
              })
            }
            onCancel={() => setCreateOpen(false)}
            isLoading={createMutation.isPending}
          />
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete landing page?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected landing page
              and its linked hero slides.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleteConfirmId) {
                  deleteMutation.mutate(deleteConfirmId);
                }
              }}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedArray.length} landing page{selectedArray.length !== 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Selected landing pages and their linked hero slides
              will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isPending}
              onClick={(e) => {
                e.preventDefault();
                bulkDeleteMutation.mutate(selectedArray);
              }}
            >
              {bulkDeleteMutation.isPending ? "Deleting..." : "Delete selected"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LandingPageForm({
  initial,
  initialSeo,
  onSubmit,
  onCancel,
  isLoading,
}: {
  initial: LandingPageRow | null;
  initialSeo?: LandingSeoInput | null;
  onSubmit: (payload: Omit<LandingPageRow, "id"> | Partial<LandingPageRow>, seo: LandingSeoInput) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0);
  const [heroHeading, setHeroHeading] = useState(initial?.hero_heading ?? "");
  const [heroSubheading, setHeroSubheading] = useState(initial?.hero_subheading ?? "");
  const [defaultCtaLabel, setDefaultCtaLabel] = useState(initial?.default_cta_label ?? "");
  const [defaultCtaType, setDefaultCtaType] = useState<
    "viewing" | "callback" | "refer_friend" | "content_creator" | "secure_booking"
  >(
    initial?.default_cta_type ?? "viewing",
  );
  const [defaultCtaTrackingKey, setDefaultCtaTrackingKey] = useState(
    initial?.default_cta_tracking_key ?? "",
  );
  const [roomGradesHeading, setRoomGradesHeading] = useState(
    initial?.room_grades_heading ?? "5 Room Grades to Choose From",
  );
  const [roomGradesDescription, setRoomGradesDescription] = useState(
    initial?.room_grades_description ??
      "Tailor your stay with five distinct studio grades, each with its own layout and price point.",
  );
  const [infoStackItems, setInfoStackItems] = useState<{ title: string; description: string }[]>(
    initial?.info_stack_items && initial.info_stack_items.length > 0
      ? initial.info_stack_items
      : [{ title: "", description: "" }],
  );
  const [faqItems, setFaqItems] = useState<{ question: string; answer: string }[]>(
    initial?.faq_items && initial.faq_items.length > 0
      ? initial.faq_items
      : Array.from({ length: 6 }, () => ({ question: "", answer: "" })),
  );
  const [metaPixelId, setMetaPixelId] = useState(initial?.meta_pixel_id ?? "");
  const [tiktokPixelId, setTiktokPixelId] = useState(initial?.tiktok_pixel_id ?? "");
  const [snapchatPixelId, setSnapchatPixelId] = useState(initial?.snapchat_pixel_id ?? "");
  const [googleAdsConversionId, setGoogleAdsConversionId] = useState(initial?.google_ads_conversion_id ?? "");
  const [googleAdsConversionLabelLead, setGoogleAdsConversionLabelLead] = useState(
    initial?.google_ads_conversion_label_lead ?? "",
  );
  const [googleAdsConversionLabelPurchase, setGoogleAdsConversionLabelPurchase] = useState(
    initial?.google_ads_conversion_label_purchase ?? "",
  );
  const [metaTitle, setMetaTitle] = useState(initialSeo?.meta_title ?? "");
  const [metaDescription, setMetaDescription] = useState(initialSeo?.meta_description ?? "");
  const [focusKeyword, setFocusKeyword] = useState(initialSeo?.focus_keyword ?? "");

  useEffect(() => {
    if (!initialSeo) return;
    setMetaTitle(initialSeo.meta_title ?? "");
    setMetaDescription(initialSeo.meta_description ?? "");
    setFocusKeyword(initialSeo.focus_keyword ?? "");
  }, [initialSeo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSlug = (slug || name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!cleanSlug) {
      toast.error("Slug is required.");
      return;
    }
    const cleanInfoStackItems = infoStackItems
      .map((item) => ({
        title: item.title.trim(),
        description: item.description.trim(),
      }))
      .filter((item) => item.title && item.description);

    const cleanFaqItems = faqItems
      .map((item) => ({
        question: item.question.trim(),
        answer: item.answer.trim(),
      }))
      .filter((item) => item.question && item.answer);

    if (cleanFaqItems.length > 0 && cleanFaqItems.length < 6) {
      toast.error("Landing page FAQs require at least 6 complete question and answer pairs.");
      return;
    }

    const payload: Omit<LandingPageRow, "id"> | Partial<LandingPageRow> = {
      name: name.trim(),
      slug: cleanSlug,
      is_active: isActive,
      sort_order: Number(sortOrder) || 0,
      hero_heading: heroHeading.trim() || null,
      hero_subheading: heroSubheading.trim() || null,
      default_cta_label: defaultCtaLabel.trim() || null,
      default_cta_type: defaultCtaType,
      default_cta_tracking_key: defaultCtaTrackingKey.trim() || null,
      room_grades_heading: roomGradesHeading.trim() || null,
      room_grades_description: roomGradesDescription.trim() || null,
      info_stack_items: cleanInfoStackItems.length > 0 ? cleanInfoStackItems : null,
      faq_items: cleanFaqItems.length > 0 ? cleanFaqItems : null,
      meta_pixel_id: metaPixelId.trim() || null,
      tiktok_pixel_id: tiktokPixelId.trim() || null,
      snapchat_pixel_id: snapchatPixelId.trim() || null,
      google_ads_conversion_id: googleAdsConversionId.trim() || null,
      google_ads_conversion_label_lead: googleAdsConversionLabelLead.trim() || null,
      google_ads_conversion_label_purchase: googleAdsConversionLabelPurchase.trim() || null,
    };
    onSubmit(payload, {
      meta_title: metaTitle,
      meta_description: metaDescription,
      focus_keyword: focusKeyword,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="landing-name">Landing page name</Label>
          <Input
            id="landing-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Medicine Students Campaign"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="landing-slug">Slug</Label>
          <Input
            id="landing-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g. med-students"
          />
          <p className="text-xs text-muted-foreground">
            Used in URL as <span className="font-mono">/landing/&lt;slug&gt;</span>. No spaces.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <Switch id="landing-active" checked={isActive} onCheckedChange={setIsActive} />
          <Label htmlFor="landing-active">Active (publicly accessible)</Label>
        </div>
        <div className="space-y-2">
          <Label htmlFor="landing-sort-order">Sort order</Label>
          <Input
            id="landing-sort-order"
            type="number"
            min={0}
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="border-t pt-4 space-y-4">
        <h4 className="text-sm font-semibold">Hero defaults</h4>
        <div className="space-y-2">
          <Label htmlFor="landing-hero-heading">Hero heading (H1)</Label>
          <Input
            id="landing-hero-heading"
            value={heroHeading}
            onChange={(e) => setHeroHeading(e.target.value)}
            placeholder="Urban Hub for Medicine Students"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="landing-hero-subheading">Hero subheading (subtitle)</Label>
          <Textarea
            id="landing-hero-subheading"
            value={heroSubheading}
            onChange={(e) => setHeroSubheading(e.target.value)}
            rows={2}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="landing-cta-label">Default CTA label</Label>
            <Input
              id="landing-cta-label"
              value={defaultCtaLabel}
              onChange={(e) => setDefaultCtaLabel(e.target.value)}
              placeholder="Book a viewing"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="landing-cta-type">Default CTA type</Label>
            <select
              id="landing-cta-type"
              value={defaultCtaType}
              onChange={(e) =>
                setDefaultCtaType(
                  e.target.value as "viewing" | "callback" | "refer_friend" | "content_creator",
                )
              }
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="viewing">Book a viewing</option>
              <option value="callback">Get a callback</option>
              <option value="refer_friend">Refer a friend</option>
              <option value="content_creator">Content creator form</option>
              <option value="secure_booking">Secure booking payment</option>
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="landing-cta-key">Default CTA tracking key (optional)</Label>
          <Input
            id="landing-cta-key"
            value={defaultCtaTrackingKey}
            onChange={(e) => setDefaultCtaTrackingKey(e.target.value)}
            placeholder="e.g. med-landing-hero"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="landing-meta-pixel-id">Meta pixel ID (optional)</Label>
            <Input
              id="landing-meta-pixel-id"
              value={metaPixelId}
              onChange={(e) => setMetaPixelId(e.target.value)}
              placeholder="e.g. 123456789012345"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="landing-tiktok-pixel-id">TikTok pixel ID (optional)</Label>
            <Input
              id="landing-tiktok-pixel-id"
              value={tiktokPixelId}
              onChange={(e) => setTiktokPixelId(e.target.value)}
              placeholder="e.g. CXXXXXXXXXXXXX"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="landing-snap-pixel-id">Snapchat pixel ID (optional)</Label>
            <Input
              id="landing-snap-pixel-id"
              value={snapchatPixelId}
              onChange={(e) => setSnapchatPixelId(e.target.value)}
              placeholder="e.g. 11111111-2222-3333-4444-555555555555"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="landing-google-ads-conversion-id">Google Ads conversion ID (optional)</Label>
            <Input
              id="landing-google-ads-conversion-id"
              value={googleAdsConversionId}
              onChange={(e) => setGoogleAdsConversionId(e.target.value)}
              placeholder="e.g. AW-1234567890"
            />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="landing-google-ads-label-lead">Google Ads lead label (optional)</Label>
            <Input
              id="landing-google-ads-label-lead"
              value={googleAdsConversionLabelLead}
              onChange={(e) => setGoogleAdsConversionLabelLead(e.target.value)}
              placeholder="Lead conversion label"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="landing-google-ads-label-purchase">Google Ads purchase label (optional)</Label>
            <Input
              id="landing-google-ads-label-purchase"
              value={googleAdsConversionLabelPurchase}
              onChange={(e) => setGoogleAdsConversionLabelPurchase(e.target.value)}
              placeholder="Purchase conversion label"
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-4 space-y-4">
        <h4 className="text-sm font-semibold">Room grades section copy</h4>
        <div className="space-y-2">
          <Label htmlFor="landing-room-heading">Section title</Label>
          <Input
            id="landing-room-heading"
            value={roomGradesHeading}
            onChange={(e) => setRoomGradesHeading(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="landing-room-desc">Section description</Label>
          <Textarea
            id="landing-room-desc"
            value={roomGradesDescription}
            onChange={(e) => setRoomGradesDescription(e.target.value)}
            rows={3}
          />
        </div>
      </div>

      <div className="border-t pt-4 space-y-4">
        <h4 className="text-sm font-semibold">Landing info stack (left column)</h4>
        {infoStackItems.map((item, index) => (
          <div key={`info-${index}`} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Item {index + 1}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setInfoStackItems((prev) => prev.filter((_, i) => i !== index))
                }
                disabled={infoStackItems.length === 1}
              >
                Remove
              </Button>
            </div>
            <Input
              value={item.title}
              onChange={(e) =>
                setInfoStackItems((prev) =>
                  prev.map((it, i) => (i === index ? { ...it, title: e.target.value } : it)),
                )
              }
              placeholder="Title"
            />
            <Textarea
              value={item.description}
              onChange={(e) =>
                setInfoStackItems((prev) =>
                  prev.map((it, i) => (i === index ? { ...it, description: e.target.value } : it)),
                )
              }
              rows={3}
              placeholder="Description"
            />
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => setInfoStackItems((prev) => [...prev, { title: "", description: "" }])}
        >
          Add info stack item
        </Button>
      </div>

      <div className="border-t pt-4 space-y-4">
        <h4 className="text-sm font-semibold">Landing FAQs (right column)</h4>
        <p className="text-xs text-muted-foreground">Add at least 6 complete FAQs if this side is used.</p>
        {faqItems.map((item, index) => (
          <div key={`faq-${index}`} className="rounded-lg border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">FAQ {index + 1}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setFaqItems((prev) => prev.filter((_, i) => i !== index))}
                disabled={faqItems.length <= 6}
              >
                Remove
              </Button>
            </div>
            <Input
              value={item.question}
              onChange={(e) =>
                setFaqItems((prev) =>
                  prev.map((it, i) => (i === index ? { ...it, question: e.target.value } : it)),
                )
              }
              placeholder="Question"
            />
            <Textarea
              value={item.answer}
              onChange={(e) =>
                setFaqItems((prev) =>
                  prev.map((it, i) => (i === index ? { ...it, answer: e.target.value } : it)),
                )
              }
              rows={3}
              placeholder="Answer"
            />
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => setFaqItems((prev) => [...prev, { question: "", answer: "" }])}
        >
          Add FAQ item
        </Button>
      </div>

      {initial && (
        <HeroSlidesManager landingPageId={initial.id} />
      )}

      <div className="border-t pt-4 space-y-4">
        <h4 className="text-sm font-semibold">SEO</h4>
        <p className="text-xs text-muted-foreground">
          Used for <span className="font-mono">/landing/{slug || "slug"}</span>. Inactive pages are noindexed.
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="landing-meta-title">Meta title</Label>
            <CharCounter value={metaTitle} limit={META_TITLE_LIMIT} />
          </div>
          <Input
            id="landing-meta-title"
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
            placeholder={heroHeading || name || "50–60 characters"}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="landing-meta-desc">Meta description</Label>
            <CharCounter value={metaDescription} limit={META_DESC_LIMIT} />
          </div>
          <Textarea
            id="landing-meta-desc"
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
            rows={3}
            className="resize-y"
            placeholder={heroSubheading || "155–160 characters"}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="landing-focus">Focus keyphrase</Label>
          <Input
            id="landing-focus"
            value={focusKeyword}
            onChange={(e) => setFocusKeyword(e.target.value)}
            placeholder="e.g. student apartments Preston"
          />
        </div>
        <FocusPhraseGuide
          phrase={focusKeyword}
          title={metaTitle || heroHeading || name}
          description={metaDescription || heroSubheading}
          h1={heroHeading || name}
        />
      </div>

      <div className="flex gap-2 justify-end pt-2 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save
        </Button>
      </div>
    </form>
  );
}

type HomepageHeroSlideAdmin = {
  id: string;
  landing_page_id: string;
  title: string;
  subtitle: string | null;
  cta_label: string | null;
  cta_type: LandingHeroCtaType | null;
  desktop_image_url: string | null;
  mobile_image_url: string | null;
  homepage_order: number | null;
  content_alignment?: LandingHeroAlignment | null;
  page_name?: string;
  page_slug?: string;
};

function HomepageHeroOrderPanel({
  onEditLandingPage,
}: {
  onEditLandingPage: (landingPageId: string) => void;
}) {
  const queryClient = useQueryClient();

  const { data: slides, isLoading } = useQuery({
    queryKey: ["admin-homepage-hero-slides"],
    queryFn: async () => {
      const { data, error } = await fetchLandingHeroSlides({
        select:
          "id, landing_page_id, title, subtitle, cta_label, cta_type, desktop_image_url, mobile_image_url, homepage_order, content_alignment, show_on_homepage, is_active",
        legacySelect:
          "id, landing_page_id, title, subtitle, cta_label, cta_type, desktop_image_url, mobile_image_url, homepage_order, show_on_homepage, is_active",
        applyFilters: (query) =>
          query
            .eq("show_on_homepage", true)
            .eq("is_active", true)
            .order("homepage_order", { ascending: true }),
      });
      if (error) throw error;

      const pageIds = Array.from(
        new Set(data.map((s) => s.landing_page_id).filter(Boolean) as string[]),
      );
      let pageMap = new Map<string, { name: string; slug: string }>();
      if (pageIds.length) {
        const { data: pages, error: pagesError } = await supabase
          .from("website_landing_pages")
          .select("id, name, slug")
          .in("id", pageIds);
        if (pagesError) throw pagesError;
        pageMap = new Map((pages || []).map((p) => [p.id, { name: p.name, slug: p.slug }]));
      }

      return data
        .map((slide) => {
          const page = slide.landing_page_id ? pageMap.get(slide.landing_page_id) : undefined;
          return {
            id: slide.id,
            landing_page_id: slide.landing_page_id || "",
            title: slide.title,
            subtitle: slide.subtitle,
            cta_label: slide.cta_label,
            cta_type: slide.cta_type,
            desktop_image_url: slide.desktop_image_url,
            mobile_image_url: slide.mobile_image_url,
            homepage_order: slide.homepage_order ?? null,
            content_alignment: slide.content_alignment ?? "center",
            page_name: page?.name,
            page_slug: page?.slug,
          } as HomepageHeroSlideAdmin;
        })
        .sort((a, b) => (a.homepage_order ?? 9999) - (b.homepage_order ?? 9999));
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) =>
        supabase
          .from("website_landing_hero_slides")
          .update({ homepage_order: index + 1, show_on_homepage: true })
          .eq("id", id),
      );
      const results = await Promise.all(updates);
      const firstError = results.find((r) => r.error)?.error;
      if (firstError) throw firstError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-homepage-hero-slides"] });
      queryClient.invalidateQueries({ queryKey: ["admin-website-landing-hero-slides"] });
      toast.success("Homepage hero order updated.");
    },
    onError: () => toast.error("Failed to update homepage hero order."),
  });

  const removeFromHomepageMutation = useMutation({
    mutationFn: async (id: string) => {
      const remainingIds = (slides || []).filter((s) => s.id !== id).map((s) => s.id);
      const { error } = await supabase
        .from("website_landing_hero_slides")
        .update({ show_on_homepage: false, homepage_order: null })
        .eq("id", id);
      if (error) throw error;
      if (remainingIds.length) {
        const updates = remainingIds.map((slideId, index) =>
          supabase
            .from("website_landing_hero_slides")
            .update({ homepage_order: index + 1 })
            .eq("id", slideId),
        );
        const results = await Promise.all(updates);
        const firstError = results.find((r) => r.error)?.error;
        if (firstError) throw firstError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-homepage-hero-slides"] });
      queryClient.invalidateQueries({ queryKey: ["admin-website-landing-hero-slides"] });
      toast.success("Slide removed from homepage hero.");
    },
    onError: () => toast.error("Failed to remove slide from homepage."),
  });

  const move = (index: number, direction: -1 | 1) => {
    if (!slides?.length) return;
    const target = index + direction;
    if (target < 0 || target >= slides.length) return;
    const next = [...slides];
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    reorderMutation.mutate(next.map((s) => s.id));
  };

  const renumberAll = () => {
    if (!slides?.length) return;
    reorderMutation.mutate(slides.map((s) => s.id));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Homepage hero slides</h2>
          <p className="text-sm text-muted-foreground">
            These are the active slides currently shown on the homepage carousel. Use the arrows to
            set 1st, 2nd, 3rd…
          </p>
        </div>
        {slides && slides.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={renumberAll}
            disabled={reorderMutation.isPending}
          >
            {reorderMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Normalize order (1…{slides.length})
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !slides?.length ? (
        <div className="rounded-lg border border-dashed px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            No homepage hero slides yet. Open a landing page, edit a hero slide, and turn on
            “Also show on homepage hero”.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {slides.map((slide, index) => {
            const thumb = slide.desktop_image_url || slide.mobile_image_url;
            return (
              <div
                key={slide.id}
                className="flex items-center gap-3 rounded-xl border bg-background px-3 py-2.5 shadow-sm"
              >
                <div className="flex w-12 flex-col items-center gap-0.5">
                  <span className="font-display text-xl font-black leading-none text-foreground">
                    {index + 1}
                  </span>
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {slide.homepage_order != null ? `#${slide.homepage_order}` : "—"}
                  </span>
                </div>

                <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {thumb ? (
                    <img src={thumb} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] uppercase text-muted-foreground">
                      No img
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="truncate text-sm font-semibold">{slide.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {slide.page_name || "Unknown landing page"}
                    {slide.page_slug ? (
                      <code className="ml-1.5 rounded bg-muted px-1 py-0.5 text-[10px]">
                        /landing/{slide.page_slug}
                      </code>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {getLandingHeroCtaLabel(slide.cta_type, slide.cta_label)}
                    {slide.content_alignment
                      ? ` · ${slide.content_alignment === "left" ? "Left" : "Center"}`
                      : ""}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col gap-0.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={index === 0 || reorderMutation.isPending}
                    onClick={() => move(index, -1)}
                    aria-label="Move up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={index === slides.length - 1 || reorderMutation.isPending}
                    onClick={() => move(index, 1)}
                    aria-label="Move down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onEditLandingPage(slide.landing_page_id)}
                    aria-label="Edit landing page"
                    disabled={!slide.landing_page_id}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => removeFromHomepageMutation.mutate(slide.id)}
                    disabled={removeFromHomepageMutation.isPending}
                    aria-label="Remove from homepage"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function HeroSlidesManager({ landingPageId }: { landingPageId: string }) {
  const queryClient = useQueryClient();
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: slides, isLoading } = useQuery({
    queryKey: ["admin-website-landing-hero-slides", landingPageId],
    queryFn: async () => {
      const { data, error } = await fetchLandingHeroSlides({
        select:
          "id, landing_page_id, title, subtitle, subtitle_link_url, content_alignment, cta_label, cta_type, cta_url, cta_tracking_key, cta2_label, cta2_type, cta2_url, cta2_tracking_key, desktop_image_url, desktop_image_alt, mobile_image_url, mobile_image_alt, h1_image_url, h1_image_alt, h1_image_scale, h1_image_scale_mobile, sort_order, is_active, show_on_homepage, homepage_order",
        legacySelect:
          "id, landing_page_id, title, subtitle, subtitle_link_url, cta_label, cta_type, cta_tracking_key, desktop_image_url, desktop_image_alt, mobile_image_url, mobile_image_alt, h1_image_url, h1_image_alt, h1_image_scale, h1_image_scale_mobile, sort_order, is_active, show_on_homepage, homepage_order",
        applyFilters: (query) =>
          query.eq("landing_page_id", landingPageId).order("sort_order", { ascending: true }),
      });
      if (error) throw error;
      return data.map((slide) => ({
        ...slide,
        content_alignment: slide.content_alignment === "left" ? "left" : "center",
        cta_type: (slide.cta_type || "viewing") as LandingHeroCtaType,
        cta_url: slide.cta_url ?? null,
        cta2_label: slide.cta2_label ?? null,
        cta2_type: (slide.cta2_type ?? null) as LandingHeroCtaType | null,
        cta2_url: slide.cta2_url ?? null,
        cta2_tracking_key: slide.cta2_tracking_key ?? null,
        landing_page_id: slide.landing_page_id || landingPageId,
        is_active: slide.is_active ?? true,
        show_on_homepage: slide.show_on_homepage ?? false,
        homepage_order: slide.homepage_order ?? null,
        sort_order: slide.sort_order ?? 0,
      })) as HeroSlideRow[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<HeroSlideRow> }) => {
      const { error } = await supabase.from("website_landing_hero_slides").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-website-landing-hero-slides", landingPageId] });
      queryClient.invalidateQueries({ queryKey: ["admin-homepage-hero-slides"] });
      toast.success("Hero slide updated.");
      setEditingSlideId(null);
    },
    onError: (err: { message?: string; code?: string }) => {
      if (err?.code === "42703" || err?.message?.includes("does not exist")) {
        toast.error(
          "Database migration required. Run 041_landing_hero_slide_layout_and_secondary_cta.sql in Supabase.",
        );
        return;
      }
      toast.error("Failed to update hero slide.");
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Omit<HeroSlideRow, "id" | "landing_page_id">) => {
      const { error } = await supabase
        .from("website_landing_hero_slides")
        .insert({ ...payload, landing_page_id: landingPageId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-website-landing-hero-slides", landingPageId] });
      queryClient.invalidateQueries({ queryKey: ["admin-homepage-hero-slides"] });
      toast.success("Hero slide created.");
      setCreateOpen(false);
    },
    onError: (err: { message?: string; code?: string }) => {
      if (err?.code === "42703" || err?.message?.includes("does not exist")) {
        toast.error(
          "Database migration required. Run 041_landing_hero_slide_layout_and_secondary_cta.sql in Supabase.",
        );
        return;
      }
      toast.error("Failed to create hero slide.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("website_landing_hero_slides").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-website-landing-hero-slides", landingPageId] });
      queryClient.invalidateQueries({ queryKey: ["admin-homepage-hero-slides"] });
      toast.success("Hero slide deleted.");
      setEditingSlideId(null);
    },
    onError: () => toast.error("Failed to delete hero slide."),
  });

  const editing = slides?.find((s) => s.id === editingSlideId) ?? null;

  return (
    <div className="border-t pt-4 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="text-sm font-semibold">Hero slides</h4>
        <Button type="button" size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add slide
        </Button>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : !slides?.length ? (
        <p className="py-4 text-sm text-muted-foreground">
          No hero slides yet. Add at least one slide to enable the landing page hero carousel.
        </p>
      ) : (
        <div className="space-y-2">
          {slides.map((slide) => (
            <div
              key={slide.id}
              className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 gap-3"
            >
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium truncate">{slide.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {getLandingHeroCtaLabel(slide.cta_type, slide.cta_label)}
                  {slide.cta2_label?.trim() && slide.cta2_type
                    ? ` · ${getLandingHeroCtaLabel(slide.cta2_type, slide.cta2_label)}`
                    : ""}
                  {` · ${slide.content_alignment === "left" ? "Left" : "Center"}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={slide.is_active ? "default" : "secondary"}>
                  {slide.is_active ? "Active" : "Hidden"}
                </Badge>
                <span className="text-xs text-muted-foreground">#{slide.sort_order}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingSlideId(slide.id)}
                  aria-label="Edit slide"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => deleteMutation.mutate(slide.id)}
                  disabled={deleteMutation.isPending}
                  aria-label="Delete slide"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit slide sheet */}
      <Sheet open={!!editingSlideId} onOpenChange={(open) => !open && setEditingSlideId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto" aria-describedby="edit-hero-slide-desc">
          <SheetHeader>
            <SheetTitle>Edit hero slide</SheetTitle>
            <SheetDescription id="edit-hero-slide-desc">
              Fine-tune this slide’s heading, subtitle, CTA, and desktop/mobile imagery.
            </SheetDescription>
          </SheetHeader>
          {editing && (
            <HeroSlideForm
              initial={editing}
              onSubmit={(payload) => updateMutation.mutate({ id: editing.id, payload })}
              onCancel={() => setEditingSlideId(null)}
              isLoading={updateMutation.isPending}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Create slide sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto" aria-describedby="create-hero-slide-desc">
          <SheetHeader>
            <SheetTitle>Add hero slide</SheetTitle>
            <SheetDescription id="create-hero-slide-desc">
              Add a new hero slide with CTA and desktop/mobile images for this landing page.
            </SheetDescription>
          </SheetHeader>
          <HeroSlideForm
            initial={null}
            onSubmit={(payload) =>
              createMutation.mutate({
                ...payload,
              } as Omit<HeroSlideRow, "id" | "landing_page_id">)
            }
            onCancel={() => setCreateOpen(false)}
            isLoading={createMutation.isPending}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function HeroSlideForm({
  initial,
  onSubmit,
  onCancel,
  isLoading,
}: {
  initial: HeroSlideRow | null;
  onSubmit: (payload: Omit<HeroSlideRow, "id" | "landing_page_id"> | Partial<HeroSlideRow>) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [subtitle, setSubtitle] = useState(initial?.subtitle ?? "");
  const [subtitleLinkUrl, setSubtitleLinkUrl] = useState(initial?.subtitle_link_url ?? "");
  const [contentAlignment, setContentAlignment] = useState<LandingHeroAlignment>(
    initial?.content_alignment ?? "center",
  );
  const [ctaLabel, setCtaLabel] = useState(initial?.cta_label ?? "");
  const [ctaType, setCtaType] = useState<LandingHeroCtaType>(initial?.cta_type ?? "viewing");
  const [ctaUrl, setCtaUrl] = useState(initial?.cta_url ?? "");
  const [ctaTrackingKey, setCtaTrackingKey] = useState(initial?.cta_tracking_key ?? "");
  const [cta2Enabled, setCta2Enabled] = useState(
    Boolean(initial?.cta2_label?.trim() && initial?.cta2_type),
  );
  const [cta2Label, setCta2Label] = useState(initial?.cta2_label ?? "");
  const [cta2Type, setCta2Type] = useState<LandingHeroCtaType>(initial?.cta2_type ?? "callback");
  const [cta2Url, setCta2Url] = useState(initial?.cta2_url ?? "");
  const [cta2TrackingKey, setCta2TrackingKey] = useState(initial?.cta2_tracking_key ?? "");
  const [desktopImageUrl, setDesktopImageUrl] = useState(initial?.desktop_image_url ?? "");
  const [desktopImageAlt, setDesktopImageAlt] = useState(initial?.desktop_image_alt ?? "");
  const [mobileImageUrl, setMobileImageUrl] = useState(initial?.mobile_image_url ?? "");
  const [mobileImageAlt, setMobileImageAlt] = useState(initial?.mobile_image_alt ?? "");
  const [h1ImageUrl, setH1ImageUrl] = useState(initial?.h1_image_url ?? "");
  const [h1ImageAlt, setH1ImageAlt] = useState(initial?.h1_image_alt ?? "");
  const [h1ImageScale, setH1ImageScale] = useState<number>(initial?.h1_image_scale ?? 1);
  const [h1ImageScaleMobile, setH1ImageScaleMobile] = useState<number>(
    initial?.h1_image_scale_mobile ?? (initial?.h1_image_scale ?? 1),
  );
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0);
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [showOnHomepage, setShowOnHomepage] = useState(initial?.show_on_homepage ?? false);
  const [homepageOrder, setHomepageOrder] = useState<number | "">(initial?.homepage_order ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }
    if (!desktopImageUrl.trim() && !mobileImageUrl.trim()) {
      toast.error("At least one image (desktop or mobile) is required.");
      return;
    }
    if (ctaType === "custom_link" && !ctaUrl.trim()) {
      toast.error("Primary CTA custom link requires a URL.");
      return;
    }
    if (cta2Enabled) {
      if (!cta2Label.trim()) {
        toast.error("Secondary CTA needs a label.");
        return;
      }
      if (cta2Type === "custom_link" && !cta2Url.trim()) {
        toast.error("Secondary CTA custom link requires a URL.");
        return;
      }
    }
    const payload: Omit<HeroSlideRow, "id" | "landing_page_id"> | Partial<HeroSlideRow> = {
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      subtitle_link_url: subtitleLinkUrl.trim() || null,
      content_alignment: contentAlignment,
      cta_label: ctaLabel.trim() || null,
      cta_type: ctaType,
      cta_url: ctaType === "custom_link" ? ctaUrl.trim() || null : null,
      cta_tracking_key: ctaTrackingKey.trim() || null,
      cta2_label: cta2Enabled ? cta2Label.trim() || null : null,
      cta2_type: cta2Enabled ? cta2Type : null,
      cta2_url: cta2Enabled && cta2Type === "custom_link" ? cta2Url.trim() || null : null,
      cta2_tracking_key: cta2Enabled ? cta2TrackingKey.trim() || null : null,
      desktop_image_url: desktopImageUrl.trim() || null,
      desktop_image_alt: desktopImageAlt.trim() || null,
      mobile_image_url: mobileImageUrl.trim() || null,
      mobile_image_alt: mobileImageAlt.trim() || null,
      h1_image_url: h1ImageUrl.trim() || null,
      h1_image_alt: h1ImageAlt.trim() || null,
      h1_image_scale: Number.isFinite(h1ImageScale) ? h1ImageScale : 1,
      h1_image_scale_mobile: Number.isFinite(h1ImageScaleMobile)
        ? h1ImageScaleMobile
        : Number.isFinite(h1ImageScale)
          ? h1ImageScale
          : 1,
      sort_order: Number(sortOrder) || 0,
      is_active: isActive,
      show_on_homepage: showOnHomepage,
      homepage_order:
        showOnHomepage && homepageOrder !== "" ? Number(homepageOrder) || null : null,
    };
    onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="hero-title">Title (H1 on first slide)</Label>
        <Input
          id="hero-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="Headline for this hero slide"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="hero-subtitle">Subtitle</Label>
        <Textarea
          id="hero-subtitle"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          rows={2}
        />
        <Input
          value={subtitleLinkUrl}
          onChange={(e) => setSubtitleLinkUrl(e.target.value)}
          placeholder="Optional link URL – makes subtitle clickable"
          className="mt-2"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="hero-alignment">Content alignment</Label>
        <select
          id="hero-alignment"
          value={contentAlignment}
          onChange={(e) => setContentAlignment(e.target.value as LandingHeroAlignment)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="center">Center (classic homepage)</option>
          <option value="left">Left (international students style)</option>
        </select>
        <p className="text-xs text-muted-foreground">
          Left aligns content bottom-left with dual CTAs; center keeps the classic middle layout.
        </p>
      </div>

      <div className="space-y-3 rounded-lg border p-3">
        <p className="text-sm font-medium">Primary CTA</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="hero-cta-label">CTA label</Label>
            <Input
              id="hero-cta-label"
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
              placeholder={getLandingHeroCtaLabel(ctaType)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hero-cta-type">CTA type</Label>
            <select
              id="hero-cta-type"
              value={ctaType}
              onChange={(e) => setCtaType(e.target.value as LandingHeroCtaType)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {LANDING_HERO_CTA_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        {ctaType === "custom_link" ? (
          <div className="space-y-2">
            <Label htmlFor="hero-cta-url">Custom link URL</Label>
            <Input
              id="hero-cta-url"
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
              placeholder="https://…"
              required
            />
          </div>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="hero-cta-key">CTA tracking key (optional)</Label>
          <Input
            id="hero-cta-key"
            value={ctaTrackingKey}
            onChange={(e) => setCtaTrackingKey(e.target.value)}
            placeholder="e.g. med-hero-slide-1"
          />
        </div>
      </div>

      <div className="space-y-3 rounded-lg border p-3">
        <div className="flex items-center gap-2">
          <Switch id="hero-cta2-enabled" checked={cta2Enabled} onCheckedChange={setCta2Enabled} />
          <Label htmlFor="hero-cta2-enabled">Add secondary CTA</Label>
        </div>
        {cta2Enabled ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="hero-cta2-label">Secondary CTA label</Label>
                <Input
                  id="hero-cta2-label"
                  value={cta2Label}
                  onChange={(e) => setCta2Label(e.target.value)}
                  placeholder={getLandingHeroCtaLabel(cta2Type)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hero-cta2-type">Secondary CTA type</Label>
                <select
                  id="hero-cta2-type"
                  value={cta2Type}
                  onChange={(e) => setCta2Type(e.target.value as LandingHeroCtaType)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {LANDING_HERO_CTA_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {cta2Type === "custom_link" ? (
              <div className="space-y-2">
                <Label htmlFor="hero-cta2-url">Secondary custom link URL</Label>
                <Input
                  id="hero-cta2-url"
                  value={cta2Url}
                  onChange={(e) => setCta2Url(e.target.value)}
                  placeholder="https://…"
                  required
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="hero-cta2-key">Secondary tracking key (optional)</Label>
              <Input
                id="hero-cta2-key"
                value={cta2TrackingKey}
                onChange={(e) => setCta2TrackingKey(e.target.value)}
                placeholder="e.g. med-hero-slide-1-secondary"
              />
            </div>
          </>
        ) : null}
      </div>

      <div className="space-y-3 border-t pt-3">
        <Label>Desktop image</Label>
        <ImageUpload
          label="Desktop image"
          value={desktopImageUrl}
          onChange={setDesktopImageUrl}
          folder="landing-hero"
        />
        <Input
          value={desktopImageAlt}
          onChange={(e) => setDesktopImageAlt(e.target.value)}
          placeholder="Desktop image alt text (optional)"
        />
      </div>

      <div className="space-y-3">
        <Label>Mobile image</Label>
        <ImageUpload
          label="Mobile image"
          value={mobileImageUrl}
          onChange={setMobileImageUrl}
          folder="landing-hero"
        />
        <Input
          value={mobileImageAlt}
          onChange={(e) => setMobileImageAlt(e.target.value)}
          placeholder="Mobile image alt text (optional)"
        />
      </div>

      <div className="space-y-3 border-t pt-3">
        <Label>Optional H1 image (styled heading)</Label>
        <ImageUpload
          label="H1 image (PNG/SVG with styled text)"
          value={h1ImageUrl}
          onChange={setH1ImageUrl}
          folder="landing-hero-h1"
        />
        <Input
          value={h1ImageAlt}
          onChange={(e) => setH1ImageAlt(e.target.value)}
          placeholder="H1 image alt text (for accessibility)"
        />
        <div className="space-y-1">
          <Label htmlFor="hero-h1-scale">H1 image scale (desktop)</Label>
          <Input
            id="hero-h1-scale"
            type="number"
            min={0.5}
            max={2}
            step={0.05}
            value={h1ImageScale}
            onChange={(e) => setH1ImageScale(parseFloat(e.target.value) || 1)}
          />
          <p className="text-xs text-muted-foreground">
            Adjust desktop/tablet H1 image size (1 = default).
          </p>
        </div>
        <div className="space-y-1">
          <Label htmlFor="hero-h1-scale-mobile">H1 image scale (mobile)</Label>
          <Input
            id="hero-h1-scale-mobile"
            type="number"
            min={0.5}
            max={2}
            step={0.05}
            value={h1ImageScaleMobile}
            onChange={(e) => setH1ImageScaleMobile(parseFloat(e.target.value) || 1)}
          />
          <p className="text-xs text-muted-foreground">
            Fine-tune how large the H1 image appears on mobile independently from desktop.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="hero-sort">Sort order</Label>
          <Input
            id="hero-sort"
            type="number"
            min={0}
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
          />
        </div>
        <div className="flex flex-col gap-3 pt-2">
          <div className="flex items-center gap-2">
            <Switch id="hero-active" checked={isActive} onCheckedChange={setIsActive} />
            <Label htmlFor="hero-active">Active (shown on landing page)</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="hero-homepage"
              checked={showOnHomepage}
              onCheckedChange={setShowOnHomepage}
            />
            <Label htmlFor="hero-homepage">Also show on homepage hero</Label>
          </div>
        </div>
      </div>

      {showOnHomepage && (
        <div className="space-y-2">
          <Label htmlFor="hero-homepage-order">Homepage order</Label>
          <Input
            id="hero-homepage-order"
            type="number"
            min={1}
            value={homepageOrder}
            onChange={(e) =>
              setHomepageOrder(e.target.value === "" ? "" : Number(e.target.value) || 1)
            }
            placeholder="1, 2, 3…"
          />
          <p className="text-xs text-muted-foreground">
            Controls the order of this slide among other homepage hero slides. Existing homepage
            slides keep their current position.
          </p>
        </div>
      )}

      <div className="flex gap-2 justify-end pt-2 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save slide
        </Button>
      </div>
    </form>
  );
}

