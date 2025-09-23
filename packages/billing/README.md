# `@governs-ai/billing`

Billing and usage tracking package for the GovernsAI monorepo.

## 📖 Overview

This package provides billing utilities, usage tracking, and subscription management for all GovernsAI applications. It handles AI usage metering, budget enforcement, and payment processing.

## 🚀 Features

- **Usage Tracking**: Track AI API calls, tokens, and costs
- **Budget Enforcement**: Automatic budget limits and alerts
- **Subscription Management**: Handle user subscriptions and billing
- **Payment Processing**: Integration with payment providers
- **Quota Management**: Usage quotas and rate limiting
- **Type Safety**: Full TypeScript support

## 📦 Installation

This package is automatically installed as a dependency in all GovernsAI projects.

## ⚙️ Usage

### Importing Billing Utilities
```typescript
import { 
  trackUsage, 
  checkBudget, 
  enforceQuota,
  getUsageStats 
} from '@governs-ai/billing';
```

### Usage Tracking
```typescript
// Track AI API usage
await trackUsage({
  userId: 'user-123',
  provider: 'openai',
  model: 'gpt-4',
  tokens: 150,
  cost: 0.03
});
```

### Budget Checking
```typescript
// Check if user is within budget
const budgetStatus = await checkBudget('user-123');
if (budgetStatus.exceeded) {
  throw new Error('Budget exceeded');
}
```

### Quota Enforcement
```typescript
// Enforce usage quotas
const quotaStatus = await enforceQuota('user-123', 'monthly');
if (!quotaStatus.allowed) {
  throw new Error('Quota exceeded');
}
```

## 🔧 Core Functions

### `trackUsage(usage: UsageData)`
Tracks AI usage for billing and analytics.

**UsageData:**
- `userId`: User identifier
- `provider`: AI provider (openai, anthropic, google)
- `model`: Model name
- `tokens`: Token count
- `cost`: Cost in USD

### `checkBudget(userId: string)`
Checks if user is within their budget limits.

**Returns:**
- `exceeded`: Boolean indicating if budget is exceeded
- `remaining`: Remaining budget amount
- `percentage`: Percentage of budget used

### `enforceQuota(userId: string, period: string)`
Enforces usage quotas for the specified period.

**Periods:**
- `daily` - Daily quota
- `monthly` - Monthly quota
- `yearly` - Yearly quota

### `getUsageStats(userId: string, period: string)`
Retrieves usage statistics for a user.

## 🚀 Scripts

```bash
# Build the package
pnpm run build

# Type check
pnpm run check-types

# Lint
pnpm run lint
```

## 📁 File Structure

```
packages/billing/
├── src/
│   ├── client.ts           # Client-side utilities
│   ├── server.ts           # Server-side utilities
│   ├── quota.ts            # Quota management
│   ├── guard.ts            # Budget enforcement
│   └── index.ts            # Package exports
├── package.json            # Package configuration
└── README.md               # This file
```

## 🔗 Related Packages

- `@governs-ai/db` - Database utilities
- `@governs-ai/common-utils` - Common utilities
- `@governs-ai/ui` - Shared UI components

## 📝 Contributing

When updating billing utilities:
1. Ensure accurate cost calculations
2. Test budget enforcement logic
3. Update quota management
4. Test payment processing
5. Update this README with new features

## 📄 License

MIT License - see root LICENSE file for details.
