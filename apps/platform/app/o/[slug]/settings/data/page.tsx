'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  PageHeader,
} from '@governs-ai/ui';
import {
  Archive,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import PlatformShell from '@/components/platform-shell';
import { useOrgReady } from '@/lib/use-org-ready';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

type ArchiveMode = 'copy' | 'move';

interface IncludeState {
  contextMemory: boolean;
  contextChunks: boolean;
  conversations: boolean;
  decisions: boolean;
  usageRecords: boolean;
  purchaseRecords: boolean;
  contextAccessLogs: boolean;
}

const defaultInclude: IncludeState = {
  contextMemory: true,
  contextChunks: true,
  conversations: true,
  decisions: true,
  usageRecords: true,
  purchaseRecords: true,
  contextAccessLogs: true,
};

type HistoryItem = {
  id: string;
  action: string;
  createdAt: string;
  user?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
  details?: Record<string, any> | null;
};

const MAX_UPLOAD_MB = 100;

export default function DataSettingsPage() {
  const params = useParams();
  const orgSlug = params.slug as string;
  const { org, isReady, loading: orgLoading } = useOrgReady(orgSlug);

  const [archiveStart, setArchiveStart] = useState('');
  const [archiveEnd, setArchiveEnd] = useState('');
  const [archiveMode, setArchiveMode] = useState<ArchiveMode>('copy');
  const [include, setInclude] = useState<IncludeState>(defaultInclude);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archivePhase, setArchivePhase] = useState<'idle' | 'preparing' | 'downloading'>('idle');
  const [archiveBytes, setArchiveBytes] = useState(0);
  const [archiveTotal, setArchiveTotal] = useState<number | null>(null);
  const [archiveError, setArchiveError] = useState('');
  const [archiveSuccess, setArchiveSuccess] = useState('');

  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreBytes, setRestoreBytes] = useState(0);
  const [restoreTotal, setRestoreTotal] = useState<number | null>(null);
  const [restoreProgress, setRestoreProgress] = useState<number | null>(null);
  const [restoreError, setRestoreError] = useState('');
  const [restoreSuccess, setRestoreSuccess] = useState('');

  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  const handleIncludeToggle = (key: keyof IncludeState) => {
    setInclude(prev => {
      const next = { ...prev, [key]: !prev[key] };
      if (key === 'contextMemory' && !next.contextMemory) {
        next.contextChunks = false;
      }
      return next;
    });
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  };

  const formatHistoryCounts = (counts?: Record<string, any>) => {
    if (!counts) return 'No counts recorded';
    const parts: string[] = [];
    if (counts.contextMemory !== undefined) parts.push(`contexts: ${counts.contextMemory}`);
    if (counts.contextChunks !== undefined) parts.push(`chunks: ${counts.contextChunks}`);
    if (counts.decisions !== undefined) parts.push(`decisions: ${counts.decisions}`);
    if (counts.usageRecords !== undefined) parts.push(`usage: ${counts.usageRecords}`);
    if (counts.purchaseRecords !== undefined) parts.push(`purchases: ${counts.purchaseRecords}`);
    if (counts.contextAccessLogs !== undefined) parts.push(`access logs: ${counts.contextAccessLogs}`);
    return parts.length ? parts.join(' | ') : 'No counts recorded';
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      setHistoryError('');
      const response = await fetch('/api/v1/retention/history?limit=20', {
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to load retention history.');
      }
      const data = await response.json();
      setHistoryItems(data.items || []);
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : 'Failed to load retention history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady) return;
    fetchHistory();
  }, [isReady, orgSlug]);

  const buildArchivePayload = () => {
    const startTime = archiveStart ? new Date(archiveStart) : null;
    const endTime = archiveEnd ? new Date(archiveEnd) : null;

    if (startTime && Number.isNaN(startTime.getTime())) {
      throw new Error('Start time is invalid.');
    }
    if (endTime && Number.isNaN(endTime.getTime())) {
      throw new Error('End time is invalid.');
    }
    if (startTime && endTime && startTime > endTime) {
      throw new Error('Start time must be before end time.');
    }

    return {
      startTime: startTime ? startTime.toISOString() : undefined,
      endTime: endTime ? endTime.toISOString() : undefined,
      mode: archiveMode,
      include,
    };
  };

  const handleArchive = async () => {
    setArchiveError('');
    setArchiveSuccess('');

    if (archiveMode === 'move') {
      const confirmed = window.confirm(
        'This will export and then remove matching records from the database. Continue?'
      );
      if (!confirmed) return;
    }

    let payload: any;
    try {
      payload = buildArchivePayload();
    } catch (error) {
      setArchiveError(error instanceof Error ? error.message : 'Invalid archive settings.');
      return;
    }

    try {
      setArchiveLoading(true);
      setArchivePhase('preparing');
      setArchiveBytes(0);
      setArchiveTotal(null);
      const response = await fetch('/api/v1/retention/archive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to create archive.');
      }

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? Number(contentLength) : null;
      if (totalBytes && !Number.isNaN(totalBytes)) {
        setArchiveTotal(totalBytes);
      }

      let blob: Blob;
      if (response.body) {
        setArchivePhase('downloading');
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            received += value.length;
            setArchiveBytes(received);
          }
        }

        blob = new Blob(chunks, { type: 'application/json' });
      } else {
        blob = await response.blob();
      }
      const contentDisposition = response.headers.get('content-disposition');
      const filenameMatch = contentDisposition?.match(/filename=\"?([^\";]+)\"?/i);
      const filename = filenameMatch?.[1] || `governsai-archive-${orgSlug}.json`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setArchiveSuccess('Archive downloaded successfully.');
      await fetchHistory();
    } catch (error) {
      setArchiveError(error instanceof Error ? error.message : 'Failed to create archive.');
    } finally {
      setArchiveLoading(false);
      setArchivePhase('idle');
    }
  };

  const handleRestore = async () => {
    setRestoreError('');
    setRestoreSuccess('');

    if (!restoreFile) {
      setRestoreError('Select an archive file to restore.');
      return;
    }

    try {
      setRestoreLoading(true);
      setRestoreBytes(0);
      setRestoreTotal(null);
      setRestoreProgress(null);
      const formData = new FormData();
      formData.append('file', restoreFile);

      const result = await new Promise<any>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/v1/retention/restore');
        xhr.withCredentials = true;
        xhr.upload.onprogress = (event) => {
          if (!event) return;
          setRestoreBytes(event.loaded);
          if (event.lengthComputable) {
            setRestoreTotal(event.total);
            const pct = Math.round((event.loaded / event.total) * 100);
            setRestoreProgress(Math.min(100, pct));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch (error) {
              reject(new Error('Restore response was invalid.'));
            }
          } else {
            try {
              const payload = JSON.parse(xhr.responseText);
              reject(new Error(payload.error || 'Failed to restore archive.'));
            } catch {
              reject(new Error('Failed to restore archive.'));
            }
          }
        };
        xhr.onerror = () => reject(new Error('Network error while restoring archive.'));
        xhr.send(formData);
      });
      const restored = result?.restored || {};
      const summary = [
        `contexts: ${restored.contextMemory || 0}`,
        `chunks: ${restored.contextChunks || 0}`,
        `decisions: ${restored.decisions || 0}`,
        `usage: ${restored.usageRecords || 0}`,
        `purchases: ${restored.purchaseRecords || 0}`,
      ].join(', ');

      setRestoreSuccess(`Restore complete (${summary}).`);
      setRestoreFile(null);
      await fetchHistory();
    } catch (error) {
      setRestoreError(error instanceof Error ? error.message : 'Failed to restore archive.');
    } finally {
      setRestoreLoading(false);
    }
  };

  if (!orgLoading && !org) {
    return (
      <PlatformShell orgSlug={orgSlug}>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Organization not found.</p>
        </div>
      </PlatformShell>
    );
  }

  if (!isReady) {
    return (
      <PlatformShell orgSlug={orgSlug}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PlatformShell>
    );
  }

  const archiveProgress =
    archiveTotal && archiveBytes ? Math.min(100, Math.round((archiveBytes / archiveTotal) * 100)) : null;
  const restoreProgressValue =
    restoreProgress !== null
      ? restoreProgress
      : restoreTotal && restoreBytes
        ? Math.min(100, Math.round((restoreBytes / restoreTotal) * 100))
        : null;

  return (
    <PlatformShell orgSlug={orgSlug}>
      <div className="space-y-6">
        <PageHeader
          title="Data & Retention"
          subtitle="Export and restore AI interaction logs, embeddings, and governance records."
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5" />
                Create Archive
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Build a JSON archive that you can download and store anywhere. Embeddings are included.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="archiveStart">Start time</Label>
                    <Input
                      id="archiveStart"
                      type="datetime-local"
                      value={archiveStart}
                      onChange={(e) => setArchiveStart(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="archiveEnd">End time</Label>
                    <Input
                      id="archiveEnd"
                      type="datetime-local"
                      value={archiveEnd}
                      onChange={(e) => setArchiveEnd(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Archive mode</p>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 text-sm">
                    <input
                      type="radio"
                      name="archiveMode"
                      checked={archiveMode === 'copy'}
                      onChange={() => setArchiveMode('copy')}
                      className="mt-1"
                    />
                    <span>
                      <span className="font-medium text-foreground">Copy</span>
                      <span className="block text-muted-foreground">
                        Export without removing data from the database.
                      </span>
                    </span>
                  </label>
                  <label className="flex items-start gap-3 text-sm">
                    <input
                      type="radio"
                      name="archiveMode"
                      checked={archiveMode === 'move'}
                      onChange={() => setArchiveMode('move')}
                      className="mt-1"
                    />
                    <span>
                      <span className="font-medium text-foreground">Move to cold</span>
                      <span className="block text-muted-foreground">
                        Export and remove matching records; contexts move to cold retention.
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">Include datasets</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={include.contextMemory}
                      onChange={() => handleIncludeToggle('contextMemory')}
                    />
                    Context memory
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={include.contextChunks}
                      onChange={() => handleIncludeToggle('contextChunks')}
                      disabled={!include.contextMemory}
                    />
                    Context chunks
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={include.conversations}
                      onChange={() => handleIncludeToggle('conversations')}
                    />
                    Conversations
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={include.decisions}
                      onChange={() => handleIncludeToggle('decisions')}
                    />
                    Decisions
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={include.usageRecords}
                      onChange={() => handleIncludeToggle('usageRecords')}
                    />
                    Usage records
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={include.purchaseRecords}
                      onChange={() => handleIncludeToggle('purchaseRecords')}
                    />
                    Purchase records
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={include.contextAccessLogs}
                      onChange={() => handleIncludeToggle('contextAccessLogs')}
                    />
                    Access logs
                  </label>
                </div>
              </div>

              {archiveLoading && archivePhase === 'downloading' && (
                <div className="space-y-2">
                  {archiveProgress !== null ? (
                    <Progress value={archiveProgress} />
                  ) : (
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full w-1/3 bg-primary animate-pulse" />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Downloaded {formatBytes(archiveBytes)}
                    {archiveTotal ? ` of ${formatBytes(archiveTotal)}` : ''}
                  </p>
                </div>
              )}

              {archiveError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-700">{archiveError}</span>
                </div>
              )}

              {archiveSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-700">{archiveSuccess}</span>
                </div>
              )}

              <Button onClick={handleArchive} disabled={archiveLoading}>
                {archiveLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    {archivePhase === 'downloading' ? 'Downloading...' : 'Preparing...'}
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download Archive
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Restore Archive
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <p className="text-sm text-muted-foreground">
                Upload an archive file to restore records and embeddings for this organization.
              </p>
              <div className="space-y-2">
                <Label htmlFor="archiveFile">Archive file</Label>
                <Input
                  id="archiveFile"
                  type="file"
                  accept="application/json"
                  onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                />
              </div>

              {restoreLoading && (
                <div className="space-y-2">
                  {restoreProgressValue !== null ? (
                    <Progress value={restoreProgressValue} />
                  ) : (
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full w-1/3 bg-primary animate-pulse" />
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Uploaded {formatBytes(restoreBytes)}
                    {restoreTotal ? ` of ${formatBytes(restoreTotal)}` : ''}
                  </p>
                </div>
              )}

              {restoreError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm text-red-700">{restoreError}</span>
                </div>
              )}

              {restoreSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-700">{restoreSuccess}</span>
                </div>
              )}

              <Button onClick={handleRestore} disabled={restoreLoading || !restoreFile}>
                {restoreLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Restore Archive
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Archive History</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            {historyLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading history...
              </div>
            ) : historyError ? (
              <div className="text-sm text-red-600">{historyError}</div>
            ) : historyItems.length === 0 ? (
              <p>No archive activity yet.</p>
            ) : (
              <div className="space-y-3">
                {historyItems.map((item) => {
                  const details = item.details || {};
                  const counts = details.counts || details.restored;
                  const modeLabel = details.mode ? `${details.mode.toUpperCase()}` : 'RESTORE';
                  const rangeStart = details.range?.startTime
                    ? new Date(details.range.startTime).toLocaleString()
                    : null;
                  const rangeEnd = details.range?.endTime
                    ? new Date(details.range.endTime).toLocaleString()
                    : null;
                  const userLabel = item.user?.name || item.user?.email || 'System';
                  const actionLabel = item.action === 'retention.archive' ? 'Archive' : 'Restore';
                  const fileLabel = details.fileName ? `File: ${details.fileName}` : null;
                  const fileSizeLabel = details.fileSize
                    ? `Size: ${formatBytes(Number(details.fileSize))}`
                    : null;

                  return (
                    <div key={item.id} className="border border-border rounded-lg p-3 text-sm">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <div className="font-medium text-foreground">
                            {actionLabel} | {modeLabel}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(item.createdAt).toLocaleString()} | {userLabel}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatHistoryCounts(counts)}
                        </div>
                      </div>
                      {(rangeStart || rangeEnd || fileLabel || fileSizeLabel) && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          {rangeStart && rangeEnd
                            ? `Range: ${rangeStart} -> ${rangeEnd}`
                            : rangeStart
                              ? `Range start: ${rangeStart}`
                              : rangeEnd
                                ? `Range end: ${rangeEnd}`
                                : null}
                          {fileLabel ? `${rangeStart || rangeEnd ? ' | ' : ''}${fileLabel}` : ''}
                          {fileSizeLabel ? `${fileLabel || rangeStart || rangeEnd ? ' | ' : ''}${fileSizeLabel}` : ''}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Archives are scoped to your organization. Restores will reject files from a different org.
            </p>
            <p>
              Large exports can take several minutes to prepare. Keep this tab open until the download finishes.
            </p>
            <p>
              Uploads are limited to {MAX_UPLOAD_MB} MB by default. Adjust the server limit with
              the <code>ARCHIVE_MAX_BYTES</code> environment variable if needed.
            </p>
            <p>
              Move mode clears embeddings and context chunks from the database to reduce storage while
              keeping an offline copy you control.
            </p>
          </CardContent>
        </Card>
      </div>
    </PlatformShell>
  );
}
