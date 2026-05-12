// Pure helper for the audit log CSV export URL. Lives outside the React
// page so it can be unit-tested without pulling in UI or framework deps.
//
// Contract matches Atlas's GOV-602 endpoint: GET /api/v1/audit/export with
// format=csv and the same filter keys as the 2.2a list endpoint.

export interface AuditExportFilters {
  decision: '' | 'allow' | 'transform' | 'deny';
  tool: string;
  user: string;
  from: string; // datetime-local string, will be normalized to ISO
  to: string;
}

export function buildAuditExportUrl(filters: AuditExportFilters): string {
  const params = new URLSearchParams();
  params.set('format', 'csv');
  if (filters.decision) params.set('decision', filters.decision);
  if (filters.tool.trim()) params.set('tool', filters.tool.trim());
  if (filters.user.trim()) params.set('user', filters.user.trim());
  if (filters.from) params.set('from', new Date(filters.from).toISOString());
  if (filters.to) params.set('to', new Date(filters.to).toISOString());
  return `/api/v1/audit/export?${params.toString()}`;
}
