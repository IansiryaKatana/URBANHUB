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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Mail, Settings, Download, Pencil, Plus, Trash2, ArchiveX } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fetchAllSupabaseRows } from "@/utils/fetchAllSupabaseRows";
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

type Subscriber = {
  id: string;
  email: string;
  subscribed_at: string;
  source: string | null;
  unsubscribed_at: string | null;
  created_at: string;
};

type NewsletterSettings = {
  id: string;
  is_enabled: boolean;
  show_after_seconds: number;
  show_once_per_session: boolean;
  show_once_per_day: boolean;
  headline: string | null;
  subheadline: string | null;
  button_text: string | null;
  success_message: string | null;
};

export default function NewsletterAdmin() {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const { searchQuery, setSearchQuery, debouncedSearch, currentPage, setCurrentPage } =
    useDebouncedAdminSearch();

  const { data: subscribers, isLoading } = useQuery({
    queryKey: ["admin-newsletter-subscribers"],
    queryFn: async () =>
      fetchAllSupabaseRows<Subscriber>((from, to) =>
        supabase
          .from("website_newsletter_subscribers")
          .select("id, email, subscribed_at, source, unsubscribed_at, created_at")
          .is("unsubscribed_at", null)
          .order("subscribed_at", { ascending: false })
          .range(from, to)
      ),
  });

  const filteredSubscribers = useMemo(() => {
    if (!subscribers?.length) return [];
    const q = debouncedSearch.toLowerCase();
    if (!q) return subscribers;
    return subscribers.filter(
      (s) =>
        s.email.toLowerCase().includes(q) ||
        (s.source ?? "popup").toLowerCase().includes(q)
    );
  }, [subscribers, debouncedSearch]);

  const { paginated: paginatedSubscribers, totalPages, safePage } = paginateItems(
    filteredSubscribers,
    currentPage
  );
  const editing = subscribers?.find((s) => s.id === editingId);
  const selectedArray = Array.from(selectedIds);

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["admin-newsletter-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("website_newsletter_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as NewsletterSettings | null;
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (payload: Partial<NewsletterSettings>) => {
      const id = settings?.id;
      if (!id) throw new Error("No settings row");
      const { error } = await supabase.from("website_newsletter_settings").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-newsletter-settings"] });
      queryClient.invalidateQueries({ queryKey: ["website-newsletter-settings"] });
      toast.success("Popup settings saved.");
    },
    onError: () => toast.error("Failed to save."),
  });

  const createSubscriberMutation = useMutation({
    mutationFn: async (payload: { email: string; source: string | null }) => {
      const { error } = await supabase.from("website_newsletter_subscribers").insert({
        email: payload.email,
        source: payload.source || "admin",
        unsubscribed_at: null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-newsletter-subscribers"] });
      toast.success("Subscriber added.");
      setCreateOpen(false);
    },
    onError: () => toast.error("Failed to add subscriber."),
  });

  const updateSubscriberMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: { email: string; source: string | null } }) => {
      const { error } = await supabase
        .from("website_newsletter_subscribers")
        .update({
          email: payload.email,
          source: payload.source || "admin",
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-newsletter-subscribers"] });
      toast.success("Subscriber updated.");
      setEditingId(null);
    },
    onError: () => toast.error("Failed to update subscriber."),
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("website_newsletter_subscribers")
        .update({ unsubscribed_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-newsletter-subscribers"] });
      setSelectedIds(new Set());
      setEditingId(null);
      toast.success("Subscriber(s) unsubscribed.");
    },
    onError: () => toast.error("Failed to unsubscribe subscriber(s)."),
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from("website_newsletter_subscribers").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-newsletter-subscribers"] });
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      setEditingId(null);
      toast.success("Subscriber(s) deleted.");
    },
    onError: () => toast.error("Failed to delete subscriber(s)."),
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!paginatedSubscribers.length) return;
    const pageIds = paginatedSubscribers.map((s) => s.id);
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

  const handleExportCsv = () => {
    const exportList = filteredSubscribers.length ? filteredSubscribers : subscribers;
    if (!exportList?.length) {
      toast.error("No subscribers to export.");
      return;
    }
    const headers = ["Email", "Subscribed At", "Source"];
    const rows = exportList.map((s) => [
      s.email,
      format(new Date(s.subscribed_at), "yyyy-MM-dd HH:mm:ss"),
      s.source || "popup",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-subscribers-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported to CSV.");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Newsletter</h1>

      <Tabs defaultValue="subscribers" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2 h-9">
          <TabsTrigger value="subscribers" className="flex items-center gap-2 text-xs">
            <Mail className="h-3.5 w-3.5" />
            Subscribers ({subscribers?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="popup" className="flex items-center gap-2 text-xs">
            <Settings className="h-3.5 w-3.5" />
            Popup settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="subscribers" className="space-y-4">
          <AdminListToolbar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search email or source..."
            searchAriaLabel="Search subscribers"
            filters={
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" className="h-8 text-xs" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add subscriber
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={handleExportCsv}
                  disabled={!subscribers?.length}
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Export CSV
                </Button>
              </div>
            }
          />

          {selectedArray.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 rounded-md border bg-muted/40 px-2.5 py-1.5">
              <span className="text-xs font-medium">{selectedArray.length} selected</span>
              <Button
                variant="secondary"
                size="sm"
                className="h-7 text-xs"
                onClick={() => unsubscribeMutation.mutate(selectedArray)}
                disabled={unsubscribeMutation.isPending}
              >
                {unsubscribeMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <ArchiveX className="h-3.5 w-3.5 mr-1.5" />}
                Unsubscribe selected
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setBulkDeleteOpen(true)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Trash2 className="h-3.5 w-3.5 mr-1.5" />}
                Delete selected
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedIds(new Set())}>
                Clear selection
              </Button>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !subscribers?.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No subscribers yet. The popup will capture emails when visitors subscribe.
            </p>
          ) : !filteredSubscribers.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {debouncedSearch ? `No subscribers found matching "${debouncedSearch}".` : "No subscribers match the current filters."}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={`${adminTableHeadClass} w-10`}>
                      <Checkbox
                        checked={paginatedSubscribers.length > 0 && paginatedSubscribers.every((s) => selectedIds.has(s.id))}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all on this page"
                      />
                    </TableHead>
                    <TableHead className={adminTableHeadClass}>Email</TableHead>
                    <TableHead className={`${adminTableHeadClass} w-28`}>Source</TableHead>
                    <TableHead className={`${adminTableHeadClass} w-40`}>Subscribed</TableHead>
                    <TableHead className={`${adminTableHeadClass} w-24 text-right`}>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSubscribers.map((s) => (
                    <TableRow key={s.id} className="hover:bg-muted/40">
                      <TableCell className={adminTableCellClass}>
                        <Checkbox
                          checked={selectedIds.has(s.id)}
                          onCheckedChange={() => toggleSelect(s.id)}
                          aria-label={`Select ${s.email}`}
                        />
                      </TableCell>
                      <TableCell className={`${adminTableCellClass} text-sm font-medium`}>{s.email}</TableCell>
                      <TableCell className={`${adminTableCellClass} text-xs text-muted-foreground`}>
                        {s.source || "popup"}
                      </TableCell>
                      <TableCell className={`${adminTableCellClass} text-xs text-muted-foreground`}>
                        {format(new Date(s.subscribed_at), "dd MMM yyyy, HH:mm")}
                      </TableCell>
                      <TableCell className={adminTableCellClass}>
                        <div className="flex items-center justify-end gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className={adminIconButtonClass}
                            onClick={() => setEditingId(s.id)}
                            aria-label="Edit"
                          >
                            <Pencil className={adminIconClass} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`${adminIconButtonClass} text-destructive hover:text-destructive`}
                            onClick={() => unsubscribeMutation.mutate([s.id])}
                            disabled={unsubscribeMutation.isPending}
                            aria-label="Unsubscribe"
                          >
                            <ArchiveX className={adminIconClass} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`${adminIconButtonClass} text-destructive hover:text-destructive`}
                            onClick={() => deleteMutation.mutate([s.id])}
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
                totalItems={filteredSubscribers.length}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="popup" className="space-y-4">
          <div className="max-w-xl space-y-4">
            {settingsLoading || !settings ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <PopupSettingsForm
                initial={settings}
                onSubmit={(p) => updateSettingsMutation.mutate(p)}
                isLoading={updateSettingsMutation.isPending}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add subscriber</DialogTitle>
            <DialogDescription>Add a newsletter subscriber manually.</DialogDescription>
          </DialogHeader>
          <SubscriberForm
            initial={null}
            onSubmit={(payload) => createSubscriberMutation.mutate(payload)}
            onCancel={() => setCreateOpen(false)}
            isLoading={createSubscriberMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingId} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit subscriber</DialogTitle>
            <DialogDescription>Update subscriber email or source.</DialogDescription>
          </DialogHeader>
          {editing && (
            <SubscriberForm
              initial={editing}
              onSubmit={(payload) => updateSubscriberMutation.mutate({ id: editing.id, payload })}
              onCancel={() => setEditingId(null)}
              isLoading={updateSubscriberMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected subscribers?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedArray.length} subscriber{selectedArray.length === 1 ? "" : "s"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate(selectedArray)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SubscriberForm({
  initial,
  onSubmit,
  onCancel,
  isLoading,
}: {
  initial: Subscriber | null;
  onSubmit: (payload: { email: string; source: string | null }) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [email, setEmail] = useState(initial?.email ?? "");
  const [source, setSource] = useState(initial?.source ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      email: email.trim(),
      source: source.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="subscriber-email">Email</Label>
        <Input
          id="subscriber-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="subscriber-source">Source</Label>
        <Input
          id="subscriber-source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="popup"
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {initial ? "Save" : "Create"}
        </Button>
      </div>
    </form>
  );
}

function PopupSettingsForm({
  initial,
  onSubmit,
  isLoading,
}: {
  initial: NewsletterSettings;
  onSubmit: (p: Partial<NewsletterSettings>) => void;
  isLoading: boolean;
}) {
  const [is_enabled, setIs_enabled] = useState(initial.is_enabled);
  const [show_after_seconds, setShow_after_seconds] = useState(initial.show_after_seconds);
  const [show_once_per_session, setShow_once_per_session] = useState(initial.show_once_per_session);
  const [show_once_per_day, setShow_once_per_day] = useState(initial.show_once_per_day);
  const [headline, setHeadline] = useState(initial.headline ?? "");
  const [subheadline, setSubheadline] = useState(initial.subheadline ?? "");
  const [button_text, setButton_text] = useState(initial.button_text ?? "");
  const [success_message, setSuccess_message] = useState(initial.success_message ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      is_enabled,
      show_after_seconds: Math.max(0, parseInt(String(show_after_seconds), 10) || 5),
      show_once_per_session,
      show_once_per_day,
      headline: headline.trim() || null,
      subheadline: subheadline.trim() || null,
      button_text: button_text.trim() || null,
      success_message: success_message.trim() || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-2">
        <Switch id="is_enabled" checked={is_enabled} onCheckedChange={setIs_enabled} />
        <Label htmlFor="is_enabled">Enable newsletter popup</Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="show_after_seconds">Show popup after (seconds)</Label>
        <Input
          id="show_after_seconds"
          type="number"
          min={0}
          value={show_after_seconds}
          onChange={(e) => setShow_after_seconds(e.target.value)}
          placeholder="5"
        />
        <p className="text-xs text-muted-foreground">Delay before popup appears. 0 = immediately.</p>
      </div>

      <div className="flex items-center gap-2">
        <Switch id="show_once_per_session" checked={show_once_per_session} onCheckedChange={setShow_once_per_session} />
        <Label htmlFor="show_once_per_session">Show once per session</Label>
      </div>

      <div className="flex items-center gap-2">
        <Switch id="show_once_per_day" checked={show_once_per_day} onCheckedChange={setShow_once_per_day} />
        <Label htmlFor="show_once_per_day">Show once per day (uses localStorage)</Label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="headline">Headline</Label>
        <Input id="headline" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Stay Updated" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subheadline">Subheadline</Label>
        <Textarea id="subheadline" value={subheadline} onChange={(e) => setSubheadline(e.target.value)} rows={2} placeholder="Get the latest news and tips about student life at Urban Hub." />
      </div>

      <div className="space-y-2">
        <Label htmlFor="button_text">Button text</Label>
        <Input id="button_text" value={button_text} onChange={(e) => setButton_text(e.target.value)} placeholder="Subscribe" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="success_message">Success message</Label>
        <Input id="success_message" value={success_message} onChange={(e) => setSuccess_message(e.target.value)} placeholder="Thanks for subscribing!" />
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save
        </Button>
      </div>
    </form>
  );
}
