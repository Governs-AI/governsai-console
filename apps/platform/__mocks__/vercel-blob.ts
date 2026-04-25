/**
 * Manual stub for @vercel/blob in jest.
 * Real uploads happen against the Vercel Blob service in dev/prod; tests must
 * never exercise the network. Each fn is a jest.fn() so individual tests can
 * assert on calls or override return values.
 */

export const put = jest.fn(async (pathname: string, _body: Buffer | Uint8Array | string) => ({
  url: `https://blob.test.local/${pathname}-suffix`,
  pathname: `${pathname}-suffix`,
  contentType: 'application/pdf',
  contentDisposition: 'inline',
  downloadUrl: `https://blob.test.local/${pathname}-suffix?download=1`,
}));

export const del = jest.fn(async () => undefined);

export const head = jest.fn();

export type PutBlobResult = {
  url: string;
  pathname: string;
  contentType: string;
  contentDisposition: string;
  downloadUrl: string;
};
