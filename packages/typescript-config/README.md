# `@governs-ai/typescript-config`

Shared TypeScript configuration for the GovernsAI monorepo.

## 📖 Overview

This package provides standardized TypeScript configurations across all GovernsAI applications and packages, ensuring consistent type checking and compilation settings throughout the project.

## 🚀 Features

- **Base Configuration**: Common TypeScript settings for all packages
- **Next.js Support**: Optimized for Next.js applications
- **React Library**: Configuration for React component libraries
- **Monorepo Ready**: Designed for Turborepo monorepo structure

## 📦 Installation

This package is automatically installed as a dependency in all GovernsAI projects.

## ⚙️ Usage

### Base Configuration
```json
{
  "extends": "@governs-ai/typescript-config/base.json"
}
```

### Next.js Applications
```json
{
  "extends": "@governs-ai/typescript-config/nextjs.json"
}
```

### React Libraries
```json
{
  "extends": "@governs-ai/typescript-config/react-library.json"
}
```

## 🔧 Configuration Files

- **`base.json`**: Base TypeScript configuration for all packages
- **`nextjs.json`**: Next.js specific configuration
- **`react-library.json`**: React library package configuration

## 📋 Configuration Details

### Base Configuration
- Strict type checking enabled
- Modern ES features support
- Common module resolution settings
- Path mapping support

### Next.js Configuration
- App Router support
- Server and client components
- Image optimization types
- Next.js specific type definitions

### React Library Configuration
- React 18+ support
- JSX transformation
- Library build optimization
- Type declaration generation

## 🚀 Scripts

```bash
# Type check all packages
pnpm run check-types

# Type check specific package
pnpm --filter <package-name> run check-types

# Build with type checking
pnpm run build
```

## 🔗 Related Packages

- `@governs-ai/eslint-config` - ESLint configuration
- `@governs-ai/ui` - Shared UI components
- `@governs-ai/common-utils` - Common utilities

## 📝 Contributing

When updating TypeScript configurations:
1. Test changes across all packages
2. Ensure no breaking changes for existing code
3. Update this README if adding new configurations
4. Consider impact on build times and type checking

## 📄 License

MIT License - see root LICENSE file for details.
