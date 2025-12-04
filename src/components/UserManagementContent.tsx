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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">
            Manage users and their permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowAddUserDialog(true)}>
            Add User
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onBack}
            className="h-8 w-8"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>
                Manage user accounts and permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Telegram</TableHead>
                    <TableHead>Read</TableHead>
                    <TableHead>Write</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username || "-"}</TableCell>
                      <TableCell>{user.email || "-"}</TableCell>
                      <TableCell>
                        <span className="capitalize">
                          {user.userType || "local"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {user.telegramUsername ? (
                          <span>@{user.telegramUsername}</span>
                        ) : (
                          <span className="text-muted-foreground">Not connected</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={user.permissions.read}
                          onCheckedChange={() => togglePermission(user.id, 'read')}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={user.permissions.write}
                          onCheckedChange={() => togglePermission(user.id, 'write')}
                        />
                      </TableCell>
                      <TableCell>{user.createdAt}</TableCell>
                      <TableCell>
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
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add User Dialog */}
      <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account with specific permissions
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user-type" className="text-right">
                Login Type
              </Label>
              <Select value={userType} onValueChange={(value: UserType) => setUserType(value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select user type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Username/Password</SelectItem>
                  <SelectItem value="google">Google Login</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {userType === "local" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="username" className="text-right">
                  Username
                </Label>
                <Input
                  id="username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  className="col-span-3"
                />
              </div>
            )}
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                className="col-span-3"
              />
            </div>
            
            {userType === "local" && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="password" className="text-right">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="col-span-3"
                />
              </div>
            )}
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="read-permission" className="text-right">
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
              <Label htmlFor="write-permission" className="text-right">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Modify user account and permissions
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-username" className="text-right">
                  Username
                </Label>
                <Input
                  id="edit-username"
                  value={editingUser.username || ""}
                  onChange={(e) => setEditingUser({...editingUser, username: e.target.value})}
                  className="col-span-3"
                  disabled
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-email" className="text-right">
                  Email
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingUser.email || ""}
                  onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-read-permission" className="text-right">
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
                <Label htmlFor="edit-write-permission" className="text-right">
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