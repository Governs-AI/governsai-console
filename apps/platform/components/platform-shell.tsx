'use client';

import * as React from 'react';
import { cn, Button } from '@governs-ai/ui';
import { 
  LayoutDashboard, 
  FileText, 
  Activity, 
  CheckCircle, 
  DollarSign, 
  Shield, 
  Key, 
  AlertTriangle, 
  Settings,
  Search,
  Bell,
  User,
  ChevronDown
} from 'lucide-react';

interface PlatformShellProps {
  children: React.ReactNode;
  orgSlug?: string;
}

const getNavigation = (orgSlug: string) => [
  { name: 'Dashboard', href: `/o/${orgSlug}/dashboard`, icon: LayoutDashboard },
  { name: 'Decisions', href: `/o/${orgSlug}/decisions`, icon: FileText },
  { name: 'Tool Calls', href: `/o/${orgSlug}/toolcalls`, icon: Activity },
  { name: 'Approvals', href: `/o/${orgSlug}/approvals`, icon: CheckCircle },
  { name: 'Spend', href: `/o/${orgSlug}/spend`, icon: DollarSign },
  { name: 'Policies', href: `/o/${orgSlug}/policies`, icon: Shield },
  { name: 'Keys', href: `/o/${orgSlug}/keys`, icon: Key },
  { name: 'DLQ', href: `/o/${orgSlug}/dlq`, icon: AlertTriangle },
  { name: 'Settings', href: `/o/${orgSlug}/settings`, icon: Settings },
];

export default function PlatformShell({ children, orgSlug = 'acme-inc' }: PlatformShellProps) {
  const [sidebarExpanded, setSidebarExpanded] = React.useState(false);
  const navigation = getNavigation(orgSlug);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 h-full w-64 border-r border-border bg-card/70 backdrop-blur transition-transform duration-150 ease-pleasant",
        sidebarExpanded ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b border-border px-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-brand flex items-center justify-center">
                <span className="text-brand-foreground font-bold text-sm">G</span>
              </div>
              <span className="font-semibold text-foreground">GovernsAI</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.name}
                  href={item.href}
                  className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors duration-150 ease-pleasant"
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </a>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-border p-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <User className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">John Doe</p>
                <p className="text-xs text-muted-foreground truncate">john@acme.com</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur">
          <div className="flex h-14 items-center justify-between px-6">
            <div className="flex items-center gap-3">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarExpanded(!sidebarExpanded)}
              >
                <LayoutDashboard className="h-4 w-4" />
              </Button>

              {/* Org switcher */}
              <div className="flex items-center gap-2">
                <div className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium">
                  {orgSlug}
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </div>

              {/* Search */}
              <div className="hidden md:block">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    className="w-64 rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand"
                    placeholder="Search..."
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Notifications */}
              <Button variant="ghost" size="icon">
                <Bell className="h-4 w-4" />
              </Button>

              {/* Theme toggle */}
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>

              {/* User avatar */}
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <User className="h-4 w-4" />
              </div>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="p-6">
          {children}
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarExpanded && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarExpanded(false)}
        />
      )}
    </div>
  );
}
