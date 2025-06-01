import { getReminders } from '@/actions/reminders-prisma';
import { ReminderProvider } from '@/contexts/ReminderContext';
import { ReminderList } from '@/components/reminders/ReminderList';

export default async function RemindersPage() {
  // Fetch initial reminders from the server
  const result = await getReminders();
  const initialReminders = result.success ? result.reminders : [];

  return (
    <div className="w-full px-4 py-4">
      <ReminderProvider initialReminders={initialReminders}>
        <div className="flex flex-col min-h-[80vh]">
          <div className="flex-grow mb-4">
            <ReminderList />
          </div>
        </div>
      </ReminderProvider>
    </div>
  );
}
