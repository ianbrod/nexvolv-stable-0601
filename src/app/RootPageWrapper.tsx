'use client';

import { ReminderProvider } from '@/contexts/ReminderContext';
import { Reminder } from '@/types';
import DashboardPage from './DashboardPage';

export default function RootPageWrapper({ reminders }: { reminders: Reminder[] }) {
  return (
    <ReminderProvider initialReminders={reminders}>
      <DashboardPage />
    </ReminderProvider>
  );
}
