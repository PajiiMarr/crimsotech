// app/seller/dashboard.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import AxiosInstance from '../../contexts/axios';

interface DashboardSummary {
  period_sales?: number;
  period_orders?: number;
  low_stock_count?: number;
  refund_requests?: number;
  sales_change?: number;
  orders_change?: number;
}

interface ShopPerformance {
  average_rating?: number;
  total_reviews?: number;
  total_followers?: number;
  total_products?: number;
  active_products?: number;
  draft_products?: number;
}

interface DashboardData {
  summary: DashboardSummary;
  shop_performance: ShopPerformance;
}

export default function Dashboard() {
  const router = useRouter();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const { userId } = useAuth();
  
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (shopId) {
      fetchDashboardData();
    }
  }, [shopId]);

  const fetchDashboardData = async () => {
    if (!shopId) return;

    try {
      setLoading(true);
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const params = new URLSearchParams({
        shop_id: shopId,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        range_type: 'monthly',
      });

      const response = await AxiosInstance.get(`/seller-dashboard/get_dashboard/?${params.toString()}`, {
        headers: { 'X-User-Id': userId || '' }
      });

      if (response.data.success) {
        setData({
          summary: response.data.summary || {},
          shop_performance: response.data.shop_performance || {},
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '₱0';
    return `₱${amount.toLocaleString('en-PH')}`;
  };

  const summary = data?.summary || {};
  const performance = data?.shop_performance || {};

  if (!shopId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Ionicons name="storefront-outline" size={64} color="#E5E7EB" />
          <Text style={styles.noShopTitle}>No Shop Selected</Text>
          <Text style={styles.noShopText}>Select a shop to view dashboard</Text>
          <TouchableOpacity 
            style={styles.shopButton}
            onPress={() => router.push('/customer/shops')}
          >
            <Text style={styles.shopButtonText}>Choose Shop</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            tintColor="#6B7280"
            colors={['#6B7280']}
          />
        }
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Dashboard</Text>
            </View>
            <View style={styles.dateBadge}>
              <Ionicons name="calendar-outline" size={14} color="#6B7280" />
              <Text style={styles.dateText}>Last 30 days</Text>
            </View>
          </View>

          {loading && !refreshing ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#6B7280" />
            </View>
          ) : (
            <>
              {/* Quick Stats */}
              <Text style={styles.sectionLabel}>Overview</Text>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: '#EEF2FF' }]}>
                    <Ionicons name="cash-outline" size={20} color="#4F46E5" />
                  </View>
                  <Text style={styles.statValue}>{formatCurrency(summary.period_sales)}</Text>
                  <Text style={styles.statLabel}>Total Sales</Text>
                  {summary.sales_change !== undefined && (
                    <View style={styles.statChange}>
                      <Ionicons 
                        name={summary.sales_change >= 0 ? 'arrow-up' : 'arrow-down'} 
                        size={12} 
                        color={summary.sales_change >= 0 ? '#10B981' : '#EF4444'} 
                      />
                      <Text style={[styles.changeText, { color: summary.sales_change >= 0 ? '#10B981' : '#EF4444' }]}>
                        {Math.abs(summary.sales_change)}%
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: '#F0F9FF' }]}>
                    <Ionicons name="cart-outline" size={20} color="#0284C7" />
                  </View>
                  <Text style={styles.statValue}>{summary.period_orders || 0}</Text>
                  <Text style={styles.statLabel}>Orders</Text>
                  {summary.orders_change !== undefined && (
                    <View style={styles.statChange}>
                      <Ionicons 
                        name={summary.orders_change >= 0 ? 'arrow-up' : 'arrow-down'} 
                        size={12} 
                        color={summary.orders_change >= 0 ? '#10B981' : '#EF4444'} 
                      />
                      <Text style={[styles.changeText, { color: summary.orders_change >= 0 ? '#10B981' : '#EF4444' }]}>
                        {Math.abs(summary.orders_change)}%
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: '#FEF2F2' }]}>
                    <Ionicons name="cube-outline" size={20} color="#DC2626" />
                  </View>
                  <Text style={styles.statValue}>{summary.low_stock_count || 0}</Text>
                  <Text style={styles.statLabel}>Low Stock</Text>
                </View>

                <View style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="refresh-outline" size={20} color="#D97706" />
                  </View>
                  <Text style={styles.statValue}>{summary.refund_requests || 0}</Text>
                  <Text style={styles.statLabel}>Refunds</Text>
                </View>
              </View>

              {/* Shop Performance */}
              <Text style={[styles.sectionLabel, styles.sectionMargin]}>Shop Performance</Text>
              <View style={styles.performanceCard}>
                <View style={styles.performanceRow}>
                  <View style={styles.performanceItem}>
                    <Text style={styles.performanceValue}>
                      {performance.average_rating?.toFixed(1) || '0.0'}
                    </Text>
                    <View style={styles.performanceRating}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons
                          key={star}
                          name="star"
                          size={12}
                          color={star <= Math.round(performance.average_rating || 0) ? '#FBBF24' : '#E5E7EB'}
                        />
                      ))}
                    </View>
                    <Text style={styles.performanceLabel}>Rating</Text>
                    <Text style={styles.performanceMeta}>{performance.total_reviews || 0} reviews</Text>
                  </View>

                  <View style={styles.performanceDivider} />

                  <View style={styles.performanceItem}>
                    <Text style={styles.performanceValue}>{performance.total_followers || 0}</Text>
                    <Ionicons name="people-outline" size={16} color="#6B7280" />
                    <Text style={styles.performanceLabel}>Followers</Text>
                  </View>
                </View>

                <View style={styles.performanceDividerHorizontal} />

                <View style={styles.productsSection}>
                  <View style={styles.productsHeader}>
                    <Ionicons name="grid-outline" size={16} color="#6B7280" />
                    <Text style={styles.productsTitle}>Products</Text>
                  </View>
                  <View style={styles.productsGrid}>
                    <View style={styles.productStat}>
                      <Text style={styles.productNumber}>{performance.total_products || 0}</Text>
                      <Text style={styles.productLabel}>Total</Text>
                    </View>
                    <View style={styles.productStat}>
                      <Text style={styles.productNumber}>{performance.active_products || 0}</Text>
                      <Text style={styles.productLabel}>Active</Text>
                    </View>
                    <View style={styles.productStat}>
                      <Text style={styles.productNumber}>{performance.draft_products || 0}</Text>
                      <Text style={styles.productLabel}>Draft</Text>
                    </View>
                  </View>
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 20,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 400,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#111827',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  sectionMargin: {
    marginTop: 24,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  statChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  performanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  performanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  performanceValue: {
    fontSize: 28,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  performanceRating: {
    flexDirection: 'row',
    gap: 2,
    marginBottom: 8,
  },
  performanceLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  performanceMeta: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  performanceDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  performanceDividerHorizontal: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },
  productsSection: {
    gap: 12,
  },
  productsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productsTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  productsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  productStat: {
    alignItems: 'center',
  },
  productNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  productLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  noShopTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  noShopText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  shopButton: {
    backgroundColor: '#111827',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});