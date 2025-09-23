# 🚀 GovernsAI Landing

Marketing and landing page for the GovernsAI platform.

## 📖 Overview

The GovernsAI Landing app serves as the marketing and entry point for the GovernsAI platform. It provides information about the AI governance platform, features, pricing, and guides users to sign up or access the main platform.

## 🚀 Features

- **Product Marketing**: Showcase GovernsAI features and benefits
- **Pricing Information**: Clear pricing tiers and plans
- **Documentation Links**: Easy access to documentation
- **Contact Forms**: Lead generation and support
- **SEO Optimization**: Search engine optimized content
- **Mobile Responsive**: Optimized for all devices
- **Fast Loading**: Optimized performance

## 🏗️ Architecture

### App Router Structure
```
app/
├── api/                    # API routes
│   └── health/            # Health check endpoints
├── pricing/                # Pricing pages
├── privacy-policy/         # Privacy policy
├── terms-of-service/       # Terms of service
├── refund-policy/          # Refund policy
├── terms-and-policies/     # Combined policies
├── test-links/             # Development testing
├── globals.css             # Global styles
├── layout.tsx              # Root layout
└── page.tsx                # Home page
```

## 🛠️ Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **SEO**: Next SEO

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm

### Installation
```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local

# Start development server
pnpm run dev
```

### Environment Variables
```env
# App URLs
NEXT_PUBLIC_LANDING_URL="http://localhost:3000"
NEXT_PUBLIC_PLATFORM_URL="http://localhost:3002"
NEXT_PUBLIC_DOCS_URL="http://localhost:3001"

# Analytics (optional)
NEXT_PUBLIC_GA_ID="your-google-analytics-id"
```

## 📦 Available Scripts

```bash
# Development
pnpm run dev              # Start development server
pnpm run build            # Build for production
pnpm run start            # Start production server

# Code Quality
pnpm run lint             # Run ESLint
pnpm run type-check       # Run TypeScript checks
pnpm run format           # Format code with Prettier
```

## 🏗️ Development

### Project Structure
```
apps/landing/
├── app/                   # Next.js App Router pages
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── shared/           # Shared components
│   └── ...               # Feature-specific components
├── lib/                  # Utility functions and configs
├── hooks/                # Custom React hooks
├── styles/               # Global styles and CSS
└── public/               # Static assets
```

### Key Components

- **LandingPageClient**: Main landing page component
- **PricingTable**: Pricing information display
- **NavigationMenu**: Main navigation
- **Footer**: Site footer with links
- **ThemeProvider**: Dark/light mode support

## 🎨 Design System

The landing page uses a consistent design system with:
- **Colors**: Blue and purple gradients for primary branding
- **Typography**: Inter font family
- **Spacing**: Consistent spacing scale
- **Components**: Reusable UI components
- **Responsive**: Mobile-first design approach

## 🔗 Related Packages

- `@governs-ai/ui` - Shared UI components
- `@governs-ai/layout` - Layout components
- `@governs-ai/common-utils` - Shared utilities

## 📝 Content Management

The landing page content is managed through:
- **Constants**: App configuration and content
- **Components**: Reusable content components
- **SEO**: Meta tags and structured data
- **Images**: Optimized images and assets

## 🚀 Deployment

The landing app is deployed on Vercel with:
- **Automatic builds** on git push
- **Preview deployments** for pull requests
- **Custom domain** configuration
- **CDN** for fast global delivery

## 📝 Contributing

1. Follow the established design patterns
2. Maintain responsive design principles
3. Optimize for performance and SEO
4. Test across different devices and browsers
5. Update content and copy as needed

## 📄 License

MIT License - see root LICENSE file for details.