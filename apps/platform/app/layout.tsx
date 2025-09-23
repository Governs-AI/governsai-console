import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
// import { ErrorBoundary } from "@/components/ui/error-boundary"
// import { ToastProvider, ToastViewport } from "@/components/ui/toast"
// import { APP_CONFIG, getValidAppUrl } from "@/lib/constants"
// import { Providers } from "@/components/providers"
// import { AppLayout } from "@/components/app-layout"
// import { StructuredData } from "@/components/seo-structured-data"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: "GovernsAI Platform",
  description: "AI Governance Platform",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <meta name="theme-color" content="#667eea" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  )
}
