// app/seller/home.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { 
  Platform,
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
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
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

interface ShopData {
  id: string;
  name: string;
  description: string;
  shop_picture?: string;
  location?: string;
  is_active: boolean;
  verified?: boolean;
  total_sales: string | number;
  orders_count?: number;
  products_count?: number;
  customer_count?: number;
  total_orders?: number;
  follower_count?: number;
}

export default function Home() {
  const { userId, shopId: contextShopId, loading: authLoading, updateShopId } = useAuth();
  const params = useLocalSearchParams();
  const [shopData, setShopData] = useState<ShopData | null>(null);
  // Cast Order to any to allow passing the shopId prop without changing the Order component's typings
    const OrderComponent: any = Order;
    // Cast Dashboard to any to allow passing the shopId prop without changing the Dashboard component's typings
    const DashboardComponent: any = Dashboard;
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
  const [error, setError] = useState<string | null>(null);

  // Get shopId from params first, then from context
  const paramShopId = params?.shopId as string | undefined;
  const currentShopId = paramShopId || contextShopId;

  // Fetch shop data when component mounts or shopId changes
  useEffect(() => {
    if (!authLoading && currentShopId) {
      fetchShopData(currentShopId);
    } else if (!authLoading && !currentShopId && userId) {
      // If no shopId but user is logged in, try to get user's shops
      fetchUserShops();
    } else if (!authLoading) {
      setLoading(false);
      setError('No shop selected');
    }
  }, [authLoading, currentShopId, userId]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (currentShopId) {
        fetchShopData(currentShopId);
      }
    }, [currentShopId])
  );

  // Fetch user's shops to get the first one if no shopId is specified
  const fetchUserShops = async () => {
    try {
      setLoading(true);
      const response = await AxiosInstance.get('/api/customer-shops/', {
        params: { customer_id: userId }
      });

      if (response.data.success && response.data.shops && response.data.shops.length > 0) {
        // Use the first shop
        const shop = response.data.shops[0];
        await updateShopId(shop.id);
        fetchShopData(shop.id);
      } else {
        setLoading(false);
        setError('No shops found. Please create a shop first.');
      }
    } catch (error: any) {
      console.error('Error fetching user shops:', error);
      setLoading(false);
      setError('Failed to load shops');
    }
  };

  // Fetch specific shop data
  const fetchShopData = async (shopId: string) => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching shop data for ID:', shopId);

      // Try multiple endpoints
      let shopData = null;
      
      // First try: Get shop details
      try {
        const response = await AxiosInstance.get(`/api/shops/${shopId}/`);
        if (response.data) {
          shopData = response.data.shop || response.data;
          console.log('Shop data from /api/shops/:', shopData);
        }
      } catch (shopError) {
        console.log('Failed to fetch from /api/shops/, trying /api/customer-shops/');
      }

      // Second try: Get from customer-shops endpoint
      if (!shopData) {
        try {
          const response = await AxiosInstance.get('/api/customer-shops/', {
            params: { shop_id: shopId }
          });
          if (response.data.success && response.data.shops && response.data.shops.length > 0) {
            shopData = response.data.shops[0];
            console.log('Shop data from /api/customer-shops/:', shopData);
          }
        } catch (customerShopError) {
          console.log('Failed to fetch from /api/customer-shops/');
        }
      }

      if (shopData) {
        // Update shop data
        setShopData(shopData);
        
        // Update stats
        setStats({
          total_sales: parseFloat(shopData.total_sales?.toString() || '0') || 0,
          orders_count: shopData.orders_count || 0,
          products_count: shopData.products_count || 0,
          customer_count: shopData.customer_count || 0,
          total_orders: shopData.total_orders || 0,
          follower_count: shopData.follower_count || 0,
        });

        // Update context if needed
        if (!contextShopId || contextShopId !== shopId) {
          await updateShopId(shopId);
        }
        
        setError(null);
      } else {
        setError('Shop not found or you don\'t have access');
      }
    } catch (error: any) {
      console.error('Error fetching shop data:', error);
      setError(error?.response?.data?.message || 'Failed to load shop data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (currentShopId) {
      await fetchShopData(currentShopId);
    }
  };

  if (authLoading || loading) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#EE4D2D" />
          <Text style={styles.loadingText}>Loading shop data...</Text>
          {currentShopId && (
            <Text style={styles.shopIdText}>Shop ID: {currentShopId}</Text>
          )}
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <MaterialIcons name="error" size={60} color="#DC2626" />
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton} 
            onPress={() => {
              if (currentShopId) {
                fetchShopData(currentShopId);
              } else if (userId) {
                fetchUserShops();
              }
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.push('/customer/shops')}
          >
            <Text style={styles.backButtonText}>Back to Shops</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!shopData) {
    return (
      <View style={styles.container}>
        <View style={styles.center}>
          <MaterialIcons name="store" size={60} color="#9CA3AF" />
          <Text style={styles.noShopTitle}>No Shop Found</Text>
          <Text style={styles.noShopText}>Please select a shop to manage</Text>
          <TouchableOpacity 
            style={styles.createShopButton} 
            onPress={() => router.push('/customer/shops')}
          >
            <Text style={styles.createShopText}>Go to Shops</Text>
          </TouchableOpacity>
        </View>
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
  {/* Shop Image on Left */}
  {shopData.shop_picture ? (
    <Image source={{ uri: shopData.shop_picture }} style={styles.shopImage} />
  ) : (
    <View style={styles.shopImagePlaceholder}>
      <MaterialIcons name="store" size={40} color="#EE4D2D" />
    </View>
  )}
  
  {/* Shop Info Middle */}
  <View style={styles.shopInfoContainer}>
    <Text style={styles.shopName} numberOfLines={1}>{shopData.name}</Text>
    
    <View style={styles.ratingFollowerContainer}>
      {/* Ratings */}
      <View style={styles.ratingContainer}>
        <MaterialIcons name="star" size={16} color="#FBBF24" />
        <Text style={styles.ratingText}>4.8</Text>
        <Text style={styles.ratingCount}>(128)</Text>
      </View>
      
      {/* Followers */}
      <View style={styles.followerContainer}>
        <MaterialIcons name="people" size={16} color="#6B7280" />
        <Text style={styles.followerText}>{shopData.follower_count || 0} followers</Text>
      </View>
    </View>
    
    {/* Status Badge */}
    <View style={styles.statusBadgeRow}>
      <View style={[styles.badge, shopData.is_active ? styles.activeBadge : styles.inactiveBadge]}>
        <Text style={styles.badgeText}>{shopData.is_active ? 'Active' : 'Inactive'}</Text>
      </View>
      {shopData.verified && (
        <View style={styles.verifiedBadge}>
          <MaterialIcons name="verified" size={12} color="#FFFFFF" />
          <Text style={styles.verifiedText}>Verified</Text>
        </View>
      )}
    </View>
  </View>
  
  {/* Visit Shop Button on Right */}
  <TouchableOpacity 
    style={styles.visitShopButton}
    activeOpacity={0.7}
    onPress={() => {
      // Navigate to shop public view or customer view
      // router.push(`/shop/${shopData.id}`);
    }}
  >
    <MaterialIcons name="storefront" size={18} color="#FFFFFF" />
    <Text style={styles.visitShopText}>Visit Shop</Text>
  </TouchableOpacity>
</View>

        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <MaterialIcons name="attach-money" size={24} color="#059669" />
            <Text style={styles.statValue}>₱{stats.total_sales.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Sales</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="shopping-cart" size={24} color="#3B82F6" />
            <Text style={styles.statValue}>{stats.total_orders}</Text>
            <Text style={styles.statLabel}>Total Orders</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="inventory" size={24} color="#8B5CF6" />
            <Text style={styles.statValue}>{stats.products_count}</Text>
            <Text style={styles.statLabel}>Products</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="people" size={24} color="#EC4899" />
            <Text style={styles.statValue}>{stats.follower_count}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
        </View>

        {/* 1. ORDER STATUS COMES FIRST */}
        <View style={styles.ordersContainer}>
          <OrderComponent shopId={currentShopId} />
        </View>

        {/* 2. DASHBOARD / MENU ITEMS COMES SECOND */}
        <DashboardComponent shopId={currentShopId} />

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  shopIdText: {
    marginTop: 8,
    fontSize: 12,
    color: '#9CA3AF',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#DC2626',
    marginTop: 20,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  noShopTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginTop: 20,
    marginBottom: 8,
  },
  noShopText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#EE4D2D',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  backButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  createShopButton: {
    backgroundColor: '#6366F1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createShopText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  welcomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },

  // Use a single unified shop image size
  shopImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 12,
  },

  shopImagePlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFF5F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  shopInfoContainer: {
    flex: 1,
    justifyContent: 'center',
  },

  shopName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },

  ratingFollowerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },

  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },

  ratingCount: {
    fontSize: 12,
    color: '#6B7280',
  },

  followerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  followerText: {
    fontSize: 12,
    color: '#6B7280',
  },

  statusBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  // Single consolidated badge definitions (no duplicates)
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },

  activeBadge: {
    backgroundColor: '#E8F5E9',
  },

  inactiveBadge: {
    backgroundColor: '#F5F5F5',
  },

  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
  },

  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },

  verifiedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  visitShopButton: {
    backgroundColor: '#EE4D2D',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    minWidth: 100,
  },

  visitShopText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  welcomeLeft: {
    flex: 1,
    marginRight: 16,
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
    marginBottom: 12,
  },
  statusBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shopIdDisplay: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  ordersContainer: {
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
});