'use client';

import { useState } from 'react';
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

export default function DataSettingsPage() {
  const params = useParams();
  const orgSlug = params.slug as string;
  const { org, isReady, loading: orgLoading } = useOrgReady(orgSlug);

  const [archiveStart, setArchiveStart] = useState('');
  const [archiveEnd, setArchiveEnd] = useState('');
  const [archiveMode, setArchiveMode] = useState<ArchiveMode>('copy');
  const [include, setInclude] = useState<IncludeState>(defaultInclude);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState('');
  const [archiveSuccess, setArchiveSuccess] = useState('');

  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [restoreSuccess, setRestoreSuccess] = useState('');

  const handleIncludeToggle = (key: keyof IncludeState) => {
    setInclude(prev => {
      const next = { ...prev, [key]: !prev[key] };
      if (key === 'contextMemory' && !next.contextMemory) {
        next.contextChunks = false;
      }
      return next;
    });
  };

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

      const blob = await response.blob();
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
    } catch (error) {
      setArchiveError(error instanceof Error ? error.message : 'Failed to create archive.');
    } finally {
      setArchiveLoading(false);
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
      const formData = new FormData();
      formData.append('file', restoreFile);

      const response = await fetch('/api/v1/retention/restore', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to restore archive.');
      }

      const result = await response.json();
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
                    Preparing...
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
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Archives are scoped to your organization. Restores will reject files from a different org.
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
