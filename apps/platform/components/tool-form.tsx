'use client';

import React, { useState } from 'react';
import { Button, Card, CardContent } from '@governs-ai/ui';
import { Save } from 'lucide-react';

interface ToolFormData {
  id?: string;
  toolName: string;
  displayName: string;
  description: string;
  category: string;
  riskLevel: string;
  scope: string;
  direction: string;
  requiresApproval: boolean;
  isActive: boolean;
  metadata: Record<string, unknown>;
}

interface ToolFormProps {
  tool?: ToolFormData;
  onSave: (data: ToolFormData) => Promise<void>;
  onCancel: () => void;
}

const CATEGORY_OPTIONS = [
  'communication',
  'data',
  'computation',
  'file',
  'web',
  'payment',
  'calendar',
  'storage',
  'other',
];

const RISK_LEVELS = ['low', 'medium', 'high', 'critical'];
const SCOPE_OPTIONS = ['net.external', 'net.internal', 'local', 'net.'];
const DIRECTION_OPTIONS = ['ingress', 'egress', 'both'];

export function ToolForm({ tool, onSave, onCancel }: ToolFormProps) {
  const [formData, setFormData] = useState<ToolFormData>(
    tool || {
      toolName: '',
      displayName: '',
      description: '',
      category: 'other',
      riskLevel: 'medium',
      scope: 'net.external',
      direction: 'both',
      requiresApproval: false,
      isActive: true,
      metadata: {},
    }
  );

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

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">
            {tool ? 'Edit Tool Configuration' : 'Add New Tool'}
          </h3>

          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Tool Name * (e.g., weather.current)
              </label>
              <input
                type="text"
                value={formData.toolName}
                onChange={(e) => setFormData(prev => ({ ...prev, toolName: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                required
                placeholder="tool.action"
                disabled={!!tool}
              />
              {tool && (
                <p className="text-xs text-muted-foreground mt-1">Tool name cannot be changed</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Human readable name"
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
              placeholder="Describe what this tool does"
            />
          </div>

          {/* Classification */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                {CATEGORY_OPTIONS.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Risk Level *
              </label>
              <select
                value={formData.riskLevel}
                onChange={(e) => setFormData(prev => ({ ...prev, riskLevel: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                {RISK_LEVELS.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Network Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Scope *
              </label>
              <select
                value={formData.scope}
                onChange={(e) => setFormData(prev => ({ ...prev, scope: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                {SCOPE_OPTIONS.map(scope => (
                  <option key={scope} value={scope}>{scope}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Where the tool operates (external network, internal, local)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Direction *
              </label>
              <select
                value={formData.direction}
                onChange={(e) => setFormData(prev => ({ ...prev, direction: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                {DIRECTION_OPTIONS.map(dir => (
                  <option key={dir} value={dir}>{dir}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Data flow direction (ingress: incoming, egress: outgoing)
              </p>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.requiresApproval}
                onChange={(e) => setFormData(prev => ({ ...prev, requiresApproval: e.target.checked }))}
                className="w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-primary"
              />
              <span className="text-sm font-medium">Requires Approval</span>
            </label>
            <p className="text-xs text-muted-foreground ml-6">
              If checked, tool usage will require explicit approval
            </p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-primary"
              />
              <span className="text-sm font-medium">Active</span>
            </label>
            <p className="text-xs text-muted-foreground ml-6">
              Inactive tools will not be available for governance
            </p>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : tool ? 'Update Tool' : 'Add Tool'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
