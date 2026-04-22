/**
 * Root Layout Component
 *
 * Main layout wrapper for the application.
 */

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { PriceAlertMonitor } from "@/components/trading/PriceAlertMonitor";
import "./globals.css";

// Load Inter font with Latin subset
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Stock Trading Analysis — Global Market Swing Trade Signals",
  description: "Daily swing trade signals across US, Asia, EUR/UK and growth stocks. Technical analysis, Minervini trend scoring, dip opportunity detection, and ATR-based risk management.",
  keywords: ["swing trading", "stock analysis", "price action", "technical analysis", "large cap stocks"],
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-gray-50 font-sans">
        <Providers>{children}</Providers>
        <PriceAlertMonitor />
      </body>
    </html>
  );
}
