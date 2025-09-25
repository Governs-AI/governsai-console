"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@governs-ai/ui';
import { Badge } from '@governs-ai/ui';
import { Activity, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface HealthStatus {
  status: 'healthy' | 'warning' | 'error';
  lastIngestTime: string | null;
  dlqCount: number;
  totalDecisions: number;
  errorRate: number;
}

export function HealthPill() {
  const [health, setHealth] = useState<HealthStatus>({
    status: 'healthy',
    lastIngestTime: null,
    dlqCount: 0,
    totalDecisions: 0,
    errorRate: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchHealthStatus = async () => {
    try {
      // Fetch decisions with stats
      const decisionsResponse = await fetch('/api/decisions?orgId=default-org&includeStats=true&limit=1');
      const decisionsData = await decisionsResponse.json();
      
      // Fetch ingest API health
      const ingestResponse = await fetch('/api/v1/ingest/decision');
      const ingestData = await ingestResponse.json();
      
      const now = new Date();
      const lastIngest = decisionsData.lastIngestTime ? new Date(decisionsData.lastIngestTime) : null;
      const timeSinceLastIngest = lastIngest ? now.getTime() - lastIngest.getTime() : null;
      
      // Determine health status
      let status: 'healthy' | 'warning' | 'error' = 'healthy';
      
      if (!lastIngest || timeSinceLastIngest > 5 * 60 * 1000) { // 5 minutes
        status = 'warning';
      }
      
      if (timeSinceLastIngest > 15 * 60 * 1000) { // 15 minutes
        status = 'error';
      }
      
      // Calculate error rate (denied decisions / total decisions)
      const totalDecisions = decisionsData.stats?.total || 0;
      const deniedDecisions = decisionsData.stats?.byDecision?.deny || 0;
      const errorRate = totalDecisions > 0 ? (deniedDecisions / totalDecisions) * 100 : 0;
      
      setHealth({
        status,
        lastIngestTime: decisionsData.lastIngestTime,
        dlqCount: 0, // TODO: Implement actual DLQ monitoring
        totalDecisions,
        errorRate,
      });
    } catch (error) {
      console.error('Error fetching health status:', error);
      setHealth({
        status: 'error',
        lastIngestTime: null,
        dlqCount: 0,
        totalDecisions: 0,
        errorRate: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthStatus();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchHealthStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = () => {
    switch (health.status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = () => {
    const variants = {
      healthy: 'default',
      warning: 'secondary',
      error: 'destructive',
    } as const;
    
    return (
      <Badge variant={variants[health.status]}>
        {health.status}
      </Badge>
    );
  };

  const formatLastIngest = () => {
    if (!health.lastIngestTime) return 'Never';
    
    const lastIngest = new Date(health.lastIngestTime);
    const now = new Date();
    const diffMs = now.getTime() - lastIngest.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 animate-pulse" />
            <span className="text-sm">Loading health status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="text-sm font-medium">System Health</span>
              {getStatusBadge()}
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">Last Ingest</span>
              <span className="text-sm text-muted-foreground">
                {formatLastIngest()}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium">Total Decisions</span>
              <Badge variant="outline">{health.totalDecisions}</Badge>
            </div>
            
            {health.errorRate > 0 && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium">Error Rate</span>
                <Badge variant="outline">{health.errorRate.toFixed(1)}%</Badge>
              </div>
            )}
          </div>
          
          <div className="text-xs text-muted-foreground">
            Updated {new Date().toLocaleTimeString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
