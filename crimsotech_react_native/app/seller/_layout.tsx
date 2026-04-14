// app/seller/_layout.tsx
import React, { useEffect, useState } from 'react';
import { Stack, usePathname } from 'expo-router';
import RoleGuard from '../guards/RoleGuard';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import Header from './includes/header';
import BottomTab from './includes/BottomTabs';
import { useLocalSearchParams } from 'expo-router';

// Screens that have their own navigation bar — hide the global Header and BottomTab
const FULLSCREEN_ROUTES = [
  'seller-edit-product',
  'seller-create-product',
  'seller-create-product-form',
  'seller-create-gift',
  'seller-create-gift-form',
  'create-voucher',
  'view-refund-details',
  'view-product',
  'return-address',
  'view-order'
];

export default function SellerLayout() {
  const params = useLocalSearchParams();
  const pathname = usePathname();
  const [shopId, setShopId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.shopId) {
      setShopId(params.shopId as string);
    }
    setLoading(false);
  }, [params]);

  const isFullscreen = FULLSCREEN_ROUTES.some(route => pathname.includes(route));

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#EE4D2D" />
      </View>
    );
  }

  return (
    <RoleGuard allowedRoles={['customer']}>
      <View style={styles.container}>
        {!isFullscreen && <Header shopId={shopId} />}
        <View style={styles.content}>
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="dashboard" />
            <Stack.Screen name="products" />
            <Stack.Screen name="orders" />
            <Stack.Screen name="vouchers" />
            <Stack.Screen name="more" />
            <Stack.Screen name="home" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="product-list" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="refunds" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="gifts" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="address" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="apply-gift" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="apply-gift-form" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="arrange-shipment" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="boosts" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="boost-details" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="create-address" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="create-gift" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="create-product-vouchers" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="create-shop-vouchers" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="createproducts" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="disputes" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="earnings" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="file-dispute" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="myproducts" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="notification" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="pay-boosting" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="product-vouchers" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="return-address" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="select-boost-product" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="sellerHeader" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="shop-vouchers" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="view-order" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="view-product" options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="view-refund-details" options={{ animation: 'slide_from_right' }} />
          </Stack>
        </View>
        {!isFullscreen && <BottomTab shopId={shopId} />}
      </View>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});