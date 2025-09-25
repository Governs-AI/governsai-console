"use client";

import { useState, useEffect } from 'react';
import { 
  Button, 
  DataTable, 
  DataTableHeader, 
  DataTableBody, 
  DataTableRow, 
  DataTableHead, 
  DataTableCell,
  EmptyState,
  Skeleton,
  SkeletonRow,
  PageHeader
} from "@governs-ai/ui";
import { HealthPill } from '@/components/health-pill';

interface Decision {
  id: string;
  orgId: string;
  direction: string;
  decision: string;
  tool: string | null;
  scope: string | null;
  detectorSummary: any;
  payloadHash: string;
  latencyMs: number | null;
  correlationId: string | null;
  tags: any;
  ts: string;
}

export default function DecisionsClient() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDecisions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/decisions?orgId=default-org');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setDecisions(data.decisions || data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecisions();
  }, []);

  const formatTimestamp = (ts: string) => {
    return new Date(ts).toLocaleString();
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'allow':
        return 'text-success bg-success/10';
      case 'transform':
        return 'text-warning bg-warning/10';
      case 'deny':
        return 'text-danger bg-danger/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case 'precheck':
        return 'text-info bg-info/10';
      case 'postcheck':
        return 'text-accent bg-accent/10';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        title="Failed to load decisions"
        desc={error}
        action={
          <Button onClick={fetchDecisions}>
            Try Again
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Decision Log"
        subtitle="Monitor AI governance decisions in real-time"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchDecisions}>
              Refresh
            </Button>
            <Button variant="outline">
              Export
            </Button>
          </div>
        }
      />

      {/* Health Pill */}
      <HealthPill />

      {/* Decisions Table */}
      {decisions.length === 0 ? (
        <EmptyState
          title="No decisions found"
          desc="Decision events will appear here as they are processed."
        />
      ) : (
        <DataTable>
          <DataTableHeader>
            <DataTableRow>
              <DataTableHead>Time</DataTableHead>
              <DataTableHead>Direction</DataTableHead>
              <DataTableHead>Decision</DataTableHead>
              <DataTableHead>Tool</DataTableHead>
              <DataTableHead>Scope</DataTableHead>
              <DataTableHead>Latency</DataTableHead>
              <DataTableHead>Correlation ID</DataTableHead>
            </DataTableRow>
          </DataTableHeader>
          <DataTableBody>
            {decisions.map((decision) => (
              <DataTableRow key={decision.id}>
                <DataTableCell className="text-sm text-muted-foreground">
                  {formatTimestamp(decision.ts)}
                </DataTableCell>
                <DataTableCell>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDirectionColor(decision.direction)}`}>
                    {decision.direction}
                  </span>
                </DataTableCell>
                <DataTableCell>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getDecisionColor(decision.decision)}`}>
                    {decision.decision}
                  </span>
                </DataTableCell>
                <DataTableCell className="text-sm">
                  {decision.tool || '-'}
                </DataTableCell>
                <DataTableCell className="text-sm">
                  {decision.scope || '-'}
                </DataTableCell>
                <DataTableCell className="text-sm">
                  {decision.latencyMs ? `${decision.latencyMs}ms` : '-'}
                </DataTableCell>
                <DataTableCell className="text-sm font-mono">
                  {decision.correlationId || '-'}
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}
    </div>
  );
}