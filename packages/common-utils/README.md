# `@governs-ai/common-utils`

Shared utility functions and constants for the GovernsAI monorepo.

## 📖 Overview

This package provides common utilities, constants, and helper functions used across all GovernsAI applications, ensuring consistency and reducing code duplication.

## 🚀 Features

- **Navigation Utilities**: URL generation and routing helpers
- **Constants**: Shared application constants and configurations
- **Helper Functions**: Common utility functions for data processing
- **Type Definitions**: Shared TypeScript interfaces and types

## 📦 Installation

This package is automatically installed as a dependency in all GovernsAI projects.

## ⚙️ Usage

### Importing Utilities
```typescript
import { 
  getAppLink, 
  getQuickActionLinks, 
  getLinkAttributes,
  navigationUrls 
} from '@governs-ai/common-utils';
```

### Navigation Functions
```typescript
// Get app-specific links
const dashboardLink = getAppLink('dashboard');
const resumeLink = getAppLink('resumeStudio');

// Get quick action links for dashboard
const quickActions = getQuickActionLinks();

// Get link attributes for external links
const attributes = getLinkAttributes('external');
```

### Navigation URLs
```typescript
// Access predefined navigation URLs
const authUrl = navigationUrls.auth.signin;
const dashboardUrl = navigationUrls.dashboard.home;
const resumeUrl = navigationUrls.resumeStudio.create;
```

## 🔧 Core Functions

### `getAppLink(key: string)`
Returns application-specific navigation links based on the provided key.

**Supported Keys:**
- `dashboard` - Main dashboard
- `usage` - Usage tracking
- `budgets` - Budget management
- `policies` - Policy management
- `analytics` - Analytics dashboard
- `compliance` - Compliance reporting

### `getQuickActionLinks()`
Returns quick action links for the AI governance dashboard interface.

### `getLinkAttributes(category: string)`
Returns appropriate attributes for different link categories (internal, external, tool).

## 📋 Constants

### `navigationUrls`
Predefined navigation URLs for all applications:
- Authentication routes
- Dashboard routes
- Usage tracking routes
- Policy management routes

### `APP_CONFIG`
Application configuration constants:
- App name and description
- Version information
- Keywords and metadata

## 🚀 Scripts

```bash
# Build the package
pnpm run build

# Type check
pnpm run check-types

# Lint
pnpm run lint
```

## 🔗 Related Packages

- `@governs-ai/ui` - Shared UI components
- `@governs-ai/layout` - Layout components
- `@governs-ai/billing` - Billing utilities

## 📝 Contributing

When adding new utilities:
1. Ensure they're truly common across multiple apps
2. Add proper TypeScript types
3. Include JSDoc documentation
4. Update this README with usage examples
5. Test across all consuming applications

## 📄 License

MIT License - see root LICENSE file for details.
