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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ImageUpload } from "@/components/admin/ImageUpload";
import type { IntlArrivalStep } from "@/hooks/useIntlArrivalSteps";

const BUCKET = "website";

export default function ArrivalStepsList() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-intl-arrival-steps"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("website_intl_arrival_steps")
        .select("id, title, description, image_url, image_path, display_order, is_active")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as IntlArrivalStep[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-intl-arrival-steps"] });
    queryClient.invalidateQueries({ queryKey: ["website-intl-arrival-steps"] });
  };

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<IntlArrivalStep> }) => {
      const { error } = await supabase.from("website_intl_arrival_steps").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Arrival step updated.");
      setEditingId(null);
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update."),
  });

  const createMutation = useMutation({
    mutationFn: async (payload: {
      title: string;
      description: string | null;
      image_url: string | null;
      image_path: string | null;
      display_order: number;
      is_active: boolean;
    }) => {
      const { error } = await supabase.from("website_intl_arrival_steps").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Arrival step created.");
      setCreateOpen(false);
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const row = rows?.find((r) => r.id === id);
      if (row?.image_path) {
        await supabase.storage.from(BUCKET).remove([row.image_path]);
      }
      const { error } = await supabase.from("website_intl_arrival_steps").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Arrival step deleted.");
      setEditingId(null);
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete."),
  });

  const editing = rows?.find((r) => r.id === editingId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Arrival coverflow</h2>
          <p className="text-sm text-muted-foreground">
            Journey cards on /international-students (3:4 images, title, optional description).
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="w-fit">
          <Plus className="mr-2 h-4 w-4" />
          Add step
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All steps</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !rows?.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No arrival steps yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Order</TableHead>
                  <TableHead className="w-20">Image</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.display_order}</TableCell>
                    <TableCell>
                      {row.image_url ? (
                        <img
                          src={row.image_url}
                          alt=""
                          className="h-12 w-9 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-9 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
                          —
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{row.title}</div>
                      {row.description ? (
                        <div className="line-clamp-1 text-xs text-muted-foreground">{row.description}</div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.is_active ? "default" : "secondary"}>
                        {row.is_active ? "Active" : "Hidden"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setEditingId(row.id)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Delete this arrival step?")) deleteMutation.mutate(row.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add arrival step</DialogTitle>
            <DialogDescription>Upload a 3:4 image, set the title, and optionally a short description.</DialogDescription>
          </DialogHeader>
          <ArrivalStepForm
            initial={{
              title: "",
              description: "",
              image_url: "",
              display_order: rows?.length ?? 0,
              is_active: true,
            }}
            onSubmit={(payload) =>
              createMutation.mutate({
                title: payload.title,
                description: payload.description || null,
                image_url: payload.image_url || null,
                image_path: null,
                display_order: payload.display_order,
                is_active: payload.is_active,
              })
            }
            onCancel={() => setCreateOpen(false)}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingId} onOpenChange={(o) => !o && setEditingId(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit arrival step</DialogTitle>
            <DialogDescription>Update image, title, description, order, or visibility.</DialogDescription>
          </DialogHeader>
          {editing ? (
            <ArrivalStepForm
              initial={{
                title: editing.title,
                description: editing.description || "",
                image_url: editing.image_url || "",
                display_order: editing.display_order,
                is_active: editing.is_active,
              }}
              onSubmit={(payload) =>
                updateMutation.mutate({
                  id: editing.id,
                  payload: {
                    title: payload.title,
                    description: payload.description || null,
                    image_url: payload.image_url || null,
                    display_order: payload.display_order,
                    is_active: payload.is_active,
                  },
                })
              }
              onCancel={() => setEditingId(null)}
              isLoading={updateMutation.isPending}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

type FormState = {
  title: string;
  description: string;
  image_url: string;
  display_order: number;
  is_active: boolean;
};

function ArrivalStepForm({
  initial,
  onSubmit,
  onCancel,
  isLoading,
}: {
  initial: FormState;
  onSubmit: (payload: FormState) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [imageUrl, setImageUrl] = useState(initial.image_url);
  const [displayOrder, setDisplayOrder] = useState(initial.display_order);
  const [isActive, setIsActive] = useState(initial.is_active);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) {
          toast.error("Title is required.");
          return;
        }
        onSubmit({
          title: title.trim(),
          description: description.trim(),
          image_url: imageUrl.trim(),
          display_order: Number.isFinite(displayOrder) ? displayOrder : 0,
          is_active: isActive,
        });
      }}
    >
      <ImageUpload
        label="Cover image (3:4 recommended)"
        value={imageUrl}
        onChange={setImageUrl}
        folder="intl-arrival"
      />

      <div className="space-y-2">
        <Label htmlFor="arrival-title">Title</Label>
        <Textarea
          id="arrival-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={"Meet people from\n52+ different countries"}
          rows={3}
          required
          className="font-medium uppercase"
        />
        <p className="text-xs text-muted-foreground">
          Press Enter to force a line break on the card. Leave as one line to auto-break longer titles.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="arrival-desc">Description (optional)</Label>
        <Textarea
          id="arrival-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short supporting line…"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="arrival-order">Display order</Label>
          <Input
            id="arrival-order"
            type="number"
            value={displayOrder}
            onChange={(e) => setDisplayOrder(Number(e.target.value))}
          />
        </div>
        <div className="flex items-end gap-2 pb-2">
          <Switch id="arrival-active" checked={isActive} onCheckedChange={setIsActive} />
          <Label htmlFor="arrival-active">Active</Label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save
        </Button>
      </div>
    </form>
  );
}
