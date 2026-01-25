// app/rider/bottomTab.tsx
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RiderBottomTab() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const tabs = [
    { name: 'Home', icon: 'home', route: '/rider/home' },
    { name: 'Orders', icon: 'history', route: '/rider/orders' },
    { name: 'Schedule', icon: 'calendar-today', route: '/rider/schedule' },
    { name: 'Earnings', icon: 'attach-money', route: '/rider/earnings' },
    { name: 'Messages', icon: 'message', route: '/rider/message' },
  ] as const;

  return (
    <View style={[styles.tabContainer, { paddingBottom: insets.bottom }]}>
      {tabs.map((tab) => {
        const isActive = pathname === tab.route;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabButton}
            onPress={() => router.push(tab.route as any)}
          >
            <MaterialIcons 
              name={tab.icon as any} 
              size={24} 
              color={isActive ? '#EE4D2D' : '#9CA3AF'} 
            />
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
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    paddingTop: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabButton: { 
    alignItems: 'center',
    flex: 1,
  },
  tabLabel: { 
    fontSize: 11, 
    color: '#9CA3AF', 
    marginTop: 4,
    marginBottom: 7,
    fontWeight: '500',
  },
  activeLabel: { 
    color: '#EE4D2D', 
    fontWeight: '600' 
  },
});