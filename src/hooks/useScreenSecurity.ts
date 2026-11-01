import React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import * as ScreenCapture from 'expo-screen-capture';

/**
 * Enforces native Android FLAG_SECURE exclusively when the Leads screen is focused,
 * strictly for Telecaller and Team Leader roles.
 * When the user navigates away to any other screen (Attendance, Profile, Home),
 * screen capture is automatically re-allowed.
 */
export function useLeadsScreenSecurity(userRole?: string): void {
  useFocusEffect(
    React.useCallback(() => {
      const isRestrictedRole = userRole === 'telecaller' || userRole === 'team_leader' || userRole === 'employee';

      if (isRestrictedRole) {
        // Apply FLAG_SECURE: blocks screenshots, blanks screen recordings, and obscures recent-apps card
        ScreenCapture.preventScreenCaptureAsync('leads_screen_security').catch((err) => {
          console.warn('[ScreenSecurity] preventScreenCaptureAsync error:', err);
        });
      }

      return () => {
        if (isRestrictedRole) {
          ScreenCapture.allowScreenCaptureAsync('leads_screen_security').catch((err) => {
            console.warn('[ScreenSecurity] allowScreenCaptureAsync error:', err);
          });
        }
      };
    }, [userRole])
  );
}

