import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "../styles/calendar-direct-fix.css";
import "../styles/goal-card.css";
import "../styles/progress-transitions.css";
import "../styles/scrollbar.css";
import "../styles/sidebar-animations.css";
import "../styles/dark-mode-enhancements.css";
import "../styles/button-enhancements.css";
import "../styles/week-view-enhancements.css";
import "../styles/custom-icons.css";
import "../styles/task-detail-enhancements.css";
import "../styles/status-badges.css";
import "../styles/dropdown-overrides.css";
import { MainLayout } from "@/components/layout/MainLayout";
import { StoreHydration } from "@/components/layout/StoreHydration";

import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { NotificationProvider } from "@/components/notifications/NotificationProvider";
import { GlobalRecordingProvider } from "@/components/providers/GlobalRecordingProvider";
import { DirectProgressFix } from "./direct-progress-fix";
import { PerformanceMonitor } from "@/lib/performance/PerformanceMonitor";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NexVolv",
  description: "Your Central Source of Truth",
  icons: {
    icon: '/suped-nexvolv-logo.png',
    apple: '/suped-nexvolv-logo.png',
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased h-full`}
      >
        <NotificationProvider>
          <StoreHydration>
            <ThemeProvider>
              <GlobalRecordingProvider>
                <PerformanceMonitor enableAutoMonitoring={process.env.NODE_ENV === 'development'}>
                  <DirectProgressFix />
                  <MainLayout>{children}</MainLayout>
                </PerformanceMonitor>
              </GlobalRecordingProvider>
            </ThemeProvider>
          </StoreHydration>
        </NotificationProvider>
      </body>
    </html>
  );
}
