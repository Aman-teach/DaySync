import React from 'react';
import { Platform, StyleSheet, useColorScheme, View, Text, TouchableOpacity } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { SymbolView, SFSymbol } from 'expo-symbols';

// ─── Web Sidebar Nav ────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: 'Today',   route: '/',        icon: 'calendar'     },
  { label: 'Tower',   route: '/tower',   icon: 'layers'       },
  { label: 'Log',     route: '/checkin', icon: 'plus-circle', isAction: true },
  { label: 'Stats',   route: '/stats',   icon: 'bar-chart-2'  },
  { label: 'History', route: '/history', icon: 'clock'        },
] as const;

function WebSidebar() {
  const colors = useColors();
  const router = useRouter();
  const pathname = usePathname();

  // Precisely match the active route so only ONE item is highlighted
  const isActive = (route: string) => {
    if (route === '/') {
      return pathname === '/' || pathname === '' || pathname === '/index' || pathname === '/(tabs)';
    }
    return pathname.startsWith(route);
  };

  return (
    <View style={[styles.sidebar, { backgroundColor: colors.card, borderRightColor: colors.border }]}>
      {/* Logo mark at top */}
      <View style={[styles.logoMark, { backgroundColor: colors.primary + '15' }]}>
        <Feather name="wind" size={18} color={colors.primary} />
      </View>

      {/* Stacked Nav Rail Items */}
      <View style={styles.navItems}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.route);
          const isAction = 'isAction' in item && item.isAction;

          return (
            <TouchableOpacity
              key={item.route}
              style={[
                styles.navItem,
                active && { backgroundColor: colors.primary + '14' },
              ]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.8}
            >
              <Feather
                name={item.icon as any}
                size={21}
                color={
                  active
                    ? colors.primary
                    : isAction
                    ? colors.primary
                    : colors.mutedForeground
                }
              />
              <Text
                style={[
                  styles.navLabel,
                  {
                    color: active
                      ? colors.primary
                      : isAction
                      ? colors.primary
                      : colors.mutedForeground,
                    fontFamily: active ? 'Inter_700Bold' : 'Inter_600SemiBold',
                  },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* Settings at bottom */}
      <TouchableOpacity
        style={[
          styles.sidebarSettings,
          pathname.startsWith('/settings') && { backgroundColor: colors.primary + '14' },
        ]}
        onPress={() => router.push('/settings' as any)}
        activeOpacity={0.8}
      >
        <Feather
          name="settings"
          size={20}
          color={pathname.startsWith('/settings') ? colors.primary : colors.mutedForeground}
        />
        <Text
          style={[
            styles.navLabel,
            { color: pathname.startsWith('/settings') ? colors.primary : colors.mutedForeground },
          ]}
        >
          Settings
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Root Tab Layout ─────────────────────────────────────────────────────────

export default function TabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  if (isWeb) {
    return (
      <View style={styles.webRoot}>
        <WebSidebar />
        <View style={styles.webContent}>
          <Tabs
            screenOptions={{
              headerShown: false,
              tabBarStyle: { display: 'none' }, // hide native tab bar on web
            }}
          >
            <Tabs.Screen name="index" />
            <Tabs.Screen name="tower" />
            <Tabs.Screen name="stats" />
            <Tabs.Screen name="history" />
          </Tabs>
        </View>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: isIOS ? 'absolute' : undefined,
          backgroundColor: isIOS ? 'transparent' : colors.background,
          borderTopWidth: 0,
          elevation: 0,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={90}
              tint={isDark ? 'dark' : 'extraLight'}
              style={StyleSheet.absoluteFill}
            />
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

const styles = StyleSheet.create({
  // ── Web shell ──
  webRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  webContent: {
    flex: 1,
    overflow: 'hidden',
  },

  // ── Ultra-Slim Icon Rail Sidebar ──
  sidebar: {
    width: 72,
    height: '100%' as any,
    borderRightWidth: 1,
    paddingTop: 20,
    paddingBottom: 20,
    alignItems: 'center',
    flexDirection: 'column',
    // Ultra-clean card shadow
    shadowColor: '#000',
    shadowOffset: { width: 1, height: 0 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  logoMark: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },

  // ── Stacked Rail Nav Items ──
  navItems: {
    gap: 12,
    alignItems: 'center',
  },
  navItem: {
    width: 58,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  actionIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: -0.2,
  },

  // ── Settings at bottom ──
  sidebarSettings: {
    width: 58,
    paddingVertical: 8,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 4,
  },
});
