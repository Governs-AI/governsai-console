import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

export type LayoutMode = 'standard' | 'fullscreen' | 'minimal';

export interface BadgeConfig {
  text: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  color?: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: BadgeConfig;
  children?: NavigationItem[];
  permissions?: string[];
  external?: boolean;
  disabled?: boolean;
}

export interface QuickAction {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  variant?: 'default' | 'secondary' | 'outline';
  external?: boolean;
}

export interface NavigationConfig {
  primary: NavigationItem[];
  secondary: NavigationItem[];
  quickActions?: QuickAction[];
  appSpecific?: Record<string, NavigationItem[]>;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  plan?: string;
  streakDays?: number;
}

export interface LayoutProps {
  children: ReactNode;
  mode?: LayoutMode;
  navigation?: NavigationConfig;
  user?: User;
  showSidebar?: boolean;
  showHeader?: boolean;
  className?: string;
  onNavigationChange?: (item: NavigationItem) => void;
  onUserAction?: (action: string) => void;
}

export interface HeaderProps {
  user?: User;
  navigation?: NavigationItem[];
  showNavigation?: boolean;
  onUserAction?: (action: string) => void;
  onThemeToggle?: () => void;
  onSearch?: (query: string) => void;
  className?: string;
}

export interface SidebarProps {
  navigation: NavigationConfig;
  user?: User;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigationChange?: (item: NavigationItem) => void;
  onUserAction?: (action: string) => void;
  onThemeToggle?: () => void;
  currentTheme?: string;
  className?: string;
  onMobileNavigationClick?: () => void;
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: LucideIcon;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

// App-specific navigation configurations
export const APP_NAVIGATION_CONFIGS: Record<string, NavigationConfig> = {
  dashboard: {
    primary: [],
    secondary: [],
    quickActions: []
  },
  resume: {
    primary: [],
    secondary: [],
    quickActions: []
  },
  interview: {
    primary: [],
    secondary: [],
    quickActions: []
  },
  jobs: {
    primary: [],
    secondary: [],
    quickActions: []
  }
}; 