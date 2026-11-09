'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@governs-ai/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@governs-ai/ui';
import { startAuthentication } from '@simplewebauthn/browser';
import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/browser';
import {
  confirmationStatusCopy,
  effectiveStatus,
  isAwaitingDecision,
} from '@/lib/confirmation-lifecycle';

const STATUS_PILL = {
  warning: 'bg-yellow-100 text-yellow-800',
  success: 'bg-green-100 text-green-800',
  destructive: 'bg-red-100 text-red-800',
  secondary: 'bg-gray-200 text-gray-800',
} as const;

interface ConfirmationDetails {
  id: string;
  correlationId: string;
  userId: string;
  orgId: string;
  requestType: string;
  requestDesc: string;
  requestPayload: any;
  decision: string;
  reasons: string[];
  status: string;
  expiresAt: string;
  createdAt: string;
  approvedAt: string | null;
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  org: {
    id: string;
    name: string;
    slug: string;
  };
}

/** Loading the request: exactly one of these at a time. */
type LoadState =
  | { kind: 'loading' }
  | { kind: 'failed'; httpStatus: number | null; message: string }
  | { kind: 'ready'; confirmation: ConfirmationDetails };

/** What the reviewer's click is doing right now. */
type ActionState = 'idle' | 'approving' | 'denying';

/** Result of the last click. The request's own state is shown separately. */
type Notice = { tone: 'success' | 'error'; message: string } | null;

export default function ConfirmationPage() {
  const [load, setLoad] = useState<LoadState>({ kind: 'loading' });
  const [action, setAction] = useState<ActionState>('idle');
  const [notice, setNotice] = useState<Notice>(null);

  const params = useParams();
  const correlationId = params.correlationId as string;
  const isReady = load.kind === 'ready';

  useEffect(() => {
    fetchConfirmation();
  }, [correlationId]);

  // Refreshes after an action keep the page on screen; only the first load blanks it.
  const fetchConfirmation = async () => {
    try {
      const response = await fetch(`/api/v1/confirmation/${correlationId}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setLoad({
          kind: 'failed',
          httpStatus: response.status,
          message: errorData.error || 'Failed to fetch confirmation',
        });
        return;
      }

      const data = await response.json();
      setLoad({ kind: 'ready', confirmation: data.confirmation });
    } catch (err) {
      console.error('Error fetching confirmation:', err);
      setLoad({
        kind: 'failed',
        httpStatus: null,
        message: err instanceof Error ? err.message : 'Failed to load confirmation',
      });
    }
  };

  const handleApprove = async () => {
    if (!isReady) return;

    setNotice(null);
    setAction('approving');

    try {
      // Step 1: Get authentication challenge
      const challengeResponse = await fetch('/api/v1/confirmation/auth-challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ correlationId }),
      });

      const challengeData = await challengeResponse.json().catch(() => ({}));

      // No passkey registered: approve with the signed-in session instead.
      // Passkeys remain the stronger step-up when the user has one.
      if (String(challengeData.error || '').includes('No passkeys registered')) {
        const sessionResponse = await fetch(`/api/v1/confirmation/${correlationId}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
        if (!sessionResponse.ok) {
          const errorData = await sessionResponse.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to approve confirmation');
        }
        setNotice({ tone: 'success', message: 'Approved. The requesting agent will continue automatically.' });
        await fetchConfirmation();
        return;
      }

      if (!challengeResponse.ok) {
        console.error('Auth challenge error:', challengeData);
        throw new Error(challengeData.error || 'Failed to get authentication challenge');
      }

      const { options } = challengeData;

      // Step 2: Start WebAuthn authentication
      const credential = await startAuthentication({ optionsJSON: options as PublicKeyCredentialRequestOptionsJSON });

      // Step 3: Verify and approve
      const verifyResponse = await fetch('/api/v1/confirmation/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          correlationId,
          credential,
        }),
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.error || 'Failed to verify authentication');
      }

      await verifyResponse.json();
      setNotice({ tone: 'success', message: 'Approved. You can close this window.' });

      await fetchConfirmation();

    } catch (err) {
      console.error('Error approving confirmation:', err);
      setNotice({
        tone: 'error',
        message: err instanceof Error ? err.message : 'Failed to approve confirmation. Please try again.',
      });
      // The request may have moved on (denied, expired) while we were busy.
      await fetchConfirmation();
    } finally {
      setAction('idle');
    }
  };

  const handleDeny = async () => {
    if (!isReady) return;

    if (!confirm('Are you sure you want to deny this request?')) {
      return;
    }

    setNotice(null);
    setAction('denying');

    try {
      const response = await fetch(`/api/v1/confirmation/${correlationId}/deny`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: '{}',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to deny confirmation');
      }

      setNotice({ tone: 'success', message: 'Denied. You can close this window.' });

      await fetchConfirmation();

    } catch (err) {
      console.error('Error denying confirmation:', err);
      setNotice({
        tone: 'error',
        message: err instanceof Error ? err.message : 'Failed to deny confirmation',
      });
      await fetchConfirmation();
    } finally {
      setAction('idle');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    return `${minutes}m ${seconds}s`;
  };

  if (load.kind === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600">Loading confirmation...</div>
        </div>
      </div>
    );
  }

  if (load.kind === 'failed') {
    const signedOut = load.httpStatus === 401;
    const title =
      signedOut ? 'Sign in to review this request'
      : load.httpStatus === 403 ? 'You cannot view this request'
      : load.httpStatus === 404 ? 'Confirmation Not Found'
      : 'Could not load this request';
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">{title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-gray-600">
              {load.httpStatus === 404
                ? "The confirmation you're looking for could not be found."
                : load.message}
            </p>
            {signedOut && (
              <p className="text-sm text-gray-600">
                <a
                  href="/auth/login"
                  target="_blank"
                  rel="noopener"
                  className="font-medium text-blue-700 hover:text-blue-900"
                >
                  Sign in
                </a>
                , then reload this page.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  const confirmation = load.confirmation;
  const status = effectiveStatus(confirmation);
  const statusCopy = confirmationStatusCopy(status);
  const canProcess = isAwaitingDecision(confirmation);
  const isProcessing = action !== 'idle';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Confirmation Required
              </h1>
              <span className="ml-4 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {confirmation.org.name}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Action Requires Your Approval</CardTitle>
            <p className="text-gray-600">
              Please review the details below and approve or deny this request using your passkey.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {notice && (
              <div
                role={notice.tone === 'error' ? 'alert' : 'status'}
                className={
                  notice.tone === 'error'
                    ? 'text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200'
                    : 'text-green-600 text-sm bg-green-50 p-3 rounded-md border border-green-200'
                }
              >
                {notice.message}
              </div>
            )}

            {/* Status Banner */}
            {!canProcess && (
              <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">Status:</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${STATUS_PILL[statusCopy.tone]}`}>
                    {statusCopy.label.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{statusCopy.summary}</p>
              </div>
            )}

            {/* Request Details */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Request Details</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Description:</span>
                    <p className="text-gray-900 mt-1">{confirmation.requestDesc}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Type:</span>
                    <p className="text-gray-900 mt-1">{confirmation.requestType}</p>
                  </div>
                  {confirmation.reasons && confirmation.reasons.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Reasons:</span>
                      <ul className="list-disc list-inside mt-1 text-gray-900">
                        {confirmation.reasons.map((reason, idx) => (
                          <li key={idx}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div>
                    <span className="text-sm font-medium text-gray-600">Requested by:</span>
                    <p className="text-gray-900 mt-1">
                      {confirmation.user.name || confirmation.user.email}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Created:</span>
                    <p className="text-gray-900 mt-1">{formatDate(confirmation.createdAt)}</p>
                  </div>
                  {canProcess && (
                    <div>
                      <span className="text-sm font-medium text-gray-600">Expires in:</span>
                      <p className="text-gray-900 mt-1 font-mono">
                        {getTimeRemaining(confirmation.expiresAt)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Payload Preview */}
              {confirmation.requestPayload && Object.keys(confirmation.requestPayload).length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Request Payload</h3>
                  <div className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-auto max-h-64">
                    <pre className="text-sm">
                      {JSON.stringify(confirmation.requestPayload, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {canProcess ? (
              <div className="flex space-x-4 pt-4 border-t">
                <Button
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {action === 'approving' ? 'Approving…' : 'Approve with Passkey'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeny}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {action === 'denying' ? 'Denying…' : 'Deny'}
                </Button>
              </div>
            ) : (
              <div className="pt-4 border-t">
                <p className="text-center text-gray-600">
                  This confirmation is no longer active and cannot be processed.
                </p>
              </div>
            )}

            {/* Info Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">About Passkey Confirmation</h4>
              <p className="text-sm text-blue-800 mb-3">
                This action requires confirmation using your passkey for security purposes.
                Click "Approve with Passkey" to authenticate using your device's biometric sensor
                or security key.
              </p>
              {confirmation && (
                <a
                  href={`/o/${confirmation.org.slug}/settings/passkeys`}
                  className="inline-flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900 font-medium"
                >
                  → Register a new passkey
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
