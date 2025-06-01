'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { navItems, settingsItem } from './SidebarNav';
import {
  Mic,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReminderModal } from '@/components/dashboard/ReminderModal';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { ReminderProvider } from '@/contexts/ReminderContext';
import { Logo } from './Logo';
import { Reminder } from '@/types';
import { triggerRecording } from '@/lib/events/recording-events';

interface SidebarNavClientProps {
  isCollapsed?: boolean;
}

export function SidebarNavClient({ isCollapsed = false }: SidebarNavClientProps) {
  const pathname = usePathname();

  // Empty array for initialReminders in sidebar
  const initialReminders: Reminder[] = [];

  // Handle recording button click
  const handleRecordClick = () => {
    // Trigger recording modal directly without navigation
    triggerRecording();
  };

  // If collapsed, render a simplified version with only icons
  if (isCollapsed) {
    return (
      <div className="h-full flex flex-col relative">
        {/* Top section with navigation icons */}
        <div className="pt-12 flex flex-col items-center">
          <ul className="space-y-8">
            {navItems.map((item, index) => {
              const isActive = pathname === item.href ||
                              (item.href !== '/' && pathname.startsWith(item.href));

              // Replace Dashboard icon with Logo for the first item (Dashboard)
              if (index === 0) {
                return (
                  <li key={item.href}>
                    <Link href={item.href}>
                      <span
                        className={cn(
                          "flex items-center justify-center w-8 h-8 transition-transform duration-150 hover:scale-105",
                          isActive
                            ? "text-primary"
                            : "text-gray-700 dark:text-gray-200"
                        )}
                        title={item.label}
                        aria-label={item.label}
                      >
                        <Logo isCollapsed={true} sizeMultiplier={1.15} />
                      </span>
                    </Link>
                  </li>
                );
              }

              // Regular icon for other items
              return (
                <li key={item.href}>
                  <Link href={item.href}>
                    <span
                      className={cn(
                        "flex items-center justify-center w-8 h-8 transition-all duration-150",
                        isActive
                          ? "text-primary scale-110"
                          : "text-gray-700 dark:text-gray-200 hover:text-primary hover:scale-110"
                      )}
                      title={item.label}
                      aria-label={item.label}
                    >
                      <item.icon className={cn("h-7 w-7", item.className)} />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Recording Button - In its original position after navigation items */}
          <div className="mt-12">
            <button
              onClick={handleRecordClick}
              className="bg-transparent border-none p-0 cursor-pointer transition-transform hover:scale-110 focus:outline-none"
              aria-label="Start recording"
              title="Start recording"
            >
              <Mic
                className="animate-subtle-pulse"
                style={{
                  color: "#780eef",
                  height: "40.5px", /* Increased by another 12.5% from 36px */
                  width: "40.5px", /* Increased by another 12.5% from 36px */
                  strokeWidth: 2
                }}
              />
            </button>
          </div>
        </div>

        {/* Spacer to push bottom section to the bottom */}
        <div className="flex-1"></div>

        {/* Bottom section - positioned absolutely within the sidebar */}
        <div className="absolute bottom-0 left-0 right-0 bg-card pb-6 transition-all duration-300 ease-in-out">
          {/* Reminder Button - Icon only - Direct access to ReminderModal */}
          <div className="flex items-center justify-center w-full h-9 mb-4">
            <ReminderProvider initialReminders={initialReminders}>
              <ReminderModal iconOnly={true} />
            </ReminderProvider>
          </div>

          {/* Theme Toggle - Icon only */}
          <div className="flex items-center justify-center w-full h-9 mb-4">
            <ThemeToggle iconOnly={true} />
          </div>

          {/* Settings - Icon only */}
          <div className="flex items-center justify-center w-full h-9">
            <Link href={settingsItem.href}>
              <span
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-md transition-colors duration-150",
                  pathname === settingsItem.href || pathname.startsWith(settingsItem.href)
                    ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
                    : "text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                )}
                title={settingsItem.label}
                aria-label={settingsItem.label}
              >
                <settingsItem.icon className="h-7 w-7 text-gray-500" />
              </span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Expanded state
  return (
    <div className="h-full flex flex-col relative">
      {/* Top section with logo and navigation */}
      <div className="p-4 pt-12">
        <div className="mb-10 flex justify-center">
          <Logo />
        </div>
        <ul className="space-y-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
                            (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <li key={item.href}>
                <Link href={item.href}>
                  <span className={cn(
                    "flex items-center px-3 py-2 rounded-md transition-all duration-150",
                    isActive
                      ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-medium"
                      : "text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                  )}>
                    <item.icon className={cn("mr-2 h-7 w-7", item.className)} />
                    <span className="ml-1">{item.label}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Recording Button - In its original position after navigation items */}
        <div className="mt-16 flex justify-center">
          <Button
            onClick={handleRecordClick}
            className="w-[84px] h-[84px] rounded-full bg-gradient-to-r from-purple-900 to-indigo-800 hover:from-purple-800 hover:to-indigo-700 transition-all active:scale-95 shadow-2xl border-4 border-white animate-subtle-pulse"
            aria-label="Start recording"
            style={{ minWidth: 84, minHeight: 84, padding: 0 }}
          >
            <Mic className="text-white" style={{ width: 56, height: 56, strokeWidth: 1.25 }} />
          </Button>
        </div>
      </div>

      {/* Spacer to push bottom section to the bottom */}
      <div className="flex-1"></div>

      {/* Bottom section - positioned absolutely within the sidebar */}
      <div className="absolute bottom-0 left-0 right-0 bg-card p-4 space-y-2 transition-all duration-300 ease-in-out">
        {/* Reminder Button */}
        <div className="flex justify-center">
          <ReminderProvider initialReminders={initialReminders}>
            <ReminderModal />
          </ReminderProvider>
        </div>

        {/* Theme Toggle */}
        <div className="flex justify-center">
          <ThemeToggle />
        </div>

        {/* Settings Navigation */}
        <div className="flex justify-center">
          <Link href={settingsItem.href}>
            <span className={cn(
              "flex items-center px-3 py-2 rounded-md transition-colors duration-150",
              pathname === settingsItem.href || pathname.startsWith(settingsItem.href)
                ? "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-medium"
                : "text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
            )}>
              <settingsItem.icon className="mr-2 h-7 w-7 text-gray-500" />
              {settingsItem.label}
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}