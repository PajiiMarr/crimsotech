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
    const OrderComponent: any = Order;
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

    const paramShopId = params?.shopId as string | undefined;
    const currentShopId = paramShopId || contextShopId;

    useEffect(() => {
      if (!authLoading && currentShopId) {
        fetchShopData(currentShopId);
      } else if (!authLoading && !currentShopId && userId) {
        fetchUserShops();
      } else if (!authLoading) {
        setLoading(false);
        setError('No shop selected');
      }
    }, [authLoading, currentShopId, userId]);

    useFocusEffect(
      useCallback(() => {
        if (currentShopId) {
          fetchShopData(currentShopId);
        }
      }, [currentShopId])
    );

    const fetchUserShops = async () => {
      try {
        setLoading(true);
        const response = await AxiosInstance.get('/customer-shops/', {
          params: { customer_id: userId }
        });

        if (response.data.success && response.data.shops && response.data.shops.length > 0) {
          const shop = response.data.shops[0];
          await updateShopId(shop.id);
          fetchShopData(shop.id);
        } else {
          setLoading(false);
          setError('No shops found');
        }
      } catch (error: any) {
        console.error('Error fetching user shops:', error);
        setLoading(false);
        setError('Failed to load shops');
      }
    };

    const fetchShopData = async (shopId: string) => {
      try {
        setLoading(true);
        setError(null);

        console.log('Fetching shop data for ID:', shopId);

        let shopData = null;
        
        try {
          const response = await AxiosInstance.get(`/shops/${shopId}/`);
          if (response.data) {
            shopData = response.data.shop || response.data;
            console.log('Shop data from /api/shops/:', shopData);
          }
        } catch (shopError) {
          console.log('Failed to fetch from /api/shops/, trying /api/customer-shops/');
        }

        if (!shopData) {
          try {
            const response = await AxiosInstance.get('/customer-shops/', {
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
          setShopData(shopData);
          
          setStats({
            total_sales: parseFloat(shopData.total_sales?.toString() || '0') || 0,
            orders_count: shopData.orders_count || 0,
            products_count: shopData.products_count || 0,
            customer_count: shopData.customer_count || 0,
            total_orders: shopData.total_orders || 0,
            follower_count: shopData.follower_count || 0,
          });

          if (!contextShopId || contextShopId !== shopId) {
            await updateShopId(shopId);
          }
          
          setError(null);
        } else {
          setError('Shop not found');
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

    const formatCurrency = (amount: number) => {
      return `₱${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    if (authLoading || loading) {
      return (
        <View style={styles.container}>
          <View style={styles.center}>
            <ActivityIndicator size="small" color="#EE4D2D" />
            <Text style={styles.loadingText}>Loading shop data...</Text>
          </View>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.container}>
          <View style={styles.center}>
            <MaterialIcons name="error" size={40} color="#DC2626" />
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
          </View>
        </View>
      );
    }

    if (!shopData) {
      return (
        <View style={styles.container}>
          <View style={styles.center}>
            <MaterialIcons name="store" size={40} color="#9CA3AF" />
            <Text style={styles.noShopTitle}>No Shop Found</Text>
            <Text style={styles.noShopText}>Select a shop to manage</Text>
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
          contentContainerStyle={styles.scrollContent}
        >
          {/* Shop Header */}
          <View style={styles.shopHeader}>
            <View style={styles.shopImageContainer}>
              {shopData.shop_picture ? (
                <Image source={{ uri: shopData.shop_picture }} style={styles.shopImage} />
              ) : (
                <View style={styles.shopImagePlaceholder}>
                  <MaterialIcons name="store" size={28} color="#EE4D2D" />
                </View>
              )}
            </View>
            
            <View style={styles.shopInfo}>
              <Text style={styles.shopName} numberOfLines={1}>{shopData.name}</Text>
              <Text style={styles.shopLocation} numberOfLines={1}>
                {shopData.location || 'No location'}
              </Text>
              
              <View style={styles.shopStatsRow}>
                <View style={styles.shopStat}>
                  <MaterialIcons name="star" size={12} color="#FBBF24" />
                  <Text style={styles.shopStatText}>4.8</Text>
                </View>
                <View style={styles.shopStat}>
                  <MaterialIcons name="people" size={12} color="#6B7280" />
                  <Text style={styles.shopStatText}>{shopData.follower_count || 0}</Text>
                </View>
                <View style={[styles.shopStat, styles.statusBadge]}>
                  <View style={[styles.statusDot, shopData.is_active && styles.activeDot]} />
                  <Text style={styles.statusText}>{shopData.is_active ? 'Active' : 'Inactive'}</Text>
                </View>
              </View>
            </View>
          </View>


          {/* Orders */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Orders</Text>
              <TouchableOpacity>
                <Text style={styles.sectionLink}>View All</Text>
              </TouchableOpacity>
            </View>
            <OrderComponent shopId={currentShopId} />
          </View>

          {/* Dashboard */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
            </View>
            <DashboardComponent shopId={currentShopId} />
          </View>
        </ScrollView>
      </View>
    );
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FFFFFF',
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 13,
      color: '#6B7280',
    },
    errorTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#DC2626',
      marginTop: 12,
      marginBottom: 4,
    },
    errorText: {
      fontSize: 13,
      color: '#6B7280',
      textAlign: 'center',
      marginBottom: 16,
      paddingHorizontal: 20,
    },
    noShopTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#374151',
      marginTop: 12,
      marginBottom: 4,
    },
    noShopText: {
      fontSize: 13,
      color: '#6B7280',
      textAlign: 'center',
      marginBottom: 16,
    },
    retryButton: {
      backgroundColor: '#EE4D2D',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 6,
    },
    retryButtonText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: 13,
    },
    createShopButton: {
      backgroundColor: '#6366F1',
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 6,
    },
    createShopText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: 13,
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 20,
    },
    shopHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#F3F4F6',
    },
    shopImageContainer: {
      marginRight: 12,
    },
    shopImage: {
      width: 50,
      height: 50,
      borderRadius: 25,
    },
    shopImagePlaceholder: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: '#FFF5F2',
      justifyContent: 'center',
      alignItems: 'center',
    },
    shopInfo: {
      flex: 1,
    },
    shopName: {
      fontSize: 16,
      fontWeight: '600',
      color: '#111827',
      marginBottom: 2,
    },
    shopLocation: {
      fontSize: 12,
      color: '#6B7280',
      marginBottom: 6,
    },
    shopStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    shopStat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 6,
      paddingVertical: 2,
      backgroundColor: '#F9FAFB',
      borderRadius: 4,
    },
    shopStatText: {
      fontSize: 11,
      fontWeight: '500',
      color: '#374151',
    },
    statusBadge: {
      backgroundColor: 'transparent',
      padding: 0,
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#9CA3AF',
    },
    activeDot: {
      backgroundColor: '#10B981',
    },
    statusText: {
      fontSize: 11,
      color: '#6B7280',
    },
    statsContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    statRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    statCard: {
      flex: 1,
      backgroundColor: '#F9FAFB',
      padding: 12,
      borderRadius: 8,
      alignItems: 'center',
    },
    salesCard: {
      borderLeftWidth: 3,
      borderLeftColor: '#059669',
    },
    ordersCard: {
      borderLeftWidth: 3,
      borderLeftColor: '#3B82F6',
    },
    productsCard: {
      borderLeftWidth: 3,
      borderLeftColor: '#8B5CF6',
    },
    followersCard: {
      borderLeftWidth: 3,
      borderLeftColor: '#EC4899',
    },
    statIcon: {
      marginBottom: 6,
    },
    statValue: {
      fontSize: 16,
      fontWeight: '700',
      color: '#111827',
      marginBottom: 2,
    },
    statLabel: {
      fontSize: 11,
      color: '#6B7280',
    },
    section: {
      paddingHorizontal: 16,
      marginTop: 12,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: '#111827',
    },
    sectionLink: {
      fontSize: 12,
      color: '#EE4D2D',
      fontWeight: '500',
    },
  });