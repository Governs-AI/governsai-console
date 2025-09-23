export const APP_CONFIG = {
  name: "GovernsAI",
  description: "The AI Governance OS - Secure control plane for AI interactions",
  url: process.env.NEXT_PUBLIC_PLATFORM_URL || "https://app.governs.ai",
  version: "1.0.0",
  author: "GovernsAI Team",
  keywords: ["AI governance", "AI security", "AI monitoring", "AI compliance", "AI proxy", "AI management"],
} as const

// Ensure we have a valid URL for metadata
export const getValidAppUrl = (): string => {
  const url = process.env.NEXT_PUBLIC_PLATFORM_URL || "https://app.governs.ai";
  // Ensure the URL is not empty and has a protocol
  if (!url || url.trim() === "") {
    return "https://app.governs.ai";
  }
  // If URL doesn't start with http/https, add https
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
};

export const API_ENDPOINTS = {
  usage: "/api/usage",
  budgets: "/api/budgets",
  policies: "/api/policies",
  audit: "/api/audit",
  apiKeys: "/api/api-keys",
  organizations: "/api/organizations",
  auth: "/api/auth",
} as const

export const ROUTES = {
  home: "/",
  dashboard: "/dashboard",
  usage: "/usage",
  budgets: "/budgets",
  policies: "/policies",
  audit: "/audit",
  apiKeys: "/api-keys",
  organizations: "/organizations",
  settings: "/settings",
  profile: "/profile",
} as const

export const AI_PROVIDERS = [
  "OpenAI",
  "Anthropic",
  "Google",
  "Cohere",
  "Hugging Face",
  "Custom",
] as const

export const BUDGET_PERIODS = [
  "daily",
  "weekly", 
  "monthly",
  "yearly",
] as const

export const POLICY_TYPES = [
  "budget",
  "pii",
  "usage",
  "model_access",
  "rate_limit",
] as const

export const PII_TYPES = [
  "ssn",
  "credit_card",
  "email",
  "phone",
  "address",
  "name",
  "date_of_birth",
  "medical_id",
] as const

export const USAGE_METRICS = [
  "tokens",
  "requests",
  "cost",
  "latency",
  "errors",
] as const

export const AUDIT_ACTIONS = [
  "create",
  "update", 
  "delete",
  "login",
  "logout",
  "api_call",
  "budget_exceeded",
  "pii_detected",
] as const

export const NOTIFICATION_TYPES = [
  "budget_alert",
  "pii_detection",
  "policy_violation",
  "usage_spike",
  "system_alert",
] as const