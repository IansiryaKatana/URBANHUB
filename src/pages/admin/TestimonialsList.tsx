import { useState, useRef } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Pencil, Trash2, Plus, Upload, Video, ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type { Testimonial } from "@/hooks/useTestimonials";

const BUCKET = "website";
const MAX_VIDEO_SIZE_MB = 100; // 100MB for videos
const MAX_IMAGE_SIZE_MB = 5; // 5MB for cover images
// Allow MP4, WebM, OGG, and MOV (QuickTime)
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export default function TestimonialsList() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const { data: testimonials, isLoading } = useQuery({
    queryKey: ["admin-testimonials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("website_testimonials")
        .select("*")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as Testimonial[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({ payload, videoFile, coverFile }: { 
      payload: Partial<Testimonial>; 
      videoFile?: File | null; 
      coverFile?: File | null;
    }) => {
      // First create the testimonial
      const { data, error } = await supabase.from("website_testimonials").insert({
        ...payload,
        created_by: user?.id || null,
      }).select().single();
      if (error) throw error;
      const testimonial = data as Testimonial;

      // Upload video if provided
      if (videoFile) {
        if (videoFile.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
          throw new Error(`Video must be under ${MAX_VIDEO_SIZE_MB}MB`);
        }
        if (!ALLOWED_VIDEO_TYPES.includes(videoFile.type)) {
          throw new Error("Allowed video types: MP4, WebM, OGG");
        }

        const ext = videoFile.name.split(".").pop() || "mp4";
        const path = `testimonials/${testimonial.id}/video.${ext}`;

        // For .mov files, use video/mp4 content-type as workaround if quicktime is not supported
        const contentType = videoFile.type === "video/quicktime" ? "video/mp4" : videoFile.type;

        const { data: uploadData, error: uploadError } = await supabase.storage.from(BUCKET).upload(path, videoFile, {
          cacheControl: "3600",
          upsert: true,
          contentType: contentType,
        });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(uploadData.path);
        await supabase.from("website_testimonials").update({
          video_path: uploadData.path,
          video_url: urlData.publicUrl,
        }).eq("id", testimonial.id);
      }

      // Upload cover image if provided
      if (coverFile) {
        if (coverFile.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
          throw new Error(`Image must be under ${MAX_IMAGE_SIZE_MB}MB`);
        }
        if (!ALLOWED_IMAGE_TYPES.includes(coverFile.type)) {
          throw new Error("Allowed image types: JPEG, PNG, GIF, WebP");
        }

        const ext = coverFile.name.split(".").pop() || "jpg";
        const path = `testimonials/${testimonial.id}/cover.${ext}`;

        const { data: uploadData, error: uploadError } = await supabase.storage.from(BUCKET).upload(path, coverFile, {
          cacheControl: "3600",
          upsert: true,
        });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(uploadData.path);
        await supabase.from("website_testimonials").update({
          cover_image_path: uploadData.path,
          cover_image_url: urlData.publicUrl,
        }).eq("id", testimonial.id);
      }

      return testimonial;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      queryClient.invalidateQueries({ queryKey: ["website-testimonials"] });
      toast.success("Testimonial created successfully.");
      setIsCreateDialogOpen(false);
    },
    onError: (error: Error) => toast.error(error.message || "Failed to create."),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<Testimonial> }) => {
      const { error } = await supabase.from("website_testimonials").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      queryClient.invalidateQueries({ queryKey: ["website-testimonials"] });
      toast.success("Testimonial updated.");
      setEditingId(null);
    },
    onError: () => toast.error("Failed to update."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const items = testimonials?.filter((t) => ids.includes(t.id)) || [];
      for (const item of items) {
        if (item.cover_image_path) {
          await supabase.storage.from(BUCKET).remove([item.cover_image_path]);
        }
        if (item.video_path) {
          await supabase.storage.from(BUCKET).remove([item.video_path]);
        }
      }
      const { error } = await supabase.from("website_testimonials").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-testimonials"] });
      queryClient.invalidateQueries({ queryKey: ["website-testimonials"] });
      setSelectedIds(new Set());
      toast.success("Testimonial(s) deleted.");
      setEditingId(null);
    },
    onError: () => toast.error("Failed to delete."),
  });

  const handleVideoUpload = async (file: File, testimonialId: string) => {
    if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
      toast.error(`Video must be under ${MAX_VIDEO_SIZE_MB}MB`);
      return;
    }
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      toast.error("Allowed video types: MP4, WebM, OGG");
      return;
    }

    setUploadingVideo(true);
    const ext = file.name.split(".").pop() || "mp4";
    const path = `testimonials/${testimonialId}/video.${ext}`;

    // For .mov files, use video/mp4 content-type as workaround if quicktime is not supported
    const contentType = file.type === "video/quicktime" ? "video/mp4" : file.type;

    const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: contentType,
    });

    if (error) {
      toast.error(`Video upload failed: ${error.message}`);
      setUploadingVideo(false);
      return;
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
    await updateMutation.mutateAsync({
      id: testimonialId,
      payload: { video_path: data.path, video_url: urlData.publicUrl },
    });
    setUploadingVideo(false);
    toast.success("Video uploaded.");
  };

  const handleCoverUpload = async (file: File, testimonialId: string) => {
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      toast.error(`Image must be under ${MAX_IMAGE_SIZE_MB}MB`);
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Allowed image types: JPEG, PNG, GIF, WebP");
      return;
    }

    setUploadingCover(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `testimonials/${testimonialId}/cover.${ext}`;

    const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });

    if (error) {
      toast.error(`Cover image upload failed: ${error.message}`);
      setUploadingCover(false);
      return;
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
    await updateMutation.mutateAsync({
      id: testimonialId,
      payload: { cover_image_path: data.path, cover_image_url: urlData.publicUrl },
    });
    setUploadingCover(false);
    toast.success("Cover image uploaded.");
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!testimonials?.length) return;
    if (selectedIds.size === testimonials.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(testimonials.map((t) => t.id)));
  };

  const editing = testimonials?.find((t) => t.id === editingId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Testimonials</h2>
          <p className="text-sm text-muted-foreground">Manage "Real People, Real Results" video testimonials</p>
        </div>
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteMutation.mutate(Array.from(selectedIds))}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete {selectedIds.size}
            </Button>
          )}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Testimonial
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Testimonial</DialogTitle>
                <DialogDescription>Add a new video testimonial for the "Real People, Real Results" section.</DialogDescription>
              </DialogHeader>
              <TestimonialForm
                onSubmit={async (data, videoFile, coverFile) => {
                  await createMutation.mutateAsync({
                    payload: data,
                    videoFile,
                    coverFile,
                  });
                }}
                onCancel={() => setIsCreateDialogOpen(false)}
                isLoading={createMutation.isPending}
                onVideoUpload={handleVideoUpload}
                onCoverUpload={handleCoverUpload}
                uploadingVideo={uploadingVideo || createMutation.isPending}
                uploadingCover={uploadingCover || createMutation.isPending}
                videoInputRef={videoInputRef}
                coverInputRef={coverInputRef}
                testimonialId={null}
                isCreate={true}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Testimonials</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !testimonials?.length ? (
            <div className="py-16 text-center border border-dashed rounded-lg">
              <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No testimonials yet. Create one to get started.</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Testimonial
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={testimonials.length > 0 && selectedIds.size === testimonials.length}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead className="w-24">Cover</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Video URL</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testimonials.map((testimonial) => (
                    <TableRow key={testimonial.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(testimonial.id)}
                          onCheckedChange={() => toggleSelect(testimonial.id)}
                          aria-label={`Select ${testimonial.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        {testimonial.cover_image_url ? (
                          <div className="w-20 h-20 rounded overflow-hidden bg-muted flex-shrink-0">
                            <img
                              src={testimonial.cover_image_url}
                              alt={testimonial.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-20 h-20 rounded bg-muted flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{testimonial.name}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{testimonial.result}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground truncate block max-w-[200px]" title={testimonial.video_url}>
                          {testimonial.video_url}
                        </span>
                      </TableCell>
                      <TableCell>{testimonial.display_order}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded ${testimonial.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                          {testimonial.is_active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setEditingId(testimonial.id)} aria-label="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => deleteMutation.mutate([testimonial.id])}
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

      <Dialog open={!!editingId} onOpenChange={(o) => !o && setEditingId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Testimonial</DialogTitle>
            <DialogDescription>Update testimonial details, video, and cover image.</DialogDescription>
          </DialogHeader>
          {editing && (
            <TestimonialForm
              initial={editing}
              onSubmit={(data) => updateMutation.mutate({ id: editing.id, payload: data })}
              onCancel={() => setEditingId(null)}
              isLoading={updateMutation.isPending}
              onVideoUpload={handleVideoUpload}
              onCoverUpload={handleCoverUpload}
              uploadingVideo={uploadingVideo}
              uploadingCover={uploadingCover}
              videoInputRef={videoInputRef}
              coverInputRef={coverInputRef}
              testimonialId={editing.id}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TestimonialForm({
  initial,
  onSubmit,
  onCancel,
  isLoading,
  onVideoUpload,
  onCoverUpload,
  uploadingVideo,
  uploadingCover,
  videoInputRef,
  coverInputRef,
  testimonialId,
  isCreate = false,
}: {
  initial?: Testimonial;
  onSubmit: (data: Partial<Testimonial>, videoFile?: File | null, coverFile?: File | null) => void | Promise<unknown>;
  onCancel: () => void;
  isLoading: boolean;
  onVideoUpload: (file: File, id: string) => void;
  onCoverUpload: (file: File, id: string) => void;
  uploadingVideo: boolean;
  uploadingCover: boolean;
  videoInputRef: React.RefObject<HTMLInputElement>;
  coverInputRef: React.RefObject<HTMLInputElement>;
  testimonialId: string | null;
  isCreate?: boolean;
}) {
  const [name, setName] = useState(initial?.name || "");
  const [result, setResult] = useState(initial?.result || "");
  const [videoUrl, setVideoUrl] = useState(initial?.video_url || "");
  const [displayOrder, setDisplayOrder] = useState(initial?.display_order || 0);
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !result.trim()) {
      toast.error("Please fill in name and result fields.");
      return;
    }
    // Either video URL or video file must be provided
    if (!videoUrl.trim() && !selectedVideoFile) {
      toast.error("Please provide either a video URL or upload a video file.");
      return;
    }
    onSubmit({
      name: name.trim(),
      result: result.trim(),
      video_url: videoUrl.trim() || "", // Will be updated after upload if file is provided
      display_order: displayOrder,
      is_active: isActive,
    }, selectedVideoFile, selectedCoverFile);
  };

  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
      toast.error(`Video must be under ${MAX_VIDEO_SIZE_MB}MB`);
      e.target.value = "";
      return;
    }
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      toast.error("Allowed video types: MP4, WebM, OGG");
      e.target.value = "";
      return;
    }

    if (testimonialId) {
      // If editing existing testimonial, upload immediately
      onVideoUpload(file, testimonialId);
      e.target.value = "";
    } else {
      // If creating, store file for later upload
      setSelectedVideoFile(file);
      // Clear URL field since we're using file upload
      setVideoUrl("");
    }
  };

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      toast.error(`Image must be under ${MAX_IMAGE_SIZE_MB}MB`);
      e.target.value = "";
      return;
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Allowed image types: JPEG, PNG, GIF, WebP");
      e.target.value = "";
      return;
    }

    if (testimonialId) {
      // If editing existing testimonial, upload immediately
      onCoverUpload(file, testimonialId);
      e.target.value = "";
    } else {
      // If creating, store file for later upload
      setSelectedCoverFile(file);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Student Testimonial"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="result">Result Text *</Label>
          <Input
            id="result"
            value={result}
            onChange={(e) => setResult(e.target.value)}
            placeholder="Real Experience at Urban Hub"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="videoUrl">Video URL {!selectedVideoFile && "*"}</Label>
        <Input
          id="videoUrl"
          value={videoUrl}
          onChange={(e) => {
            setVideoUrl(e.target.value);
            if (e.target.value.trim()) {
              setSelectedVideoFile(null);
            }
          }}
          placeholder="https://youtu.be/... or https://vimeo.com/... or direct video URL"
          disabled={!!selectedVideoFile}
        />
        <p className="text-xs text-muted-foreground">
          Enter YouTube, Vimeo, or direct video URL. Or upload a video file below.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Upload Video File {!videoUrl.trim() && "*"}</Label>
        <div className="flex gap-2 items-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => videoInputRef.current?.click()}
            disabled={uploadingVideo || isLoading}
          >
            {uploadingVideo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            {uploadingVideo ? "Uploading..." : selectedVideoFile ? "Change Video" : "Upload Video"}
          </Button>
          {selectedVideoFile && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{selectedVideoFile.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedVideoFile(null);
                  if (videoInputRef.current) videoInputRef.current.value = "";
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          <input
            ref={videoInputRef}
            type="file"
            accept={ALLOWED_VIDEO_TYPES.join(",")}
            className="hidden"
            onChange={handleVideoFileChange}
          />
        </div>
        <p className="text-xs text-muted-foreground">Max {MAX_VIDEO_SIZE_MB}MB. Formats: MP4, WebM, OGG</p>
      </div>

      <div className="space-y-2">
        <Label>Upload Cover Image (Optional)</Label>
        <div className="flex gap-2 items-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => coverInputRef.current?.click()}
            disabled={uploadingCover || isLoading}
          >
            {uploadingCover ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ImageIcon className="h-4 w-4 mr-2" />}
            {uploadingCover ? "Uploading..." : selectedCoverFile ? "Change Cover" : "Upload Cover"}
          </Button>
          {selectedCoverFile && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{selectedCoverFile.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedCoverFile(null);
                  if (coverInputRef.current) coverInputRef.current.value = "";
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          {initial?.cover_image_url && !selectedCoverFile && (
            <div className="ml-2">
              <img
                src={initial.cover_image_url}
                alt="Current cover"
                className="w-16 h-16 object-cover rounded border"
              />
            </div>
          )}
          <input
            ref={coverInputRef}
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(",")}
            className="hidden"
            onChange={handleCoverFileChange}
          />
        </div>
        <p className="text-xs text-muted-foreground">Max {MAX_IMAGE_SIZE_MB}MB. Formats: JPEG, PNG, GIF, WebP</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="displayOrder">Display Order</Label>
          <Input
            id="displayOrder"
            type="number"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
            min="0"
          />
        </div>
        <div className="space-y-2 flex items-end">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isActive"
              checked={isActive}
              onCheckedChange={(checked) => setIsActive(checked === true)}
            />
            <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {initial ? "Save Changes" : "Create Testimonial"}
        </Button>
      </div>
    </form>
  );
}
