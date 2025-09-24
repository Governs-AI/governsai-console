"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";

interface LayoutProps {
  children: React.ReactNode;
  mode?: "standard" | "minimal";
  showSidebar?: boolean;
  showHeader?: boolean;
  className?: string;
}

export function UnifiedLayout({
  children,
  mode = "standard",
  showSidebar = true,
  showHeader = true,
  className,
}: LayoutProps) {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-white">{children}</div>;
  }

  return (
    <div className={`min-h-screen bg-white ${className || ""}`}>
      {showHeader && (
        <header className="border-b border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">
                  GovernsAI
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                >
                  {theme === "dark" ? "☀️" : "🌙"}
                </button>
              </div>
            </div>
          </div>
        </header>
      )}
      
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}