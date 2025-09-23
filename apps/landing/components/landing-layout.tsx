"use client";

import React from 'react';
import { useSession } from 'next-auth/react';
import { UnifiedLayout, getNavigationConfig } from '@governs-ai/layout';
import { useRouter } from 'next/navigation';

interface LandingLayoutProps {
  children: React.ReactNode;
}

export function LandingLayout({ children }: LandingLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Convert session user to unified layout user format
  const user = session?.user ? {
    id: session.user.id || '',
    name: session.user.name || '',
    email: session.user.email || '',
    avatar: session.user.image || undefined,
    plan: 'Free', // Default for landing page
    streakDays: 0,
  } : undefined;

  // Get navigation configuration for landing page
  const navigation = getNavigationConfig('routing');

  // Handle user actions
  const handleUserAction = (action: string) => {
    switch (action) {
      case 'profile':
        router.push('/profile');
        break;
      case 'settings':
        router.push('/settings');
        break;
      case 'logout':
        // This will be handled by the auth system
        console.log('Logout requested');
        break;
      default:
        console.log('Unknown user action:', action);
    }
  };

  // Handle navigation changes
  const handleNavigationChange = (item: any) => {
    router.push(item.href);
  };

  // Handle search
  const handleSearch = (query: string) => {
    // For landing page, search could redirect to job search
    console.log('Global search:', query);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  // Show loading state while session is loading
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <UnifiedLayout
      mode="fullscreen"
      navigation={navigation}
      user={user}
      showSidebar={false}
      showHeader={false}
      onUserAction={handleUserAction}
      onNavigationChange={handleNavigationChange}
    >
      {children}
    </UnifiedLayout>
  );
} 