import { supabase } from "@/integrations/supabase/client";

/**
 * Get the default route for a user based on their role and permissions
 * Returns the first accessible route, or null if none found
 */
export async function getDefaultRouteForRole(role: string): Promise<string | null> {
  if (!role) return null;

  // Define role-specific default routes (in priority order)
  const roleDefaultRoutes: Record<string, string[]> = {
    // Portal subroles
    maintenance_officer: ["/maintenance", "/maintenance/job-management", "/maintenance/out-of-order"],
    housekeeper: ["/housekeeping", "/housekeeping/roster"],
    reservationist: ["/ota-bookings", "/ota-bookings/booking-chart", "/ota-bookings/studio-allocation"],
    operations_manager: ["/maintenance", "/housekeeping", "/ota-bookings", "/admin"],
    accountant: ["/admin", "/admin/payment-history", "/admin/reports"],
    front_desk: ["/admin", "/admin/applications", "/admin/students"],
    // Website subroles
    seo_editor: ["/admin", "/admin/seo", "/admin/blog"],
    content_editor: ["/admin", "/admin/blog", "/admin/media"],
    marketing_manager: ["/admin", "/admin/blog", "/admin/newsletter", "/admin/seo", "/admin/analytics"],
    customer_support: ["/admin", "/admin/form-submissions", "/admin/faqs", "/admin/reviews"],
    // Base roles
    staff: ["/admin"],
    superadmin: ["/admin"],
    admin: ["/admin"],
  };

  // Get default routes for this role
  const defaultRoutes = roleDefaultRoutes[role] || ["/admin"];

  // Check permissions for each route in priority order
  const rolesToCheck = [role];
  const portalSubroles = ["operations_manager", "reservationist", "accountant", "front_desk", "maintenance_officer", "housekeeper"];
  const websiteSubroles = ["seo_editor", "content_editor", "marketing_manager", "customer_support"];
  const allSubroles = [...portalSubroles, ...websiteSubroles];
  
  if (allSubroles.includes(role)) {
    rolesToCheck.push("staff");
  }

  // Fetch permissions for all default routes
  const { data: permissions, error } = await supabase
    .from("route_permissions")
    .select("route_path, role, allowed")
    .in("route_path", defaultRoutes)
    .in("role", rolesToCheck);

  if (error) {
    console.error("Error fetching route permissions for default route:", error);
    // Fallback to first default route if error
    return defaultRoutes[0] || "/admin";
  }

  // Check each route in priority order
  for (const route of defaultRoutes) {
    // Check if staff is explicitly denied (denies all subroles)
    if (rolesToCheck.includes("staff") && role !== "staff") {
      const staffPerm = permissions?.find((p) => p.route_path === route && p.role === "staff");
      if (staffPerm && !staffPerm.allowed) {
        continue; // Skip this route if staff is denied
      }
    }

    // Check specific role permission
    const specificPerm = permissions?.find((p) => p.route_path === route && p.role === role);
    if (specificPerm) {
      if (specificPerm.allowed === true) {
        return route; // Found accessible route
      }
      continue; // Explicitly denied, try next
    }

    // For subroles: If no specific record, they need explicit permission (no inheritance)
    const portalSubroles = ["operations_manager", "reservationist", "accountant", "front_desk", "maintenance_officer", "housekeeper"];
    const websiteSubroles = ["seo_editor", "content_editor", "marketing_manager", "customer_support"];
    const allSubroles = [...portalSubroles, ...websiteSubroles];
    
    if (allSubroles.includes(role)) {
      // Check if staff has permission (subroles can inherit if no explicit record)
      const staffPerm = permissions?.find((p) => p.route_path === route && p.role === "staff");
      if (staffPerm && staffPerm.allowed === true) {
        return route; // Inherit from staff if allowed
      }
      continue; // No explicit permission for subrole
    }

    // For top-level roles: If no record, default to allowing
    return route;
  }

  // If no accessible route found, return first default (fallback)
  return defaultRoutes[0] || "/admin";
}

