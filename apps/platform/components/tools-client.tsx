'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

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
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface ToolsClientProps {
  orgSlug: string;
}

export function ToolsClient({ orgSlug }: ToolsClientProps) {
  const [tools, setTools] = useState<ToolConfig[]>([]);
  const [filteredTools, setFilteredTools] = useState<ToolConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [riskLevelFilter, setRiskLevelFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch tools
  useEffect(() => {
    fetchTools();
  }, [orgSlug]);

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

  const fetchTools = async () => {
    try {
      const response = await fetch('/api/tools');
      const data = await response.json();
      setTools(data.tools || []);
    } catch (error) {
      console.error('Error fetching tools:', error);
      setError('Failed to fetch tools');
    } finally {
      setLoading(false);
    }
  };

  const getCategories = () => {
    const categories = [...new Set(tools.map(tool => tool.category))];
    return categories.sort();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading tools...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Tool Configuration</h2>
          <p className="text-muted-foreground mt-1">
            Manage tool metadata and risk levels for {orgSlug}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchTools}>Refresh</Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <div className="mt-2 text-sm text-green-700">{success}</div>
            </div>
          </div>
        </div>
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
                onChange={(e) => setSearchTerm(e.target.value)}
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
