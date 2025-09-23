import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "GovernsAI - The AI Governance OS",
    template: "%s | GovernsAI",
  },
  description: "Secure control plane for AI interactions. Monitor, control, and govern your AI usage with complete visibility and compliance.",
  keywords: ["AI governance", "AI security", "AI monitoring", "AI compliance", "AI proxy", "AI management"],
  authors: [{ name: "GovernsAI" }],
  creator: "GovernsAI",
  metadataBase: new URL(process.env.NEXT_PUBLIC_LANDING_URL || "https://governs.ai"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_LANDING_URL || "https://governs.ai",
    title: "GovernsAI - The AI Governance OS",
    description: "Secure control plane for AI interactions. Monitor, control, and govern your AI usage with complete visibility and compliance.",
    siteName: "GovernsAI",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GovernsAI - The AI Governance OS",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GovernsAI - The AI Governance OS",
    description: "Secure control plane for AI interactions. Monitor, control, and govern your AI usage with complete visibility and compliance.",
    images: ["/og-image.png"],
    creator: "@governsai",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  generator: "Next.js",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#667eea" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5"
        />
        <meta name="apple-mobile-web-app-title" content="GovernsAI" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <div className="min-h-screen bg-white">
          <header className="border-b bg-white">
            <div className="max-w-6xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h1 className="text-xl font-bold text-gray-900">GovernsAI</h1>
                </div>
                <nav className="flex items-center space-x-6">
                  <a href="/docs" className="text-sm text-gray-600 hover:text-gray-900">Docs</a>
                  <a href="/platform" className="text-sm text-gray-600 hover:text-gray-900">Platform</a>
                  <a href="/pricing" className="text-sm text-gray-600 hover:text-gray-900">Pricing</a>
                  <a href="/contact" className="text-sm text-gray-600 hover:text-gray-900">Contact</a>
                </nav>
              </div>
            </div>
          </header>
          <main>{children}</main>
          <footer className="border-t bg-gray-50">
            <div className="max-w-6xl mx-auto px-4 py-8">
              <div className="text-center text-sm text-gray-600">
                <p>&copy; 2024 GovernsAI. All rights reserved.</p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}