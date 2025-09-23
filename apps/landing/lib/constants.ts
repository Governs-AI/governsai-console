export const APP_CONFIG = {
  name: "GovernsAI",
  description: "The AI Governance OS - Secure control plane for AI interactions",
  url: process.env.NEXT_PUBLIC_LANDING_URL || "https://governs.ai",
  version: "1.0.0",
  author: "GovernsAI Team",
  keywords: ["AI governance", "AI security", "AI monitoring", "AI compliance", "AI proxy", "AI management", "AI control", "AI audit"],
} as const

// Ensure we have a valid URL for metadata
export const getValidAppUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_LANDING_URL || "https://governs.ai";
  // Ensure the URL is not empty and has a protocol
  if (!url || url.trim() === "") {
    return "https://governs.ai";
  }
  // If URL doesn't start with http/https, add https
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
};

export const ROUTES = {
  home: "/",
  docs: "/docs",
  platform: "/platform",
  pricing: "/pricing",
  contact: "/contact",
} as const

export const FEATURES = [
  {
    title: "AI Proxy Gateway",
    description: "Route all AI requests through our secure gateway for complete control and monitoring",
    icon: "Shield"
  },
  {
    title: "Usage Tracking",
    description: "Monitor token usage, costs, and performance across all AI providers in real-time",
    icon: "Eye"
  },
  {
    title: "PII Detection",
    description: "Automatically detect and protect sensitive data before it reaches AI models",
    icon: "Lock"
  },
  {
    title: "Budget Control",
    description: "Set spending limits and get alerts when approaching budget thresholds",
    icon: "DollarSign"
  },
  {
    title: "Audit Logs",
    description: "Complete audit trail of all AI interactions for compliance and security",
    icon: "BarChart3"
  },
  {
    title: "Policy Management",
    description: "Define and enforce policies for AI usage across your organization",
    icon: "Settings"
  }
] as const