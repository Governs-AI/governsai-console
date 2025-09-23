/**
 * Navigation utility for GovernsAI platform
 * Centralized management of all app links and external URLs
 */

export interface AppLink {
  name: string;
  href: string;
  description: string;
  icon?: string;
  external?: boolean;
  category: 'internal' | 'external' | 'tool';
}

export interface AppLinks {
  [key: string]: AppLink;
}

/**
 * All available app links in the GovernsAI platform
 */
export const APP_LINKS: AppLinks = {
  // Internal Platform Routes
  dashboard: {
    name: 'Dashboard',
    href: '/dashboard',
    description: 'Main platform dashboard with usage overview',
    category: 'internal'
  },
  usage: {
    name: 'Usage Tracking',
    href: '/usage',
    description: 'Monitor AI usage, costs, and performance',
    category: 'internal'
  },
  budgets: {
    name: 'Budget Control',
    href: '/budgets',
    description: 'Manage spending limits and alerts',
    category: 'internal'
  },
  policies: {
    name: 'Policy Management',
    href: '/policies',
    description: 'Define and enforce AI usage policies',
    category: 'internal'
  },
  audit: {
    name: 'Audit Logs',
    href: '/audit',
    description: 'Complete audit trail of AI interactions',
    category: 'internal'
  },
  apiKeys: {
    name: 'API Keys',
    href: '/api-keys',
    description: 'Manage API keys for AI providers',
    category: 'internal'
  },
  organizations: {
    name: 'Organizations',
    href: '/organizations',
    description: 'Manage organization settings and users',
    category: 'internal'
  },
  profile: {
    name: 'Profile',
    href: '/profile',
    description: 'User profile and account settings',
    category: 'internal'
  },
  settings: {
    name: 'Settings',
    href: '/settings',
    description: 'Platform configuration and preferences',
    category: 'internal'
  },

  // External Apps
  docs: {
    name: 'Documentation',
    href: process.env.NEXT_PUBLIC_DOCS_URL || 'http://localhost:3001',
    description: 'Complete API documentation and guides',
    category: 'external',
    external: true
  },
  landing: {
    name: 'Home',
    href: process.env.NEXT_PUBLIC_LANDING_URL || 'http://localhost:3000',
    description: 'GovernsAI marketing and product information',
    category: 'external',
    external: true
  },

  // External Tools
  openai: {
    name: 'OpenAI',
    href: 'https://platform.openai.com',
    description: 'OpenAI API documentation and management',
    category: 'external',
    external: true
  },
  anthropic: {
    name: 'Anthropic',
    href: 'https://console.anthropic.com',
    description: 'Anthropic Claude API management',
    category: 'external',
    external: true
  },
  google: {
    name: 'Google AI',
    href: 'https://aistudio.google.com',
    description: 'Google AI Studio and API management',
    category: 'external',
    external: true
  }
};

/**
 * Get a specific app link by key
 */
export function getAppLink(key: string): AppLink | undefined {
  return APP_LINKS[key];
}

/**
 * Get all app links of a specific category
 */
export function getAppLinksByCategory(category: 'internal' | 'external' | 'tool'): AppLink[] {
  return Object.values(APP_LINKS).filter(link => link.category === category);
}

/**
 * Get all internal app links
 */
export function getInternalAppLinks(): AppLink[] {
  return getAppLinksByCategory('internal');
}

/**
 * Get all external app links
 */
export function getExternalAppLinks(): AppLink[] {
  return getAppLinksByCategory('external');
}

/**
 * Get app links for main navigation menu
 */
export function getNavigationLinks(): AppLink[] {
  return [
    APP_LINKS.dashboard,
    APP_LINKS.usage,
    APP_LINKS.budgets,
    APP_LINKS.policies,
    APP_LINKS.audit,
    APP_LINKS.apiKeys
  ];
}

/**
 * Get quick action links for dashboard
 */
export function getQuickActionLinks(): AppLink[] {
  return [
    APP_LINKS.usage,
    APP_LINKS.budgets,
    APP_LINKS.apiKeys,
    APP_LINKS.policies
  ];
}

/**
 * Get footer links
 */
export function getFooterLinks(): AppLink[] {
  return [
    APP_LINKS.docs,
    APP_LINKS.landing,
    APP_LINKS.openai,
    APP_LINKS.anthropic
  ];
}

/**
 * Check if a link is external
 */
export function isExternalLink(href: string): boolean {
  return href.startsWith('http://') || href.startsWith('https://');
}

/**
 * Get the appropriate target and rel attributes for a link
 */
export function getLinkAttributes(href: string): { target: string; rel: string } {
  if (isExternalLink(href)) {
    return {
      target: '_blank',
      rel: 'noopener noreferrer'
    };
  }
  return {
    target: '_self',
    rel: ''
  };
}