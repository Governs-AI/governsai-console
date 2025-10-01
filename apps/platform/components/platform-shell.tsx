'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { cn, Button } from '@governs-ai/ui';
import { 
  LayoutDashboard, 
  Activity, 
  DollarSign, 
  Shield, 
  Key, 
  Settings,
  Search,
  Bell,
  User,
  Users,
  ChevronDown,
  MoreVertical,
  LogOut,
  UserCircle
} from 'lucide-react';
import { useUser } from '@/lib/user-context';

interface PlatformShellProps {
  children: React.ReactNode;
  orgSlug?: string;
}

const getNavigation = (orgSlug: string) => [
  { name: 'Dashboard', href: `/o/${orgSlug}/dashboard`, icon: LayoutDashboard },
  // { name: 'Decisions', href: `/o/${orgSlug}/decisions`, icon: FileText },
  { name: 'Tool Calls', href: `/o/${orgSlug}/toolcalls`, icon: Activity },
  // { name: 'Approvals', href: `/o/${orgSlug}/approvals`, icon: CheckCircle },
  { name: 'Spend', href: `/o/${orgSlug}/spend`, icon: DollarSign },
  { name: 'Manage Tools', href: `/o/${orgSlug}/tools`, icon: Activity },
  { name: 'Policies', href: `/o/${orgSlug}/policies`, icon: Shield },
  { name: 'Keys', href: `/o/${orgSlug}/keys`, icon: Key },
  { name: 'Passkeys', href: `/o/${orgSlug}/settings/passkeys`, icon: Key },
  { name: 'Admin Users', href: `/o/${orgSlug}/admin/users`, icon: Users },
  // { name: 'DLQ', href: `/o/${orgSlug}/dlq`, icon: AlertTriangle },
  { name: 'Settings', href: `/o/${orgSlug}/settings`, icon: Settings },
];

export default function PlatformShell({ children, orgSlug = 'acme-inc' }: PlatformShellProps) {
  const [sidebarExpanded, setSidebarExpanded] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  
  // Debug logging
  React.useEffect(() => {
    console.log('PlatformShell - User data:', user);
    console.log('PlatformShell - User loading:', userLoading);
  }, [user, userLoading]);
  const navigation = getNavigation(orgSlug);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        router.push('/auth/login');
      } else {
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Close user menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => {
      if (userMenuOpen) {
        setUserMenuOpen(false);
      }
    };

    if (userMenuOpen) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [userMenuOpen]);

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
                <UserCircle className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                {userLoading ? (
                  <div className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-20 mb-1"></div>
                    <div className="h-3 bg-muted rounded w-24"></div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-foreground truncate">
                      {user?.name || 'User'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user?.email || 'user@example.com'}
                    </p>
                  </>
                )}
              </div>
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
                
                {userMenuOpen && (
                  <div 
                    className="absolute bottom-full right-0 mb-2 w-48 bg-card border border-border rounded-md shadow-lg z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          router.push('/profile');
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      >
                        <User className="h-4 w-4" />
                        Profile
                      </button>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          handleLogout();
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
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
