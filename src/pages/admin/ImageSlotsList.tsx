import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ImageIcon, Upload } from "lucide-react";
import { toast } from "sonner";

const BUCKET = "website";
const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];

type SlotRow = {
  id: string;
  slot_key: string;
  display_name: string;
  file_url: string | null;
  alt_text: string | null;
  fallback_url: string | null;
};

export default function ImageSlotsList() {
  const queryClient = useQueryClient();
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);

  const { data: slots, isLoading } = useQuery({
    queryKey: ["admin-website-image-slots"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("website_image_slots")
        .select("id, slot_key, display_name, file_url, alt_text, fallback_url")
        .order("slot_key");
      if (error) throw error;
      return (data || []) as SlotRow[];
    },
  });

  const { data: media } = useQuery({
    queryKey: ["admin-website-media-library"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("website_media_library")
        .select("id, file_url, file_name")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as { id: string; file_url: string; file_name: string }[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<SlotRow> }) => {
      const { error } = await supabase.from("website_image_slots").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-website-image-slots"] });
      queryClient.invalidateQueries({ queryKey: ["website-image-slots"] });
      toast.success("Slot updated.");
      setEditingSlotId(null);
    },
    onError: () => toast.error("Failed to update."),
  });

  const editing = slots?.find((s) => s.id === editingSlotId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Website Image Slots</h1>
        <p className="text-muted-foreground">Click an image to change it. These images appear in hero sections and backgrounds across the website.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All image slots</CardTitle>
          <p className="text-sm text-muted-foreground">Upload an image, pick from Media, or paste a URL. Fallback used if no image set.</p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !slots?.length ? (
            <p className="py-8 text-center text-muted-foreground">No image slots. Run migration 009.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {slots.map((slot) => {
                const url = slot.file_url || slot.fallback_url || null;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setEditingSlotId(slot.id)}
                    className="group rounded-xl border overflow-hidden bg-muted/50 hover:border-primary transition-colors text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    <div className="aspect-video relative bg-muted flex items-center justify-center overflow-hidden">
                      {url ? (
                        <img src={url} alt={slot.alt_text || slot.display_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <ImageIcon className="h-12 w-12 text-muted-foreground" />
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 text-white text-sm font-medium bg-black/60 px-3 py-1.5 rounded-full transition-opacity">
                          Change
                        </span>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="font-medium text-sm truncate">{slot.display_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{slot.slot_key}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingSlotId} onOpenChange={(o) => !o && setEditingSlotId(null)}>
        <DialogContent className="max-w-lg" aria-describedby="edit-slot-desc">
          <DialogHeader>
            <DialogTitle>Edit image slot</DialogTitle>
            <DialogDescription id="edit-slot-desc">
              Upload an image, pick from Media, or paste a URL. Leave empty to use fallback.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <SlotEditForm
              slot={editing}
              media={media || []}
              queryClient={queryClient}
              onSubmit={(p) => updateMutation.mutate({ id: editing.id, payload: p })}
              onCancel={() => setEditingSlotId(null)}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SlotEditForm({
  slot,
  media,
  queryClient,
  onSubmit,
  onCancel,
  isLoading,
}: {
  slot: SlotRow;
  media: { id: string; file_url: string; file_name: string }[];
  queryClient: ReturnType<typeof useQueryClient>;
  onSubmit: (p: Partial<SlotRow>) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [file_url, setFile_url] = useState(slot.file_url ?? "");
  const [alt_text, setAlt_text] = useState(slot.alt_text ?? "");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ file_url: file_url.trim() || null, alt_text: alt_text.trim() || null });
  };

  const handleSelectMedia = (url: string) => {
    setFile_url(url);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`File must be under ${MAX_SIZE_MB}MB`);
      e.target.value = "";
      return;
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Allowed: JPEG, PNG, GIF, WebP, SVG");
      e.target.value = "";
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `media/${crypto.randomUUID()}.${ext}`;
    const { data: uploadData, error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (uploadError) {
      toast.error(uploadError.message);
      setUploading(false);
      e.target.value = "";
      return;
    }
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(uploadData.path);
    await supabase.from("website_media_library").insert({
      file_name: file.name,
      file_path: uploadData.path,
      file_url: urlData.publicUrl,
      file_type: "image",
      file_size: file.size,
      mime_type: file.type,
      folder: "media",
    });
    setFile_url(urlData.publicUrl);
    if (!alt_text.trim()) setAlt_text(file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ") || "");
    queryClient.invalidateQueries({ queryKey: ["admin-website-media-library"] });
    toast.success("Image uploaded. Click Save to assign to this slot.");
    setUploading(false);
    e.target.value = "";
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="file_url">Image URL</Label>
        <Input id="file_url" value={file_url} onChange={(e) => setFile_url(e.target.value)} placeholder="Paste URL, upload below, or pick from Media" />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Label className="shrink-0">Upload image</Label>
        <div className="flex gap-2 flex-1 flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || isLoading}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            {uploading ? "Uploading…" : "Choose file"}
          </Button>
          <span className="text-xs text-muted-foreground">JPEG, PNG, GIF, WebP, SVG, max {MAX_SIZE_MB}MB</span>
        </div>
      </div>
      {media.length > 0 && (
        <div className="space-y-2">
          <Label>Pick from Media</Label>
          <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
            {media.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handleSelectMedia(m.file_url)}
                className={`rounded border overflow-hidden aspect-square flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-primary ${
                  file_url === m.file_url ? "ring-2 ring-primary border-primary" : "border-border hover:border-primary/50"
                }`}
              >
                <img src={m.file_url} alt={m.file_name} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="alt_text">Alt text (optional)</Label>
        <Input id="alt_text" value={alt_text} onChange={(e) => setAlt_text(e.target.value)} placeholder="Describe for accessibility" />
      </div>
      <p className="text-xs text-muted-foreground">Fallback: {slot.fallback_url || "None"}</p>
      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save
        </Button>
      </div>
    </form>
  );
}
