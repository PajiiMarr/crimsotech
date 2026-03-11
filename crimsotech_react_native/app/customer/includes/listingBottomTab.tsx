// app/customer/components/managementBottomTab.tsx
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';

export default function ManagementBottomTab() {
  const pathname = usePathname();

  const tabs = [
    { name: 'Dashboard', icon: 'cube-outline', activeIcon: 'cube', route: '/customer/personal-listing' },
    { name: 'Orders', icon: 'list-outline', activeIcon: 'list', route: '/customer/order-lists' },
    { name: 'Product Lists', icon: 'cube-outline', activeIcon: 'cube', route: '/customer/product-listing' },
    { name: 'Listing Returns', icon: 'return-up-back-outline', activeIcon: 'return-up-back', route: '/customer/listing-returns' },
    { name: 'ComGift', icon: 'gift-outline', activeIcon: 'gift', route: '/customer/comgift' },
  ] as const;

  return (
    <View style={styles.tabContainer}>
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.route); // fix dynamic routes
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabButton}
            onPress={() => {
              if (!pathname.startsWith(tab.route)) {
                router.push(tab.route as any);
              }
            }}
          >
            <Ionicons 
              name={isActive ? tab.activeIcon : tab.icon} 
              size={24} 
              color={isActive ? '#EE4D2D' : '#666'} 
            />
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
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  tabButton: { 
    alignItems: 'center',
    flex: 1,
  },
  tabLabel: { 
    fontSize: 10, 
    color: '#666', 
    marginTop: 2 
  },
  activeLabel: { 
    color: '#EE4D2D', 
    fontWeight: '600' 
  },
});