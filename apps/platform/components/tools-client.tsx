'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Shield,
  Power,
  PowerOff
} from 'lucide-react';
import { ToolForm } from './tool-form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [riskLevelFilter, setRiskLevelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [approvalFilter, setApprovalFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingTool, setEditingTool] = useState<ToolConfig | null>(null);
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);

  const fetchTools = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/v1/tools?includeInactive=true', {
        credentials: 'include',
      });
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

  const filteredTools = useMemo(() => {
    let filtered = [...tools];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(tool =>
        tool.toolName.toLowerCase().includes(term) ||
        tool.displayName?.toLowerCase().includes(term) ||
        tool.description?.toLowerCase().includes(term) ||
        tool.category.toLowerCase().includes(term)
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(tool => tool.category === categoryFilter);
    }

    if (riskLevelFilter !== 'all') {
      filtered = filtered.filter(tool => tool.riskLevel === riskLevelFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(tool =>
        statusFilter === 'active' ? tool.isActive : !tool.isActive
      );
    }

    if (approvalFilter === 'required') {
      filtered = filtered.filter(tool => tool.requiresApproval);
    } else if (approvalFilter === 'not-required') {
      filtered = filtered.filter(tool => !tool.requiresApproval);
    }

    const riskOrder: Record<string, number> = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    };

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'risk':
          return (riskOrder[b.riskLevel] || 0) - (riskOrder[a.riskLevel] || 0);
        case 'category':
          return a.category.localeCompare(b.category) || a.toolName.localeCompare(b.toolName);
        case 'name':
        default:
          return a.toolName.localeCompare(b.toolName);
      }
    });

    return filtered;
  }, [
    tools,
    searchTerm,
    categoryFilter,
    riskLevelFilter,
    statusFilter,
    approvalFilter,
    sortBy,
  ]);

  const handleSaveTool = async (toolData: ToolFormPayload) => {
    try {
      let response;
      if (editingTool) {
        // Update existing tool
        response = await fetch(`/api/v1/tools/${editingTool.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(toolData),
        });
      } else {
        // Create new tool
        response = await fetch('/api/v1/tools', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(toolData),
        });
      }

      if (response.ok) {
        const data = await response.json();
        await fetchTools();
        setIsCreating(false);
        setEditingTool(null);
        if (data?.tool?.id) {
          setSelectedToolId(data.tool.id);
        }
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
    setSelectedToolId(tool.id);
  };

  const toggleToolStatus = async (toolId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/v1/tools/${toolId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
      const response = await fetch(`/api/v1/tools/${toolId}`, {
        method: 'DELETE',
        credentials: 'include',
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

  const resetFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
    setRiskLevelFilter('all');
    setStatusFilter('all');
    setApprovalFilter('all');
    setSortBy('name');
  };

  const selectedTool = useMemo(
    () => filteredTools.find(tool => tool.id === selectedToolId) || null,
    [filteredTools, selectedToolId]
  );

  useEffect(() => {
    if (filteredTools.length === 0) {
      if (selectedToolId) {
        setSelectedToolId(null);
      }
      return;
    }

    if (!selectedToolId || !filteredTools.some(tool => tool.id === selectedToolId)) {
      setSelectedToolId(filteredTools[0].id);
    }
  }, [filteredTools, selectedToolId]);

  const getRiskVariant = (riskLevel: string) => {
    if (riskLevel === 'critical' || riskLevel === 'high') return 'destructive';
    if (riskLevel === 'medium') return 'warning';
    return 'success';
  };

  const getStatusVariant = (isActive: boolean) => (isActive ? 'default' : 'secondary');

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
    highRisk: tools.filter(t => t.riskLevel === 'high' || t.riskLevel === 'critical').length,
    approvals: tools.filter(t => t.requiresApproval).length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tool Configuration"
        subtitle={`Manage tool metadata, approvals, and risk posture for ${orgSlug}`}
        actions={
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setIsCreating(true);
                setEditingTool(null);
              }}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-indigo-600" />
              <div>
                <p className="text-sm font-medium">Requires Approval</p>
                <p className="text-2xl font-bold text-indigo-600">{stats.approvals}</p>
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
          <CardTitle>Tool Filters</CardTitle>
          <CardDescription>Find tools by category, risk, status, and approvals.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="md:col-span-2">
              <label htmlFor="search" className="block text-sm font-medium text-muted-foreground mb-1">
                Search
              </label>
              <Input
                id="search"
                placeholder="Search by name, category, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Category
              </label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {getCategories().map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Risk Level
              </label>
              <Select value={riskLevelFilter} onValueChange={setRiskLevelFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All risk levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All risk levels</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Status
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Approvals
              </label>
              <Select value={approvalFilter} onValueChange={setApprovalFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All tools" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tools</SelectItem>
                  <SelectItem value="required">Requires approval</SelectItem>
                  <SelectItem value="not-required">No approval</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Sort
              </label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort tools" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="updated">Recently updated</SelectItem>
                  <SelectItem value="risk">Highest risk</SelectItem>
                  <SelectItem value="category">Category</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">
              Showing {filteredTools.length} of {tools.length} tools
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              disabled={
                !searchTerm &&
                categoryFilter === 'all' &&
                riskLevelFilter === 'all' &&
                statusFilter === 'all' &&
                approvalFilter === 'all' &&
                sortBy === 'name'
              }
            >
              Reset filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tool Library</CardTitle>
            <CardDescription>Select a tool to see details and manage status.</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredTools.length === 0 ? (
              <div className="text-center py-10">
                <h3 className="text-lg font-semibold mb-2">No tools found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || categoryFilter !== 'all' || riskLevelFilter !== 'all' || statusFilter !== 'all' || approvalFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'No tools configured yet'
                  }
                </p>
                <Button
                  onClick={() => {
                    setIsCreating(true);
                    setEditingTool(null);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Tool
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Tool</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Category</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Risk</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Approval</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Updated</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredTools.map((tool) => (
                      <tr
                        key={tool.id}
                        onClick={() => setSelectedToolId(tool.id)}
                        className={`cursor-pointer hover:bg-muted/20 ${selectedToolId === tool.id ? 'bg-muted/40' : ''}`}
                      >
                        <td className="px-3 py-2">
                          <div className="font-medium font-mono">{tool.toolName}</div>
                          {tool.displayName && (
                            <div className="text-xs text-muted-foreground">{tool.displayName}</div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant="outline">{tool.category}</Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={getRiskVariant(tool.riskLevel)}>
                            {tool.riskLevel}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={getStatusVariant(tool.isActive)}>
                            {tool.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={tool.requiresApproval ? 'warning' : 'outline'}>
                            {tool.requiresApproval ? 'Required' : 'Not required'}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {new Date(tool.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleEditTool(tool);
                              }}
                              title="Edit tool"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                toggleToolStatus(tool.id, tool.isActive);
                              }}
                              title={tool.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {tool.isActive ? <PowerOff className="h-3 w-3" /> : <Power className="h-3 w-3" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tool Details</CardTitle>
            <CardDescription>Review configuration and make changes quickly.</CardDescription>
          </CardHeader>
          <CardContent>
            {selectedTool ? (
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-muted-foreground">Tool name</div>
                  <div className="text-base font-semibold font-mono">{selectedTool.toolName}</div>
                  {selectedTool.displayName && (
                    <div className="text-sm text-muted-foreground">{selectedTool.displayName}</div>
                  )}
                </div>

                <p className="text-sm text-muted-foreground">
                  {selectedTool.description || 'No description provided yet.'}
                </p>

                <div className="flex flex-wrap gap-2">
                  <Badge variant={getRiskVariant(selectedTool.riskLevel)}>
                    {selectedTool.riskLevel} risk
                  </Badge>
                  <Badge variant={getStatusVariant(selectedTool.isActive)}>
                    {selectedTool.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                  <Badge variant="outline">{selectedTool.category}</Badge>
                  <Badge variant="outline">{selectedTool.scope}</Badge>
                  <Badge variant="outline">{selectedTool.direction}</Badge>
                  <Badge variant={selectedTool.requiresApproval ? 'warning' : 'outline'}>
                    {selectedTool.requiresApproval ? 'Approval required' : 'No approval'}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Category</p>
                    <p className="font-medium">{selectedTool.category}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Scope</p>
                    <p className="font-medium">{selectedTool.scope}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Direction</p>
                    <p className="font-medium">{selectedTool.direction}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Updated</p>
                    <p className="font-medium">{new Date(selectedTool.updatedAt).toLocaleString()}</p>
                  </div>
                </div>

                <div className="rounded-md border border-border bg-muted/20 p-3 text-xs text-muted-foreground">
                  {selectedTool.requiresApproval
                    ? 'This tool requires explicit approval before execution.'
                    : 'This tool does not require explicit approval.'}
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">Metadata</div>
                  {Object.keys(selectedTool.metadata || {}).length > 0 ? (
                    <pre className="text-xs bg-muted/30 border border-border rounded-md p-3 overflow-auto">
                      {JSON.stringify(selectedTool.metadata, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-xs text-muted-foreground">No metadata defined.</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditTool(selectedTool)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Tool
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleToolStatus(selectedTool.id, selectedTool.isActive)}
                  >
                    {selectedTool.isActive ? (
                      <>
                        <PowerOff className="h-4 w-4 mr-2" />
                        Deactivate
                      </>
                    ) : (
                      <>
                        <Power className="h-4 w-4 mr-2" />
                        Activate
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteTool(selectedTool.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Select a tool from the list to review configuration details.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
