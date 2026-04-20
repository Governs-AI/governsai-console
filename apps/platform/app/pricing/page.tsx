'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser } from '@/lib/user-context';

export default function LegacyPricingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeOrg, loading } = useUser();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!activeOrg) {
      router.replace('/auth/login');
      return;
    }

    const nextQuery = searchParams.toString();
    router.replace(`/o/${activeOrg.slug}/pricing${nextQuery ? `?${nextQuery}` : ''}`);
  }, [activeOrg, loading, router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
        <p className="mt-2 text-sm text-muted-foreground">Redirecting to organization billing…</p>
      </div>
    </div>
  );
}
