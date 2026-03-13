import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { Loader2, Pencil, Plus, Trash2, Copy, Eye } from "lucide-react";
import { toast } from "sonner";

type LandingPageRow = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  hero_heading: string | null;
  hero_subheading: string | null;
  default_cta_label: string | null;
  default_cta_type: "viewing" | "callback" | "refer_friend" | "content_creator";
  default_cta_tracking_key: string | null;
  room_grades_heading: string | null;
  room_grades_description: string | null;
};

type HeroSlideRow = {
  id: string;
  landing_page_id: string;
  title: string;
  subtitle: string | null;
  subtitle_link_url: string | null;
  cta_label: string | null;
  cta_type: "viewing" | "callback" | "refer_friend" | "content_creator";
  cta_tracking_key: string | null;
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

  const { data: pages, isLoading } = useQuery({
    queryKey: ["admin-website-landing-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("website_landing_pages")
        .select(
          "id, name, slug, is_active, hero_heading, hero_subheading, default_cta_label, default_cta_type, default_cta_tracking_key, room_grades_heading, room_grades_description",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as LandingPageRow[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<LandingPageRow> }) => {
      const { error } = await supabase.from("website_landing_pages").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-website-landing-pages"] });
      toast.success("Landing page updated.");
      setEditingId(null);
    },
    onError: () => toast.error("Failed to update landing page."),
  });

  const createMutation = useMutation({
    mutationFn: async (payload: Omit<LandingPageRow, "id">) => {
      const { error } = await supabase.from("website_landing_pages").insert(payload);
      if (error) throw error;
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
      const { error } = await supabase.from("website_landing_pages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-website-landing-pages"] });
      toast.success("Landing page deleted.");
      setEditingId(null);
    },
    onError: () => toast.error("Failed to delete landing page."),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (page: LandingPageRow) => {
      const baseSlug = page.slug.endsWith("-copy") ? page.slug : `${page.slug}-copy`;
      const newSlug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;
      const insertPayload = {
        name: `${page.name} (Copy)`,
        slug: newSlug,
        is_active: false,
        hero_heading: page.hero_heading,
        hero_subheading: page.hero_subheading,
        default_cta_label: page.default_cta_label,
        default_cta_type: page.default_cta_type,
        default_cta_tracking_key: page.default_cta_tracking_key,
        room_grades_heading: page.room_grades_heading,
        room_grades_description: page.room_grades_description,
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
          "title, subtitle, subtitle_link_url, cta_label, cta_type, cta_tracking_key, desktop_image_url, desktop_image_alt, mobile_image_url, mobile_image_alt, h1_image_url, h1_image_alt, h1_image_scale, h1_image_scale_mobile, sort_order, is_active, show_on_homepage, homepage_order",
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-website-landing-pages"] });
      toast.success("Landing page duplicated.");
    },
    onError: () => toast.error("Failed to duplicate landing page."),
  });

  const editing = pages?.find((p) => p.id === editingId) ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Landing Pages</h1>
          <p className="text-muted-foreground">
            Manage one-page marketing landing pages with custom hero sliders, SEO copy, and tracking-friendly CTAs.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="w-fit">
          <Plus className="h-4 w-4 mr-2" />
          Add landing page
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All landing pages</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !pages?.length ? (
            <p className="py-8 text-center text-muted-foreground">
              No landing pages yet. Create one to get started.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Default CTA</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pages.map((page) => (
                    <TableRow key={page.id}>
                      <TableCell className="font-medium">{page.name}</TableCell>
                      <TableCell className="font-mono text-xs">{page.slug}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {page.default_cta_label || (page.default_cta_type === "callback" ? "Get a callback" : "Book a viewing")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={page.is_active ? "default" : "secondary"}>
                          {page.is_active ? "Yes" : "No"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          aria-label="Preview"
                        >
                          <a
                            href={`/landing/${page.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Eye className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingId(page.id)}
                          aria-label="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => duplicateMutation.mutate(page)}
                          disabled={duplicateMutation.isPending}
                          aria-label="Duplicate"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => deleteMutation.mutate(page.id)}
                          disabled={deleteMutation.isPending}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
              onSubmit={(payload) => updateMutation.mutate({ id: editing.id, payload })}
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
            onSubmit={(payload) =>
              createMutation.mutate({
                ...payload,
                is_active: false,
              } as Omit<LandingPageRow, "id">)
            }
            onCancel={() => setCreateOpen(false)}
            isLoading={createMutation.isPending}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function LandingPageForm({
  initial,
  onSubmit,
  onCancel,
  isLoading,
}: {
  initial: LandingPageRow | null;
  onSubmit: (payload: Omit<LandingPageRow, "id"> | Partial<LandingPageRow>) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [heroHeading, setHeroHeading] = useState(initial?.hero_heading ?? "");
  const [heroSubheading, setHeroSubheading] = useState(initial?.hero_subheading ?? "");
  const [defaultCtaLabel, setDefaultCtaLabel] = useState(initial?.default_cta_label ?? "");
  const [defaultCtaType, setDefaultCtaType] = useState<
    "viewing" | "callback" | "refer_friend" | "content_creator"
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
    const payload: Omit<LandingPageRow, "id"> | Partial<LandingPageRow> = {
      name: name.trim(),
      slug: cleanSlug,
      is_active: isActive,
      hero_heading: heroHeading.trim() || null,
      hero_subheading: heroSubheading.trim() || null,
      default_cta_label: defaultCtaLabel.trim() || null,
      default_cta_type: defaultCtaType,
      default_cta_tracking_key: defaultCtaTrackingKey.trim() || null,
      room_grades_heading: roomGradesHeading.trim() || null,
      room_grades_description: roomGradesDescription.trim() || null,
    };
    onSubmit(payload);
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

      <div className="flex items-center gap-2">
        <Switch id="landing-active" checked={isActive} onCheckedChange={setIsActive} />
        <Label htmlFor="landing-active">Active (publicly accessible)</Label>
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

      {initial && (
        <HeroSlidesManager landingPageId={initial.id} />
      )}

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

function HeroSlidesManager({ landingPageId }: { landingPageId: string }) {
  const queryClient = useQueryClient();
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const { data: slides, isLoading } = useQuery({
    queryKey: ["admin-website-landing-hero-slides", landingPageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("website_landing_hero_slides")
        .select(
          "id, landing_page_id, title, subtitle, subtitle_link_url, cta_label, cta_type, cta_tracking_key, desktop_image_url, desktop_image_alt, mobile_image_url, mobile_image_alt, h1_image_url, h1_image_alt, h1_image_scale, h1_image_scale_mobile, sort_order, is_active, show_on_homepage, homepage_order",
        )
        .eq("landing_page_id", landingPageId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data || []) as HeroSlideRow[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<HeroSlideRow> }) => {
      const { error } = await supabase.from("website_landing_hero_slides").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-website-landing-hero-slides", landingPageId] });
      toast.success("Hero slide updated.");
      setEditingSlideId(null);
    },
    onError: () => toast.error("Failed to update hero slide."),
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
      toast.success("Hero slide created.");
      setCreateOpen(false);
    },
    onError: () => toast.error("Failed to create hero slide."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("website_landing_hero_slides").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-website-landing-hero-slides", landingPageId] });
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
                  {slide.cta_label || (slide.cta_type === "callback" ? "Get a callback" : "Book a viewing")}
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
  const [ctaLabel, setCtaLabel] = useState(initial?.cta_label ?? "");
  const [ctaType, setCtaType] = useState<"viewing" | "callback" | "refer_friend" | "content_creator">(
    initial?.cta_type ?? "viewing",
  );
  const [ctaTrackingKey, setCtaTrackingKey] = useState(initial?.cta_tracking_key ?? "");
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
    const payload: Omit<HeroSlideRow, "id" | "landing_page_id"> | Partial<HeroSlideRow> = {
      title: title.trim(),
      subtitle: subtitle.trim() || null,
      subtitle_link_url: subtitleLinkUrl.trim() || null,
      cta_label: ctaLabel.trim() || null,
      cta_type: ctaType,
      cta_tracking_key: ctaTrackingKey.trim() || null,
      desktop_image_url: desktopImageUrl.trim() || null,
      desktop_image_alt: desktopImageAlt.trim() || null,
      mobile_image_url: mobileImageUrl.trim() || null,
      mobile_image_alt: mobileImageAlt.trim() || null,
      h1_image_url: h1ImageUrl.trim() || null,
      h1_image_alt: h1ImageAlt.trim() || null,
      h1_image_scale: Number.isFinite(h1ImageScale) ? h1ImageScale : 1,
      h1_image_scale_mobile: Number.isFinite(h1ImageScaleMobile) ? h1ImageScaleMobile : Number.isFinite(h1ImageScale) ? h1ImageScale : 1,
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
        <Label htmlFor="hero-subtitle">Subtitle (H4/span)</Label>
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="hero-cta-label">CTA label</Label>
          <Input
            id="hero-cta-label"
            value={ctaLabel}
            onChange={(e) => setCtaLabel(e.target.value)}
            placeholder={ctaType === "callback" ? "Get a callback" : "Book a viewing"}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="hero-cta-type">CTA type</Label>
          <select
            id="hero-cta-type"
            value={ctaType}
            onChange={(e) =>
              setCtaType(
                e.target.value as "viewing" | "callback" | "refer_friend" | "content_creator",
              )
            }
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="viewing">Book a viewing</option>
            <option value="callback">Get a callback</option>
            <option value="refer_friend">Refer a friend</option>
            <option value="content_creator">Content creator form</option>
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="hero-cta-key">CTA tracking key (optional)</Label>
        <Input
          id="hero-cta-key"
          value={ctaTrackingKey}
          onChange={(e) => setCtaTrackingKey(e.target.value)}
          placeholder="e.g. med-hero-slide-1"
        />
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

