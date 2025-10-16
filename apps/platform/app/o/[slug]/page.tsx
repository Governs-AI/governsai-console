'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
// Icons removed for simplicity
import Link from 'next/link';

interface OrgStats {
  policies: number;
  tools: number;
  activeAgents: number;
  totalDecisions: number;
  blockedRequests: number;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    status: 'success' | 'warning' | 'error';
  }>;
}

export default function OrganizationOverview() {
  const params = useParams();
  const orgSlug = params.slug as string;
  const [stats, setStats] = useState<OrgStats>({
    policies: 0,
    tools: 0,
    activeAgents: 0,
    totalDecisions: 0,
    blockedRequests: 0,
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [orgSlug]);

  const fetchStats = async () => {
    try {
      // Fetch policies count
      const policiesResponse = await fetch(`/api/v1/policies?orgId=${orgSlug}`);
      const policiesData = await policiesResponse.json();
      
      // Fetch tools count
      const toolsResponse = await fetch('/api/v1/tools');
      const toolsData = await toolsResponse.json();
      
      // Mock data for demo
      setStats({
        policies: policiesData.policies?.length || 0,
        tools: toolsData.tools?.length || 0,
        activeAgents: 3,
        totalDecisions: 1247,
        blockedRequests: 23,
        recentActivity: [
          {
            id: '1',
            type: 'policy_created',
            description: 'New policy "Production Security" created',
            timestamp: '2 minutes ago',
            status: 'success',
          },
          {
            id: '2',
            type: 'tool_blocked',
            description: 'Tool "python.exec" blocked for user john@example.com',
            timestamp: '15 minutes ago',
            status: 'warning',
          },
          {
            id: '3',
            type: 'agent_registered',
            description: 'New agent "mobile-app-v2" registered',
            timestamp: '1 hour ago',
            status: 'success',
          },
          {
            id: '4',
            type: 'policy_updated',
            description: 'Policy "Default Demo Policy" updated',
            timestamp: '2 hours ago',
            status: 'success',
          },
          {
            id: '5',
            type: 'api_key_created',
            description: 'New API key created for development',
            timestamp: '3 hours ago',
            status: 'success',
          },
        ],
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading organization data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 capitalize">{orgSlug} Dashboard</h1>
        <p className="mt-2 text-gray-600">
          AI governance and policy management overview
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Policies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.policies}</div>
            <p className="text-xs text-muted-foreground">
              Active governance policies
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.tools}</div>
            <p className="text-xs text-muted-foreground">
              Configured tools
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeAgents}</div>
            <p className="text-xs text-muted-foreground">
              Connected applications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Decisions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDecisions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Policy evaluations today
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              Policy Management
            </CardTitle>
            <CardDescription>
              Create and manage AI governance policies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {stats.policies} policies configured
              </p>
              <Link href={`/o/${orgSlug}/policies`}>
                <Button className="w-full">Manage Policies</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Tool Configuration
            </CardTitle>
            <CardDescription>
              Configure tool metadata and risk levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {stats.tools} tools configured
              </p>
              <Link href={`/o/${orgSlug}/tools`}>
                <Button className="w-full">Manage Tools</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Analytics
            </CardTitle>
            <CardDescription>
              View policy performance and usage analytics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {stats.blockedRequests} requests blocked today
              </p>
              <Link href={`/o/${orgSlug}/analytics`}>
                <Button className="w-full">View Analytics</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>
            Recent Activity
          </CardTitle>
          <CardDescription>
            Latest events and changes in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className={`w-3 h-3 rounded-full ${
                    activity.status === 'success' ? 'bg-green-500' :
                    activity.status === 'warning' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.description}</p>
                  <p className="text-sm text-gray-500">{activity.timestamp}</p>
                </div>
                <div className="flex-shrink-0">
                  <Badge variant="outline">{activity.type}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security Status */}
      <Card>
        <CardHeader>
          <CardTitle>
            Security Status
          </CardTitle>
          <CardDescription>
            Current security posture and recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <div>
                  <p className="font-medium">Policy Coverage</p>
                  <p className="text-sm text-muted-foreground">
                    All critical tools are covered by policies
                  </p>
                </div>
              </div>
              <Badge variant="default">Good</Badge>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div>
                  <p className="font-medium">High-Risk Tools</p>
                  <p className="text-sm text-muted-foreground">
                    Consider adding approval requirements for financial tools
                  </p>
                </div>
              </div>
              <Badge variant="secondary">Review</Badge>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <div>
                  <p className="font-medium">API Security</p>
                  <p className="text-sm text-muted-foreground">
                    All API keys are properly configured and secured
                  </p>
                </div>
              </div>
              <Badge variant="default">Secure</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
