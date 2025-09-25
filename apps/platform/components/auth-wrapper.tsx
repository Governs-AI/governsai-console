'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function AuthWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    // Simple client-side auth check
    const sessionToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('session='))
      ?.split('=')[1];

    if (!sessionToken) {
      router.push('/auth/login');
      return;
    }

    // Additional validation could be done here by calling an API endpoint
    // For now, we trust that the server-side auth will handle validation
  }, [router]);

  return <>{children}</>;
}
