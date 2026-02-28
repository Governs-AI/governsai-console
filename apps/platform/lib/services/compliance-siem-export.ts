import { randomUUID } from 'crypto';
import { Prisma, prisma } from '@governs-ai/db';

export type SiemConnectorType = 'splunk' | 'elastic' | 'datadog' | 'webhook';

export interface SiemExportOptions {
  orgId: string;
  connector: SiemConnectorType;
  startTime?: Date;
  endTime?: Date;
  maxRecords?: number;
  dryRun?: boolean;

  // shared destination data
  endpoint?: string;

  // splunk
  token?: string;
  source?: string;
  sourcetype?: string;
  index?: string;

  // elastic
  apiKey?: string;
  username?: string;
  password?: string;

  // datadog
  site?: string;
  tags?: string;

  // webhook
  headers?: Record<string, string>;
  secret?: string;
}

export interface SiemAuditEvent {
  id: string;
  timestamp: string;
  action: string;
  resource: string;
  userId: string | null;
  userEmail: string | null;
  orgId: string;
  details: Record<string, unknown>;
}

export interface SiemExportResult {
  requestId: string;
  connector: SiemConnectorType;
  exportedCount: number;
  destination: string;
  dryRun: boolean;
  period: {
    startTime: string | null;
    endTime: string | null;
  };
  sample: SiemAuditEvent[];
}

type DateFilter = {
  gte?: Date;
  lte?: Date;
};

function buildDateFilter(startTime?: Date, endTime?: Date): DateFilter | undefined {
  const dateFilter: DateFilter = {};
  if (startTime) {
    dateFilter.gte = startTime;
  }
  if (endTime) {
    dateFilter.lte = endTime;
  }
  return Object.keys(dateFilter).length > 0 ? dateFilter : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toMetadata(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  if (!value) {
    return {};
  }
  if (isRecord(value)) {
    return value;
  }
  return { value };
}

function resolveDestination(options: SiemExportOptions): string {
  if (options.endpoint && options.endpoint.trim().length > 0) {
    return options.endpoint.trim();
  }

  if (options.connector === 'splunk') {
    return process.env.SPLUNK_HEC_URL || '';
  }

  if (options.connector === 'elastic') {
    return process.env.ELASTIC_URL || '';
  }

  if (options.connector === 'datadog') {
    const site = options.site || process.env.DATADOG_SITE || 'datadoghq.com';
    return `https://http-intake.logs.${site}/api/v2/logs`;
  }

  return process.env.AUDIT_WEBHOOK_URL || '';
}

function requireDestination(destination: string, connector: SiemConnectorType): string {
  if (!destination) {
    throw new Error(`Missing destination endpoint for ${connector} connector`);
  }
  return destination;
}

async function fetchAuditEvents(options: SiemExportOptions): Promise<SiemAuditEvent[]> {
  const maxRecords = Math.min(Math.max(options.maxRecords ?? 5000, 100), 20000);
  const dateFilter = buildDateFilter(options.startTime, options.endTime);

  const where: Prisma.AuditLogWhereInput = {
    orgId: options.orgId,
    ...(dateFilter ? { createdAt: dateFilter } : {}),
  };

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: maxRecords,
    include: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  return logs.map((item) => ({
    id: item.id,
    timestamp: item.createdAt.toISOString(),
    action: item.action,
    resource: item.resource,
    userId: item.userId,
    userEmail: item.user?.email || null,
    orgId: item.orgId || options.orgId,
    details: toMetadata(item.details),
  }));
}

async function sendToSplunk(events: SiemAuditEvent[], options: SiemExportOptions, destination: string): Promise<void> {
  const token = options.token || process.env.SPLUNK_HEC_TOKEN;
  if (!token) {
    throw new Error('Missing Splunk token (token or SPLUNK_HEC_TOKEN)');
  }

  const normalized = destination.endsWith('/services/collector/event')
    ? destination
    : `${destination.replace(/\/$/, '')}/services/collector/event`;

  const source = options.source || process.env.SPLUNK_SOURCE || 'governsai.audit';
  const sourcetype = options.sourcetype || process.env.SPLUNK_SOURCETYPE || 'governsai:audit';
  const index = options.index || process.env.SPLUNK_INDEX || 'main';

  const body = events
    .map((event) =>
      JSON.stringify({
        time: Math.floor(new Date(event.timestamp).getTime() / 1000),
        host: 'governsai-platform',
        source,
        sourcetype,
        index,
        event,
      })
    )
    .join('\n');

  const response = await fetch(normalized, {
    method: 'POST',
    headers: {
      Authorization: `Splunk ${token}`,
      'Content-Type': 'application/json',
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`Splunk export failed (${response.status} ${response.statusText})`);
  }
}

async function sendToElastic(events: SiemAuditEvent[], options: SiemExportOptions, destination: string): Promise<void> {
  const indexName = options.index || process.env.ELASTIC_INDEX || 'governsai-audit';
  const normalized = destination.endsWith('/_bulk')
    ? destination
    : `${destination.replace(/\/$/, '')}/_bulk`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-ndjson',
  };

  const apiKey = options.apiKey || process.env.ELASTIC_API_KEY;
  const username = options.username || process.env.ELASTIC_USERNAME;
  const password = options.password || process.env.ELASTIC_PASSWORD;

  if (apiKey) {
    headers.Authorization = `ApiKey ${apiKey}`;
  } else if (username && password) {
    const basic = Buffer.from(`${username}:${password}`).toString('base64');
    headers.Authorization = `Basic ${basic}`;
  }

  const ndjson = events
    .map((event) => {
      const action = JSON.stringify({ index: { _index: indexName } });
      const payload = JSON.stringify({
        '@timestamp': event.timestamp,
        event_id: event.id,
        action: event.action,
        resource: event.resource,
        org_id: event.orgId,
        user_id: event.userId,
        user_email: event.userEmail,
        details: event.details,
      });
      return `${action}\n${payload}`;
    })
    .join('\n')
    .concat('\n');

  const response = await fetch(normalized, {
    method: 'POST',
    headers,
    body: ndjson,
  });

  if (!response.ok) {
    throw new Error(`Elastic export failed (${response.status} ${response.statusText})`);
  }

  const payload = (await response.json()) as { errors?: boolean };
  if (payload.errors) {
    throw new Error('Elastic export reported item-level errors');
  }
}

async function sendToDatadog(events: SiemAuditEvent[], options: SiemExportOptions, destination: string): Promise<void> {
  const apiKey = options.apiKey || process.env.DATADOG_API_KEY;
  if (!apiKey) {
    throw new Error('Missing Datadog API key (apiKey or DATADOG_API_KEY)');
  }

  const tags = options.tags || process.env.DATADOG_TAGS || 'service:governsai,source:audit';

  const payload = events.map((event) => ({
    message: `${event.action} ${event.resource}`,
    status: 'info',
    service: 'governsai-platform',
    source: 'governsai-audit',
    ddtags: tags,
    timestamp: new Date(event.timestamp).getTime(),
    attributes: {
      eventId: event.id,
      orgId: event.orgId,
      userId: event.userId,
      userEmail: event.userEmail,
      resource: event.resource,
      details: event.details,
    },
  }));

  const response = await fetch(destination, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'DD-API-KEY': apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Datadog export failed (${response.status} ${response.statusText})`);
  }
}

async function sendToWebhook(events: SiemAuditEvent[], options: SiemExportOptions, destination: string): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const secret = options.secret || process.env.AUDIT_WEBHOOK_SECRET;
  if (secret) {
    headers['X-Governs-Signature'] = secret;
  }

  const response = await fetch(destination, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      version: 1,
      type: 'audit.export',
      generatedAt: new Date().toISOString(),
      eventCount: events.length,
      events,
    }),
  });

  if (!response.ok) {
    throw new Error(`Webhook export failed (${response.status} ${response.statusText})`);
  }
}

export async function exportAuditEventsToSiem(options: SiemExportOptions): Promise<SiemExportResult> {
  const requestId = randomUUID();
  const events = await fetchAuditEvents(options);
  const destination = requireDestination(resolveDestination(options), options.connector);
  const dryRun = options.dryRun === true;

  if (!dryRun && events.length > 0) {
    if (options.connector === 'splunk') {
      await sendToSplunk(events, options, destination);
    } else if (options.connector === 'elastic') {
      await sendToElastic(events, options, destination);
    } else if (options.connector === 'datadog') {
      await sendToDatadog(events, options, destination);
    } else {
      await sendToWebhook(events, options, destination);
    }
  }

  return {
    requestId,
    connector: options.connector,
    exportedCount: events.length,
    destination,
    dryRun,
    period: {
      startTime: options.startTime ? options.startTime.toISOString() : null,
      endTime: options.endTime ? options.endTime.toISOString() : null,
    },
    sample: events.slice(0, 20),
  };
}
