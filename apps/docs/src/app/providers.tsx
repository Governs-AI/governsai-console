"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider, ThemeInitializer } from "@governs-ai/layout";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import Header from "@/components/Header";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <ThemeInitializer />
        {/* <Header /> */}
        <main className="flex-grow">{children}</main>
        {/* <Footer /> */}
        {/* <ScrollToTop /> */}
      </ThemeProvider>
    </SessionProvider>
  );
}
