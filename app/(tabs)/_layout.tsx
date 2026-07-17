import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, useWindowDimensions } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useCalendarSync } from '@/hooks/use-calendar-sync';
import { useDroppedOpCount } from '@/hooks/use-dropped-ops';
import { useNotificationNavigation } from '@/hooks/use-notification-navigation';
import { useNotificationSync } from '@/hooks/use-notification-sync';
import { useQuickActions } from '@/hooks/use-quick-actions';
import { useWidgetSnapshot } from '@/hooks/use-widget-snapshot';
import { useTheme } from '@/lib/theme/use-theme';

export default function TabLayout() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  // Tabs only render when signed in, so these run exactly when they should.
  useNotificationSync();
  useNotificationNavigation();
  useCalendarSync();
  useQuickActions();
  useWidgetSnapshot();
  useDroppedOpCount({ notify: true });

  // Desktop/web: navigation moves to a LEFT-side rail (developer pick
  // 2026-07-11 after seeing the right rail live; docs/design/08 updated) —
  // the bottom bar is a phone pattern. React Navigation 7 requires the
  // 'material' variant for side positions.
  const sideNav = Platform.OS === 'web' && width >= 1024;

  return (
    <Tabs
      screenOptions={{
        // Token accent, NOT the Expo template's teal — the active tab is the
        // most-seen accent in the app and must match the brand color.
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textTertiary,
        headerShown: false,
        tabBarButton: HapticTab,
        ...(sideNav
          ? ({
              tabBarPosition: 'left',
              tabBarVariant: 'material',
              tabBarLabelPosition: 'below-icon',
            } as const)
          : null),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="checklist" color={color} />,
        }}
      />
      <Tabs.Screen
        name="daily"
        options={{
          title: 'Daily',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="sun.max.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
