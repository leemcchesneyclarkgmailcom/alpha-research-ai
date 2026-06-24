import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";
import { QueryProvider } from "@/components/query-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Alpha Research AI — Institutional-Grade Equity Research, Automated",
  description:
    "AI-powered stock research platform that continuously analyzes public companies and generates institutional-quality research reports.",
  keywords: [
    "Alpha Research AI",
    "stock research",
    "AI analyst",
    "equity research",
    "SEC filings",
    "earnings",
    "investment thesis",
  ],
  authors: [{ name: "Alpha Research AI" }],
  icons: { icon: "/logo.svg" },
  openGraph: {
    title: "Alpha Research AI",
    description: "Institutional-grade equity research, automated.",
    siteName: "Alpha Research AI",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthProvider>
              {children}
              <Toaster />
              <SonnerToaster richColors position="top-right" />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
