'use client';

import React, { useEffect } from 'react';
import { notificationService } from '@/lib/notifications/notification-service';

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  // Initialize the notification service without toast functionality
  useEffect(() => {
    notificationService.initialize();
  }, []);

  return <>{children}</>;
}
