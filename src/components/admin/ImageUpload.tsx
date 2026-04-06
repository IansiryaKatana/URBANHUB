import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ImageIcon, Upload, X } from "lucide-react";
import { toast } from "sonner";

const BUCKET = "website";
const MAX_SIZE_MB = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];

type ImageUploadProps = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder: string;
  accept?: string;
};

type MediaRow = {
  id: string;
  file_name: string;
  file_url: string;
  alt_text: string | null;
  folder: string | null;
  created_at: string;
};

export function ImageUpload({ label, value, onChange, folder, accept = "image/*" }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const queryClient = useQueryClient();

  const { data: mediaRows, isLoading: isGalleryLoading } = useQuery({
    queryKey: ["admin-website-media-library-picker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("website_media_library")
        .select("id, file_name, file_url, alt_text, folder, created_at")
        .eq("file_type", "image")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as MediaRow[];
    },
    staleTime: 60_000,
  });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`File must be under ${MAX_SIZE_MB}MB`);
      return;
    }
    if (ALLOWED_TYPES.length && !ALLOWED_TYPES.includes(file.type)) {
      toast.error("Allowed: JPEG, PNG, GIF, WebP, SVG");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    setUploading(false);
    if (error) {
      toast.error(error.message || "Upload failed");
      return;
    }
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
    const publicUrl = urlData.publicUrl;
    const insertResult = await supabase.from("website_media_library").insert({
      file_name: file.name,
      file_path: data.path,
      file_url: publicUrl,
      file_type: "image",
      file_size: file.size,
      mime_type: file.type,
      folder: folder || "media",
    });
    if (insertResult.error) {
      toast.error("Image uploaded, but failed to save in gallery.");
    } else {
      queryClient.invalidateQueries({ queryKey: ["admin-website-media-library"] });
      queryClient.invalidateQueries({ queryKey: ["admin-website-media-library-picker"] });
    }
    onChange(publicUrl);
    toast.success("Image uploaded");
    e.target.value = "";
  };

  const filteredRows = (mediaRows || []).filter((row) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      row.file_name.toLowerCase().includes(q) ||
      (row.alt_text || "").toLowerCase().includes(q) ||
      (row.folder || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste URL or upload below"
          className="flex-1"
        />
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleFile}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Upload
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setGalleryOpen(true)}>
          <ImageIcon className="h-4 w-4" />
          Gallery
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="icon" onClick={() => onChange("")} aria-label="Clear">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {value && (
        <div className="rounded border overflow-hidden max-w-[200px]">
          <img src={value} alt="Preview of uploaded image" className="w-full h-auto object-cover" />
        </div>
      )}

      <Dialog open={galleryOpen} onOpenChange={setGalleryOpen}>
        <DialogContent className="max-w-4xl" aria-describedby="image-gallery-picker-desc">
          <DialogHeader>
            <DialogTitle>Select from gallery</DialogTitle>
            <DialogDescription id="image-gallery-picker-desc">
              Choose an existing image from your media library for this field.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by file name, alt text, or folder"
            />

            {isGalleryLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredRows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No images found.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[55vh] overflow-y-auto pr-1">
                {filteredRows.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    className="rounded-md border overflow-hidden text-left hover:border-primary transition-colors"
                    onClick={() => {
                      onChange(row.file_url);
                      setGalleryOpen(false);
                    }}
                  >
                    <div className="aspect-square bg-muted">
                      <img
                        src={row.file_url}
                        alt={row.alt_text || row.file_name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium truncate" title={row.file_name}>
                        {row.file_name}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate" title={row.folder || ""}>
                        {row.folder || "media"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
