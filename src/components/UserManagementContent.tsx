import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import logger from "@/lib/logger";
import { api } from "@/lib/api";
import { X as XIcon } from "lucide-react";

interface User {
  id: string;
  username: string;
  email?: string;
  telegramUserId?: number;
  telegramUsername?: string;
  permissions: {
    read: boolean;
    write: boolean;
  };
  createdAt: string;
  lastActive?: string;
  userType?: string;
}

type UserType = "google" | "local";

export const UserManagementContent = ({ onBack }: { onBack: () => void }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<UserType>("local");
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    readPermission: true,
    writePermission: false,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.getUsers();
      setUsers(response.users);
    } catch (error) {
      logger.error("Failed to fetch users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    try {
      // Validate input based on user type
      if (!newUser.email) {
        toast.error("Email is required");
        return;
      }
      
      if (userType === "local") {
        if (!newUser.username) {
          toast.error("Username is required for local users");
          return;
        }
        if (!newUser.password) {
          toast.error("Password is required for local users");
          return;
        }
      }
      
      const userData = {
        username: userType === "local" ? newUser.username : undefined,
        email: newUser.email,
        password: userType === "local" ? newUser.password : undefined,
        permissions: {
          read: newUser.readPermission,
          write: newUser.writePermission,
        },
      };
      
      // Filter out undefined fields
      const filteredUserData: any = {};
      Object.keys(userData).forEach(key => {
        const value = (userData as any)[key];
        if (value !== undefined) {
          filteredUserData[key] = value;
        }
      });
      
      const addedUser = await api.addUser(filteredUserData);
      setUsers([...users, addedUser]);
      setShowAddUserDialog(false);
      setNewUser({ username: "", email: "", password: "", readPermission: true, writePermission: false });
      setUserType("local");
      toast.success("User added successfully");
    } catch (error: any) {
      logger.error("Failed to add user:", error);
      toast.error(error.message || "Failed to add user");
    }
  };

  const handleEditUser = async (user: User) => {
    try {
      const userData = {
        email: user.email,
        permissions: user.permissions,
      };
      
      const updatedUser = await api.updateUser(user.id, userData);
      setUsers(users.map(u => u.id === user.id ? updatedUser : u));
      setEditingUser(null);
      toast.success("User updated successfully");
    } catch (error) {
      logger.error("Failed to update user:", error);
      toast.error("Failed to update user");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await api.deleteUser(userId);
      setUsers(users.filter(u => u.id !== userId));
      toast.success("User deleted successfully");
    } catch (error) {
      logger.error("Failed to delete user:", error);
      toast.error("Failed to delete user");
    }
  };

  const togglePermission = (userId: string, permission: 'read' | 'write') => {
    setUsers(users.map(user => {
      if (user.id === userId) {
        return {
          ...user,
          permissions: {
            ...user.permissions,
            [permission]: !user.permissions[permission]
          }
        };
      }
      return user;
    }));
  };

  // Function to truncate email to first 5 characters
  const truncateEmail = (email: string | undefined) => {
    if (!email) return "-";
    if (email.length <= 5) return email;
    return email.substring(0, 5) + "...";
  };

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Users</h1>
          <button
            onClick={() => {
              // Close the users page and navigate back to file explorer
              onBack();
              // Update the browser history to reflect we're back on the main page
              window.history.pushState({ path: ["Home"] }, '', '/');
              // Dispatch event to show file explorer
              window.dispatchEvent(new CustomEvent('showFiles'));
            }}
            className="rounded-full p-2 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <XIcon className="h-5 w-5 text-gray-900 dark:text-white" />
          </button>
        </div>

        <Card className="mb-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-gray-900 dark:text-white">User Management</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Manage user accounts and permissions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 py-6">
            <div className="flex justify-end mb-4">
              <Button onClick={() => setShowAddUserDialog(true)}>
                Add User
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50 dark:bg-gray-700">
                    <TableRow>
                      <TableHead className="text-gray-700 dark:text-gray-300 w-32">Username</TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300 w-24">Email</TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300 w-24">Type</TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300 w-32">Telegram</TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300 w-20 text-center">Read</TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300 w-20 text-center">Write</TableHead>
                      <TableHead className="text-gray-700 dark:text-gray-300 w-28">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <TableCell className="font-medium text-gray-900 dark:text-white truncate w-32">{user.username || "-"}</TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300 truncate w-24" title={user.email || "-"}>
                          {truncateEmail(user.email)}
                        </TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300 w-24">
                          <span className="capitalize">
                            {user.userType || "local"}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300 truncate w-32">
                          {user.telegramUsername ? (
                            <span>@{user.telegramUsername}</span>
                          ) : (
                            <span className="text-muted-foreground">Not connected</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center w-20">
                          <Switch
                            checked={user.permissions.read}
                            onCheckedChange={() => togglePermission(user.id, 'read')}
                          />
                        </TableCell>
                        <TableCell className="text-center w-20">
                          <Switch
                            checked={user.permissions.write}
                            onCheckedChange={() => togglePermission(user.id, 'write')}
                          />
                        </TableCell>
                        <TableCell className="w-28">
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingUser(user)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id)}
                              disabled={user.username === "admin"} // Prevent deleting admin
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add User Dialog */}
      <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
        <DialogContent className="max-w-md bg-white dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Add New User</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Create a new user account with specific permissions
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user-type" className="text-right text-gray-700 dark:text-gray-300">
                Login Type
              </Label>
              <Select value={userType} onValueChange={(value: UserType) => setUserType(value)}>
                <SelectTrigger className="col-span-3 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                  <SelectValue placeholder="Select user type" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                  <SelectItem value="local" className="text-gray-700 dark:text-gray-300">Username/Password</SelectItem>
                  <SelectItem value="google" className="text-gray-700 dark:text-gray-300">Google Login</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {userType === "local" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="username" className="text-right text-gray-700 dark:text-gray-300">
                  Username
                </Label>
                <Input
                  id="username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  className="col-span-3 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                />
              </div>
            )}
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right text-gray-700 dark:text-gray-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                className="col-span-3 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
              />
            </div>
            
            {userType === "local" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right text-gray-700 dark:text-gray-300">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="col-span-3 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                />
              </div>
            )}
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="read-permission" className="text-right text-gray-700 dark:text-gray-300">
                Read Permission
              </Label>
              <div className="col-span-3 flex items-center">
                <Switch
                  id="read-permission"
                  checked={newUser.readPermission}
                  onCheckedChange={(checked) => setNewUser({...newUser, readPermission: checked})}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="write-permission" className="text-right text-gray-700 dark:text-gray-300">
                Write Permission
              </Label>
              <div className="col-span-3 flex items-center">
                <Switch
                  id="write-permission"
                  checked={newUser.writePermission}
                  onCheckedChange={(checked) => setNewUser({...newUser, writePermission: checked})}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddUserDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddUser} 
              disabled={userType === "local" ? !newUser.username || !newUser.password : !newUser.email}
            >
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="bg-white dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Edit User</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Modify user account and permissions
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-username" className="text-right text-gray-700 dark:text-gray-300">
                  Username
                </Label>
                <Input
                  id="edit-username"
                  value={editingUser.username || ""}
                  onChange={(e) => setEditingUser({...editingUser, username: e.target.value})}
                  className="col-span-3 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  disabled
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-email" className="text-right text-gray-700 dark:text-gray-300">
                  Email
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingUser.email || ""}
                  onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                  className="col-span-3 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-read-permission" className="text-right text-gray-700 dark:text-gray-300">
                  Read Permission
                </Label>
                <div className="col-span-3 flex items-center">
                  <Switch
                    id="edit-read-permission"
                    checked={editingUser.permissions.read}
                    onCheckedChange={(checked) => setEditingUser({
                      ...editingUser,
                      permissions: {...editingUser.permissions, read: checked}
                    })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-write-permission" className="text-right text-gray-700 dark:text-gray-300">
                  Write Permission
                </Label>
                <div className="col-span-3 flex items-center">
                  <Switch
                    id="edit-write-permission"
                    checked={editingUser.permissions.write}
                    onCheckedChange={(checked) => setEditingUser({
                      ...editingUser,
                      permissions: {...editingUser.permissions, write: checked}
                    })}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={() => editingUser && handleEditUser(editingUser)}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};