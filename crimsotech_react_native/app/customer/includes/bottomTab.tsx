// app/customer/components/bottomTab.tsx
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';

export default function BottomTab() {
  const pathname = usePathname();

  const tabs = [
    { name: 'Home', icon: 'home-outline', route: '/customer/home' },
    { name: 'Favorite', icon: 'heart-outline', route: '/customer/favorite' },
    { name: 'Cart', icon: 'cart-outline', route: '/customer/cart' },
    { name: 'Products', icon: 'list-outline', route: '/customer/personal-listing' },
    { name: 'Profile', icon: 'person-outline', route: '/customer/profile' },
  ] as const;

  return (
    <View style={styles.tabContainer}>
      {tabs.map((tab) => {
        const isActive = pathname === tab.route;
        const iconName = tab.name === 'Favorite' ? (isActive ? 'heart' : tab.icon) : tab.icon;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabButton}
            onPress={() => router.push(tab.route as any)}
          >
            <Ionicons name={iconName as any} size={24} color={isActive ? '#4F46E5' : '#666'} />
            <Text style={[styles.tabLabel, isActive && styles.activeLabel]}>{tab.name}</Text>
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
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: Platform.OS === 'ios' ? 16 : 8,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20, // extra bottom padding for safe area
  },
  tabButton: { alignItems: 'center' },
  tabLabel: { fontSize: 10, color: '#666', marginTop: 2 },
  activeLabel: { color: '#4F46E5', fontWeight: '600' },
});
