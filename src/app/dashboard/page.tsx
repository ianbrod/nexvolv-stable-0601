import { getReminders } from '@/actions/reminders-prisma';
import { ReminderProvider } from '@/contexts/ReminderContext';
import DashboardClient from '@/components/dashboard/DashboardClient';

export default async function DashboardPage() {
  // Fetch initial reminders from the server
  const result = await getReminders();
  const initialReminders = result.success ? result.reminders : [];
  
  return (
    <ReminderProvider initialReminders={initialReminders}>
      <DashboardClient />
    </ReminderProvider>
  );
}
