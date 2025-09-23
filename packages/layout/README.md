# `@governs-ai/layout`

Shared layout components for the GovernsAI monorepo.

## 📖 Overview

This package provides reusable layout components, navigation structures, and theme management for all GovernsAI applications. It ensures consistent user interface and navigation experience across the ecosystem.

## 🚀 Features

- **Unified Layout**: Consistent layout structure across all apps
- **Navigation System**: Centralized navigation management
- **Theme Management**: Dark/light theme switching
- **Responsive Design**: Mobile-first responsive components
- **Accessibility**: WCAG compliant components
- **Type Safety**: Full TypeScript support

## 📦 Installation

This package is automatically installed as a dependency in all GovernsAI projects.

## ⚙️ Usage

### Basic Layout Component
```typescript
import { UnifiedLayout } from '@governs-ai/layout';

export default function AppLayout({ children }) {
  return (
    <UnifiedLayout
      user={user}
      navigation={navigation}
      mode="full"
      showHeader={true}
      showSidebar={true}
    >
      {children}
    </UnifiedLayout>
  );
}
```

### Theme Provider
```typescript
import { ThemeProvider } from '@governs-ai/layout';

export default function RootLayout({ children }) {
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
}
```

### Navigation Components
```typescript
import { 
  UnifiedHeader, 
  UnifiedSidebar,
  UnifiedFooter 
} from '@governs-ai/layout';

// Use individual components as needed
<UnifiedHeader user={user} onThemeToggle={handleThemeToggle} />
<UnifiedSidebar navigation={navigation} />
<UnifiedFooter />
```

## 🔧 Core Components

### `UnifiedLayout`
Main layout component that orchestrates the entire application structure.

**Props:**
- `user`: Current user information
- `navigation`: Navigation configuration
- `mode`: Layout mode ('full', 'minimal', 'fullscreen')
- `showHeader`: Whether to show the header
- `showSidebar`: Whether to show the sidebar

### `UnifiedHeader`
Application header with user menu, theme toggle, and navigation.

**Features:**
- User profile menu
- Theme switching
- Search functionality
- Mobile navigation toggle

### `UnifiedSidebar`
Application sidebar with navigation menu and user actions.

**Features:**
- Primary navigation menu
- User profile section
- Quick actions
- Collapsible design

### `ThemeProvider`
Theme management provider with dark/light mode support.

**Features:**
- Theme persistence
- System theme detection
- Smooth transitions
- CSS custom properties

## 🎨 Theme System

### Available Themes
- **Light**: Default light theme
- **Dark**: Dark mode theme
- **System**: Follows system preference

### Customization
```css
/* Use CSS custom properties for theming */
:root {
  --background: theme(colors.white);
  --foreground: theme(colors.gray.900);
}

[data-theme="dark"] {
  --background: theme(colors.gray.900);
  --foreground: theme(colors.gray.100);
}
```

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

### Mobile Features
- Collapsible sidebar
- Bottom navigation sheet
- Touch-friendly interactions
- Mobile-optimized layouts

## 🚀 Scripts

```bash
# Build the package
pnpm run build

# Type check
pnpm run check-types

# Lint
pnpm run lint

# Storybook (if available)
pnpm run storybook
```

## 📁 File Structure

```
packages/layout/
├── src/
│   ├── components/         # Layout components
│   │   ├── unified-layout.tsx
│   │   ├── unified-header.tsx
│   │   ├── unified-sidebar.tsx
│   │   ├── theme-provider.tsx
│   │   └── theme-initializer.tsx
│   ├── utils/             # Utility functions
│   └── index.ts           # Package exports
├── package.json           # Package configuration
└── README.md              # This file
```

## 🔗 Related Packages

- `@governs-ai/ui` - Shared UI components
- `@governs-ai/common-utils` - Common utilities
- `@governs-ai/billing` - Billing utilities

## 📝 Contributing

When updating layout components:
1. Test across all applications
2. Ensure responsive behavior
3. Test accessibility features
4. Update theme documentation
5. Test with different navigation configurations

## ♿ Accessibility

- **WCAG 2.1 AA** compliance
- **Keyboard navigation** support
- **Screen reader** compatibility
- **Focus management** for modals
- **ARIA labels** and descriptions

## 📄 License

MIT License - see root LICENSE file for details. 