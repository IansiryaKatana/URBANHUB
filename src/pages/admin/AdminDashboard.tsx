import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays } from "date-fns";
import { formatBlogPostDateShort } from "@/utils/blogDates";

export default function AdminDashboard() {
  const { data: recentBlogs } = useQuery({
    queryKey: ["admin-dashboard-recent-blogs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, slug, published_at")
        .eq("status", "published")
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(7);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: recentSubmissions } = useQuery({
    queryKey: ["admin-dashboard-recent-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("website_form_submissions")
        .select("id, name, email, form_type, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  const weekStart = subDays(new Date(), 7).toISOString();
  const { data: weekAnalytics } = useQuery({
    queryKey: ["admin-dashboard-week-analytics", weekStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("website_analytics_page_views")
        .select("id, page_path, session_id, created_at")
        .gte("created_at", weekStart);
      if (error) throw error;
      const rows = data ?? [];
      const sessions = new Set(rows.map((r: { session_id: string | null }) => r.session_id).filter(Boolean));
      const homepagePaths = ["/", "/studios"];
      const homepageViews = rows.filter(
        (r: { page_path: string | null }) => r.page_path && homepagePaths.includes(r.page_path)
      );
      const homepageSessions = new Set(
        homepageViews.map((r: { session_id: string | null }) => r.session_id).filter(Boolean)
      );
      return {
        totalViews: rows.length,
        totalSessions: sessions.size,
        homepageViews: homepageViews.length,
        homepageSessions: homepageSessions.size,
      };
    },
  });

  const { data: latestSubscribers } = useQuery({
    queryKey: ["admin-dashboard-latest-subscribers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("website_newsletter_subscribers")
        .select("id, email, subscribed_at")
        .is("unsubscribed_at", null)
        .order("subscribed_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of recent activity.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {/* Recent form submissions */}
        <Card className="flex h-full flex-col border-0 shadow-none bg-blue-50/90 dark:bg-blue-950/20">
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-base font-display font-black uppercase tracking-wide">
              Recent form submissions
            </CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col p-0 pt-0">
            <div className="min-h-0 flex-1 overflow-auto">
              {recentSubmissions?.length ? (
                <ul className="divide-y divide-blue-100/80 dark:divide-blue-900/30">
                  {recentSubmissions.map((sub) => (
                    <li key={sub.id} className="flex items-center justify-between gap-2 px-6 py-3 first:pt-0">
                      <div className="min-w-0 flex-1">
                        <span className="font-medium line-clamp-1 text-sm">{sub.name}</span>
                        <span className="text-muted-foreground text-xs block">
                          {sub.form_type} · {format(new Date(sub.created_at), "MMM d")}
                        </span>
                      </div>
                      <Link
                        to={`/admin/form-submissions?id=${sub.id}`}
                        className="shrink-0 rounded-lg bg-muted/80 p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="View submission"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-6 pb-4 text-sm text-muted-foreground">No submissions yet.</p>
              )}
            </div>
            <div className="mt-auto shrink-0 px-6 pb-4 pt-2">
              <Link
                to="/admin/form-submissions"
                className="flex w-full items-center justify-between rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <span>View all</span>
                <ArrowUpRight className="h-4 w-4 shrink-0" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Past week homepage analytics */}
        <Card className="flex h-full flex-col border-0 shadow-none bg-violet-50/90 dark:bg-violet-950/20">
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-base font-display font-black uppercase tracking-wide">
              Past week (homepage)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1">
              {weekAnalytics !== undefined ? (
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{weekAnalytics.homepageSessions} visitors</p>
                    <p className="text-muted-foreground text-xs">
                      {weekAnalytics.homepageViews} page views on / and /studios
                    </p>
                  </div>
                  <Link
                    to="/admin/analytics"
                    className="shrink-0 rounded-lg bg-muted/80 p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="View analytics"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Loading…</p>
              )}
            </div>
            <div className="mt-auto shrink-0 pt-2">
              <Link
                to="/admin/analytics"
                className="flex w-full items-center justify-between rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <span>Full analytics</span>
                <ArrowUpRight className="h-4 w-4 shrink-0" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Latest newsletter subscribers */}
        <Card className="flex h-full flex-col border-0 shadow-none bg-teal-50/90 dark:bg-teal-950/20">
          <CardHeader className="space-y-0 pb-2">
            <CardTitle className="text-base font-display font-black uppercase tracking-wide">
              Latest newsletter subscribers
            </CardTitle>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col p-0 pt-0">
            <div className="min-h-0 flex-1 overflow-auto">
              {latestSubscribers?.length ? (
                <ul className="divide-y divide-teal-100/80 dark:divide-teal-900/30">
                  {latestSubscribers.map((sub) => (
                    <li key={sub.id} className="flex items-center justify-between gap-2 px-6 py-3 first:pt-0">
                      <div className="min-w-0 flex-1">
                        <span className="text-sm line-clamp-1 block" title={sub.email}>
                          {sub.email}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {format(new Date(sub.subscribed_at), "MMM d, yyyy")}
                        </span>
                      </div>
                      <Link
                        to="/admin/newsletter"
                        className="shrink-0 rounded-lg bg-muted/80 p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="View subscribers"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-6 pb-4 text-sm text-muted-foreground">No subscribers yet.</p>
              )}
            </div>
            <div className="mt-auto shrink-0 px-6 pb-4 pt-2">
              <Link
                to="/admin/newsletter"
                className="flex w-full items-center justify-between rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <span>View all</span>
                <ArrowUpRight className="h-4 w-4 shrink-0" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 7 recent published blogs – table */}
      <Card className="flex flex-col border-0 shadow-none bg-amber-50/90 dark:bg-amber-950/20">
        <CardHeader className="space-y-0 pb-2">
          <CardTitle className="text-base font-display font-black uppercase tracking-wide">
            7 recent published blogs
          </CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          <div className="min-h-0 flex-1 overflow-auto">
            {recentBlogs?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead className="hidden sm:table-cell">Published</TableHead>
                    <TableHead className="w-[52px] text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentBlogs.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell className="font-medium">
                        <span className="line-clamp-2" title={post.title}>
                          {post.title}
                        </span>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                        {formatBlogPostDateShort(post.published_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          to={`/admin/blog/${post.id}`}
                          className="inline-flex rounded-lg bg-muted/80 p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label={`Edit ${post.title}`}
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="px-6 py-4 text-sm text-muted-foreground">No published posts yet.</p>
            )}
          </div>
          <div className="mt-auto shrink-0 px-6 pb-4 pt-2">
            <Link
              to="/admin/blog"
              className="flex w-full items-center justify-between rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 sm:inline-flex sm:w-auto"
            >
              <span>View all blogs</span>
              <ArrowUpRight className="h-4 w-4 shrink-0" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
