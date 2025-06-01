import { getReminders } from '@/actions/reminders-prisma';
import RootPageWrapper from './RootPageWrapper';

export default async function Page() {
  // Fetch initial reminders from the server
  const result = await getReminders();
  const initialReminders = result.success ? result.reminders : [];
  
  return <RootPageWrapper reminders={initialReminders} />;
}
