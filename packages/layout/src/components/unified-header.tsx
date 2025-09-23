"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sun, Moon, LogOut, Settings, User, Menu, X } from "lucide-react";
import { NavigationItem, User as UserType } from "../types/layout";
import { cn, formatUserName, getUserInitials } from "../utils";

interface UnifiedHeaderProps {
  user?: UserType;
  navigation?: NavigationItem[];
  showNavigation?: boolean;
  onUserAction?: (action: string) => void;
  onThemeToggle?: () => void;
  onSearch?: (query: string) => void;
  className?: string;
  currentTheme?: "light" | "dark" | "system";
  // New props for mobile sidebar control
  isMobile?: boolean;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export function UnifiedHeader({
  user,
  navigation = [],
  showNavigation = true,
  onUserAction,
  onThemeToggle,
  onSearch,
  className,
  currentTheme = "light",
  isMobile = false,
  isSidebarOpen = false,
  onToggleSidebar,
}: UnifiedHeaderProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleThemeToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onThemeToggle?.();
  };

  const handleUserAction = (action: string) => {
    setIsUserMenuOpen(false);
    onUserAction?.(action);
  };

  console.log(currentTheme);
  return (
    <header className={cn("bg-background border-b border-border", className)}>
      <div className="flex items-center justify-between px-4 lg:px-6 h-16">
        {/* Left Side - Logo, Brand, and Mobile Menu */}
        <div className="flex items-center space-x-3">
          {/* Mobile Hamburger Menu */}
          {isMobile && onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-lg hover:bg-muted transition-colors lg:hidden"
              aria-label="Toggle navigation menu"
            >
              {isSidebarOpen ? (
                <X className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Menu className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
          )}
          
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">GA</span>
            </div>
            <span className="text-lg font-bold text-foreground">
              GovernsAI
            </span>
          </div>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center space-x-2">
          {/* Theme Toggle */}
          <button
            onClick={handleThemeToggle}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Toggle theme"
          >
            {currentTheme === "dark" ? (
              <Sun className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Moon className="h-5 w-5 text-muted-foreground" />
            )}
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted transition-colors"
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={formatUserName(user?.name || "", user?.email || "")}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {getUserInitials(user?.name || "", user?.email || "")}
                  </span>
                </div>
              )}
            </button>

            {/* User Dropdown Menu */}
            <AnimatePresence>
              {isUserMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-popover rounded-lg shadow-lg border border-border py-2 z-50"
                >
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-border">
                    <p className="text-sm font-medium text-popover-foreground">
                      {formatUserName(user?.name || "", user?.email || "")}
                    </p>
                    {user?.email && (
                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    )}
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    <button
                      onClick={() => handleUserAction("profile")}
                      className="flex items-center w-full px-4 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
                    >
                      <User className="h-4 w-4 mr-3" />
                      Profile
                    </button>
                    <button
                      onClick={() => handleUserAction("settings")}
                      className="flex items-center w-full px-4 py-2 text-sm text-popover-foreground hover:bg-accent transition-colors"
                    >
                      <Settings className="h-4 w-4 mr-3" />
                      Settings
                    </button>
                    <button
                      onClick={() => handleUserAction("logout")}
                      className="flex items-center w-full px-4 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
