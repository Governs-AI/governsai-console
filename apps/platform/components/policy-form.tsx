'use client';

import React, { useState } from 'react';
import { Button, Card, CardContent, Badge } from '@governs-ai/ui';
import { X, Plus, Trash2, Save } from 'lucide-react';

interface PolicyFormData {
  id?: string;
  name: string;
  description: string;
  version: string;
  defaults: {
    ingress: { action: string };
    egress: { action: string };
  };
  toolAccess: Record<string, {
    direction: string;
    action: string;
    allow_pii: Record<string, string>;
  }>;
  denyTools: string[];
  allowTools: string[];
  networkScopes: string[];
  networkTools: string[];
  onError: string;
  priority: number;
  isActive: boolean;
}

interface ToolConfig {
  id: string;
  toolName: string;
  category: string;
  riskLevel: string;
}

interface PolicyFormProps {
  policy?: PolicyFormData;
  availableTools: ToolConfig[];
  onSave: (data: PolicyFormData) => Promise<void>;
  onCancel: () => void;
}

const ACTION_OPTIONS = ['allow', 'block', 'redact', 'confirm'];
const DIRECTION_OPTIONS = ['ingress', 'egress', 'both'];

export function PolicyForm({ policy, availableTools, onSave, onCancel }: PolicyFormProps) {
  const [formData, setFormData] = useState<PolicyFormData>(
    policy || {
      name: '',
      description: '',
      version: 'v1',
      defaults: {
        ingress: { action: 'redact' },
        egress: { action: 'redact' },
      },
      toolAccess: {},
      denyTools: [],
      allowTools: [],
      networkScopes: ['net.'],
      networkTools: ['web.', 'email.', 'calendar.'],
      onError: 'block',
      priority: 0,
      isActive: true,
    }
  );

  const [newDenyTool, setNewDenyTool] = useState('');
  const [newAllowTool, setNewAllowTool] = useState('');
  const [newNetworkScope, setNewNetworkScope] = useState('');
  const [newNetworkTool, setNewNetworkTool] = useState('');
  const [selectedToolForAccess, setSelectedToolForAccess] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  const addToolAccess = () => {
    if (!selectedToolForAccess) return;
    
    setFormData(prev => ({
      ...prev,
      toolAccess: {
        ...prev.toolAccess,
        [selectedToolForAccess]: {
          direction: 'both',
          action: 'allow',
          allow_pii: {},
        },
      },
    }));
    setSelectedToolForAccess('');
  };

  const removeToolAccess = (toolName: string) => {
    setFormData(prev => {
      const newToolAccess = { ...prev.toolAccess };
      delete newToolAccess[toolName];
      return { ...prev, toolAccess: newToolAccess };
    });
  };

  const updateToolAccess = (toolName: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      toolAccess: {
        ...prev.toolAccess,
        [toolName]: {
          ...prev.toolAccess[toolName],
          [field]: value,
        },
      },
    }));
  };

  const addArrayItem = (field: 'denyTools' | 'allowTools' | 'networkScopes' | 'networkTools', value: string) => {
    if (!value.trim()) return;
    
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], value.trim()],
    }));
    
    // Clear input
    if (field === 'denyTools') setNewDenyTool('');
    if (field === 'allowTools') setNewAllowTool('');
    if (field === 'networkScopes') setNewNetworkScope('');
    if (field === 'networkTools') setNewNetworkTool('');
  };

  const removeArrayItem = (field: 'denyTools' | 'allowTools' | 'networkScopes' | 'networkTools', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter(item => item !== value),
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Policy Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                  placeholder="e.g., Production Policy"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Version
                </label>
                <input
                  type="text"
                  value={formData.version}
                  onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., v1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
                placeholder="Describe the purpose and scope of this policy"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Priority
                </label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  On Error
                </label>
                <select
                  value={formData.onError}
                  onChange={(e) => setFormData(prev => ({ ...prev, onError: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="block">Block</option>
                  <option value="allow">Allow</option>
                  <option value="redact">Redact</option>
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-sm font-medium">Active</span>
                </label>
              </div>
            </div>
          </div>

          {/* Default Actions */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold">Default Actions</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Ingress Action
                </label>
                <select
                  value={formData.defaults.ingress.action}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    defaults: {
                      ...prev.defaults,
                      ingress: { action: e.target.value },
                    },
                  }))}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {ACTION_OPTIONS.map(action => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Egress Action
                </label>
                <select
                  value={formData.defaults.egress.action}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    defaults: {
                      ...prev.defaults,
                      egress: { action: e.target.value },
                    },
                  }))}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {ACTION_OPTIONS.map(action => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tool Access Rules */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold">Tool Access Rules</h3>
            
            <div className="flex gap-2">
              <select
                value={selectedToolForAccess}
                onChange={(e) => setSelectedToolForAccess(e.target.value)}
                className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select a tool...</option>
                {availableTools
                  .filter(tool => !formData.toolAccess[tool.toolName])
                  .map(tool => (
                    <option key={tool.id} value={tool.toolName}>
                      {tool.toolName} ({tool.category})
                    </option>
                  ))}
              </select>
              <Button type="button" onClick={addToolAccess} disabled={!selectedToolForAccess}>
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </Button>
            </div>

            <div className="space-y-2">
              {Object.entries(formData.toolAccess).map(([toolName, config]) => (
                <div key={toolName} className="p-3 border border-border rounded-md bg-muted/20">
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-mono text-sm font-medium">{toolName}</span>
                    <button
                      type="button"
                      onClick={() => removeToolAccess(toolName)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium mb-1">Direction</label>
                      <select
                        value={config.direction}
                        onChange={(e) => updateToolAccess(toolName, 'direction', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-border rounded bg-background text-foreground"
                      >
                        {DIRECTION_OPTIONS.map(dir => (
                          <option key={dir} value={dir}>{dir}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">Action</label>
                      <select
                        value={config.action}
                        onChange={(e) => updateToolAccess(toolName, 'action', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-border rounded bg-background text-foreground"
                      >
                        {ACTION_OPTIONS.map(action => (
                          <option key={action} value={action}>{action}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Denied Tools */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold">Denied Tools</h3>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={newDenyTool}
                onChange={(e) => setNewDenyTool(e.target.value)}
                placeholder="e.g., python.exec, bash.exec"
                className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addArrayItem('denyTools', newDenyTool);
                  }
                }}
              />
              <Button type="button" onClick={() => addArrayItem('denyTools', newDenyTool)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {formData.denyTools.map(tool => (
                <Badge key={tool} variant="destructive" className="flex items-center gap-1">
                  {tool}
                  <button
                    type="button"
                    onClick={() => removeArrayItem('denyTools', tool)}
                    className="ml-1 hover:text-red-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Allowed Tools */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold">Explicitly Allowed Tools (Optional)</h3>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={newAllowTool}
                onChange={(e) => setNewAllowTool(e.target.value)}
                placeholder="e.g., weather.current"
                className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addArrayItem('allowTools', newAllowTool);
                  }
                }}
              />
              <Button type="button" onClick={() => addArrayItem('allowTools', newAllowTool)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {formData.allowTools.map(tool => (
                <Badge key={tool} variant="default" className="flex items-center gap-1">
                  {tool}
                  <button
                    type="button"
                    onClick={() => removeArrayItem('allowTools', tool)}
                    className="ml-1 hover:text-blue-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Network Configuration */}
          <div className="space-y-4 border-t pt-4">
            <h3 className="text-lg font-semibold">Network Configuration</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium">Network Scopes</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newNetworkScope}
                    onChange={(e) => setNewNetworkScope(e.target.value)}
                    placeholder="e.g., net."
                    className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addArrayItem('networkScopes', newNetworkScope);
                      }
                    }}
                  />
                  <Button type="button" size="sm" onClick={() => addArrayItem('networkScopes', newNetworkScope)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {formData.networkScopes.map(scope => (
                    <Badge key={scope} variant="outline" className="flex items-center gap-1 text-xs">
                      {scope}
                      <button
                        type="button"
                        onClick={() => removeArrayItem('networkScopes', scope)}
                        className="ml-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">Network Tools</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newNetworkTool}
                    onChange={(e) => setNewNetworkTool(e.target.value)}
                    placeholder="e.g., web."
                    className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addArrayItem('networkTools', newNetworkTool);
                      }
                    }}
                  />
                  <Button type="button" size="sm" onClick={() => addArrayItem('networkTools', newNetworkTool)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {formData.networkTools.map(tool => (
                    <Badge key={tool} variant="outline" className="flex items-center gap-1 text-xs">
                      {tool}
                      <button
                        type="button"
                        onClick={() => removeArrayItem('networkTools', tool)}
                        className="ml-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : policy ? 'Update Policy' : 'Create Policy'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
