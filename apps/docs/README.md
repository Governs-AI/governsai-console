# 📄 GovernsAI Documentation

Complete documentation site for the GovernsAI platform.

## 📖 Overview

The GovernsAI Documentation app provides comprehensive documentation for the AI governance platform. It includes API references, guides, tutorials, and all the information developers and users need to effectively use GovernsAI.

## 🚀 Features

- **API Documentation**: Complete API reference with examples
- **Getting Started Guide**: Step-by-step setup instructions
- **User Guides**: Detailed feature explanations
- **Security Documentation**: Security best practices and compliance
- **Billing Information**: Pricing and billing details
- **Support Resources**: Help and troubleshooting
- **Search Functionality**: Easy content discovery
- **Mobile Responsive**: Optimized for all devices

## 🏗️ Architecture

### App Router Structure
```
src/
├── app/                    # App Router pages
│   ├── api/                # API routes
│   ├── getting-started/    # Getting started guide
│   ├── api-reference/      # API documentation
│   ├── guides/             # User guides
│   ├── security/           # Security documentation
│   ├── billing/            # Billing information
│   ├── support/            # Support resources
│   ├── globals.css         # Global styles
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page
├── components/             # React components
├── lib/                    # Utility functions
├── styles/                 # Styles and CSS
└── public/                 # Static assets
```

## 🛠️ Technology Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui
- **Icons**: Lucide React
- **Content**: Markdown with MDX support
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
NEXT_PUBLIC_DOCS_URL="http://localhost:3001"
NEXT_PUBLIC_PLATFORM_URL="http://localhost:3002"
NEXT_PUBLIC_LANDING_URL="http://localhost:3000"

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
apps/docs/
├── src/
│   ├── app/               # Next.js App Router pages
│   ├── components/        # React components
│   ├── lib/               # Utility functions
│   └── styles/            # Global styles
├── public/                # Static assets
└── package.json           # Dependencies and scripts
```

### Key Components

- **DocumentationLayout**: Main documentation layout
- **NavigationMenu**: Documentation navigation
- **CodeBlock**: Syntax highlighted code examples
- **SearchBox**: Documentation search functionality
- **TableOfContents**: Page navigation

## 📚 Content Structure

The documentation is organized into sections:

- **Getting Started**: Quick setup and first steps
- **API Reference**: Complete API documentation
- **Guides**: Step-by-step tutorials
- **Security**: Security best practices
- **Billing**: Pricing and billing information
- **Support**: Help and troubleshooting

## 🎨 Design System

The documentation uses a clean, readable design with:
- **Typography**: Clear, readable fonts
- **Code Highlighting**: Syntax highlighting for code examples
- **Navigation**: Easy content discovery
- **Search**: Quick content finding
- **Responsive**: Mobile-friendly design

## 🔗 Related Packages

- `@governs-ai/ui` - Shared UI components
- `@governs-ai/layout` - Layout components
- `@governs-ai/common-utils` - Shared utilities

## 📝 Content Management

Documentation content is managed through:
- **Markdown Files**: Main content format
- **Components**: Interactive examples
- **API Schemas**: Generated from code
- **Images**: Optimized documentation images

## 🚀 Deployment

The documentation app is deployed on Vercel with:
- **Automatic builds** on git push
- **Preview deployments** for pull requests
- **Custom domain** configuration
- **CDN** for fast global delivery

## 📝 Contributing

1. Follow the established documentation style
2. Use clear, concise language
3. Include code examples where helpful
4. Test all code examples
5. Update navigation and cross-references

## 📄 License

MIT License - see root LICENSE file for details.