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
  Modal,
  FlatList,
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
  period_earnings?: number;
  draft_count?: number;
  pending_sales?: number; 
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
  latest_orders?: any[];
  low_stock?: any[];
  refunds?: any;
  reports?: any;
  store_management_counts?: any;
}

interface BreakdownModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  data: any;
}

function BreakdownModal({ visible, onClose, title, data }: BreakdownModalProps) {
  const renderBreakdownItem = (label: string, value: any, icon: string) => (
    <View style={modalStyles.breakdownItem} key={label}>
      <View style={modalStyles.breakdownLeft}>
        <Ionicons name={icon as any} size={20} color="#6B7280" />
        <Text style={modalStyles.breakdownLabel}>{label}</Text>
      </View>
      <Text style={modalStyles.breakdownValue}>{value}</Text>
    </View>
  );

  const getBreakdownContent = () => {
    if (!data) return null;

    switch (title) {
      case 'Total Sales':
        return (
          <>
            {renderBreakdownItem('Total Sales', `₱${(data.period_sales || 0).toLocaleString('en-PH')}`, 'cash-outline')}
            {renderBreakdownItem('Period Earnings', `₱${(data.period_earnings || 0).toLocaleString('en-PH')}`, 'trending-up-outline')}
            {renderBreakdownItem('Delivery Fees', `₱${(data.period_delivery_fees || 0).toLocaleString('en-PH')}`, 'bicycle-outline')}
            {renderBreakdownItem('Sales Change', `${data.sales_change >= 0 ? '+' : ''}${data.sales_change?.toFixed(1) || 0}%`, 'stats-chart-outline')}
            {renderBreakdownItem('Date Range', `${data.date_range_days || 0} days`, 'calendar-outline')}
          </>
        );
      
      case 'Orders':
        return (
          <>
            {renderBreakdownItem('Total Orders', data.period_orders || 0, 'cart-outline')}
            {renderBreakdownItem('Orders Change', `${data.orders_change >= 0 ? '+' : ''}${data.orders_change?.toFixed(1) || 0}%`, 'trending-up-outline')}
            {renderBreakdownItem('Latest Orders', data.latest_orders?.length || 0, 'time-outline')}
          </>
        );
        case 'Pending Sales':
          return (
            <>
              {renderBreakdownItem('Pending Balance', `₱${(data.pending_sales || 0).toLocaleString('en-PH')}`, 'hourglass-outline')}
              {renderBreakdownItem('Awaiting Release', '3-day hold period', 'calendar-outline')}
              {renderBreakdownItem('Will be available after', data.release_date || 'refund period expires', 'time-outline')}
            </>
          );
      
      case 'Low Stock':
        const lowStockItems = data.low_stock || [];
        return (
          <>
            {renderBreakdownItem('Low Stock Items', lowStockItems.length, 'cube-outline')}
            {renderBreakdownItem('Low Stock Change', `${data.low_stock_change >= 0 ? '+' : ''}${data.low_stock_change || 0}`, 'alert-circle-outline')}
            {lowStockItems.length > 0 && (
              <View style={modalStyles.section}>
                <Text style={modalStyles.sectionTitle}>Products:</Text>
                {lowStockItems.map((item: any, idx: number) => (
                  <View key={idx} style={modalStyles.productItem}>
                    <Text style={modalStyles.productName}>{item.product_name}</Text>
                    <Text style={modalStyles.productStock}>Stock: {item.quantity}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        );
      
      case 'Refunds':
        return (
          <>
            {renderBreakdownItem('Pending Refunds', data.pending_count || 0, 'time-outline')}
            {renderBreakdownItem('Disputes', data.disputes_count || 0, 'alert-circle-outline')}
            {renderBreakdownItem('Total Refunds', data.total_count || 0, 'refresh-outline')}
            {renderBreakdownItem('Refund Change', `${data.refund_change >= 0 ? '+' : ''}${data.refund_change || 0}`, 'trending-up-outline')}
          </>
        );
      
      case 'Rating':
        return (
          <>
            {renderBreakdownItem('Average Rating', `${(data.average_rating || 0).toFixed(1)} / 5.0`, 'star-outline')}
            {renderBreakdownItem('Total Reviews', data.total_reviews || 0, 'chatbubble-outline')}
            {renderBreakdownItem('Recent Reviews (30d)', data.recent_reviews || 0, 'time-outline')}
          </>
        );
      
      case 'Followers':
        return (
          <>
            {renderBreakdownItem('Total Followers', data.total_followers || 0, 'people-outline')}
            {renderBreakdownItem('New Followers (30d)', data.new_followers || 0, 'person-add-outline')}
          </>
        );
      
      case 'Products':
        return (
          <>
            {renderBreakdownItem('Total Products', data.total_products || 0, 'grid-outline')}
            {renderBreakdownItem('Active Products', data.active_products || 0, 'checkmark-circle-outline')}
            {renderBreakdownItem('Draft Products', data.draft_products || 0, 'create-outline')}
            {renderBreakdownItem('Draft Count', data.draft_count || 0, 'document-text-outline')}
          </>
        );
      
      default:
        return <Text style={modalStyles.noData}>No breakdown data available</Text>;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={modalStyles.modalOverlay}>
        <View style={modalStyles.modalContent}>
          <View style={modalStyles.modalHeader}>
            <Text style={modalStyles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {getBreakdownContent()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const { userId } = useAuth();
  
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalData, setModalData] = useState<any>(null);

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
        // Fetch pending balance from wallet
        let pendingSales = 0;
        try {
          const walletRes = await AxiosInstance.get('/wallet/balance/', {
            headers: { 'X-User-Id': userId || '' }
          });
          if (walletRes.data.success) {
            pendingSales = walletRes.data.pending_balance || 0;
          }
        } catch (walletError) {
          console.error('Error fetching wallet balance:', walletError);
        }
  
        setData({
          summary: {
            ...response.data.summary,
            pending_sales: pendingSales,  // ← ADD THIS
          },
          shop_performance: response.data.shop_performance || {},
          latest_orders: response.data.latest_orders || [],
          low_stock: response.data.low_stock || [],
          refunds: response.data.refunds || {},
          reports: response.data.reports || {},
          store_management_counts: response.data.store_management_counts || {},
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

  const showBreakdown = (title: string, dataKey: string, subKey?: string) => {
    let modalDataToShow = null;
    
    if (dataKey === 'summary') {
      modalDataToShow = { ...data?.summary, latest_orders: data?.latest_orders, low_stock: data?.low_stock };
    } else if (dataKey === 'refunds') {
      modalDataToShow = data?.refunds;
    } else if (dataKey === 'shop_performance') {
      modalDataToShow = data?.shop_performance;
    } else if (dataKey === 'store_management') {
      modalDataToShow = data?.store_management_counts;
    }
    
    setModalTitle(title);
    setModalData(modalDataToShow);
    setModalVisible(true);
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
              {/* Quick Stats */}
<Text style={styles.sectionLabel}>Overview</Text>
<View style={styles.statsGrid}>
  <TouchableOpacity 
    style={styles.statCard} 
    onPress={() => showBreakdown('Total Sales', 'summary')}
    activeOpacity={0.7}
  >
    <View style={[styles.statIcon, { backgroundColor: '#EEF2FF' }]}>
      <Ionicons name="cash-outline" size={20} color="#4F46E5" />
    </View>
    <Text style={styles.statValue}>{formatCurrency(summary.period_sales)}</Text>
    <Text style={styles.statLabel}>Total Sales</Text>
  </TouchableOpacity>

  <TouchableOpacity 
    style={styles.statCard} 
    onPress={() => showBreakdown('Pending Sales', 'wallet')}
    activeOpacity={0.7}
  >
    <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
      <Ionicons name="hourglass-outline" size={20} color="#D97706" />
    </View>
    <Text style={styles.statValue}>{formatCurrency(summary.pending_sales || 0)}</Text>
    <Text style={styles.statLabel}>Pending Sales</Text>
  </TouchableOpacity>

  <TouchableOpacity 
    style={styles.statCard} 
    onPress={() => showBreakdown('Orders', 'summary')}
    activeOpacity={0.7}
  >
    <View style={[styles.statIcon, { backgroundColor: '#F0F9FF' }]}>
      <Ionicons name="cart-outline" size={20} color="#0284C7" />
    </View>
    <Text style={styles.statValue}>{summary.period_orders || 0}</Text>
    <Text style={styles.statLabel}>Orders</Text>
  </TouchableOpacity>

  <TouchableOpacity 
    style={styles.statCard} 
    onPress={() => showBreakdown('Refunds', 'refunds')}
    activeOpacity={0.7}
  >
    <View style={[styles.statIcon, { backgroundColor: '#FEF2F2' }]}>
      <Ionicons name="refresh-outline" size={20} color="#DC2626" />
    </View>
    <Text style={styles.statValue}>{summary.refund_requests || 0}</Text>
    <Text style={styles.statLabel}>Refunds</Text>
  </TouchableOpacity>
</View>

              {/* Shop Performance */}
              <Text style={[styles.sectionLabel, styles.sectionMargin]}>Shop Performance</Text>
              <View style={styles.performanceCard}>
                <View style={styles.performanceRow}>
                  <TouchableOpacity 
                    style={styles.performanceItem} 
                    onPress={() => showBreakdown('Rating', 'shop_performance')}
                    activeOpacity={0.7}
                  >
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
                  </TouchableOpacity>

                  <View style={styles.performanceDivider} />

                  <TouchableOpacity 
                    style={styles.performanceItem} 
                    onPress={() => router.push(`/seller/view-followers?shopId=${shopId}`)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.performanceValue}>{performance.total_followers || 0}</Text>
                    <Ionicons name="people-outline" size={16} color="#6B7280" />
                    <Text style={styles.performanceLabel}>Followers</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.performanceDividerHorizontal} />

                <TouchableOpacity 
                  style={styles.productsSection}
                  onPress={() => showBreakdown('Products', 'shop_performance')}
                  activeOpacity={0.7}
                >
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
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      <BreakdownModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={modalTitle}
        data={modalData}
      />
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

const modalStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '40%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#374151',
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  productName: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
  },
  productStock: {
    fontSize: 13,
    fontWeight: '500',
    color: '#DC2626',
  },
  noData: {
    textAlign: 'center',
    padding: 40,
    color: '#9CA3AF',
  },
});