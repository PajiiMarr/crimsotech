// app/seller/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import RoleGuard from '../guards/RoleGuard';

export default function SellerLayout() {
  return (
    <RoleGuard allowedRoles={['customer']}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#EE4D2D',
          tabBarInactiveTintColor: '#9CA3AF',
          tabBarStyle: { borderTopColor: '#E5E7EB' },
        }}
      >
        {/* Visible Tabs */}
        <Tabs.Screen
          name="home"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="product-list"
          options={{
            title: 'Products',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'cube' : 'cube-outline'} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            title: 'Orders',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'list' : 'list-outline'} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="refunds"
          options={{
            title: 'Refunds',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'arrow-undo' : 'arrow-undo-outline'} size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="gifts"
          options={{
            title: 'Gifts',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'gift' : 'gift-outline'} size={size} color={color} />
            ),
          }}
        />

        {/* Hidden pages (accessible via navigation, not shown in bottom tabs) */}
        <Tabs.Screen name="address" options={{ href: null }} />
        <Tabs.Screen name="apply-gift" options={{ href: null }} />
        <Tabs.Screen name="apply-gift-form" options={{ href: null }} />
        <Tabs.Screen name="arrange-shipment" options={{ href: null }} />
        <Tabs.Screen name="boosts" options={{ href: null }} />
        <Tabs.Screen name="create-address" options={{ href: null }} />
        <Tabs.Screen name="create-gift" options={{ href: null }} />
        <Tabs.Screen name="create-product-vouchers" options={{ href: null }} />
        <Tabs.Screen name="create-shop-vouchers" options={{ href: null }} />
        <Tabs.Screen name="createproducts" options={{ href: null }} />
        <Tabs.Screen name="dashboard" options={{ href: null }} />
        <Tabs.Screen name="disputes" options={{ href: null }} />
        <Tabs.Screen name="earnings" options={{ href: null }} />
        <Tabs.Screen name="file-dispute" options={{ href: null }} />
        <Tabs.Screen name="myproducts" options={{ href: null }} />
        <Tabs.Screen name="notification" options={{ href: null }} />
        <Tabs.Screen name="order" options={{ href: null }} />
        <Tabs.Screen name="pay-boosting" options={{ href: null }} />
        <Tabs.Screen name="product-vouchers" options={{ href: null }} />
        <Tabs.Screen name="return-address" options={{ href: null }} />
        <Tabs.Screen name="select-boost-product" options={{ href: null }} />
        <Tabs.Screen name="sellerHeader" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
        <Tabs.Screen name="shop-vouchers" options={{ href: null }} />
        <Tabs.Screen name="view-order" options={{ href: null }} />
        <Tabs.Screen name="view-refund-details" options={{ href: null }} />
      </Tabs>
    </RoleGuard>
  );
}