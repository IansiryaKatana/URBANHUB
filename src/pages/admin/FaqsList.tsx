import { useMemo, useState } from "react";
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
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fetchAllSupabaseRows } from "@/utils/fetchAllSupabaseRows";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type FaqRow = {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  display_order: number;
  is_active: boolean;
};

export default function FaqsList() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const { searchQuery, setSearchQuery, debouncedSearch, currentPage, setCurrentPage } =
    useDebouncedAdminSearch();
  const queryClient = useQueryClient();

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-website-faqs"],
    queryFn: async () =>
      fetchAllSupabaseRows<FaqRow>((from, to) =>
        supabase
          .from("website_faqs")
          .select("id, question, answer, category, display_order, is_active")
          .order("display_order", { ascending: true })
          .range(from, to)
      ),
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    rows?.forEach((r) => {
      if (r.category?.trim()) set.add(r.category.trim());
    });
    return Array.from(set).sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (!rows?.length) return [];
    const q = debouncedSearch.toLowerCase();
    return rows.filter((row) => {
      if (statusFilter === "active" && !row.is_active) return false;
      if (statusFilter === "inactive" && row.is_active) return false;
      if (categoryFilter !== "all" && (row.category ?? "") !== categoryFilter) return false;
      if (!q) return true;
      return (
        row.question.toLowerCase().includes(q) ||
        row.answer.toLowerCase().includes(q) ||
        (row.category ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, debouncedSearch, statusFilter, categoryFilter]);

  const { paginated: paginatedRows, totalPages, safePage } = paginateItems(filteredRows, currentPage);

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<FaqRow> }) => {
      const { error } = await supabase.from("website_faqs").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-website-faqs"] });
      toast.success("FAQ updated.");
      setEditingId(null);
    },
    onError: () => toast.error("Failed to update FAQ."),
  });

  const createMutation = useMutation({
    mutationFn: async (payload: {
      question: string;
      answer: string;
      category?: string;
      display_order: number;
      is_active: boolean;
    }) => {
      const { error } = await supabase.from("website_faqs").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-website-faqs"] });
      toast.success("FAQ created.");
      setCreateOpen(false);
    },
    onError: () => toast.error("Failed to create FAQ."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("website_faqs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-website-faqs"] });
      toast.success("FAQ deleted.");
      setEditingId(null);
    },
    onError: () => toast.error("Failed to delete FAQ."),
  });

  const editing = rows?.find((r) => r.id === editingId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">FAQs</h1>
        <Button onClick={() => setCreateOpen(true)} className="w-fit">
          <Plus className="h-4 w-4 mr-2" />
          Add FAQ
        </Button>
      </div>

      <div className="space-y-4">
        <AdminListToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search question, answer, or category..."
          searchAriaLabel="Search FAQs"
          filters={
            <>
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
              {categories.length > 0 && (
                <Select
                  value={categoryFilter}
                  onValueChange={(value) => {
                    setCategoryFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-8 w-[160px] text-xs">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </>
          }
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !rows?.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No FAQs yet. Add one to get started.</p>
        ) : !filteredRows.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {debouncedSearch ? `No FAQs found matching "${debouncedSearch}".` : "No FAQs match the current filters."}
          </p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className={`${adminTableHeadClass} w-14`}>Order</TableHead>
                  <TableHead className={adminTableHeadClass}>Category</TableHead>
                  <TableHead className={adminTableHeadClass}>Question</TableHead>
                  <TableHead className={`${adminTableHeadClass} w-20`}>Status</TableHead>
                  <TableHead className={`${adminTableHeadClass} w-24 text-right`}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/40">
                    <TableCell className={`${adminTableCellClass} text-xs text-muted-foreground`}>
                      {row.display_order}
                    </TableCell>
                    <TableCell className={`${adminTableCellClass} text-sm`}>{row.category ?? "—"}</TableCell>
                    <TableCell className={`${adminTableCellClass} max-w-[360px] truncate text-sm font-medium`}>
                      {row.question}
                    </TableCell>
                    <TableCell className={adminTableCellClass}>
                      <Badge
                        variant={row.is_active ? "default" : "secondary"}
                        className="h-5 px-1.5 text-[10px] font-medium"
                      >
                        {row.is_active ? "Active" : "Off"}
                      </Badge>
                    </TableCell>
                    <TableCell className={adminTableCellClass}>
                      <div className="flex items-center justify-end gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={adminIconButtonClass}
                          onClick={() => setEditingId(row.id)}
                          aria-label="Edit"
                        >
                          <Pencil className={adminIconClass} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`${adminIconButtonClass} text-destructive hover:text-destructive`}
                          onClick={() => deleteMutation.mutate(row.id)}
                          disabled={deleteMutation.isPending}
                          aria-label="Delete"
                        >
                          <Trash2 className={adminIconClass} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <AdminListPagination
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredRows.length}
            />
          </>
        )}
      </div>

      <Dialog open={!!editingId} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby="edit-faq-desc">
          <DialogHeader>
            <DialogTitle>Edit FAQ</DialogTitle>
            <DialogDescription id="edit-faq-desc" className="sr-only">
              Edit question, answer and category for this FAQ.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <FaqForm
              initial={editing}
              onSubmit={(payload) => updateMutation.mutate({ id: editing.id, payload })}
              onCancel={() => setEditingId(null)}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby="add-faq-desc">
          <DialogHeader>
            <DialogTitle>Add FAQ</DialogTitle>
            <DialogDescription id="add-faq-desc" className="sr-only">
              Add a new FAQ with question and answer.
            </DialogDescription>
          </DialogHeader>
          <FaqForm
            initial={null}
            onSubmit={(payload) =>
              createMutation.mutate({ ...payload, display_order: rows?.length ?? 0, is_active: true })
            }
            onCancel={() => setCreateOpen(false)}
            isLoading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FaqForm({
  initial,
  onSubmit,
  onCancel,
  isLoading,
}: {
  initial: FaqRow | null;
  onSubmit: (payload: Partial<FaqRow>) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [question, setQuestion] = useState(initial?.question ?? "");
  const [answer, setAnswer] = useState(initial?.answer ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [is_active, setIs_active] = useState(initial?.is_active ?? true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ question, answer, category: category || null, is_active });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="faq-question">Question</Label>
        <Input id="faq-question" value={question} onChange={(e) => setQuestion(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="faq-answer">Answer</Label>
        <Textarea
          id="faq-answer"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          required
          rows={4}
          className="resize-y"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="faq-category">Category (optional)</Label>
        <Input
          id="faq-category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g. Booking"
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch id="faq-active" checked={is_active} onCheckedChange={setIs_active} />
        <Label htmlFor="faq-active">Active (shown on site)</Label>
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {initial ? "Save" : "Create"}
        </Button>
      </div>
    </form>
  );
}
