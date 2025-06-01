'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useReminders } from '@/contexts/ReminderContext';

import { Reminder } from '@/types';
import { differenceInMinutes } from 'date-fns';
import { getUpcomingReminders } from '@/actions/upcoming-reminders';

// Define the interval for checking reminders (in milliseconds)
const CHECK_INTERVAL = 5000; // Check every 5 seconds (reduced for testing)
const UPCOMING_THRESHOLD = 30; // Show notifications for reminders due in the next 30 minutes (increased for testing)
const MAX_RETRIES = 3; // Maximum number of retries for failed API calls
const RETRY_DELAY = 5000; // Delay between retries in milliseconds

export function useReminderNotifications() {
  const {
    reminders,
    refreshReminders,
    snoozeReminderItem,
    completeReminderItem,
    dismissReminderItem,
    triggerReminderItem,
    markReminderAsNotifiedItem
  } = useReminders();

  const [isPolling, setIsPolling] = useState(false);
  const [isCheckingServer, setIsCheckingServer] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const notifiedRemindersRef = useRef<Set<string>>(new Set());

  // Handlers for reminder actions
  const handleComplete = useCallback(async (id: string) => {
    await completeReminderItem(id);
    refreshReminders();
  }, [completeReminderItem, refreshReminders]);

  const handleSnooze = useCallback(async (id: string, minutes: number) => {
    await snoozeReminderItem(id, minutes);
    refreshReminders();
  }, [snoozeReminderItem, refreshReminders]);

  const handleDismiss = useCallback(async (id: string) => {
    await dismissReminderItem(id);
    refreshReminders();
  }, [dismissReminderItem, refreshReminders]);

  // Function to show a notification for a reminder
  const showReminderNotification = useCallback((reminder: Reminder) => {
    const now = new Date();
    const isOverdue = reminder.dueDate < now;

    // Check if we've already shown a notification for this reminder in this session
    if (notifiedRemindersRef.current.has(reminder.id)) {
      console.log('[Notification] Skipping duplicate notification for reminder:', reminder.title);
      return;
    }

    // First mark the reminder as TRIGGERED
    triggerReminderItem(reminder.id).catch(error => {
      console.error('[Notification] Error marking reminder as triggered:', error);
    });

    // Log to console for debugging
    console.log('[Notification] Showing notification for reminder:', reminder.title);

    // Create a more detailed message
    const message = `${reminder.title || 'Untitled Reminder'}${reminder.description ? ` - ${reminder.description}` : ''}`;

    // Create a title that includes the reminder type
    const title = isOverdue ? "Overdue Reminder" : "Reminder";

    // Try notification methods
    let notificationShown = false;

    // Use browser notification API
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        console.log('[Notification] Attempting to use browser Notification API');
        if (Notification.permission === 'granted') {
          new Notification(title, {
            body: message,
            icon: '/favicon.ico'
          });
          notificationShown = true;
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification(title, {
                body: message,
                icon: '/favicon.ico'
              });
              notificationShown = true;
            }
          });
        }
      } catch (error) {
        console.error('[Notification] Error using browser Notification API:', error);
      }
    }

    // Last resort - console log (always available)
    if (!notificationShown) {
      console.log(`[Notification] ${title}: ${message}`);
      notificationShown = true;
    }

    // Mark as notified in our local tracking
    notifiedRemindersRef.current.add(reminder.id);

    // Log notification status
    if (notificationShown) {
      console.log('[Notification] Notification processed');
    }

    // Update the reminder status in the database to NOTIFIED
    // This is done asynchronously and we don't need to wait for it
    markReminderAsNotifiedItem(reminder.id).catch(error => {
      console.error('[Notification] Error updating reminder status to NOTIFIED:', error);
    });
  }, [triggerReminderItem, markReminderAsNotifiedItem]);

  // Function to check for reminders that need notifications (client-side)
  const checkLocalReminders = useCallback(() => {
    const now = new Date();

    // Filter reminders that are due or about to be due
    const dueReminders = reminders.filter(reminder => {
      // Only consider pending or triggered reminders
      if (reminder.status !== 'PENDING' && reminder.status !== 'TRIGGERED') return false;

      // Calculate minutes until due
      const minutesUntilDue = differenceInMinutes(reminder.dueDate, now);

      // Show notification if:
      // 1. Reminder is overdue (negative minutes)
      // 2. Reminder is due within the threshold
      // 3. We haven't already notified about this reminder
      return (
        minutesUntilDue <= UPCOMING_THRESHOLD &&
        !notifiedRemindersRef.current.has(reminder.id)
      );
    });

    // Limit the number of notifications to show at once (max 3)
    const limitedDueReminders = dueReminders.slice(0, 3);

    // Show notifications for due reminders
    limitedDueReminders.forEach(reminder => {
      showReminderNotification(reminder);
      // Note: We don't need to add to notifiedRemindersRef here as it's now handled in showReminderNotification
    });
  }, [reminders, showReminderNotification]);

  // Function to check for reminders that need notifications (server-side)
  const checkServerReminders = useCallback(async () => {
    if (isCheckingServer) return;

    setIsCheckingServer(true);
    try {
      // Get the current user ID from the session
      // For now, we'll use a placeholder - in production this would come from the session
      const userId = 'user_placeholder';

      console.log('[Reminder Check] Checking for upcoming reminders...');

      // Fetch upcoming reminders from the server - include both PENDING and TRIGGERED status
      const result = await getUpcomingReminders(UPCOMING_THRESHOLD, true, 'PENDING', userId);

      // Also check for any TRIGGERED reminders that need to be notified
      const triggeredResult = await getUpcomingReminders(UPCOMING_THRESHOLD, true, 'TRIGGERED', userId);

      // Combine the results
      if (triggeredResult.success && triggeredResult.reminders) {
        if (result.success && result.reminders) {
          result.reminders = [...result.reminders, ...triggeredResult.reminders];
        }
      }

      if (result.success && result.reminders) {
        console.log(`[Reminder Check] Found ${result.reminders.length} upcoming reminders from server`);

        // Log all reminders for debugging
        result.reminders.forEach(reminder => {
          const dueDate = new Date(reminder.dueDate);
          const now = new Date();
          const minutesUntilDue = differenceInMinutes(dueDate, now);
          console.log(`[Reminder Check] Reminder "${reminder.title}" due in ${minutesUntilDue} minutes (status: ${reminder.status})`);
        });

        // Filter out reminders that have already been notified
        const newDueReminders = result.reminders.filter(
          reminder => !notifiedRemindersRef.current.has(reminder.id)
        );

        console.log(`[Reminder Check] Found ${newDueReminders.length} reminders that haven't been notified yet`);

        // For testing purposes, always show at least one notification if there are any reminders
        // This helps ensure the notification system is working
        if (newDueReminders.length === 0 && result.reminders.length > 0) {
          // Force a notification for the first reminder for testing
          const testReminder = result.reminders[0];
          console.log(`[Reminder Check] Forcing a test notification for "${testReminder.title}"`);

          // Clear the notification record for this reminder to allow re-notification
          notifiedRemindersRef.current.delete(testReminder.id);

          // Show the notification
          showReminderNotification(testReminder);
        } else {
          // Show notifications for all new due reminders (no limit for testing)
          newDueReminders.forEach(reminder => {
            console.log(`[Reminder Check] Showing notification for "${reminder.title}"`);
            showReminderNotification(reminder);
          });
        }

        // Reset retry count on success
        setRetryCount(0);

        // Always refresh the local state to ensure we have the latest data
        refreshReminders();
      } else {
        console.error('Failed to fetch upcoming reminders:', result.error);
        handleRetry();
      }
    } catch (error) {
      console.error('Error checking server reminders:', error);
      handleRetry();
    } finally {
      setIsCheckingServer(false);
      setLastChecked(new Date());
    }
  }, [isCheckingServer, showReminderNotification, refreshReminders, handleRetry]);

  // Handle retry logic for failed API calls
  const handleRetry = useCallback(() => {
    if (retryCount < MAX_RETRIES) {
      setRetryCount(prev => prev + 1);
      setTimeout(() => {
        checkServerReminders();
      }, RETRY_DELAY);
    } else {
      console.error(`Failed to fetch reminders after ${MAX_RETRIES} retries. Falling back to local checks.`);
      setRetryCount(0);
      // Fall back to local reminder checking
      checkLocalReminders();
    }
  }, [retryCount, checkServerReminders, checkLocalReminders]);

  // Combined function to check reminders (both client and server)
  const checkReminders = useCallback(() => {
    // First check local reminders for immediate feedback
    checkLocalReminders();

    // Then check server for any reminders that might have been added elsewhere
    checkServerReminders();

    // Refresh the reminders list to ensure we have the latest data
    refreshReminders();
  }, [checkLocalReminders, checkServerReminders, refreshReminders]);

  // Start polling for reminders
  const startPolling = useCallback(() => {
    if (isPolling) return;

    // Check immediately on start
    checkReminders();

    // Set up interval for regular checks
    intervalRef.current = setInterval(checkReminders, CHECK_INTERVAL);
    setIsPolling(true);
    console.log('Started polling for reminders every', CHECK_INTERVAL / 1000, 'seconds');
  }, [isPolling, checkReminders]);

  // Stop polling for reminders
  const stopPolling = useCallback(() => {
    if (!isPolling || !intervalRef.current) return;

    clearInterval(intervalRef.current);
    intervalRef.current = null;
    setIsPolling(false);
    console.log('Stopped polling for reminders');
  }, [isPolling]);

  // Function to clear all notifications
  const clearAllNotifications = useCallback(() => {
    notifiedRemindersRef.current.clear();
    console.log('Cleared all notification records');
  }, []);

  // Set up periodic cleanup of notified reminders
  useEffect(() => {
    // Clear notified reminders every hour to prevent memory buildup
    const cleanupInterval = setInterval(() => {
      console.log('Clearing notified reminders cache');
      notifiedRemindersRef.current.clear();
    }, 3600000); // 1 hour

    // Clean up on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      clearInterval(cleanupInterval);
    };
  }, []);

  return {
    isPolling,
    startPolling,
    stopPolling,
    checkReminders,
    lastChecked,
    handleComplete,
    handleSnooze,
    handleDismiss,
    clearAllNotifications,
  };
}
