import 'server-only';
import { prisma } from '@governs-ai/db';

/**
 * Built-in tool catalog.
 *
 * The policy editor builds tool rules from `ToolConfig` rows, so an empty
 * table means a new install cannot write a single tool rule. These entries
 * cover the tools the SDK examples and the chat demo use, plus the code-exec
 * tools precheck denies by default. They are inserted once (existing rows,
 * including edits made in Manage Tools, are never overwritten).
 */
export interface CatalogTool {
  toolName: string;
  displayName: string;
  description: string;
  category: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  scope: string;
  direction: 'ingress' | 'egress' | 'both';
  requiresApproval?: boolean;
}

export const BUILT_IN_TOOLS: CatalogTool[] = [
  { toolName: 'model.chat', displayName: 'LLM chat', description: 'Prompts sent to a language model', category: 'model', riskLevel: 'medium', scope: 'net.external', direction: 'both' },
  { toolName: 'weather_current', displayName: 'Current weather', description: 'Current conditions for a location', category: 'data', riskLevel: 'low', scope: 'net.external', direction: 'ingress' },
  { toolName: 'weather_forecast', displayName: 'Weather forecast', description: 'Multi-day forecast for a location', category: 'data', riskLevel: 'low', scope: 'net.external', direction: 'ingress' },
  { toolName: 'web_search', displayName: 'Web search', description: 'Search the public web', category: 'web', riskLevel: 'medium', scope: 'net.external', direction: 'both' },
  { toolName: 'web_scrape', displayName: 'Web scrape', description: 'Fetch and extract a web page', category: 'web', riskLevel: 'medium', scope: 'net.external', direction: 'both' },
  { toolName: 'file_read', displayName: 'Read file', description: 'Read a file from storage', category: 'file', riskLevel: 'medium', scope: 'local', direction: 'egress' },
  { toolName: 'file_write', displayName: 'Write file', description: 'Write a file to storage', category: 'file', riskLevel: 'high', scope: 'local', direction: 'ingress' },
  { toolName: 'file_list', displayName: 'List files', description: 'List files in a directory', category: 'file', riskLevel: 'low', scope: 'local', direction: 'egress' },
  { toolName: 'db_query', displayName: 'Database query', description: 'Run a query against an internal database', category: 'data', riskLevel: 'high', scope: 'net.internal', direction: 'both' },
  { toolName: 'payment_process', displayName: 'Process payment', description: 'Charge a payment method', category: 'financial', riskLevel: 'critical', scope: 'net.external', direction: 'ingress', requiresApproval: true },
  { toolName: 'payment_refund', displayName: 'Refund payment', description: 'Refund a previous payment', category: 'financial', riskLevel: 'critical', scope: 'net.external', direction: 'ingress', requiresApproval: true },
  { toolName: 'email_send', displayName: 'Send email', description: 'Send an email on the user’s behalf', category: 'communication', riskLevel: 'high', scope: 'net.external', direction: 'ingress', requiresApproval: true },
  { toolName: 'calendar_create_event', displayName: 'Create calendar event', description: 'Create an event in a calendar', category: 'communication', riskLevel: 'medium', scope: 'net.external', direction: 'ingress' },
  { toolName: 'python.exec', displayName: 'Python exec', description: 'Execute Python code (denied by default)', category: 'code', riskLevel: 'critical', scope: 'local', direction: 'ingress' },
  { toolName: 'bash.exec', displayName: 'Shell exec', description: 'Execute shell commands (denied by default)', category: 'code', riskLevel: 'critical', scope: 'local', direction: 'ingress' },
];

let ensured = false;

/** Insert any missing built-in tools. Cheap after the first call per process. */
export async function ensureToolCatalog(): Promise<void> {
  if (ensured) return;
  const existing = await prisma.toolConfig.findMany({
    where: { orgId: null, toolName: { in: BUILT_IN_TOOLS.map((t) => t.toolName) } },
    select: { toolName: true },
  });
  const have = new Set(existing.map((t: { toolName: string }) => t.toolName));
  const missing = BUILT_IN_TOOLS.filter((t) => !have.has(t.toolName));
  if (missing.length > 0) {
    await prisma.toolConfig.createMany({
      data: missing.map((t) => ({
        toolName: t.toolName,
        displayName: t.displayName,
        description: t.description,
        category: t.category,
        riskLevel: t.riskLevel,
        scope: t.scope,
        direction: t.direction,
        requiresApproval: t.requiresApproval ?? false,
        metadata: {},
      })),
      skipDuplicates: true,
    });
  }
  ensured = true;
}

/**
 * Catalog rows an org can see: global entries (orgId null — built-ins and
 * entries that predate per-org catalogs) plus the org's own.
 */
export function visibleTo(orgId: string) {
  return { OR: [{ orgId: null }, { orgId }] };
}

/**
 * One row per tool name, the org's own entry winning over a global one.
 * Each row gets `editable`: true only for the org's own entries.
 */
export function mergeCatalog<T extends { toolName: string; orgId: string | null }>(
  rows: T[],
  orgId: string,
): Array<T & { editable: boolean }> {
  const byName = new Map<string, T>();
  for (const row of rows) {
    const seen = byName.get(row.toolName);
    if (!seen || (seen.orgId === null && row.orgId === orgId)) byName.set(row.toolName, row);
  }
  return Array.from(byName.values()).map((row) => ({ ...row, editable: row.orgId === orgId }));
}

/** The tool `orgId` would get for `nameOrId`: its own entry, else the global one. */
export async function findCatalogTool(orgId: string, nameOrId: string) {
  const rows = await prisma.toolConfig.findMany({
    where: { AND: [visibleTo(orgId), { OR: [{ toolName: nameOrId }, { id: nameOrId }] }] },
  });
  return mergeCatalog(rows, orgId)[0] ?? null;
}

/** The tool_config shape precheck and the SDKs use. */
export function toToolMetadata(tool: {
  toolName: string;
  scope: string;
  direction: string;
  category: string;
  riskLevel: string;
  requiresApproval: boolean;
  metadata: unknown;
}) {
  return {
    tool_name: tool.toolName,
    scope: tool.scope,
    direction: tool.direction,
    metadata: {
      ...((tool.metadata as Record<string, unknown>) || {}),
      category: tool.category,
      risk_level: tool.riskLevel,
      requires_approval: tool.requiresApproval,
    },
  };
}
