"use client"

import { SessionProvider } from "next-auth/react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { ThemeInitializer } from "./theme-initializer"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NextThemesProvider
        attribute="class"
        defaultTheme="dark"
        forcedTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
        storageKey="governs-ai-theme"
      >
        <ThemeInitializer />
        {children}
      </NextThemesProvider>
    </SessionProvider>
  )
} 