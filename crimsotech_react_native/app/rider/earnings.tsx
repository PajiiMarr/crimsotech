import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { router } from 'expo-router';
import AxiosInstance from '../../contexts/axios';
import { SafeAreaView } from 'react-native-safe-area-context';
const BASE_URL = AxiosInstance.defaults.baseURL || '';


interface EarningsMetrics {
  total_deliveries?: number;
  total_earnings?: number;
}

interface DeliveryData {
  order_amount: number;
}

export default function Earnings() {
  const { user } = useAuth();
  const { width } = Dimensions.get('window');
  
  const userId = user?.user_id || user?.id;
  const [activeTab, setActiveTab] = useState<'today' | 'all'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<EarningsMetrics | null>(null);
  const [totalCollected, setTotalCollected] = useState<number>(0);

  // Deductions (riders with no issues should see zero)
  const deductions = 0;

  // Format currency
  const formatCurrency = (amount: number) => {
    return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Fetch earnings data
  const fetchEarningsData = async (tab?: 'today' | 'all') => {
    const currentTab = tab ?? activeTab;
    try {
      setIsLoading(true);

      const today = new Date().toISOString().split('T')[0];
      const params: Record<string, string> = {};
      if (currentTab === 'today') {
        params.start_date = today;
        params.end_date = today;
      }

      const res = await AxiosInstance.get('/rider-history/order_history/', {
        headers: { 'X-User-Id': userId },
        params,
      });

      if (res.data && res.data.success) {
        setMetrics(res.data.metrics || null);
        
        const deliveries = res.data.deliveries || [];
        const collected = deliveries.reduce((sum: number, d: DeliveryData) => sum + (d.order_amount || 0), 0);
        setTotalCollected(Number(collected));
      } else {
        setMetrics(null);
        setTotalCollected(0);
      }
    } catch (err) {
      console.error('Failed to load earnings metrics', err);
      setMetrics(null);
      setTotalCollected(0);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchEarningsData(activeTab);
  }, [activeTab]);

  // Refresh control
  const onRefresh = () => {
    setRefreshing(true);
    fetchEarningsData(activeTab);
  };

  // Metric Card Component
  const MetricCard = ({ 
    title, 
    value, 
    icon, 
    iconBgColor, 
    iconColor,
    isLoading 
  }: { 
    title: string; 
    value: string; 
    icon: keyof typeof Ionicons.glyphMap; 
    iconBgColor: string; 
    iconColor: string;
    isLoading?: boolean;
  }) => (
    <View style={{ 
      backgroundColor: 'white', 
      borderRadius: 12, 
      padding: 16, 
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 4 }}>{title}</Text>
          {isLoading ? (
            <View style={{ height: 24, width: 100, backgroundColor: '#E5E7EB', borderRadius: 4 }} />
          ) : (
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#111827' }}>{value}</Text>
          )}
        </View>
        <View style={{ backgroundColor: iconBgColor, padding: 10, borderRadius: 999 }}>
          <Ionicons name={icon} size={22} color={iconColor} />
        </View>
      </View>
    </View>
  );

  // Loading skeleton for metrics
  const LoadingSkeleton = () => (
    <View style={{ padding: 16 }}>
      {[1, 2, 3, 4].map((item) => (
        <View key={item} style={{ 
          backgroundColor: 'white', 
          borderRadius: 12, 
          padding: 16, 
          marginBottom: 12 
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <View style={{ height: 13, width: 100, backgroundColor: '#E5E7EB', borderRadius: 4, marginBottom: 4 }} />
              <View style={{ height: 24, width: 120, backgroundColor: '#E5E7EB', borderRadius: 4 }} />
            </View>
            <View style={{ width: 42, height: 42, backgroundColor: '#E5E7EB', borderRadius: 999 }} />
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={{ padding: 16 }}>
          {/* Header */}
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#111827' }}>Earnings</Text>
              <TouchableOpacity
                onPress={() => Linking.openURL(`${BASE_URL}/rider-history/export_history/?format=csv&user_id=${userId}`)}
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
              >
                <Ionicons name="download-outline" size={16} color="#374151" />
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#374151', marginLeft: 4 }}>Export</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>
              Quick summary of your delivery performance
            </Text>
            {/* Tab Toggle */}
            <View style={{ flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 10, padding: 3, marginTop: 14 }}>
              {(['all', 'today'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                  style={{ flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center', backgroundColor: activeTab === tab ? 'white' : 'transparent' }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '600', color: activeTab === tab ? '#111827' : '#9CA3AF' }}>
                    {tab === 'all' ? 'All Time' : "Today"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Earnings Summary Card */}
          <View style={{ 
            backgroundColor: '#2563EB', 
            borderRadius: 16, 
            padding: 20, 
            marginBottom: 20,
            shadowColor: '#2563EB',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 5
          }}>
            <Text style={{ fontSize: 14, color: '#BFDBFE', marginBottom: 8 }}>Total Balance</Text>
            {isLoading ? (
              <View style={{ height: 36, width: 150, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 6 }} />
            ) : (
              <Text style={{ fontSize: 32, fontWeight: 'bold', color: 'white' }}>
                {formatCurrency(Number(metrics?.total_earnings || 0))}
              </Text>
            )}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
              <Ionicons name="calendar-outline" size={14} color="#BFDBFE" />
              <Text style={{ fontSize: 12, color: '#BFDBFE', marginLeft: 4 }}>
                Last updated {new Date().toLocaleDateString()}
              </Text>
            </View>
          </View>

          {/* Metrics Cards */}
          {isLoading ? (
            <LoadingSkeleton />
          ) : (
            <View>
              <MetricCard
                title="Total Deliveries"
                value={(metrics?.total_deliveries ?? 0).toString()}
                icon="cube-outline"
                iconBgColor="#EFF6FF"
                iconColor="#2563EB"
              />

              <MetricCard
                title="Total Money Collected"
                value={formatCurrency(totalCollected)}
                icon="cash-outline"
                iconBgColor="#D1FAE5"
                iconColor="#059669"
              />

              <MetricCard
                title="Total Earnings (Delivery Fees)"
                value={formatCurrency(Number(metrics?.total_earnings || 0))}
                icon="wallet-outline"
                iconBgColor="#FEF3C7"
                iconColor="#D97706"
              />

              <MetricCard
                title="Deductions"
                value={formatCurrency(deductions)}
                icon="remove-circle-outline"
                iconBgColor="#FEE2E2"
                iconColor="#DC2626"
              />
            </View>
          )}

          {/* Info Note */}
          <View style={{ 
            backgroundColor: '#F3F4F6', 
            borderRadius: 8, 
            padding: 12, 
            marginTop: 8,
            flexDirection: 'row',
            alignItems: 'center'
          }}>
            <Ionicons name="information-circle-outline" size={18} color="#6B7280" />
            <Text style={{ fontSize: 12, color: '#6B7280', marginLeft: 8, flex: 1 }}>
              Earnings are based on completed deliveries. Deductions may apply for late deliveries or disputes.
            </Text>
          </View>

          {/* Earnings Breakdown Section */}
          <View style={{ marginTop: 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 12 }}>
              Earnings Breakdown
            </Text>

            <View style={{ backgroundColor: 'white', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 }}>
              {/* Delivery Fee Breakdown */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ backgroundColor: '#EFF6FF', padding: 6, borderRadius: 8, marginRight: 12 }}>
                    <Ionicons name="bicycle-outline" size={16} color="#2563EB" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827' }}>Delivery Fees</Text>
                    <Text style={{ fontSize: 12, color: '#6B7280' }}>From {metrics?.total_deliveries || 0} deliveries</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#059669' }}>
                  {formatCurrency(Number(metrics?.total_earnings || 0))}
                </Text>
              </View>

              {/* Collected Amount Breakdown */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ backgroundColor: '#D1FAE5', padding: 6, borderRadius: 8, marginRight: 12 }}>
                    <Ionicons name="cart-outline" size={16} color="#059669" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827' }}>Collected Amount</Text>
                    <Text style={{ fontSize: 12, color: '#6B7280' }}>Total order value</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
                  {formatCurrency(totalCollected)}
                </Text>
              </View>

              {/* Deductions Breakdown */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ backgroundColor: '#FEE2E2', padding: 6, borderRadius: 8, marginRight: 12 }}>
                    <Ionicons name="remove-circle-outline" size={16} color="#DC2626" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '500', color: '#111827' }}>Deductions</Text>
                    <Text style={{ fontSize: 12, color: '#6B7280' }}>Penalties & adjustments</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#DC2626' }}>
                  {formatCurrency(deductions)}
                </Text>
              </View>

              {/* Divider */}
              <View style={{ height: 1, backgroundColor: '#E5E7EB', marginVertical: 16 }} />

              {/* Net Earnings */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>Net Earnings</Text>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#059669' }}>
                  {formatCurrency(Number(metrics?.total_earnings || 0) - deductions)}
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Stats */}
          <View style={{ marginTop: 24, marginBottom: 16 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 12 }}>
              Quick Stats
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ 
                backgroundColor: 'white', 
                borderRadius: 12, 
                padding: 16, 
                flex: 1,
                marginRight: 8,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 2
              }}>
                <Ionicons name="trending-up" size={20} color="#2563EB" />
                <Text style={{ fontSize: 18, fontWeight: 'bold', marginTop: 8, color: '#111827' }}>
                  ₱{(Number(metrics?.total_earnings || 0) / Math.max(metrics?.total_deliveries || 1, 1)).toFixed(2)}
                </Text>
                <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>Avg per delivery</Text>
              </View>

              <View style={{ 
                backgroundColor: 'white', 
                borderRadius: 12, 
                padding: 16, 
                flex: 1,
                marginLeft: 8,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.05,
                shadowRadius: 2,
                elevation: 2
              }}>
                <Ionicons name="calendar" size={20} color="#8B5CF6" />
                <Text style={{ fontSize: 18, fontWeight: 'bold', marginTop: 8, color: '#111827' }}>
                  {(metrics?.total_deliveries || 0) > 0 ? Math.ceil((metrics?.total_deliveries || 0) / 7) : 0}
                </Text>
                <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>This week</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}