'use client';

import { useState, useEffect, useCallback, ChangeEvent } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  LoadingSpinner,
  PageHeader,
  Input
} from '@governs-ai/ui';
import {
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Settings as SettingsIcon,
  AlertTriangle,
  CheckCircle,
  Power,
  PowerOff
} from 'lucide-react';
import { ToolForm } from './tool-form';

interface ToolConfig {
  id: string;
  toolName: string;
  displayName?: string;
  description?: string;
  category: string;
  riskLevel: string;
  scope: string;
  direction: string;
  requiresApproval: boolean;
  isActive: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface ToolsClientProps {
  orgSlug: string;
}

type ToolFormPayload = Partial<ToolConfig>;

export function ToolsClient({ orgSlug }: ToolsClientProps) {
  const [tools, setTools] = useState<ToolConfig[]>([]);
  const [filteredTools, setFilteredTools] = useState<ToolConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [riskLevelFilter, setRiskLevelFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTool, setEditingTool] = useState<ToolConfig | null>(null);

  const fetchTools = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/v1/tools');
      const data = await response.json();
      setTools(data.tools || []);
    } catch {
      setError('Failed to fetch tools');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch tools
  useEffect(() => {
    fetchTools();
  }, [fetchTools, orgSlug]);

  // Filter tools
  useEffect(() => {
    let filtered = tools;

    if (searchTerm) {
      filtered = filtered.filter(tool =>
        tool.toolName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tool.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tool.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(tool => tool.category === categoryFilter);
    }

    if (riskLevelFilter !== 'all') {
      filtered = filtered.filter(tool => tool.riskLevel === riskLevelFilter);
    }

    setFilteredTools(filtered);
  }, [tools, searchTerm, categoryFilter, riskLevelFilter]);

  const handleSaveTool = async (toolData: ToolFormPayload) => {
    try {
      let response;
      if (editingTool) {
        // Update existing tool
        response = await fetch(`/api/tools/${editingTool.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(toolData),
        });
      } else {
        // Create new tool
        response = await fetch('/api/v1/tools', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(toolData),
        });
      }

      if (response.ok) {
        await fetchTools();
        setIsCreating(false);
        setEditingTool(null);
        setSuccess(editingTool ? 'Tool updated successfully' : 'Tool created successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save tool');
        setTimeout(() => setError(null), 5000);
      }
    } catch {
      setError('Failed to save tool');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleEditTool = (tool: ToolConfig) => {
    setEditingTool(tool);
    setIsCreating(false);
  };

  const toggleToolStatus = async (toolId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/tools/${toolId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        await fetchTools();
        setSuccess(`Tool ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to update tool status');
        setTimeout(() => setError(null), 5000);
      }
    } catch {
      setError('Failed to update tool status');
      setTimeout(() => setError(null), 5000);
    }
  };

  const deleteTool = async (toolId: string) => {
    if (!confirm('Are you sure you want to delete this tool? This may affect policies that reference it.')) return;

    try {
      const response = await fetch(`/api/tools/${toolId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchTools();
        setSuccess('Tool deleted successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to delete tool');
        setTimeout(() => setError(null), 5000);
      }
    } catch {
      setError('Failed to delete tool');
      setTimeout(() => setError(null), 5000);
    }
  };

  const getCategories = () => {
    const categories = Array.from(new Set(tools.map(tool => tool.category)));
    return categories.sort();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const stats = {
    total: tools.length,
    active: tools.filter(t => t.isActive).length,
    inactive: tools.filter(t => !t.isActive).length,
    highRisk: tools.filter(t => t.riskLevel === 'high' || t.riskLevel === 'critical').length
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tool Configuration"
        subtitle={`Manage tool metadata and risk levels for ${orgSlug}`}
        actions={
          <div className="flex gap-2">
            <Button
              onClick={() => setIsCreating(true)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Tool
            </Button>
            <Button
              onClick={fetchTools}
              disabled={refreshing}
              variant="outline"
              size="sm"
            >
              {refreshing ? <LoadingSpinner size="sm" /> : <RefreshCw className="h-4 w-4" />}
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        }
      />

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <div className="mt-2 text-sm text-green-700">{success}</div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Total Tools</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <PowerOff className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Inactive</p>
                <p className="text-2xl font-bold text-orange-600">{stats.inactive}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm font-medium">High Risk</p>
                <p className="text-2xl font-bold text-red-600">{stats.highRisk}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tool Form (Create/Edit) */}
      {(isCreating || editingTool) && (
        <ToolForm
          tool={editingTool ? {
            ...editingTool,
            displayName: editingTool.displayName || '',
            description: editingTool.description || '',
          } : undefined}
          onSave={handleSaveTool}
          onCancel={() => {
            setIsCreating(false);
            setEditingTool(null);
          }}
        />
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <Input
                id="search"
                placeholder="Search tools..."
                value={searchTerm}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                id="category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {getCategories().map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="riskLevel" className="block text-sm font-medium text-gray-700 mb-1">
                Risk Level
              </label>
              <select
                id="riskLevel"
                value={riskLevelFilter}
                onChange={(e) => setRiskLevelFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Risk Levels</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTools.map((tool) => (
          <Card key={tool.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-lg font-mono">{tool.toolName}</CardTitle>
                  {tool.displayName && (
                    <CardDescription className="mt-1">{tool.displayName}</CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{tool.description}</p>
              
              <div className="flex flex-wrap gap-2">
                <Badge 
                  variant={
                    tool.riskLevel === 'critical' ? 'destructive' : 
                    tool.riskLevel === 'high' ? 'destructive' : 
                    'secondary'
                  }
                >
                  {tool.riskLevel}
                </Badge>
                <Badge variant="outline">{tool.category}</Badge>
                <Badge variant="outline">{tool.scope}</Badge>
                <Badge variant="outline">{tool.direction}</Badge>
                {tool.requiresApproval && (
                  <Badge variant="destructive">Requires Approval</Badge>
                )}
                {!tool.isActive && (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>

              <div className="text-xs text-muted-foreground">
                Updated: {new Date(tool.updatedAt).toLocaleDateString()}
              </div>

              {/* Tool Actions */}
              <div className="flex gap-1 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditTool(tool)}
                  title="Edit tool"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleToolStatus(tool.id, tool.isActive)}
                  title={tool.isActive ? 'Deactivate' : 'Activate'}
                >
                  {tool.isActive ? <PowerOff className="h-3 w-3" /> : <Power className="h-3 w-3" />}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteTool(tool.id)}
                  title="Delete tool"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTools.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">No tools found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || categoryFilter !== 'all' || riskLevelFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'No tools configured yet'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
