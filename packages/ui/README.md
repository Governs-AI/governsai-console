# `@governs-ai/ui`

Shared UI components for the GovernsAI monorepo.

## 📖 Overview

This package provides reusable UI components, design system elements, and interactive components for all GovernsAI applications. It ensures consistent visual design and user experience across the ecosystem.

## 🚀 Features

- **Component Library**: Comprehensive set of reusable components
- **Design System**: Consistent design tokens and styling
- **Accessibility**: WCAG compliant components
- **TypeScript**: Full type safety and IntelliSense support
- **Customizable**: Theme-aware and configurable components
- **Performance**: Optimized for production use

## 📦 Installation

This package is automatically installed as a dependency in all GovernsAI projects.

## ⚙️ Usage

### Basic Component Import
```typescript
import { Button, Card, Input } from '@governs-ai/ui';

export default function MyComponent() {
  return (
    <Card>
      <Input placeholder="Enter your name" />
      <Button>Submit</Button>
    </Card>
  );
}
```

### Component Variants
```typescript
import { Button } from '@governs-ai/ui';

// Different button variants
<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

// Different sizes
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>
```

### Form Components
```typescript
import { 
  Form, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormControl,
  FormMessage 
} from '@governs-ai/ui';

export default function MyForm() {
  return (
    <Form>
      <FormField name="email">
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input type="email" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
    </Form>
  );
}
```

## 🔧 Core Components

### Layout Components
- **Card**: Container with header, content, and footer
- **Container**: Responsive container with max-width
- **Grid**: CSS Grid layout system
- **Stack**: Vertical or horizontal stacking

### Form Components
- **Input**: Text input with variants
- **Textarea**: Multi-line text input
- **Select**: Dropdown selection
- **Checkbox**: Checkbox input
- **Radio**: Radio button group
- **Switch**: Toggle switch
- **Slider**: Range slider input

### Interactive Components
- **Button**: Button with multiple variants
- **Dialog**: Modal dialog component
- **Dropdown**: Dropdown menu
- **Tooltip**: Hover tooltip
- **Popover**: Positioned popover
- **Toast**: Notification toast

### Data Display
- **Table**: Data table with sorting
- **Badge**: Status and label badges
- **Avatar**: User avatar component
- **Progress**: Progress bar and spinner
- **Tabs**: Tabbed interface
- **Accordion**: Collapsible content

### Navigation
- **Breadcrumb**: Navigation breadcrumbs
- **Pagination**: Page navigation
- **Tabs**: Tab navigation
- **Menu**: Navigation menu

## 🎨 Design System

### Color Palette
```css
/* Primary colors */
--primary: theme(colors.blue.600);
--primary-foreground: theme(colors.white);

/* Secondary colors */
--secondary: theme(colors.gray.100);
--secondary-foreground: theme(colors.gray.900);

/* Accent colors */
--accent: theme(colors.green.600);
--accent-foreground: theme(colors.white);
```

### Typography
```css
/* Font sizes */
--font-size-xs: 0.75rem;
--font-size-sm: 0.875rem;
--font-size-base: 1rem;
--font-size-lg: 1.125rem;
--font-size-xl: 1.25rem;
```

### Spacing
```css
/* Spacing scale */
--spacing-1: 0.25rem;
--spacing-2: 0.5rem;
--spacing-3: 0.75rem;
--spacing-4: 1rem;
--spacing-6: 1.5rem;
--spacing-8: 2rem;
```

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
packages/ui/
├── src/
│   ├── components/         # UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── ...
│   ├── lib/               # Utility functions
│   │   └── utils.ts
│   └── index.ts           # Package exports
├── package.json           # Package configuration
└── README.md              # This file
```

## 🔗 Related Packages

- `@governs-ai/layout` - Layout components
- `@governs-ai/common-utils` - Common utilities
- `@governs-ai/billing` - Billing utilities

## 📝 Contributing

When adding new components:
1. Follow existing component patterns
2. Include proper TypeScript types
3. Add accessibility features
4. Include usage examples
5. Test across different themes
6. Update this README

## ♿ Accessibility

- **WCAG 2.1 AA** compliance
- **Keyboard navigation** support
- **Screen reader** compatibility
- **Focus management** for modals
- **ARIA labels** and descriptions
- **Color contrast** compliance

## 🎭 Animation

Components use CSS transitions and animations:
- **Smooth transitions** for state changes
- **Hover effects** for interactive elements
- **Loading states** with spinners
- **Micro-interactions** for better UX

## 📄 License

MIT License - see root LICENSE file for details.
