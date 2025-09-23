# `@governs-ai/eslint-config`

Shared ESLint configuration for the GovernsAI monorepo.

## 📖 Overview

This package provides standardized ESLint rules and configurations across all GovernsAI applications and packages, ensuring consistent code quality and style throughout the project.

## 🚀 Features

- **Consistent Rules**: Standardized linting rules across all packages
- **TypeScript Support**: Full TypeScript and React support
- **Next.js Integration**: Optimized for Next.js applications
- **Monorepo Ready**: Designed for Turborepo monorepo structure

## 📦 Installation

This package is automatically installed as a dependency in all GovernsAI projects.

## ⚙️ Usage

### In package.json
```json
{
  "eslintConfig": {
    "extends": ["@governs-ai/eslint-config"]
  }
}
```

### In .eslintrc.js
```javascript
module.exports = {
  extends: ["@governs-ai/eslint-config"]
};
```

### In .eslintrc.json
```json
{
  "extends": ["@governs-ai/eslint-config"]
}
```

## 🔧 Configuration Files

- **`base.js`**: Base ESLint configuration for all packages
- **`next.js`**: Next.js specific configuration
- **`react-internal.js`**: React internal package configuration

## 📋 Rules

### Base Rules
- Enforces consistent code style
- Prevents common mistakes
- Ensures proper import/export usage

### Next.js Rules
- Next.js specific linting rules
- App Router compatibility
- Image optimization warnings

### React Rules
- React hooks rules
- JSX best practices
- Component naming conventions

## 🚀 Scripts

```bash
# Lint all packages
pnpm run lint

# Lint specific package
pnpm --filter <package-name> run lint

# Fix auto-fixable issues
pnpm run lint:fix
```

## 🔗 Related Packages

- `@governs-ai/typescript-config` - TypeScript configuration
- `@governs-ai/ui` - Shared UI components
- `@governs-ai/common-utils` - Common utilities

## 📝 Contributing

When updating ESLint rules:
1. Test changes across all packages
2. Ensure no breaking changes for existing code
3. Update this README if adding new configurations
4. Consider impact on build times

## 📄 License

MIT License - see root LICENSE file for details.
