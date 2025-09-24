"use client";

import { useState, useEffect } from 'react';

interface APIKey {
  id: string;
  label: string;
  scopes: string[];
  issuedAt: string;
  lastUsed: string | null;
  isActive: boolean;
  keyValue?: string;
}

export default function KeysClient() {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKey, setNewKey] = useState({
    label: '',
    scopes: [] as string[],
  });
  const [createdKey, setCreatedKey] = useState<APIKey | null>(null);

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/keys?orgId=default-org');
      const data = await response.json();
      setKeys(data);
    } catch (error) {
      console.error('Error fetching API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleCreateKey = async () => {
    try {
      const response = await fetch('/api/v1/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newKey.label,
          scopes: newKey.scopes,
          orgId: 'default-org',
        }),
      });

      if (response.ok) {
        const created = await response.json();
        setCreatedKey(created);
        setNewKey({ label: '', scopes: [] });
        setShowCreateForm(false);
        fetchKeys();
      }
    } catch (error) {
      console.error('Error creating API key:', error);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;

    try {
      const response = await fetch(`/api/v1/keys/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchKeys();
      }
    } catch (error) {
      console.error('Error deleting API key:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatLastUsed = (lastUsed: string | null) => {
    if (!lastUsed) return 'Never';
    return new Date(lastUsed).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading API keys...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API Keys</h1>
          <p className="text-gray-600">
            Manage your API keys for accessing GovernsAI services
          </p>
        </div>
        <button 
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Create Key
        </button>
      </div>

      {/* Create Key Form */}
      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Create New API Key</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Label
              </label>
              <input
                type="text"
                placeholder="e.g., Production API Key"
                value={newKey.label}
                onChange={(e) => setNewKey({ ...newKey, label: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scopes
              </label>
              <div className="space-y-2">
                {['precheck:invoke', 'ingest:write', 'policy:publish'].map((scope) => (
                  <label key={scope} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newKey.scopes.includes(scope)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewKey({ ...newKey, scopes: [...newKey.scopes, scope] });
                        } else {
                          setNewKey({ ...newKey, scopes: newKey.scopes.filter(s => s !== scope) });
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm">{scope}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button 
                onClick={handleCreateKey}
                disabled={!newKey.label || newKey.scopes.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                Create Key
              </button>
              <button 
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Created Key Display */}
      {createdKey && (
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-yellow-800 mb-4">API Key Created</h3>
          <div className="bg-white p-4 rounded border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Key Value</span>
              <button 
                onClick={() => navigator.clipboard.writeText(createdKey.keyValue || '')}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Copy
              </button>
            </div>
            <p className="font-mono text-sm bg-gray-100 p-2 rounded break-all">
              {createdKey.keyValue}
            </p>
          </div>
          <p className="text-sm text-yellow-700 mt-2">
            ⚠️ This is the only time you'll see the full key value. Make sure to copy it now.
          </p>
          <button 
            onClick={() => setCreatedKey(null)}
            className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            I've Saved the Key
          </button>
        </div>
      )}

      {/* Keys Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Your API Keys</h2>
        </div>
        
        {keys.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No API keys found. Create your first key to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Label
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scopes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Issued
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Used
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {keys.map((key) => (
                  <tr key={key.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {key.label}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {key.scopes.map((scope) => (
                          <span key={scope} className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                            {scope}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(key.issuedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatLastUsed(key.lastUsed)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        key.isActive 
                          ? 'text-green-800 bg-green-100' 
                          : 'text-gray-800 bg-gray-100'
                      }`}>
                        {key.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => handleDeleteKey(key.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}