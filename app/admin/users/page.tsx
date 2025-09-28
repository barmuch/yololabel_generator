'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Trash2, UserPlus, Shield, User, Home, Edit, ArrowLeft } from 'lucide-react';

interface UserItem { 
  id: string; 
  username: string; 
  role: 'admin' | 'member'; 
  createdAt: number; 
  updatedAt: number; 
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'member' as 'admin' | 'member' });
  const [editUser, setEditUser] = useState({ username: '', password: '', role: 'member' as 'admin' | 'member' });

  // Check if user is admin
  const userRole = (session?.user as any)?.role;
  
  useEffect(() => {
    if (status === 'loading') return;
    if (!session || userRole !== 'admin') {
      router.push('/login');
      return;
    }
    loadUsers();
  }, [session, status, userRole, router]);

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password) return;
    
    setCreating(true);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });
      
      if (response.ok) {
        setNewUser({ username: '', password: '', role: 'member' });
        loadUsers();
        alert('User berhasil dibuat!');
      } else {
        const error = await response.json();
        alert('Gagal membuat user: ' + error.error);
      }
    } catch (error) {
      alert('Error: ' + error);
    } finally {
      setCreating(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser.username || !editingUser) return;
    
    try {
      const updateData: any = { username: editUser.username, role: editUser.role };
      if (editUser.password) {
        updateData.password = editUser.password;
      }
      
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      
      if (response.ok) {
        setEditingUser(null);
        setEditUser({ username: '', password: '', role: 'member' });
        loadUsers();
        alert('User berhasil diupdate!');
      } else {
        const error = await response.json();
        alert('Gagal update user: ' + error.error);
      }
    } catch (error) {
      alert('Error: ' + error);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Yakin ingin menghapus user "${username}"?`)) return;
    
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        loadUsers();
        alert('User berhasil dihapus!');
      } else {
        const error = await response.json();
        alert('Gagal hapus user: ' + error.error);
      }
    } catch (error) {
      alert('Error: ' + error);
    }
  };

  const startEdit = (user: UserItem) => {
    setEditingUser(user);
    setEditUser({ 
      username: user.username, 
      password: '', 
      role: user.role 
    });
  };

  if (status === 'loading' || loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!session || userRole !== 'admin') {
    return <div className="flex items-center justify-center min-h-screen">Access Denied</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2 text-blue-600 hover:text-blue-700">
                <ArrowLeft className="w-4 h-4" />
                <Home className="w-4 h-4" />
                <span>Back to Home</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {(session.user as any)?.username || session.user?.email} (Admin)
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">User Management</h1>
          </div>

          {/* Create New User */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Create New User
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    placeholder="Username"
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    required
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    required
                  />
                  <select
                    className="px-3 py-2 border rounded-md"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'member' })}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <Button type="submit" disabled={creating}>
                  {creating ? 'Creating...' : 'Create User'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Users List */}
          <Card>
            <CardHeader>
              <CardTitle>Existing Users ({users.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <p className="text-muted-foreground">No users found.</p>
              ) : (
                <div className="space-y-2">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {user.role === 'admin' ? (
                          <Shield className="h-4 w-4 text-red-500" />
                        ) : (
                          <User className="h-4 w-4 text-blue-500" />
                        )}
                        <div>
                          <p className="font-medium">{user.username}</p>
                          <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          Created: {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id, user.username)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit User Dialog */}
          <Dialog open={editingUser !== null} onOpenChange={(open) => !open && setEditingUser(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit User: {editingUser?.username}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEditUser} className="space-y-4">
                <Input
                  placeholder="Username"
                  value={editUser.username}
                  onChange={(e) => setEditUser({ ...editUser, username: e.target.value })}
                  required
                />
                <Input
                  type="password"
                  placeholder="New Password (leave empty to keep current)"
                  value={editUser.password}
                  onChange={(e) => setEditUser({ ...editUser, password: e.target.value })}
                />
                <select
                  className="w-full px-3 py-2 border rounded-md"
                  value={editUser.role}
                  onChange={(e) => setEditUser({ ...editUser, role: e.target.value as 'admin' | 'member' })}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <div className="flex justify-end space-x-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setEditingUser(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    Save Changes
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}