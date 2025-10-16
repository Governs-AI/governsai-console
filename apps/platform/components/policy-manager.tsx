'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Policy {
  id: string;
  name: string;
  description?: string;
  version: string;
  defaults: {
    ingress: { action: string };
    egress: { action: string };
  };
  toolAccess: Record<string, any>;
  denyTools: string[];
  allowTools: string[];
  networkScopes: string[];
  networkTools: string[];
  onError: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

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
}

export function PolicyManager() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [tools, setTools] = useState<ToolConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch policies and tools
  useEffect(() => {
    fetchPolicies();
    fetchTools();
  }, []);

  const fetchPolicies = async () => {
    try {
      const response = await fetch('/api/v1/policies?orgId=demo-org-123');
      const data = await response.json();
      setPolicies(data.policies || []);
    } catch (error) {
      console.error('Error fetching policies:', error);
    }
  };

  const fetchTools = async () => {
    try {
      const response = await fetch('/api/v1/tools');
      const data = await response.json();
      setTools(data.tools || []);
    } catch (error) {
      console.error('Error fetching tools:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultPolicy = async () => {
    try {
      const defaultPolicy = {
        orgId: 'demo-org-123',
        name: 'Default Demo Policy',
        description: 'Default policy for demo environment',
        version: 'v1',
        defaults: {
          ingress: { action: 'redact' },
          egress: { action: 'redact' },
        },
        toolAccess: {
          'weather.current': {
            direction: 'ingress',
            action: 'allow',
            allow_pii: {},
          },
          'weather.forecast': {
            direction: 'ingress',
            action: 'allow',
            allow_pii: {},
          },
          'email.send': {
            direction: 'egress',
            action: 'redact',
            allow_pii: {
              'PII:email_address': 'pass_through',
              'PII:us_ssn': 'tokenize',
            },
          },
        },
        denyTools: ['python.exec', 'bash.exec', 'shell.exec'],
        allowTools: [],
        networkScopes: ['net.'],
        networkTools: ['web.', 'email.', 'calendar.'],
        onError: 'block',
        priority: 0,
      };

      const response = await fetch('/api/v1/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(defaultPolicy),
      });

      if (response.ok) {
        await fetchPolicies();
        setIsCreating(false);
      }
    } catch (error) {
      console.error('Error creating policy:', error);
    }
  };

  const deletePolicy = async (policyId: string) => {
    try {
      const response = await fetch(`/api/policies/${policyId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchPolicies();
        if (selectedPolicy?.id === policyId) {
          setSelectedPolicy(null);
        }
      }
    } catch (error) {
      console.error('Error deleting policy:', error);
    }
  };

  if (loading) {
    return <div>Loading policies...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Policy Management</h2>
        <div className="space-x-2">
          <Button onClick={() => setIsCreating(true)}>Create Policy</Button>
          <Button variant="outline" onClick={fetchPolicies}>Refresh</Button>
        </div>
      </div>

      {/* Create Policy Form */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Policy</CardTitle>
            <CardDescription>
              Create a new policy for your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="policyName">Policy Name</Label>
                <Input id="policyName" placeholder="e.g., Production Policy" />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Input id="priority" type="number" placeholder="0" />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="Policy description..." />
            </div>
            <div className="flex space-x-2">
              <Button onClick={createDefaultPolicy}>Create Default Policy</Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Policies List */}
      <div className="grid gap-4">
        {policies.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground mb-4">No policies found</p>
              <Button onClick={() => setIsCreating(true)}>Create Your First Policy</Button>
            </CardContent>
          </Card>
        ) : (
          policies.map((policy) => (
            <Card key={policy.id} className={selectedPolicy?.id === policy.id ? 'ring-2 ring-blue-500' : ''}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {policy.name}
                      <Badge variant={policy.isActive ? 'default' : 'secondary'}>
                        {policy.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="outline">Priority: {policy.priority}</Badge>
                    </CardTitle>
                    <CardDescription>{policy.description}</CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedPolicy(policy)}
                    >
                      {selectedPolicy?.id === policy.id ? 'Hide Details' : 'View Details'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deletePolicy(policy.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              {selectedPolicy?.id === policy.id && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Default Actions</Label>
                      <div className="text-sm space-y-1">
                        <p>Ingress: <Badge variant="outline">{policy.defaults.ingress.action}</Badge></p>
                        <p>Egress: <Badge variant="outline">{policy.defaults.egress.action}</Badge></p>
                      </div>
                    </div>
                    <div>
                      <Label>Network Configuration</Label>
                      <div className="text-sm space-y-1">
                        <p>Scopes: {policy.networkScopes.join(', ')}</p>
                        <p>Tools: {policy.networkTools.join(', ')}</p>
                        <p>On Error: <Badge variant="outline">{policy.onError}</Badge></p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label>Denied Tools</Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {policy.denyTools.map((tool) => (
                        <Badge key={tool} variant="destructive">{tool}</Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label>Tool Access Rules</Label>
                    <div className="space-y-2 mt-2">
                      {Object.entries(policy.toolAccess).map(([tool, config]) => (
                        <div key={tool} className="flex items-center justify-between p-2 border rounded">
                          <span className="font-mono text-sm">{tool}</span>
                          <div className="flex gap-2">
                            <Badge variant="outline">{config.direction}</Badge>
                            <Badge variant="outline">{config.action}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Tools Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Available Tools ({tools.length})</CardTitle>
          <CardDescription>Tools that can be governed by policies</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tools.map((tool) => (
              <div key={tool.id} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-mono text-sm font-medium">{tool.toolName}</h4>
                  <Badge variant={tool.riskLevel === 'critical' ? 'destructive' : tool.riskLevel === 'high' ? 'destructive' : 'secondary'}>
                    {tool.riskLevel}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{tool.description}</p>
                <div className="flex gap-2">
                  <Badge variant="outline">{tool.category}</Badge>
                  <Badge variant="outline">{tool.scope}</Badge>
                  {tool.requiresApproval && <Badge variant="destructive">Requires Approval</Badge>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
