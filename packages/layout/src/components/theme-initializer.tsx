"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

export function ThemeInitializer() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    // Check for existing theme data and migrate if needed
    const existingTheme = localStorage.getItem('governs-ai-theme');
    const oldThemeKeys = ['theme', 'next-themes-prefs', 'governs-ai-theme'];
    
    let shouldSetTheme = false;
    let themeToSet = 'dark';

    // Check if we have a stored theme
    if (existingTheme) {
      try {
        const parsed = JSON.parse(existingTheme);
        if (parsed.theme) {
          themeToSet = parsed.theme;
          shouldSetTheme = true;
        }
      } catch (e) {
        // Failed to parse existing theme
      }
    }

    // Check for old theme keys and migrate them
    for (const key of oldThemeKeys) {
      const oldTheme = localStorage.getItem(key);
      if (oldTheme && !existingTheme) {
        try {
          const parsed = JSON.parse(oldTheme);
          if (parsed.theme) {
            themeToSet = parsed.theme;
            shouldSetTheme = true;
          }
        } catch (e) {
          // If it's not JSON, it might be a simple string
          if (oldTheme === 'dark' || oldTheme === 'light' || oldTheme === 'system') {
            themeToSet = oldTheme;
            shouldSetTheme = true;
          }
        }
        // Remove old key
        localStorage.removeItem(key);
      }
    }

    // Set theme if needed
    if (shouldSetTheme && themeToSet !== theme) {
      setTheme(themeToSet);
    } else if (!existingTheme) {
      // If no theme exists, set to dark
      setTheme('dark');
    }
  }, [theme, setTheme, resolvedTheme]);

  return null;
} 