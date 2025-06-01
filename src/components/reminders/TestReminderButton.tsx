'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { createTestReminder } from '@/actions/create-test-reminder';
import { useReminders } from '@/contexts/ReminderContext';
import { notificationService } from '@/lib/notifications/notification-service';

export function TestReminderButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { refreshReminders, checkForDueReminders } = useReminders();

  const handleClick = async () => {
    setIsLoading(true);
    setSuccess(false);
    try {
      console.log('[Test] Creating test reminder...');

      // Create a test reminder
      const result = await createTestReminder();

      if (result.success) {
        console.log('[Test] Test reminder created:', result.reminder);

        // Show a success notification
        notificationService.showNotification(
          'Test reminder created successfully!',
          'success'
        );

        // Refresh reminders to ensure the new one is in the list
        await refreshReminders();

        // Manually trigger a reminder check multiple times to ensure it works
        if (typeof window !== 'undefined' && (window as any).testReminderNotification) {
          console.log('[Test] Manually triggering reminder check...');

          // First check immediately
          (window as any).testReminderNotification();

          // Trigger again after a short delay
          setTimeout(() => {
            console.log('[Test] Triggering reminder check again...');
            (window as any).testReminderNotification();
          }, 1000);

          // And once more for good measure
          setTimeout(() => {
            console.log('[Test] Triggering reminder check one more time...');
            (window as any).testReminderNotification();
          }, 2000);
        } else {
          // Fallback to direct check
          setTimeout(async () => {
            console.log('[Test] Checking for due reminders directly...');
            const dueReminders = await checkForDueReminders();
            console.log('[Test] Due reminders:', dueReminders);
          }, 2000);
        }

        setSuccess(true);

        // Reset success state after 3 seconds
        setTimeout(() => {
          setSuccess(false);
        }, 3000);
      } else {
        console.error('[Test] Failed to create test reminder:', result.error);

        // Show an error notification
        notificationService.showNotification(
          `Failed to create test reminder: ${result.error}`,
          'error'
        );
      }
    } catch (error) {
      console.error('[Test] Error creating test reminder:', error);

      // Show an error notification
      notificationService.showNotification(
        'Error creating test reminder',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={isLoading}
      variant={success ? "success" : isLoading ? "secondary" : "destructive"}
      size="sm"
      className="w-full text-xs justify-start font-bold"
    >
      {isLoading ? '⏳ Creating Test Reminder...' :
       success ? '✅ Test Reminder Created!' :
       '🔔 TEST NOTIFICATION NOW'}
    </Button>
  );
}
