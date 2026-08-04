import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Glasses, Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AdminListPagination,
  AdminListToolbar,
  adminIconButtonClass,
  adminIconClass,
  adminTableCellClass,
  adminTableHeadClass,
  paginateItems,
  useDebouncedAdminSearch,
} from "@/components/admin/AdminRecordList";
import { fetchVrTourRooms, type VrTourRoomRow } from "@/hooks/useVrTourRooms";
import { buildVrPanoramaVariants, slugifyVrRoomId } from "@/lib/vrPanoramaResize";
import { VR_TOUR_CATEGORIES, type VrTourCategory, type VrTourLink } from "@/data/vrTour";
import { cn } from "@/lib/utils";

const BUCKET = "website";
const STORAGE_PREFIX = "vr-tour";


type RoomFormState = {
  id: string;
  name: string;
  category: VrTourCategory;
  display_order: number;
  is_active: boolean;
  is_start: boolean;
  links: VrTourLink[];
  panorama_lg: string | null;
  panorama_sm: string | null;
  panorama_thumb: string | null;
};

const emptyForm = (): RoomFormState => ({
  id: "",
  name: "",
  category: "Common areas",
  display_order: 0,
  is_active: true,
  is_start: false,
  links: [],
  panorama_lg: null,
  panorama_sm: null,
  panorama_thumb: null,
});

function rowToForm(row: VrTourRoomRow): RoomFormState {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    display_order: row.display_order,
    is_active: row.is_active,
    is_start: row.is_start,
    links: row.links ?? [],
    panorama_lg: row.panorama_lg,
    panorama_sm: row.panorama_sm,
    panorama_thumb: row.panorama_thumb,
  };
}

async function uploadVariants(roomId: string, file: File, onProgress: (msg: string) => void) {
  const variants = await buildVrPanoramaVariants(file, onProgress);
  const urls: Record<"lg" | "sm" | "thumb", string> = { lg: "", sm: "", thumb: "" };

  for (const [suffix, blob] of Object.entries(variants) as Array<["lg" | "sm" | "thumb", Blob]>) {
    onProgress?.(`Uploading ${suffix}…`);
    const path = `${STORAGE_PREFIX}/${roomId}-${suffix}.webp`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
      contentType: "image/webp",
      upsert: true,
      cacheControl: "31536000",
    });
    if (error) throw error;
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    // Bust CDN/browser cache after replace
    urls[suffix] = `${data.publicUrl}?v=${Date.now()}`;
  }

  return urls;
}

async function clearOtherStartNodes(exceptId: string) {
  const { error } = await supabase
    .from("website_vr_tour_rooms" as never)
    .update({ is_start: false } as never)
    .neq("id", exceptId)
    .eq("is_start", true);
  if (error) throw error;
}

export default function VrTourRoomsList() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RoomFormState>(emptyForm);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const { searchQuery, setSearchQuery, debouncedSearch, currentPage, setCurrentPage } =
    useDebouncedAdminSearch();

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-vr-tour-rooms"],
    queryFn: () => fetchVrTourRooms(true),
  });

  const filteredRows = useMemo(() => {
    if (!rows?.length) return [];
    const q = debouncedSearch.toLowerCase();
    return rows.filter((row) => {
      if (statusFilter === "active" && !row.is_active) return false;
      if (statusFilter === "inactive" && row.is_active) return false;
      if (!q) return true;
      return (
        row.id.toLowerCase().includes(q) ||
        row.name.toLowerCase().includes(q) ||
        row.category.toLowerCase().includes(q)
      );
    });
  }, [rows, debouncedSearch, statusFilter]);

  const { paginated: paginatedRows, totalPages, safePage } = paginateItems(filteredRows, currentPage);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-vr-tour-rooms"] });
    queryClient.invalidateQueries({ queryKey: ["vr-tour-rooms-public"] });
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: RoomFormState) => {
      const id = slugifyVrRoomId(payload.id);
      if (!id) throw new Error("Room ID is required.");
      if (!payload.name.trim()) throw new Error("Room name is required.");
      if (!payload.panorama_lg || !payload.panorama_sm || !payload.panorama_thumb) {
        throw new Error("Upload a 360 panorama before saving.");
      }

      if (payload.is_start) {
        await clearOtherStartNodes(id);
      }

      const body = {
        id,
        name: payload.name.trim(),
        category: payload.category,
        display_order: Number(payload.display_order) || 0,
        is_active: payload.is_active,
        is_start: payload.is_start,
        links: payload.links.filter((l) => l.nodeId.trim()),
        panorama_lg: payload.panorama_lg,
        panorama_sm: payload.panorama_sm,
        panorama_thumb: payload.panorama_thumb,
      };

      if (editingId) {
        const { error } = await supabase
          .from("website_vr_tour_rooms" as never)
          .update(body as never)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("website_vr_tour_rooms" as never).insert(body as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success(editingId ? "Room updated." : "Room created.");
      setSheetOpen(false);
      setEditingId(null);
      setForm(emptyForm());
    },
    onError: (err: Error) => toast.error(err.message || "Failed to save room."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("website_vr_tour_rooms" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Room deleted.");
      setSheetOpen(false);
      setEditingId(null);
    },
    onError: () => toast.error("Failed to delete room."),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyForm(),
      display_order: (rows?.length ?? 0) + 1,
      is_start: !rows?.some((r) => r.is_start),
    });
    setSheetOpen(true);
  };

  const openEdit = (row: VrTourRoomRow) => {
    setEditingId(row.id);
    setForm(rowToForm(row));
    setSheetOpen(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const roomId = slugifyVrRoomId(form.id || file.name);
    if (!roomId) {
      toast.error("Set a room ID before uploading (e.g. 03-gym).");
      return;
    }

    setUploadBusy(true);
    setUploadProgress("Preparing…");
    try {
      const urls = await uploadVariants(roomId, file, setUploadProgress);
      setForm((prev) => ({
        ...prev,
        id: prev.id || roomId,
        name: prev.name || roomId.replace(/^\d+-/, "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        panorama_lg: urls.lg,
        panorama_sm: urls.sm,
        panorama_thumb: urls.thumb,
      }));
      toast.success("360 panorama uploaded (lg / sm / thumb).");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadBusy(false);
      setUploadProgress(null);
    }
  };

  const updateLink = (index: number, patch: Partial<VrTourLink>) => {
    setForm((prev) => ({
      ...prev,
      links: prev.links.map((link, i) => (i === index ? { ...link, ...patch } : link)),
    }));
  };

  const addLink = () => {
    setForm((prev) => ({
      ...prev,
      links: [...prev.links, { nodeId: "", yaw: "0deg", pitch: "-10deg" }],
    }));
  };

  const removeLink = (index: number) => {
    setForm((prev) => ({
      ...prev,
      links: prev.links.filter((_, i) => i !== index),
    }));
  };

  const otherRoomOptions = (rows ?? [])
    .map((r) => r.id)
    .filter((id) => id !== slugifyVrRoomId(form.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">VR Tour</h1>
          <p className="text-sm text-muted-foreground">
            Upload 360° panoramas and manage room hotspots for{" "}
            <a href="/vr-tour" target="_blank" rel="noreferrer" className="underline">
              /vr-tour
            </a>
            .
          </p>
        </div>
        <Button onClick={openCreate} className="w-fit">
          <Plus className="h-4 w-4 mr-2" />
          Add room
        </Button>
      </div>

      <div className="space-y-4">
        <AdminListToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search room id, name, category…"
          filters={
            <div className="flex gap-2">
              {(["all", "active", "inactive"] as const).map((key) => (
                <Button
                  key={key}
                  type="button"
                  size="sm"
                  variant={statusFilter === key ? "default" : "outline"}
                  onClick={() => setStatusFilter(key)}
                >
                  {key === "all" ? "All" : key === "active" ? "Active" : "Inactive"}
                </Button>
              ))}
            </div>
          }
        />

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={adminTableHeadClass}>Preview</TableHead>
                <TableHead className={adminTableHeadClass}>Room</TableHead>
                <TableHead className={adminTableHeadClass}>Category</TableHead>
                <TableHead className={adminTableHeadClass}>Links</TableHead>
                <TableHead className={adminTableHeadClass}>Order</TableHead>
                <TableHead className={adminTableHeadClass}>Status</TableHead>
                <TableHead className={cn(adminTableHeadClass, "w-[100px]")} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : paginatedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No VR rooms yet. If this is the first time, apply migration{" "}
                    <code className="text-xs">045_vr_tour_rooms.sql</code> in Supabase, then add a
                    room and upload a 360 image.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className={adminTableCellClass}>
                      {row.panorama_thumb ? (
                        <img
                          src={row.panorama_thumb}
                          alt=""
                          className="h-12 w-24 rounded object-cover bg-muted"
                        />
                      ) : (
                        <div className="flex h-12 w-24 items-center justify-center rounded bg-muted">
                          <Glasses className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className={adminTableCellClass}>
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-muted-foreground">{row.id}</div>
                      {row.is_start && (
                        <Badge variant="secondary" className="mt-1">
                          Start room
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className={adminTableCellClass}>{row.category}</TableCell>
                    <TableCell className={adminTableCellClass}>{(row.links ?? []).length}</TableCell>
                    <TableCell className={adminTableCellClass}>{row.display_order}</TableCell>
                    <TableCell className={adminTableCellClass}>
                      <Badge variant={row.is_active ? "default" : "outline"}>
                        {row.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className={adminTableCellClass}>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={adminIconButtonClass}
                          onClick={() => openEdit(row)}
                          aria-label="Edit room"
                        >
                          <Pencil className={adminIconClass} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <AdminListPagination
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={filteredRows.length}
        />
      </div>

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (uploadBusy) return;
          setSheetOpen(open);
          if (!open) {
            setEditingId(null);
            setForm(emptyForm());
          }
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
          aria-describedby="vr-room-sheet-desc"
        >
          <div className="flex-1 overflow-y-auto p-6 pr-12">
            <SheetHeader>
              <SheetTitle>{editingId ? "Edit VR room" : "Add VR room"}</SheetTitle>
              <SheetDescription id="vr-room-sheet-desc">
                Upload an equirectangular 360° image. We generate large, small, and thumbnail WebP
                versions automatically.
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="vr-room-id">Room ID</Label>
                  <Input
                    id="vr-room-id"
                    value={form.id}
                    disabled={Boolean(editingId) || uploadBusy}
                    placeholder="03-gym"
                    onChange={(e) => setForm((p) => ({ ...p, id: slugifyVrRoomId(e.target.value) }))}
                  />
                  <p className="text-xs text-muted-foreground">Lowercase slug, e.g. 03-gym</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vr-room-name">Display name</Label>
                  <Input
                    id="vr-room-name"
                    value={form.name}
                    disabled={uploadBusy}
                    placeholder="Gym"
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={form.category}
                    disabled={uploadBusy}
                    onValueChange={(value: VrTourCategory) => setForm((p) => ({ ...p, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VR_TOUR_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vr-room-order">Display order</Label>
                  <Input
                    id="vr-room-order"
                    type="number"
                    value={form.display_order}
                    disabled={uploadBusy}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, display_order: Number(e.target.value) || 0 }))
                    }
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={form.is_active}
                    disabled={uploadBusy}
                    onCheckedChange={(checked) => setForm((p) => ({ ...p, is_active: checked }))}
                  />
                  Active
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch
                    checked={form.is_start}
                    disabled={uploadBusy}
                    onCheckedChange={(checked) => setForm((p) => ({ ...p, is_start: checked }))}
                  />
                  Start room
                </label>
              </div>

              <div className="space-y-2 rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Label>360 panorama</Label>
                    <p className="text-xs text-muted-foreground">
                      JPG/PNG/WebP equirectangular · up to ~80MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploadBusy || (!editingId && !form.id)}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploadBusy ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {form.panorama_thumb ? "Replace 360" : "Upload 360"}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleUpload}
                  />
                </div>
                {uploadProgress && (
                  <p className="text-sm text-muted-foreground">{uploadProgress}</p>
                )}
                {form.panorama_thumb && (
                  <img
                    src={form.panorama_thumb}
                    alt="Panorama thumbnail"
                    className="mt-2 h-28 w-full rounded-md object-cover"
                  />
                )}
                {!form.id && !editingId && (
                  <p className="text-xs text-amber-600">Enter a room ID before uploading.</p>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Hotspot links</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addLink} disabled={uploadBusy}>
                    Add link
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Tip: open{" "}
                  <a href="/vr-tour?calibrate=1" target="_blank" rel="noreferrer" className="underline">
                    /vr-tour?calibrate=1
                  </a>{" "}
                  and click the panorama to copy yaw/pitch.
                </p>
                {form.links.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No links yet.</p>
                ) : (
                  <div className="space-y-2">
                    {form.links.map((link, index) => (
                      <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                        <Select
                          value={link.nodeId || undefined}
                          onValueChange={(value) => updateLink(index, { nodeId: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Target room" />
                          </SelectTrigger>
                          <SelectContent>
                            {otherRoomOptions.map((id) => (
                              <SelectItem key={id} value={id}>
                                {id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={String(link.yaw)}
                          placeholder="yaw"
                          onChange={(e) => updateLink(index, { yaw: e.target.value })}
                        />
                        <Input
                          value={String(link.pitch)}
                          placeholder="pitch"
                          onChange={(e) => updateLink(index, { pitch: e.target.value })}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLink(index)}
                          aria-label="Remove link"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <SheetFooter className="mt-auto flex-row items-center justify-between gap-2 border-t bg-background p-4 sm:space-x-0">
            {editingId ? (
              <Button
                type="button"
                variant="destructive"
                disabled={uploadBusy || saveMutation.isPending || deleteMutation.isPending}
                onClick={() => {
                  if (confirm(`Delete room "${editingId}"?`)) deleteMutation.mutate(editingId);
                }}
              >
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={uploadBusy}
                onClick={() => setSheetOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={uploadBusy || saveMutation.isPending}
                onClick={() => saveMutation.mutate(form)}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Save room
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
