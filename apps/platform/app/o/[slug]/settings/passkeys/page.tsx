'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { 
  Button, 
  Input, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Badge,
  PageHeader
} from '@governs-ai/ui';
import {
  Key,
  Plus,
  Trash2,
  Edit,
  CheckCircle,
  AlertCircle,
  Shield,
  Smartphone,
  Laptop,
  Monitor
} from 'lucide-react';
// @ts-ignore - TypeScript has issues with this import in the workspace
import { startRegistration } from '@simplewebauthn/browser';
import PlatformShell from '@/components/platform-shell';

interface Passkey {
  id: string;
  deviceName: string;
  createdAt: string;
  lastUsedAt: string | null;
  transports: string[];
  aaguid: string | null;
}

export default function PasskeySettingsPage() {
  const [passkeys, setPasskeys] = useState<Passkey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const params = useParams();
  const orgSlug = params.slug as string;

  useEffect(() => {
    fetchPasskeys();
  }, []);

  const fetchPasskeys = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/passkeys', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch passkeys');
      }

      const data = await response.json();
      setPasskeys(data.passkeys || []);
    } catch (err) {
      console.error('Error fetching passkeys:', err);
      setError('Failed to load passkeys');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPasskey = async () => {
    setError('');
    setSuccess('');

    if (!deviceName.trim()) {
      setError('Please enter a device name');
      return;
    }

    try {
      setIsRegistering(true);

      // Get registration options from server
      const optionsResponse = await fetch('/api/passkeys/challenge', {
        method: 'GET',
        credentials: 'include',
      });

      if (!optionsResponse.ok) {
        const errorData = await optionsResponse.json();
        throw new Error(errorData.error || 'Failed to start registration');
      }

      const { options } = await optionsResponse.json();

      // Start WebAuthn registration
      const credential = await startRegistration(options);

      // Complete registration with server
      const completeResponse = await fetch('/api/passkeys/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          credential,
          deviceName: deviceName.trim(),
        }),
      });

      if (!completeResponse.ok) {
        const errorData = await completeResponse.json();
        throw new Error(errorData.error || 'Failed to complete registration');
      }

      setSuccess('Passkey registered successfully!');
      setDeviceName('');
      setShowAddForm(false);
      fetchPasskeys();
    } catch (err) {
      console.error('Error registering passkey:', err);
      setError(err instanceof Error ? err.message : 'Failed to register passkey');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleDeletePasskey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this passkey?')) {
      return;
    }

    try {
      const response = await fetch(`/api/passkeys/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete passkey');
      }

      setSuccess('Passkey deleted successfully!');
      fetchPasskeys();
    } catch (err) {
      console.error('Error deleting passkey:', err);
      setError('Failed to delete passkey');
    }
  };

  const handleEditName = async (id: string) => {
    if (!editingName.trim()) {
      setError('Please enter a device name');
      return;
    }

    try {
      const response = await fetch(`/api/passkeys/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          deviceName: editingName.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update passkey name');
      }

      setSuccess('Passkey name updated successfully!');
      setEditingId(null);
      setEditingName('');
      fetchPasskeys();
    } catch (err) {
      console.error('Error updating passkey:', err);
      setError('Failed to update passkey name');
    }
  };

  const getDeviceIcon = (deviceName: string) => {
    const name = deviceName.toLowerCase();
    if (name.includes('phone') || name.includes('mobile') || name.includes('iphone') || name.includes('android')) {
      return <Smartphone className="h-5 w-5 text-blue-500" />;
    } else if (name.includes('laptop') || name.includes('macbook') || name.includes('thinkpad')) {
      return <Laptop className="h-5 w-5 text-green-500" />;
    } else if (name.includes('desktop') || name.includes('monitor')) {
      return <Monitor className="h-5 w-5 text-purple-500" />;
    } else {
      return <Key className="h-5 w-5 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <PlatformShell orgSlug={orgSlug}>
      <div className="space-y-6">
        <PageHeader
          title="Passkey Settings"
          subtitle="Manage passwordless authentication with passkeys for enhanced security"
          actions={
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Passkey
            </Button>
          }
        />

        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-green-700">{success}</span>
          </div>
        )}

        {/* Add Passkey Form */}
        {showAddForm && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Register New Passkey
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="deviceName" className="block text-sm font-medium text-foreground mb-2">
                  Device Name
                </label>
                <Input
                  id="deviceName"
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="e.g., iPhone 15 Pro, MacBook Pro, YubiKey"
                  disabled={isRegistering}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Choose a descriptive name to identify this device
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleAddPasskey} 
                  disabled={isRegistering || !deviceName.trim()}
                >
                  {isRegistering ? 'Registering...' : 'Register Passkey'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowAddForm(false);
                    setDeviceName('');
                    setError('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Passkeys List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Registered Passkeys
            </CardTitle>
            <p className="text-muted-foreground">
              {passkeys.length === 0 
                ? 'No passkeys registered yet. Add your first passkey to enable passwordless authentication.'
                : `You have ${passkeys.length} passkey${passkeys.length === 1 ? '' : 's'} registered.`
              }
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : passkeys.length === 0 ? (
              <div className="text-center py-8">
                <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Passkeys Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Get started by registering your first passkey for secure, passwordless authentication.
                </p>
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Passkey
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {passkeys.map((passkey) => (
                  <div
                    key={passkey.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getDeviceIcon(passkey.deviceName)}
                      <div>
                        <div className="flex items-center gap-2">
                          {editingId === passkey.id ? (
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="h-8 w-48"
                              autoFocus
                            />
                          ) : (
                            <h3 className="font-medium text-foreground">
                              {passkey.deviceName}
                            </h3>
                          )}
                          <Badge variant="outline" className="text-xs">
                            Active
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Added {formatDate(passkey.createdAt)}
                        </p>
                        {passkey.lastUsedAt && (
                          <p className="text-xs text-muted-foreground">
                            Last used {formatDate(passkey.lastUsedAt)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {editingId === passkey.id ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleEditName(passkey.id)}
                            disabled={!editingName.trim()}
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingId(null);
                              setEditingName('');
                            }}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingId(passkey.id);
                              setEditingName(passkey.deviceName);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeletePasskey(passkey.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Section */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <h3 className="font-medium text-foreground mb-2">What are passkeys?</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Passkeys provide secure, passwordless authentication using your device's biometric sensors
                  (Face ID, Touch ID, Windows Hello) or security keys. They're more secure than passwords
                  and can be used to confirm sensitive actions in your applications.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>More secure than passwords</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Works across all your devices</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>No passwords to remember</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Resistant to phishing attacks</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PlatformShell>
  );
}