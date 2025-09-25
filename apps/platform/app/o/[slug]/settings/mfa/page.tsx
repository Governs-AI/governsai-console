'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@governs-ai/ui';
import { Input } from '@governs-ai/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@governs-ai/ui';
import QRCode from 'qrcode';

interface TotpStatus {
  enabled: boolean;
  secret?: string;
  qrCodeUrl?: string;
}

export default function MfaSettingsPage() {
  const [totpStatus, setTotpStatus] = useState<TotpStatus>({ enabled: false });
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const params = useParams();
  const orgSlug = params.slug as string;

  useEffect(() => {
    // Check current TOTP status
    checkTotpStatus();
  }, []);

  const checkTotpStatus = async () => {
    try {
      // This would be an API call to get current TOTP status
      // For now, we'll simulate it
      setTotpStatus({ enabled: false });
    } catch (err) {
      console.error('Failed to check TOTP status:', err);
    }
  };

  const handleSetup = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/mfa/totp/setup', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to setup TOTP');
        return;
      }

      setTotpStatus({
        enabled: false,
        secret: data.secret,
        qrCodeUrl: data.qrCodeUrl,
      });

      // Generate QR code
      if (data.qrCodeUrl) {
        const qrDataUrl = await QRCode.toDataURL(data.qrCodeUrl);
        setQrCodeDataUrl(qrDataUrl);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnable = async () => {
    if (!verificationCode) {
      setError('Please enter the verification code');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/mfa/totp/enable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: verificationCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to enable TOTP');
        return;
      }

      setSuccess('TOTP enabled successfully!');
      setTotpStatus({ enabled: true });
      setVerificationCode('');
      setQrCodeDataUrl('');
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!verificationCode) {
      setError('Please enter the verification code');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/mfa/totp/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: verificationCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to disable TOTP');
        return;
      }

      setSuccess('TOTP disabled successfully!');
      setTotpStatus({ enabled: false });
      setVerificationCode('');
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Security Settings
              </h1>
              <span className="ml-4 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {orgSlug}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Two-Factor Authentication (2FA)</CardTitle>
            <p className="text-gray-600">
              Add an extra layer of security to your account with TOTP (Time-based One-Time Password)
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            {success && (
              <div className="text-green-600 text-sm bg-green-50 p-3 rounded-md">
                {success}
              </div>
            )}

            {!totpStatus.enabled && !totpStatus.secret && (
              <div className="text-center">
                <p className="text-gray-600 mb-4">
                  Two-factor authentication is not enabled for your account.
                </p>
                <Button onClick={handleSetup} disabled={loading}>
                  {loading ? 'Setting up...' : 'Enable 2FA'}
                </Button>
              </div>
            )}

            {totpStatus.secret && !totpStatus.enabled && (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg font-medium mb-4">Scan QR Code</h3>
                  <p className="text-gray-600 mb-4">
                    Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                  </p>
                  {qrCodeDataUrl && (
                    <div className="flex justify-center">
                      <img src={qrCodeDataUrl} alt="QR Code" className="w-48 h-48" />
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-1">
                    Verification Code
                  </label>
                  <Input
                    id="verificationCode"
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="Enter 6-digit code from your app"
                    maxLength={6}
                    className="max-w-xs"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>

                <div className="flex space-x-4">
                  <Button onClick={handleEnable} disabled={loading || !verificationCode}>
                    {loading ? 'Enabling...' : 'Enable 2FA'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTotpStatus({ enabled: false });
                      setQrCodeDataUrl('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {totpStatus.enabled && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-green-600 font-medium">2FA is enabled</span>
                </div>

                <div>
                  <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700 mb-1">
                    Verification Code
                  </label>
                  <Input
                    id="verificationCode"
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="Enter 6-digit code to disable"
                    maxLength={6}
                    className="max-w-xs"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the 6-digit code from your authenticator app to disable 2FA
                  </p>
                </div>

                <Button
                  variant="destructive"
                  onClick={handleDisable}
                  disabled={loading || !verificationCode}
                >
                  {loading ? 'Disabling...' : 'Disable 2FA'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
