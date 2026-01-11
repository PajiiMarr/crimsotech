// app/seller/home.tsx
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ActivityIndicator, 
  StyleSheet, 
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext'; 
import { useLocalSearchParams, router } from 'expo-router';
import AxiosInstance from '../../contexts/axios';
import SellerHeader from './sellerHeader';
import Dashboard from './dashboard';
import Order from './order';

interface ShopStats {
  total_sales: number;
  orders_count: number;
  products_count: number;
  customer_count: number;
  total_orders: number;
  follower_count: number;
}

export default function Home() {
  const { userId, shopId, loading: authLoading, updateShopId } = useAuth();
  const params = useLocalSearchParams();
  const [shopData, setShopData] = useState<any>(null);
  const [stats, setStats] = useState<ShopStats>({
    total_sales: 0,
    orders_count: 0,
    products_count: 0,
    customer_count: 0,
    total_orders: 0,
    follower_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const paramShopId = params?.shopId as string | undefined;
    if (!authLoading && paramShopId && !shopId) {
      updateShopId(paramShopId as string).catch((err) => 
        console.error('Failed to update shopId from params', err)
      );
    }
  }, [authLoading, shopId, params]);

  useEffect(() => {
    if (!authLoading && userId) {
      fetchShopData();
    }
  }, [authLoading, userId, shopId]);

  const fetchShopData = async () => {
    try {
      setLoading(true);
      const profileResponse = await AxiosInstance.get('/api/profile/', {
        headers: {
          'X-User-Id': userId,
          'Content-Type': 'application/json',
        },
      });

      if (profileResponse.data.success && profileResponse.data.profile?.shop) {
        const shop = profileResponse.data.profile.shop;
        setShopData(shop);
        setStats({
          total_sales: parseFloat(shop.total_sales) || 0,
          orders_count: shop.orders_count || 0,
          products_count: shop.products_count || 0,
          customer_count: shop.customer_count || 0,
          total_orders: shop.total_orders || 0,
          follower_count: shop.follower_count || 0,
        });
        if (shop.id && !shopId) await updateShopId(shop.id);
      } else {
        const shopIdToUse = shopId || params?.shopId as string;
        if (shopIdToUse) {
          const shopResponse = await AxiosInstance.get(`/api/shops/${shopIdToUse}/`, {
            headers: { 'X-User-Id': userId }
          });
          const shopPayload = shopResponse.data;
          const shopObj = shopPayload?.success ? shopPayload.shop : shopPayload;
          if (shopObj) {
            setShopData(shopObj);
            setStats({
              total_sales: parseFloat(shopObj.total_sales) || 0,
              orders_count: shopObj.orders_count || 0,
              products_count: shopObj.products_count || (shopObj.products ? shopObj.products.length : 0) || 0,
              customer_count: shopObj.customer_count || 0,
              total_orders: shopObj.total_orders || 0,
              follower_count: shopObj.follower_count || shopObj.total_followers || 0,
            });
            if (shopObj.id && !shopId) await updateShopId(shopObj.id);
          }
        }
      }
    } catch (error: any) {
      console.error('Error fetching shop data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchShopData();
  };

  if (authLoading || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#EE4D2D" />
        <Text style={styles.loadingText}>Loading shop data...</Text>
      </View>
    );
  }

  if (!shopData) {
    return (
      <View style={styles.center}>
        <MaterialIcons name="store" size={60} color="#9CA3AF" />
        <Text style={styles.noShopTitle}>No Shop Found</Text>
        <TouchableOpacity style={styles.createShopButton} onPress={() => fetchShopData()}>
          <Text style={styles.createShopText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SellerHeader 
        title={shopData.name || 'My Shop'}
        subtitle={shopData.location || 'Manage your business'}
        onSettings={() => router.push('/seller/home')}
      />

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#EE4D2D']} />
        }
      >
        {/* Welcome Section */}
        <View style={styles.welcomeCard}>
          <View style={styles.welcomeLeft}>
            <Text style={styles.welcomeTitle}>{shopData.name}</Text>
            <Text style={styles.welcomeSubtitle}>{shopData.description || shopData.location || 'Manage your business'}</Text>
            <View style={styles.statusBadges}>
              <View style={[styles.badge, shopData.is_active ? styles.activeBadge : styles.inactiveBadge]}>
                <Text style={styles.badgeText}>{shopData.is_active ? 'Active' : 'Inactive'}</Text>
              </View>
            </View>
          </View>
          {shopData.shop_picture ? (
            <Image source={{ uri: shopData.shop_picture }} style={styles.shopImage} />
          ) : (
            <View style={styles.shopImagePlaceholder}>
              <MaterialIcons name="store" size={40} color="#EE4D2D" />
            </View>
          )}
        </View>

        {/* 1. ORDER STATUS COMES FIRST */}
        <View style={styles.ordersContainer}>
          <Order />
        </View>

        {/* 2. DASHBOARD / MENU ITEMS COMES SECOND */}
        <Dashboard />

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5', // Light gray background to separate white cards
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  noShopTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginTop: 20,
    marginBottom: 16,
  },
  createShopButton: {
    backgroundColor: '#EE4D2D',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createShopText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  welcomeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  ordersContainer: {
    
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  welcomeLeft: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  statusBadges: {
    flexDirection: 'row',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activeBadge: {
    backgroundColor: '#E8F5E9',
  },
  inactiveBadge: {
    backgroundColor: '#F5F5F5',
  },
  badgeText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '600',
  },
  shopImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  shopImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFF5F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
});