"use client";

import React, { useState } from "react";
import { XPProgress } from "./xp-progress";
import { LiveActivityFeed } from "./live-activity-feed";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  FileText,
  Mic,
  Trophy,
  Briefcase,
  MessageCircle,
  Target,
  Settings,
  Menu,
  X,
  Home,
  Search,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./button";

export interface LiveActivityEvent {
  id: string;
  type: string;
  message: string;
  timestamp: Date;
  user?: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  user?: {
    name: string;
    email: string;
    avatar?: string;
    plan: string;
    streakDays?: number;
  };
  liveEvents?: LiveActivityEvent[];
  xpData?: {
    total: number;
    weekly: number;
  };
  onStreakClick?: () => void;
  showSidebar?: boolean;
  customNavigation?: Array<{
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }>;
  headerComponent?: React.ComponentType<{
    user?: DashboardLayoutProps['user'];
    onStreakClick?: () => void;
    showNavigation?: boolean;
  }>;
}

export function DashboardLayout({
  children,
  user,
  liveEvents = [],
  xpData,
  onStreakClick,
  showSidebar = true,
  customNavigation,
  headerComponent: HeaderComponent,
}: DashboardLayoutProps) {
  const pathname = usePathname();

  // Default navigation items
  const defaultNavigation = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: Home,
      badge: undefined,
    },
    {
      href: "/jobs",
      label: "Jobs",
      icon: Search,
      badge: "3 new",
    },
    {
      href: "/applications",
      label: "Applications",
      icon: Briefcase,
      badge: "24",
    },
    {
      href: "/interview-prep",
      label: "Interview",
      icon: Mic,
      badge: "Ready",
    },
    {
      href: "/profile",
      label: "Profile",
      icon: User,
      badge: undefined,
    },
  ];

  const navigationItems = customNavigation || defaultNavigation;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--primary-bg)" }}
    >
      {/* Header */}
      {HeaderComponent && (
        <HeaderComponent 
          user={user} 
          onStreakClick={onStreakClick} 
          showNavigation={true}
        />
      )}

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        {showSidebar && (
          <aside
            className="hidden lg:block w-64 bg-surface-01 border-r border-border-subtle min-h-screen"
            style={{ backgroundColor: "var(--surface-01)" }}
          >
            <nav className="p-6">
              <div className="space-y-2">
                {navigationItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                        isActive
                          ? "bg-blue-500/20 text-blue-600 font-medium border-l-4 border-blue-500"
                          : "hover:bg-gray-100 hover:text-gray-900"
                      }`}
                      style={{
                        color: isActive
                          ? "var(--text-primary)"
                          : "var(--text-secondary)",
                        backgroundColor: isActive
                          ? "rgba(59, 130, 246, 0.1)"
                          : "transparent",
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            isActive
                              ? "bg-blue-500/30 text-blue-700"
                              : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* XP Progress */}
              {xpData && (
                <div className="mt-8 pt-6 border-t border-border-subtle">
                  <XPProgress totalXP={xpData.total} weeklyXP={xpData.weekly} />
                </div>
              )}
            </nav>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 min-w-0 flex flex-col">
          {/* Content Area */}
          <div className="flex-1 p-4 lg:p-6 pb-20 lg:pb-6">
            <motion.div
              className="max-w-7xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200"
        style={{
          backgroundColor: "var(--surface-01)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <nav className="flex items-center justify-around px-2 py-2">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-all duration-200 relative ${
                  isActive
                    ? "text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
                style={{
                  color: isActive ? "#2563EB" : "var(--text-secondary)",
                }}
              >
                <div className="relative">
                  <Icon
                    className={`w-6 h-6 ${isActive ? "text-blue-600" : "text-gray-500"}`}
                  />
                  {item.badge && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                      {item.badge.includes("new") ? "N" : item.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-xs mt-1 font-medium ${isActive ? "text-blue-600" : "text-gray-500"}`}
                >
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"></div>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Live Activity Feed - Only show on desktop */}
      {/* {liveEvents.length > 0 && (
        <div className="hidden lg:block">
          <LiveActivityFeed events={liveEvents} />
        </div>
      )} */}
    </div>
  );
}
