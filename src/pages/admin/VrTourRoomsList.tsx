import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Glasses, GripVertical, Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
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

function moveRow<T extends { id: string }>(list: T[], fromId: string, toId: string): T[] {
  if (fromId === toId) return list;
  const fromIndex = list.findIndex((row) => row.id === fromId);
  const toIndex = list.findIndex((row) => row.id === toId);
  if (fromIndex < 0 || toIndex < 0) return list;
  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

/** Slugify display name; append -2, -3… if the id is already taken. */
function uniqueRoomIdFromName(name: string, existingIds: string[], keepId?: string | null): string {
  const base = slugifyVrRoomId(name);
  if (!base) return "";
  if (keepId && keepId === base) return keepId;
  if (!existingIds.includes(base) || base === keepId) return base;
  let n = 2;
  while (existingIds.includes(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}


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
  const [draftRows, setDraftRows] = useState<VrTourRoomRow[] | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragIdRef = useRef<string | null>(null);
  const draftRowsRef = useRef<VrTourRoomRow[] | null>(null);
  const { searchQuery, setSearchQuery, debouncedSearch, currentPage, setCurrentPage } =
    useDebouncedAdminSearch();

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-vr-tour-rooms"],
    queryFn: () => fetchVrTourRooms(true),
  });

  const sourceRows = draftRows ?? rows ?? [];
  const canReorder = statusFilter === "all" && !debouncedSearch;

  const filteredRows = useMemo(() => {
    if (!sourceRows.length) return [];
    const q = debouncedSearch.toLowerCase();
    return sourceRows.filter((row) => {
      if (statusFilter === "active" && !row.is_active) return false;
      if (statusFilter === "inactive" && row.is_active) return false;
      if (!q) return true;
      return (
        row.id.toLowerCase().includes(q) ||
        row.name.toLowerCase().includes(q) ||
        row.category.toLowerCase().includes(q)
      );
    });
  }, [sourceRows, debouncedSearch, statusFilter]);

  const { paginated: paginatedRows, totalPages, safePage } = paginateItems(
    filteredRows,
    currentPage,
    canReorder ? Math.max(filteredRows.length, 1) : undefined,
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-vr-tour-rooms"] });
    queryClient.invalidateQueries({ queryKey: ["vr-tour-rooms-public"] });
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: RoomFormState) => {
      if (!payload.name.trim()) throw new Error("Room name is required.");
      if (!payload.panorama_lg || !payload.panorama_sm || !payload.panorama_thumb) {
        throw new Error("Upload a 360 panorama before saving.");
      }

      const existingIds = (rows ?? []).map((r) => r.id);
      const id = editingId
        ? editingId
        : uniqueRoomIdFromName(payload.name, existingIds);
      if (!id) throw new Error("Enter a room name so we can create an ID (e.g. Moor Lane → moor-lane).");

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
          .update({
            name: body.name,
            category: body.category,
            display_order: body.display_order,
            is_active: body.is_active,
            is_start: body.is_start,
            links: body.links,
            panorama_lg: body.panorama_lg,
            panorama_sm: body.panorama_sm,
            panorama_thumb: body.panorama_thumb,
          } as never)
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

  const reorderMutation = useMutation({
    mutationFn: async (ordered: VrTourRoomRow[]) => {
      const previousById = new Map((rows ?? []).map((row) => [row.id, row.display_order]));
      const updates = ordered
        .map((row, index) => ({ id: row.id, display_order: index }))
        .filter(({ id, display_order }) => previousById.get(id) !== display_order);

      const results = await Promise.all(
        updates.map(({ id, display_order }) =>
          supabase
            .from("website_vr_tour_rooms" as never)
            .update({ display_order } as never)
            .eq("id", id),
        ),
      );
      const failed = results.find((result) => result.error);
      if (failed?.error) throw failed.error;
    },
    onMutate: async (ordered) => {
      await queryClient.cancelQueries({ queryKey: ["admin-vr-tour-rooms"] });
      const previous = queryClient.getQueryData<VrTourRoomRow[]>(["admin-vr-tour-rooms"]);
      queryClient.setQueryData(
        ["admin-vr-tour-rooms"],
        ordered.map((row, index) => ({ ...row, display_order: index })),
      );
      return { previous };
    },
    onError: (err: Error, _ordered, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["admin-vr-tour-rooms"], context.previous);
      }
      setDraftRows(null);
      draftRowsRef.current = null;
      toast.error(err.message || "Failed to save order.");
    },
    onSuccess: () => {
      setDraftRows(null);
      draftRowsRef.current = null;
      invalidate();
    },
  });

  const persistDraftOrder = () => {
    const fromId = dragIdRef.current;
    const ordered = draftRowsRef.current;
    dragIdRef.current = null;
    draftRowsRef.current = null;
    setDraggingId(null);
    if (!fromId || !ordered || !rows) {
      setDraftRows(null);
      return;
    }
    const unchanged = ordered.every((row, index) => row.id === rows[index]?.id);
    if (unchanged) {
      setDraftRows(null);
      return;
    }
    reorderMutation.mutate(ordered);
  };

  const handleDragStart = (id: string) => {
    if (!canReorder) return;
    dragIdRef.current = id;
    setDraggingId(id);
    draftRowsRef.current = sourceRows;
    setDraftRows(sourceRows);
  };

  const handleDragOver = (overId: string) => {
    const fromId = dragIdRef.current;
    if (!fromId || fromId === overId) return;
    setDraftRows((prev) => {
      const next = moveRow(prev ?? sourceRows, fromId, overId);
      draftRowsRef.current = next;
      return next;
    });
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyForm(),
      display_order: rows?.length ? Math.max(...rows.map((r) => r.display_order)) + 1 : 0,
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

    const existingIds = (rows ?? []).map((r) => r.id);
    const roomId = editingId
      ? editingId
      : uniqueRoomIdFromName(form.name || file.name, existingIds);
    if (!roomId) {
      toast.error("Enter a room name before uploading (e.g. Moor Lane).");
      return;
    }

    setUploadBusy(true);
    setUploadProgress("Preparing…");
    try {
      const urls = await uploadVariants(roomId, file, setUploadProgress);
      setForm((prev) => ({
        ...prev,
        id: editingId ?? roomId,
        name:
          prev.name ||
          roomId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
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

  const previewCreateId = !editingId
    ? uniqueRoomIdFromName(form.name, (rows ?? []).map((r) => r.id))
    : "";

  const otherRoomOptions = (rows ?? [])
    .map((r) => r.id)
    .filter((id) => id !== (editingId || form.id || previewCreateId));

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

        <p className="text-xs text-muted-foreground">
          {canReorder
            ? "Drag the handle on a row to change the order rooms appear in the tour."
            : "Clear search and status filters to drag rooms into a new order."}
        </p>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={cn(adminTableHeadClass, "w-10")} />
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
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : paginatedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    No VR rooms yet. If this is the first time, apply migration{" "}
                    <code className="text-xs">045_vr_tour_rooms.sql</code> in Supabase, then add a
                    room and upload a 360 image.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((row, index) => (
                  <TableRow
                    key={row.id}
                    onDragOver={(e) => {
                      if (!canReorder) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      handleDragOver(row.id);
                    }}
                    onDrop={(e) => {
                      if (!canReorder) return;
                      e.preventDefault();
                    }}
                    className={cn(
                      draggingId === row.id && "opacity-50",
                      canReorder && draggingId && "select-none",
                    )}
                  >
                    <TableCell className={cn(adminTableCellClass, "w-10 pr-0")}>
                      <button
                        type="button"
                        draggable={canReorder}
                        disabled={!canReorder || reorderMutation.isPending}
                        onDragStart={(e) => {
                          if (!canReorder) {
                            e.preventDefault();
                            return;
                          }
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", row.id);
                          const rowEl = e.currentTarget.closest("tr");
                          if (rowEl) e.dataTransfer.setDragImage(rowEl, 24, 24);
                          handleDragStart(row.id);
                        }}
                        onDragEnd={persistDraftOrder}
                        className={cn(
                          "inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground",
                          canReorder
                            ? "cursor-grab active:cursor-grabbing hover:bg-muted"
                            : "cursor-not-allowed opacity-40",
                        )}
                        aria-label={canReorder ? `Drag to reorder ${row.name}` : "Reordering disabled"}
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
                    </TableCell>
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
                    <TableCell className={adminTableCellClass}>
                      {canReorder ? index + 1 : row.display_order}
                    </TableCell>
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
              <div className="space-y-2">
                <Label htmlFor="vr-room-name">Display name</Label>
                <Input
                  id="vr-room-name"
                  value={form.name}
                  disabled={uploadBusy}
                  placeholder="Moor Lane"
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm((p) => ({
                      ...p,
                      name,
                      // Keep id locked when editing; auto-slug while creating
                      id: editingId
                        ? p.id
                        : uniqueRoomIdFromName(name, (rows ?? []).map((r) => r.id)),
                    }));
                  }}
                />
                {editingId ? (
                  <p className="text-xs text-muted-foreground">
                    Room ID: <code className="text-xs">{editingId}</code>
                  </p>
                ) : previewCreateId ? (
                  <p className="text-xs text-muted-foreground">
                    ID will be: <code className="text-xs">{previewCreateId}</code>
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    ID is created automatically from the name (e.g. Moor Lane → moor-lane).
                  </p>
                )}
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
                  <p className="text-xs text-muted-foreground">
                    Or drag rows in the list to change order.
                  </p>
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
                    disabled={uploadBusy || (!editingId && !slugifyVrRoomId(form.name))}
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
                {!editingId && !slugifyVrRoomId(form.name) && (
                  <p className="text-xs text-amber-600">Enter a room name before uploading.</p>
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
