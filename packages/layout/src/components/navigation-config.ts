import {
  Home,
  Search,
  Briefcase,
  FileText,
  Mic,
  BarChart3,
  User,
  Settings,
  Plus,
  Play,
  Target,
  Brain,
  Award,
  MessageCircle,
  Calendar,
  BookOpen,
  Zap,
  Star,
  TrendingUp,
  Users,
  Shield,
  HelpCircle,
  LogOut,
  Bell,
  Sun,
  Moon,
  ChevronDown,
  ExternalLink,
  Download
} from 'lucide-react';
import { NavigationConfig, NavigationItem, QuickAction } from '../types/layout';
import { navigationUrls } from '@governs-ai/common-utils';

// Standard navigation items for the entire platform
export const STANDARD_NAVIGATION: NavigationConfig = {
  primary: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      href: navigationUrls.platform.dashboard(),
      icon: Home,
      badge: undefined,
      external: false,
    },
    {
      id: 'usage',
      label: 'Usage Tracking',
      href: '/usage',
      icon: Search,
      badge: { text: '3 new', variant: 'destructive' },
      external: false,
    },
    {
      id: 'budgets',
      label: 'Budget Control',
      href: '/budgets',
      icon: Briefcase,
      badge: { text: '24', variant: 'secondary' },
      external: false,
    },
    {
      id: 'policies',
      label: 'Policies',
      href: '/policies',
      icon: FileText,
      badge: undefined,
      external: false,
    },
    {
      id: 'compliance',
      label: 'Compliance',
      href: '/compliance',
      icon: Shield,
      badge: { text: 'Ready', variant: 'default' },
      external: false,
    },
    {
      id: 'analytics',
      label: 'AI Analytics',
      href: '/analytics',
      icon: BarChart3,
      badge: undefined,
      external: false,
    },
  ],
  secondary: [
    {
      id: 'profile',
      label: 'Profile',
      href: '/profile',
      icon: User,
      badge: undefined,
    },
    {
      id: 'settings',
      label: 'Settings',
      href: '/settings',
      icon: Settings,
      badge: undefined,
    },
  ],
  quickActions: [
    {
      id: 'view-dashboard',
      label: 'View Dashboard',
      href: '/dashboard',
      icon: Play,
      description: 'Access your AI governance dashboard',
      variant: 'default',
    },
    {
      id: 'track-usage',
      label: 'Track Usage',
      href: '/usage',
      icon: Search,
      description: 'Monitor AI usage patterns',
      variant: 'secondary',
      external: false,
    },
    {
      id: 'manage-policies',
      label: 'Manage Policies',
      href: '/policies',
      icon: Plus,
      description: 'Create and manage AI policies',
      variant: 'secondary',
      external: false,
    },
    {
      id: 'view-budgets',
      label: 'View Budgets',
      href: '/budgets',
      icon: Plus,
      description: 'Monitor spending and budgets',
      variant: 'outline',
      external: false,
    },
  ],
};

// App-specific navigation configurations
export const APP_SPECIFIC_NAVIGATION: Record<string, NavigationItem[]> = {
  auth: [
    {
      id: 'signin',
      label: 'Sign In',
      href: navigationUrls.auth.signin(),
      icon: User,
      badge: undefined,
      external: false,
    },
    {
      id: 'signup',
      label: 'Sign Up',
      href: navigationUrls.auth.signup(),
      icon: User,
      badge: undefined,
      external: false,
    },
    {
      id: 'help',
      label: 'Help',
      href: navigationUrls.auth.help(),
      icon: HelpCircle,
      badge: undefined,
      external: false,
    },
  ],
  dashboard: [
    {
      id: 'dashboard-overview',
      label: 'Overview',
      href: navigationUrls.platform.dashboard(),
      icon: Home,
      badge: undefined,
    }
  ],
  interview: [
    {
      id: 'interview-practice',
      label: 'Practice Mode',
      href: navigationUrls.platform.usage(),
      icon: Play,
      badge: undefined,
    },
    // {
    //   id: 'interview-analysis',
    //   label: 'Analysis',
    //   href: navigationUrls.interview.analysis(),
    //   icon: BarChart3,
    //   badge: undefined,
    // },
    {
      id: 'interview-history',
      label: 'History',
      href: navigationUrls.platform.audit(),
      icon: Calendar,
      badge: undefined,
    },
  ],
  jobs: [
    {
      id: 'job-search',
      label: 'Search Jobs',
      href: '/jobs/search',
      icon: Search,
      badge: undefined,
    },
    {
      id: 'job-matches',
      label: 'Perfect Matches',
      href: '/jobs/matches',
      icon: Target,
      badge: { text: '5', variant: 'default' },
    },
    {
      id: 'job-alerts',
      label: 'Job Alerts',
      href: '/jobs/alerts',
      icon: Bell,
      badge: undefined,
    },
  ],
  applications: [
    {
      id: 'application-tracker',
      label: 'Tracker',
      href: '/applications/tracker',
      icon: Briefcase,
      badge: undefined,
    },
    {
      id: 'application-analytics',
      label: 'Analytics',
      href: '/applications/analytics',
      icon: TrendingUp,
      badge: undefined,
    },
  ],
};

// Function to get navigation config for a specific app
export function getNavigationConfig(appId: string): NavigationConfig {
  const baseConfig = { ...STANDARD_NAVIGATION };

  // Add app-specific navigation if available
  if (APP_SPECIFIC_NAVIGATION[appId]) {
    baseConfig.appSpecific = {
      [appId]: APP_SPECIFIC_NAVIGATION[appId]
    };
  }

  return baseConfig;
}

// Function to get navigation config with custom overrides
export function createNavigationConfig(
  baseConfig: NavigationConfig,
  overrides: Partial<NavigationConfig>
): NavigationConfig {
  return {
    ...baseConfig,
    ...overrides,
    primary: [...(overrides.primary || baseConfig.primary)],
    secondary: [...(overrides.secondary || baseConfig.secondary)],
    quickActions: [...(overrides.quickActions || baseConfig.quickActions || [])],
  };
}

// Utility function to check if user has permission for navigation item
export function hasPermission(item: NavigationItem, userPermissions: string[] = []): boolean {
  if (!item.permissions || item.permissions.length === 0) {
    return true;
  }

  return item.permissions.some(permission => userPermissions.includes(permission));
}

// Utility function to filter navigation items based on permissions
export function filterNavigationByPermissions(
  items: NavigationItem[],
  userPermissions: string[] = []
): NavigationItem[] {
  return items.filter(item => hasPermission(item, userPermissions));
} 