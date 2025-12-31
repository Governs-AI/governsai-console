'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Button,
  Input,
  Badge,
  PageHeader
} from '@governs-ai/ui';
import {
  Users,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Mail,
  Shield,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  UserPlus,
  UserMinus
} from 'lucide-react';
import PlatformShell from '@/components/platform-shell';
import { useUser } from '@/lib/user-context';
import { RoleGuard } from '@/components/role-guard';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: 'active' | 'pending' | 'inactive';
  mfaEnabled: boolean;
  passkeysCount: number;
  totalSpend: number;
  lastActivity: string | null;
  joinedAt: string;
}

interface InviteUserData {
  email: string;
  name: string;
  role: string;
}

const ROLE_OPTIONS = [
  { value: 'OWNER', label: 'Owner' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'DEVELOPER', label: 'Developer' },
  { value: 'VIEWER', label: 'Viewer' },
];

export default function AdminUsersPage() {
  const params = useParams();
  const orgSlug = params.slug as string;
  const { orgId } = useUser();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState('VIEWER');
  const [savingEdit, setSavingEdit] = useState(false);
  const [inviteData, setInviteData] = useState<InviteUserData>({
    email: '',
    name: '',
    role: 'VIEWER'
  });
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (orgId) {
      fetchUsers();
    }
  }, [orgId]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showUserMenu) {
        setShowUserMenu(null);
      }
    };

    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showUserMenu]);

  const fetchUsers = async () => {
    if (!orgId) {
      console.log('No orgId available, cannot fetch users');
      return;
    }
    
    console.log('Fetching users for orgId:', orgId);
    
    try {
      setLoading(true);
      const response = await fetch(`/api/v1/orgs/${orgId}/users`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteData.email || !inviteData.name) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setInviting(true);
      setError('');
      setSuccess('');

      const response = await fetch(`/api/v1/orgs/${orgId}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(inviteData),
      });

      if (response.ok) {
        setSuccess('User invitation sent successfully!');
        setShowInviteModal(false);
        setInviteData({ email: '', name: '', role: 'member' });
        await fetchUsers();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send invitation');
      }
    } catch (err) {
      console.error('Error inviting user:', err);
      setError(err instanceof Error ? err.message : 'Failed to invite user');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user from the organization?')) {
      return;
    }

    try {
      setError('');
      setSuccess('');

      const response = await fetch(`/api/v1/orgs/${orgId}/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        setSuccess('User removed successfully!');
        await fetchUsers();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove user');
      }
    } catch (err) {
      console.error('Error removing user:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove user');
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      setError('');
      setSuccess('');

      const response = await fetch(`/api/v1/orgs/${orgId}/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        setSuccess('User role updated successfully!');
        await fetchUsers();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user role');
      }
    } catch (err) {
      console.error('Error updating user role:', err);
      setError(err instanceof Error ? err.message : 'Failed to update user role');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Inactive</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'OWNER':
        return <Badge variant="default" className="bg-purple-100 text-purple-800">Owner</Badge>;
      case 'ADMIN':
        return <Badge variant="default" className="bg-red-100 text-red-800">Admin</Badge>;
      case 'DEVELOPER':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Developer</Badge>;
      case 'VIEWER':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Viewer</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  if (loading) {
    return (
      <PlatformShell orgSlug={orgSlug}>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PlatformShell>
    );
  }

  return (
    <PlatformShell orgSlug={orgSlug}>
      <RoleGuard requiredPermission="canManageUsers">
        <div className="space-y-6">
        <PageHeader
          title="User Management"
          subtitle="Manage organization members, roles, and permissions"
          actions={
            <Button onClick={() => setShowInviteModal(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite User
            </Button>
          }
        />

        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-green-700">{success}</span>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Roles</option>
                  <option value="OWNER">Owner</option>
                  <option value="ADMIN">Admin</option>
                  <option value="DEVELOPER">Developer</option>
                  <option value="VIEWER">Viewer</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Organization Members ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No users found matching your criteria.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Users className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{user.name || 'No name'}</p>
                          {getStatusBadge(user.status || 'inactive')}
                          {getRoleBadge(user.role || 'viewer')}
                        </div>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-xs text-muted-foreground">
                            Joined {user?.joinedAt ? new Date(user.joinedAt).toLocaleDateString() : 'Unknown'}
                          </span>
                          {user.lastActivity && (
                            <span className="text-xs text-muted-foreground">
                              Last active {new Date(user.lastActivity).toLocaleDateString()}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            ${(user?.totalSpend || 0).toFixed(2)} usage
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {user.mfaEnabled && (
                          <Shield className="h-4 w-4 text-green-500" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {user.passkeysCount} passkeys
                        </span>
                      </div>
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowUserMenu(showUserMenu === user.id ? null : user.id)}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                        
                        {showUserMenu === user.id && (
                          <div 
                            className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-md shadow-lg z-50"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  setShowUserMenu(null);
                                  setEditingUser(user);
                                  setEditRole(user.role || 'VIEWER');
                                }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                              >
                                <Edit className="h-4 w-4" />
                                Edit User
                              </button>
                              <button
                                onClick={() => {
                                  setShowUserMenu(null);
                                  const nextRole = user.role === 'ADMIN' ? 'VIEWER' : 'ADMIN';
                                  handleUpdateUserRole(user.id, nextRole);
                                }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                              >
                                {user.role === 'ADMIN' ? <UserMinus className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                                {user.role === 'ADMIN' ? 'Remove Admin' : 'Make Admin'}
                              </button>
                              <button
                                onClick={() => {
                                  setShowUserMenu(null);
                                  handleRemoveUser(user.id);
                                }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                                Remove User
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invite User Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Invite User</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInviteModal(false)}
                >
                  ×
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    value={inviteData.email}
                    onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Full Name
                  </label>
                  <Input
                    value={inviteData.name}
                    onChange={(e) => setInviteData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Role
                  </label>
                  <select
                    value={inviteData.role}
                    onChange={(e) => setInviteData(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="VIEWER">Viewer</option>
                    <option value="DEVELOPER">Developer</option>
                    <option value="ADMIN">Admin</option>
                    <option value="OWNER">Owner</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleInviteUser}
                  disabled={inviting}
                  className="flex-1"
                >
                  {inviting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Invitation
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowInviteModal(false)}
                  disabled={inviting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Edit User</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingUser(null)}
                >
                  ×
                </Button>
              </div>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{editingUser.name || 'No name'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{editingUser.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Role
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={async () => {
                    if (!editingUser) return;
                    setSavingEdit(true);
                    await handleUpdateUserRole(editingUser.id, editRole);
                    setSavingEdit(false);
                    setEditingUser(null);
                  }}
                  disabled={savingEdit}
                  className="flex-1"
                >
                  {savingEdit ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditingUser(null)}
                  disabled={savingEdit}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      </RoleGuard>
    </PlatformShell>
  );
}
