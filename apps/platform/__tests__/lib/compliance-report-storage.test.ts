import { randomBytes } from 'crypto';

import { put as mockPut } from '@vercel/blob';

import * as storage from '@/lib/services/compliance-report-storage';

const KEY_HEX = randomBytes(32).toString('hex');
const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  process.env.BLOB_READ_WRITE_TOKEN = 'test-token';
  process.env.COMPLIANCE_REPORT_ENCRYPTION_KEY = KEY_HEX;
  (mockPut as jest.Mock).mockClear();
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
});

describe('compliance-report-storage encryption-at-rest', () => {
  it('uploads ciphertext to blob — plaintext PDF bytes never appear in the upload payload', async () => {
    const plaintext = Buffer.from('%PDF-1.4 secret-pii-marker\nemail=victim@example.com\n%%EOF');
    let uploadedPayload: Buffer | undefined;
    (mockPut as jest.Mock).mockImplementationOnce(async (pathname: string, body: Buffer) => {
      uploadedPayload = Buffer.from(body);
      return {
        url: `https://blob.test.local/${pathname}-suffix`,
        pathname: `${pathname}-suffix`,
        contentType: 'application/octet-stream',
        contentDisposition: 'inline',
        downloadUrl: `https://blob.test.local/${pathname}-suffix?download=1`,
      };
    });

    const stored = await storage.storeReportPdf({
      reportId: 'rpt_1',
      orgId: 'org-1',
      pdf: plaintext,
    });

    expect(stored).toEqual({
      url: expect.stringMatching(/blob\.test\.local/),
      pathname: expect.stringContaining('compliance-reports/org-1/rpt_1.pdf'),
    });
    expect(uploadedPayload).toBeDefined();
    expect(uploadedPayload!.includes('secret-pii-marker')).toBe(false);
    expect(uploadedPayload!.includes('victim@example.com')).toBe(false);
    expect(uploadedPayload!.subarray(0, 8).toString('utf8')).toBe('GACPDF1\0');
  });

  it('round-trips through the encrypt/decrypt envelope', async () => {
    const plaintext = Buffer.from('compliance-report-pdf-bytes');
    const encrypted = storage.__internal.encryptPdf(plaintext, Buffer.from(KEY_HEX, 'hex'));
    const decrypted = storage.__internal.decryptPdf(encrypted, Buffer.from(KEY_HEX, 'hex'));
    expect(decrypted.equals(plaintext)).toBe(true);
  });

  it('rejects payloads that were not encrypted by this service (missing magic header)', async () => {
    const fake = Buffer.concat([Buffer.from('NOTOURS!', 'utf8'), Buffer.alloc(40, 0)]);
    expect(() => storage.__internal.decryptPdf(fake, Buffer.from(KEY_HEX, 'hex'))).toThrow(
      /magic header/i,
    );
  });

  it('rejects ciphertext whose authentication tag fails (tamper or wrong key)', async () => {
    const plaintext = Buffer.from('compliance-report-pdf-bytes');
    const encrypted = storage.__internal.encryptPdf(plaintext, Buffer.from(KEY_HEX, 'hex'));
    // flip a byte inside the ciphertext region to trigger GCM auth failure
    encrypted[encrypted.length - 1] ^= 0xff;
    expect(() => storage.__internal.decryptPdf(encrypted, Buffer.from(KEY_HEX, 'hex'))).toThrow();

    const wrongKey = randomBytes(32);
    const fresh = storage.__internal.encryptPdf(plaintext, Buffer.from(KEY_HEX, 'hex'));
    expect(() => storage.__internal.decryptPdf(fresh, wrongKey)).toThrow();
  });

  it('refuses to store a PDF when the encryption key is missing', async () => {
    delete process.env.COMPLIANCE_REPORT_ENCRYPTION_KEY;
    await expect(
      storage.storeReportPdf({ reportId: 'rpt_x', orgId: 'org-1', pdf: Buffer.from('a') }),
    ).rejects.toThrow(/COMPLIANCE_REPORT_ENCRYPTION_KEY/);
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('refuses to store a PDF when the encryption key is the wrong length', async () => {
    process.env.COMPLIANCE_REPORT_ENCRYPTION_KEY = 'deadbeef'; // 4 bytes
    await expect(
      storage.storeReportPdf({ reportId: 'rpt_x', orgId: 'org-1', pdf: Buffer.from('a') }),
    ).rejects.toThrow(/64-character hex/);
  });

  it('skips upload entirely when blob storage is not configured', async () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    const result = await storage.storeReportPdf({
      reportId: 'rpt_x',
      orgId: 'org-1',
      pdf: Buffer.from('a'),
    });
    expect(result).toBeNull();
    expect(mockPut).not.toHaveBeenCalled();
  });

  it('fetchReportPdfBytes decrypts what storeReportPdf wrote', async () => {
    const plaintext = Buffer.from('%PDF-1.4 round-trip-content\n%%EOF');
    let uploaded: Buffer | undefined;
    (mockPut as jest.Mock).mockImplementationOnce(async (pathname: string, body: Buffer) => {
      uploaded = Buffer.from(body);
      return {
        url: `https://blob.test.local/${pathname}-suffix`,
        pathname: `${pathname}-suffix`,
        contentType: 'application/octet-stream',
        contentDisposition: 'inline',
        downloadUrl: `https://blob.test.local/${pathname}-suffix?download=1`,
      };
    });

    const stored = await storage.storeReportPdf({
      reportId: 'rpt_round',
      orgId: 'org-1',
      pdf: plaintext,
    });
    expect(stored).not.toBeNull();
    expect(uploaded).toBeDefined();

    const originalFetch = global.fetch;
    (global as any).fetch = jest.fn(async () => ({
      ok: true,
      arrayBuffer: async () =>
        uploaded!.buffer.slice(
          uploaded!.byteOffset,
          uploaded!.byteOffset + uploaded!.byteLength,
        ),
    }));

    try {
      const decrypted = await storage.fetchReportPdfBytes(stored!.url);
      expect(decrypted.equals(plaintext)).toBe(true);
    } finally {
      (global as any).fetch = originalFetch;
    }
  });
});
