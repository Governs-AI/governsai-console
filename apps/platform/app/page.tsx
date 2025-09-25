'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@governs-ai/ui';

export default function RootPage() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  const checkAuthAndRedirect = async () => {
    try {
      const response = await fetch('/api/profile', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        
        // User is authenticated, redirect to their organization dashboard
        if (data.activeOrg?.slug) {
          router.replace(`/o/${data.activeOrg.slug}/dashboard`);
        } else if (data.organizations && data.organizations.length > 0) {
          // User has orgs but no active org, redirect to first org
          router.replace(`/o/${data.organizations[0].slug}/dashboard`);
        } else {
          // User has no organizations, redirect to onboarding
          router.replace('/onboarding');
        }
      } else {
        // User is not authenticated, redirect to login
        router.replace('/auth/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      // On error, redirect to login
      router.replace('/auth/login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
}