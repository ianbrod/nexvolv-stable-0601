import Link from 'next/link';
import React from 'react';
import {
  CheckCircle2,
  Settings,
  Bell,
  Mic
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePathname, useRouter } from 'next/navigation';
import { CustomTargetIcon, CustomNotepadIcon, CustomCalendarIcon, CustomBullseyeIcon } from './CustomIcons';
import { triggerRecording } from '@/lib/events/recording-events';

export const navItems = [
  { href: '/', label: 'Dashboard', icon: CustomCalendarIcon },
  { href: '/goals', label: 'Goals', icon: CustomBullseyeIcon },
  { href: '/tasks', label: 'Tasks', icon: CheckCircle2, className: 'text-green-500' },
  { href: '/captainslog', label: "Captain's Log", icon: CustomNotepadIcon },
];

// Settings item is now separate to be positioned at the bottom
export const settingsItem = { href: '/settings', label: 'Settings', icon: Settings };

interface SidebarNavProps {
  onNewRecording?: () => void;
}

export function SidebarNav({ onNewRecording }: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Handle recording button click
  const handleRecordClick = () => {
    // Trigger recording modal directly without navigation
    triggerRecording();
  };
  return (
    <nav className="flex flex-col h-full p-4">
      <div className="mb-6">
        {/* TODO: Replace with Logo Component */}
        <Link href="/">
          <span className="text-2xl font-bold text-gray-800">NexVolv</span>
        </Link>
      </div>
      <ul className="space-y-2">
        {navItems.map((item) => (
          <li key={item.href}>
            <Link href={item.href}>
              <span className="flex items-center px-3 py-2 rounded-md text-gray-700 hover:bg-gray-200 hover:text-gray-900 transition-colors duration-150">
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {/* Bookends section removed */}

      {/* Recording Button - Larger and more colorful */}
      <div className="mt-6 flex justify-center">
        <Button
          onClick={handleRecordClick}
          className="w-20 h-20 rounded-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 transition-all hover:scale-105 active:scale-95 shadow-lg"
          aria-label="Start recording"
        >
          <Mic className="h-10 w-10 text-white" />
        </Button>
      </div>

      {/* Spacer to push reminder button to bottom */}
      <div className="flex-grow"></div>

      {/* Reminder Button */}
      <div className="mt-4 px-3">
        <Link href="/reminders">
          <span className="flex items-center px-3 py-2 text-xs rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 hover:text-gray-900 transition-colors duration-150">
            <Bell className="mr-2 h-3 w-3" />
            Add Reminder
          </span>
        </Link>
      </div>
    </nav>
  );
}