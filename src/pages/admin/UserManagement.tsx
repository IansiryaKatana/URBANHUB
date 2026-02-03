import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Users, Plus, Pencil, Mail, Search, Trash2 } from "lucide-react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Profile = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  staff_subrole: string | null;
  created_at: string;
};

const ROLES = [
  { value: "staff", label: "Staff" },
  { value: "superadmin", label: "Super Admin" },
  { value: "admin", label: "Admin" },
] as const;

// Website-specific subroles only (for website admin users)
const WEBSITE_SUBROLES = [
  { value: "__none__", label: "None" },
  { value: "seo_editor", label: "SEO Editor" },
  { value: "content_editor", label: "Content Editor" },
  { value: "marketing_manager", label: "Marketing Manager" },
  { value: "customer_support", label: "Customer Support" },
] as const;

export default function UserManagement() {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("staff");
  const [inviteSubrole, setInviteSubrole] = useState<string | null>(null);

  // Only allow superadmin
  if (role !== "superadmin") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">Access Denied</p>
          <p className="text-muted-foreground mt-2">Only super administrators can access user management.</p>
        </div>
      </div>
    );
  }

  // Fetch website users (staff, superadmin, admin roles only)
  const { data: users, isLoading } = useQuery({
    queryKey: ["website-users"],
    queryFn: async () => {
      // Fetch all profiles and filter client-side to avoid query syntax issues
      // Using select("*") to get all columns and avoid column name issues
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error fetching profiles:", error);
        // If it's a 400 error, it might be RLS or query syntax issue
        if (error.status === 400) {
          console.error("400 Bad Request - check RLS policies and query syntax");
        }
        throw error;
      }

      if (error) {
        console.error("Error fetching profiles:", error);
        throw error;
      }
      
      // Filter to only website admin roles and website subroles
      const websiteRoles = ["staff", "superadmin", "admin"];
      const websiteSubroles = ["seo_editor", "content_editor", "marketing_manager", "customer_support"];
      const portalSubroles = ["operations_manager", "reservationist", "accountant", "front_desk", "maintenance_officer", "housekeeper"];
      
      const filtered = (data || [])
        .filter((profile: any) => {
          // Include if role is website admin role
          if (websiteRoles.includes(profile.role)) {
            // If has subrole, only include if it's a website subrole (exclude portal subroles)
            if (profile.staff_subrole) {
              return websiteSubroles.includes(profile.staff_subrole);
            }
            // If no subrole, include (base staff/admin/superadmin)
            return true;
          }
          return false;
        })
        .map((profile: any) => ({
          id: profile.id,
          email: profile.email || "",
          first_name: profile.first_name || null,
          last_name: profile.last_name || null,
          role: profile.role || "",
          staff_subrole: profile.staff_subrole || null,
          created_at: profile.created_at || new Date().toISOString(),
        })) as Profile[];
      
      return filtered;
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Profile> }) => {
      // Clean updates - remove undefined values and ensure only valid fields
      const cleanUpdates: Record<string, any> = {};
      if (updates.role !== undefined) cleanUpdates.role = updates.role;
      if (updates.staff_subrole !== undefined) {
        cleanUpdates.staff_subrole = updates.staff_subrole === "__none__" ? null : updates.staff_subrole;
      }
      if (updates.first_name !== undefined) cleanUpdates.first_name = updates.first_name;
      if (updates.last_name !== undefined) cleanUpdates.last_name = updates.last_name;
      
      const { data, error } = await supabase
        .from("profiles")
        .update(cleanUpdates)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Update error details:", {
          error,
          id,
          updates: cleanUpdates,
          status: error.status,
          code: error.code,
          message: error.message,
        });
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-users"] });
      toast.success("User updated successfully");
      setIsEditDialogOpen(false);
      setEditingUser(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update user: ${error.message}`);
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      // Delete from auth.users (requires admin client or edge function)
      // For now, we'll just delete the profile and mark as inactive
      // In production, you'd want to use an edge function to delete from auth.users
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-users"] });
      toast.success("User deleted successfully");
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete user: ${error.message}`);
    },
  });

  // Create user mutation
  const inviteUserMutation = useMutation({
    mutationFn: async ({
      email, 
      password,
      firstName, 
      lastName, 
      role, 
      staff_subrole 
    }: { 
      email: string; 
      password: string;
      firstName?: string; 
      lastName?: string; 
      role: string; 
      staff_subrole: string | null 
    }) => {
      // Create user via Supabase Auth with the provided password
      const { data, error } = await supabase.auth.signUp({
        email,
        password: password,
        options: {
          data: {
            role: role,
          },
          emailRedirectTo: `${window.location.origin}/admin/login`,
        },
      });

      if (error) throw error;
      if (!data.user) throw new Error("Failed to create user");

      // Update profile with role, subrole, and name
      const profileUpdate: any = { 
        role,
        first_name: firstName || null,
        last_name: lastName || null,
      };
      if (staff_subrole) {
        profileUpdate.staff_subrole = staff_subrole;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update(profileUpdate)
        .eq("id", data.user.id);

      if (profileError) throw profileError;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-users"] });
      toast.success("User account created successfully");
      setIsInviteDialogOpen(false);
      setInviteEmail("");
      setInvitePassword("");
      setInviteFirstName("");
      setInviteLastName("");
      setInviteRole("staff");
      setInviteSubrole(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create user: ${error.message}`);
    },
  });

  const filteredUsers = users?.filter((user) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      user.email.toLowerCase().includes(searchLower) ||
      user.first_name?.toLowerCase().includes(searchLower) ||
      user.last_name?.toLowerCase().includes(searchLower) ||
      user.role.toLowerCase().includes(searchLower) ||
      user.staff_subrole?.toLowerCase().includes(searchLower)
    );
  });

  const handleEdit = (user: Profile) => {
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };

  const handleSave = () => {
    if (!editingUser) return;

    const updates: Partial<Profile> = {
      role: editingUser.role,
      staff_subrole: editingUser.staff_subrole,
    };

    // If role is not staff, clear subrole
    if (editingUser.role !== "staff") {
      updates.staff_subrole = null;
    }

    updateUserMutation.mutate({ id: editingUser.id, updates });
  };

  const handleInvite = () => {
    if (!inviteEmail) {
      toast.error("Please enter an email address");
      return;
    }
    if (!invitePassword) {
      toast.error("Please enter a password");
      return;
    }
    if (invitePassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    inviteUserMutation.mutate({
      email: inviteEmail,
      password: invitePassword,
      firstName: inviteFirstName || undefined,
      lastName: inviteLastName || undefined,
      role: inviteRole,
      staff_subrole: inviteSubrole,
    });
  };

  const handleDelete = (user: Profile) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
    }
  };

  const getRoleLabel = (role: string) => {
    return ROLES.find((r) => r.value === role)?.label || role;
  };

  const getSubroleLabel = (subrole: string | null) => {
    if (!subrole || subrole === "__none__") return "—";
    return WEBSITE_SUBROLES.find((r) => r.value === subrole)?.label || subrole;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage website admin users and their roles
          </p>
        </div>
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>
                Create a new website admin user account with email and password.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email *</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-password">Password *</Label>
                <Input
                  id="invite-password"
                  type="password"
                  placeholder="Enter password (min 6 characters)"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  required
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground">
                  User will login with this email and password
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-first-name">First Name</Label>
                  <Input
                    id="invite-first-name"
                    type="text"
                    placeholder="John"
                    value={inviteFirstName}
                    onChange={(e) => setInviteFirstName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-last-name">Last Name</Label>
                  <Input
                    id="invite-last-name"
                    type="text"
                    placeholder="Doe"
                    value={inviteLastName}
                    onChange={(e) => setInviteLastName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Role *</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {inviteRole === "staff" && (
                <div className="space-y-2">
                  <Label htmlFor="invite-subrole">Staff Subrole</Label>
                  <Select
                    value={inviteSubrole || "__none__"}
                    onValueChange={(value) => setInviteSubrole(value === "__none__" ? null : value)}
                  >
                    <SelectTrigger id="invite-subrole">
                      <SelectValue placeholder="Select subrole" />
                    </SelectTrigger>
                    <SelectContent>
                      {WEBSITE_SUBROLES.map((subrole) => (
                        <SelectItem key={subrole.value} value={subrole.value}>
                          {subrole.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleInvite} disabled={inviteUserMutation.isPending}>
                {inviteUserMutation.isPending ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name, email, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Loading users...</div>
            </div>
          ) : filteredUsers && filteredUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Subrole</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      {user.first_name || user.last_name
                        ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{getRoleLabel(user.role)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">
                        {getSubroleLabel(user.staff_subrole)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(user)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(user)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "No users found matching your search." : "No users found."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user role and subrole. Changes take effect immediately.
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={editingUser.email} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(value) =>
                    setEditingUser({ ...editingUser, role: value, staff_subrole: value !== "staff" ? null : editingUser.staff_subrole })
                  }
                >
                  <SelectTrigger id="edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {editingUser.role === "staff" && (
                <div className="space-y-2">
                  <Label htmlFor="edit-subrole">Staff Subrole</Label>
                  <Select
                    value={editingUser.staff_subrole || "__none__"}
                    onValueChange={(value) =>
                      setEditingUser({ ...editingUser, staff_subrole: value === "__none__" ? null : value })
                    }
                  >
                    <SelectTrigger id="edit-subrole">
                      <SelectValue placeholder="Select subrole" />
                    </SelectTrigger>
                    <SelectContent>
                      {WEBSITE_SUBROLES.map((subrole) => (
                        <SelectItem key={subrole.value} value={subrole.value}>
                          {subrole.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the user account for <strong>{userToDelete?.email}</strong>. 
              This action cannot be undone. The user will no longer be able to access the admin panel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
