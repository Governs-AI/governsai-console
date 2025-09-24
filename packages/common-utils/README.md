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
  getPlatformUrl,
  getDocsUrl,
  getLandingUrl,
  getAuthUrl,
  navigationUrls 
} from '@governs-ai/common-utils';
```

### Navigation Functions
```typescript
// Get application URLs
const platformUrl = getPlatformUrl();
const docsUrl = getDocsUrl();
const landingUrl = getLandingUrl();

// Access predefined navigation URLs
const authUrl = navigationUrls.auth.signin;
const dashboardUrl = navigationUrls.platform.dashboard;
const policiesUrl = navigationUrls.platform.policies;
```

## 🔧 Core Functions

### `getPlatformUrl()`
Returns the platform application URL from environment variables.

### `getDocsUrl()`
Returns the documentation application URL from environment variables.

### `getLandingUrl()`
Returns the landing page application URL from environment variables.

### `getAuthUrl()`
Returns the authentication service URL from environment variables.

## 📋 Constants

### `navigationUrls`
Predefined navigation URLs for all applications:
- Platform routes (dashboard, usage, budgets, policies, audit, apiKeys)
- Documentation routes (getting started, API reference, guides)
- Landing page routes (pricing, contact, about)
- Authentication routes (signin, signup, signout)

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
- `@governs-ai/db` - Database utilities

## 📝 Contributing

When adding new utilities:
1. Ensure they're truly common across multiple apps
2. Add proper TypeScript types
3. Include JSDoc documentation
4. Update this README with usage examples
5. Test across all consuming applications

## 📄 License

MIT License - see root LICENSE file for details.
