'use client';

import { useEffect } from 'react';
import { notificationService } from '@/lib/notifications/notification-service';

interface ReminderNotificationProviderProps {
  children: React.ReactNode;
}

export function ReminderNotificationProvider({ children }: ReminderNotificationProviderProps) {
  // Set up test notification function
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).testReminderNotification = () => {
        console.log('Manually triggering test notification...');

        // Show a test notification
        notificationService.showNotification(
          'This is a test notification',
          'info',
          {
            autoClose: 5000
          }
        );
      };

      // Show an initial notification to confirm the system is working
      const timer = setTimeout(() => {
        notificationService.showNotification(
          'Notification system is ready',
          'success',
          { autoClose: 3000 }
        );
      }, 2000);

      return () => {
        clearTimeout(timer);
        if (typeof window !== 'undefined') {
          delete (window as any).testReminderNotification;
        }
      };
    }
  }, []);

  return <>{children}</>;
}
