"use client";

import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import {
  getDashboardUrl,
  getResumeUrl,
  getInterviewUrl,
  getStudioUrl,
} from "../lib/navigation";

interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function BreadcrumbNav({ items, className = "" }: BreadcrumbNavProps) {
  return (
    <nav
      className={`flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-400 ${className}`}
    >
      <Link
        href={getDashboardUrl()}
        className="flex items-center hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        <Home className="h-4 w-4" />
        <span className="sr-only">Home</span>
      </Link>

      {items.map((item, index) => (
        <div key={index} className="flex items-center space-x-1">
          <ChevronRight className="h-4 w-4" />
          {item.current ? (
            <span className="text-gray-900 dark:text-gray-100 font-medium">
              {item.label}
            </span>
          ) : item.href ? (
            <Link
              href={item.href}
              className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span>{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  );
}

// Predefined breadcrumb configurations for common pages
export const BREADCRUMB_CONFIGS = {
  dashboard: {
    home: [{ label: "Dashboard", current: true }],
    jobs: [
      { label: "Dashboard", href: getDashboardUrl() },
      { label: "Jobs", current: true },
    ],
    applications: [
      { label: "Dashboard", href: getDashboardUrl() },
      { label: "Applications", current: true },
    ],
    insights: [
      { label: "Dashboard", href: getDashboardUrl() },
      { label: "Insights", current: true },
    ],
    profile: [
      { label: "Dashboard", href: getDashboardUrl() },
      { label: "Profile", current: true },
    ],
  },
  resume: {
    home: [{ label: "Resume Builder", current: true }],
    builder: [
      { label: "Resume Builder", href: getResumeUrl() },
      { label: "Builder", current: true },
    ],
    templates: [
      { label: "Resume Builder", href: getResumeUrl() },
      { label: "Templates", current: true },
    ],
  },
  interview: {
    home: [{ label: "Interview Prep", current: true }],
    chat: [
      { label: "Interview Prep", href: getInterviewUrl() },
      { label: "Chat Interview", current: true },
    ],
    video: [
      { label: "Interview Prep", href: getInterviewUrl() },
      { label: "Video Interview", current: true },
    ],
    voice: [
      { label: "Interview Prep", href: getInterviewUrl() },
      { label: "Voice Interview", current: true },
    ],
  },
  studio: {
    home: [{ label: "Resume Studio", current: true }],
    create: [
      { label: "Resume Studio", href: getStudioUrl() },
      { label: "Create", current: true },
    ],
    dashboard: [
      { label: "Resume Studio", href: getStudioUrl() },
      { label: "Dashboard", current: true },
    ],
  },
} as const;

// Helper function to get breadcrumb items for a specific page
export function getBreadcrumbItems(
  app: keyof typeof BREADCRUMB_CONFIGS,
  page: string
): BreadcrumbItem[] {
  const config = BREADCRUMB_CONFIGS[app];
  const items = config[page as keyof typeof config];
  return items ? [...items] : [{ label: "Page", current: true }];
}
