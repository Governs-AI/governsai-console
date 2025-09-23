"use client";

import React, { useEffect } from 'react';
// import { useSession, signOut } from 'next-auth/react';
import { UnifiedLayout, getNavigationConfig } from '@governs-ai/layout';
import { useRouter } from 'next/navigation';
import { CustomTour } from '@/components/custom-tour';
import { useTour } from '@/components/tour-provider';
import { getAuthUrl } from '@governs-ai/common-utils';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  // const { data: session, status } = useSession();
  const session = null;
  const status = 'unauthenticated';
  const router = useRouter();
  const { isTourOpen, closeTour } = useTour();

  // Debug logging for tour state
  console.log('AppLayout tour state:', { isTourOpen, closeTour: typeof closeTour });

  // Convert session user to unified layout user format
  const user = session?.user ? {
    id: session.user.id || '',
    name: session.user.name || 'User',
    email: session.user.email || '',
    avatar: session.user.image || '',
    plan: 'Pro',
    streakDays: 7
  } : undefined;

  // Get navigation configuration
  const navigation = getNavigationConfig('dashboard');

  const handleSignOut = async () => {
    // await signOut({ redirect: false });
    console.log('Sign out clicked');
    router.push('/');
  };

  console.log({isTourOpen})
  const handleUserAction = (action: string) => {
    switch (action) {
      case 'logout':
        handleSignOut();
        break;
      case 'profile':
        router.push('/profile');
        break;
      case 'settings':
        router.push('/settings');
        break;
      default:
        console.log('Unknown user action:', action);
    }
  };

  const handleNavigationChange = (item: any) => {
    router.push(item.href);
  };

  // Handle redirect for unauthenticated users
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push(getAuthUrl());
    }
  }, [status, router]);

  // Show loading state while session is loading
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render anything if not authenticated (redirect will happen in useEffect)
  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <>
      <UnifiedLayout
        mode="standard"
        navigation={navigation}
        user={user}
        showSidebar={true}
        showHeader={true}
        onUserAction={handleUserAction}
        onNavigationChange={handleNavigationChange}
      >
        {children}
      </UnifiedLayout>
      
      {/* Custom Tour Component */}
      <CustomTour isOpen={isTourOpen} onClose={closeTour} />
    </>
  );
} 