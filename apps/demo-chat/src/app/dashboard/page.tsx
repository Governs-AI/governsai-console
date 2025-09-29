'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  userId: string;
  createdAt: string;
  lastUsed?: string;
  isActive: boolean;
}

export default function Dashboard() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [showNewKey, setShowNewKey] = useState(false);

  // Load API keys from localStorage on mount
  useEffect(() => {
    const savedKeys = localStorage.getItem('demo-api-keys');
    const savedUserId = localStorage.getItem('demo-user-id');
    
    if (savedKeys) {
      setApiKeys(JSON.parse(savedKeys));
    }
    if (savedUserId) {
      setCurrentUserId(savedUserId);
    }
  }, []);

  // Save API keys to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('demo-api-keys', JSON.stringify(apiKeys));
  }, [apiKeys]);

  // Save user ID to localStorage
  useEffect(() => {
    localStorage.setItem('demo-user-id', currentUserId);
  }, [currentUserId]);

  const generateApiKey = () => {
    return `GAI_LOCAL_DEV_${uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase()}`;
  };

  const createNewKey = () => {
    if (!newKeyName.trim()) return;

    const newKey: ApiKey = {
      id: uuidv4(),
      name: newKeyName.trim(),
      key: generateApiKey(),
      userId: currentUserId,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    setApiKeys(prev => [...prev, newKey]);
    setNewKeyName('');
    setShowNewKey(false);
  };

  const deleteKey = (keyId: string) => {
    setApiKeys(prev => prev.filter(key => key.id !== keyId));
  };

  const toggleKeyStatus = (keyId: string) => {
    setApiKeys(prev => prev.map(key => 
      key.id === keyId ? { ...key, isActive: !key.id } : key
    ));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getPrecheckUrl = (userId: string, apiKey: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_PRECHECK_URL || 'http://172.16.10.121:8080';
    return `${baseUrl}/v1/u/${userId}/precheck?api_key=${apiKey}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">API Keys Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Manage your precheck API keys and user configuration
          </p>
        </div>

        {/* User Configuration */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">User Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User ID
              </label>
              <input
                type="text"
                value={currentUserId}
                onChange={(e) => setCurrentUserId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter user ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Precheck Base URL
              </label>
              <input
                type="text"
                value={process.env.NEXT_PUBLIC_PRECHECK_URL || 'http://172.16.10.121:8080'}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
              />
            </div>
          </div>
        </div>

        {/* API Keys Section */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">API Keys</h2>
              <button
                onClick={() => setShowNewKey(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Create New Key
              </button>
            </div>
          </div>

          {/* New Key Form */}
          {showNewKey && (
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex gap-4">
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Key name (e.g., 'Development Key')"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={createNewKey}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowNewKey(false)}
                  className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Keys List */}
          <div className="divide-y divide-gray-200">
            {apiKeys.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                <p>No API keys created yet.</p>
                <p className="text-sm">Create your first key to get started.</p>
              </div>
            ) : (
              apiKeys.map((key) => (
                <div key={key.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-gray-900">{key.name}</h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          key.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {key.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div className="mt-2 space-y-2">
                        <div>
                          <label className="text-sm font-medium text-gray-700">API Key:</label>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                              {key.key}
                            </code>
                            <button
                              onClick={() => copyToClipboard(key.key)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Precheck URL:</label>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono text-xs break-all">
                              {getPrecheckUrl(key.userId, key.key)}
                            </code>
                            <button
                              onClick={() => copyToClipboard(getPrecheckUrl(key.userId, key.key))}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          Created: {new Date(key.createdAt).toLocaleString()}
                          {key.lastUsed && (
                            <span className="ml-4">
                              Last used: {new Date(key.lastUsed).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => toggleKeyStatus(key.id)}
                        className={`px-3 py-1 text-sm rounded ${
                          key.isActive
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {key.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => deleteKey(key.id)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Usage Instructions */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Usage Instructions</h3>
          <div className="text-sm text-blue-800 space-y-2">
            <p>1. <strong>Create a key:</strong> Click "Create New Key" and give it a descriptive name</p>
            <p>2. <strong>Copy the URL:</strong> Use the generated precheck URL in your applications</p>
            <p>3. <strong>Test the integration:</strong> Use the demo chat with your user ID and API key</p>
            <p>4. <strong>Manage keys:</strong> Deactivate or delete keys as needed for security</p>
          </div>
        </div>
      </div>
    </div>
  );
}
