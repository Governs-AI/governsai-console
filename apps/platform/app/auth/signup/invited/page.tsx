'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Input, Card, CardContent, CardHeader, CardTitle } from '@governs-ai/ui';
import Link from 'next/link';
import { useUser } from '@/lib/user-context';

export default function InvitedSignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [inviteStatus, setInviteStatus] = useState<'checking' | 'signup' | 'joined' | 'error'>('checking');
  const [orgInfo, setOrgInfo] = useState<{ id: string; slug: string; name: string } | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('token');
  const { user, loading: userLoading, switchActiveOrg } = useUser();

  useEffect(() => {
    if (!inviteToken) {
      setError('Invalid invitation link. Please contact the person who invited you.');
      setInviteStatus('error');
      return;
    }
    const attemptJoin = async () => {
      try {
        setInviteStatus('checking');
        const response = await fetch('/api/v1/orgs/join', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: inviteToken }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (data.requiresSignup) {
            setInviteStatus('signup');
            setError('');
            if (data.email) {
              setEmail(data.email);
            }
            return;
          }

          setError(data.error || 'Failed to accept invitation');
          setInviteStatus('error');
          return;
        }

        setOrgInfo(data.organization || null);
        setSuccess('Invitation accepted! Please sign in to continue.');
        setInviteStatus('joined');
      } catch {
        setError('An error occurred. Please try again.');
        setInviteStatus('error');
      }
    };

    attemptJoin();
  }, [inviteToken]);

  useEffect(() => {
    if (inviteStatus !== 'joined' || userLoading || !user || !orgInfo) return;

    const switchOrg = async () => {
      const ok = await switchActiveOrg(orgInfo.id);
      if (ok) {
        router.push(`/o/${orgInfo.slug}/dashboard`);
      }
    };

    switchOrg();
  }, [inviteStatus, userLoading, user, orgInfo, switchActiveOrg, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!inviteToken) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/v1/auth/signup/invited', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name,
          inviteToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.requiresLogin) {
          setError('Account already exists. Please sign in to accept the invitation.');
        } else {
          setError(data.error || 'Signup failed');
        }
        return;
      }

      setSuccess('Account created successfully! Please check your email to verify your account.');
      
      // Redirect to login or dashboard after a delay
      setTimeout(() => {
        if (data.org?.slug) {
          router.push(`/o/${data.org.slug}/dashboard`);
        } else {
          router.push('/auth/login');
        }
      }, 3000);

    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!inviteToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Invalid Invitation</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600 mb-4">
              This invitation link is invalid or has expired.
            </p>
            <div className="text-center">
              <Link href="/auth/login" className="text-blue-600 hover:underline">
                Go to Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (inviteStatus === 'checking') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Checking Invitation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-gray-600">
              Validating your invite...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (inviteStatus === 'joined') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Invitation Accepted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600 mb-4">
              You&apos;ve been added to {orgInfo?.name || 'the organization'}.
            </p>
            <div className="text-center">
              <Link href="/auth/login" className="text-blue-600 hover:underline">
                Sign in to continue
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (inviteStatus === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Invitation Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600 mb-4">
              {error || 'This invitation link is invalid or has expired.'}
            </p>
            <div className="text-center">
              <Link href="/auth/login" className="text-blue-600 hover:underline">
                Go to Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Join Organization</CardTitle>
          <p className="text-center text-gray-600">
            You&apos;ve been invited to join an organization. Create your account to get started.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name (Optional)
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password (min 8 characters)"
                required
                minLength={8}
                className="w-full"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md text-sm">
                {success}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Creating Account...' : 'Create Account & Join'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-blue-600 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
