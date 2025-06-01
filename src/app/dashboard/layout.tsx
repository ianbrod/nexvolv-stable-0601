import { getReminders } from '@/actions/reminders-prisma';
import { ReminderProvider } from '@/contexts/ReminderContext';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch initial reminders from the server
  const result = await getReminders();
  const initialReminders = result.success ? result.reminders : [];
  
  return (
    <ReminderProvider initialReminders={initialReminders}>
      {children}
    </ReminderProvider>
  );
}
