import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { Loader2, Eye, MessageSquare, Archive, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { fetchAllSupabaseRows } from "@/utils/fetchAllSupabaseRows";
import {
  formatLandingPageLabel,
  getSubmissionCampaign,
  getSubmissionLandingPage,
} from "@/lib/formSubmissionSource";
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

type FormType =
  | "contact"
  | "callback"
  | "viewing"
  | "inquiry"
  | "resident_support"
  | "short_term"
  | "tourist_inquiry"
  | "keyworker_inquiry"
  | "refer_friend"
  | "content_creator"
  | "secure_booking"
  | "pay_deposit"
  | "urban_hub_payment"
  | "checklist_download";
type Status = "new" | "read" | "replied" | "archived";

const formTypeLabels: Record<string, string> = {
  contact: "Contact",
  callback: "Callback",
  viewing: "Viewing",
  inquiry: "Inquiry",
  resident_support: "Resident support",
  short_term: "Short term",
  tourist_inquiry: "Tourist inquiry",
  keyworker_inquiry: "Keyworker inquiry",
  refer_friend: "Refer a Friend",
  content_creator: "Content Creator",
  secure_booking: "Secure booking",
  pay_deposit: "Pay deposit (£99)",
  urban_hub_payment: "Urban Hub balance payment",
  checklist_download: "Free checklist download",
};

const statusLabels: Record<Status, string> = {
  new: "New",
  read: "Read",
  replied: "Replied",
  archived: "Archived",
};

type SubmissionRow = {
  id: string;
  form_type: FormType;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: Status;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const VALID_STATUSES = new Set<Status>(["new", "read", "replied", "archived"]);
const VALID_FORM_TYPES = new Set<string>(Object.keys(formTypeLabels));

function parseStatusFilter(value: string | null): Status | "" {
  if (!value || value === "all" || !VALID_STATUSES.has(value as Status)) return "";
  return value as Status;
}

function parseTypeFilter(value: string | null): string {
  if (!value || value === "all" || !VALID_FORM_TYPES.has(value)) return "";
  return value;
}

function parseLpFilter(value: string | null): string {
  if (!value || value === "all") return "";
  return value;
}

export default function FormSubmissions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = parseStatusFilter(searchParams.get("status"));
  const typeFilter = parseTypeFilter(searchParams.get("type"));
  const lpFilter = parseLpFilter(searchParams.get("lp"));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const { searchQuery, setSearchQuery, debouncedSearch, currentPage, setCurrentPage } =
    useDebouncedAdminSearch();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const { data: rows, isLoading, isError, error } = useQuery({
    queryKey: ["admin-form-submissions"],
    queryFn: async () =>
      fetchAllSupabaseRows<SubmissionRow>((from, to) =>
        supabase
          .from("website_form_submissions")
          .select("id, form_type, name, email, phone, message, status, metadata, created_at")
          .order("created_at", { ascending: false })
          .range(from, to)
      ),
  });

  const landingPageOptions = useMemo(() => {
    if (!rows?.length) return [];
    const map = new Map<string, string>();
    for (const row of rows) {
      const lp = getSubmissionLandingPage(row.metadata);
      if (!lp) continue;
      if (!map.has(lp)) map.set(lp, formatLandingPageLabel(lp));
    }
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (!rows?.length) return [];
    let result = rows;
    if (statusFilter) {
      result = result.filter((row) => row.status === statusFilter);
    }
    if (typeFilter) {
      result = result.filter((row) => row.form_type === typeFilter);
    }
    if (lpFilter === "__none__") {
      result = result.filter((row) => !getSubmissionLandingPage(row.metadata));
    } else if (lpFilter) {
      result = result.filter((row) => getSubmissionLandingPage(row.metadata) === lpFilter);
    }
    const q = debouncedSearch.toLowerCase();
    if (!q) return result;
    return result.filter((row) => {
      const lp = getSubmissionLandingPage(row.metadata);
      const campaign = getSubmissionCampaign(row.metadata);
      const lpLabel = lp ? formatLandingPageLabel(lp) : "";
      return (
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        (formTypeLabels[row.form_type] ?? row.form_type).toLowerCase().includes(q) ||
        (row.message ?? "").toLowerCase().includes(q) ||
        (lp ?? "").toLowerCase().includes(q) ||
        lpLabel.toLowerCase().includes(q) ||
        (campaign ?? "").toLowerCase().includes(q)
      );
    });
  }, [rows, debouncedSearch, statusFilter, typeFilter, lpFilter]);

  const { paginated: paginatedRows, totalPages, safePage } = paginateItems(filteredRows, currentPage);

  const toggleSelectAll = () => {
    if (!paginatedRows.length) return;
    const pageIds = paginatedRows.map((r) => r.id);
    const allPageSelected = pageIds.every((id) => selectedIds.has(id));
    if (allPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const payload: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (status === "read") {
        payload.read_at = new Date().toISOString();
        payload.read_by = user?.id ?? null;
      }
      if (status === "replied") {
        payload.replied_at = new Date().toISOString();
        payload.replied_by = user?.id ?? null;
      }
      const { error } = await supabase.from("website_form_submissions").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-form-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-form-submissions-new-count"] });
      toast.success("Status updated.");
      setSelectedId(null);
    },
    onError: () => toast.error("Failed to update status."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("website_form_submissions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-form-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-form-submissions-new-count"] });
      toast.success("Submission deleted.");
      setSelectedId(null);
      setDeleteConfirmId(null);
    },
    onError: () => toast.error("Failed to delete."),
  });

  const bulkUpdateStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: Status }) => {
      if (ids.length === 0) return;
      const payload: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
      if (status === "read") {
        payload.read_at = new Date().toISOString();
        payload.read_by = user?.id ?? null;
      }
      if (status === "replied") {
        payload.replied_at = new Date().toISOString();
        payload.replied_by = user?.id ?? null;
      }
      const { error } = await supabase.from("website_form_submissions").update(payload).in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-form-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-form-submissions-new-count"] });
      setSelectedIds(new Set());
      toast.success("Status updated.");
    },
    onError: () => toast.error("Failed to update."),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return;
      const { error } = await supabase.from("website_form_submissions").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-form-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-form-submissions-new-count"] });
      setSelectedIds(new Set());
      setBulkDeleteConfirm(false);
      toast.success("Submissions deleted.");
    },
    onError: () => toast.error("Failed to delete."),
  });

  const selected = rows?.find((r) => r.id === selectedId);
  const selectedArray = Array.from(selectedIds);
  const isPending = updateStatus.isPending || deleteMutation.isPending || bulkUpdateStatusMutation.isPending || bulkDeleteMutation.isPending;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Form Submissions</h1>

      <div className="space-y-4">
        <AdminListToolbar
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search name, email, type, LP, campaign..."
          searchAriaLabel="Search form submissions"
          filters={
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={statusFilter || "all"}
                onValueChange={(v) => {
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    if (v === "all") next.delete("status");
                    else next.set("status", v);
                    return next;
                  });
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {(Object.entries(statusLabels) as [Status, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={typeFilter || "all"}
                onValueChange={(v) => {
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    if (v === "all") next.delete("type");
                    else next.set("type", v);
                    return next;
                  });
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {Object.entries(formTypeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={lpFilter || "all"}
                onValueChange={(v) => {
                  setSearchParams((prev) => {
                    const next = new URLSearchParams(prev);
                    if (v === "all") next.delete("lp");
                    else next.set("lp", v);
                    return next;
                  });
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[180px] text-xs">
                  <SelectValue placeholder="LP / Campaign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All LPs</SelectItem>
                  <SelectItem value="__none__">No LP set</SelectItem>
                  {landingPageOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />

        {selectedArray.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 rounded-md border bg-muted/40 px-2.5 py-1.5">
              <span className="text-xs font-medium">{selectedArray.length} selected</span>
              <Button
                variant="secondary"
                className="bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                size="sm"
                onClick={() => bulkUpdateStatusMutation.mutate({ ids: selectedArray, status: "read" })}
                disabled={isPending}
              >
                {bulkUpdateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                Mark read
              </Button>
              <Button
                variant="secondary"
                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
                size="sm"
                onClick={() => bulkUpdateStatusMutation.mutate({ ids: selectedArray, status: "replied" })}
                disabled={isPending}
              >
                {bulkUpdateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MessageSquare className="h-4 w-4 mr-2" />}
                Mark replied
              </Button>
              <Button
                variant="secondary"
                className="bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-800"
                size="sm"
                onClick={() => bulkUpdateStatusMutation.mutate({ ids: selectedArray, status: "archived" })}
                disabled={isPending}
              >
                {bulkUpdateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
                Archive
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeleteConfirm(true)}
                disabled={isPending}
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
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <p className="py-8 text-center text-sm text-destructive">
              Failed to load submissions{error instanceof Error ? `: ${error.message}` : "."}
            </p>
          ) : !rows?.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No submissions found.</p>
          ) : !filteredRows.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {debouncedSearch ? `No submissions found matching "${debouncedSearch}".` : "No submissions match the current filters."}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={`${adminTableHeadClass} w-10`}>
                      <Checkbox
                        checked={paginatedRows.length > 0 && paginatedRows.every((r) => selectedIds.has(r.id))}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all on this page"
                      />
                    </TableHead>
                    <TableHead className={`${adminTableHeadClass} w-36`}>Date</TableHead>
                    <TableHead className={adminTableHeadClass}>Type</TableHead>
                    <TableHead className={adminTableHeadClass}>LP / Campaign</TableHead>
                    <TableHead className={adminTableHeadClass}>Name</TableHead>
                    <TableHead className={adminTableHeadClass}>Email</TableHead>
                    <TableHead className={`${adminTableHeadClass} w-24`}>Status</TableHead>
                    <TableHead className={`${adminTableHeadClass} w-24 text-right`}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRows.map((row) => {
                    const landingPage = getSubmissionLandingPage(row.metadata);
                    const campaign = getSubmissionCampaign(row.metadata);
                    return (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer hover:bg-muted/40"
                      onClick={() => setSelectedId(row.id)}
                    >
                      <TableCell className={adminTableCellClass} onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(row.id)}
                          onCheckedChange={() => toggleSelect(row.id)}
                          aria-label={`Select ${row.name}`}
                        />
                      </TableCell>
                      <TableCell className={`${adminTableCellClass} whitespace-nowrap text-xs text-muted-foreground`}>
                        {format(new Date(row.created_at), "dd MMM yyyy, HH:mm")}
                      </TableCell>
                      <TableCell className={`${adminTableCellClass} text-xs`}>
                        {formTypeLabels[row.form_type] ?? row.form_type}
                      </TableCell>
                      <TableCell className={`${adminTableCellClass} max-w-[160px]`}>
                        {landingPage || campaign ? (
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium">
                              {landingPage ? formatLandingPageLabel(landingPage) : "—"}
                            </p>
                            {campaign ? (
                              <p className="truncate text-[10px] text-muted-foreground" title={campaign}>
                                {campaign}
                              </p>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className={`${adminTableCellClass} text-sm font-medium`}>{row.name}</TableCell>
                      <TableCell className={`${adminTableCellClass} max-w-[180px] truncate text-xs text-muted-foreground`}>
                        {row.email}
                      </TableCell>
                      <TableCell className={adminTableCellClass}>
                        <Badge
                          variant={row.status === "new" ? "default" : "secondary"}
                          className="h-5 px-1.5 text-[10px] font-medium"
                        >
                          {statusLabels[row.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className={adminTableCellClass} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={adminIconButtonClass}
                            onClick={() => setSelectedId(row.id)}
                            aria-label="View"
                          >
                            <Eye className={adminIconClass} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`${adminIconButtonClass} text-destructive hover:text-destructive`}
                            onClick={() => setDeleteConfirmId(row.id)}
                            aria-label="Delete"
                          >
                            <Trash2 className={adminIconClass} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
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

      <Dialog open={!!selectedId} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          aria-describedby="submission-details-desc"
        >
          <DialogHeader>
            <DialogTitle>Submission details</DialogTitle>
            <DialogDescription id="submission-details-desc" className="sr-only">
              View and update status of this form submission.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 text-sm">
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="font-medium">
                      {formTypeLabels[selected.form_type] ?? selected.form_type}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">LP / Campaign</p>
                    <p className="font-medium">
                      {getSubmissionLandingPage(selected.metadata)
                        ? formatLandingPageLabel(getSubmissionLandingPage(selected.metadata)!)
                        : "—"}
                    </p>
                    {getSubmissionCampaign(selected.metadata) ? (
                      <p className="text-xs text-muted-foreground break-all">
                        {getSubmissionCampaign(selected.metadata)}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant={selected.status === "new" ? "default" : "secondary"}>
                      {statusLabels[selected.status]}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Submitted</p>
                    <p>{format(new Date(selected.created_at), "dd MMM yyyy, HH:mm")}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="font-medium break-words">{selected.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="break-all">{selected.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p>{selected.phone ?? "—"}</p>
                  </div>
                </div>
              </div>

              {selected.message && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Message</p>
                  <div className="rounded-xl border bg-muted/40 px-3 py-2 text-sm whitespace-pre-wrap">
                    {selected.message}
                  </div>
                </div>
              )}

              {selected.metadata && Object.keys(selected.metadata).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Details</p>
                  <div className="rounded-xl border bg-muted/40 p-3 space-y-1 max-h-64 overflow-y-auto">
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      {Object.entries(selected.metadata).map(([key, value]) => (
                        <div key={key} className="space-y-0.5 min-w-0">
                          <dt className="font-medium text-muted-foreground truncate">
                            {key.replace(/_/g, " ")}
                          </dt>
                          <dd className="text-foreground break-words">
                            {typeof value === "string" || typeof value === "number"
                              ? String(value)
                              : JSON.stringify(value)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="flex flex-wrap gap-2 sm:justify-between">
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSelectedId(null)}>Close</Button>
            </div>
            {selected && (
              <div className="flex flex-wrap gap-2">
                {selected.status !== "archived" && (
                  <>
                    {selected.status === "new" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800"
                        disabled={updateStatus.isPending}
                        onClick={() => updateStatus.mutate({ id: selected.id, status: "read" })}
                      >
                        {updateStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4 mr-1" />}
                        Mark read
                      </Button>
                    )}
                    {selected.status !== "replied" && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
                        disabled={updateStatus.isPending}
                        onClick={() => updateStatus.mutate({ id: selected.id, status: "replied" })}
                      >
                        {updateStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4 mr-1" />}
                        Mark replied
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-300 text-slate-700 hover:bg-slate-50"
                      disabled={updateStatus.isPending}
                      onClick={() => updateStatus.mutate({ id: selected.id, status: "archived" })}
                    >
                      {updateStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4 mr-1" />}
                      Archive
                    </Button>
                  </>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    setSelectedId(null);
                    setDeleteConfirmId(selected.id);
                  }}
                >
                  {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
                  Delete
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Single delete confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete submission?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this form submission.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation */}
      <AlertDialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedArray.length} submission{selectedArray.length !== 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the selected form submissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => bulkDeleteMutation.mutate(selectedArray)}
            >
              {bulkDeleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
