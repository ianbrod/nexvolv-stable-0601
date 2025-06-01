'use client';

// Notification types
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

// Options for notifications
interface NotificationOptions {
  autoClose?: number | boolean;
  closeButton?: boolean;
  onClick?: () => void;
}

class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public initialize(): void {
    if (typeof window === 'undefined') return;

    this.isInitialized = true;
    console.log('NotificationService initialized (toast functionality removed)');
  }

  public showNotification(
    message: string,
    type: NotificationType = 'info',
    options?: NotificationOptions
  ): string {
    if (!this.isInitialized) {
      console.warn('NotificationService not initialized before showing notification');
      this.initialize();
    }

    console.log(`[NotificationService] ${type.toUpperCase()}: ${message}`);

    // Generate a unique ID for this notification
    const id = Math.random().toString(36).substring(2, 9);

    return id;
  }

  public dismissNotification(id: string): void {
    console.log(`[NotificationService] Dismissing notification: ${id}`);
  }

  public dismissAll(): void {
    console.log('[NotificationService] Dismissing all notifications');
  }
}

export const notificationService = NotificationService.getInstance();
