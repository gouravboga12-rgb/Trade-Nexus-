import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { notificationService } from '../services/notificationService';
import { AuthUser } from '../types';

export interface NotificationActionHandler {
  onNavigateToScreen: (screenName: string, params?: Record<string, any>) => void;
  currentUser: AuthUser | null;
}

export function useNotifications({ onNavigateToScreen, currentUser }: NotificationActionHandler) {
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    // Register token with backend when user is logged in
    notificationService.registerForPushNotificationsAsync().then((token) => {
      if (token && currentUser) {
        console.log('[Push] Registered device token:', token);
      }
    });

    // Foreground listener
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('[Push] Notification received in foreground:', notification);
    });

    // Tap on notification (Background or Killed app opened via tap)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (!data) return;

      const targetScreen = data.targetScreen as string;
      const requiredRoles = (data.requiredRoles as string[]) || [];

      // RBAC Permission Guard: Verify currentUser has access to target screen
      if (requiredRoles.length > 0 && currentUser) {
        if (!requiredRoles.includes(currentUser.role)) {
          console.warn('[Push] User does not have role permission for target:', targetScreen);
          return;
        }
      }

      if (targetScreen) {
        onNavigateToScreen(targetScreen, data.params as Record<string, any> | undefined);
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, [currentUser, onNavigateToScreen]);
}
