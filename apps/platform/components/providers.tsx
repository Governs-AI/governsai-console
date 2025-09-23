"use client"

import { ThemeProvider, ThemeInitializer } from "@governs-ai/layout"
import { Toaster } from "sonner"
import { SessionProvider } from "next-auth/react"
import { TourProvider } from "@/components/tour-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <ThemeInitializer />
        <TourProvider>
          {children}
        </TourProvider>
        <Toaster 
          position="top-right"
          richColors
          closeButton
          duration={4000}
          theme="dark"
          offset={16}
        />
      </ThemeProvider>
    </SessionProvider>
  )
} 