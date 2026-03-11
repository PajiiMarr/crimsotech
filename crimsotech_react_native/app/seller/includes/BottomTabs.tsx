// app/seller/components/BottomTab.tsx
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';

interface BottomTabProps {
  shopId: string | null;
}

export default function BottomTab({ shopId }: BottomTabProps) {
  const pathname = usePathname();

  const tabs = [
    { name: 'Dashboard', icon: 'home-outline', route: '/seller/dashboard' },
    { name: 'Products', icon: 'cube-outline', route: '/seller/product-list' },
    { name: 'Orders', icon: 'list-outline', route: '/seller/orders' },
    { name: 'Gifts', icon: 'gift-outline', route: '/seller/gifts' },
    { name: 'Return', icon: 'return-up-back-outline', route: '/seller/seller-return-refund-cancel' },
    { name: 'More', icon: 'menu-outline', route: '/seller/more' },
  ] as const;

  const activeIcons: Record<string, string> = {
    'Dashboard': 'home-outline',
    'Products': 'cube',
    'Orders': 'list',
    'Gifts': 'gift-outline',
    'Return': 'return-up-back-outline',
    'More': 'menu',
  };

  return (
    <View style={styles.tabContainer}>
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.route);
        const iconName = isActive ? activeIcons[tab.name] : tab.icon;
        
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tabButton}
            onPress={() => {
              if (!pathname.startsWith(tab.route)) {
                router.push({
                  pathname: tab.route as any,
                  params: shopId ? { shopId } : {}
                });
              }
            }}
          >
            <Ionicons name={iconName as any} size={24} color={isActive ? '#EE4D2D' : '#666'} />
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
  tabButton: { alignItems: 'center' },
  tabLabel: { fontSize: 10, color: '#666', marginTop: 2 },
  activeLabel: { color: '#EE4D2D', fontWeight: '600' },
});