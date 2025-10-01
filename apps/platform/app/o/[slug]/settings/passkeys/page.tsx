'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@governs-ai/ui';
import { Input } from '@governs-ai/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@governs-ai/ui';
import { startRegistration } from '@simplewebauthn/browser';
import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/browser';

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

  const params = useParams();
  const router = useRouter();
  const orgSlug = params.slug as string;

  useEffect(() => {
    fetchPasskeys();
  }, []);

  const fetchPasskeys = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/passkeys');

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
    setIsRegistering(true);

    try {
      // Step 1: Get registration challenge from server
      const challengeResponse = await fetch('/api/passkeys/challenge');

      if (!challengeResponse.ok) {
        const errorData = await challengeResponse.json();
        throw new Error(errorData.error || 'Failed to get registration challenge');
      }

      const { options } = await challengeResponse.json();

      // Step 2: Start WebAuthn registration
      const credential = await startRegistration(options as PublicKeyCredentialCreationOptionsJSON);

      // Step 3: Send credential to server for verification
      const registerResponse = await fetch('/api/passkeys/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential,
          deviceName: deviceName.trim() || undefined,
        }),
      });

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json();
        throw new Error(errorData.error || 'Failed to register passkey');
      }

      const result = await registerResponse.json();
      setSuccess(`Passkey "${result.deviceName}" registered successfully!`);
      setDeviceName('');

      // Refresh the list
      await fetchPasskeys();

    } catch (err) {
      console.error('Error registering passkey:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to register passkey. Please try again.');
      }
    } finally {
      setIsRegistering(false);
    }
  };

  const handleRenamePasskey = async (passkeyId: string) => {
    if (!editingName.trim()) {
      setError('Device name cannot be empty');
      return;
    }

    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/passkeys/${passkeyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deviceName: editingName.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to rename passkey');
      }

      setSuccess('Passkey renamed successfully!');
      setEditingId(null);
      setEditingName('');

      // Refresh the list
      await fetchPasskeys();

    } catch (err) {
      console.error('Error renaming passkey:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to rename passkey');
      }
    }
  };

  const handleDeletePasskey = async (passkeyId: string, deviceName: string) => {
    if (!confirm(`Are you sure you want to delete "${deviceName}"?`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/passkeys/${passkeyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete passkey');
      }

      setSuccess('Passkey deleted successfully!');

      // Refresh the list
      await fetchPasskeys();

    } catch (err) {
      console.error('Error deleting passkey:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to delete passkey');
      }
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Passkey Settings
              </h1>
              <span className="ml-4 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {orgSlug}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Passkey Authentication</CardTitle>
            <p className="text-gray-600">
              Manage your passkeys for secure, passwordless authentication and confirmation of sensitive actions.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
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

            {/* Add New Passkey Section */}
            <div className="border-b pb-6">
              <h3 className="text-lg font-medium mb-4">Register New Passkey</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="deviceName" className="block text-sm font-medium text-gray-700 mb-1">
                    Device Name (optional)
                  </label>
                  <Input
                    id="deviceName"
                    type="text"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    placeholder="e.g., My iPhone, Work Laptop"
                    className="max-w-md"
                    disabled={isRegistering}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    If not provided, we'll auto-detect the device name
                  </p>
                </div>

                <Button onClick={handleAddPasskey} disabled={isRegistering || loading}>
                  {isRegistering ? 'Registering...' : 'Add Passkey'}
                </Button>
              </div>
            </div>

            {/* Existing Passkeys List */}
            <div>
              <h3 className="text-lg font-medium mb-4">Your Passkeys</h3>
              {loading ? (
                <div className="text-center py-8 text-gray-500">
                  Loading passkeys...
                </div>
              ) : passkeys.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No passkeys registered yet. Add your first passkey above.
                </div>
              ) : (
                <div className="space-y-4">
                  {passkeys.map((passkey) => (
                    <div
                      key={passkey.id}
                      className="border rounded-lg p-4 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {editingId === passkey.id ? (
                            <div className="flex items-center space-x-2">
                              <Input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="max-w-xs"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                onClick={() => handleRenamePasskey(passkey.id)}
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
                            </div>
                          ) : (
                            <h4 className="font-medium text-gray-900">
                              {passkey.deviceName}
                            </h4>
                          )}
                          <div className="mt-2 text-sm text-gray-600 space-y-1">
                            <p>
                              <span className="font-medium">Created:</span>{' '}
                              {formatDate(passkey.createdAt)}
                            </p>
                            <p>
                              <span className="font-medium">Last used:</span>{' '}
                              {formatDate(passkey.lastUsedAt)}
                            </p>
                            {passkey.transports.length > 0 && (
                              <p>
                                <span className="font-medium">Transports:</span>{' '}
                                {passkey.transports.join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                        {editingId !== passkey.id && (
                          <div className="flex space-x-2 ml-4">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingId(passkey.id);
                                setEditingName(passkey.deviceName);
                              }}
                            >
                              Rename
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                handleDeletePasskey(passkey.id, passkey.deviceName)
                              }
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">What are passkeys?</h4>
              <p className="text-sm text-blue-800">
                Passkeys provide secure, passwordless authentication using your device's biometric sensors
                (Face ID, Touch ID, Windows Hello) or security keys. They're more secure than passwords
                and can be used to confirm sensitive actions in your applications.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
