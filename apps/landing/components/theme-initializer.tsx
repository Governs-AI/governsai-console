"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

export function ThemeInitializer() {
  const { setTheme } = useTheme();

  useEffect(() => {
    // Always force dark mode for routing app
    setTheme('dark');
    
    // Remove any existing theme data to prevent conflicts
    localStorage.removeItem('governs-ai-theme');
    localStorage.removeItem('theme');
    localStorage.removeItem('next-themes-prefs');
    localStorage.removeItem('governs-ai-theme');
    
    // Set a flag to indicate this app is dark-mode only
    localStorage.setItem('routing-dark-only', 'true');
  }, [setTheme]);

  return null;
}
