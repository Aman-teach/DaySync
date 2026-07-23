import React from 'react';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { SymbolView, SFSymbol } from 'expo-symbols';

export default function TabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: isIOS ? 'absolute' : undefined,
          backgroundColor: isIOS ? 'transparent' : colors.background,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={90}
              tint={isDark ? 'dark' : 'extraLight'}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name={focused ? "calendar.circle.fill" : "calendar.circle" as SFSymbol} tintColor={color} size={24} />
            ) : (
              <Ionicons name={focused ? "calendar" : "calendar-outline"} size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="tower"
        options={{
          title: 'Tower',
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name={focused ? "square.stack.3d.up.fill" : "square.stack.3d.up" as SFSymbol} tintColor={color} size={24} />
            ) : (
              <Ionicons name={focused ? "albums" : "albums-outline"} size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name={focused ? "chart.pie.fill" : "chart.pie" as SFSymbol} tintColor={color} size={24} />
            ) : (
              <Ionicons name={focused ? "stats-chart" : "stats-chart-outline"} size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) =>
            isIOS ? (
              <SymbolView name={focused ? "clock.fill" : "clock" as SFSymbol} tintColor={color} size={24} />
            ) : (
              <Ionicons name={focused ? "time" : "time-outline"} size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}
