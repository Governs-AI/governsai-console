'use client';

import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

interface BudgetStatus {
  allowed: boolean;
  currentSpend: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  reason?: string;
}

interface BudgetStatusProps {
  orgId: string;
  userId?: string;
  className?: string;
}

export function BudgetStatus({ orgId, userId, className }: BudgetStatusProps) {
  const [status, setStatus] = useState<BudgetStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const params = new URLSearchParams({ orgId });
        if (userId) params.append('userId', userId);

        const res = await fetch(`/api/budget/status?${params}`);
        if (!res.ok) {
          throw new Error('Failed to fetch budget status');
        }
        
        const data = await res.json();
        setStatus(data.status);
        setError(null);
      } catch (err) {
        console.error('Error fetching budget status:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch budget status');
      } finally {
        setLoading(false);
      }
    }

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Refresh every 30s

    return () => clearInterval(interval);
  }, [orgId, userId]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    // Use the existing WebSocket service URL
    const websocketUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:3003';
    const ws = new WebSocket(`${websocketUrl}/ws`);
    
    ws.onopen = () => {
      // Subscribe to budget updates
      ws.send(JSON.stringify({
        type: 'SUB',
        channels: [`org:${orgId}:budget`]
      }));
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'BUDGET_UPDATE' && data.data.orgId === orgId) {
          // Update budget status with real-time data
          setStatus(prevStatus => ({
            ...prevStatus,
            currentSpend: data.data.currentSpend,
            remaining: data.data.remaining,
            percentUsed: data.data.percentUsed,
            allowed: data.data.currentSpend < data.data.limit,
          }));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    return () => {
      ws.close();
    };
  }, [orgId]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Budget Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-muted-foreground">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Budget Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Budget Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            No budget limits configured
          </div>
        </CardContent>
      </Card>
    );
  }

  const isWarning = status.percentUsed > 80;
  const isDanger = status.percentUsed > 95;
  const isOverBudget = status.currentSpend > status.limit;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Budget Status
          {isOverBudget && (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {(isWarning || isDanger || isOverBudget) && (
          <Alert variant={isOverBudget || isDanger ? 'destructive' : 'default'}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {isOverBudget
                ? 'Budget exceeded! Requests may be blocked.'
                : isDanger
                ? 'Budget almost exhausted! Requests may be blocked soon.'
                : 'Approaching budget limit. Monitor usage carefully.'}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Current Spend</span>
            <span className="font-semibold">${status.currentSpend.toFixed(2)}</span>
          </div>
          <Progress 
            value={Math.min(status.percentUsed, 100)} 
            className="h-2"
            variant={isOverBudget ? 'destructive' : isDanger ? 'destructive' : isWarning ? 'default' : 'default'}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>${status.currentSpend.toFixed(2)}</span>
            <span>${status.limit.toFixed(2)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Remaining</p>
            <p className={`text-lg font-semibold ${status.remaining < 0 ? 'text-destructive' : ''}`}>
              ${status.remaining.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Used</p>
            <p className={`text-lg font-semibold ${isOverBudget ? 'text-destructive' : ''}`}>
              {status.percentUsed.toFixed(1)}%
            </p>
          </div>
        </div>

        {status.limit > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {status.percentUsed > 100 ? (
              <TrendingUp className="h-3 w-3 text-destructive" />
            ) : (
              <TrendingDown className="h-3 w-3 text-green-600" />
            )}
            <span>
              {status.percentUsed > 100 
                ? `${(status.percentUsed - 100).toFixed(1)}% over budget`
                : `${(100 - status.percentUsed).toFixed(1)}% remaining`
              }
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
