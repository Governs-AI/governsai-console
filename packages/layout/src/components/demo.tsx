"use client";

import React, { useState } from 'react';
import { UnifiedLayout, getNavigationConfig } from '../index';
import { Home, User, Settings, FileText, BarChart3, Bell } from 'lucide-react';

// Mock user data
const mockUser = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  avatar: undefined,
  plan: 'Pro',
  streakDays: 7,
};

// Mock navigation
const mockNavigation = {
  primary: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: '/dashboard',
      icon: Home,
    },
    {
      id: 'profile',
      label: 'Profile',
      href: '/profile',
      icon: User,
    },
    {
      id: 'resumes',
      label: 'Resumes',
      href: '/resumes',
      icon: FileText,
    },
    {
      id: 'analytics',
      label: 'Analytics',
      href: '/analytics',
      icon: BarChart3,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      href: '/notifications',
      icon: Bell,
    },
  ],
  secondary: [],
  appSpecific: {},
  quickActions: [],
};

export function LayoutDemo() {
  const [currentPage, setCurrentPage] = useState('dashboard');

  const handleUserAction = (action: string) => {
    console.log('User action:', action);
  };

  const handleNavigationChange = (item: any) => {
    console.log('Navigation change:', item);
    setCurrentPage(item.id);
  };

  return (
    <UnifiedLayout
      mode="standard"
      navigation={mockNavigation}
      user={mockUser}
      showSidebar={true}
      showHeader={true}
      onUserAction={handleUserAction}
      onNavigationChange={handleNavigationChange}
    >
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Responsive Layout Demo - Fixed Issues
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            This demo shows the fixed responsive layout with proper height management, no header overlay, and correct bottom navigation spacing.
          </p>
          
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <h2 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                ✅ Fixed Issues:
              </h2>
              <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                <li>• Header no longer overlays content</li>
                <li>• Proper height management (h-screen instead of min-h-screen)</li>
                <li>• Bottom navigation properly spaced (pb-20 on mobile)</li>
                <li>• Content scrolls within main area, not entire page</li>
                <li>• No unnecessary long scrolling</li>
              </ul>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h2 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Mobile Features:
              </h2>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Hamburger menu in header to toggle sidebar</li>
                <li>• Bottom navigation bar for quick access</li>
                <li>• Responsive sidebar that slides in from left</li>
                <li>• Overlay background when sidebar is open</li>
                <li>• Content properly spaced above bottom navigation</li>
              </ul>
            </div>
            
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <h2 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                Desktop Features:
              </h2>
              <ul className="text-sm text-purple-800 dark:text-purple-200 space-y-1">
                <li>• Fixed sidebar always visible</li>
                <li>• Collapsible sidebar with toggle button</li>
                <li>• No hamburger menu (not needed)</li>
                <li>• No bottom navigation (not needed)</li>
                <li>• Content scrolls within main area</li>
              </ul>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <h2 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                Current Page: {currentPage}
              </h2>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                Try clicking on different navigation items to see the navigation change.
              </p>
            </div>
          </div>
        </div>
        
        {/* Add lots of content to test scrolling */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 20 }, (_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Card {i + 1}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
                This is a sample card to demonstrate the layout. Resize your browser window to see the responsive behavior.
              </p>
              <div className="space-y-2">
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Test section for bottom spacing */}
        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg">
          <h2 className="font-semibold text-red-900 dark:text-red-100 mb-2">
            Bottom Test Section
          </h2>
          <p className="text-sm text-red-800 dark:text-red-200">
            This section should be visible above the bottom navigation on mobile. 
            If you can see this text clearly, the bottom spacing is working correctly.
          </p>
        </div>
      </div>
    </UnifiedLayout>
  );
} 