'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@governs-ai/ui';
import { Input } from '@governs-ai/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@governs-ai/ui';
import { Badge } from '@governs-ai/ui';

interface Member {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  emailVerified: string | null;
  role: string;
  createdAt: string;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('VIEWER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const params = useParams();
  const orgSlug = params.slug as string;

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      // This would be an API call to get members
      // For now, we'll simulate it
      setMembers([
        {
          id: '1',
          userId: 'user-1',
          email: 'admin@example.com',
          name: 'Admin User',
          emailVerified: new Date().toISOString(),
          role: 'OWNER',
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          userId: 'user-2',
          email: 'developer@example.com',
          name: 'Developer User',
          emailVerified: new Date().toISOString(),
          role: 'DEVELOPER',
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.error('Failed to load members:', err);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/orgs/${orgSlug}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send invitation');
        return;
      }

      setSuccess('Invitation sent successfully!');
      setInviteEmail('');
      setInviteRole('VIEWER');
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-red-100 text-red-800';
      case 'ADMIN':
        return 'bg-orange-100 text-orange-800';
      case 'DEVELOPER':
        return 'bg-blue-100 text-blue-800';
      case 'VIEWER':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Team Members
              </h1>
              <span className="ml-4 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {orgSlug}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Invite New Member */}
          <Card>
            <CardHeader>
              <CardTitle>Invite New Member</CardTitle>
              <p className="text-gray-600">
                Send an invitation to join your organization
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="inviteEmail" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address
                    </label>
                    <Input
                      id="inviteEmail"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                      disabled={loading}
                      placeholder="Enter email address"
                    />
                  </div>
                  <div>
                    <label htmlFor="inviteRole" className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <select
                      id="inviteRole"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      disabled={loading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="VIEWER">Viewer</option>
                      <option value="DEVELOPER">Developer</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                </div>

                {error && (
                  <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="text-green-600 text-sm bg-green-50 p-3 rounded-md">
                    {success}
                  </div>
                )}

                <Button type="submit" disabled={loading}>
                  {loading ? 'Sending invitation...' : 'Send Invitation'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Members List */}
          <Card>
            <CardHeader>
              <CardTitle>Current Members</CardTitle>
              <p className="text-gray-600">
                Manage your organization's team members
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {member.name?.charAt(0) || member.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-medium text-gray-900">
                            {member.name || member.email}
                          </h3>
                          {!member.emailVerified && (
                            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                              Unverified
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{member.email}</p>
                        <p className="text-xs text-gray-500">
                          Joined {new Date(member.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getRoleBadgeColor(member.role)}>
                        {member.role}
                      </Badge>
                      {member.role !== 'OWNER' && (
                        <Button variant="outline" size="sm">
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
