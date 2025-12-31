'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name?: string;
  emailVerified?: string | null;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export interface AuthContext {
  user: User | null;
  organizations: Organization[];
  activeOrg: Organization | null;
  loading: boolean;
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthContext>({
    user: null,
    organizations: [],
    activeOrg: null,
    loading: true,
  });
  
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    checkAuthStatus();
  }, [pathname]);

  const checkAuthStatus = async () => {
    try {
      // Load user data for authenticated routes
      const response = await fetch('/api/v1/profile', {
        method: 'GET',
        credentials: 'include', // Include cookies
      });

      if (!response.ok) {
        // This shouldn't happen since middleware handles auth, but just in case
        router.replace('/auth/login');
        return;
      }

      const data = await response.json();
      
      // Check if email is verified
      if (!data.user.emailVerified) {
        router.replace('/auth/verify-email');
        return;
      }

      // Check if user has organizations
      if (!data.organizations || data.organizations.length === 0) {
        router.replace('/onboarding');
        return;
      }

      // Update auth state
      setAuthState({
        user: data.user,
        organizations: data.organizations,
        activeOrg: data.activeOrg,
        loading: false,
      });

    } catch (error) {
      console.error('Auth check failed:', error);
      router.replace('/auth/login');
    }
  };

  // Show loading spinner while checking auth
  if (authState.loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
