import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Inbox,
  HelpCircle,
  Sparkles,
  Building2,
  FileText,
  Menu,
  X,
  ExternalLink,
  Search,
  BarChart3,
  Star,
  ImageIcon,
  Mail,
  Users,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const allNavItems = [
  { path: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { path: "/admin/form-submissions", label: "Form Submissions", icon: Inbox, subroles: ["customer_support"] },
  { path: "/admin/faqs", label: "FAQs", icon: HelpCircle, subroles: ["customer_support", "content_editor"] },
  { path: "/admin/amenities", label: "Amenities", icon: Building2, subroles: ["content_editor", "marketing_manager"] },
  { path: "/admin/why-us", label: "Why Us", icon: Sparkles, subroles: ["content_editor", "marketing_manager"] },
  { path: "/admin/reviews", label: "Reviews", icon: Star, subroles: ["customer_support", "content_editor", "marketing_manager"] },
  { path: "/admin/blog", label: "Blog", icon: FileText, subroles: ["content_editor", "marketing_manager", "seo_editor"] },
  { path: "/admin/media", label: "Media", icon: ImageIcon, subroles: ["content_editor", "marketing_manager"] },
  { path: "/admin/newsletter", label: "Newsletter", icon: Mail, subroles: ["marketing_manager"] },
  { path: "/admin/seo", label: "SEO", icon: Search, subroles: ["seo_editor", "marketing_manager"] },
  { path: "/admin/analytics", label: "Analytics", icon: BarChart3, subroles: ["marketing_manager"] },
  { path: "/admin/users", label: "Users", icon: Users, superadminOnly: true },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, role, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Get user's subrole
  const userSubrole = profile?.staff_subrole;

  // Filter nav items based on role and subrole
  const navItems = allNavItems.filter((item) => {
    // Superadmin only items
    if (item.superadminOnly) {
      return role === "superadmin";
    }
    
    // If item has subrole restrictions
    if (item.subroles && item.subroles.length > 0) {
      // Superadmin and admin see everything
      if (role === "superadmin" || role === "admin") {
        return true;
      }
      // Staff with website subrole: check if their subrole is in allowed list
      if (role === "staff" && userSubrole) {
        return item.subroles.includes(userSubrole);
      }
      // Staff without subrole: no access to restricted items
      if (role === "staff" && !userSubrole) {
        return false;
      }
      // Other roles: no access
      return false;
    }
    
    // Items without subrole restrictions: visible to all website admins
    // (superadmin, admin, staff with website subroles)
    if (role === "superadmin" || role === "admin") {
      return true;
    }
    if (role === "staff") {
      const websiteSubroles = ["seo_editor", "content_editor", "marketing_manager", "customer_support"];
      // Staff with website subrole can see unrestricted items
      return userSubrole ? websiteSubroles.includes(userSubrole) : false;
    }
    return false;
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="h-screen overflow-hidden bg-muted/30 flex flex-col md:flex-row">
      {/* Sidebar - mobile: drawer; desktop: fixed height, no scroll */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-primary transform transition-transform duration-200 ease-out md:relative md:translate-x-0 md:flex-shrink-0 md:h-full shadow-xl",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full max-h-screen">
          <div className="flex items-center justify-between p-4 flex-shrink-0">
            <div className="flex flex-col">
              <span className="font-display font-black text-lg uppercase tracking-wide text-white">Urban Hub</span>
              <span className="text-xs text-white/80 tracking-wide uppercase">Admin panel</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-white hover:bg-white/20 hover:text-white"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto min-h-0">
            {navItems.map(({ path, label, icon: Icon }) => {
              const isActive = path === "/admin" ? location.pathname === "/admin" : location.pathname.startsWith(path);
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-white/20 text-white shadow-sm"
                      : "text-white/90 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="p-3 space-y-2 flex-shrink-0">
            <p className="text-xs text-white/70 truncate px-3" title={profile?.email ?? user?.email ?? ""}>
              {profile?.email ?? user?.email ?? "—"}
            </p>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold bg-black text-white hover:bg-black/90 transition-colors shadow-sm"
            >
              <span>Back to site</span>
              <ExternalLink className="h-4 w-4 shrink-0" />
            </a>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold bg-white text-black hover:bg-white/95 transition-colors shadow-sm"
            >
              <span>Sign out</span>
              <ArrowUpRight className="h-4 w-4 shrink-0" />
            </button>
          </div>
        </div>
      </aside>
      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}
      {/* Main content - only this area scrolls; no header bar */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        <div className="absolute top-4 right-4 z-20 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl bg-background/90 shadow-md hover:bg-background"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        <main data-admin-main className="flex-1 min-h-0 p-4 md:p-6 overflow-auto rounded-tl-2xl md:rounded-tl-none bg-muted/20 shadow-sm">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
