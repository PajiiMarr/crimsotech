// app/rider/includes/bottomTab.tsx
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RiderBottomTab() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  // Routes where the bottom tab should be hidden
  const hiddenRoutes = [
    '/rider/rider-view-order',
    '/rider/active-order-details',
    '/rider/delivery-details',
    '/rider/add-delivery-media',
    '/rider/add-proof',
  ];

  // Check if current route should hide the tab bar
  const shouldHideTabBar = hiddenRoutes.some(route => pathname?.startsWith(route));

  // If on a hidden route, don't render anything
  if (shouldHideTabBar) {
    return null;
  }

  const tabs = [
    { name: 'Home', icon: 'home-outline', route: '/rider/home' },
    { name: 'Orders', icon: 'list-outline', route: '/rider/active-orders' },
    { name: 'History', icon: 'time-outline', route: '/rider/history' },
    { name: 'Schedule', icon: 'calendar-outline', route: '/rider/schedule' },
    { name: 'Earnings', icon: 'cash-outline', route: '/rider/earnings' },
    { name: 'More', icon: 'menu-outline', route: '/rider/settings' },
  ] as const;

  const activeIcons: Record<string, string> = {
    'Home': 'home',
    'Orders': 'list',
    'History': 'time',
    'Schedule': 'calendar',
    'Earnings': 'cash',
    'More': 'menu',
  };

  return (
    <View style={[styles.tabContainer, { paddingBottom: insets.bottom || (Platform.OS === 'ios' ? 24 : 16) }]}>
      {tabs.map((tab) => {
        const isActive = pathname === tab.route;
        const iconName = isActive ? activeIcons[tab.name] : tab.icon;
        
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabButton}
            onPress={() => router.push(tab.route as any)}
          >
            <Ionicons name={iconName as any} size={24} color={isActive ? '#EE4D2D' : '#666'} />
            <Text style={[styles.tabLabel, isActive && styles.activeLabel]}>
              {tab.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    paddingTop: 12,
  },
  tabButton: { 
    alignItems: 'center',
    flex: 1,
  },
  tabLabel: { 
    fontSize: 10, 
    color: '#666', 
    marginTop: 2,
    fontWeight: '500',
  },
  activeLabel: { 
    color: '#EE4D2D', 
    fontWeight: '600' 
  },
});