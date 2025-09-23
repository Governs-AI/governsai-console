"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { UnifiedHeader } from "./unified-header";
import { UnifiedSidebar } from "./unified-sidebar";
import { LayoutProps, LayoutMode } from "../types/layout";
import { cn } from "../utils";
import { User } from "lucide-react";

export function UnifiedLayout({
  children,
  mode = "standard",
  navigation,
  user,
  showSidebar = true,
  showHeader = true,
  className,
  onNavigationChange,
  onUserAction,
}: LayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle user actions
  const handleUserAction = (action: string) => {
    onUserAction?.(action);
  };

  // Handle theme toggle
  const handleThemeToggle = () => {
    if (!mounted) return;

    const currentTheme = theme || "dark";
    setTheme(currentTheme === "dark" ? "light" : "dark");
  };

  // Handle search
  const handleSearch = (query: string) => {
    // This will be implemented by the consuming app
    // console.log("Search query:", query);
  };

  // Handle mobile navigation click to close sidebar
  const handleMobileNavigationClick = () => {
    if (isMobile) {
      setIsSidebarCollapsed(true);
    }
  };

  const getDashboardUrl = (): string => {
    return process.env.NEXT_PUBLIC_DASHBOARD_URL || "";
  };

  // Check if current page matches navigation item
  const isCurrentPage = (href: string) => {
    if (!href) return false;

    // Handle absolute URLs by extracting the path
    let path = href;
    if (href.startsWith("http")) {
      try {
        const url = new URL(href);
        path = url.pathname;
        // If the pathname is empty (just base URL), treat it as dashboard
        if (path === "") {
          path = "/dashboard";
        }
      } catch {
        return false;
      }
    }

    // Remove trailing slash for consistent comparison
    path = path.replace(/\/$/, "");
    const currentPath = pathname.replace(/\/$/, "");

    // Special case: if current path is /dashboard and navigation path is empty (base URL)
    if (currentPath === "/dashboard" && path === "") {
      return true;
    }

    // Simple exact match first
    if (currentPath === path) {
      return true;
    }

    // Then check if current path starts with the navigation path
    // but only for specific paths that should have sub-paths
    if (
      (path === "" || path === "/dashboard") &&
      currentPath.startsWith("/dashboard/")
    ) {
      return true;
    }
    if (path === "/jobs" && currentPath.startsWith("/jobs/")) {
      return true;
    }
    if (path === "/applications" && currentPath.startsWith("/applications/")) {
      return true;
    }
    if (
      path === "/resume-studio" &&
      currentPath.startsWith("/resume-studio/")
    ) {
      return true;
    }
    if (path === "/profile" && currentPath.startsWith("/profile/")) {
      return true;
    }

    return false;
  };

  const MOBILE_NAVIGATION_ITEMS = navigation?.primary?.slice(0, 4) || [];

  MOBILE_NAVIGATION_ITEMS.push({
    id: "profile",
    label: "Profile",
    href: "/profile", // Use relative path instead of absolute URL
    icon: User,
    badge: undefined,
    external: false,
  });

  // Render based on layout mode
  if (mode === "minimal") {
    return (
      <div
        className={cn(
          "h-screen bg-background flex flex-col overflow-hidden",
          className
        )}
      >
        {showHeader && (
          <div className="flex-shrink-0">
            <UnifiedHeader
              user={user}
              showNavigation={false}
              onUserAction={handleUserAction}
              onThemeToggle={handleThemeToggle}
              onSearch={handleSearch}
              currentTheme={theme as "light" | "dark" | "system"}
              isMobile={isMobile}
              isSidebarOpen={false}
              onToggleSidebar={undefined}
            />
          </div>
        )}
        <main className="flex-1 overflow-auto flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full "
          >
            {children}
          </motion.div>
        </main>
      </div>
    );
  }

  if (mode === "fullscreen") {
    return (
      <div
        className={cn(
          "h-screen bg-background flex flex-col overflow-hidden",
          className
        )}
      >
        {showHeader && (
          <div className="flex-shrink-0">
            <UnifiedHeader
              user={user}
              navigation={navigation?.primary || []}
              showNavigation={true}
              onUserAction={handleUserAction}
              onThemeToggle={handleThemeToggle}
              onSearch={handleSearch}
              currentTheme={theme as "light" | "dark" | "system"}
              isMobile={isMobile}
              isSidebarOpen={false}
              onToggleSidebar={undefined}
            />
          </div>
        )}
        <main className="flex-1 overflow-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    );
  }

  // Standard mode (default)
  return (
    <div
      className={cn(
        "h-screen bg-background flex flex-col overflow-hidden",
        className
      )}
    >
      {/* Sticky Header - Always show on mobile, respect showHeader prop on desktop */}
      {(isMobile || showHeader) && (
        <div className="sticky top-0 z-50 bg-background border-b border-border flex-shrink-0">
          <UnifiedHeader
            user={user}
            navigation={navigation?.primary || []}
            showNavigation={true}
            onUserAction={handleUserAction}
            onThemeToggle={handleThemeToggle}
            onSearch={handleSearch}
            currentTheme={theme as "light" | "dark" | "system"}
            isMobile={isMobile}
            isSidebarOpen={!isSidebarCollapsed}
            onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        </div>
      )}

      {/* Main Layout Container */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* Mobile overlay */}
        {isMobile && showSidebar && navigation && !isSidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setIsSidebarCollapsed(true)}
          />
        )}

        {/* Fixed Sidebar */}
        {showSidebar && navigation && (
          <AnimatePresence>
            {!isSidebarCollapsed && (
              <motion.div
                initial={{ x: -270 }}
                animate={{ x: 0 }}
                exit={{ x: -270 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className={cn(
                  "z-[60] unified-sidebar-tour-container",
                  isMobile
                    ? "fixed inset-y-0 left-0 top-0"
                    : "fixed inset-y-0 left-0"
                )}
              >
                <UnifiedSidebar
                  navigation={navigation}
                  user={user}
                  isCollapsed={isSidebarCollapsed}
                  onToggleCollapse={() =>
                    setIsSidebarCollapsed(!isSidebarCollapsed)
                  }
                  onNavigationChange={onNavigationChange}
                  onUserAction={onUserAction}
                  onThemeToggle={handleThemeToggle}
                  currentTheme={theme || "dark"}
                  onMobileNavigationClick={handleMobileNavigationClick}
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Main Content - Ensure it starts after sidebar */}
        <div
          className={cn(
            "flex-1 min-w-0 flex flex-col",
            showSidebar && isSidebarCollapsed && "lg:ml-16"
          )}
          style={{
            marginLeft:
              showSidebar && !isSidebarCollapsed ? "270px" : undefined,
          }}
        >
          <main className="flex-1 overflow-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className={cn(
                "p-2 lg:p-8",
                // Add bottom padding on mobile to account for bottom navigation
                isMobile && showSidebar && navigation && "pb-20"
              )}
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation - Only show on mobile */}
      {isMobile && showSidebar && navigation && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border lg:hidden flex-shrink-0">
          <nav className="flex items-center justify-around px-2 py-2">
            {MOBILE_NAVIGATION_ITEMS.map((item) => {
              const isActive = isCurrentPage(item.href);
              // Debug logging
              // console.log(
              //   `Navigation item: ${item.label}, href: ${item.href}, isActive: ${isActive}, currentPath: ${pathname}`
              // );
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigationChange?.(item)}
                  className={cn(
                    "flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-all duration-200",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted/50 text-muted-foreground"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <span
                    className={cn(
                      "text-xs mt-1 transition-colors",
                      isActive
                        ? "text-primary font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
