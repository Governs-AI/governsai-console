"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Home,
  User,
  FileText,
  Video,
  Palette,
  ChevronDown,
  ExternalLink,
  LogOut,
  DollarSign,
} from "lucide-react";
import {
  getAuthUrl,
  getDashboardUrl,
  getResumeUrl,
  getInterviewUrl,
  getStudioUrl,
} from "../lib/navigation";
import { signOut } from "next-auth/react";

interface NavigationMenuProps {
  currentApp?: "auth" | "dashboard" | "resume" | "interview" | "studio";
  showUserMenu?: boolean;
  className?: string;
}

export function NavigationMenu({
  currentApp,
  showUserMenu = true,
  className = "",
}: NavigationMenuProps) {
  const navigationItems = [
    {
      name: "Dashboard",
      href: getDashboardUrl(),
      icon: Home,
      description: "Main dashboard and job management",
      badge: "Core",
    },
    {
      name: "Resume Builder",
      href: getResumeUrl(),
      icon: FileText,
      description: "Create and optimize your resume",
      badge: "AI-Powered",
    },
    {
      name: "Interview Prep",
      href: getInterviewUrl(),
      icon: Video,
      description: "Practice with AI interview scenarios",
      badge: "Interactive",
    },
    {
      name: "Resume Studio",
      href: getStudioUrl(),
      icon: Palette,
      description: "Advanced resume design and templates",
      badge: "Premium",
    },
    {
      name: "Pricing",
      href: "/pricing",
      icon: DollarSign,
      description: "Choose your plan and unlock premium features",
      badge: "New",
    },
  ];

  const handleSignOut = async () => {
    await signOut({ callbackUrl: getAuthUrl() });
  };

  return (
    <div className={`flex items-center space-x-4 ${className}`}>
      {/* Main Navigation Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center space-x-2">
            <span>Navigate</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <div className="grid gap-1 p-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isCurrent =
                currentApp ===
                (item.name.toLowerCase().replace(/\s+/g, "") as any);

              return (
                <DropdownMenuItem
                  key={item.name}
                  asChild
                  className={`flex items-start space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    isCurrent
                      ? "bg-blue-50 dark:bg-blue-950"
                      : "hover:bg-gray-50 dark:hover:bg-gray-900"
                  }`}
                >
                  <a
                    href={item.href}
                    className="flex items-start space-x-3 w-full"
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        isCurrent
                          ? "bg-blue-100 dark:bg-blue-900"
                          : "bg-gray-100 dark:bg-gray-800"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{item.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {item.badge}
                        </Badge>
                        {isCurrent && (
                          <Badge variant="default" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {item.description}
                      </p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  </a>
                </DropdownMenuItem>
              );
            })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* User Menu */}
      {showUserMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Account</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <a
                href={getDashboardUrl("/profile")}
                className="flex items-center space-x-2"
              >
                <User className="h-4 w-4" />
                <span>Profile</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a
                href={getDashboardUrl("/settings")}
                className="flex items-center space-x-2"
              >
                <User className="h-4 w-4" />
                <span>Settings</span>
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleSignOut}
              className="flex items-center space-x-2 text-red-600 dark:text-red-400"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

// Compact version for smaller screens
export function CompactNavigationMenu({
  currentApp,
}: {
  currentApp?: "auth" | "dashboard" | "resume" | "interview" | "studio";
}) {
  const navigationItems = [
    { name: "Dashboard", href: getDashboardUrl(), icon: Home },
    { name: "Resume", href: getResumeUrl(), icon: FileText },
    { name: "Interview", href: getInterviewUrl(), icon: Video },
    { name: "Studio", href: getStudioUrl(), icon: Palette },
  ];

  return (
    <div className="flex items-center space-x-2">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        const isCurrent = currentApp === (item.name.toLowerCase() as any);

        return (
          <Button
            key={item.name}
            variant={isCurrent ? "default" : "ghost"}
            size="sm"
            asChild
            className="flex items-center space-x-2"
          >
            <a href={item.href}>
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{item.name}</span>
            </a>
          </Button>
        );
      })}
    </div>
  );
}
