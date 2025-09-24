"use client";

import { useState, useEffect } from 'react';

interface Policy {
  id: string;
  name: string;
  description: string;
  toolAccessMatrix: Record<string, Record<string, string>>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const AVAILABLE_TOOLS = [
  'web.fetch',
  'web.search',
  'code.execute',
  'file.read',
  'file.write',
  'db.query',
  'ai.generate',
  'ai.analyze'
];

const AVAILABLE_PII_CLASSES = [
  'email',
  'phone',
  'ssn',
  'credit_card',
  'address',
  'name',
  'date_of_birth'
];

const TRANSFORM_OPTIONS = [
  { value: 'pass_through', label: 'Pass Through' },
  { value: 'tokenize', label: 'Tokenize' },
  { value: 'mask', label: 'Mask' },
  { value: 'remove', label: 'Remove' }
];

export default function PoliciesClient() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPolicy, setNewPolicy] = useState({
    name: '',
    description: '',
    toolAccessMatrix: {} as Record<string, Record<string, string>>,
  });

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/policies?orgId=default-org');
      const data = await response.json();
      setPolicies(data);
    } catch (error) {
      console.error('Error fetching policies:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleCreatePolicy = async () => {
    try {
      const response = await fetch('/api/v1/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPolicy.name,
          description: newPolicy.description,
          toolAccessMatrix: newPolicy.toolAccessMatrix,
          orgId: 'default-org',
        }),
      });

      if (response.ok) {
        setNewPolicy({ name: '', description: '', toolAccessMatrix: {} });
        setShowCreateForm(false);
        fetchPolicies();
      }
    } catch (error) {
      console.error('Error creating policy:', error);
    }
  };

  const handleDeletePolicy = async (id: string) => {
    if (!confirm('Are you sure you want to delete this policy?')) return;

    try {
      const response = await fetch(`/api/v1/policies/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchPolicies();
      }
    } catch (error) {
      console.error('Error deleting policy:', error);
    }
  };

  const updateToolAccess = (tool: string, piiClass: string, transform: string) => {
    const updatedMatrix = { ...newPolicy.toolAccessMatrix };
    if (!updatedMatrix[tool]) {
      updatedMatrix[tool] = {};
    }
    updatedMatrix[tool][piiClass] = transform;
    setNewPolicy({ ...newPolicy, toolAccessMatrix: updatedMatrix });
  };

  const getTransformValue = (tool: string, piiClass: string) => {
    return newPolicy.toolAccessMatrix[tool]?.[piiClass] || 'pass_through';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading policies...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Policies</h1>
          <p className="text-gray-600">
            Manage your AI governance policies and tool access controls
          </p>
        </div>
        <button 
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Create Policy
        </button>
      </div>

      {/* Create Policy Form */}
      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Create New Policy</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                placeholder="e.g., Production Data Policy"
                value={newPolicy.name}
                onChange={(e) => setNewPolicy({ ...newPolicy, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                placeholder="Describe the policy's purpose and scope"
                value={newPolicy.description}
                onChange={(e) => setNewPolicy({ ...newPolicy, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tool Access Matrix
              </label>
              <div className="space-y-4 max-h-96 overflow-y-auto border border-gray-200 rounded p-4">
                {AVAILABLE_TOOLS.map((tool) => (
                  <div key={tool} className="space-y-2">
                    <h4 className="font-medium text-gray-800">{tool}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {AVAILABLE_PII_CLASSES.map((piiClass) => (
                        <div key={piiClass} className="space-y-1">
                          <label className="text-xs text-gray-600">{piiClass}</label>
                          <select
                            className="w-full p-2 border border-gray-300 rounded text-sm"
                            value={getTransformValue(tool, piiClass)}
                            onChange={(e) => updateToolAccess(tool, piiClass, e.target.value)}
                          >
                            {TRANSFORM_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button 
                onClick={handleCreatePolicy}
                disabled={!newPolicy.name || !newPolicy.description}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
              >
                Create Policy
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

      {/* Policies Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Your Policies</h2>
        </div>
        
        {policies.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No policies found. Create your first policy to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
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
                {policies.map((policy) => (
                  <tr key={policy.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {policy.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {policy.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(policy.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        policy.isActive 
                          ? 'text-green-800 bg-green-100' 
                          : 'text-gray-800 bg-gray-100'
                      }`}>
                        {policy.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => handleDeletePolicy(policy.id)}
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