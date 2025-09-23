import { Inter } from "next/font/google";
import "../styles/index.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_DOCS_URL || "https://docs.governs.ai"),
  title: {
    default: "GovernsAI Documentation",
    template: "%s | GovernsAI Docs",
  },
  description: "Complete documentation for GovernsAI - The AI Governance OS",
  openGraph: {
    title: "GovernsAI Documentation",
    description: "Learn how to use GovernsAI to secure, monitor, and control your AI interactions",
    url: process.env.NEXT_PUBLIC_DOCS_URL || "",
    siteName: "GovernsAI Documentation",
    images: [
      {
        url: "/og-image.png",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="en" className={inter.variable}>
      <body className={`${inter.className} antialiased`}>
        <div className="min-h-screen bg-white">
          <header className="border-b bg-white">
            <div className="max-w-6xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h1 className="text-xl font-bold text-gray-900">GovernsAI</h1>
                  <span className="text-sm text-gray-500">Documentation</span>
                </div>
                <nav className="flex items-center space-x-6">
                  <a href="/" className="text-sm text-gray-600 hover:text-gray-900">Home</a>
                  <a href="/getting-started" className="text-sm text-gray-600 hover:text-gray-900">Getting Started</a>
                  <a href="/api-reference" className="text-sm text-gray-600 hover:text-gray-900">API Reference</a>
                  <a href="/guides" className="text-sm text-gray-600 hover:text-gray-900">Guides</a>
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