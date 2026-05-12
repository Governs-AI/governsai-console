/**
 * TEST 2.2b-ui — Audit log export URL builder.
 *
 * Covers the "click sends filter params to Atlas endpoint" AC at the URL
 * construction layer. Atlas's contract (GOV-602): GET /api/audit/export?format=csv
 * with the same filter keys as the 2.2a list endpoint — decision, tool,
 * user, from, to. Date fields are normalized to ISO.
 */

import { buildAuditExportUrl } from '@/lib/audit-export-url';

describe('buildAuditExportUrl', () => {
  it('sends only format=csv when no filters are set', () => {
    const url = buildAuditExportUrl({
      decision: '',
      tool: '',
      user: '',
      from: '',
      to: '',
    });
    expect(url).toBe('/api/v1/audit/export?format=csv');
  });

  it('forwards every filter field using GOV-602 keys', () => {
    const url = buildAuditExportUrl({
      decision: 'deny',
      tool: 'search_web',
      user: 'corr-abc',
      from: '2026-04-01T00:00',
      to: '2026-04-30T23:59',
    });

    const params = new URL(`http://x.test${url}`).searchParams;
    expect(params.get('format')).toBe('csv');
    expect(params.get('decision')).toBe('deny');
    expect(params.get('tool')).toBe('search_web');
    expect(params.get('user')).toBe('corr-abc');
    // datetime-local -> ISO
    expect(params.get('from')).toBe(new Date('2026-04-01T00:00').toISOString());
    expect(params.get('to')).toBe(new Date('2026-04-30T23:59').toISOString());
  });

  it('omits empty or whitespace-only text fields', () => {
    const url = buildAuditExportUrl({
      decision: '',
      tool: '   ',
      user: '',
      from: '',
      to: '',
    });
    expect(url).toBe('/api/v1/audit/export?format=csv');
  });

  it('supports a one-sided date filter', () => {
    const url = buildAuditExportUrl({
      decision: '',
      tool: '',
      user: '',
      from: '2026-04-01T00:00',
      to: '',
    });
    const params = new URL(`http://x.test${url}`).searchParams;
    expect(params.has('from')).toBe(true);
    expect(params.has('to')).toBe(false);
  });

  it('uses GOV-602 endpoint path', () => {
    const url = buildAuditExportUrl({
      decision: 'allow',
      tool: '',
      user: '',
      from: '',
      to: '',
    });
    expect(url.startsWith('/api/v1/audit/export?')).toBe(true);
  });
});
