'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { 
  Button, 
  Input, 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  Badge,
  PageHeader
} from '@governs-ai/ui';
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  Smartphone,
  Key,
  RefreshCw
} from 'lucide-react';
import QRCode from 'qrcode';
import PlatformShell from '@/components/platform-shell';

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
  const [initialLoading, setInitialLoading] = useState(true);
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
      setInitialLoading(true);
      const response = await fetch('/api/v1/totp/status', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setTotpStatus({ 
          enabled: data.enabled || false,
          secret: data.secret,
          qrCodeUrl: data.qrCodeUrl
        });
      } else {
        // If no status endpoint exists, check if user has TOTP enabled
        const response = await fetch('/api/v1/totp/verify', {
          credentials: 'include',
        });
        
        if (response.ok) {
          const data = await response.json();
          setTotpStatus({ enabled: data.enabled || false });
        } else {
          setTotpStatus({ enabled: false });
        }
      }
    } catch (error) {
      console.error('Failed to check TOTP status:', error);
      setTotpStatus({ enabled: false });
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSetup = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/v1/totp/setup', {
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
    } catch {
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
      const response = await fetch('/api/v1/totp/enable', {
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
      // Refresh status to ensure UI is in sync
      await checkTotpStatus();
    } catch {
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
      const response = await fetch('/api/v1/totp/disable', {
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
      // Refresh status to ensure UI is in sync
      await checkTotpStatus();
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <PlatformShell orgSlug={orgSlug}>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PlatformShell>
    );
  }

  return (
    <PlatformShell orgSlug={orgSlug}>
      <div className="space-y-6">
        <PageHeader
          title="Multi-Factor Authentication"
          subtitle="Add an extra layer of security to your account with TOTP (Time-based One-Time Password)"
          actions={
            <div className="flex items-center gap-2">
              <Badge variant={totpStatus.enabled ? "default" : "secondary"}>
                {totpStatus.enabled ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Enabled
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Disabled
                  </>
                )}
              </Badge>
            </div>
          }
        />

        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-green-700">{success}</span>
          </div>
        )}

        {/* MFA Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Two-Factor Authentication Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${totpStatus.enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <Smartphone className={`h-6 w-6 ${totpStatus.enabled ? 'text-green-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className="font-medium">
                    {totpStatus.enabled ? '2FA is enabled' : '2FA is not enabled'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {totpStatus.enabled 
                      ? 'Your account is protected with two-factor authentication'
                      : 'Add an extra layer of security to your account'
                    }
                  </p>
                </div>
              </div>
              {!totpStatus.enabled && !totpStatus.secret && (
                <Button onClick={handleSetup} disabled={loading}>
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4 mr-2" />
                      Enable 2FA
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Setup Flow */}
        {totpStatus.secret && !totpStatus.enabled && (
          <Card>
            <CardHeader>
              <CardTitle>Complete 2FA Setup</CardTitle>
              <p className="text-muted-foreground">
                Scan the QR code with your authenticator app and enter the verification code
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium mb-4">Scan QR Code</h3>
                <p className="text-muted-foreground mb-6">
                  Use your authenticator app (Google Authenticator, Authy, etc.) to scan this QR code
                </p>
                {qrCodeDataUrl && (
                  <div className="flex justify-center">
                    <div className="p-4 bg-white rounded-lg border-2 border-dashed border-border">
                      <Image
                        src={qrCodeDataUrl}
                        alt="QR Code"
                        width={192}
                        height={192}
                        className="w-48 h-48"
                        unoptimized
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="max-w-md mx-auto">
                <label htmlFor="verificationCode" className="block text-sm font-medium mb-2">
                  Verification Code
                </label>
                <Input
                  id="verificationCode"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter 6-digit code from your app"
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                />
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              <div className="flex gap-3 justify-center">
                <Button 
                  onClick={handleEnable} 
                  disabled={loading || !verificationCode}
                  className="min-w-32"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Enabling...
                    </>
                  ) : (
                    'Enable 2FA'
                  )}
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
            </CardContent>
          </Card>
        )}

        {/* Disable Flow */}
        {totpStatus.enabled && (
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Disable 2FA</CardTitle>
              <p className="text-muted-foreground">
                Enter your verification code to disable two-factor authentication
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-md">
                <label htmlFor="verificationCode" className="block text-sm font-medium mb-2">
                  Verification Code
                </label>
                <Input
                  id="verificationCode"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter 6-digit code to disable"
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Enter the 6-digit code from your authenticator app to disable 2FA
                </p>
              </div>

              <Button
                variant="destructive"
                onClick={handleDisable}
                disabled={loading || !verificationCode}
                className="min-w-32"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Disabling...
                  </>
                ) : (
                  'Disable 2FA'
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Security Tips */}
        <Card>
          <CardHeader>
            <CardTitle>Security Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Keep your authenticator app secure</p>
                  <p className="text-sm text-muted-foreground">
                    Use a strong passcode or biometric lock on your device
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Backup your recovery codes</p>
                  <p className="text-sm text-muted-foreground">
                    Save recovery codes in a secure location
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Use a trusted authenticator app</p>
                  <p className="text-sm text-muted-foreground">
                    Google Authenticator, Authy, or Microsoft Authenticator
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Don't share your codes</p>
                  <p className="text-sm text-muted-foreground">
                    Never share your verification codes with anyone
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PlatformShell>
  );
}
