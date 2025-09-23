"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Search,
  Briefcase,
  FileText,
  Mic,
  BarChart3,
  User,
  Settings,
  Plus,
  Play,
  Target,
  Brain,
  Award,
  MessageCircle,
  Calendar,
  BookOpen,
  Zap,
  Star,
  TrendingUp,
  Users,
  Shield,
  HelpCircle,
  LogOut,
  Bell,
  ExternalLink,
  ChevronDown,
  MoreHorizontal,
  Sun,
  Moon,
} from "lucide-react";
import { SidebarProps, NavigationItem, QuickAction } from "../types/layout";
import { cn, formatUserName, getUserInitials } from "../utils";

export function UnifiedSidebar({
  navigation,
  user,
  isCollapsed = false,
  onToggleCollapse,
  onNavigationChange,
  onUserAction,
  onThemeToggle,
  currentTheme,
  className,
  onMobileNavigationClick,
}: SidebarProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<'top' | 'bottom'>('bottom');
  const [mounted, setMounted] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const handleNavigationClick = (item: NavigationItem) => {
    onNavigationChange?.(item);
    // Close mobile sidebar when navigation item is clicked
    onMobileNavigationClick?.();
  };

  const handleUserAction = (action: string) => {
    setIsUserMenuOpen(false);
    onUserAction?.(action);
  };

  const handleUserMenuToggle = () => {
    if (isCollapsed) return;
    
    // Always position above by default for better visibility
    setDropdownPosition('bottom');
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  // Close user menu when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isUserMenuOpen]);

  const renderNavigationItem = (item: NavigationItem, level: number = 0) => {
    const isActive = pathname === item.href;
    const isExpanded = expandedItems.has(item.id);
    const hasChildren = item.children && item.children.length > 0;
    const isExternal = item.external || item.href.startsWith('http');

    return (
      <div key={item.id} className="space-y-1">
        <Link
          href={item.href}
          onClick={() => handleNavigationClick(item)}
          // target={isExternal ? "_blank" : undefined}
          // rel={isExternal ? "noopener noreferrer" : undefined}
          className={cn(
            "flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 group relative",
            isActive
              ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-600 dark:text-blue-400 border-l-4 border-blue-500"
              : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100",
            level > 0 && "ml-4",
            isCollapsed && "justify-center px-2"
          )}
        >
          <div
            className={cn(
              "flex items-center min-w-0 flex-1",
              isCollapsed ? "justify-center" : "space-x-3"
            )}
          >
            <item.icon
              className={cn(
                "flex-shrink-0",
                isActive
                  ? "text-blue-600 dark:text-blue-400"
                  : "text-gray-500 dark:text-gray-400",
                isCollapsed ? "h-6 w-6" : "h-5 w-5"
              )}
            />
            {!isCollapsed && (
              <span className="text-sm font-medium truncate">{item.label}</span>
            )}
          </div>

          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              {item.badge && (
                <span
                  className={cn(
                    "text-xs px-2 py-1 rounded-full font-medium",
                    item.badge.variant === "destructive" &&
                      "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
                    item.badge.variant === "secondary" &&
                      "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
                    item.badge.variant === "default" &&
                      "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
                    item.badge.variant === "outline" &&
                      "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  )}
                >
                  {item.badge.text}
                </span>
              )}
              {hasChildren && (
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform text-gray-500 dark:text-gray-400",
                    isExpanded && "rotate-180"
                  )}
                />
              )}
              {item.external && (
                <ExternalLink className="h-3 w-3 text-gray-500 dark:text-gray-400" />
              )}
            </div>
          )}
        </Link>

        {/* Children */}
        {hasChildren && !isCollapsed && (
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-1"
              >
                {item.children!.map((child) =>
                  renderNavigationItem(child, level + 1)
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    );
  };

  return (
    <aside
      className={cn(
        "bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 h-full overflow-hidden",
        isCollapsed ? "w-16" : "w-[270px]",
        className
      )}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-900">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CB</span>
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 bg-clip-text text-transparent dark:from-slate-100 dark:via-blue-100 dark:to-purple-100">
                Governs AI
              </span>
            </div>
          )}

          <div className="flex items-center space-x-2">
            {/* Theme Toggle */}
            <button
              onClick={() => {
                if (!mounted) return;
                onThemeToggle?.();
              }}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              title={`Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`}
              disabled={!mounted}
            >
              {currentTheme === 'dark' ? (
                <Sun className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              ) : (
                <Moon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              )}
            </button>

            {/* Collapse Toggle */}
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              ) : (
                <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-300" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto bg-white dark:bg-gray-900">
          {/* Primary Navigation */}
          <div className="space-y-1">
            {navigation.primary.map((item) => renderNavigationItem(item))}
          </div>

          {/* App-specific Navigation */}
          {navigation.appSpecific &&
            Object.entries(navigation.appSpecific).map(([appId, items]) => (
              <div key={appId} className="pt-6 border-t border-gray-200 dark:border-gray-700">
                {!isCollapsed && (
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                    {appId}
                  </h3>
                )}
                <div className="space-y-1">
                  {items.map((item) => renderNavigationItem(item))}
                </div>
              </div>
            ))}

          {/* Quick Actions */}
          {navigation.quickActions && navigation.quickActions.length > 0 && (
            <div className="pt-8 border-t border-gray-200 dark:border-gray-700">
              {!isCollapsed && (
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Quick Actions
                </h3>
              )}
              <div className="space-y-2">
                {navigation.quickActions.map((action) => (
                  <Link
                    key={action.id}
                    href={action.href}
                    className={cn(
                      "flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 group",
                      action.variant === "default" &&
                        "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600",
                      action.variant === "secondary" &&
                        "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700",
                      action.variant === "outline" &&
                        "border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                    )}
                  >
                    <action.icon className="h-4 w-4 flex-shrink-0" />
                    {!isCollapsed && (
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">
                          {action.label}
                        </div>
                        {action.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {action.description}
                          </div>
                        )}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Secondary Navigation */}
          {/* <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="space-y-1">
              {navigation.secondary.map((item) => renderNavigationItem(item))}
            </div>
          </div> */}
        </nav>

        {/* User Profile */}
        {user && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-900">
            <div className="relative" ref={userMenuRef}>
              <div
                className={cn(
                  "flex items-center space-x-3 cursor-pointer rounded-lg p-2 transition-colors",
                  isCollapsed && "justify-center",
                  !isCollapsed && "hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
                onClick={handleUserMenuToggle}
              >
                {/* User Avatar */}
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name || user.email}
                    className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
                    onError={(e) => {
                      // Fallback to initials if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        const fallback = parent.querySelector('.avatar-fallback') as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 avatar-fallback" style={{ display: user.avatar ? 'none' : 'flex' }}>
                  <span className="text-white text-sm font-medium">
                    {getUserInitials(user.name, user.email)}
                  </span>
                </div>
                
                {!isCollapsed && (
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {formatUserName(user.name, user.email)}
                    </div>
                    {user.plan && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user.plan}
                      </div>
                    )}
                  </div>
                )}
                
                {!isCollapsed && (
                  <MoreHorizontal className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                )}
              </div>

              {/* User Menu Dropdown */}
              {!isCollapsed && (
                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: dropdownPosition === 'top' ? 10 : -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: dropdownPosition === 'top' ? 10 : -10 }}
                      transition={{ duration: 0.2 }}
                      style={{
                        top: "-120px"
                      }}
                      className={cn(
                        "absolute left-0 right-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-[200px]",
                        dropdownPosition === 'top' 
                          ? "top-full mt-2" 
                          : "top-[-125px]"
                      )}
                    >
                      <div className="py-1">
                        <button
                          onClick={() => handleUserAction("profile")}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <User className="h-4 w-4 mr-3" />
                          Profile
                        </button>
                        <button
                          onClick={() => handleUserAction("settings")}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                          <Settings className="h-4 w-4 mr-3" />
                          Settings
                        </button>
                        <button
                          onClick={() => handleUserAction("logout")}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <LogOut className="h-4 w-4 mr-3" />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
