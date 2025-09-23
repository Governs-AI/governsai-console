// Main layout components
export { UnifiedLayout } from './components/unified-layout';
export { UnifiedHeader } from './components/unified-header';
export { UnifiedSidebar } from './components/unified-sidebar';
export { ThemeProvider } from './components/theme-provider';
export { ThemeInitializer } from './components/theme-initializer';
export { LayoutDemo } from './components/demo';

// User action utilities
export { createUserActionHandlers, handleUserAction } from './utils/user-actions';
export type { UserActionHandlers } from './utils/user-actions';

// Navigation configuration
export { 
  STANDARD_NAVIGATION, 
  APP_SPECIFIC_NAVIGATION,
  getNavigationConfig,
  createNavigationConfig,
  hasPermission,
  filterNavigationByPermissions
} from './components/navigation-config';

// Types
export type {
  LayoutMode,
  BadgeConfig,
  NavigationItem,
  QuickAction,
  NavigationConfig,
  User,
  LayoutProps,
  HeaderProps,
  SidebarProps,
  BreadcrumbItem,
  BreadcrumbsProps
} from './types/layout';

// Utilities
export {
  cn,
  formatUserName,
  getUserInitials,
  isExternalUrl,
  getActiveNavigationItem,
  generateBreadcrumbs,
  debounce,
  throttle,
  isInViewport,
  scrollIntoView
} from './utils'; 