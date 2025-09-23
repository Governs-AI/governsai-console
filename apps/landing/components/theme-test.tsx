"use client";

import { useTheme } from "next-themes";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Moon, AlertCircle } from "lucide-react";

export function ThemeTest() {
  const { theme, resolvedTheme } = useTheme();

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Moon className="w-5 h-5 text-blue-500" />
          Theme Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Current Theme: <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{theme}</span>
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Resolved Theme: <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{resolvedTheme}</span>
          </p>
        </div>
        
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                Dark Mode Only
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                This routing app is configured to use dark theme only. 
                Theme switching is disabled to maintain consistent branding.
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <p className="text-slate-900 dark:text-white text-sm">
            This card demonstrates the dark theme styling
          </p>
        </div>
        
        <div className="text-center">
          <Button disabled variant="outline" size="sm" className="cursor-not-allowed opacity-60">
            Theme Switching Disabled
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
