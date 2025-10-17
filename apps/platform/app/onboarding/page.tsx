'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@governs-ai/ui';
import { Input } from '@governs-ai/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@governs-ai/ui';

export default function OnboardingPage() {
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/v1/orgs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: orgName }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create organization');
        return;
      }

      // Redirect to the new organization's dashboard
      router.push(`/o/${data.org.slug}/dashboard`);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome to GovernsAI</CardTitle>
          <p className="text-gray-600">
            Let's create your first organization to get started
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="orgName" className="block text-sm font-medium text-gray-700 mb-1">
                Organization Name
              </label>
              <Input
                id="orgName"
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
                disabled={loading}
                placeholder="Enter your organization name"
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be used to create your organization URL
              </p>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Creating organization...' : 'Create organization'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
